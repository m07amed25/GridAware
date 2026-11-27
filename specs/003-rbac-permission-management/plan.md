# Implementation Plan: Role-Based Access Control & Permission Management

**Branch**: `003-rbac-permission-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-rbac-permission-management/spec.md`

## Summary

Implement GridAware **Phase 5.3: Role-Based Access Control & Permission Management** across the NestJS 12 backend (`server/`) and Next.js 16 frontend (`client/`) to establish a centralized, fail-closed, organization-scoped authorization layer for the five fixed product roles (`OWNER`, `FACILITY_MANAGER`, `ENGINEER`, `TECHNICIAN`, `VIEWER`). The design introduces the canonical `Organization` and `Membership` Prisma 7 persistence models (aligned with Phase 5.2 specifications and extending `AuditLog` with `actorMembershipId`), an immutable code-defined catalogue of 61 `<resource>:<action>` permissions mapped to Prisma's generated `MembershipRole` enum (`POLICY_VERSION = "1"`), a strict four-stage HTTP guard pipeline (`AccessTokenGuard → CsrfGuard → OrganizationContextGuard → PermissionsGuard`) enforcing strict non-disclosure (`404 RESOURCE_NOT_FOUND` for unjoined/inactive organizations and cross-tenant resources; `403 FORBIDDEN` only for active members lacking required permissions), concurrency-safe PostgreSQL `FOR UPDATE` last-active-owner protection across membership administration and atomic ownership transfer, reusable service-level resource/query-scope policies (tenant isolation, strict `Technician` assignment-related scoping, incident/work-order state checks, demo-only simulator guardrails, tenant-bound exports), cross-channel authorization services (WebSocket room resolution + Redis revocation pub/sub, background-job provenance re-validation, MQTT device boundary separation), secret-free authorization audit logging, and capability-driven EVARAX WCAG 2.2 AA frontend integration.

## Technical Context

**Language/Version**: TypeScript `6.0.2` on Node.js `>=24` ESM (`server/`); TypeScript `5.x` with React `19.3.0` (`client/`)

**Primary Dependencies**:

