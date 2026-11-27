# ADR-0012: Multi-Tenant Location Integrity, Composite Foreign Keys & Cursor Safety

- **Status:** Accepted
- **Date:** 2026-11-27
- **Decision owner:** GridAware engineering
- **Related:** Phase 5.4 (`specs/004-sites-buildings-management/`), ADR-0004, Constitution Principle I

## Context

In a shared-database multi-tenant B2B SaaS platform, a single unscoped lookup, foreign-key omission, or raw pagination cursor can expose foreign tenant existence or attach a building from Organization A to a site in Organization B.

## Decision

Enforce tenant and parent-child integrity across three independent defense-in-depth layers:

1. **Database persistence layer (PostgreSQL)**:
   - `Site` defines `@@unique([id, organizationId])` and `@@unique([organizationId, code])`.
   - `Building` enforces a composite foreign key `(siteId, organizationId) REFERENCES sites(id, organizationId) ON DELETE RESTRICT`, making cross-tenant parent attachment physically impossible at the database level.
   - Six PostgreSQL `CHECK` constraints enforce latitude/longitude bounds, paired coordinate nullability, ISO alpha-2 country code format, floor count bounds (`1..200`), and strictly positive `grossAreaSqM`.
2. **Application guard & repository layer (NestJS + Prisma)**:
   - All 16 endpoints reuse `@OrgProtected()` (`AccessTokenGuard -> CsrfGuard -> OrganizationContextGuard -> PermissionsGuard`) and Phase 5.3 `sites:*`/`buildings:*` permissions.
   - `SitesRepository` and `BuildingsRepository` require explicit `organizationId` (and `siteId` for buildings) on every query and mutation; unscoped `findUnique({ where: { id } })` is prohibited.
   - Cross-tenant, invalid-UUID, and wrong-site lookups return concealed `404` (`SITE_NOT_FOUND` / `BUILDING_NOT_FOUND`) without revealing foreign existence.
3. **Tenant-validated opaque keyset cursor pagination**:
   - Cursors encode `{ v: 1, id, sort, direction }` in base64url.
   - Before executing a keyset query, the repository verifies that the cursor's `sort` and `direction` match the request AND that the anchor row exists inside the caller's authorized `(organizationId[, siteId])` and archive visibility scope; any mismatch fails with `400 VALIDATION_ERROR` ("Invalid pagination cursor").
   - Every location mutation writes its `AuditLog` (`SITE_*` / `BUILDING_*`) inside the same Prisma transaction so rejected requests emit zero mutation audit rows.

## Consequences

Positive:
- Eliminates cross-tenant building attachment, ID-substitution existence oracles, and pagination cursor leaks.
- Ready for Phase 5.5 (`Asset`) composite foreign keys via pre-provisioned `Building` unique constraints `(id, organizationId)` and `(id, siteId, organizationId)`.

Negative:
- Cursor pagination performs one indexed anchor lookup per paginated page request (negligible overhead vs tenant-isolation guarantee).
