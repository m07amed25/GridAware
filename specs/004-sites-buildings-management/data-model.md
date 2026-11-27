# Data Model: Sites & Buildings Management (Phase 5.4)

**Feature**: `004-sites-buildings-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

This document is the canonical definition for all Phase 5.4 entities, enums, field constraints, relationships, database indexes, `CHECK` constraints, and lifecycle state machines.

---

## 1. Enums

### `SiteType`

Controlled facility classification enum (mapped to localized display labels in the frontend):

- `FACTORY`
- `INDUSTRIAL_FACILITY`
- `COMMERCIAL_COMPLEX`
- `COMMERCIAL_PROPERTY`
- `CAMPUS`
- `WAREHOUSE_CAMPUS`
- `OTHER`

### `BuildingType`

Controlled physical building classification enum:

- `PRODUCTION`
- `OFFICE`
- `WAREHOUSE`
- `UTILITY`
- `RETAIL`
- `PLANT_ROOM`
- `PARKING`
- `OTHER`

### `LocationStatus`

Operational enablement status (strictly independent of `archivedAt`; no `ARCHIVED` enum member):

- `ACTIVE` (default) — enabled for normal operational use
- `INACTIVE` — intentionally disabled while retained

---

## 2. Entities & Field Constraints

### 2.1 `Organization` *(existing — inverse relations added once)*

- Table: `organizations`
- Added inverse relations (only once; all existing Phase 5.2/5.3 columns and relations preserved):
  - `sites Site[]`
  - `buildings Building[]`

---

### 2.2 `Site`

- Table: `sites` (`@@map("sites")`)
- Description: Organization-owned logical facility, plant, campus, or commercial property providing shared geographic and time-zone context for its buildings.

| Field | Prisma Type / DB Type | Required | Mutability | Canonical Constraints |
|---|---|---:|---|---|
| `Site.id` | `String @id @default(uuid()) @db.Uuid` | Yes | Immutable | Server-generated UUID v4; never accepted from client |
| `Site.organizationId` | `String @db.Uuid` | Yes | Immutable | Derived strictly from verified `OrganizationAuthorizationContext`; FK to `organizations(id)` `ON DELETE RESTRICT` |
| `Site.code` | `String @db.VarChar(32)` | Yes | Immutable | Trim whitespace, uppercase ASCII; 2–32 chars; regex `/^[A-Z0-9](?:[A-Z0-9]|-(?=[A-Z0-9])){0,30}[A-Z0-9]$/` (no internal spaces, no leading/trailing/consecutive hyphens); unique per `organizationId`; never reused after archive |
| `Site.name` | `String @db.VarChar(120)` | Yes | Mutable | Trim whitespace, preserve Unicode capitalization; 2–120 chars; reject control characters (`/[\u0000-\u001F\u007F]/`) |
| `Site.type` | `SiteType` | Yes | Mutable | Must be a valid `SiteType` enum member |
| `Site.description` | `String? @db.VarChar(2000)` | No | Mutable | Optional trimmed plain text; max 2,000 chars; reject control chars (except `\n`, `\t`) |
| `Site.addressLine1` | `String? @db.VarChar(200)` | No | Mutable | Optional trimmed plain text; max 200 chars; no control chars |
| `Site.addressLine2` | `String? @db.VarChar(200)` | No | Mutable | Optional trimmed plain text; max 200 chars; no control chars |
| `Site.city` | `String? @db.VarChar(200)` | No | Mutable | Optional trimmed plain text; max 200 chars; no control chars |
| `Site.region` | `String? @db.VarChar(200)` | No | Mutable | Optional trimmed plain text; max 200 chars; no control chars |
| `Site.postalCode` | `String? @db.VarChar(32)` | No | Mutable | Optional trimmed text (varies by country); max 32 chars; no control chars |
| `Site.countryCode` | `String? @db.VarChar(2)` | No | Mutable | Optional; trimmed and uppercased ISO 3166-1 alpha-2 (`/^[A-Z]{2}$/`); DB `CHECK` enforced |
| `Site.latitude` | `Float?` | No | Mutable | Optional finite number in `[-90, 90]`; MUST be paired with `Site.longitude` (both provided or both null); DB `CHECK` enforced |
| `Site.longitude` | `Float?` | No | Mutable | Optional finite number in `[-180, 180]`; MUST be paired with `Site.latitude` (both provided or both null); DB `CHECK` enforced |
| `Site.timeZone` | `String @default("UTC") @db.VarChar(64)` | Yes | Mutable | Valid canonical IANA time-zone identifier (validated via `Intl.supportedValuesOf('timeZone')` + `'UTC'` and `Intl.DateTimeFormat`); fixed numeric offsets rejected; defaults to `"UTC"` |
| `Site.status` | `LocationStatus @default(ACTIVE)` | Yes | Lifecycle | Controlled exclusively via `/activate` and `/deactivate` commands (not generic `PATCH`); defaults to `ACTIVE` |
| `Site.archivedAt` | `DateTime? @db.Timestamptz(6)` | No | Lifecycle | `null` unless archived; controlled exclusively via `/archive` and `/restore` commands |
| `Site.createdAt` | `DateTime @default(now()) @db.Timestamptz(6)` | Yes | Immutable | UTC creation timestamp |
| `Site.updatedAt` | `DateTime @updatedAt @db.Timestamptz(6)` | Yes | System | UTC last-update timestamp |

#### `Site` Constraints & Indexes

- `@@unique([id, organizationId])` — target of `Building`'s tenant-safe composite foreign key
- `@@unique([organizationId, code])` — tenant-scoped site code uniqueness (includes archived rows so codes are never reused)
- `@@index([organizationId, status, archivedAt, createdAt])` — primary list/filter/sort index
- `@@index([organizationId, city])` — city lookup/grouping index
- Foreign key: `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)`
- PostgreSQL `CHECK` constraints:
  - `sites_latitude_range_chk`: `"latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)`
  - `sites_longitude_range_chk`: `"longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)`
  - `sites_coordinates_pair_chk`: `("latitude" IS NULL) = ("longitude" IS NULL)`
  - `sites_country_code_format_chk`: `"countryCode" IS NULL OR "countryCode" ~ '^[A-Z]{2}$'`

