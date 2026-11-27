# Phase 1 Data Model: Role-Based Access Control & Permission Management

**Feature**: `003-rbac-permission-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

## 1. Overview & Persistence Strategy

Phase 5.3 builds on Phase 5.1's global `User`, `AuthSession`, and `AuditLog` tables in `server/prisma/schema.prisma` (`PostgreSQL` via `Prisma 7.10.1` + `@prisma/adapter-neon`). Because Phase 5.2 tenant models (`Organization`, `Membership`) are not yet present in the schema, this phase introduces the canonical `Organization` and `Membership` models and enums—aligned with `docs/architecture/prisma-schema-design.md`, `docs/architecture/multi-tenancy-data-model.md`, and Phase 5.3 §4.2—and extends `AuditLog` with an optional `actorMembershipId` reference.

Consistent with Phase 5.3 §6.3, **permissions are NOT stored in database join tables**; the `Membership.role` enum maps deterministically to the versioned, immutable code-defined `ROLE_PERMISSIONS` matrix (`POLICY_VERSION = "1"`).

---

## 2. Enums

### `OrganizationStatus`

| Value | Meaning | Access Behavior |
|---|---|---|
| `ACTIVE` | Normal operating tenant workspace | Active members may access organization-scoped routes |
| `SUSPENDED` | Temporarily disabled tenant | All organization-scoped requests fail closed (`404 RESOURCE_NOT_FOUND`) |
| `ARCHIVED` | Permanently deactivated tenant retaining historical records | All organization-scoped requests fail closed (`404 RESOURCE_NOT_FOUND`) |

### `MembershipRole`

Exact five-role spelling established by Constitution Principle I, PRD §11, and Phase 5.3 §4.2:

| Value | Scope & Responsibility |
|---|---|
| `OWNER` | Full tenant administration, member/role management, audit logs, and operational control (subject to last-owner & transfer invariants) |
| `FACILITY_MANAGER` | Full facility operations (sites, buildings, assets, sensors, thresholds, incidents, work orders, maintenance, exports, simulator control) |
| `ENGINEER` | Technical investigation, asset/sensor/threshold configuration (no archiving), anomaly acknowledgement, incident triage/investigation/resolution, work-order create/update/complete, demo-only simulator control |
| `TECHNICIAN` | Basic org/site/building read + strict assignment-related read/execution on assigned work orders, linked assets/sensors/telemetry/anomalies/incidents (notes only), and maintenance records |
| `VIEWER` | Strictly read-only access to permitted operational views + self-service notifications |

### `MembershipStatus`

| Value | Meaning | Access Behavior |
|---|---|---|
| `INVITED` | Pending invitation acceptance (reserved for Phase 5.2 invitations) | Denied (`404 RESOURCE_NOT_FOUND` on org routes) |
| `ACTIVE` | Active tenant member | Authorized according to `role` when `organization.status === ACTIVE` |
| `SUSPENDED` | Temporarily suspended membership | Denied immediately (`404 RESOURCE_NOT_FOUND`); active WS subscriptions revoked |
| `REMOVED` | Soft-removed membership (global `User` preserved) | Denied immediately (`404 RESOURCE_NOT_FOUND`); terminal state |

---

## 3. Database Models (Prisma 7 Schema Additions)

### 3.1 `Organization` (`organizations`)

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `String` (`@db.Uuid`) | `@id @default(uuid())` | Stable tenant primary key |
| `name` | `String` (`@db.VarChar(120)`) | Required | Organization display name |
| `slug` | `String` (`@db.VarChar(80)`) | `@unique` | URL-safe canonical organization identifier |
| `status` | `OrganizationStatus` | `@default(ACTIVE)` | Lifecycle state controlling tenant access |
| `timezone` | `String` (`@db.VarChar(64)`) | `@default("UTC")` | Default IANA timezone (e.g., `Africa/Cairo`) |
| `createdAt` | `DateTime` (`@db.Timestamptz(6)`) | `@default(now())` | Creation instant (UTC) |
| `updatedAt` | `DateTime` (`@db.Timestamptz(6)`) | `@updatedAt` | Last update instant (UTC) |

**Indexes**:
- `@@index([status, createdAt])`

**Relations**:
- `memberships Membership[]`
- `auditLogs AuditLog[]`

---

### 3.2 `Membership` (`memberships`)

| Field | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `String` (`@db.Uuid`) | `@id @default(uuid())` | Stable membership primary key |
| `organizationId` | `String` (`@db.Uuid`) | FK → `Organization.id` (`onDelete: Cascade`) | Owning tenant boundary |
| `userId` | `String` (`@db.Uuid`) | FK → `User.id` (`onDelete: Cascade`) | Global human identity |
| `role` | `MembershipRole` | Required | Organization-scoped RBAC role |
| `status` | `MembershipStatus` | `@default(ACTIVE)` | Membership lifecycle state |
| `suspendedAt` | `DateTime?` (`@db.Timestamptz(6)`) | Nullable | Timestamp when suspended |
| `removedAt` | `DateTime?` (`@db.Timestamptz(6)`) | Nullable | Timestamp when soft-removed |
| `createdAt` | `DateTime` (`@db.Timestamptz(6)`) | `@default(now())` | Creation instant (UTC) |
| `updatedAt` | `DateTime` (`@db.Timestamptz(6)`) | `@updatedAt` | Last update instant (UTC) |

**Constraints & Indexes**:
- `@@unique([organizationId, userId])` — one membership record per user per organization
- `@@unique([organizationId, id])` — supports tenant-scoped lookups and future composite FKs
- `@@index([organizationId, userId, status])` — primary hot path for `OrganizationContextGuard`
- `@@index([organizationId, role, status])` — fast active-owner count check under `Organization` lock
- `@@index([userId, status])` — fast lookup for `GET /me` and `GET /organizations`

---

### 3.3 `AuditLog` (`audit_logs` — Additive Extension)

Existing Phase 5.1 model extended additively without breaking existing rows:

| Added Field | Type | Constraints | Purpose |
|---|---|---|---|
| `actorMembershipId` | `String?` (`@db.Uuid`) | Nullable, FK → `Membership.id` (`onDelete: SetNull`) | Actor's active membership context for tenant-scoped security/authz events |

**Added Relation & Index**:
- `organization Organization? @relation(fields: [organizationId], references: [id], onDelete: SetNull)` (existing nullable `organizationId` column linked cleanly)
- `actorMembership Membership? @relation("AuditActorMembership", fields: [actorMembershipId], references: [id], onDelete: SetNull)`
- `@@index([organizationId, action, occurredAt])` — fast tenant audit log filtering by action type

---

## 4. In-Memory Authorization Domain Types (Code-Defined Policy)

### 4.1 `Permission` (`ALL_PERMISSIONS`, 61 Identifiers)

| Domain | Permission Identifiers |
|---|---|
| **Organization & Administration (10)** | `organization:read`, `organization:update`, `organization:archive`, `members:read`, `members:invite`, `members:revoke-invitation`, `members:update-role`, `members:suspend`, `members:remove`, `audit-logs:read` |
| **Infrastructure (20)** | `sites:read`, `sites:create`, `sites:update`, `sites:archive`, `buildings:read`, `buildings:create`, `buildings:update`, `buildings:archive`, `assets:read`, `assets:create`, `assets:update`, `assets:archive`, `sensors:read`, `sensors:create`, `sensors:update`, `sensors:archive`, `thresholds:read`, `thresholds:manage`, `devices:read`, `devices:manage` |
| **Monitoring & Intelligence (9)** | `telemetry:read`, `telemetry:export`, `monitoring:read`, `anomalies:read`, `anomalies:acknowledge`, `predictions:read`, `risk-assessments:read`, `simulator:read`, `simulator:control` |
| **Incidents & Maintenance (18)** | `incidents:read`, `incidents:create`, `incidents:assign`, `incidents:investigate`, `incidents:resolve`, `incidents:close`, `incidents:add-related-note`, `work-orders:read`, `work-orders:read-assigned`, `work-orders:create`, `work-orders:assign`, `work-orders:update`, `work-orders:update-assigned`, `work-orders:complete`, `work-orders:complete-assigned`, `maintenance:read`, `maintenance:manage`, `maintenance-records:create` |
| **Analytics & Notifications (4)** | `analytics:read`, `analytics:export`, `notifications:read`, `notifications:manage-preferences` |

*(Total: 10 + 20 + 9 + 18 + 4 = 61 distinct permission identifiers; exact constant array `ALL_PERMISSIONS` is the canonical single source of truth verified by automated completeness tests.)*

### 4.2 `OrganizationAuthorizationContext`

Attached exclusively by `OrganizationContextGuard` onto `RequestWithOrganizationContext`:

```ts
export interface OrganizationAuthorizationContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly membershipId: string;
  readonly role: MembershipRole;
  readonly policyVersion: string;
}
```

### 4.3 `JobProvenance` (Background Worker Authorization Contract)

```ts
export type JobActorType = 'USER' | 'DEVICE' | 'SYSTEM';

