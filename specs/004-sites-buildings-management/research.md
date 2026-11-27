# Phase 0 Research & Architecture Decisions: Sites & Buildings Management

**Feature**: `004-sites-buildings-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

This document resolves all technical unknowns discovered during repository inspection and documents the engineering decisions anchoring Phase 5.4 in the actual GridAware codebase.

---

## R-01 — Reconciling Reference Specification with Actual Repository Stack

- **Decision**: Implement Phase 5.4 directly against the verified repository stack rather than the generic template stack in the Phase 5.4 narrative brief:
  - Backend directory: `server/` (not `apps/api/`)
  - Backend runtime: **NestJS 12** (`@nestjs/common@^12.0.1`), **TypeScript 6**, ESM (`"type": "module"` with `.js` relative import specifiers)
  - Validation stack: **Zod 4** (`zod@4.6.7`) + existing `ZodValidationPipe` (`server/src/auth/dto/zod-validation.pipe.ts`) with `.strict()` object schemas (not `class-validator` / `class-transformer`)
  - ORM & Database: **Prisma ORM 7.10.1** (`provider = "prisma-client"`, output `../src/generated/prisma`, `prisma7.config.ts`) + `@prisma/adapter-neon` on **Neon PostgreSQL**
  - Test stack: **Vitest 4** (`vitest@^4.1.2`) + **Supertest** (`server/vitest.config.ts` & `vitest.config.e2e.ts`) and **Node test runner** (`node --test`) for pure frontend helpers in `client/lib/`
  - Linter: **Oxlint** (`oxlint --type-aware`) on `server/` and **ESLint 9** (`eslint-config-next`) on `client/`
  - Frontend directory & stack: `client/` (**Next.js 16.4.6** App Router, **React 19.3**, **Tailwind CSS 4.3**, Radix UI primitives, `lucide-react`, `sonner`)
- **Rationale**: Phase 5.4 §2.2 explicitly mandates inspecting and reconciling against the actual repository rather than blindly copying reference fragments. Aligning with Zod 4, NestJS 12, Prisma 7, Vitest, and `server/` + `client/` eliminates dual validation stacks, avoids broken imports, and keeps `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm contracts:validate`, and `pnpm build` green.
- **Alternatives considered**: Introducing `class-validator` DTOs alongside Zod 4 (rejected — violates DRY/consistency and adds an unapproved runtime dependency).

---

## R-02 — Primary Key & Column Conventions (`UUID` vs `CUID`)

- **Decision**: Use `@id @default(uuid()) @db.Uuid` for `Site.id` and `Building.id`, `@db.Uuid` for `organizationId` and `siteId`, `@db.Timestamptz(6)` for all timestamps (`archivedAt`, `createdAt`, `updatedAt`), bounded `VarChar` lengths matching `spec.md` assumptions, and `@@map("sites")` / `@@map("buildings")`.
- **Rationale**: Every existing table in `server/prisma/schema.prisma` (`users`, `organizations`, `memberships`, `organization_invitations`, `auth_sessions`, `audit_logs`) and GridAware Constitution (`Architecture, Security & Platform Constraints`) mandates UUID identifiers and `TIMESTAMPTZ(6)` UTC timestamps. Route path parameters (`:organizationId`, `:siteId`, `:buildingId`) validate cleanly against the shared `UUID_PATTERN` (`server/src/authorization/authorization.constants.ts`), returning concealed `404` (`SITE_NOT_FOUND` / `BUILDING_NOT_FOUND`) for syntactically invalid or foreign IDs.
- **Alternatives considered**: Using `cuid()` from the Phase 5.4 narrative snippet (rejected — incompatible with existing `Organization.id` `@db.Uuid` foreign keys and violates Constitution UUID convention).

---

## R-03 — Composite Tenant-Safe Foreign Key & PostgreSQL `CHECK` Constraints

- **Decision**:
  1. Add `@@unique([id, organizationId])` on `Site` so `Building` declares a composite tenant-safe foreign key:
     `site Site @relation(fields: [siteId, organizationId], references: [id, organizationId], onDelete: Restrict)`
     alongside `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)`.
  2. Pre-provision `@@unique([id, organizationId])` and `@@unique([id, siteId, organizationId])` on `Building` so Phase 5.5 (`Asset`) can declare composite tenant-safe relations to `Building` without altering `Building` unique indexes later.
  3. Add reviewed PostgreSQL `CHECK` constraints in the versioned SQL migration (using Prisma's double-quoted camelCase column names verified from `server/prisma/migrations/20261127120000_init_organizations_rbac/migration.sql`):
     - `sites_latitude_range_chk`: `"latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)`
     - `sites_longitude_range_chk`: `"longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)`
     - `sites_coordinates_pair_chk`: `("latitude" IS NULL) = ("longitude" IS NULL)`
     - `sites_country_code_format_chk`: `"countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$'`
     - `buildings_floor_count_range_chk`: `"floorCount" IS NULL OR ("floorCount" >= 1 AND "floorCount" <= 200)`
     - `buildings_gross_area_positive_chk`: `"grossAreaSqM" IS NULL OR "grossAreaSqM" > 0`
  4. Map Prisma unique-constraint violations (`P2002`) inside service error handlers to `409 SITE_CODE_ALREADY_EXISTS` / `409 BUILDING_CODE_ALREADY_EXISTS` rather than relying solely on pre-insert lookups.
