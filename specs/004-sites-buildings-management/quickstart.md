# Quickstart & End-to-End Validation Guide: Sites & Buildings Management (Phase 5.4)

**Feature**: `004-sites-buildings-management` | **Date**: 2026-11-27

Use this guide to validate Phase 5.4 database migrations, backend APIs, cross-tenant security, frontend management screens, and CI gates end-to-end. See [data-model.md](./data-model.md), [sites-buildings-openapi.yaml](./contracts/sites-buildings-openapi.yaml), and [frontend-locations.md](./contracts/frontend-locations.md) for canonical schemas and contracts.

---

## 1. Prerequisites

- Node.js 22+, `pnpm@12.18.0` installed at repository root.
- Non-production Neon PostgreSQL database branch configured in `server/.env` (`DATABASE_URL` and `DATABASE_URL_UNPOOLED`).
- Local Redis running (if testing full auth/session stack locally: `pnpm docker:infra`).

---

## 2. Database Migration & Prisma Client Generation

From `server/`:

```powershell
# 1. Validate schema
pnpm --filter server prisma:validate

# 2. Apply migration to isolated development/test Neon branch
pnpm --filter server prisma:deploy

# 3. Regenerate Prisma 7 client into server/src/generated/prisma
pnpm --filter server prisma:generate
```

Optional development demo seed (strictly non-production; guarded against `NODE_ENV=production`):

```powershell
pnpm --filter server seed:demo-locations
```

---

## 3. Automated Verification Commands

Run all quality gates from the repository root:

```powershell
# Contract validation (OpenAPI 3.1 + JSON Schema 2020-12 + AsyncAPI)
pnpm contracts:validate

# Unit & integration tests (server Vitest + client node --test)
pnpm test

# End-to-end tests including cross-tenant & RBAC matrix for Sites & Buildings
pnpm test:e2e

# Typecheck, lint, and production builds across server and client
pnpm typecheck
pnpm lint
pnpm build
```

---

## 4. End-to-End Functional Verification Scenarios

### Scenario A — Factory Site & Building Hierarchy Setup (`Owner`)
1. Sign in as an `Owner` of Organization A and navigate to `/app/organizations/{orgA}/sites`.
2. Create site `CAI-PLANT-01` ("Cairo Manufacturing Plant", `FACTORY`, `Africa/Cairo`, `30.0444`, `31.2357`).
3. Verify code normalization, `status = ACTIVE`, `buildingCount = 0`, and atomic `SITE_CREATED` audit log.
4. Open the site overview and add `PROD-HALL-01` ("Production Hall 1", `PRODUCTION`, `floorCount: 2`, `grossAreaSqM: "4200.00"`) and `UTIL-BLD-01` ("Utilities Building", `UTILITY`).
5. Confirm site `buildingCount` updates to `2`, building codes appear in monospace alongside human titles, and `grossAreaSqM` renders with `m²`.

### Scenario B — Lifecycle, Archive-Blocked Dependency & Restoration (`Facility Manager`)
1. Deactivate a site with non-archived buildings; verify `status = INACTIVE` and child buildings remain untouched.
2. Attempt to create a new building under the `INACTIVE` site; verify `409 SITE_INACTIVE`.
3. Reactivate the site (`ACTIVE`) and attempt to archive it while buildings remain non-archived; verify `409 SITE_HAS_ACTIVE_BUILDINGS` and verify the UI explains the dependency and links to the site's buildings section.
4. Archive all child buildings, then archive the site; verify exclusion from default lists and visibility only when `includeArchived=true` as `Owner`/`Facility Manager`.
5. Attempt to restore an archived building while its parent site is still archived; verify `409 SITE_ARCHIVED`.
6. Restore the site, then restore the building; verify both return to normal lists with `archivedAt = null`.

### Scenario C — RBAC & Cross-Tenant Isolation Matrix
1. Sign in as `Viewer`, `Engineer`, and `Technician` in Organization A:
   - Verify `GET` sites/buildings succeed and UI hides create/edit/archive/includeArchived controls.
   - Verify direct `POST`/`PATCH`/archive/restore or `?includeArchived=true` calls return `403 FORBIDDEN` with zero records mutated.
2. As `Owner` of Organization A, probe Organization B's `organizationId`, `siteId`, `buildingId`, and pagination cursor:
   - Verify `404` non-disclosure on cross-tenant site/building routes and wrong-site building routes.
   - Verify `400 VALIDATION_ERROR` on cross-tenant pagination cursors without disclosing Organization B data.
   - Verify switching organizations in the UI immediately clears Organization A's locations before loading Organization B.
