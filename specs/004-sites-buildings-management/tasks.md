---
description: "Actionable, dependency-ordered implementation tasks for GridAware Phase 5.4: Sites & Buildings Management"
---

# Tasks: Sites & Buildings Management (Phase 5.4)

**Input**: Design documents from `/specs/004-sites-buildings-management/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [sites-buildings-openapi.yaml](./contracts/sites-buildings-openapi.yaml), [frontend-locations.md](./contracts/frontend-locations.md), [quickstart.md](./quickstart.md)

**Tests**: Explicitly required by Phase 5.4 §18 (unit, integration, cross-tenant RBAC, and E2E workflows) and GridAware Constitution (`Risk-Based Verification`). Follow TDD within each phase: write tests first and verify they fail before implementing.

**Organization**: Tasks are grouped by user story (`US1`–`US5`) to enable independent vertical-slice implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story traceability label (`[US1]`–`[US5]`), used strictly in User Story phases
- Every task includes exact repository-relative file paths (`server/`, `client/`, `docs/`, `specs/`)

---

## Phase 1: Setup (Shared Contracts, Error Codes, Audit Actions & Observability)

**Purpose**: Establish shared error codes, audit actions, low-cardinality metrics, and OpenAPI contract registration required across all user stories.

- [X] T001 Extend `AuditAction` union with the 12 Phase 5.4 actions (`SITE_CREATED`, `SITE_UPDATED`, `SITE_ACTIVATED`, `SITE_DEACTIVATED`, `SITE_ARCHIVED`, `SITE_RESTORED`, `BUILDING_CREATED`, `BUILDING_UPDATED`, `BUILDING_ACTIVATED`, `BUILDING_DEACTIVATED`, `BUILDING_ARCHIVED`, `BUILDING_RESTORED`) in `server/src/audit-logs/audit-logs.service.ts`
- [X] T002 [P] Extend `ErrorCode`, `ERROR_CATALOG`, and `AppException` static factories with `SITE_NOT_FOUND`, `BUILDING_NOT_FOUND`, `SITE_CODE_ALREADY_EXISTS`, `BUILDING_CODE_ALREADY_EXISTS`, `SITE_ARCHIVED`, `SITE_INACTIVE`, `SITE_HAS_ACTIVE_BUILDINGS`, and `INVALID_LOCATION_STATE` in `server/src/common/exceptions/error-codes.ts` and `server/src/common/exceptions/app.exception.ts`
- [X] T003 [P] Implement low-cardinality `LocationMetricsService` (`gridaware_sites_created_total`, `gridaware_buildings_created_total`, `gridaware_location_mutations_total`, `gridaware_location_api_requests_total`, `gridaware_location_api_duration_seconds`, `gridaware_location_conflicts_total`) and global `ObservabilityModule` in `server/src/common/observability/location-metrics.service.ts` and `server/src/common/observability/observability.module.ts`
- [X] T004 [P] Register `specs/004-sites-buildings-management/contracts/sites-buildings-openapi.yaml` validation in `server/src/contracts/contracts-validation.spec.ts` and synchronize Site & Building paths and component schemas in `docs/contracts/openapi.yaml`

---

## Phase 2: Foundational (Database Schema, Migration, Shared Validation & Cursor Pagination)

**Purpose**: Core persistence, database constraints, validation, and tenant-safe pagination infrastructure that MUST complete before any user story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Update `server/prisma/schema.prisma` to add `SiteType`, `BuildingType`, and `LocationStatus` enums, `Organization.sites` and `Organization.buildings` inverse relations, and `Site` and `Building` models with composite tenant-safe FK, unique constraints, and indexes enforcing canonical schema definitions in `data-model.md` for `Site.id`, `Site.organizationId`, `Site.code`, `Site.name`, `Site.type`, `Site.description`, `Site.addressLine1`, `Site.addressLine2`, `Site.city`, `Site.region`, `Site.postalCode`, `Site.countryCode`, `Site.latitude`, `Site.longitude`, `Site.timeZone`, `Site.status`, `Site.archivedAt`, `Site.createdAt`, `Site.updatedAt`, `Building.id`, `Building.organizationId`, `Building.siteId`, `Building.code`, `Building.name`, `Building.type`, `Building.description`, `Building.floorCount`, `Building.grossAreaSqM`, `Building.status`, `Building.archivedAt`, `Building.createdAt`, and `Building.updatedAt`
- [X] T006 Create versioned Prisma SQL migration including the 6 PostgreSQL `CHECK` constraints (`sites_latitude_range_chk`, `sites_longitude_range_chk`, `sites_coordinates_pair_chk`, `sites_country_code_format_chk`, `buildings_floor_count_range_chk`, `buildings_gross_area_positive_chk` from `data-model.md` for `Site.latitude`, `Site.longitude`, `Site.countryCode`, `Building.floorCount`, `Building.grossAreaSqM`) in `server/prisma/migrations/<timestamp>_add_sites_buildings/migration.sql`, run `prisma validate`, apply to isolated development Neon branch, and regenerate Prisma Client into `server/src/generated/prisma/`
- [X] T007 [P] Write unit tests for location code normalization, Unicode name trimming/control-char rejection, IANA time-zone validation, ISO alpha-2 country code normalization, coordinate-pair range validation, floor count bounds, and positive decimal area string normalization in `server/src/common/validation/location-validation.spec.ts`
- [X] T008 [P] Write unit tests for tenant-safe base64url cursor encoding/decoding, sort/direction mismatch rejection, and deterministic keyset `WHERE` builder in `server/src/common/pagination/location-cursor.spec.ts`
- [X] T009 Implement shared runtime validation and normalization utilities in `server/src/common/validation/location-validation.ts` enforcing canonical field rules in `data-model.md` for `Site.code`, `Site.name`, `Site.description`, `Site.addressLine1`, `Site.addressLine2`, `Site.city`, `Site.region`, `Site.postalCode`, `Site.countryCode`, `Site.latitude`, `Site.longitude`, `Site.timeZone`, `Building.code`, `Building.name`, `Building.description`, `Building.floorCount`, and `Building.grossAreaSqM` (depends on T007)
- [X] T010 Implement tenant-safe opaque cursor codec and deterministic keyset query builder in `server/src/common/pagination/location-cursor.ts` (depends on T008)

**Checkpoint**: Database schema migrated, Prisma Client generated, shared validators and cursor pagination verified with unit tests. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Manage Organization Sites (Priority: P1) 🎯 MVP

**Goal**: Enable authorized organization members (`Owner`, `Facility Manager`) to create, list, search, filter, sort, paginate, inspect, and update organization-scoped Sites with normalized unique codes, validated location/time-zone metadata, safe non-archived building counts, and atomic audit logging, while read-only roles (`Engineer`, `Technician`, `Viewer`) can read without mutating.

**Independent Test**: Create multiple sites under an active organization, verify code normalization, duplicate-code conflict (`409 SITE_CODE_ALREADY_EXISTS`), pagination/search/filter/sort, detail retrieval with `buildingCount`, metadata updates rejecting immutable/unknown fields, atomic `SITE_CREATED`/`SITE_UPDATED` audit logs, and read-only enforcement for `Engineer`/`Technician`/`Viewer`.

### Tests for User Story 1

> **NOTE: Write these tests FIRST and confirm they FAIL before implementation**

- [X] T011 [P] [US1] Write unit tests for `SiteResourcePolicy` (same-tenant assertion, non-disclosing `SITE_NOT_FOUND`, archive-view `sites:archive` gate, mutable non-archived guard) in `server/src/sites/tests/site-resource.policy.spec.ts`
- [X] T012 [P] [US1] Write unit tests for `SitesService` (`list`, `create`, `findOne`, `update`, `P2002 -> SITE_CODE_ALREADY_EXISTS`, non-archived `buildingCount`, atomic `SITE_CREATED`/`SITE_UPDATED` audit writes) in `server/src/sites/tests/sites.service.spec.ts`

### Implementation for User Story 1

- [X] T013 [P] [US1] Create strict Zod 4 schemas (`CreateSiteSchema`, `UpdateSiteSchema`, `ListSitesQuerySchema`, `SiteDetailQuerySchema`) in `server/src/sites/dto/sites.schemas.ts` citing canonical field constraints in `data-model.md` for `Site.code`, `Site.name`, `Site.type`, `Site.description`, `Site.addressLine1`, `Site.addressLine2`, `Site.city`, `Site.region`, `Site.postalCode`, `Site.countryCode`, `Site.latitude`, `Site.longitude`, and `Site.timeZone`
- [X] T014 [P] [US1] Create Swagger DTO classes (`SiteResponseDto`, `CreateSiteSwaggerDto`, `UpdateSiteSwaggerDto`, `ListSitesQuerySwaggerDto`) in `server/src/sites/dto/sites-swagger.dto.ts`
- [X] T015 [P] [US1] Create explicit `SiteMapper` (`toSiteDto`) in `server/src/sites/mappers/site.mapper.ts` mapping canonical fields from `data-model.md` (`Site.id`, `Site.organizationId`, `Site.code`, `Site.name`, `Site.type`, `Site.description`, `Site.addressLine1`, `Site.addressLine2`, `Site.city`, `Site.region`, `Site.postalCode`, `Site.countryCode`, `Site.latitude`, `Site.longitude`, `Site.timeZone`, `Site.status`, `Site.archivedAt`, `Site.createdAt`, `Site.updatedAt`) and non-archived `buildingCount`
- [X] T016 [P] [US1] Implement `SiteResourcePolicy` in `server/src/sites/policies/site-resource.policy.ts`
- [X] T017 [US1] Implement tenant-scoped `SitesRepository` (explicit `organizationId` signatures, `_count` filtered to `archivedAt: null`, tenant-validated cursor lookup, keyset pagination, and `lockSiteForUpdate`) in `server/src/sites/sites.repository.ts`
- [X] T018 [US1] Implement `SitesService` CRUD workflows (`list`, `create`, `findOne`, `update`) with transactional `SITE_CREATED`/`SITE_UPDATED` audit logging, `P2002` conflict mapping, structured logging, and metrics in `server/src/sites/sites.service.ts` (depends on T013, T015, T016, T017)
- [X] T019 [US1] Implement `SitesController` CRUD endpoints (`GET /`, `POST /`, `GET /:siteId`, `PATCH /:siteId`) with `@OrgProtected()`, `@RequirePermissions('sites:*')`, `ZodValidationPipe`, and Swagger decorators in `server/src/sites/sites.controller.ts`, assemble `SitesModule` in `server/src/sites/sites.module.ts`, and register `SitesModule` + `ObservabilityModule` in `server/src/app.module.ts` (depends on T014, T018)

**Checkpoint**: User Story 1 (Sites CRUD, search/filter/pagination, validation, auditability) is complete and passes unit tests.

---

## Phase 4: User Story 2 - Manage Buildings Within Sites (Priority: P1)

**Goal**: Enable authorized organization members (`Owner`, `Facility Manager`) to create, list, search, filter, sort, paginate, inspect, and update Buildings strictly nested under an active, non-archived parent Site within their active organization, enforcing composite tenant-safe parent integrity, site-unique normalized codes, fixed-decimal string `grossAreaSqM`, and atomic audit logging.

**Independent Test**: Create buildings under an active site, confirm parent site `buildingCount` updates, verify site-scoped code uniqueness vs reuse across different sites, verify `grossAreaSqM` string serialization and `floorCount` bounds, verify cross-site building lookup returns concealed `404 BUILDING_NOT_FOUND`, and verify creation fails under archived (`409 SITE_ARCHIVED`) or inactive (`409 SITE_INACTIVE`) parent sites.

### Tests for User Story 2

> **NOTE: Write these tests FIRST and confirm they FAIL before implementation**

- [X] T020 [P] [US2] Write unit tests for `BuildingResourcePolicy` (parent-site `ACTIVE` & non-archived precondition per FR-010, tenant+site scoping, archive-view `buildings:archive` gate, mutable non-archived guard) in `server/src/buildings/tests/building-resource.policy.spec.ts`
- [X] T021 [P] [US2] Write unit tests for `BuildingsService` (`list`, `create`, `findOne`, `update`, `Decimal` -> fixed 2-decimal string mapping, `SITE_NOT_FOUND`/`SITE_ARCHIVED`/`SITE_INACTIVE` rejections, `P2002 -> BUILDING_CODE_ALREADY_EXISTS`, atomic `BUILDING_CREATED`/`BUILDING_UPDATED` audit writes) in `server/src/buildings/tests/buildings.service.spec.ts`

### Implementation for User Story 2

- [X] T022 [P] [US2] Create strict Zod 4 schemas (`CreateBuildingSchema`, `UpdateBuildingSchema`, `ListBuildingsQuerySchema`, `BuildingDetailQuerySchema`) in `server/src/buildings/dto/buildings.schemas.ts` citing canonical field constraints in `data-model.md` for `Building.code`, `Building.name`, `Building.type`, `Building.description`, `Building.floorCount`, and `Building.grossAreaSqM`
- [X] T023 [P] [US2] Create Swagger DTO classes (`BuildingResponseDto`, `CreateBuildingSwaggerDto`, `UpdateBuildingSwaggerDto`, `ListBuildingsQuerySwaggerDto`) in `server/src/buildings/dto/buildings-swagger.dto.ts`
- [X] T024 [P] [US2] Create explicit `BuildingMapper` (`toBuildingDto`) in `server/src/buildings/mappers/building.mapper.ts` mapping canonical fields from `data-model.md` (`Building.id`, `Building.organizationId`, `Building.siteId`, `Building.code`, `Building.name`, `Building.type`, `Building.description`, `Building.floorCount`, `Building.grossAreaSqM`, `Building.status`, `Building.archivedAt`, `Building.createdAt`, `Building.updatedAt`) with fixed 2-decimal string serialization for `Building.grossAreaSqM`
- [X] T025 [P] [US2] Implement `BuildingResourcePolicy` in `server/src/buildings/policies/building-resource.policy.ts`
- [X] T026 [US2] Implement tenant-and-site-scoped `BuildingsRepository` (explicit `organizationId` and `siteId` signatures, composite-FK persistence, tenant+site-validated cursor lookup, keyset pagination, non-archived count helper) in `server/src/buildings/buildings.repository.ts`
- [X] T027 [US2] Implement `BuildingsService` CRUD workflows (`list`, `create`, `findOne`, `update`) acquiring parent-site `FOR UPDATE` row lock on creation, enforcing `ACTIVE` non-archived parent site, mapping `P2002 -> BUILDING_CODE_ALREADY_EXISTS`, and writing transactional `BUILDING_CREATED`/`BUILDING_UPDATED` audit logs and metrics in `server/src/buildings/buildings.service.ts` (depends on T022, T024, T025, T026)
- [X] T028 [US2] Implement `BuildingsController` CRUD endpoints (`GET /`, `POST /`, `GET /:buildingId`, `PATCH /:buildingId`) nested under `organizations/:organizationId/sites/:siteId/buildings` with `@OrgProtected()`, `@RequirePermissions('buildings:*')`, `ZodValidationPipe`, and Swagger docs in `server/src/buildings/buildings.controller.ts`, assemble `BuildingsModule` in `server/src/buildings/buildings.module.ts`, and register `BuildingsModule` in `server/src/app.module.ts` (depends on T023, T027)

**Checkpoint**: User Stories 1 and 2 (full Site & Building hierarchy CRUD) are complete and pass unit tests.

---

## Phase 5: User Story 3 - Control Operational Status and Non-Destructive Archival Lifecycle (Priority: P1)

**Goal**: Implement non-destructive lifecycle commands (`activate`, `deactivate`, `archive`, `restore`) for both Sites and Buildings with transactional parent-child dependency protection (`SITE_HAS_ACTIVE_BUILDINGS`, `SITE_ARCHIVED`, `SITE_INACTIVE`), invalid-state conflict protection (`INVALID_LOCATION_STATE`), and strict archive-permission gating on `includeArchived` views (`FR-015`).

**Independent Test**: Deactivate and reactivate sites and buildings (verifying site deactivation leaves child buildings unchanged), verify site archival is rejected with `409 SITE_HAS_ACTIVE_BUILDINGS` while non-archived buildings exist, archive child buildings and then archive the site, verify `includeArchived=true` succeeds for `Owner`/`Facility Manager` and fails with `403 FORBIDDEN` for `Engineer`/`Technician`/`Viewer`, verify building restore fails while parent site is archived or `INACTIVE`, and restore site then building cleanly.

### Tests for User Story 3

> **NOTE: Write these tests FIRST and confirm they FAIL before implementation**

- [X] T029 [P] [US3] Expand `server/src/sites/tests/sites.service.spec.ts` with unit tests for `activate`, `deactivate` (non-cascading), `archive` (`SITE_HAS_ACTIVE_BUILDINGS`, already archived `INVALID_LOCATION_STATE`), `restore`, redundant status transitions (`INVALID_LOCATION_STATE`), and unauthorized `includeArchived=true` (`403 FORBIDDEN` + `AUTHZ_DENIED`)
- [X] T030 [P] [US3] Expand `server/src/buildings/tests/buildings.service.spec.ts` with unit tests for `activate`, `deactivate`, `archive`, `restore` (`SITE_ARCHIVED`, `SITE_INACTIVE`, not archived `INVALID_LOCATION_STATE`), redundant status transitions, and unauthorized `includeArchived=true` (`403 FORBIDDEN` + `AUTHZ_DENIED`)

### Implementation for User Story 3

- [X] T031 [US3] Implement Site lifecycle commands (`activate`, `deactivate`, `archive` under parent-site `FOR UPDATE` lock checking non-archived buildings count, `restore`, and `includeArchived` `sites:archive` enforcement) updating `Site.status` and `Site.archivedAt` per `data-model.md` with atomic `SITE_ACTIVATED`/`SITE_DEACTIVATED`/`SITE_ARCHIVED`/`SITE_RESTORED` audit logging in `server/src/sites/sites.service.ts` and wire `POST /:siteId/activate`, `POST /:siteId/deactivate`, `POST /:siteId/archive`, and `POST /:siteId/restore` in `server/src/sites/sites.controller.ts` (depends on T029)
- [X] T032 [US3] Implement Building lifecycle commands (`activate`, `deactivate`, `archive`, `restore` under parent-site `FOR UPDATE` lock enforcing `ACTIVE` non-archived parent site, and `includeArchived` `buildings:archive` enforcement) updating `Building.status` and `Building.archivedAt` per `data-model.md` with atomic `BUILDING_ACTIVATED`/`BUILDING_DEACTIVATED`/`BUILDING_ARCHIVED`/`BUILDING_RESTORED` audit logging in `server/src/buildings/buildings.service.ts` and wire `POST /:buildingId/activate`, `POST /:buildingId/deactivate`, `POST /:buildingId/archive`, and `POST /:buildingId/restore` in `server/src/buildings/buildings.controller.ts` (depends on T030)

**Checkpoint**: All 16 Site & Building REST endpoints and lifecycle state machines are complete and pass unit tests.

---

## Phase 6: User Story 4 - Enforce Multi-Tenant Isolation, Role Permissions, and Mutation Auditability (Priority: P1)

**Goal**: Prove end-to-end across HTTP/Supertest and persistence boundaries that all 5 roles, non-members, suspended memberships, inactive organizations, cross-tenant ID/cursor probes, wrong-site building lookups, concurrent races, and transactional audit logs behave with 100% security fidelity.

**Independent Test**: Execute the full two-organization, five-role E2E test suite verifying all 12 tenant-isolation security checks from Phase 5.4 §18.3, Factory & Commercial Property workflows, concurrent duplicate-code and archive-vs-create race safety, and atomic secret-free audit trails across all 12 event types.

### Tests & Verification for User Story 4

- [X] T033 [US4] Implement comprehensive HTTP/Supertest E2E and concurrency test suite in `server/test/sites-buildings.e2e-spec.ts` covering: 2-organization cross-tenant isolation matrix (12 security checks), all 5 roles (`OWNER`, `FACILITY_MANAGER`, `ENGINEER`, `TECHNICIAN`, `VIEWER`) + non-member + suspended membership + suspended/archived organization, wrong-site building non-disclosure (`404 BUILDING_NOT_FOUND`), cross-tenant pagination cursor rejection (`400 VALIDATION_ERROR`), unauthorized `includeArchived=true` (`403 FORBIDDEN` + `AUTHZ_DENIED`), concurrent duplicate-code creation, concurrent `archiveSite` vs `createBuilding` race serialization, atomic audit-log verification across all 12 `SITE_*`/`BUILDING_*` actions (and zero logs on rejected requests), and Factory / Commercial Property / Permission Denial E2E workflows
- [X] T034 [US4] Audit `server/src/sites/` and `server/src/buildings/` to verify zero unscoped `findUnique({ where: { id } })` queries, zero hard-delete endpoints, zero client-trusted ownership fields, and complete Swagger/OpenAPI conformance via `pnpm --filter server test:e2e` and `pnpm contracts:validate` (depends on T033)

**Checkpoint**: Backend domain, security isolation, RBAC, concurrency, and auditability are completely verified end-to-end.

---

## Phase 7: User Story 5 - Deliver Role-Aware, Accessible Sites & Buildings Management Screens (Priority: P2)

**Goal**: Deliver dark-first EVARAX-styled, WCAG 2.2 AA Sites & Buildings management screens under `OrganizationShell` (`Sites Directory`, `Site Overview & Buildings`, `Building Overview`) with capability-gated controls, site IANA time-zone display, monospace technical identifiers, archive-blocked building-dependency guidance with direct navigation, and instant tenant-state clearing on organization switch.

**Independent Test**: Run `client` unit tests for pure location validation/formatting and nav permissions, verify production `next build` and `typecheck`/`lint`, and exercise all 3 routes across `Owner`, `Facility Manager`, and `Viewer` roles (including create/edit/status/archive-blocked/archive/restore dialogs, keyboard navigation, and org switching).

### Tests for User Story 5

> **NOTE: Write these tests FIRST and confirm they FAIL before implementation**

- [X] T035 [P] [US5] Write unit tests for pure client location helpers (code normalization preview, coordinate-pair validation, `grossAreaSqM` formatting with `m²`, IANA site local time formatting, and `SITE_HAS_ACTIVE_BUILDINGS` guidance parsing) in `client/lib/locations/validation.test.mjs` and add it to the `test` script in `client/package.json`
- [X] T036 [P] [US5] Update `client/lib/authorization/permissions.test.mjs` to assert `"Sites & Buildings"` navigation item visibility (`sites:read`) for all 5 roles

### Implementation for User Story 5

- [X] T037 [P] [US5] Create client location TypeScript DTO contracts in `client/lib/locations/types.ts`, pure validation/formatting helpers in `client/lib/locations/validation.mjs` and `client/lib/locations/validation.d.ts`, and all 16 Site & Building API wrappers over `apiRequest()` in `client/lib/locations/api.ts` (depends on T035)
- [X] T038 [P] [US5] Add `"Sites & Buildings"` nav entry gated by `sites:read` in `client/lib/authorization/permissions.mjs` and update `client/components/authorization/organization-shell.tsx` to render its icon and highlight nested `/sites/*` routes (depends on T036)
- [X] T039 [P] [US5] Implement EVARAX-compliant, WCAG 2.2 AA location UI primitives in `client/components/locations/location-status-badge.tsx`, `client/components/locations/site-form-dialog.tsx`, `client/components/locations/building-form-dialog.tsx`, and `client/components/locations/location-lifecycle-dialog.tsx` (following `/impeccable` `craft-floor.md`, non-color-only badges distinguishing operational status from equipment health, inline accessible field errors, and `SITE_HAS_ACTIVE_BUILDINGS` dependency alert with direct jump link to buildings)
- [X] T040 [US5] Implement `SitesDirectoryPanel` in `client/components/locations/sites-directory-panel.tsx` and Sites page in `client/app/(protected)/app/organizations/[organizationId]/sites/page.tsx` with search, status filter, sort, `sites:archive`-gated archived toggle, cursor "Load more", capability-gated create site flow, explicit loading/empty/error/permission-denied states, and immediate tenant-state clearing on `organizationId` change (depends on T037, T038, T039)
- [X] T041 [US5] Implement `SiteDetailPanel` in `client/components/locations/site-detail-panel.tsx` and Site Overview page in `client/app/(protected)/app/organizations/[organizationId]/sites/[siteId]/page.tsx` showing site metadata, local time in configured IANA `timeZone`, edit/status/archive/restore controls, and embedded Buildings directory (search, status filter, sort, `buildings:archive`-gated archived toggle, cursor pagination, and `buildings:create`-gated Add Building flow disabled with clear guidance when parent site is `INACTIVE` or archived) (depends on T037, T039, T040)
- [X] T042 [US5] Implement `BuildingDetailPanel` in `client/components/locations/building-detail-panel.tsx` and Building Overview page in `client/app/(protected)/app/organizations/[organizationId]/sites/[siteId]/buildings/[buildingId]/page.tsx` with breadcrumb navigation, physical metadata (`floorCount`, `grossAreaSqM` in `m²`), and capability-gated edit/status/archive/restore dialogs (depends on T037, T039, T041)

**Checkpoint**: Full vertical slice including EVARAX, WCAG 2.2 AA frontend management screens is complete and verified.

---

## Phase 8: Polish, ADRs, Demo Seed & Cross-Cutting Verification

**Purpose**: Finalize architectural documentation, non-production demo seed fixtures, project status docs, and full monorepo CI verification gates.

- [X] T043 [P] Author Phase 5.4 Architecture Decision Records in `docs/architecture/architecture-decision-records/ADR-0010-location-hierarchy.md`, `docs/architecture/architecture-decision-records/ADR-0011-location-archive-policy.md`, and `docs/architecture/architecture-decision-records/ADR-0012-location-tenant-integrity.md`
- [X] T044 [P] Create development-only demo seed script (explicitly guarded against `NODE_ENV === 'production'` and labeled as fictitious demo fixtures per Phase 5.4 §20) in `server/prisma/seed-demo-locations.ts` and register `seed:demo-locations` in `server/package.json`
- [X] T045 Update implementation status in `README.md` and `server/README.md`, then run all monorepo verification gates (`pnpm contracts:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`) and validate against `specs/004-sites-buildings-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1: T001–T004)**: No dependencies — can start immediately; `T002`, `T003`, `T004` run in parallel with `T001`.
- **Foundational (Phase 2: T005–T010)**: Depends on Phase 1 completion — **BLOCKS** all User Stories (`US1`–`US5`).
  - `T005` -> `T006` (schema before migration & client generation).
  - `T007` & `T008` run in parallel; `T009` depends on `T007`; `T010` depends on `T008`.
- **User Story 1 (Phase 3: T011–T019 — P1 MVP)**: Depends on Phase 2 completion.
- **User Story 2 (Phase 4: T020–T028 — P1)**: Depends on Phase 2 + `SitesRepository.lockSiteForUpdate` / `SitesModule` from `US1` (`T017`, `T019`).
- **User Story 3 (Phase 5: T029–T032 — P1)**: Depends on `US1` (`T019`) and `US2` (`T028`).
- **User Story 4 (Phase 6: T033–T034 — P1)**: Depends on `US1`, `US2`, and `US3` (`T031`, `T032`).
- **User Story 5 (Phase 7: T035–T042 — P2)**: Pure helpers, nav updates, and reusable UI components (`T035`–`T039`) can begin as soon as contracts (`Phase 1`) are locked; end-to-end UI verification depends on backend `US1`–`US3` (`T031`–`T032`).
- **Polish (Phase 8: T043–T045)**: `T043` and `T044` can run in parallel after Phase 2/6; `T045` runs last after all implementation tasks complete.

### Parallel Execution Examples

#### Parallel Batch — Phase 3 (`US1`)

```text
Batch A (Tests first): T011 (site-resource.policy.spec.ts) + T012 (sites.service.spec.ts)
Batch B (Leaf artifacts): T013 (sites.schemas.ts) + T014 (sites-swagger.dto.ts) + T015 (site.mapper.ts) + T016 (site-resource.policy.ts)
Sequential completion: T017 (sites.repository.ts) -> T018 (sites.service.ts) -> T019 (sites.controller.ts + sites.module.ts + app.module.ts)
```

#### Parallel Batch — Phase 4 (`US2`)

```text
Batch A (Tests first): T020 (building-resource.policy.spec.ts) + T021 (buildings.service.spec.ts)
Batch B (Leaf artifacts): T022 (buildings.schemas.ts) + T023 (buildings-swagger.dto.ts) + T024 (building.mapper.ts) + T025 (building-resource.policy.ts)
Sequential completion: T026 (buildings.repository.ts) -> T027 (buildings.service.ts) -> T028 (buildings.controller.ts + buildings.module.ts + app.module.ts)
```

#### Parallel Batch — Phase 7 (`US5`)

```text
Batch A (Tests first): T035 (client/lib/locations/validation.test.mjs) + T036 (client/lib/authorization/permissions.test.mjs)
Batch B (Client data & primitives): T037 (types/validation/api) + T038 (permissions + org shell nav) + T039 (4 shared location UI components)
Sequential pages: T040 (Sites directory) -> T041 (Site detail + Buildings directory) -> T042 (Building detail)
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 + User Story 3 + User Story 4)

1. Complete **Phase 1** (Setup) and **Phase 2** (Schema, migration, shared validation & cursor pagination).
2. Deliver **Phase 3 (US1)** — complete Sites API (`MVP` checkpoint).
3. Deliver **Phase 4 (US2)** — complete Buildings API under Sites with composite tenant-safe FK.
4. Deliver **Phase 5 (US3)** — full operational status & non-destructive archive/restore lifecycle.
5. Deliver **Phase 6 (US4)** — prove cross-tenant isolation, 5-role RBAC, concurrency safety, and atomic audit logs via Supertest E2E suite.

### Full Vertical Slice Completion (User Story 5 + Polish)

6. Deliver **Phase 7 (US5)** — EVARAX-styled, WCAG 2.2 AA frontend management screens in `client/` guided by `/impeccable`.
7. Complete **Phase 8** — ADRs `ADR-0010`..`ADR-0012`, dev-only demo seed script, README updates, and all root CI gates (`pnpm contracts:validate`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`).

---

## Notes

- All 32 constrained fields in `data-model.md` (`Site.*` and `Building.*`) are explicitly cited in their implementing schema, validation, mapper, and lifecycle tasks (`T005`, `T006`, `T009`, `T013`, `T015`, `T022`, `T024`, `T031`, `T032`).
- Mark each completed task `[X]` in this file during `/speckit-implement`.
- Never execute `prisma db push` or `prisma migrate reset` against shared/production databases; apply migrations strictly to an isolated non-production branch.