- **Rationale**: Database-level composite FKs and `CHECK` constraints enforce multi-tenant referential integrity and domain bounds even under concurrent writes or future service changes (Constitution Principle I, Phase 5.4 §8.4–§8.6).
- **Alternatives considered**: Single-column `siteId` FK without `organizationId` (rejected — allows cross-tenant site attachment if application code ever has a bug).

---

## R-04 — Decimal Precision & JSON Serialization for `Building.grossAreaSqM`

- **Decision**: Persist `Building.grossAreaSqM` as `Decimal? @db.Decimal(12, 2)`. Accept and return `grossAreaSqM` strictly as a decimal string in JSON (e.g., `"4200.00"`), rejecting JSON numbers, negative/zero values, > 2 fractional digits, and overflow (> `9999999999.99`). Normalize valid inputs to 2 fixed decimal places (`toFixed(2)` / exact string normalization) in the mapper.
- **Rationale**: Verified via Context7 Prisma ORM decimal documentation and Phase 5.4 §10.5: passing decimals as strings end-to-end prevents IEEE-754 floating-point precision drift and avoids PostgreSQL `22003` numeric field overflow.
- **Alternatives considered**: Accepting JSON `number` (rejected — risks binary float rounding like `4200.100000000001` and contradicts Phase 5.4 §10.5).

---

## R-05 — Authorization Pipeline, Archive Visibility, and Parent-Site Concurrency

- **Decision**:
  1. Reuse Phase 5.3's `@OrgProtected()` decorator (`AccessTokenGuard -> CsrfGuard -> OrganizationContextGuard -> PermissionsGuard`) and existing Phase 5.3 permissions (`sites:read`, `sites:create`, `sites:update`, `sites:archive`, `buildings:read`, `buildings:create`, `buildings:update`, `buildings:archive`) from `server/src/authorization/authorization.types.ts` and `permission-map.ts` with zero duplication.
  2. **Archived visibility policy (`FR-015` — Option A)**: On `GET` list (`?includeArchived=true`) and `GET` detail (`?includeArchived=true`), check `authorizationService.hasPermission(context.role, 'sites:archive')` (or `'buildings:archive'`) in the service/policy; if the caller requests `includeArchived=true` without the archive permission, throw `403 FORBIDDEN` (`AppException.forbidden(...)`) and emit an `AUTHZ_DENIED` audit log entry.
  3. **Parent site lifecycle policy (`FR-010` — Option A) & Concurrency Lock**: Inside `prisma.$transaction`, `createBuilding`, `restoreBuilding`, and `archiveSite` acquire a per-site row lock (`SELECT id FROM sites WHERE id = ${siteId}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`), matching the proven row-lock pattern in `MembershipsRepository.lockOrganizationForUpdate`.
     - `createBuilding` & `restoreBuilding`: verify parent site exists in `organizationId` (else `404 SITE_NOT_FOUND`), `archivedAt === null` (else `409 SITE_ARCHIVED`), and `status === ACTIVE` (else `409 SITE_INACTIVE`).
     - `archiveSite`: verify site exists in `organizationId` (else `404 SITE_NOT_FOUND`), `archivedAt === null` (else `409 INVALID_LOCATION_STATE`), and count non-archived buildings (`archivedAt: null`) under `(organizationId, siteId)` — if `> 0`, throw `409 SITE_HAS_ACTIVE_BUILDINGS` with the safe count in detail/metadata.