---

### 2.3 `Building`

- Table: `buildings` (`@@map("buildings")`)
- Description: Physical building belonging to exactly one `Site` and the same `Organization` as that `Site`.

| Field | Prisma Type / DB Type | Required | Mutability | Canonical Constraints |
|---|---|---:|---|---|
| `Building.id` | `String @id @default(uuid()) @db.Uuid` | Yes | Immutable | Server-generated UUID v4; never accepted from client |
| `Building.organizationId` | `String @db.Uuid` | Yes | Immutable | Derived strictly from verified `OrganizationAuthorizationContext`; must match parent `Site.organizationId`; FK to `organizations(id)` `ON DELETE RESTRICT` |
| `Building.siteId` | `String @db.Uuid` | Yes | Immutable | Derived strictly from validated route parameter `:siteId`; composite FK `(siteId, organizationId) -> sites(id, organizationId)` `ON DELETE RESTRICT`; moving between sites disallowed in MVP |
| `Building.code` | `String @db.VarChar(32)` | Yes | Immutable | Trim whitespace, uppercase ASCII; 2–32 chars; regex `/^[A-Z0-9](?:[A-Z0-9]|-(?=[A-Z0-9])){0,30}[A-Z0-9]$/`; unique per `siteId`; never reused after archive |
| `Building.name` | `String @db.VarChar(120)` | Yes | Mutable | Trim whitespace, preserve Unicode capitalization; 2–120 chars; reject control chars |
| `Building.type` | `BuildingType` | Yes | Mutable | Must be a valid `BuildingType` enum member |
| `Building.description` | `String? @db.VarChar(2000)` | No | Mutable | Optional trimmed plain text; max 2,000 chars; reject control chars (except `\n`, `\t`) |
| `Building.floorCount` | `Int?` | No | Mutable | Optional positive integer in `[1, 200]`; DB `CHECK` enforced |
| `Building.grossAreaSqM` | `Decimal? @db.Decimal(12, 2)` | No | Mutable | Optional positive fixed-precision decimal (`> 0` and `<= 9999999999.99`, at most 2 fractional digits); transferred strictly as decimal string in JSON (normalized to 2 fractional digits, e.g., `"4200.00"`); DB `CHECK` enforced |
| `Building.status` | `LocationStatus @default(ACTIVE)` | Yes | Lifecycle | Controlled exclusively via `/activate` and `/deactivate` commands (not generic `PATCH`); defaults to `ACTIVE` |
| `Building.archivedAt` | `DateTime? @db.Timestamptz(6)` | No | Lifecycle | `null` unless archived; controlled exclusively via `/archive` and `/restore` commands |
| `Building.createdAt` | `DateTime @default(now()) @db.Timestamptz(6)` | Yes | Immutable | UTC creation timestamp |
| `Building.updatedAt` | `DateTime @updatedAt @db.Timestamptz(6)` | Yes | System | UTC last-update timestamp |

#### `Building` Constraints & Indexes

- `@@unique([id, organizationId])` — pre-provisioned for Phase 5.5 tenant-safe `Asset` relations
- `@@unique([id, siteId, organizationId])` — pre-provisioned for Phase 5.5 site+building+tenant `Asset` relations
- `@@unique([siteId, code])` — site-scoped building code uniqueness (includes archived rows so codes are never reused)
- `@@index([organizationId, siteId, status, archivedAt, createdAt])` — primary site-scoped list/filter/sort index
- `@@index([organizationId, status])` — organization-level summary index
- Foreign keys:
  - `organization Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict)`
  - `site Site @relation(fields: [siteId, organizationId], references: [id, organizationId], onDelete: Restrict)`
