# Simple Shell & Liquid Glass Expandable Sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate `LiquidGlassExpandableSidebar` into `client/components/ui/` and simplify GridAware's authenticated shell into a unified sidebar-first layout with a slim 56px top context strip.

**Architecture:** Extract pure, unit-tested navigation-matching and group-building helpers into `client/lib/navigation/shell-nav.mjs`, install `gsap` and `@gsap/react` in `client/`, add the `LiquidGlassExpandableSidebar` component at `client/components/ui/liquid-glass-expandable-sidebar.tsx` inheriting EVARAX dark tokens from `client/app/globals.css`, make `AccessContextProvider` safely deduplicate when hoisted into a new `ProtectedAppShell` in `client/app/(protected)/layout.tsx`, and strip the duplicate horizontal nav bar from `OrganizationShell`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS v4, shadcn/ui (`client/components/ui`), `lucide-react`, `gsap` (`Flip`), `@gsap/react` (`useGSAP`), Node.js built-in test runner (`node --test`).

**Spec:** [2026-11-27-simple-shell-liquid-glass-sidebar-design.md](../../specs/2026-11-27-simple-shell-liquid-glass-sidebar-design.md)

## Global Constraints

- Immutable EVARAX palette (`DESIGN.md` §0.2): `#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF` — use semantic CSS variables from `client/app/globals.css`, never raw hex overrides in components.
- Never recolor, rotate, stretch, shadow, or re-type the Node G logo (`client/public/brand/gridaware-symbol-small-dark.svg`).
- Zero cross-tenant data or navigation flicker when switching organizations (`DESIGN.md` §0.2 #7).
- Link only to real implemented routes under `client/app/(protected)/`; no placeholder P1/P2 routes.
- Respect `prefers-reduced-motion`, WCAG 2.2 AA contrast, keyboard focus rings (`--focus-ring`), and `44px` touch targets.
- On Windows, install pnpm packages with elevated/non-sandboxed pnpm add (`pnpm --filter client add ...`) while running test/typecheck/lint/build commands normally.

## Review Focus

1. **Cross-tenant nav bleed while loading a new org:** When switching from Org A to Org B, `buildShellNavGroups` must omit the `Organization` group while `permissions` is `null` (loading) so Org A's items never flash.
2. **Deep nested routes active-state matching:** Nested paths like `/app/organizations/org-1/sites/s-1/buildings/b-1` and `/onboarding/organization` must resolve to `"org-sites"` and `"onboarding"` respectively.
3. **Malformed or encoded URL segments in `extractActiveOrgId`:** Percent-encoded org IDs decode cleanly and malformed percent sequences fall back safely without throwing.
4. **React 19 SSR hydration safety:** `useNavigationReducedMotion` in `liquid-glass-expandable-sidebar.tsx` initializes to `false` and syncs `window.matchMedia` inside `useEffect`.
5. **Mobile drawer lifecycle:** Clicking any sidebar link on `< lg` viewports or pressing `Escape` closes the drawer cleanly so `<main>` is never blocked by a stale overlay.

---

### Task 1: Pure Shell Navigation Helpers & Unit Tests

**Files:**
- Create: `client/lib/navigation/shell-nav.mjs`
- Create: `client/lib/navigation/shell-nav.d.ts`
- Create: `client/lib/navigation/shell-nav.test.mjs`
- Modify: `client/package.json` (add `lib/navigation/shell-nav.test.mjs` to `"test"` script)

**Interfaces:**
- Consumes: `getVisibleOrgNavItems(organizationId, permissions)` from `@/lib/authorization/permissions.mjs`.
- Produces:
  - `extractActiveOrgId(pathname: string): string | null`
  - `resolveActiveSidebarId(pathname: string, activeOrgId: string | null): string | undefined`
  - `buildShellNavGroups(params: { activeOrgId: string | null; activeOrgName?: string | null; permissions: ReadonlySet<string> | null }): Array<{ label: string; items: Array<{ id: string; label: string; href: string; iconKey: string }> }>`
  - `getUserInitials(name: string): string`

- [ ] **Step 1: Write the failing unit tests in `client/lib/navigation/shell-nav.test.mjs`**

```js
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShellNavGroups,
  extractActiveOrgId,
  getUserInitials,
  resolveActiveSidebarId,
} from "./shell-nav.mjs";

describe("Shell navigation helpers", () => {
  it("extracts and safely decodes organization IDs from protected paths", () => {
    assert.equal(extractActiveOrgId("/app"), null);
    assert.equal(extractActiveOrgId("/app/profile"), null);
    assert.equal(extractActiveOrgId("/app/organizations/org-123"), "org-123");
    assert.equal(
      extractActiveOrgId("/app/organizations/org-123/sites/site-9/buildings/b-2"),
      "org-123",
    );
    assert.equal(
      extractActiveOrgId("/app/organizations/org%20space/settings"),
      "org space",
    );
    assert.equal(extractActiveOrgId("/app/organizations/%E0%A4%A/sites"), "%E0%A4%A");
  });

  it("resolves active sidebar IDs for workspace, onboarding, profile, and nested org routes", () => {
    assert.equal(resolveActiveSidebarId("/app", null), "workspace-overview");
    assert.equal(resolveActiveSidebarId("/app/", null), "workspace-overview");
    assert.equal(resolveActiveSidebarId("/onboarding", null), "onboarding");
    assert.equal(
      resolveActiveSidebarId("/onboarding/organization", null),
      "onboarding",
    );
    assert.equal(resolveActiveSidebarId("/app/profile", null), "profile");
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1", "org-1"),
      "org-overview",
    );
    assert.equal(
      resolveActiveSidebarId(
        "/app/organizations/org-1/sites/s-1/buildings/b-2",
        "org-1",
      ),
      "org-sites",
    );
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1/members", "org-1"),
      "org-members",
    );
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1/roles", "org-1"),
      "org-roles",
    );
    assert.equal(
      resolveActiveSidebarId("/app/organizations/org-1/settings", "org-1"),
      "org-settings",
    );
    assert.equal(resolveActiveSidebarId("/unknown/route", null), undefined);
  });

  it("omits Organization group when no org is active or permissions are loading, and filters by permissions when loaded", () => {
    const noOrg = buildShellNavGroups({
      activeOrgId: null,
      activeOrgName: null,
      permissions: null,
    });
    assert.equal(noOrg.length, 1);
    assert.equal(noOrg[0].label, "Workspace");
    assert.deepEqual(
      noOrg[0].items.map((item) => item.id),
      ["workspace-overview", "onboarding"],
    );

    const loadingOrg = buildShellNavGroups({
      activeOrgId: "org-1",
      activeOrgName: "North Plant",
      permissions: null,
    });
    assert.equal(loadingOrg.length, 1);

    const viewerOrg = buildShellNavGroups({
      activeOrgId: "org-1",
      activeOrgName: "North Plant",
      permissions: new Set(["organization:read", "sites:read"]),
    });
    assert.equal(viewerOrg.length, 2);
    assert.equal(viewerOrg[1].label, "North Plant");
    assert.deepEqual(
      viewerOrg[1].items.map((item) => item.id),
      ["org-overview", "org-sites", "org-settings"],
    );

    const ownerOrg = buildShellNavGroups({
      activeOrgId: "org-1",
      activeOrgName: null,
      permissions: new Set(["organization:read", "sites:read", "members:read"]),
    });
    assert.equal(ownerOrg[1].label, "Organization");
    assert.deepEqual(
      ownerOrg[1].items.map((item) => item.id),
      ["org-overview", "org-sites", "org-members", "org-roles", "org-settings"],
    );
  });

  it("derives crisp 2-letter user initials safely", () => {
    assert.equal(getUserInitials("Sara Malik"), "SM");
    assert.equal(getUserInitials("Alex"), "AL");
    assert.equal(getUserInitials("   "), "GA");
  });
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `node --test client/lib/navigation/shell-nav.test.mjs`
Expected: FAIL with module-not-found error for `./shell-nav.mjs`.

- [ ] **Step 3: Implement `client/lib/navigation/shell-nav.mjs` and `client/lib/navigation/shell-nav.d.ts`, and register the test in `client/package.json`**

Implement `extractActiveOrgId`, `resolveActiveSidebarId`, `buildShellNavGroups` (delegating org filtering to `getVisibleOrgNavItems` from `../authorization/permissions.mjs` and prefixing org item IDs with `org-`), and `getUserInitials`. Add matching `.d.ts` declarations and append `lib/navigation/shell-nav.test.mjs` to `client/package.json`'s `"test"` script.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter client test`
Expected: PASS (0 failures, including all new shell-nav assertions).

- [ ] **Step 5: Commit**

```bash
git add client/lib/navigation/shell-nav.mjs client/lib/navigation/shell-nav.d.ts client/lib/navigation/shell-nav.test.mjs client/package.json
git commit -m "feat(client): add unit-tested shell navigation helpers"
```

---

### Task 2: Install GSAP Dependencies & Add `LiquidGlassExpandableSidebar`

**Files:**
- Modify: `client/package.json` & `pnpm-lock.yaml` (add `gsap`, `@gsap/react`)
- Create: `client/components/ui/liquid-glass-expandable-sidebar.tsx`

**Interfaces:**
- Produces (from `client/components/ui/liquid-glass-expandable-sidebar.tsx`):
  - Default export + named export `LiquidGlassExpandableSidebar`
  - Types: `ExpandableGlassSidebarProps`, `GlassNavItem`, `NavigationGlassProps`, `GlassSettings`, `GlassNavGroup`, `GlassSidebarItem`

- [ ] **Step 1: Install `gsap` and `@gsap/react` in `client/`**

Run: `pnpm --filter client add gsap @gsap/react`
Expected: Exit code 0; `gsap` and `@gsap/react` appear in `client/package.json` dependencies.

- [ ] **Step 2: Create `client/components/ui/liquid-glass-expandable-sidebar.tsx`**

Copy the provided `LiquidGlassExpandableSidebar` component into `client/components/ui/liquid-glass-expandable-sidebar.tsx`, preserving all public props, types, styles, GSAP `Flip` + `useGSAP` animations, active selection marker, search filter, and SVG displacement refraction, with two surgical improvements for Next.js 16 + React 19 + EVARAX:
1. Initialize `useNavigationReducedMotion`'s state to `false` (SSR-safe) and sync `window.matchMedia("(prefers-reduced-motion: reduce)")` inside `useEffect`.
2. Ensure the active indicator dot (`a[data-selected="true"]::after`) uses `var(--gn-accent)` so active state picks up EVARAX Soft Yellow `#F4E952` cleanly alongside font weight and selection pill (never color-only per `DESIGN.md` §0.2 #3).

- [ ] **Step 3: Verify TypeScript and ESLint pass cleanly**

Run: `pnpm --filter client typecheck && pnpm --filter client lint`
Expected: Exit code 0 with zero TypeScript or ESLint errors.

- [ ] **Step 4: Commit**

```bash
git add client/package.json pnpm-lock.yaml client/components/ui/liquid-glass-expandable-sidebar.tsx
git commit -m "feat(client): add LiquidGlassExpandableSidebar ui component"
```

---

### Task 3: Deduplicate `AccessContextProvider` & Simplify `OrganizationShell`

**Files:**
- Modify: `client/components/authorization/access-context-provider.tsx`
- Modify: `client/components/authorization/organization-shell.tsx`
- Modify: `client/app/(protected)/app/organizations/[organizationId]/layout.tsx`

**Interfaces:**
- Produces (from `client/components/authorization/access-context-provider.tsx`):
  - `useOptionalAccessContext(): AccessContextState | null`
  - `AccessContextProvider` (reuses an existing ancestor `AccessContext` when `ancestor.organizationId === organizationId`; otherwise fetches and isolates state for `organizationId`)

- [ ] **Step 1: Update `client/components/authorization/access-context-provider.tsx`**

Export `useOptionalAccessContext()` returning `useContext(AccessContext)`. In `AccessContextProvider`, read `const parentContext = useContext(AccessContext);` and if `parentContext && parentContext.organizationId === organizationId`, render `<>{children}</>` directly (zero duplicate `/access-context` fetches; preserves cross-tenant isolation when `organizationId` changes). Split the provider implementation into an inner `AccessContextProviderImpl` component so React hooks are never called conditionally.

- [ ] **Step 2: Simplify `client/components/authorization/organization-shell.tsx` and `[organizationId]/layout.tsx`**

Remove the duplicate horizontal `<nav aria-label="Organization sections">` bar and top `RoleBadge` row from `OrgSubShell` (both move to the unified shell in Task 4). Keep `AccessContextProvider`, the `!loading && (errorStatus === 404 || !accessContext)` `PermissionDeniedState` guard, and the clean `<div className="mx-auto max-w-5xl space-y-6">{children}</div>` container. Update the `<Suspense>` fallback in `client/app/(protected)/app/organizations/[organizationId]/layout.tsx` to match the simplified container without the removed nav bar skeleton.

- [ ] **Step 3: Verify typecheck and lint**

Run: `pnpm --filter client typecheck && pnpm --filter client lint`
Expected: Exit code 0.

- [ ] **Step 4: Commit**

```bash
git add client/components/authorization/access-context-provider.tsx client/components/authorization/organization-shell.tsx client/app/(protected)/app/organizations/[organizationId]/layout.tsx
git commit -m "refactor(client): share access context and drop duplicate org sub-nav"
```

---

### Task 4: Build Unified `ProtectedAppShell` & Wire Protected Layout

**Files:**
- Create: `client/components/shell/protected-app-shell.tsx`
- Modify: `client/app/(protected)/layout.tsx`
- Remove: `client/components/auth/protected-header.tsx` (confirm zero remaining imports first)

**Interfaces:**
- Consumes:
  - `LiquidGlassExpandableSidebar`, `GlassNavGroup`, `GlassNavItem` from `@/components/ui/liquid-glass-expandable-sidebar`
  - `AccessContextProvider`, `useOptionalAccessContext` from `@/components/authorization/access-context-provider`
  - `OrganizationSwitcher` from `@/components/authorization/organization-switcher`
  - `RoleBadge` from `@/components/authorization/role-badge`
  - `extractActiveOrgId`, `resolveActiveSidebarId`, `buildShellNavGroups`, `getUserInitials` from `@/lib/navigation/shell-nav.mjs`
  - `apiRequest`, `broadcastSessionInvalidated` from `@/lib/auth/client`
- Produces:
  - `ProtectedAppShell({ user, children }: { user: SafeUserProfile; children: React.ReactNode })`

- [ ] **Step 1: Create `client/components/shell/protected-app-shell.tsx`**

Implement `ProtectedAppShell` with:
- Skip-to-main-content link targeting `#protected-main`.
- `activeOrgId` extracted from `usePathname()` via `extractActiveOrgId`. When `activeOrgId` is present, wrap the inner shell in `<AccessContextProvider organizationId={activeOrgId}>` so the sidebar and org pages share one context.
- Fetch accessible organizations list (or read active org name cleanly via `listAccessibleOrganizations`) to populate the sidebar's `brandDetail` and Organization group header label.
- Render `LiquidGlassExpandableSidebar` in:
  - Desktop sticky `<aside className="hidden lg:block lg:shrink-0 lg:sticky lg:top-0 lg:h-svh lg:p-3">` with `brand="GridAware"`, `brandDetail={activeOrgName ?? "Monitoring workspace"}`, Node G `<Image src="/brand/gridaware-symbol-small-dark.svg" alt="" width={22} height={22} />` as `brandIcon`, `groups` mapped to `lucide-react` icons (`LayoutDashboard`, `Compass`, `Building2`, `MapPin`, `Users`, `Shield`, `Settings`), `activeId={resolveActiveSidebarId(pathname, activeOrgId)}`, `account={{ id: "profile", name: user.displayName, detail: user.email, initials: getUserInitials(user.displayName), href: "/app/profile" }}`, `onNavigate` calling `event.preventDefault(); router.push(item.href); setMobileOpen(false);`, and restrained EVARAX glass `{ blur: 6, opacity: 0.14, saturation: 1.2, edge: 0.55, distortion: 14 }` with `style={{ "--gn-sidebar-inset": "24px" } as CSSProperties}`.
  - Mobile `< lg` slide-over drawer (`role="dialog" aria-modal="true" aria-label="Navigation menu"`) with dark scrim backdrop, Escape key handler, auto-close on navigation or route change, and `expanded={true}` on the sidebar inside the drawer.
- Slim 56px sticky top bar (`h-14 border-b border-[var(--border-subtle)] bg-[var(--surface-1)]/90 backdrop-blur-md px-4 sm:px-6`):
  - Left: mobile menu button (`lg:hidden`, `min-h-[44px] min-w-[44px]`), `OrganizationSwitcher`, and when inside an org with loaded `accessContext`, `RoleBadge` (`showReadOnlyHint`) + subtle `VIEWER` read-only indicator (`hidden md:inline-flex`).
  - Right: compact Account/Sign-out dropdown (`DropdownMenu`) with user identity header, `Profile & active sessions` (`/app/profile`), `Onboarding status` (`/onboarding`), and `Sign out` calling `/auth/logout` + `broadcastSessionInvalidated("signed-out")`.
- `<main id="protected-main" tabIndex={-1} className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 focus:outline-none sm:px-8 sm:py-8">{children}</main>`.

- [ ] **Step 2: Wire `ProtectedAppShell` in `client/app/(protected)/layout.tsx` and remove unused `protected-header.tsx`**

Update `client/app/(protected)/layout.tsx` so `ProtectedShellGate` resolves `getServerCurrentUser()`, redirects unauthenticated users to `/login?reason=session-expired`, and renders `<ProtectedAppShell user={user}>{children}</ProtectedAppShell>`, with a clean shell `<Suspense>` fallback matching the sidebar + slim 56px top bar geometry. Verify no files import `protected-header.tsx`, then delete `client/components/auth/protected-header.tsx`.

- [ ] **Step 3: Run full client verification suite**

Run: `pnpm --filter client test && pnpm --filter client typecheck && pnpm --filter client lint && pnpm --filter client build`
Expected: All tests pass, 0 TypeScript errors, 0 ESLint errors, production `next build` exits 0.

- [ ] **Step 4: Commit**

```bash
git add client/components/shell/protected-app-shell.tsx client/app/(protected)/layout.tsx client/components/auth/protected-header.tsx
git commit -m "feat(client): replace split header with unified liquid glass sidebar shell"
```

---

### Task 5: Live Visual & Interactive Verification

**Files:**
- Verify rendered pages in browser / build output (no code changes unless defects are found).

- [ ] **Step 1: Verify rendered output across desktop and mobile viewports**

Start the Next.js client dev server (`pnpm --filter client dev`) or verify live routes, check desktop expanded sidebar, desktop collapsed icon rail + hover tooltips, search filtering + clear button, active selection light movement, slim top bar alignment, and mobile drawer open/close/Escape behavior. Fix any layout, overflow, contrast, or focus defect found in a single clean batch and re-verify `test`, `typecheck`, `lint`, and `build`.