- **Rationale**: Row-level locking on the parent `Site` eliminates time-of-check/time-of-use races between concurrent `POST .../archive` and `POST .../buildings` requests without locking other sites or other tenants.
- **Alternatives considered**: Serializable isolation level across the whole database (rejected — unnecessary retry overhead compared to targeted single-row `FOR UPDATE`).

---

## R-06 — Tenant-Safe Keyset Cursor Pagination with Dynamic Sorting

- **Decision**: Implement a shared, tenant-safe cursor pagination helper (`server/src/common/pagination/location-cursor.ts`) supporting `limit` (default `20`, max `100`), `sort` (`createdAt` | `name` | `code`, default `createdAt`), and `direction` (`asc` | `desc`, default `desc`), always breaking ties deterministically by `id` in the same direction.
  - Encode `nextCursor` as an opaque base64url JSON token `{ v: 1, id, sort, direction }`.
  - When a `cursor` query parameter is supplied:
    1. Decode and validate structure, UUID format of `id`, and exact match with requested `sort` and `direction`.
    2. Look up the cursor row strictly within the active `(organizationId[, siteId])` and archive visibility scope (`archivedAt: null` unless `includeArchived=true`).
    3. If the cursor is malformed, mismatched, or not found in the caller's authorized scope, throw `400 VALIDATION_ERROR` (`"Invalid pagination cursor"`) — guaranteeing a foreign tenant's cursor never discloses existence or returns foreign rows.
    4. Use the verified cursor record's authoritative `(sortColumn, id)` tuple in a strict keyset `WHERE` clause (`(col > val) OR (col = val AND id > cursorId)` for `asc`; `<` for `desc`).
- **Rationale**: Satisfies `FR-002`, `FR-008`, `FR-017`, and `SC-002` with stable ordering across inserts/updates and zero cross-tenant cursor oracle leakage.
- **Alternatives considered**: Passing raw Prisma `cursor: { id }` directly (rejected — if an ID from another tenant is supplied or if `sort` changes between pages, raw `cursor: { id }` can leak existence or produce unstable offsets).

---

## R-07 — Response Envelope, Error Code Catalog & Audit Actions

