# Slug and Code URLs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch GridAware's organization, site, and building browser URLs to canonical lowercase `Organization.slug`, `Site.code`, and `Building.code` paths while enabling dual resolution (UUID or slug/code) across the NestJS API.

**Architecture:** The backend resolves `:organizationId` (UUID or `Organization.slug`), `:siteId` (UUID or `Site.code`), and `:buildingId` (UUID or `Building.code`) at the guard/repository boundary using existing unique indexes, converting immediately to canonical UUIDs so all internal locks, tenant policies, queries, and audit logs remain strictly UUID-based. The Next.js frontend renames dynamic route segments to `[organizationSlug]`, `[siteCode]`, and `[buildingCode]`, emits lowercase slug/code links everywhere, and canonicalizes legacy UUID or mixed-case URLs in place via `router.replace`.

**Tech Stack:** NestJS, Prisma (PostgreSQL), Zod, Vitest, Next.js App Router (React 19), Node test runner (`node:test`), OpenAPI 3.1.

**Spec:** [2026-11-27-slug-and-code-urls-design.md](file:///d:/My%20Projects/gridware/docs/superpowers/specs/2026-11-27-slug-and-code-urls-design.md)

## Global Constraints

- No Prisma schema changes or database migrations; reuse `organizations.slug` (`@unique`), `sites (organizationId, code)`, and `buildings (siteId, code)`.
- Non-disclosure (`404`) must remain identical for malformed, unknown, inactive, archived-without-permission, or unauthorized identifiers.
- Internal DB foreign keys, PostgreSQL `FOR UPDATE` row locks (`::uuid`), pagination cursors, and `AuditLog.entityId` values must always use canonical UUIDs.
- Browser URLs use lowercase slugs and codes (e.g. `/app/organizations/demo-gridaware-facilities/sites/cai-plant-01/buildings/prod-hall-01`); input matching is case-insensitive (`toLowerCase()` for org slug, `toUpperCase()` for site/building code).
- Existing UUID-based API callers, OpenAPI validations, and tests must continue passing without breaking changes.

## Review Focus

1. **Mixed-case or uppercase slug/code in URL** (`/organizations/Demo-Org/sites/CAI-PLANT-01/buildings/PROD-HALL-01`) — backend resolves case-insensitively and frontend replaces URL to lowercase while preserving query string and hash. *(Pinned in Tasks 1, 2, 3, 4)*
2. **Legacy UUID deep link with query params and hash** (`/app/organizations/<uuid>/sites/<site-uuid>?includeArchived=true#site-buildings`) — resolves without error flash and canonicalizes to lowercase slug/code preserving `?includeArchived=true#site-buildings`. *(Pinned in Tasks 3, 4)*
3. **PostgreSQL `::uuid` row lock and audit log IDs on code-addressed mutations** (`archive`, `restore`, `createBuilding`) — `lockSiteForUpdate` and `auditLogs.record` must receive the resolved canonical UUID, never the raw code string. *(Pinned in Task 2)*
4. **UUID-shaped custom org slug collision & malformed ref non-disclosure** — `SlugSchema` rejects UUID-shaped custom slugs; malformed org/site/building refs return concealed `404` without querying the database. *(Pinned in Tasks 1, 2)*
5. **Archived site/building resolution by code** — `findOne(..., includeArchived=true)` and `restore(...)` resolve archived sites and buildings via code identically to UUIDs. *(Pinned in Task 2)*

---

## File Structure

- **Server AuthZ & Orgs (Task 1):**
  - `server/src/authorization/authorization.constants.ts` — `ORG_SLUG_PATTERN`
  - `server/src/authorization/authorization.types.ts` — `organizationSlug` on `OrganizationAuthorizationContext` and `AccessContextPayload`
  - `server/src/authorization/guards/organization-context.guard.ts` — UUID-or-slug lookup + populate `organizationSlug`
  - `server/src/authorization/authorization.service.ts` — include `organizationSlug` in `buildAccessContext`
  - `server/src/authorization/dto/authorization-swagger.dto.ts` — Swagger property `organizationSlug`
  - `server/src/organizations/dto/organizations.schemas.ts` — reject UUID-shaped custom slugs in `SlugSchema`
  - `server/src/memberships/invitations.service.ts` — return `organizationSlug` from `acceptInvitation`
- **Server Sites & Buildings (Task 2):**
  - `server/src/sites/sites.repository.ts` — `findByCodeInOrganization` & `findByRefInOrganization`
  - `server/src/sites/sites.service.ts` — resolve `:siteId` via `findByRefInOrganization`, pass canonical UUIDs to locks/updates/audit
  - `server/src/buildings/buildings.repository.ts` — `findByCodeInSite` & `findByRefInSite`
  - `server/src/buildings/buildings.service.ts` — resolve `:siteId` & `:buildingId` via ref helpers, pass canonical UUIDs to locks/updates/audit
- **Client Navigation Helpers & AuthZ Context (Task 3):**
  - `client/lib/navigation/location-urls.mjs` (+ `.d.ts`, `.test.mjs`) — canonical URL builders & path canonicalizer
  - `client/lib/authorization/types.ts` — `organizationSlug` on `OrganizationAccessContext` and `AcceptInvitationResult`
  - `client/components/authorization/access-context-provider.tsx` — expose canonical `organizationId` (UUID), `organizationSlug`, `organizationRef`
  - `client/components/authorization/organization-shell.tsx` — canonicalize org segment via `router.replace`
  - `client/components/shell/protected-app-shell.tsx`, `organization-switcher.tsx`, `accessible-organizations-card.tsx`, `shell-nav.mjs`
- **Client Routes & Location Panels (Task 4):**
  - Rename `client/app/(protected)/app/organizations/[organizationId]` → `[organizationSlug]`, `sites/[siteId]` → `sites/[siteCode]`, `buildings/[buildingId]` → `buildings/[buildingCode]`
  - Update org/site/building pages, `invite/accept/page.tsx`, `onboarding/organization/page.tsx`, `members-management-panel.tsx`, `sites-directory-panel.tsx`, `site-detail-panel.tsx`, `building-detail-panel.tsx`
- **API Docs & Contracts (Task 5):**
  - Swagger `@ApiParam` annotations in org/authz/memberships/invitations/sites/buildings controllers
  - `docs/contracts/openapi.yaml` and `specs/004-sites-buildings-management/contracts/sites-buildings-openapi.yaml`

---

### Task 1: Organization Slug Dual-Resolution & API Payloads (Server)

**Files:**
- Modify: `server/src/authorization/authorization.constants.ts`
- Modify: `server/src/authorization/authorization.types.ts`
- Modify: `server/src/authorization/guards/organization-context.guard.ts`
- Modify: `server/src/authorization/authorization.service.ts`
- Modify: `server/src/authorization/dto/authorization-swagger.dto.ts`
- Modify: `server/src/organizations/dto/organizations.schemas.ts`
- Modify: `server/src/memberships/invitations.service.ts`
- Test: `server/src/authorization/tests/organization-context.guard.spec.ts`

**Interfaces:**
- Produces:
  - `ORG_SLUG_PATTERN: RegExp` in `authorization.constants.ts`
  - `OrganizationAuthorizationContext.organizationSlug?: string`
  - `AccessContextPayload.organizationSlug: string`
  - `InvitationsService.acceptInvitation(...)` returns `{ organizationId, organizationSlug, organizationName, membershipId, role }`

- [ ] **Step 1: Write failing tests in `server/src/authorization/tests/organization-context.guard.spec.ts`**

Add tests asserting:
1. Valid lowercase slug (`demo-gridaware-facilities`) queries `prisma.membership.findFirst` with `organization: { slug: 'demo-gridaware-facilities', status: OrganizationStatus.ACTIVE }` (not `organizationId`) and populates `request.organizationContext` with canonical `organizationId: ORG_A` and `organizationSlug: 'demo-gridaware-facilities'`.
2. Mixed-case slug (`Demo-GridAware-Facilities`) normalizes to lowercase `demo-gridaware-facilities` before querying.
3. Valid UUID (`ORG_A`) continues querying by `organizationId: ORG_A` and populates `organizationSlug` from `membership.organization.slug`.
4. Truly malformed param (`bad..slug!`) skips DB lookup, records `AUTHZ_DENIED` with `INVALID_ORG_PARAM`, and throws `404 RESOURCE_NOT_FOUND`.
5. `SlugSchema.safeParse(ORG_A).success === false` (rejects UUID-shaped custom slugs).
6. `AuthorizationService.buildAccessContext(ctx)` includes `organizationSlug`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter server exec vitest run src/authorization/tests/organization-context.guard.spec.ts`
Expected: FAIL on slug resolution, `organizationSlug`, and UUID-shaped slug rejection.

- [ ] **Step 3: Implement org slug dual-resolution and `organizationSlug` payload fields**

1. `authorization.constants.ts`: export `ORG_SLUG_PATTERN = /^(?=.{2,80}$)[a-z0-9]+(?:-[a-z0-9]+)*$/`.
2. `organizations.schemas.ts`: add `.refine((val) => !UUID_PATTERN.test(val), 'Slug cannot use a UUID format.')` to `SlugSchema`.
3. `authorization.types.ts` & `authorization-swagger.dto.ts`: add `readonly organizationSlug?: string` to `OrganizationAuthorizationContext` and `readonly organizationSlug: string` (`@ApiProperty({ example: 'demo-gridaware-facilities' })`) to `AccessContextPayload` / `AccessContextDataDto`.
4. `organization-context.guard.ts`:
   - Trim `rawOrganizationId`.
   - If `UUID_PATTERN.test(raw)` -> query by `{ organizationId: raw, userId, status: ACTIVE, organization: { status: ACTIVE } }`.
   - Else if `ORG_SLUG_PATTERN.test(raw.toLowerCase())` -> query by `{ userId, status: ACTIVE, organization: { slug: raw.toLowerCase(), status: ACTIVE } }`.
   - Else -> `recordDenial(..., 'INVALID_ORG_PARAM')` and throw `AppException.notFound()`.
   - Select `organization: { select: { slug: true } }` in the same `findFirst` query and set `organizationSlug: membership.organization.slug` on `request.organizationContext`.
5. `authorization.service.ts`: return `organizationSlug: context.organizationSlug ?? ''` in `buildAccessContext`.
6. `invitations.service.ts`: include `slug: true` in `acceptInvitation`'s `organization.select` and return `organizationSlug: invitation.organization.slug`.

- [ ] **Step 4: Run server authorization tests to verify they pass**

Run: `pnpm --filter server exec vitest run src/authorization/ src/memberships/`
Expected: PASS (all specs green).

---

### Task 2: Site & Building Dual-Resolution by UUID or Code (Server)

**Files:**
- Modify: `server/src/sites/sites.repository.ts`
- Modify: `server/src/sites/sites.service.ts`
- Modify: `server/src/buildings/buildings.repository.ts`
- Modify: `server/src/buildings/buildings.service.ts`
- Test: `server/src/sites/tests/sites.service.spec.ts`
- Test: `server/src/buildings/tests/buildings.service.spec.ts`

**Interfaces:**
- Consumes: `UUID_PATTERN` (`authorization.constants.ts`), `LOCATION_CODE_PATTERN` & `normalizeLocationCode` (`location-validation.ts`).
- Produces:
  - `SitesRepository.findByCodeInOrganization(organizationId: string, code: string, tx?: Prisma.TransactionClient): Promise<SiteRecord | null>`
  - `SitesRepository.findByRefInOrganization(organizationId: string, siteRef: string, tx?: Prisma.TransactionClient): Promise<SiteRecord | null>`
  - `BuildingsRepository.findByCodeInSite(organizationId: string, siteId: string, code: string, tx?: Prisma.TransactionClient): Promise<BuildingRecord | null>`
  - `BuildingsRepository.findByRefInSite(organizationId: string, siteId: string, buildingRef: string, tx?: Prisma.TransactionClient): Promise<BuildingRecord | null>`

- [ ] **Step 1: Write failing tests in `sites.service.spec.ts` and `buildings.service.spec.ts`**

In `sites.service.spec.ts`, add tests asserting:
1. `findOne(ctx, 'cai-plant-01')` and `findOne(ctx, 'CAI-PLANT-01')` resolve the site by normalized code and return the DTO.
2. `findOne(ctx, 'cai-plant-01', true)` resolves an archived site when `includeArchived` is true.
3. `archive(ctx, 'cai-plant-01')` and `restore(ctx, 'cai-plant-01')` pass canonical `SITE_ID` (UUID) — never `'cai-plant-01'` — to `lockSiteForUpdate`, `countNonArchivedBuildings`, `updateInOrganization`, and `auditLogs.record`.
4. `update(ctx, 'cai-plant-01', ...)`, `activate(ctx, 'cai-plant-01')`, `deactivate(ctx, 'cai-plant-01')` pass canonical `SITE_ID` to `updateInOrganization`.
5. Invalid site ref (`'bad!!ref'`) throws `404 SITE_NOT_FOUND` without calling `updateInOrganization`.

In `buildings.service.spec.ts`, add tests asserting:
1. `list(ctx, 'cai-plant-01', query)` resolves parent site by code and queries `findManyInSite` with canonical `SITE_ID`.
2. `create(ctx, 'cai-plant-01', input)` locks canonical `SITE_ID` (`lockSiteForUpdate`) and creates building with canonical `SITE_ID`.
3. `findOne(ctx, 'cai-plant-01', 'prod-hall-01')` and `findOne(ctx, 'CAI-PLANT-01', 'PROD-HALL-01', true)` resolve by site code + building code (including archived).
4. `update`, `activate`, `deactivate`, `archive`, `restore` called with `('cai-plant-01', 'prod-hall-01')` pass canonical `SITE_ID` and `BUILDING_ID` to `lockSiteForUpdate`, `updateInSite`, and `auditLogs.record`.
5. Invalid building ref (`'bad!!code'`) throws `404 BUILDING_NOT_FOUND`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter server exec vitest run src/sites/tests/sites.service.spec.ts src/buildings/tests/buildings.service.spec.ts`
Expected: FAIL because services currently reject non-UUID refs with 404.

- [ ] **Step 3: Implement repository ref-resolution helpers and wire into `SitesService` and `BuildingsService`**

1. `sites.repository.ts`:
   - Add `findByCodeInOrganization(organizationId, code, tx?)` querying `client.site.findUnique({ where: { organizationId_code: { organizationId, code } }, select: SITE_SELECT })`.
   - Add `findByRefInOrganization(organizationId, siteRef, tx?)`:
     - Trim `siteRef`. If `UUID_PATTERN.test(trimmed)` return `this.findByIdInOrganization(organizationId, trimmed, tx)`.
     - Else normalize `const code = normalizeLocationCode(trimmed)`; if `!LOCATION_CODE_PATTERN.test(code)` return `null`; return `this.findByCodeInOrganization(organizationId, code, tx)`.
2. `buildings.repository.ts`:
   - Add `findByCodeInSite(organizationId, siteId, code, tx?)` querying `client.building.findFirst({ where: { organizationId, siteId, code }, select: BUILDING_SELECT })`.
   - Add `findByRefInSite(organizationId, siteId, buildingRef, tx?)` with the same UUID-vs-code dispatch.
3. `sites.service.ts`:
   - Add private helper `resolveSiteRef(organizationId, siteRef, tx?)` that delegates to `sitesRepository.findByRefInOrganization` (supporting both new mock methods and existing unit test mocks that only stub `findByIdInOrganization` when `siteRef` is a UUID — cleanly handled if `findByRefInOrganization` is implemented on the repo and stubbed in harness).
   - Remove upfront `if (!UUID_PATTERN.test(siteId))` guards.
   - For `archive` and `restore`: inside transaction, first resolve `initial = await this.sitesRepository.findByRefInOrganization(context.organizationId, siteRef, tx)`; if `!initial` throw `AppException.siteNotFound()`; then `await this.sitesRepository.lockSiteForUpdate(tx, context.organizationId, initial.id)`; then re-read `existing = await this.sitesRepository.findByIdInOrganization(context.organizationId, initial.id, tx)` and use `owned.id` for `countNonArchivedBuildings`, `updateInOrganization`, and audit/logs!
   - For `update`, `activate`, `deactivate`: resolve via `findByRefInOrganization`, assert policy, and pass `owned.id` to `updateInOrganization`.
4. `buildings.service.ts`:
   - Remove upfront `UUID_PATTERN` checks.
   - In `list`: resolve parent site via `sitesRepository.findByRefInOrganization`, assert `assertParentSiteExists`, pass `ownedSite.id` to `findManyInSite`.
   - In `create`: inside tx, resolve parent site via `findByRefInOrganization`; if `!initialSite` throw `AppException.siteNotFound()`; `lockSiteForUpdate(tx, context.organizationId, initialSite.id)`; re-read by `initialSite.id`; assert `assertParentSiteAcceptsBuilding`; pass `initialSite.id` to `createInSite`, `auditLogs.record`, and logger.
   - In `findOne`, `update`, `activate`, `deactivate`: resolve parent site via `findByRefInOrganization` (throw `AppException.buildingNotFound()` if null to preserve non-disclosure), then resolve building via `buildingsRepository.findByRefInSite(context.organizationId, parentSite.id, buildingRef, tx)`, and pass `parentSite.id` and `owned.id` to policies, `updateInSite`, audit, and logger.
   - In `archive` and `restore`: inside tx, resolve parent site via `findByRefInOrganization` (throw `buildingNotFound()` if null), call `lockSiteForUpdate(tx, context.organizationId, parentSite.id)`, resolve building via `findByRefInSite(context.organizationId, parentSite.id, buildingRef, tx)`, re-read parent site (for `restore`), and pass canonical `parentSite.id` and `owned.id` to `updateInSite`, audit, and logger.

- [ ] **Step 4: Run site and building unit tests to verify they pass**

Run: `pnpm --filter server exec vitest run src/sites/ src/buildings/`
Expected: PASS (all existing + new specs green).

---

### Task 3: Client Canonical URL Helpers, AccessContextProvider & Shell Navigation (Client)

**Files:**
- Create: `client/lib/navigation/location-urls.mjs`
- Create: `client/lib/navigation/location-urls.d.ts`
- Create: `client/lib/navigation/location-urls.test.mjs`
- Modify: `client/lib/authorization/types.ts`
- Modify: `client/lib/navigation/shell-nav.mjs`
- Modify: `client/lib/navigation/shell-nav.d.ts`
- Modify: `client/components/authorization/access-context-provider.tsx`
- Modify: `client/components/authorization/organization-shell.tsx`
- Modify: `client/components/shell/protected-app-shell.tsx`
- Modify: `client/components/authorization/organization-switcher.tsx`
- Modify: `client/components/authorization/accessible-organizations-card.tsx`
- Test: `client/lib/navigation/location-urls.test.mjs`, `client/lib/navigation/shell-nav.test.mjs`, `client/lib/authorization/permissions.test.mjs`

**Interfaces:**
- Produces:
  - `location-urls.mjs`:
    - `toUrlCode(code: string): string` (trims + lowercases)
    - `orgOverviewPath(orgSlug: string): string`
    - `orgSitesPath(orgSlug: string): string`
    - `siteDetailPath(orgSlug: string, siteCode: string, options?: { includeArchived?: boolean; hash?: string }): string`
    - `buildingDetailPath(orgSlug: string, siteCode: string, buildingCode: string, options?: { includeArchived?: boolean }): string`
    - `replaceOrgSegmentInPath(pathname: string, canonicalOrgSlug: string): string | null` (returns new pathname if current org segment differs from `canonicalOrgSlug`, else `null`)
    - `appendSearchAndHash(pathname: string, search: string, hash: string): string`
  - `AccessContextState`:
    - `organizationId: string` (canonical UUID once loaded, route param fallback while loading)
    - `organizationSlug: string` (canonical slug once loaded, route param fallback while loading)
    - `organizationRef: string` (raw route param)

- [ ] **Step 1: Write failing unit tests in `client/lib/navigation/location-urls.test.mjs` and expand `shell-nav.test.mjs`**

Test assertions:
1. `siteDetailPath("demo-org", "CAI-PLANT-01")` → `"/app/organizations/demo-org/sites/cai-plant-01"`.
2. `siteDetailPath("demo-org", "CAI-PLANT-01", { includeArchived: true, hash: "site-buildings" })` → `"/app/organizations/demo-org/sites/cai-plant-01?includeArchived=true#site-buildings"`.
3. `buildingDetailPath("demo-org", "CAI-PLANT-01", "PROD-HALL-01", { includeArchived: true })` → `"/app/organizations/demo-org/sites/cai-plant-01/buildings/prod-hall-01?includeArchived=true"`.
4. `replaceOrgSegmentInPath("/app/organizations/0c24ade5-8891-4602-92cb-a0997418eb4e/sites/cai-plant-01", "demo-org")` → `"/app/organizations/demo-org/sites/cai-plant-01"`.
5. `replaceOrgSegmentInPath("/app/organizations/Demo-Org/settings", "demo-org")` → `"/app/organizations/demo-org/settings"`.
6. `replaceOrgSegmentInPath("/app/organizations/demo-org/sites", "demo-org")` → `null` (already canonical).
7. `appendSearchAndHash("/app/organizations/demo-org/sites/cai-plant-01", "?includeArchived=true", "#site-buildings")` → `"/app/organizations/demo-org/sites/cai-plant-01?includeArchived=true#site-buildings"`.
8. `resolveActiveSidebarId("/app/organizations/demo-org/sites/cai-plant-01", "demo-org")` → `"org-sites"` and `buildShellNavGroups` builds slug hrefs.

- [ ] **Step 2: Run client tests to verify new test fails**

Run: `pnpm --filter client test`
Expected: FAIL because `location-urls.mjs` does not exist yet.

- [ ] **Step 3: Implement `location-urls.mjs`, update `AccessContextProvider`, `OrganizationShell`, and shell navigation**

1. Create `client/lib/navigation/location-urls.mjs` and `.d.ts` matching the exact interface above.
2. `client/lib/authorization/types.ts`: add `organizationSlug: string` to `OrganizationAccessContext` and `AcceptInvitationResult`.
3. `client/components/authorization/access-context-provider.tsx`:
   - Keep `organizationId` prop (accepts either slug or UUID from route/shell).
   - Expose `organizationRef` (prop), `organizationId` (`accessContext?.organizationId ?? organizationRef`), and `organizationSlug` (`accessContext?.organizationSlug ?? organizationRef`).
   - In `AccessContextProvider` deduplication check: reuse parent context if `parentContext.organizationRef === organizationId || parentContext.organizationId === organizationId || parentContext.organizationSlug === organizationId`.
   - In `BroadcastChannel` handler: match `event.data.organizationId` against canonical `organizationId` or `organizationRef`.
4. `client/components/authorization/organization-shell.tsx`:
   - When `!loading && accessContext?.organizationSlug`, check `replaceOrgSegmentInPath(pathname, accessContext.organizationSlug)`. If non-null, call `router.replace(appendSearchAndHash(nextPath, window.location.search, window.location.hash))` inside `useEffect`.
5. `client/components/shell/protected-app-shell.tsx`:
   - Match `orgNameSnapshot` by `org.slug === activeOrgId || org.organizationId === activeOrgId`.
   - Pass `navOrgSlug = orgAccess?.accessContext?.organizationSlug || activeOrgId` to `buildShellNavGroups` so sidebar links always point to `/app/organizations/<slug>/...`, and pass `activeOrgId` (the path segment) to `resolveActiveSidebarId` so active highlighting works both before and after canonical redirect.
6. `client/components/authorization/organization-switcher.tsx`:
   - Match `activeOrg` by `org.slug === activeOrgRef || org.organizationId === activeOrgRef`.
   - Navigate on select to `orgOverviewPath(org.slug)`.
7. `client/components/authorization/accessible-organizations-card.tsx`:
   - Link workspace button to `orgOverviewPath(org.slug)`.

- [ ] **Step 4: Run client tests to verify they pass**

Run: `pnpm --filter client test`
Expected: PASS (all client unit tests green).

---

### Task 4: Client Route Folders, Pages & Location Panels (Client)

**Files:**
- Move/Rename:
  - `client/app/(protected)/app/organizations/[organizationId]/` → `client/app/(protected)/app/organizations/[organizationSlug]/`
  - `.../sites/[siteId]/` → `.../sites/[siteCode]/`
  - `.../buildings/[buildingId]/` → `.../buildings/[buildingCode]/`
- Modify:
  - `client/app/(protected)/app/organizations/[organizationSlug]/layout.tsx`
  - `client/app/(protected)/app/organizations/[organizationSlug]/page.tsx`
  - `client/app/(protected)/app/organizations/[organizationSlug]/roles/page.tsx`
  - `client/app/(protected)/app/organizations/[organizationSlug]/sites/[siteCode]/page.tsx`
  - `client/app/(protected)/app/organizations/[organizationSlug]/sites/[siteCode]/buildings/[buildingCode]/page.tsx`
  - `client/app/(auth)/invite/accept/page.tsx`
  - `client/app/(protected)/onboarding/organization/page.tsx`
  - `client/components/authorization/members-management-panel.tsx`
  - `client/components/locations/sites-directory-panel.tsx`
  - `client/components/locations/site-detail-panel.tsx`
  - `client/components/locations/building-detail-panel.tsx`

**Interfaces:**
- Consumes: `useAccessContext()` (`organizationId` UUID, `organizationSlug`), and `location-urls.mjs` (`orgOverviewPath`, `orgSitesPath`, `siteDetailPath`, `buildingDetailPath`, `toUrlCode`, `appendSearchAndHash`).

- [ ] **Step 1: Rename dynamic route directories and update page parameter destructuring**

1. Rename `[organizationId]` → `[organizationSlug]`, `[siteId]` → `[siteCode]`, `[buildingId]` → `[buildingCode]`.
2. `layout.tsx`: read `const { organizationSlug } = await params;` and pass to `<OrganizationShell organizationId={organizationSlug}>`.
3. `sites/[siteCode]/page.tsx`: read `useParams<{ siteCode: string }>()` and pass `<SiteDetailPanel siteRef={params.siteCode} />`.
4. `sites/[siteCode]/buildings/[buildingCode]/page.tsx`: read `useParams<{ siteCode: string; buildingCode: string }>()` and pass `<BuildingDetailPanel siteRef={params.siteCode} buildingRef={params.buildingCode} />`.

- [ ] **Step 2: Update links, redirects, and canonical URL replacement across pages & panels**

1. `organizations/[organizationSlug]/page.tsx`: use `organizationSlug` for `<Link href={...}>` to members; display `Slug: {organizationSlug}` (or keep ID if helpful).
2. `organizations/[organizationSlug]/roles/page.tsx` & `members-management-panel.tsx`: use `orgOverviewPath(organizationSlug)` for `backHref`.
3. `invite/accept/page.tsx`: redirect to `orgOverviewPath(res.data.organizationSlug || res.data.organizationId)`.
4. `onboarding/organization/page.tsx`: redirect to `orgOverviewPath(response.data.slug)`.
5. `sites-directory-panel.tsx`: use `organizationSlug` from `useAccessContext()`; build site links with `siteDetailPath(organizationSlug, site.code, { includeArchived: Boolean(site.archivedAt) })`, lifecycle `buildingsHref` with `siteDetailPath(organizationSlug, lifecycleTarget.site.code, { hash: "site-buildings" })`, and `backHref` with `orgOverviewPath(organizationSlug)`.
6. `site-detail-panel.tsx`:
   - Accept `siteRef` prop; fetch `getSite(organizationId, siteRef, ...)` and `listBuildings(organizationId, siteRef, ...)`.
   - Use `currentSite.id` (UUID) or `siteRef` cleanly for mutations, and build building links with `buildingDetailPath(organizationSlug, currentSite.code, building.code, { includeArchived: Boolean(building.archivedAt) })`.
   - Breadcrumbs and `backHref` use `orgSitesPath(organizationSlug)`.
   - Canonicalization `useEffect`: once `currentSite` is loaded and `accessContext?.organizationSlug` is known, if `siteRef !== toUrlCode(currentSite.code)`, call `router.replace(appendSearchAndHash(siteDetailPath(accessContext.organizationSlug, currentSite.code), window.location.search, window.location.hash))`.
7. `building-detail-panel.tsx`:
   - Accept `siteRef` and `buildingRef` props; fetch `getBuilding(organizationId, siteRef, buildingRef, ...)` and `getSite(organizationId, siteRef, ...)`.
   - Build parent site breadcrumb & `backHref` with `siteDetailPath(organizationSlug, site?.code ?? siteRef, ...)` and sites breadcrumb with `orgSitesPath(organizationSlug)`.
   - Canonicalization `useEffect`: once `building` and `site` are loaded and `accessContext?.organizationSlug` is known, if `siteRef !== toUrlCode(site.code) || buildingRef !== toUrlCode(building.code)`, call `router.replace(appendSearchAndHash(buildingDetailPath(accessContext.organizationSlug, site.code, building.code), window.location.search, window.location.hash))`.

- [ ] **Step 3: Verify client typecheck, lint, unit tests, and production build**

Run: `pnpm --filter client test && pnpm --filter client typecheck && pnpm --filter client lint && pnpm --filter client build`
Expected: All pass with 0 errors and Next.js route tree shows `/app/organizations/[organizationSlug]/sites/[siteCode]/buildings/[buildingCode]`.

---

### Task 5: OpenAPI/Swagger Documentation & Full Verification

**Files:**
- Modify: `server/src/sites/sites.controller.ts`
- Modify: `server/src/buildings/buildings.controller.ts`
- Modify: `server/src/organizations/organizations.controller.ts`
- Modify: `server/src/authorization/authorization.controller.ts`
- Modify: `server/src/memberships/memberships.controller.ts`
- Modify: `server/src/memberships/invitations.controller.ts`
- Modify: `docs/contracts/openapi.yaml`
- Modify: `specs/004-sites-buildings-management/contracts/sites-buildings-openapi.yaml`

- [ ] **Step 1: Update Swagger `@ApiParam` decorators and OpenAPI specs**

1. Update `@ApiParam` on `:organizationId` across org/authz/memberships/invitations/sites/buildings controllers to remove strict `format: 'uuid'` and add `description: 'Organization UUID or slug'`.
2. Update `@ApiParam` on `:siteId` and `:buildingId` in `sites.controller.ts` and `buildings.controller.ts` to document `'Site UUID or code'` and `'Building UUID or code'`.
3. Update `docs/contracts/openapi.yaml` and `specs/004-sites-buildings-management/contracts/sites-buildings-openapi.yaml`:
   - Document UUID-or-slug/code path parameters for `organizationId`, `siteId`, and `buildingId` (removing strict `format: uuid` on those path params where slugs/codes are accepted).
   - Add `organizationSlug: { type: string }` to `AccessContextData` (or equivalent access-context response schema) in `openapi.yaml`.

- [ ] **Step 2: Run full server & client verification suite**

Run:
```bash
pnpm --filter server test && pnpm --filter server build && pnpm --filter client test && pnpm --filter client typecheck && pnpm --filter client lint && pnpm --filter client build
```
Expected: All server unit + contract validation tests pass, server builds cleanly, all client unit tests pass, client typecheck, lint, and Next.js build succeed cleanly.
