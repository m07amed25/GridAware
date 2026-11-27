# ADR-0010: Physical Location Hierarchy (`Organization -> Site -> Building`)

- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision owner:** GridAware engineering
- **Related:** Phase 5.4 (`specs/004-sites-buildings-management/`), ADR-0004

## Context

GridAware manages heterogeneous industrial plants, campuses, warehouse parks, and standalone commercial buildings. Downstream phases (Phase 5.5 Assets & Equipment, Phase 5.6 Sensors & Devices, telemetry, incidents, and maintenance) need a stable, consistent physical hierarchy without premature sub-building complexity (floors, rooms, zones, CAD/BIM).

## Decision

Model physical locations as a strict two-level hierarchy beneath every `Organization`:

- **`Site`** (`sites` table): Organization-owned logical facility, campus, plant, or commercial property carrying shared postal address, optional paired `latitude`/`longitude` coordinates, controlled `SiteType`, and canonical IANA `timeZone` (default `UTC`).
- **`Building`** (`buildings` table): Physical structure owned strictly by one `Site` and the same `Organization`, carrying controlled `BuildingType`, optional `floorCount` (`1..200`), and optional `grossAreaSqM` (`Decimal(12, 2)`, serialized strictly as a fixed 2-decimal string in JSON).
- Standalone single-building properties are represented consistently as one `Site` containing one `Building`.
- Codes (`Site.code` unique per organization; `Building.code` unique per site) are normalized uppercase ASCII (`2..32` chars, single internal hyphens only), immutable once created, and permanently reserved after archival.

## Alternatives Considered

### Flat `Location` tree table with self-referential `parentId`
Rejected for MVP because recursive queries, variable nesting depth, and polymorphic parent validation complicate tenant isolation, indexing, and asset attachment rules.

### Optional `Site` (buildings directly under `Organization`)
Rejected because standalone properties still require address, coordinate, and IANA time-zone context; keeping `Site` mandatory preserves a uniform query and UX model.

## Consequences

Positive:
- Uniform data and URL model (`/organizations/:organizationId/sites/:siteId/buildings/:buildingId`) across factories and commercial buildings.
- Pre-provisioned composite unique indexes on `Building` (`(id, organizationId)` and `(id, siteId, organizationId)`) allow Phase 5.5 `Asset` records to attach cleanly to either a Site or a Building.
- Immutable codes guarantee stable historical references in telemetry exports, work orders, and audit logs.

Negative:
- Single-building customers create one Site wrapper before adding their Building.
- Sub-building spaces (floors/rooms/zones) remain deferred to a future phase.