- **Decision**:
  1. Follow the repository's established Phase 3.3 response envelope (`buildApiResponse` / `buildPaginatedApiResponse` from `server/src/common/envelopes/api-response.ts`: `{ data, meta: { requestId, servedAt, pagination? } }`) and RFC 9457 `ProblemDetails` error format (`AllExceptionsFilter` + `AppException`).
  2. Extend `ErrorCode` and `ERROR_CATALOG` (`server/src/common/exceptions/error-codes.ts`) with Phase 5.4's stable domain codes: `SITE_NOT_FOUND` (404), `BUILDING_NOT_FOUND` (404), `SITE_CODE_ALREADY_EXISTS` (409), `BUILDING_CODE_ALREADY_EXISTS` (409), `SITE_ARCHIVED` (409), `SITE_INACTIVE` (409), `SITE_HAS_ACTIVE_BUILDINGS` (409), `INVALID_LOCATION_STATE` (409). Keep existing `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), and `RESOURCE_NOT_FOUND` (404) intact.
  3. Extend `AuditAction` in `server/src/audit-logs/audit-logs.service.ts` with the 12 Phase 5.4 actions (`SITE_CREATED`, `SITE_UPDATED`, `SITE_ACTIVATED`, `SITE_DEACTIVATED`, `SITE_ARCHIVED`, `SITE_RESTORED`, `BUILDING_CREATED`, `BUILDING_UPDATED`, `BUILDING_ACTIVATED`, `BUILDING_DEACTIVATED`, `BUILDING_ARCHIVED`, `BUILDING_RESTORED`) and write every event inside the same Prisma transaction (`tx`) using `entityType: 'SITE' | 'BUILDING'` and safe before/after diffs.
  4. Add `LocationMetricsService` (`server/src/common/observability/location-metrics.service.ts`) recording structured low-cardinality metrics (`gridaware_sites_created_total`, `gridaware_buildings_created_total`, `gridaware_location_mutations_total`, `gridaware_location_api_requests_total`, `gridaware_location_api_duration_seconds`, `gridaware_location_conflicts_total`) with strictly bounded label sets (`resource`, `action`, `result`, `operation`, `status`, `reason` — zero IDs) and structured `AppLogger` entries carrying correlation/tenant IDs without secrets.
- **Rationale**: Preserves 100% backward compatibility with Phases 5.1–5.3 while delivering every stable error code, audit event, and observability signal specified in Phase 5.4.
- **Alternatives considered**: Introducing a parallel `{ success: true, data, meta }` envelope (rejected — breaks the repository's established `ApiResponseEnvelope<T>` contract and `client/lib/auth/client.ts` parser).

---

## R-08 — Frontend Information Architecture, EVARAX Craft & Tenant State Safety

- **Decision**:
  1. Add a **Sites & Buildings** navigation item (`id: "sites"`, required permission `sites:read`, route `/app/organizations/[organizationId]/sites`) to `getVisibleOrgNavItems` (`client/lib/authorization/permissions.mjs`) and `OrganizationShell`.
  2. Deliver three App Router routes under `client/app/(protected)/app/organizations/[organizationId]/`:
     - `sites/page.tsx` (Sites Directory: search, status filter, sort, archive-view toggle gated by `sites:archive`, cursor "Load more", create site modal gated by `sites:create`)
     - `sites/[siteId]/page.tsx` (Site Overview & Buildings Directory: site metadata, local time in site's IANA time zone, edit site dialog gated by `sites:update`, activate/deactivate & archive/restore dialogs gated by `sites:update`/`sites:archive` with explicit `SITE_HAS_ACTIVE_BUILDINGS` guidance + jump-to-buildings link, plus nested Buildings list/search/filter/create/lifecycle controls)
     - `sites/[siteId]/buildings/[buildingId]/page.tsx` (Building Overview: breadcrumb `Sites / Site Name / Building Name`, building specs with `m²` unit, edit building dialog gated by `buildings:update`, activate/deactivate & archive/restore dialogs gated by `buildings:update`/`buildings:archive`)
  3. Enforce EVARAX dark-first tokens (`DESIGN.md`, `client/app/globals.css`), Geist Sans for names/UI and Geist Mono for technical codes/coordinates/timestamps/measurements, non-color-only operational status badges (`Active`, `Inactive`, `Archived`) that never imply equipment health, WCAG 2.2 AA keyboard navigation and `AlertDialog` focus trapping, and immediate tenant-state reset on `organizationId` change.
  4. Apply the `/impeccable` skill (`reference/craft-floor.md` + Operate-mode restraint) during frontend implementation and verify live rendered states.
- **Rationale**: Matches Phases 5.1–5.3's existing `OrganizationShell` + `AccessContextProvider` architecture and satisfies `User Story 5`, `FR-019`, `SC-008`, and Constitution Principle VIII.
- **Alternatives considered**: Separate top-level `/app/sites` route outside `OrganizationShell` (rejected — breaks the existing `/app/organizations/[organizationId]/...` tenant-scoped URL hierarchy and capability provider).
