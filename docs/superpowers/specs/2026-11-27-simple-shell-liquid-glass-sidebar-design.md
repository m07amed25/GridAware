# Simple Authenticated Shell with Liquid Glass Expandable Sidebar

**Date:** 2026-11-27
**Scope:** Small change — replace GridAware's split two-bar authenticated navigation with a simple, unified sidebar-first shell built around `LiquidGlassExpandableSidebar`.

## Intent & Why

Currently, authenticated navigation is split across two horizontal bars: a 64px top header (`ProtectedHeader`) and an inline organization sub-nav (`OrganizationShell`). Consolidating navigation into a single expandable liquid-glass sidebar paired with a slim top context strip removes duplicate chrome, improves scanability for Operate-mode workflows, and integrates the requested `LiquidGlassExpandableSidebar` cleanly into the EVARAX dark design system.

## Approaches Considered

1. **Sidebar-first + slim top strip (Chosen):** Move brand mark and all workspace/organization navigation into `LiquidGlassExpandableSidebar`. Remove the duplicate horizontal nav bar from `OrganizationShell`. Keep a quiet 56px top strip with only the mobile drawer toggle, `OrganizationSwitcher`, active organization `RoleBadge` (when inside an org), and quick Account/Sign-out trigger.
   - *Trade-off:* Preserves always-visible tenant context (`DESIGN.md` §10.2) and one-click sign-out while eliminating double navigation.
2. **Pure sidebar-only (no desktop top bar):** Place org switching and sign-out inside the sidebar with a top bar on mobile only.
   - *Trade-off:* Minimizes chrome further, but collapsing the sidebar hides active tenant context and makes org switching slower.
3. **Keep existing full top header + add sidebar:** Trim duplicate links from `ProtectedHeader` and bolt on a sidebar.
   - *Trade-off:* Leaves heavier chrome than requested.

## Goals, Non-Goals & Anti-Goals

- **Goals:**
  - Add `LiquidGlassExpandableSidebar` at `client/components/ui/liquid-glass-expandable-sidebar.tsx` and install `gsap` and `@gsap/react` in `client/`.
  - Wire Next.js App Router navigation (`router.push` on plain click), live `activeId` derived from `usePathname()`, search filtering, GSAP Flip expand/collapse, active selection light, and reduced-motion support.
  - Inherit EVARAX dark semantic tokens from `client/app/globals.css` (`#080808` canvas, `#101010` surface-1, `#F4E952` Soft Yellow accent, `#F6FA45` Neon Lime focus ring) and use the Node G mark (`client/public/brand/gridaware-symbol-small-dark.svg`).
  - Share organization `AccessContextProvider` state cleanly so the sidebar renders permission-filtered organization links without duplicate `/access-context` requests or cross-tenant state bleed.
  - Support responsive mobile navigation via a slide-over drawer containing the same sidebar component (auto-closing on navigation and Escape).
- **Non-Goals:**
  - Inventing placeholder links for unbuilt P1/P2 routes (Alerts, Incidents, Telemetry Explorer, Simulator, etc.); link only to real implemented routes.
  - Modifying backend APIs, auth flows, or RBAC enforcement.
  - Changing `DESIGN.md` tokens or palette.
- **Anti-Goals:**
  - Duplicate navigation bars across top header and org sub-shell.
  - Raw hex colors overriding EVARAX tokens.
  - Cross-tenant nav flicker when switching organizations.
  - React 19 hydration mismatches from `window.matchMedia` during initial render.

## Architecture & Shell Layout

```text
Desktop (>= lg):
┌──────────────────────┬───────────────────────────────────────────────────┐
│  [G] GridAware   [←] │  [Org Switcher ▾]  [RoleBadge]       [Avatar ▾]   │  56px slim strip
│  [⌕ Find a page    ] ├───────────────────────────────────────────────────┤
│                      │                                                   │
│  WORKSPACE           │                                                   │
│  • Overview          │                Main Content                       │
│  • Onboarding        │             (max-w-[1600px])                      │
│                      │                                                   │
│  ORGANIZATION*       │      (*shown when inside /app/organizations/[id], │
│  • Org Overview      │       filtered via getVisibleOrgNavItems)         │
│  • Sites & Buildings │                                                   │
│  • Members & Roles   │                                                   │
│  • Permissions       │                                                   │
│  • Settings          │                                                   │
│                      │                                                   │
│  ──────────────────  │                                                   │
│  [SM] User Name    › │                                                   │
└──────────────────────┴───────────────────────────────────────────────────┘

Mobile (< lg):
┌───────────────────────────────────────────────────┐
│  [≡]  [Org Switcher ▾]                [Avatar ▾]  │  56px slim strip
├───────────────────────────────────────────────────┤
│                  Main Content                     │
└───────────────────────────────────────────────────┘
  ([≡] opens slide-over drawer with LiquidGlassExpandableSidebar)
```

## Key Decisions & Builder Calls

- **Component path:** `client/components/ui/liquid-glass-expandable-sidebar.tsx` (matches `client/components.json` alias `@/components/ui`). Keeps all exported types and props compatible with the provided component.
- **Hydration safety (builder call):** Initialize `useNavigationReducedMotion` to `false` on SSR and sync `window.matchMedia("(prefers-reduced-motion: reduce)")` inside `useEffect` so React 19 hydration never mismatches.
- **Shared access context (builder call):** `ProtectedAppShell` extracts `activeOrgId` from `usePathname()` and wraps children in `AccessContextProvider` when inside an organization route. `OrganizationShell` detects an already-matching ancestor `AccessContextProvider` (avoiding double fetches) and renders only the 404/not-found guard + content container without the old horizontal nav strip.
- **Visual restraint (Operate mode):** Omit `theme` on `LiquidGlassExpandableSidebar` so `.gn-scope` inherits GridAware's dark tokens (`--color-card`, `--color-foreground`, `--color-primary`, `--color-ring`, `--color-border`). Use tuned subtle glass defaults (`blur: 6`, `opacity: 0.14`, `edge: 0.55`, `distortion: 14`) so readability meets WCAG AA on `#080808` canvas without distracting glare.
- **Verification:** `pnpm --filter client typecheck`, `pnpm --filter client lint`, `pnpm --filter client test`, `pnpm --filter client build`, plus live browser/visual check across desktop (expanded, collapsed, search filter) and mobile drawer viewports.
