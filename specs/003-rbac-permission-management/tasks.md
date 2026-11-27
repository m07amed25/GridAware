---
description: "Dependency-ordered task breakdown for Phase 5.3: Role-Based Access Control & Permission Management"
---

# Tasks: Role-Based Access Control & Permission Management

**Input**: Design documents from `/specs/003-rbac-permission-management/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/rbac-openapi.yaml`, `contracts/frontend-authorization.md`, `quickstart.md`

**Tests**: Explicitly requested by `spec.md` (`FR-024`, `SC-001`–`SC-008`) and Constitution risk-based verification gates — unit, guard, policy, contract, concurrency, and cross-tenant E2E tests are included for every user story.

**Organization**: Tasks are grouped by user story (`US1`–`US5`) so each story is independently implementable and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`[US1]`–`[US5]`) for story phases only
- Every task includes exact repository file paths and explicit `data-model.md` field citations where constrained entities are implemented

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify workspace configuration, environment settings, and OpenAPI contract validation hooks

- [X] T001 Verify ignore files (`.gitignore`, `.dockerignore`) and workspace script wiring in `package.json`, `server/package.json`, and `client/package.json`
- [X] T002 [P] Add `SIMULATOR_DEMO_CONTROL_ENABLED` boolean flag to `server/src/config/env.schema.ts` and typed getter `simulatorDemoControlEnabled` to `server/src/config/env.service.ts`
- [X] T003 [P] Register `specs/003-rbac-permission-management/contracts/rbac-openapi.yaml` schema compilation and `$ref` verification in `server/src/contracts/contracts-validation.spec.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core tenant data models, generated Prisma 7 client, and extended secret-free audit service required before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Add `OrganizationStatus`, `MembershipRole`, and `MembershipStatus` enums, `Organization` (`Organization.id`, `Organization.name`, `Organization.slug`, `Organization.status`, `Organization.timezone`, `Organization.createdAt`, `Organization.updatedAt`), `Membership` (`Membership.id`, `Membership.organizationId`, `Membership.userId`, `Membership.role`, `Membership.status`, `Membership.suspendedAt`, `Membership.removedAt`, `Membership.createdAt`, `Membership.updatedAt`), and additive `AuditLog.actorMembershipId` per `data-model.md` in `server/prisma/schema.prisma`, create reviewed SQL migration in `server/prisma/migrations/20261127120000_init_organizations_rbac/migration.sql`, and regenerate Prisma client (`pnpm --filter server prisma:generate`)
- [X] T005 [P] Extend `AuditLogsService` with all 13 Phase 5.3 `AuditAction` values (`AUTHZ_DENIED`, `MEMBERSHIP_ROLE_CHANGED`, `MEMBERSHIP_SUSPENDED`, `MEMBERSHIP_REACTIVATED`, `MEMBERSHIP_REMOVED`, `INVITATION_CREATED`, `INVITATION_REVOKED`, `OWNERSHIP_TRANSFER_INITIATED`, `OWNERSHIP_TRANSFER_COMPLETED`, `EXPORT_REQUESTED`, `EXPORT_COMPLETED`, `EXPORT_FAILED`, `SIMULATOR_CONTROL_EXECUTED`), `actorMembershipId` support (`AuditLog.actorMembershipId` per `data-model.md`), and expanded secret redaction in `server/src/audit-logs/audit-logs.service.ts` and update `server/src/audit-logs/audit-logs.service.spec.ts`
- [X] T006 [P] Add `buildPaginatedApiResponse` cursor-pagination envelope helper matching `PaginationMeta` in `server/src/common/envelopes/api-response.ts`

**Checkpoint**: Prisma 7 schema/client generated, extended audit logging tested, pagination helper ready.

---

## Phase 3: User Story 1 - Enforce Organization Context and Role-Based Permissions on Every Request (Priority: P1) 🎯 MVP

**Goal**: Deliver the canonical 61-permission catalogue, immutable five-role matrix keyed by Prisma `MembershipRole`, `AuthorizationService`, fail-closed four-stage guard pipeline (`AccessTokenGuard → CsrfGuard → OrganizationContextGuard → PermissionsGuard`), `GET /api/v1/organizations/:organizationId/access-context`, and `GET /api/v1/organizations` + `GET /api/v1/me` active membership wiring.

**Independent Test**: Verify via unit and guard tests that all 5 roles map accurately to the 61 permissions, unknown roles and missing permission metadata fail closed (`403`), unjoined/inactive organizations and memberships fail closed with strict concealment (`404`), forged body `organizationId`/`role` claims are ignored, and role changes take immediate effect on the next request.

### Implementation for User Story 1

- [X] T007 [P] [US1] Create authorization constants (`POLICY_VERSION`, metadata keys, Redis revocation channel) in `server/src/authorization/authorization.constants.ts` and canonical 61-permission `ALL_PERMISSIONS`, `Permission`, `OrganizationAuthorizationContext`, and `RequestWithOrganizationContext` types (`data-model.md` §4.1–§4.2) in `server/src/authorization/authorization.types.ts`
- [X] T008 [US1] Implement immutable `ROLE_PERMISSIONS` matrix keyed by Prisma `MembershipRole` (`data-model.md` §2 `MembershipRole`, §4.1 `Permission`) and fail-closed `getPermissionsForRole()` / `isKnownMembershipRole()` helpers in `server/src/authorization/permission-map.ts`
- [X] T009 [P] [US1] Create `@RequirePermissions(...permissions)` (`AND` semantics), `@AllowActiveMember()`, and `@OrgContext()` parameter decorators in `server/src/authorization/decorators/require-permissions.decorator.ts`, `server/src/authorization/decorators/allow-active-member.decorator.ts`, and `server/src/authorization/decorators/org-context.decorator.ts`
- [X] T010 [US1] Implement `AuthorizationService` (`hasPermission`, `hasAllPermissions`, `buildAccessContext`, `getRolePermissions`) in `server/src/authorization/authorization.service.ts`
- [X] T011 [US1] Implement live PostgreSQL `OrganizationContextGuard` enforcing UUID route-param validation, active `Organization.status` & `Membership.status` (`data-model.md` §2–§3), strict `404 RESOURCE_NOT_FOUND` non-disclosure, and `AUTHZ_DENIED` auditing in `server/src/authorization/guards/organization-context.guard.ts`
- [X] T012 [US1] Implement deny-by-default `PermissionsGuard` (`Reflector` check, `AND` semantics, fail-closed on missing metadata or unknown role, `AUTHZ_DENIED` auditing) in `server/src/authorization/guards/permissions.guard.ts` and `@OrgProtected()` composed guard decorator (`AccessTokenGuard → CsrfGuard → OrganizationContextGuard → PermissionsGuard`) in `server/src/authorization/decorators/org-protected.decorator.ts`
- [X] T013 [US1] Implement `GET /api/v1/organizations/:organizationId/access-context` controller and Swagger DTOs in `server/src/authorization/authorization.controller.ts` and `server/src/authorization/dto/authorization-swagger.dto.ts`
- [X] T014 [P] [US1] Implement `OrganizationsRepository`, `OrganizationsService`, `OrganizationsController` (`GET /api/v1/organizations` listing active memberships joined with active organizations per `data-model.md` `Organization` & `Membership`), and `OrganizationsModule` in `server/src/organizations/organizations.repository.ts`, `server/src/organizations/organizations.service.ts`, `server/src/organizations/organizations.controller.ts`, and `server/src/organizations/organizations.module.ts`, and wire active memberships into `server/src/auth/me.controller.ts`

### Tests for User Story 1

- [X] T015 [P] [US1] Write exhaustive permission-map completeness, Viewer read-only, Engineer PRD-alignment, Technician scoped permissions, and unknown-role fail-closed unit tests in `server/src/authorization/tests/permission-map.spec.ts`
- [X] T016 [P] [US1] Write `OrganizationContextGuard` unit tests (active/suspended/archived org, active/suspended/removed/invited membership, malformed orgId, strict `404` concealment, multi-org isolation, body-spoof rejection, `AUTHZ_DENIED` audit) in `server/src/authorization/tests/organization-context.guard.spec.ts`
- [X] T017 [P] [US1] Write `PermissionsGuard` unit tests (missing metadata fail-closed, `@AllowActiveMember()` allowance, `AND` multi-permission enforcement, unknown role fail-closed, role downgrade reflected immediately, `AUTHZ_DENIED` audit) in `server/src/authorization/tests/permissions.guard.spec.ts`

**Checkpoint**: Core RBAC engine, guards, and access-context endpoints fully implemented and verified by unit tests.

---

## Phase 4: User Story 2 - Enforce Tenant-Scoped Resource Access and Technician Assignment Boundaries (Priority: P1)

**Goal**: Provide reusable, unit-tested service-level resource policies enforcing tenant query scoping, parent-child tenant consistency, strict `Technician` assignment-related scoping (work orders + linked assets/sensors/telemetry/anomalies/predictions/risk/incidents/maintenance), atomic write-time workflow-state checks, demo-only simulator controls, and tenant-bound exports.

**Independent Test**: Verify via policy unit tests that cross-tenant record/parent probes fail with concealed `404`, `Technician` list queries filter by `assignedToUserId` in the query predicate, `Technician` cannot access unassigned work orders or unlinked operational resources or mutate `assignedToUserId`/`organizationId`, write-time state checks catch stale concurrent mutations with `409`, and `SimulatorPolicy` blocks production/physical actuation.

### Implementation for User Story 2

- [X] T018 [P] [US2] Implement `ResourceTenantPolicy` (`assertSameTenant`, `assertParentTenantConsistency`, `tenantWhere`) in `server/src/authorization/policies/resource-tenant.policy.ts`
- [X] T019 [P] [US2] Implement `TechnicianScopePolicy` (`workOrderListWhere`, `assertAssignedWorkOrder`, `assertRelatedResourceAccess`, `assertTechnicianEditableWorkOrderFields`) in `server/src/authorization/policies/technician-scope.policy.ts`
- [X] T020 [P] [US2] Implement `WorkOrderPolicy` (read/create/assign/update/complete + atomic conditional write-time state/assignee validation) in `server/src/authorization/policies/work-order.policy.ts`
- [X] T021 [P] [US2] Implement `IncidentPolicy` (read/create/assign/investigate/add-related-note/resolve/close + state transition validation) in `server/src/authorization/policies/incident.policy.ts`
- [X] T022 [P] [US2] Implement `SimulatorPolicy` (demo-only non-production restriction for `ENGINEER` + unconditional physical-actuation denial for all roles) and `ExportPolicy` (export permission + tenant-scoped short-lived download grant verification) in `server/src/authorization/policies/simulator.policy.ts` and `server/src/authorization/policies/export.policy.ts`

### Tests for User Story 2

- [X] T023 [US2] Write comprehensive unit tests covering tenant isolation, parent-child cross-tenant rejection, strict `Technician` assignment-related scoping across operational resources, work-order editable-field allowlist, write-time state conflict checks, demo-only simulator rules, and tenant-bound export grants in `server/src/authorization/tests/resource-policies.spec.ts`

**Checkpoint**: Reusable domain resource and query-scope policies complete and verified.

---

## Phase 5: User Story 3 - Safely Administer Organization Member Roles and Protect Ownership Invariants (Priority: P1)

**Goal**: Implement `OWNER`-only membership administration (`GET /members`, `GET /members/:membershipId`, `PATCH /members/:membershipId/role`, `POST /members/:membershipId/suspend`, `POST /members/:membershipId/reactivate`, `DELETE /members/:membershipId`, and atomic `POST /ownership-transfer`) with strict Zod validation, self-escalation prevention, PostgreSQL `FOR UPDATE` organization locking for last-active-owner protection, transactional audit logging, and real-time revocation notification.

**Independent Test**: Verify via unit and E2E tests that only `OWNER` can administer members, non-owners get `403`, cross-tenant membership IDs return `404`, self-role updates and generic `OWNER` assignment/revocation are blocked, concurrent last-owner suspend/remove attempts always preserve ≥ 1 active `OWNER` (`409`), and atomic ownership transfer leaves zero ownerless window.

### Implementation for User Story 3

- [X] T024 [P] [US3] Create strict Zod 4 DTO schemas (`UpdateMemberRoleSchema`, `TransferOwnershipSchema`, `ListMembersQuerySchema`, `MembershipIdParamSchema`, `InviteRoleValidationSchema` blocking `OWNER` invitations and body ownership spoofing per `data-model.md` §5–§6) and Swagger DTOs in `server/src/memberships/dto/memberships.schemas.ts` and `server/src/memberships/dto/memberships-swagger.dto.ts`
- [X] T025 [US3] Implement `MembershipsRepository` with tenant-scoped queries (`Membership.organizationId` + `Membership.id` per `data-model.md` §3.2), cursor pagination, and `lockOrganizationForUpdate(tx, organizationId)` PostgreSQL row locking in `server/src/memberships/memberships.repository.ts`
- [X] T026 [US3] Implement `MembershipsService` enforcing role transition rules (`data-model.md` §5.1–§5.2), self-escalation denial, concurrency-safe last-active-owner protection, atomic ownership transfer, co-committed `AuditLog` writes, and membership-revocation event publication in `server/src/memberships/memberships.service.ts`
- [X] T027 [US3] Implement `@OrgProtected()` `MembershipsController` (`/organizations/:organizationId/members`, `/:membershipId`, `/:membershipId/role`, `/:membershipId/suspend`, `/:membershipId/reactivate`, `DELETE /:membershipId`, and `/ownership-transfer`) and `MembershipsModule` in `server/src/memberships/memberships.controller.ts` and `server/src/memberships/memberships.module.ts`

### Tests for User Story 3

- [X] T028 [US3] Write `MembershipsService` unit tests (role transitions, self-escalation block, generic `OWNER` grant/revoke block, invite-role validation, last-active-owner protection on suspend/remove, atomic ownership transfer, soft-removal terminal state, audit event verification) in `server/src/memberships/memberships.service.spec.ts`

**Checkpoint**: Membership administration and concurrency-safe ownership invariants complete and unit-tested.

---

## Phase 6: User Story 5 - Cross-Channel Authorization & Secret-Free Auditing (Priority: P2)

*(Executed before Frontend UI so `AuthorizationModule` exports and `AppModule` wiring are finalized cleanly before full-stack E2E verification.)*

**Goal**: Implement reusable WebSocket subscription/room authorization + Redis membership-revocation pub/sub, strict Zod-validated `BackgroundJobAuthorizationService` (`JobProvenance` producer/worker verification), and explicit `DeviceIsolationGuardrail` separating MQTT device credentials from human RBAC, then assemble and wire `AuthorizationModule` into `AppModule`.

**Independent Test**: Verify via unit tests that cross-tenant WebSocket subscriptions fail, server generates canonical room IDs, membership revocation triggers subscriber cleanup, background workers reject mismatched tenant IDs or unauthorized `SYSTEM` capabilities, and human `OWNER` contexts cannot satisfy device MQTT publish checks.

### Implementation for User Story 5

- [X] T029 [P] [US5] Implement `WsAuthorizationService` (handshake JWT + active user/session verification, server-side resource-to-org room resolution, permission check, canonical room naming, and Redis `gridaware:authz:membership-revoked` pub/sub publishing/handling) in `server/src/authorization/channels/ws-authorization.service.ts`
- [X] T030 [P] [US5] Implement `BackgroundJobAuthorizationService` (`JobProvenanceSchema` matching `data-model.md` §4.3 `JobProvenance`, producer-side authorization builder, worker-side aggregate tenant & allowlisted `SystemJobCapability` re-validation) in `server/src/authorization/channels/background-job-authorization.service.ts`
- [X] T031 [P] [US5] Implement `DeviceIsolationGuardrail` enforcing strict boundary separation between MQTT device topic credentials (`server/src/telemetry/telemetry-topic.ts`) and human `OrganizationAuthorizationContext` in `server/src/authorization/channels/device-isolation.guardrail.ts`
- [X] T032 [US5] Wire `AuthorizationModule` (exporting guards, `AuthorizationService`, all 6 domain policies, and all 3 channel services) in `server/src/authorization/authorization.module.ts` and register `AuthorizationModule`, `OrganizationsModule`, and `MembershipsModule` in `server/src/app.module.ts`

### Tests for User Story 5

- [X] T033 [US5] Write cross-channel authorization unit tests (WebSocket handshake/subscription/cross-tenant denial/revocation cleanup, background-job producer/worker tenant mismatch & system capability allowlist, MQTT device vs human `OWNER` separation, controller route metadata reflection check confirming zero undeclared routes on `@OrgProtected()` controllers) in `server/src/authorization/tests/channels-authorization.spec.ts`

**Checkpoint**: Full backend authorization stack (HTTP, Policies, Memberships, WS, Jobs, Devices, Audit) wired into `AppModule` and unit-tested.

---

## Phase 7: User Story 4 - Role-Aware User Interface Visibility via Server-Provided Access Context (Priority: P2)

**Goal**: Implement frontend pure capability helpers (`can`, `canAll`, `canAny`, `isReadOnlyRole`), `AccessContextProvider` with organization-switch and session-refresh capability synchronization, EVARAX WCAG 2.2 AA `<PermissionDeniedState>`, `<RoleBadge>`, `<PermissionGate>`, `<OrganizationSwitcher>`, and the Owner-only Members administration screen.

**Independent Test**: Verify via `node --test` unit tests that `can()`/`canAll()`/`getVisibleNavItems()` accurately reflect all 5 roles, `Viewer` is strictly read-only, organization switching clears prior-tenant capability state, and TypeScript/Next.js build passes cleanly with accessible EVARAX components.

### Implementation for User Story 4

- [X] T034 [P] [US4] Create frontend RBAC types (`MembershipRole`, `Permission`, `OrganizationAccessContext`, `AccessibleOrganizationSummary`, `MemberSummary`, `OwnershipTransferResult`) in `client/lib/authorization/types.ts` and pure ESM capability helpers (`can`, `canAll`, `canAny`, `isReadOnlyRole`, `getVisibleOrgNavItems`) in `client/lib/authorization/permissions.mjs` and `client/lib/authorization/permissions.d.ts`
- [X] T035 [P] [US4] Create typed credentialed API client wrappers (`listAccessibleOrganizations`, `getOrganizationAccessContext`, `listOrganizationMembers`, `updateMemberRole`, `suspendMember`, `reactivateMember`, `removeMember`, `transferOwnership`) using `apiRequest()` in `client/lib/authorization/api.ts`
- [X] T036 [US4] Implement `AccessContextProvider`, `useAccessContext()`, and `broadcastOrganizationChanged()` (clearing prior-tenant state and re-fetching on org switch, `gridaware:auth` `SESSION_REFRESHED`/`SESSION_INVALIDATED`, and `403`/`404` responses) in `client/components/authorization/access-context-provider.tsx`
- [X] T037 [P] [US4] Create EVARAX WCAG 2.2 AA `<RoleBadge>`, `<PermissionGate>`, `<PermissionDeniedState>` (non-color-only icon + text, keyboard-accessible return link, non-disclosing `404` variant), and `<OrganizationSwitcher>` in `client/components/authorization/role-badge.tsx`, `client/components/authorization/permission-gate.tsx`, `client/components/authorization/permission-denied-state.tsx`, and `client/components/authorization/organization-switcher.tsx`
- [X] T038 [US4] Implement Owner-only `<MembersManagementPanel>` (member table with narrow-screen responsive layout, non-owner role selector disabled on self/`OWNER`, Radix `AlertDialog` confirmations for suspend/reactivate/remove and dedicated Ownership Transfer, `409` conflict banner) in `client/components/authorization/members-management-panel.tsx`
- [X] T039 [US4] Add organization-scoped App Router pages (`/app/organizations/[organizationId]/layout.tsx`, `/app/organizations/[organizationId]/page.tsx`, `/app/organizations/[organizationId]/members/page.tsx`) and integrate `<OrganizationSwitcher>` into `client/components/auth/protected-header.tsx` and `client/app/(protected)/app/page.tsx`

### Tests for User Story 4

- [X] T040 [P] [US4] Write `node --test` unit tests covering `can()`, `canAll()`, `canAny()`, `isReadOnlyRole()`, and 5-role navigation visibility filtering in `client/lib/authorization/permissions.test.mjs` and register it in `client/package.json` `test` script

**Checkpoint**: Frontend capability context, role-aware navigation, accessible denied/read-only states, and Owner member administration complete and tested.

---

## Phase 8: Polish, E2E Security Matrix & Cross-Cutting Validation

**Purpose**: End-to-end 5-role security matrix, cross-tenant & concurrent last-owner E2E verification, canonical OpenAPI sync, and full CI quality gates

- [X] T041 Write comprehensive NestJS + Supertest E2E suite covering all 5 roles (`OWNER`, `FACILITY_MANAGER`, `ENGINEER`, `TECHNICIAN`, `VIEWER`), cross-tenant probes (`404` non-disclosure), immediate role downgrade & suspension effect without logout, CSRF enforcement on mutations, self-escalation block, concurrent last-active-owner stress test (`Promise.allSettled`), atomic ownership transfer, and secret-free `audit_logs` inspection in `server/test/rbac.e2e-spec.ts`
- [X] T042 [P] Sync Phase 5.3 `/organizations`, `/organizations/{organizationId}/access-context`, `/organizations/{organizationId}/members/*`, and `/organizations/{organizationId}/ownership-transfer` paths and schemas into `docs/contracts/openapi.yaml`
- [X] T043 Run full CI validation suite (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter server test:e2e`, `pnpm contracts:validate`, `pnpm build`) and verify zero errors, warnings, or skipped security assertions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately.
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS** all user stories (`T004` Prisma migration/generate must complete before TypeScript compilation of Prisma `MembershipRole` imports).
- **Phase 3 (US1 - Core RBAC & Guards)**: Depends on Phase 2 — establishes `AuthorizationService`, `permission-map.ts`, guards, and decorators.
- **Phase 4 (US2 - Resource Policies)** & **Phase 5 (US3 - Memberships)** & **Phase 6 (US5 - Cross-Channel Authz)**: Depend on Phase 3 (`T007`–`T012`). Can be implemented in parallel across independent modules.
- **Phase 7 (US4 - Frontend Capability UI)**: Depends on Phase 3 & Phase 5 API contracts (`T013`, `T014`, `T027`).
- **Phase 8 (Polish & E2E Security Matrix)**: Depends on Phases 3–7 completion.

### Parallel Opportunities

- **Phase 1**: `T002`, `T003` run in parallel.
- **Phase 2**: `T005`, `T006` run in parallel right after `T004`.
- **Phase 3 (US1)**: `T007`, `T009`, `T014` in parallel; then `T015`, `T016`, `T017` test suites in parallel.
- **Phase 4 (US2)**: `T018`, `T019`, `T020`, `T021`, `T022` are completely independent policy files and run in parallel.
- **Phase 6 (US5)**: `T029`, `T030`, `T031` run in parallel.
- **Phase 7 (US4)**: `T034`, `T035`, `T037`, `T040` run in parallel.

### Suggested MVP Scope

- **MVP Slice**: Phases 1–3 (`US1`, tasks `T001`–`T017`) deliver the complete fail-closed permission catalogue, guard chain, active membership resolution, and access-context API.
- **Full Phase 5.3 Delivery**: All 43 tasks (`T001`–`T043`) across Phases 1–8.
