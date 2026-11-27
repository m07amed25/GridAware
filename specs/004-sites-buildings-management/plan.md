# Implementation Plan: Sites & Buildings Management (Phase 5.4)

**Branch**: `004-sites-buildings-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-sites-buildings-management/spec.md`

## Summary

Phase 5.4 delivers the first physical-location hierarchy of GridAware (`Organization -> Site -> Building`) as a full vertical slice across Neon PostgreSQL/Prisma 7, NestJS 12 backend modules, OpenAPI 3.1 contracts, and EVARAX-compliant WCAG 2.2 AA Next.js 16 management screens. It enforces strict multi-tenant isolation via composite PostgreSQL foreign keys (`(siteId, organizationId) -> (id, organizationId)`), PostgreSQL `CHECK` constraints, tenant-scoped repository queries, tenant-validated keyset cursor pagination, and transactional row-locking for concurrent archive/create invariants. Authorization reuses Phase 5.3's `@OrgProtected()` guard chain and `sites:*`/`buildings:*` permissions without duplication, enforcing strict archive-permission gating on `includeArchived` views (`FR-015`) and strict `ACTIVE` non-archived parent-site preconditions for building creation and restoration (`FR-010`). Every mutation atomically emits structured `AuditLog` entries and low-cardinality operational metrics.

## Technical Context

**Language/Version**: TypeScript 6.0 (ESM `"type": "module"`) on Node.js 22+ (`server/`); TypeScript 5 + React 19.3 on Next.js 16.4.6 (`client/`)

**Primary Dependencies**:
- Backend (`server/`): NestJS 12 (`@nestjs/common`, `@nestjs/core`, `@nestjs/swagger`), Prisma ORM 7.10.1 (`prisma-client` generator + `@prisma/adapter-neon`), Zod 4.6.7 + `ZodValidationPipe`
- Frontend (`client/`): Next.js 16.4.6 App Router, React 19.3, Tailwind CSS 4.3, Radix UI (`@radix-ui/react-alert-dialog`, `@radix-ui/react-label`, `@radix-ui/react-separator`, `@radix-ui/react-tooltip`, `@radix-ui/react-dropdown-menu`), `lucide-react`, `sonner`

**Storage**: Neon PostgreSQL via Prisma ORM 7 (`sites` and `buildings` tables with UUID keys, composite tenant-safe FK, `CHECK` constraints, and existing `audit_logs` table)

**Testing**: Vitest 4.1.2 + Supertest (`server/` unit, contract, integration, and cross-tenant E2E tests); `node --test` (`client/lib/` pure validation/formatting/permission tests); `pnpm contracts:validate` (Ajv 2020-12 OpenAPI 3.1 validation)

**Target Platform**: Linux/containerized Node.js API server (`:3001`, `/api/v1`) and responsive web browser desktop/tablet/mobile (`:3000`, Next.js App Router)

**Project Type**: Multi-tenant B2B SaaS full-stack web application (`pnpm` workspace monorepo with `server/` + `client/`)

**Performance Goals**: Ordinary authenticated site/building list and detail queries `p95 < 300 ms` (ceiling `< 500 ms`); bounded cursor pagination (`default 20`, `max 100`); zero N+1 queries (`_count` filtered to `archivedAt: null`)

**Constraints**: Zero cross-tenant leakage (non-disclosing 404 on foreign/wrong-site lookups); no hard-delete endpoints; immutable normalized codes never reused after archive; decimal areas transferred strictly as strings; zero high-cardinality IDs in metrics; exact EVARAX dark-first tokens and WCAG 2.2 AA accessibility

