# ADR-0011: Location Operational Status vs Non-Destructive Archival Policy

- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision owner:** GridAware engineering
- **Related:** Phase 5.4 (`specs/004-sites-buildings-management/`), FR-006, FR-007, FR-010, FR-014, FR-015

## Context

Industrial and commercial facility platforms must preserve historical location records for audit compliance, telemetry lineage, and maintenance history. Conflating operational enablement with archival state or allowing destructive deletes risks accidental data loss and orphaned child records.

## Decision

1. **Separate operational status from archival state**:
   - `LocationStatus` contains only `ACTIVE` and `INACTIVE` (never `ARCHIVED`).
   - Operational status reflects administrative enablement only—never equipment or asset health.
   - Archival is represented by a nullable UTC timestamp `archivedAt` (`TIMESTAMPTZ(6)`).
2. **No hard-delete endpoints**:
   - Neither `Site` nor `Building` exposes a `DELETE` endpoint; database foreign keys use `ON DELETE RESTRICT`.
3. **Explicit non-cascading dependency protection**:
   - Deactivating a `Site` leaves child `Building` rows unchanged.
   - Archiving a `Site` is rejected with `409 SITE_HAS_ACTIVE_BUILDINGS` while any non-archived `Building` (`archivedAt IS NULL`) exists under that site; administrators must archive child buildings explicitly.
   - Creating a new `Building` or restoring an archived `Building` strictly requires the parent `Site` to be non-archived (`409 SITE_ARCHIVED`) and `ACTIVE` (`409 SITE_INACTIVE`), enforced transactionally under a per-site `SELECT ... FOR UPDATE` row lock.
4. **Strict archive visibility gating (`FR-015`)**:
   - Archived locations are excluded from default list and detail queries.
   - Explicitly requesting `includeArchived=true` requires `sites:archive` or `buildings:archive` (`OWNER` or `FACILITY_MANAGER`); unauthorized roles (`ENGINEER`, `TECHNICIAN`, `VIEWER`) receive `403 FORBIDDEN` and emit an `AUTHZ_DENIED` audit event.
5. **Deterministic state-transition conflicts**:
   - Mutating an archived location or issuing a redundant transition (`activate` on `ACTIVE`, `deactivate` on `INACTIVE`, `restore` on non-archived) returns `409 INVALID_LOCATION_STATE` without emitting spurious audit logs.

## Consequences

Positive:
- Zero accidental cascades or data loss; 100% recoverable archival with preserved code reservation.
- Clear race-free transactional invariants between concurrent `archiveSite` and `createBuilding`/`restoreBuilding`.

Negative:
- Archiving a large site requires archiving its buildings first (intentional safety friction; UI links directly to the site's buildings list on conflict).
