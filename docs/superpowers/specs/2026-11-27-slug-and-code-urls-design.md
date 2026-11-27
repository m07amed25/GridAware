# Slug and Code URLs for Organizations, Sites, and Buildings

**Date:** 2026-11-27
**Scope:** Small change — switch organization, site, and building browser URLs from raw UUIDs to human-readable `Organization.slug`, `Site.code`, and `Building.code` while allowing the API to resolve both UUIDs and slugs/codes.

## Intent & Why

Currently, navigating to a facility or building produces opaque UUID URLs such as:
`/app/organizations/0c24ade5-8891-4602-92cb-a0997418eb4e/sites/37b73715-9599-4470-b14f-4f93393f32b4`

Replacing those path segments with existing human-readable, immutable, unique identifiers (`Organization.slug`, `Site.code`, and `Building.code`) makes links readable, shareable, and easy to recognize in the address bar without adding database columns or running a Prisma migration.

## Approaches Considered

1. **Dual-resolution API + canonical slug/code frontend routes (Chosen):**
   - Backend route guards and services accept either a UUID or a slug/code on `:organizationId`, `:siteId`, and `:buildingId`, resolving to canonical UUIDs via existing unique indexes before running authorization, locking, mutations, or audit logging.
   - Frontend Next.js routes generate lowercase slug/code URLs everywhere (e.g. `/app/organizations/demo-gridaware-facilities/sites/cai-plant-01/buildings/prod-hall-01`) and transparently canonicalize legacy UUID or non-lowercase URLs via `router.replace`.
   - *Trade-off:* Touches both backend and frontend plus OpenAPI docs, but deep links resolve in a single request, archived records work reliably, and existing UUID API callers, bookmarks, and tests stay 100% compatible.
2. **Frontend-only slug/code URLs with client-side lookup:**
   - Keep the API strictly UUID-only and resolve slugs/codes on the client by querying list endpoints.
   - *Trade-off:* Zero backend changes, but introduces sequential network waterfalls on every deep link and breaks easily with pagination and archived records.
3. **Replace UUIDs with slugs/codes across the API (dropped):**
   - Breaking change to OpenAPI contracts, existing test suites, and downstream UUID-keyed resources (assets, telemetry, audit logs).

## Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Canonical frontend URLs across all organization, site, and building pages:
    - `/app/organizations/<org-slug>` (and `/members`, `/roles`, `/settings`, `/sites`)
    - `/app/organizations/<org-slug>/sites/<site-code-lowercase>`
    - `/app/organizations/<org-slug>/sites/<site-code-lowercase>/buildings/<building-code-lowercase>`
  - Dual resolution in backend API:
    - `OrganizationContextGuard` resolves `:organizationId` by UUID or `Organization.slug` (case-insensitive normalized to lowercase).
    - `SitesService` resolves `:siteId` by UUID or `Site.code` (case-insensitive normalized to uppercase via `@@unique([organizationId, code])`).
    - `BuildingsService` resolves `:siteId` and `:buildingId` by UUID or `code` (via `@@unique([organizationId, code])` and `@@unique([siteId, code])`).
  - Include `organizationSlug` in `GET /organizations/:organizationId/access-context` and `POST /invitations/accept` responses so the client always knows the canonical slug without extra requests.
  - Keep non-disclosure (`404 Not Found`) identical for invalid, missing, inactive, or unauthorized identifiers.
  - Canonicalize browser URLs with `router.replace` (preserving query string and hash) when a user lands on a UUID or differently-cased slug/code URL.
- **Non-Goals:**
  - Adding `slug` columns to `Site` or `Building`, or running any database migration.
  - Making `Organization.slug`, `Site.code`, or `Building.code` editable after creation.
  - Changing internal database foreign keys, row-level locks (`FOR UPDATE`), pagination cursors, or `AuditLog.entityId` values (all remain canonical UUIDs).
- **Anti-Goals:**
  - Breaking existing UUID-based API requests, OpenAPI clients, or e2e tests.
  - Leaking tenant existence via different error codes (`400` vs `404`) between malformed UUIDs and unknown slugs/codes.
  - Introducing client-side lookup waterfalls or cross-tenant nav flicker when switching organizations.

## Constraints

- `Site.code` and `Building.code` are 2–32 chars matching `^[A-Z0-9](?:[A-Z0-9]|-(?=[A-Z0-9])){0,30}[A-Z0-9]$`; UUIDs are 36 chars, so site/building UUIDs and codes are strictly disjoint.
- `Organization.slug` is 2–80 chars matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`; `SlugSchema` will reject UUID-shaped custom slugs so org UUIDs and slugs remain strictly disjoint.
- `SitesRepository.lockSiteForUpdate` uses PostgreSQL `::uuid` casts and must always receive the resolved canonical `site.id` UUID, never a raw route parameter.

## Decided Behavior & Builder Calls

- **Identifier choice (decided):** Reuse `Organization.slug`, `Site.code`, and `Building.code`.
- **Architecture (decided):** Dual-resolution API + canonical slug/code frontend routes.
- **URL casing (builder call):** Render site and building codes in lowercase in browser URLs (e.g. `cai-plant-01`, `prod-hall-01`) to match `Organization.slug`, while accepting any casing on input and normalizing on lookup (`toLowerCase()` for org slug, `toUpperCase()` for site/building code).
- **Canonical URL replacement (builder call):** When a user opens a legacy UUID URL or uppercase code URL in the browser, resolve normally and replace the address bar with the canonical lowercase slug/code URL (preserving query params like `?includeArchived=true` and hash fragments like `#site-buildings`) without adding a duplicate history entry.
- **Route segment naming (builder call):** Rename Next.js dynamic folders from `[organizationId]` / `[siteId]` / `[buildingId]` to `[organizationSlug]` / `[siteCode]` / `[buildingCode]`, keeping backend controller parameter names (`:organizationId`, `:siteId`, `:buildingId`) stable in Express/NestJS routing while updating Swagger/OpenAPI descriptions to document UUID-or-slug/code support.
- **BroadcastChannel & cache keys (builder call):** Key `AccessContextProvider` state cleanly across slug and UUID params, exposing both canonical `organizationId` (UUID) and `organizationSlug` from `useAccessContext()`.
- **Verification:** Server unit & contract tests (`pnpm --filter server test`), client unit tests (`pnpm --filter client test`), typecheck/lint/build across both workspaces, plus verification of both slug/code and legacy UUID flows.
