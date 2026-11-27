# Quickstart & End-to-End Validation Guide: RBAC & Permission Management (Phase 5.3)

**Feature**: `003-rbac-permission-management` | **Date**: 2026-11-27  
**Contracts**: [rbac-openapi.yaml](./contracts/rbac-openapi.yaml) · [frontend-authorization.md](./contracts/frontend-authorization.md) · [data-model.md](./data-model.md)

This guide documents how to run migrations, execute the automated verification suites, and validate all Phase 5.3 authorization scenarios end-to-end.

---

## 1. Prerequisites

- Node.js `>=24`, `pnpm@12.18.0`, and Docker Compose (for local Redis/Mosquitto).
- Valid Neon PostgreSQL `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) configured in `server/.env`.
- Phase 5.1 authentication migration already applied (`20261126230021_init_auth_identity`).

---

## 2. Setup & Migration Commands

```bash
# 1. Start local infrastructure dependencies (Redis for rate limits & WS revocation pub/sub)
pnpm docker:infra

# 2. Apply Prisma 7 migration for Organization, Membership, and AuditLog.actorMembershipId
pnpm --filter server prisma:migrate
pnpm --filter server prisma:generate

# 3. Run full workspace development servers (client:3000 + server:3001)
pnpm dev
```

---

## 3. Automated Verification Commands

```bash
# 1. Server unit & policy tests (permission map, guards, tenant/technician/incident/work-order/simulator/export policies, WS/job channels)
pnpm --filter server test

# 2. Server E2E RBAC matrix, cross-tenant isolation, technician scope, and concurrent last-owner tests
pnpm --filter server test:e2e

# 3. Machine-readable OpenAPI / AsyncAPI / JSON Schema contract validation (including rbac-openapi.yaml)
pnpm contracts:validate

# 4. Client capability helpers and role-aware authorization unit tests
pnpm --filter client test

