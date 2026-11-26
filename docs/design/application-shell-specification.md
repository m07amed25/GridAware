# GridAware — Global Application Shell Specification

**Document version:** 1.0  
**Status:** Proposed UX specification  
**Scope:** Authenticated SaaS shell, organization/site context, global navigation, page framing  
**Related documents:** `information-architecture.md`, `sitemap.md`, `responsive-design-guidelines.md`, `component-catalog.md`, `accessibility-specification.md`

---

## 1. Purpose

The application shell is the persistent frame around authenticated GridAware pages. It provides navigation, current tenant/site context, global search, notifications, help, user actions, and consistent page structure. Because GridAware is multi-tenant SaaS, context switching and visible organization scope are critical safeguards against users misinterpreting which site's information they are viewing.

## 2. Shell regions

### Primary navigation sidebar

Contains product identity and primary destinations:

- Dashboard
- Infrastructure
- Monitoring
- Intelligence
- Alerts & Incidents
- Maintenance
- Analytics
- Administration (permission-dependent)
- Simulator (environment/permission-dependent)

Navigation groups must reflect the approved IA. Hide or disable destinations based on a consistent authorization strategy. Do not show routes the user can never access unless there is a clear upgrade/permission explanation.

### Top bar

Contains:

- Sidebar toggle (desktop/tablet).
- Organization switcher.
- Site context selector where relevant.
- Global search.
- Notification center entry and unread count.
- Help/documentation entry.
- User avatar/menu.

The top bar must not become overloaded. At narrow widths, lower-priority actions move into an overflow menu.

### Page header

Contains:

- Breadcrumbs.
- Page title.
- Optional description/context.
- Primary action(s).
- Optional page-level filter controls.

Page header structure must remain consistent across list/detail/dashboard screens.

### Main content

- Uses consistent horizontal gutters.
- Supports wide data tables and charts without stretching text content excessively.
- Has a predictable heading hierarchy.
- Provides local loading/error/empty regions rather than replacing the entire application shell.

## 3. Organization and site context

The active organization must be visible and stable across navigation. Where a page is scoped to a site, the active site must also be visible.

Switching organization:

1. User opens organization switcher.
2. Search/select authorized organization.
3. If there are unsaved edits, show a warning and preserve/discard behavior according to the page workflow.
4. Update current organization context only after selection is confirmed.
5. Refresh visible data and navigation permissions.
6. Reset filters that are invalid for the new organization.
7. Show a contextual confirmation if necessary.

Switching site follows the same pattern but should preserve the organization scope.

Never rely on a hidden organization selector state alone; API authorization remains authoritative.

## 4. Global search

Search should support a defined MVP scope such as assets, sites, incidents, and work orders. Results must be permission-filtered and grouped by entity type. Each result displays a clear entity label and site/asset context. No-results and service-error states must be distinct.

Global search must not leak the existence or metadata of resources the user cannot access.

## 5. Navigation behavior

- Active route is visibly highlighted and programmatically identified.
- Navigation items have clear labels; icons are supplemental.
- Collapsed sidebar uses tooltips/accessible names.
- Current page context remains understandable when breadcrumbs are collapsed.
- Browser back/forward behavior should work predictably.
- Navigation preserves or resets local filters according to documented page behavior.

## 6. Context and global banners

Reserve banners for high-value context:

- `SIMULATED DATA` in simulator/demo contexts.
- `STALE DATA` or degraded service where relevant.
- Organization/site context warnings.
- Permission or session warnings.

Do not stack multiple banners without priority rules. A banner must be dismissible only when dismissal does not hide required operational information.

## 7. Session and profile menu

The user menu may contain:

- Profile.
- Personal preferences.
- Notification preferences.
- Keyboard shortcuts/help.
- Sign out.

Organization administration and personal preferences must remain separate. Session-expiry handling should preserve safe recoverability and explain why a user is being asked to sign in again.

## 8. Responsive shell

- Desktop: expanded/collapsed sidebar and full top bar.
- Tablet: collapsed/overlay navigation and compact top bar.
- Mobile: drawer or approved compact navigation pattern; current organization/site context remains discoverable.
- Sticky elements must not cover focus targets, forms, or chart controls.

See `responsive-design-guidelines.md` for breakpoint behavior.

## 9. Accessibility

- Use landmarks and semantic navigation.
- Provide skip-to-main-content link.
- Ensure sidebar and menus are keyboard navigable.
- Announce route changes appropriately in the application framework.
- Keep focus predictable after navigation and drawer close.
- Provide accessible names for icon-only controls.
- Ensure selected navigation state is not color-only.

## 10. Acceptance criteria

- [ ] Organization context is visible and switching is predictable.
- [ ] Site context is visible where relevant.
- [ ] Navigation respects permissions.
- [ ] Active route is identifiable without color alone.
- [ ] Global search is authorization-filtered.
- [ ] Shell remains usable across supported breakpoints.
- [ ] Focus and keyboard behavior are specified.
- [ ] Simulator/demo context is persistent and unmistakable.
- [ ] Page content changes do not unnecessarily destroy the shell state.