- `server/`: NestJS `^12.0.1` (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger` `^12.1.2`), Prisma `7.10.1` + `@prisma/client` `^7.10.1` + `@prisma/adapter-neon` `^7.10.1`, `zod` `4.6.7` (`ZodValidationPipe`), `ioredis` `^6.1.0` (existing `RedisService` used for WebSocket membership-revocation pub/sub notifications), `jose` `^6.2.18` (existing Phase 5.1 `TokenCryptoService` reused for WS handshake verification)
- `client/`: Next.js `16.4.6` App Router, React `19.3.0`, Tailwind CSS `4.3.3`, existing Radix UI primitives (`alert-dialog`, `dropdown-menu`, `tooltip`, `badge`, `button`, `card`, `separator`, `skeleton`), `lucide-react`, `sonner`

**Storage**: Neon PostgreSQL via Prisma ORM `7.10.1` (`organizations`, `memberships`, additive `actorMembershipId` on `audit_logs`); Redis `7-alpine` via `RedisService` for real-time membership-revocation pub/sub events only (no cross-request permission caching in MVP)

**Testing**: Vitest `^4.1.2` + `supertest` `^7.0.0` (`server/` unit, guard, policy, contract, concurrency, and cross-tenant E2E suites); Node built-in test runner `node --test` (`client/` unit tests for pure capability helpers and route-guard logic)

**Target Platform**: Containerized Linux / Node.js server + modern desktop and mobile browsers (developed and verified locally on Windows + Docker Compose)

**Project Type**: Multi-tenant B2B SaaS web application monorepo (`pnpm@12.18.0` workspaces: `client/`, `server/`)

**Performance Goals**: `p95 < 300 ms` on authenticated organization-scoped reads and `GET /api/v1/organizations/:organizationId/access-context` under standard MVP workload (`SC-007`, `NFR-PERF-001`), achieved via a single indexed composite lookup `(organizationId, userId, status)` directly on Neon PostgreSQL without cross-request caching

**Constraints**:

- Strict ESM in `server/` (`.js` relative import specifiers, `import.meta.dirname`, Vitest `vi.fn()`)
- Deny-by-default & fail-closed on missing permission metadata, missing organization context, inactive organization/membership, or unknown role (`FR-004`, `FR-005`)
- Strict non-disclosure (`404 RESOURCE_NOT_FOUND`) for unjoined, non-existent, or inactive organizations/memberships and cross-tenant child probes (`FR-008`)
- Live server-side membership evaluation per request — zero durable role claims in JWTs and zero cross-request permission cache (`FR-007`, `SC-004`)
- PostgreSQL `FOR UPDATE` tenant lock guaranteeing zero ownerless organizations under concurrent administrative operations (`FR-016`, `SC-005`)
- Zero new runtime npm packages required across `server/` or `client/`
- Exact six EVARAX brand HEX colors and WCAG 2.2 Level AA compliance on permission-denied, read-only, and member administration views (`FR-018`, `SC-008`)

**Scale/Scope**: 2 new Prisma models + 3 enums + 1 additive `AuditLog` column, 61 canonical permissions across 5 roles, 8 `/api/v1` organization/authorization/membership endpoints (plus active memberships wired into `GET /api/v1/me`), 6 reusable domain resource policies, 3 cross-channel authorization services, 2 Next.js organization/member UI routes + reusable capability provider/components, and full positive/negative/concurrency/cross-tenant automated verification

## Constitution Check

_GATE: Evaluated before Phase 0 research and re-verified after Phase 1 design against [constitution.md](../../.specify/memory/constitution.md) v1.0.0._

| Constitutional Gate | Pre-Research Status | Post-Design Verification |
|---|---|---|
| **I. Tenant Isolation & Least-Privilege Access** | PASS | `Membership.role` is strictly organization-scoped (zero roles on global `User`); `OrganizationContextGuard` resolves active `(organizationId, userId)` server-side from route params only; `ResourceTenantPolicy` & `TechnicianScopePolicy` enforce tenant and assignment filters in database queries and return concealed `404` on cross-tenant probes; `DeviceIsolationGuardrail` keeps MQTT device credentials strictly isolated from human RBAC. |
| **II. Decision-Support Only — No Equipment Control** | PASS | `SimulatorPolicy` explicitly blocks physical equipment actuation for all roles including `OWNER`, and restricts `ENGINEER` `simulator:control` to explicitly enabled non-production demo simulations only. |
| **III. Simulator-First Provenance & Incremental Scope** | PASS | Fixed five-role MVP model with zero custom role builder, zero per-site custom role grants, and simulator-only provenance guardrails preserved. |
| **IV. Durable, Idempotent & Truthful Telemetry** | PASS | Telemetry ingestion durability and idempotency remain untouched; all membership mutations and ownership transfers run inside atomic PostgreSQL transactions with co-committed `AuditLog` entries. |
| **V. Modular Monolith & Explicit Service Boundaries** | PASS | Bounded NestJS modules (`organizations`, `memberships`, `authorization`) inside `server/src/` with explicit exports, thin controllers, and zero circular module dependencies; `AuthorizationModule` depends only on `PrismaModule`, `AuthModule`, `AuditLogsModule`, `RedisModule`, and `EnvModule`. |
| **VI. Contract-First Interfaces & Runtime Validation** | PASS | All command and query DTOs use `.strict()` Zod 4 schemas via `ZodValidationPipe` rejecting unknown ownership fields (`organizationId`, `userId`, `role` spoofing); documented in `contracts/rbac-openapi.yaml`, synced to `docs/contracts/openapi.yaml`, and verified by `pnpm contracts:validate` (`Ajv2020`). |
| **VII. Progressive Intelligence & Auditability** | PASS | Extends append-only `AuditLogsService` with 13 authorization/membership/export/simulator actions plus nullable `actorMembershipId`, preserving `requestId`/`correlationId` propagation and stripping all secrets/tokens/cookies/invitation credentials. |
| **VIII. EVARAX Fidelity & WCAG 2.2 AA Accessibility** | PASS | Frontend `PermissionDeniedState`, `RoleBadge`, `OrganizationSwitcher`, and `Members` management views use centralized EVARAX dark-first tokens, text+icon status cues (never color-only), and full keyboard-operable Radix dialogs. |
| **Platform & Quality Gate Constraints** | PASS | Single `pnpm@12.18.0` monorepo (`server/`, `client/`), reviewed Prisma 7 migration, `camelCase` JSON / `UPPER_SNAKE_CASE` enums / UUID IDs / UTC ISO 8601 timestamps, `p95 < 300ms` indexed direct lookup, and comprehensive risk-based Vitest + Supertest + `node --test` suites. |

## Project Structure

### Documentation (this feature)

```text
specs/003-rbac-permission-management/
├── plan.md                                 # This implementation plan
├── spec.md                                 # Clarified feature specification (FR-001..FR-024, SC-001..SC-008)
├── research.md                             # Phase 0 technical decisions (R1..R8)
├── data-model.md                           # Phase 1 Prisma 7 models, enums, indexes, and state machines
├── quickstart.md                           # Phase 1 runnable setup and E2E validation guide
├── checklists/
│   └── requirements.md                     # Specification quality checklist (16/16 passing)
└── contracts/
    ├── rbac-openapi.yaml                   # OpenAPI 3.1 contract for /organizations, /access-context, /members/*, /ownership-transfer
    └── frontend-authorization.md           # Next.js 16 capability context, role-aware UI, and WCAG 2.2 AA contract
```

### Source Code (repository root)

```text
docs/
└── contracts/
    └── openapi.yaml                                      # Synced with Phase 5.3 /organizations, /access-context, /members/*, /ownership-transfer routes

server/
├── prisma/
│   ├── schema.prisma                                     # Adds Organization, Membership, enums, and AuditLog.actorMembershipId
│   └── migrations/
│       └── <timestamp>_init_organizations_rbac/          # Reviewed Prisma 7 SQL migration
├── src/
│   ├── app.module.ts                                     # Imports AuthorizationModule, OrganizationsModule, MembershipsModule
│   ├── config/
│   │   ├── env.schema.ts                                 # Adds SIMULATOR_DEMO_CONTROL_ENABLED boolean flag
│   │   └── env.service.ts                                # Typed getter for simulatorDemoControlEnabled
│   ├── audit-logs/
│   │   └── audit-logs.service.ts                         # Adds 13 RBAC/membership/export/simulator actions, actorMembershipId, extended secret redaction
│   ├── auth/
│   │   └── me.controller.ts                              # Wires real active organization memberships into GET /api/v1/me
│   ├── contracts/
│   │   └── contracts-validation.spec.ts                  # Adds Ajv2020 validation of specs/003-rbac-permission-management/contracts/rbac-openapi.yaml
│   ├── authorization/
│   │   ├── authorization.module.ts                       # Exports guards, AuthorizationService, policies, and channel services
│   │   ├── authorization.constants.ts                    # POLICY_VERSION, metadata keys, Redis revocation channel name
│   │   ├── authorization.types.ts                        # ALL_PERMISSIONS (61), Permission, OrganizationAuthorizationContext, RequestWithOrganizationContext
│   │   ├── permission-map.ts                             # Immutable ROLE_PERMISSIONS keyed by Prisma MembershipRole + getPermissionsForRole()
│   │   ├── authorization.service.ts                      # hasPermission, hasAllPermissions, buildAccessContext, evaluateRolePermissions
│   │   ├── authorization.controller.ts                   # GET /organizations/:organizationId/access-context
│   │   ├── decorators/
│   │   │   ├── require-permissions.decorator.ts          # @RequirePermissions(...permissions) (AND semantics)
│   │   │   ├── allow-active-member.decorator.ts          # @AllowActiveMember() strictly for self access-context
│   │   │   ├── org-protected.decorator.ts                # @OrgProtected() composing AccessTokenGuard, CsrfGuard, OrganizationContextGuard, PermissionsGuard
│   │   │   └── org-context.decorator.ts                  # @OrgContext() parameter decorator extracting verified OrganizationAuthorizationContext
│   │   ├── guards/
│   │   │   ├── organization-context.guard.ts             # Live DB active membership & active org verification; strict 404 concealment + AUTHZ_DENIED audit
│   │   │   └── permissions.guard.ts                      # Deny-by-default Reflector permission enforcement + AUTHZ_DENIED audit
│   │   ├── policies/
│   │   │   ├── resource-tenant.policy.ts                 # assertSameTenant, assertParentTenantConsistency, tenantWhere (404 concealment)
│   │   │   ├── technician-scope.policy.ts                # workOrderListWhere, assertAssignedWorkOrder, assertRelatedResourceAccess, editable-field allowlist
│   │   │   ├── work-order.policy.ts                      # Read/create/assign/update/complete rules + atomic conditional write-time validation
│   │   │   ├── incident.policy.ts                        # Read/create/assign/investigate/add-related-note/resolve/close + state transition checks
│   │   │   ├── simulator.policy.ts                       # Demo-only Engineer restriction + unconditional physical-actuation denial
│   │   │   └── export.policy.ts                          # Export permission check + tenant-scoped short-lived download grant verification
│   │   ├── channels/
│   │   │   ├── ws-authorization.service.ts               # Handshake auth, resource-to-org room resolution, Redis membership-revocation pub/sub
│   │   │   ├── background-job-authorization.service.ts   # Strict Zod JobProvenance validation, producer check, worker tenant/capability re-validation
│   │   │   └── device-isolation.guardrail.ts             # Explicit separation contract between MQTT Device credentials and human RBAC context
│   │   ├── dto/
│   │   │   └── authorization-swagger.dto.ts              # @nestjs/swagger OpenAPI 3.1 response classes for access-context
│   │   └── tests/
│   │       ├── permission-map.spec.ts                    # Exhaustive 5-role / 61-permission completeness, Viewer read-only, unknown-role fail-closed
│   │       ├── organization-context.guard.spec.ts        # Active/inactive org/membership, cross-org isolation, 404 concealment, body-spoof rejection
│   │       ├── permissions.guard.spec.ts                 # Fail-closed missing metadata, AND semantics, role matrix, AUTHZ_DENIED auditing
│   │       ├── resource-policies.spec.ts                 # Tenant, Technician assignment-related scope, WorkOrder, Incident, Simulator, Export policies
│   │       └── channels-authorization.spec.ts            # WebSocket room auth + revocation, background-job provenance, MQTT device boundary separation
│   ├── organizations/
│   │   ├── organizations.module.ts
│   │   ├── organizations.repository.ts                   # Active-membership organization queries
│   │   ├── organizations.service.ts                      # List accessible organizations for current user
│   │   └── organizations.controller.ts                   # GET /api/v1/organizations
│   └── memberships/
│       ├── memberships.module.ts
│       ├── memberships.repository.ts                     # Tenant-scoped member queries + PostgreSQL FOR UPDATE organization lock + atomic transitions
│       ├── memberships.service.ts                        # Role updates, suspend/reactivate, soft removal, atomic ownership transfer, audit + WS revocation
│       ├── memberships.controller.ts                     # /organizations/:organizationId/members/* and /ownership-transfer (@OrgProtected)
│       ├── dto/
│       │   ├── memberships.schemas.ts                    # Strict Zod 4 request/query/param schemas (rejecting body organizationId/userId/OWNER)
│       │   └── memberships-swagger.dto.ts                # @nestjs/swagger DTO classes
│       └── memberships.service.spec.ts                   # Unit tests for role rules, self-escalation block, last-owner protection, ownership transfer
└── test/
    └── rbac.e2e-spec.ts                                  # Full 5-role E2E matrix, cross-tenant probes, immediate downgrade, concurrent last-owner stress test, audit checks

client/
├── app/
│   └── (protected)/
│       ├── layout.tsx                                    # Integrates OrganizationSwitcher and role-aware shell links
│       └── app/
│           └── organizations/
│               └── [organizationId]/
│                   ├── layout.tsx                        # Wraps org subtree in AccessContextProvider + org-switch state reset
│                   ├── page.tsx                          # Role-aware organization overview + Viewer read-only state + role badge
│                   └── members/
│                       └── page.tsx                      # Owner-only Members management screen + accessible PermissionDeniedState fallback
├── components/
│   └── authorization/
│       ├── access-context-provider.tsx                   # Client context fetching /access-context + BroadcastChannel refresh & stale-tenant clearing
│       ├── permission-gate.tsx                           # Declarative presentation-only permission gating component
│       ├── permission-denied-state.tsx                   # EVARAX WCAG 2.2 AA non-color-only access-denied & non-disclosure 404 component
│       ├── role-badge.tsx                                # Accessible icon + text badge for the 5 fixed roles & read-only indicator
│       ├── organization-switcher.tsx                     # Accessible dropdown listing active memberships only + clean context switching
│       └── members-management-panel.tsx                  # Owner member table, non-owner role select, suspend/reactivate/remove & ownership-transfer Radix dialogs
└── lib/
    └── authorization/
        ├── types.ts                                      # Shared frontend RBAC DTO types (MembershipRole, Permission, AccessContextData, MemberSummary)
        ├── permissions.mjs                               # Pure ESM can(), canAll(), canAny(), isReadOnlyRole(), getVisibleNavItems()
        ├── permissions.d.ts                              # TypeScript declarations for permissions.mjs
        ├── permissions.test.mjs                          # node --test unit tests covering all 5 roles, read-only Viewer, and navigation filtering
        └── api.ts                                        # Typed apiRequest() wrappers for organizations, access-context, members, and ownership-transfer
```

**Structure Decision**: Retain the ratified root `pnpm` workspace structure (`server/` for NestJS 12 modular monolith and `client/` for Next.js 16 App Router—mapping the Phase 5.3 brief's illustrative `apps/api/` path directly to `server/`). Add bounded `authorization`, `organizations`, and `memberships` domain modules in `server/src/` alongside `client/lib/authorization/`, `client/components/authorization/`, and `client/app/(protected)/app/organizations/[organizationId]/` routes, requiring zero new runtime packages.

## Complexity Tracking

No Constitution Check violations exist; all architectural choices align directly with the ratified GridAware Constitution (`v1.0.0`).