# 5. Full repository CI quality gates
pnpm lint && pnpm typecheck && pnpm test && pnpm contracts:validate && pnpm build
```

---

## 4. End-to-End Validation Scenarios

### Scenario 1 — Fail-Closed Guard Chain & Multi-Org Role Isolation (`US-1`, `SC-001`, `SC-003`)
- **Setup**: Two active organizations (`Org A`, `Org B`) and one user holding `OWNER` in `Org A` and `VIEWER` in `Org B`.
- **Verify**:
  1. Unauthenticated call to `GET /api/v1/organizations/{orgA}/access-context` returns `401 UNAUTHENTICATED`.
  2. Authenticated `GET /api/v1/organizations/{orgA}/members` succeeds (`200`), while `GET /api/v1/organizations/{orgB}/members` returns `403 FORBIDDEN` and records an `AUTHZ_DENIED` audit log.
  3. Requesting an unjoined or non-existent `organizationId` (or a `SUSPENDED` organization/membership) uniformly returns concealed `404 RESOURCE_NOT_FOUND`.
  4. Sending `{ "organizationId": orgA, "role": "OWNER" }` in a request body targeting `Org B` is rejected (`400 VALIDATION_ERROR` via strict DTO validation) and never overrides server-resolved membership context.

### Scenario 2 — Immediate Role Downgrade & Suspension Effect (`US-1`, `SC-004`)
- **Setup**: Active user holding `FACILITY_MANAGER` in `Org A` with an active authenticated session.
- **Verify**:
  1. `Owner` updates the user's role to `VIEWER` via `PATCH /api/v1/organizations/{orgA}/members/{membershipId}/role` (with valid `X-CSRF-Token`).
  2. Without signing out or refreshing cookies, the user's very next `GET /api/v1/organizations/{orgA}/access-context` returns `role: "VIEWER"` and zero write permissions.
  3. `Owner` suspends the membership via `POST .../suspend`; the user's next request to `Org A` immediately returns concealed `404 RESOURCE_NOT_FOUND` and emits a membership-revocation event on Redis pub/sub for active WebSocket consumers.

### Scenario 3 — Cross-Tenant Isolation & Technician Assignment Scoping (`US-2`, `SC-002`, `SC-003`)
- **Setup**: `Org A` and `Org B` each with members and operational fixtures (assets, incidents, work orders assigned to `Technician 1` and `Technician 2`).
- **Verify**:
  1. `Owner` of `Org A` probing `Org B`'s `membershipId` under `Org A`'s URL receives concealed `404 RESOURCE_NOT_FOUND`.
  2. `TechnicianScopePolicy` list-query filter returns exclusively `Technician 1`'s assigned work orders and denies detail/update/completion on `Technician 2`'s work orders (`404`).
  3. `Technician 1` attempting to modify `assignedToUserId` or `organizationId` is rejected, and read access to non-work-order operational records (`Assets`, `Sensors`, `Telemetry`, `Anomalies`, `Incidents`) succeeds only for records linked to `Technician 1`'s assigned work orders.

### Scenario 4 — Concurrent Last-Owner Protection & Ownership Transfer (`US-3`, `SC-005`)
- **Setup**: `Org A` with exactly two active `OWNER`s (`Owner 1` and `Owner 2`), plus one active `ENGINEER`.
- **Verify**:
  1. Generic role update attempting to set `ENGINEER → OWNER` or `OWNER → VIEWER` returns `409 STATE_TRANSITION_NOT_ALLOWED` (or `400 VALIDATION_ERROR` for `OWNER` payload).
  2. Self-role update (`target.userId === actor.userId`) is denied (`403 FORBIDDEN`).
  3. Firing two concurrent requests (`Promise.allSettled`) to suspend/remove `Owner 1` and `Owner 2` simultaneously allows exactly one to succeed (`200`) and rejects the other (`409 RESOURCE_CONFLICT`), preserving at least one active `OWNER`.
  4. Executing `POST /api/v1/organizations/{orgA}/ownership-transfer` atomically promotes the active `ENGINEER` to `OWNER`, demotes the initiating `OWNER` to `FACILITY_MANAGER`, and records `OWNERSHIP_TRANSFER_INITIATED` and `OWNERSHIP_TRANSFER_COMPLETED` audit events.

### Scenario 5 — Cross-Channel Authorization & Secret-Free Auditing (`US-5`, `SC-002`, `SC-006`)
- **Verify**:
  1. `WsAuthorizationService` rejects cross-tenant site subscriptions and unauthenticated handshakes, generates canonical server-side room identifiers, and drops subscriptions on membership revocation.
  2. `BackgroundJobAuthorizationService` rejects jobs with mismatched aggregate `organizationId` or unapproved `SYSTEM` capabilities.
  3. `SimulatorPolicy` blocks `ENGINEER` simulator control in `production` mode and rejects physical equipment actuation for all roles including `OWNER`.
  4. Inspecting persisted `audit_logs` confirms `AUTHZ_DENIED`, `MEMBERSHIP_ROLE_CHANGED`, `MEMBERSHIP_SUSPENDED`, `MEMBERSHIP_REACTIVATED`, `MEMBERSHIP_REMOVED`, and `OWNERSHIP_TRANSFER_*` entries contain `organizationId`, `actorUserId`, `actorMembershipId`, `requestId`, `correlationId`, and zero tokens, cookies, passwords, or invitation secrets.

### Scenario 6 — Role-Aware Frontend Capabilities & Accessibility (`US-4`, `SC-008`)
- **Verify**:
  1. Sign in as `OWNER` and open `/app/organizations/{orgA}/members`: full member roster, role dropdown (non-owner roles only), suspend/remove dialogs, and ownership-transfer dialog are keyboard-operable and styled with EVARAX dark-first tokens.
  2. Switch to `Org B` (where user is `VIEWER`): previous-tenant state clears, `Members` navigation disappears, `Read-only` badge (icon + text) appears, and direct navigation to `/app/organizations/{orgB}/members` displays the accessible `<PermissionDeniedState>`.