**Scale/Scope**: 16 REST endpoints (8 Sites, 8 Buildings), 2 new Prisma models + 3 enums + 6 SQL `CHECK` constraints, 12 new `AuditAction` events, 8 new stable domain `ErrorCode` values, 3 new ADRs (`ADR-0010`..`ADR-0012`), 3 protected frontend routes + 7 UI components + client location helpers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Pre-Design Gate | Post-Design Verification |
|---|---|---|
| **I. Tenant Isolation & Least-Privilege Access (NON-NEGOTIABLE)** | PASS — Reuses `@OrgProtected()` and Phase 5.3 `sites:*`/`buildings:*` permissions; every query scoped by `organizationId`. | PASS — Enforced at three layers: guard chain (`OrganizationContextGuard` + `PermissionsGuard`), service/repository scoped queries + cursor tenant validation, and PostgreSQL composite FK `(siteId, organizationId) -> sites(id, organizationId)`. Cross-tenant/wrong-site IDs return concealed `404`. |
| **II. Decision-Support Only — No Physical Equipment Control (NON-NEGOTIABLE)** | PASS — Location metadata/lifecycle only; zero control channels. | PASS — UI and DTO contracts explicitly separate operational location status (`ACTIVE`/`INACTIVE`) from equipment health; zero control commands introduced. |
| **III. Simulator-First Provenance & Incremental Scope** | PASS — Scoped strictly to Sites & Buildings; Assets/Sensors/Telemetry deferred to Phase 5.5+. | PASS — Development seed script (`seed-demo-locations.ts`) explicitly labels demo fixtures and blocks execution in production (`NODE_ENV === 'production'`). |
| **IV. Durable, Idempotent & Truthful Telemetry Pipeline** | N/A for telemetry ingestion; transactional atomicity applies to mutations. | PASS — All location mutations and `AuditLog` writes execute inside a single Prisma transaction with parent-site `FOR UPDATE` locking on archive/create/restore. |
| **V. Modular Monolith & Explicit Service Boundaries** | PASS — Dedicated `SitesModule` and `BuildingsModule` in `server/src/` with thin controllers, services, repositories, policies, mappers, zero circular deps. | PASS — `BuildingsModule` depends explicitly on `SitesModule` (one-way parent lookup/policy boundary); both depend on `PrismaModule`, `AuthorizationModule`, `AuditLogsModule`, `LoggingModule`. |
| **VI. Contract-First Interfaces & Runtime Validation** | PASS — Zod 4 `.strict()` schemas + OpenAPI 3.1 contract validated by `pnpm contracts:validate`. | PASS — [sites-buildings-openapi.yaml](./contracts/sites-buildings-openapi.yaml) covers all 16 endpoints and ProblemDetails errors; `contracts-validation.spec.ts` and `docs/contracts/openapi.yaml` synchronized; decimals validated as strings; bounded cursor pagination enforced. |
| **VII. Progressive, Explainable Intelligence & Auditability** | PASS — 12 new `AuditAction` values persisted transactionally with correlation IDs and secret sanitization. | PASS — `AuditLogsService.record(..., tx)` captures `organizationId`, `actorUserId`, `actorMembershipId`, `entityType`, `entityId`, `requestId`, `correlationId`, and sanitized before/after diffs; `LocationMetricsService` emits low-cardinality counters/timings. |
| **VIII. Operational Clarity, EVARAX Fidelity & WCAG 2.2 AA** | PASS — Frontend screens follow `DESIGN.md` tokens, Geist Sans/Mono, non-color-only badges, and WCAG 2.2 AA. | PASS — [frontend-locations.md](./contracts/frontend-locations.md) specifies loading/empty/error/permission-denied/not-found states, keyboard-accessible dialogs, `SITE_HAS_ACTIVE_BUILDINGS` guidance with direct link to buildings, and instant tenant-state clearing on org switch. |

All 8 Constitutional principles pass with **zero violations**.

## Project Structure

### Documentation (this feature)