export type SystemJobCapability =
  | 'TELEMETRY_EVALUATE'
  | 'INCIDENT_POLICY_EVALUATE'
  | 'NOTIFICATION_DISPATCH'
  | 'EXPORT_GENERATE'
  | 'ANALYTICS_AGGREGATE';

export interface JobProvenance {
  readonly schemaVersion: '1.0';
  readonly organizationId: string;
  readonly actorType: JobActorType;
  readonly actorUserId?: string;
  readonly actorMembershipId?: string;
  readonly actorDeviceId?: string;
  readonly serviceCapability?: SystemJobCapability;
  readonly requiredPermission?: Permission;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly correlationId: string;
}
```

---

## 5. Membership Lifecycle & Role State Transitions

### 5.1 Membership Status State Machine

```text
INVITED  ──(accept invitation [Phase 5.2])──► ACTIVE
ACTIVE   ──(suspend by OWNER)───────────────► SUSPENDED  [guard: not last active OWNER]
SUSPENDED──(reactivate by OWNER)────────────► ACTIVE
ACTIVE   ──(remove by OWNER)────────────────► REMOVED    [guard: not last active OWNER]
SUSPENDED──(remove by OWNER)────────────────► REMOVED
REMOVED  ──(terminal; no reactivation)──────► ✗ (409 STATE_TRANSITION_NOT_ALLOWED)
```

### 5.2 Role Transition Rules

| Operation | Actor Requirement | Target Requirement | Guardrails |
|---|---|---|---|
| `PATCH .../members/:membershipId/role` | Active `OWNER` (`members:update-role`) | Same org, `ACTIVE` or `SUSPENDED`, `target.userId !== actor.userId`, `target.role !== OWNER` | Requested `role` MUST be in `{FACILITY_MANAGER, ENGINEER, TECHNICIAN, VIEWER}`; cannot grant or revoke `OWNER`; atomic with `MEMBERSHIP_ROLE_CHANGED` audit |
| `POST .../members/:membershipId/suspend` | Active `OWNER` (`members:suspend`) | Same org, `status === ACTIVE` | Acquires `Organization FOR UPDATE` lock; if `target.role === OWNER`, requires `activeOwnerCount >= 2` else `409 RESOURCE_CONFLICT`; atomic with `MEMBERSHIP_SUSPENDED` audit + WS revocation event |
| `POST .../members/:membershipId/reactivate` | Active `OWNER` (`members:suspend`) | Same org, `status === SUSPENDED` | Transitions to `ACTIVE`, clears `suspendedAt`; atomic with `MEMBERSHIP_REACTIVATED` audit |
| `DELETE .../members/:membershipId` | Active `OWNER` (`members:remove`) | Same org, `status` in `{ACTIVE, SUSPENDED}` | Acquires `Organization FOR UPDATE` lock; if `target.role === OWNER` and `status === ACTIVE`, requires `activeOwnerCount >= 2` else `409 RESOURCE_CONFLICT`; soft-transitions to `REMOVED`, sets `removedAt`, never deletes `User`; atomic with `MEMBERSHIP_REMOVED` audit + WS revocation event |
| `POST .../ownership-transfer` | Active `OWNER` (explicit `OWNER` check) | Same org, `status === ACTIVE`, `target.userId !== actor.userId`, `target.role !== OWNER` | Requires `confirmTransfer === true` and `previousOwnerNextRole` in `{FACILITY_MANAGER, ENGINEER, TECHNICIAN, VIEWER}`; acquires `Organization FOR UPDATE` lock; atomically promotes target to `OWNER` and demotes actor to `previousOwnerNextRole` (zero ownerless intermediate state) + emits `OWNERSHIP_TRANSFER_INITIATED` and `OWNERSHIP_TRANSFER_COMPLETED` audit events |

---

## 6. Validation Rules

- All UUID route params (`organizationId`, `membershipId`) MUST validate as strict RFC 4122/UUID strings; malformed `organizationId` fails closed with `404 RESOURCE_NOT_FOUND` (no schema/validation oracle on org IDs), while malformed body fields fail with `400 VALIDATION_ERROR`.
- All command DTOs MUST use `.strict()` Zod 4 schemas rejecting unknown fields—specifically rejecting client-injected `organizationId`, `userId`, `membershipId`, or `permissions` in request bodies (`FR-004`, Constitution Principle VI).
- Audit log metadata MUST pass through `AuditLogsService` key redaction stripping `password`, `secret`, `token`, `cookie`, `authorization`, `csrf`, `hash`, `credential`, `invitationSecret`, and `rawBody` (`FR-023`, `SC-006`).