- PostgreSQL `CHECK` constraints:
  - `buildings_floor_count_range_chk`: `"floorCount" IS NULL OR ("floorCount" >= 1 AND "floorCount" <= 200)`
  - `buildings_gross_area_positive_chk`: `"grossAreaSqM" IS NULL OR "grossAreaSqM" > 0`

---

### 2.4 `AuditLog` *(existing — new `AuditAction` union members)*

- Table: `audit_logs` (no schema change needed; `action` is `VarChar(80)`, `entityType` is `VarChar(60)`, `entityId` is `VarChar(128)`).
- New `AuditAction` values added in `server/src/audit-logs/audit-logs.service.ts`:
  - Site actions (`entityType = 'SITE'`): `SITE_CREATED`, `SITE_UPDATED`, `SITE_ACTIVATED`, `SITE_DEACTIVATED`, `SITE_ARCHIVED`, `SITE_RESTORED`
  - Building actions (`entityType = 'BUILDING'`): `BUILDING_CREATED`, `BUILDING_UPDATED`, `BUILDING_ACTIVATED`, `BUILDING_DEACTIVATED`, `BUILDING_ARCHIVED`, `BUILDING_RESTORED`
- Every mutation writes its `AuditLog` inside the same Prisma transaction (`tx`) with `organizationId`, `actorUserId`, `actorMembershipId`, `entityType`, `entityId`, `requestId`, `correlationId`, and sanitized `metadata` (safe before/after changed field diffs or lifecycle transition summary; zero secrets).

---

## 3. Entity Relationship Diagram

```text
Organization (id)
 ├── 1:N (onDelete: Restrict) ──▶ Site (id, organizationId, code)
 │                                  ├── UNIQUE (id, organizationId)
 │                                  ├── UNIQUE (organizationId, code)
 │                                  └── 1:N via composite FK (siteId, organizationId)
 │                                        (onDelete: Restrict)
 │                                        └──▶ Building (id, siteId, organizationId, code)
 │                                               ├── UNIQUE (id, organizationId)
 │                                               ├── UNIQUE (id, siteId, organizationId)
 │                                               └── UNIQUE (siteId, code)
 └── 1:N (onDelete: Restrict) ────────────────▶ Building (organizationId)
```

---

## 4. Lifecycle State Machines & Preconditions

### 4.1 Operational Status Transitions (`status`, when `archivedAt IS NULL`)

| Current State | Command | Result | Error on Invalid State |
|---|---|---|---|
| `ACTIVE`, `archivedAt = null` | `deactivate` | `status = INACTIVE` | — |
| `INACTIVE`, `archivedAt = null` | `activate` | `status = ACTIVE` | — |
| `ACTIVE`, `archivedAt = null` | `activate` | Rejected | `409 INVALID_LOCATION_STATE` |
| `INACTIVE`, `archivedAt = null` | `deactivate` | Rejected | `409 INVALID_LOCATION_STATE` |
| Any, `archivedAt != null` | `activate` / `deactivate` / `update` | Rejected | `409 INVALID_LOCATION_STATE` |

Deactivating a `Site` does **not** alter `status` or `archivedAt` of child `Building` rows.

### 4.2 Archive & Restore Transitions (`archivedAt`)

| Resource | Command | Required Preconditions (checked inside transaction under parent `Site` row lock) | Result | Conflict Error |
|---|---|---|---|---|
| `Site` | `archive` | `site.archivedAt === null`; count of buildings where `siteId = site.id AND organizationId = site.organizationId AND archivedAt IS NULL` equals `0` | `archivedAt = now()` | `409 INVALID_LOCATION_STATE` (if already archived) or `409 SITE_HAS_ACTIVE_BUILDINGS` (if count > 0) |
| `Site` | `restore` | `site.archivedAt !== null`; owning organization is `ACTIVE` (guaranteed by `OrganizationContextGuard`) | `archivedAt = null` (preserves prior `status`) | `409 INVALID_LOCATION_STATE` (if not archived) |
| `Building` | `create` | Parent `Site` exists in `organizationId`, `site.archivedAt === null`, `site.status === ACTIVE` | New `Building` with `status = ACTIVE`, `archivedAt = null` | `404 SITE_NOT_FOUND`, `409 SITE_ARCHIVED`, `409 SITE_INACTIVE`, `409 BUILDING_CODE_ALREADY_EXISTS` |
| `Building` | `archive` | `building.archivedAt === null` | `archivedAt = now()` | `409 INVALID_LOCATION_STATE` (if already archived) |
| `Building` | `restore` | `building.archivedAt !== null`; parent `Site` has `archivedAt === null` AND `status === ACTIVE` | `archivedAt = null` (preserves prior `status`) | `409 INVALID_LOCATION_STATE` (if not archived), `409 SITE_ARCHIVED`, `409 SITE_INACTIVE` |