```text
specs/004-sites-buildings-management/
├── plan.md                                  # This file (/speckit-plan output)
├── research.md                              # Phase 0 architecture & stack decisions
├── data-model.md                            # Phase 1 canonical schema, constraints & state machines
├── quickstart.md                            # Phase 1 runnable validation & test scenarios
├── contracts/
│   ├── sites-buildings-openapi.yaml         # Phase 1 OpenAPI 3.1 REST contract
│   └── frontend-locations.md                # Phase 1 frontend routes, capability & UX contract
└── tasks.md                                 # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
server/
├── prisma/
│   ├── schema.prisma                        # Add SiteType, BuildingType, LocationStatus, Site, Building, Organization inverse relations
│   ├── migrations/
│   │   └── <timestamp>_add_sites_buildings/
│   │       └── migration.sql                # Tables, composite FK, indexes, and 6 PostgreSQL CHECK constraints
│   └── seed-demo-locations.ts               # Explicit dev-only demo seed script (blocked in production)
├── src/
│   ├── app.module.ts                        # Register SitesModule and BuildingsModule
│   ├── audit-logs/
│   │   └── audit-logs.service.ts            # Extend AuditAction with 12 SITE_* and BUILDING_* events
│   ├── common/
│   │   ├── exceptions/
│   │   │   ├── error-codes.ts               # Add 8 Phase 5.4 domain ErrorCode entries & catalog metadata
│   │   │   └── app.exception.ts             # Add typed static factory helpers for location errors
│   │   ├── observability/
│   │   │   ├── location-metrics.service.ts  # Low-cardinality Prometheus-compatible location metrics recorder
│   │   │   └── observability.module.ts      # Global/shared export for LocationMetricsService
│   │   ├── pagination/
│   │   │   ├── location-cursor.ts           # Tenant-safe base64url keyset cursor encode/decode + keyset WHERE builder
│   │   │   └── location-cursor.spec.ts      # Unit tests for cursor validation and keyset ordering
│   │   └── validation/
│   │       ├── location-validation.ts       # Code/name/IANA timeZone/countryCode/coordinate-pair/grossAreaSqM validators
│   │       └── location-validation.spec.ts  # Comprehensive unit tests for normalization & bounds
│   ├── contracts/
│   │   └── contracts-validation.spec.ts     # Register sites-buildings-openapi.yaml validation
│   ├── sites/
│   │   ├── sites.module.ts
│   │   ├── sites.controller.ts              # 8 Site REST endpoints with @OrgProtected, @RequirePermissions, Swagger docs
│   │   ├── sites.service.ts                 # Site CRUD, lifecycle, archive-blocker, transactional audit, P2002 mapping
│   │   ├── sites.repository.ts              # Explicit organizationId queries, FOR UPDATE lock, _count non-archived buildings
│   │   ├── dto/
│   │   │   ├── sites.schemas.ts             # Strict Zod 4 schemas (create, update, list query, detail query)
│   │   │   └── sites-swagger.dto.ts         # Swagger schema classes for OpenAPI docs
│   │   ├── mappers/
│   │   │   └── site.mapper.ts               # Explicit SiteRecord -> SiteDto mapper
│   │   ├── policies/
│   │   │   └── site-resource.policy.ts      # Tenant assertions, archive-view permission check, lifecycle state assertions
│   │   └── tests/
│   │       ├── sites.service.spec.ts
│   │       └── site-resource.policy.spec.ts
│   └── buildings/
│       ├── buildings.module.ts
│       ├── buildings.controller.ts          # 8 Building REST endpoints nested under sites/:siteId/buildings
│       ├── buildings.service.ts             # Parent site verification, CRUD, lifecycle, transactional audit, P2002 mapping
│       ├── buildings.repository.ts          # Explicit (organizationId, siteId) queries, composite-FK-backed persistence
│       ├── dto/
│       │   ├── buildings.schemas.ts         # Strict Zod 4 schemas (create, update, list query, detail query)
│       │   └── buildings-swagger.dto.ts     # Swagger schema classes for OpenAPI docs
│       ├── mappers/
│       │   └── building.mapper.ts           # Explicit BuildingRecord -> BuildingDto mapper (Decimal -> fixed string)
│       ├── policies/
│       │   └── building-resource.policy.ts  # Parent site ACTIVE/non-archived checks, archive-view check, lifecycle guards
│       └── tests/
│           ├── buildings.service.spec.ts
│           └── building-resource.policy.spec.ts
└── test/
    └── sites-buildings.e2e-spec.ts          # Full HTTP/Supertest E2E suite: CRUD, lifecycle, concurrency, 5-role RBAC & 2-org tenant isolation

client/
├── app/(protected)/app/organizations/[organizationId]/
│   └── sites/
│       ├── page.tsx                         # Sites Directory page
│       └── [siteId]/
│           ├── page.tsx                     # Site Overview & nested Buildings Directory page
│           └── buildings/
│               └── [buildingId]/
│                   └── page.tsx             # Building Overview page
├── components/
│   ├── authorization/
│   │   └── organization-shell.tsx           # Wire Sites & Buildings nav item icon + active nested-route highlighting
│   └── locations/
│       ├── location-status-badge.tsx        # Non-color-only Active / Inactive / Archived badge
│       ├── site-form-dialog.tsx             # Create & Edit Site accessible dialog form
│       ├── building-form-dialog.tsx         # Create & Edit Building accessible dialog form
│       ├── location-lifecycle-dialog.tsx    # Archive / Restore / Deactivate Radix AlertDialog with dependency guidance
│       ├── sites-directory-panel.tsx        # Sites list/filter/sort/pagination + tenant-switch reset
│       ├── site-detail-panel.tsx            # Site overview + local timezone clock + nested Buildings list
│       └── building-detail-panel.tsx        # Building details + lifecycle actions
└── lib/
    ├── authorization/
    │   ├── permissions.mjs                  # Add "Sites & Buildings" nav item gated by sites:read
    │   └── permissions.test.mjs             # Update nav visibility tests
    └── locations/
        ├── types.ts                         # TypeScript DTO & query contracts
        ├── api.ts                           # 16 Site & Building client API wrappers over apiRequest()
        ├── validation.mjs                   # Pure code preview, coordinate pair, area & timezone formatting helpers
        ├── validation.d.ts                  # Type declarations for validation.mjs
        └── validation.test.mjs              # Node --test unit tests for client location helpers

docs/
├── architecture/architecture-decision-records/
│   ├── ADR-0010-location-hierarchy.md
│   ├── ADR-0011-location-archive-policy.md
│   └── ADR-0012-location-tenant-integrity.md
└── contracts/
    └── openapi.yaml                         # Sync Site & Building paths and component schemas
```

**Structure Decision**: Reuse the repository's established `pnpm` monorepo structure (`server/` for NestJS modular monolith, `client/` for Next.js App Router, `docs/` for architecture ADRs and authoritative contracts) with dedicated `server/src/sites/` and `server/src/buildings/` domain modules, shared pure utilities under `server/src/common/` and `client/lib/locations/`, and nested organization routes under `client/app/(protected)/app/organizations/[organizationId]/sites/`.

## Complexity Tracking

No Constitution Check violations exist; no architectural exceptions are required.
