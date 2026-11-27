# Phase 0 Technical Research: Role-Based Access Control & Permission Management

**Feature**: `003-rbac-permission-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

This document resolves all technical design decisions for implementing **GridAware Phase 5.3: Role-Based Access Control & Permission Management** on top of the live repository stack (`NestJS 12`, `Prisma 7.10.1` + `@prisma/adapter-neon`, `Zod 4.6.7`, `Vitest 4.1.2` + `Supertest 7`, `Next.js 16.4.6` + `React 19.3.0`).

---

## R1: Prerequisite Organization & Membership Persistence Foundation

- **Decision**: Introduce the canonical tenant models (`Organization`, `Membership`) and enums (`OrganizationStatus`, `MembershipRole`, `MembershipStatus`) plus a nullable `actorMembershipId` column on `AuditLog` via a single reviewed Prisma 7 migration (`init_organizations_rbac`) in `server/prisma/schema.prisma`. Wire `GET /api/v1/me` (currently returning `memberships: []`) and `GET /api/v1/organizations` to return real active memberships, while keeping full organization onboarding/invitation lifecycle extensible by Phase 5.2 without schema churn.
- **Rationale**: Inspection of `server/prisma/schema.prisma` confirmed only Phase 5.1 identity models (`User`, `AuthSession`, `EmailVerificationToken`, `PasswordResetToken`, `AuditLog`) currently exist. Phase 5.3 cannot evaluate live server-side organization memberships, enforce last-owner concurrency invariants, or execute real database-backed cross-tenant E2E tests without `Organization` and `Membership`. Aligning exact table/column/enum names with `docs/architecture/prisma-schema-design.md`, `docs/architecture/multi-tenancy-data-model.md`, and Phase 5.3 §4.2 guarantees zero duplicate models and seamless Phase 5.2 compatibility.
- **Alternatives considered**:
  - *Mocking `Membership` in-memory without Prisma models*: Rejected — fails to verify PostgreSQL transactional `FOR UPDATE` last-owner locking (`FR-016`, `SC-005`), indexed membership lookup latency (`SC-007`), and real Supertest E2E isolation tests (`SC-002`).
  - *Database-stored `Role` / `Permission` / `RolePermission` join tables*: Rejected — violates Phase 5.3 §6.3 ("code-defined role-to-permission map") and introduces premature custom-role administration out of MVP scope.

---

## R2: Authoritative Permission Catalogue & Reconciled Five-Role Matrix

- **Decision**: Maintain a single frozen, versioned TypeScript catalogue (`ALL_PERMISSIONS`, 61 permissions, `POLICY_VERSION = '1'`) and immutable `ROLE_PERMISSIONS: Readonly<Record<MembershipRole, ReadonlySet<Permission>>>` keyed directly by Prisma's generated `MembershipRole` enum (`OWNER`, `FACILITY_MANAGER`, `ENGINEER`, `TECHNICIAN`, `VIEWER`) in `server/src/authorization/permission-map.ts`.
  - Apply Spec Clarifications (Session 2026-11-27):
    - `OWNER` receives all 61 permissions (exclusive holder of `organization:update`, `organization:archive`, `members:*`, `audit-logs:read`, `devices:manage`).
    - `FACILITY_MANAGER` receives full facility/operational management, exports, simulator control, and full incident/work-order lifecycles (`work-orders:update`, `work-orders:complete`), without tenant administration or audit logs.
    - `ENGINEER` receives read-only access to sites/buildings, technical write access (`assets:create`, `assets:update`, `sensors:create`, `sensors:update`, `thresholds:manage` — aligning with `PRD.md` §11 and `US-006`/`US-008`/`US-014`; no archiving), anomaly acknowledgement, incident create/investigate/resolve (no assign/close), work-order create/update/complete (no assign), maintenance-record creation, and demo-only simulator control.
    - `TECHNICIAN` receives basic tenant/location reads (`organization:read`, `sites:read`, `buildings:read`), assignment-scoped operational reads (`assets:read`, `sensors:read`, `telemetry:read`, `monitoring:read`, `anomalies:read`, `predictions:read`, `risk-assessments:read`, `incidents:read`, `maintenance:read` — enforced via `TechnicianScopePolicy`), `incidents:add-related-note`, `work-orders:read-assigned`, `work-orders:update-assigned`, `work-orders:complete-assigned`, and `maintenance-records:create`.
    - `VIEWER` receives strictly read-only permissions across permitted views plus self-service notifications (`notifications:read`, `notifications:manage-preferences`).
    - All five roles receive `notifications:read` and `notifications:manage-preferences` scoped strictly to the caller's own notifications.
- **Rationale**: Binding `ROLE_PERMISSIONS` to Prisma's generated `MembershipRole` eliminates enum drift, keeps permissions code-reviewed and versioned, satisfies `PRD.md` / `user-stories.md` for Engineers, and fixes the §9 vs §10.2 discrepancies (`work-orders:update`, `work-orders:complete`, `incidents:add-related-note`, and `notifications:read`).
- **Alternatives considered**:
  - *Separate manually typed TypeScript `Role` enum*: Rejected — can drift from Prisma schema migrations.
  - *Storing role/permissions inside JWT access token claims*: Rejected — violates `FR-007` and `SC-004` because role downgrades and membership suspensions would remain valid until the 15-minute access token expires.

---

## R3: Fail-Closed NestJS Guard Execution Order & Strict Non-Disclosure Policy

- **Decision**: Compose organization-scoped route protection with an explicit, deterministic four-guard chain via a reusable `@OrgProtected()` class decorator wrapping `@UseGuards(AccessTokenGuard, CsrfGuard, OrganizationContextGuard, PermissionsGuard)`:
  1. `AccessTokenGuard` (existing Phase 5.1) verifies `ga_access` HttpOnly JWT, active `User`, and active `AuthSession` → populates `req.user` or throws `401 UNAUTHENTICATED` / `403 ACCOUNT_NOT_ACTIVE`.
  2. `CsrfGuard` (existing Phase 5.1) enforces double-submit `ga_csrf` + `X-CSRF-Token` and `Origin`/`Referer` allowlist on mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) → throws `403 CSRF_INVALID`.
  3. `OrganizationContextGuard` validates `:organizationId` UUID from `req.params` (ignoring any body/query/header `organizationId`), performs a single indexed PostgreSQL query `membership.findFirst({ where: { organizationId, userId, status: 'ACTIVE', organization: { status: 'ACTIVE' } } })`, and attaches `req.organizationContext`. Any missing, malformed, unjoined, or inactive organization/membership throws `AppException.notFound()` (`404 RESOURCE_NOT_FOUND`) per Spec FR-008 Option A (strict non-disclosure) and records an `AUTHZ_DENIED` audit event.
  4. `PermissionsGuard` inspects `REQUIRED_PERMISSIONS` and `ALLOW_ACTIVE_MEMBER` metadata via `Reflector.getAllAndOverride()`. If neither is explicitly declared, or `req.organizationContext` is missing, or the role is unrecognized, it fails closed with `AppException.forbidden()` (`403 FORBIDDEN`) and records `AUTHZ_DENIED`. When `REQUIRED_PERMISSIONS` is present, all listed permissions must be granted (`AND` semantics).
- **Rationale**: Using `@OrgProtected()` on organization-scoped controllers guarantees exact execution order (`Auth → CSRF → OrgContext → Permissions`), avoids interfering with public/global routes (`/health/*`, `/auth/*`, `/me`, `GET /organizations`), integrates seamlessly with Phase 5.1's `AppException` RFC 7807 ProblemDetails filter, and ensures every denial is audited without leaking tenant existence. A dedicated static/reflection unit test verifies that every handler on every `@OrgProtected()` controller declares either `@RequirePermissions(...)` or `@AllowActiveMember()`.
- **Alternatives considered**:
  - *Global `APP_GUARD` for `OrganizationContextGuard` and `PermissionsGuard`*: Rejected — requires opting out every global non-tenant route (`/health/*`, `/auth/*`, `/me`, `GET/POST /organizations`), increasing the risk of misconfigured opt-out decorators.
  - *Returning `403 FORBIDDEN` for missing/inactive organization membership*: Rejected per Spec FR-008 Option A — would create an organization existence/status oracle for authenticated users probing arbitrary UUIDs.

---

## R4: Concurrency-Safe Last-Active-Owner Protection & Membership Administration

- **Decision**: Execute all membership role changes, suspensions, reactivations, removals, and ownership transfers inside `prisma.$transaction()` starting with a tenant-scoped PostgreSQL row lock `SELECT id FROM organizations WHERE id = $1::uuid FOR UPDATE`.
  - Generic `PATCH /organizations/:organizationId/members/:membershipId/role` rejects setting `role = 'OWNER'`, rejects modifying a target currently holding `OWNER`, and rejects self-role changes (`target.userId === ctx.userId`).
  - `POST .../suspend` and `DELETE .../members/:membershipId` check active `OWNER` count under the `Organization` row lock; if `target.role === 'OWNER'` and `activeOwnerCount <= 1`, reject with `409 RESOURCE_CONFLICT` (`Cannot remove or suspend the last active owner of an active organization.`).
  - Provide a dedicated atomic `POST /organizations/:organizationId/ownership-transfer` endpoint requiring `OWNER` authority, an `ACTIVE` target membership in the same organization, an explicit `confirmTransfer: true` field, and an optional `previousOwnerNextRole` (default `FACILITY_MANAGER`, strictly non-`OWNER`), which atomically promotes the target to `OWNER`, demotes the initiating `OWNER`, and writes `OWNERSHIP_TRANSFER_INITIATED` / `OWNERSHIP_TRANSFER_COMPLETED` audit events in the same transaction.
- **Rationale**: Under PostgreSQL `READ COMMITTED`, two concurrent requests removing the last two active owners can both read `count === 2` and leave an organization ownerless. Acquiring a `FOR UPDATE` lock on the single parent `organizations` row serializes membership administrative mutations strictly per tenant with negligible contention and zero cross-tenant lock impact.
- **Alternatives considered**:
  - *`SERIALIZABLE` isolation level with retry loops*: Viable but adds retry boilerplate and spurious serialization failures on unrelated reads; locking the parent `organizations` row is simpler, deterministic, and guarantees zero deadlocks when always acquired first.
  - *Application-level read-then-write check without locking*: Rejected — vulnerable to TOCTOU race conditions explicitly called out in Phase 5.3 §14.3 and `SC-005`.

---

## R5: Service-Level Resource Policies & Technician Assignment-Related Scope

- **Decision**: Implement pure, unit-tested domain policy helpers in `server/src/authorization/policies/` consumed by both Phase 5.3 verification suites and all upcoming domain modules:
  - `ResourceTenantPolicy`: `assertSameTenant(ctx, record)`, `assertParentTenantConsistency(ctx, parents[])`, `tenantWhere(ctx, extra)` — always throwing `AppException.notFound()` on mismatch.
  - `TechnicianScopePolicy`: `workOrderListWhere(ctx)` (filters `assignedToUserId: ctx.userId` for `TECHNICIAN`), `assertAssignedWorkOrder(ctx, workOrder)` (rejects unassigned/foreign work orders with `404`), `assertRelatedResourceAccess(ctx, hasAssignedWorkOrderLink)` (enforces `FR-012` Option A for `Assets`, `Sensors`, `Telemetry`, `Anomalies`, `Predictions`, `RiskAssessments`, `Incidents`, `MaintenanceRecords`), and `filterTechnicianEditableWorkOrderFields(dto)` (rejects attempts to mutate `assignedToUserId`, `organizationId`, `assetId`, or `incidentId`).
  - `WorkOrderPolicy` & `IncidentPolicy`: validate role permissions + valid workflow transitions (`Incident`: `OPEN`/`TRIAGED`/`ASSIGNED`/`INVESTIGATING` → `RESOLVED` for `ENGINEER`/`FACILITY_MANAGER`/`OWNER`; `RESOLVED` → `CLOSED` only for `FACILITY_MANAGER`/`OWNER`; `incidents:add-related-note` for `TECHNICIAN` only on linked incidents) designed to execute inside conditional writes/transactions (`updateMany` with `where: { id, organizationId, status: { in: allowed }, ...assignmentFilter }`).
  - `SimulatorPolicy`: restricts `ENGINEER` `simulator:control` via `SIMULATOR_DEMO_CONTROL_ENABLED` + `NODE_ENV !== 'production'` + `targetKind === 'SIMULATOR'`, and rejects any physical actuation target for all roles (Constitution Principle II).
  - `ExportPolicy`: enforces `telemetry:export` / `analytics:export`, binds export job/download verification to `(organizationId, exportId)`, and enforces short-lived TTL on download access tokens/grants.
- **Rationale**: Centralizing resource and query-scope rules prevents duplicated `if (ctx.role === 'TECHNICIAN')` branches across future NestJS modules and ensures list queries filter inside PostgreSQL rather than in memory (`FR-009`, `FR-011`, `FR-012`).
- **Alternatives considered**:
  - *Prisma Client Extensions auto-injecting `organizationId` globally*: Rejected for MVP — hides tenant boundaries implicitly, complicates global tables (`User`, `AuthSession`, `AuditLog`), and still cannot express technician assignment joins; explicit `OrganizationAuthorizationContext`-driven repository/policy helpers are auditable and required by `multi-tenancy-data-model.md` §4.

---

## R6: Cross-Channel Authorization (WebSockets, Background Jobs, MQTT Device Boundary)

- **Decision**: Implement reusable channel authorization services in `server/src/authorization/channels/`:
  - `WsAuthorizationService`: verifies handshake cookies via `TokenCryptoService` + active `User`/`AuthSession`, resolves channel target ownership (`siteId` / `simulationRunId` / `userId`) server-side to `organizationId`, validates active `Membership` + required permission (`telemetry:read`, `sensors:read`, `anomalies:read`, `incidents:read`, `work-orders:read` or `work-orders:read-assigned`, `simulator:read`), emits canonical server room names (`org:{orgId}:site:{siteId}:{topic}` or `user:{userId}:notifications`), and publishes revocation events on Redis pub/sub channel `gridaware:authz:membership-revoked` whenever a membership is suspended/removed or downgraded so active WebSocket connections drop unauthorized rooms promptly (`FR-019`, `SC-004`).
  - `BackgroundJobAuthorizationService`: validates `JobProvenance` via strict Zod 4 schema (`organizationId`, `actorType: 'USER' | 'DEVICE' | 'SYSTEM'`, `actorUserId?`, `actorMembershipId?`, `serviceCapability?`, `correlationId`, `aggregateType`, `aggregateId`), authorizes producers before enqueueing, and re-validates aggregate tenant ownership plus allowlisted `SYSTEM` capabilities (`TELEMETRY_EVALUATE`, `INCIDENT_POLICY_EVALUATE`, `NOTIFICATION_DISPATCH`, `EXPORT_GENERATE`, `ANALYTICS_AGGREGATE`) in workers before mutation (`FR-021`).
  - `DeviceIsolationGuardrail`: preserves strict separation between human `AccessTokenGuard` / `OrganizationContextGuard` and MQTT device ingestion (`server/src/telemetry/telemetry-topic.ts`), verified by negative tests confirming human `OWNER` contexts cannot satisfy device credential checks and device identities cannot obtain human `OrganizationAuthorizationContext` (`FR-020`).
- **Rationale**: Establishes concrete, tested enforcement primitives for real-time streams, queued jobs, and exports now—before BullMQ/WebSocket domain gateways proliferate—while integrating cleanly with the existing `RedisService` (`ioredis`).
- **Alternatives considered**:
  - *Deferring WebSocket/Job/Export authorization contracts to later phases*: Rejected — explicitly required by Phase 5.3 §15, Spec `FR-019..FR-022`, and `SC-002`.

---

## R7: Live Membership Lookup Performance (No Cross-Request Authz Caching)

- **Decision**: Resolve active `Membership` and `Organization` status directly from Neon PostgreSQL on every protected organization request using a covering composite index `(organizationId, userId, status)` on `memberships` and primary-key lookup on `organizations`. Do not introduce Redis permission caching in Phase 5.3.
- **Rationale**: Matches Phase 5.3 §18 and guarantees zero stale-authorization window upon role downgrade, suspension, or removal (`FR-007`, `SC-004`). A single indexed primary/composite key lookup adds `< 5–15 ms` over the pooled Neon connection, well within the `p95 < 300 ms` budget (`SC-007`, `NFR-PERF-001`).
- **Alternatives considered**:
  - *Redis TTL cache for membership roles*: Rejected — risks stale elevated permissions after downgrades/suspensions and explicitly discouraged by Phase 5.3 §18 unless load testing proves a bottleneck.

---

## R8: Next.js 16 Capability-Driven UI & Organization Switching

- **Decision**: Implement frontend capability helpers and organization administration UI in `client/`:
  - Pure ESM capability helpers `can(permissions, required)` and `canAll(permissions, required[])` in `client/lib/authorization/permissions.mjs` with accompanying `.d.ts` and `node --test` unit suite (matching `client/lib/auth/*.mjs` pattern).
  - `AccessContextProvider` + `useAccessContext()` fetching `GET /api/v1/organizations/:organizationId/access-context` via `apiRequest()`, subscribing to `BroadcastChannel("gridaware:auth")` (`SESSION_REFRESHED`, `SESSION_INVALIDATED`) and an org-switch channel (`gridaware:org`) to clear prior-tenant state and re-fetch capabilities immediately.
  - Reusable EVARAX dark-first components: `<PermissionGate>`, `<RoleBadge>`, `<OrganizationSwitcher>`, and WCAG 2.2 AA `<PermissionDeniedState>` (text + icon cues, keyboard focus management, zero color-only indicators, never disclosing cross-tenant resource existence).
  - Member administration screen at `client/app/(protected)/app/organizations/[organizationId]/members/page.tsx` (Owner-only list, role update dropdown restricted to non-Owner roles, suspend/reactivate/remove actions with Radix `AlertDialog` confirmations, and ownership-transfer dialog) plus a role-aware sidebar/header integration in `(protected)/layout.tsx`.
- **Rationale**: Reuses existing Phase 5.1/5.2-UX Radix UI primitives, Tailwind 4 EVARAX tokens, `apiRequest()` CSRF + Web Locks refresh coordinator, and `node --test` test harness with zero new frontend runtime dependencies.
- **Alternatives considered**:
  - *Storing permission lists in `localStorage` or cookies*: Rejected — violates `FR-017` and risks stale cross-tenant UI state after role changes or org switches.
