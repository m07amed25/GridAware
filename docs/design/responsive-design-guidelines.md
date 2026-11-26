# GridAware — Responsive Design Guidelines

**Document version:** 1.0  
**Status:** Proposed specification for design review  
**Product baseline:** GridAware PRD v1.0 / UX Design Documentation v1.1  
**Theme:** Dark-first, EVARAX brand system  
**Related documents:** `information-architecture.md`, `sitemap.md`, `screen-inventory.md`, `wireframe-specifications.md`, `design-system.md`, `accessibility-specification.md`

---

## 1. Purpose

This document defines how GridAware adapts across desktop, tablet, and mobile viewports. GridAware is an operational SaaS product with dense tables, charts, asset hierarchies, alerts, and maintenance workflows. Responsive design must preserve the meaning and usability of operational information; it must not simply shrink a desktop screen until everything becomes cramped.

The primary work environment is desktop. Tablet is a supported environment for facility managers and engineers moving between offices and facility areas. Mobile is designed for focused field tasks, quick status checks, notifications, and technician workflows. Mobile is not expected to reproduce every wide-screen analytics interaction.

## 2. Responsive principles

1. **Preserve task completion.** Users must be able to complete the core assigned tasks at every supported breakpoint, even when the layout changes.
2. **Prioritize operational information.** Asset identity, status, freshness, severity, and the next available action must remain visible.
3. **Transform, do not merely compress.** Wide data tables may become structured cards or prioritized row layouts on narrow screens.
4. **Keep actions reachable.** Primary actions must not disappear inside inaccessible hover-only menus.
5. **Avoid hidden meaning.** A collapsed chart, truncated metric, or summarized table must provide a way to inspect the full underlying value.
6. **Respect touch interaction.** Mobile actions need sufficient target size and spacing.
7. **Do not create horizontal page overflow.** Horizontal scrolling is allowed only inside clearly identified data regions where it is the least harmful option.

## 3. Viewport bands

These are design bands, not a claim that every device uses a particular physical size. Figma frames and CSS breakpoints should be aligned during implementation.

| Band            |       Width range | Primary use           | Layout behavior                                                               |
| --------------- | ----------------: | --------------------- | ----------------------------------------------------------------------------- |
| Small mobile    |        320–374 px | Compact phone         | Single-column, essential actions only, bottom sheets where appropriate        |
| Standard mobile |        375–767 px | Phone                 | Single-column pages, collapsible navigation, card-based data lists            |
| Tablet          |       768–1023 px | Tablet / small laptop | Two-column layouts selectively, collapsible sidebar, simplified charts        |
| Desktop         |      1024–1439 px | Standard work screen  | Full sidebar, data-rich layouts, multi-column panels                          |
| Wide desktop    | 1440 px and above | Large monitors        | Wider content canvas with max-width constraints; avoid excessive line lengths |

Recommended initial CSS breakpoint tokens (to be validated against real screens):

```css
:root {
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
}
```

Do not design only against breakpoint labels. Inspect actual component behavior at intermediate widths such as 820 px, 1100 px, and 1366 px.

## 4. Global application shell behavior

### Desktop

- Expanded sidebar is the default at comfortable desktop widths.
- Sidebar supports a collapsed icon-only state.
- Top bar contains current organization/site context, global search, notifications, help, and user menu according to permissions.
- Breadcrumbs appear below or within the page header.
- Main content uses a responsive grid and a readable maximum width.
- Utility drawers may open from the right for filters, activity, or contextual details.

### Tablet

- Sidebar is collapsed by default or opens as an overlay drawer, depending on the final navigation density.
- The current organization and site must remain visible in the top bar.
- Two-column metric cards may reduce to two columns; charts may stack when legends or axes become cramped.
- Filters should move into a filter drawer or compact toolbar.
- Page actions remain visible in the page header or a clearly labeled action menu.

### Mobile

- Navigation becomes a drawer or compact navigation pattern; the final choice must be validated with the number of primary destinations.
- The top bar should expose page title/context and high-priority global controls without crowding.
- Breadcrumbs may collapse to the current page plus a back/parent affordance.
- Sticky bottom actions may be used for a single primary task, but must not cover content or keyboard focus.
- Avoid placing multiple competing primary actions in a narrow header.

## 5. Page-specific responsive rules

### Dashboard

| Element             | Desktop                                   | Tablet                    | Mobile                                               |
| ------------------- | ----------------------------------------- | ------------------------- | ---------------------------------------------------- |
| KPI cards           | 4–5 columns depending on width            | 2 columns                 | 1–2 columns                                          |
| Health distribution | Donut / stacked visualization with legend | Chart with compact legend | Summary values and compact chart; full detail on tap |
| Site comparison     | Multi-column chart/table                  | Stacked comparison        | Ranked summary list                                  |
| Recent incidents    | Table                                     | Compact table or cards    | Cards with severity, title, asset, age, action       |
| High-risk assets    | Side panel or table                       | Stacked panel             | Prioritized list                                     |

### Asset list

- Desktop: sortable data table with configurable columns.
- Tablet: reduce low-priority columns; keep asset name, status, site, risk, freshness.
- Mobile: use asset cards. The card must show asset name, asset type, operational status, site, most important risk indicator, and a details action.
- Bulk actions may be disabled on mobile when selection would create an unsafe or confusing interaction.

### Asset detail

- Desktop: summary header, KPI strip, telemetry charts, incidents, work orders, and maintenance history in a multi-section layout.
- Tablet: stack summary and charts; allow section tabs or anchors.
- Mobile: prioritize asset identity/status, current readings, latest alert, and quick actions. Historical charts may become single-series tabs or vertically stacked panels.

### Live monitoring

- Desktop: multiple synchronized charts may be shown together.
- Tablet: chart panels stack; date range and metric selection remain accessible.
- Mobile: show one metric at a time with a metric selector. Always show unit, last update time, data freshness, and threshold context. Avoid tiny multi-axis charts.
- Live updates should not continuously shift the page or steal focus.

### Incident details

- Desktop: incident summary, timeline, assignment, related telemetry, and work-order panel can appear side by side.
- Tablet: use a primary details column and collapsible supporting panels.
- Mobile: present severity, status, asset, assigned person, due/age information, and primary action first. Timeline and supporting evidence follow.

### Work orders

- Desktop: table and side detail panel.
- Tablet: table with fewer columns or cards.
- Mobile: task-oriented card with status, asset, assignee, due date, and prominent next action. Technician forms must be easy to complete with touch input.

### Simulator console

- Desktop: scenario selector, controls, run status, generated stream preview, and event log.
- Tablet: controls and current state remain above the event log; stream details can collapse.
- Mobile: support scenario selection, start/pause/stop, and run status. Advanced parameter tuning may be restricted to desktop/tablet if the controls cannot be safely used on mobile.

## 6. Tables and dense data

- Never reduce type below readable sizes just to fit more columns.
- Define essential columns per table; secondary columns may be hidden behind row details.
- Provide a clear indication when columns are hidden or data is summarized.
- Preserve sort and filter state when the layout changes.
- On mobile, cards must preserve meaningful sorting and filtering controls.
- If a wide table requires horizontal scrolling, provide a visual cue and keep the primary identifier column visible when feasible.

## 7. Charts and data visualization

- Never compress axes until labels overlap.
- Prefer fewer visible series and a metric selector on mobile.
- Keep threshold lines, anomaly markers, and units visible at all widths.
- Provide a text summary or accessible data table equivalent for essential chart information.
- Time range controls must remain easy to reach.
- Do not animate chart updates in a way that causes repeated layout movement.

See `data-visualization-guidelines.md` for detailed chart contracts.

## 8. Touch and pointer interaction

- Target at least 44 × 44 CSS px for important touch controls as a design target; WCAG 2.2 AA includes a 24 × 24 CSS px minimum target-size criterion with defined exceptions, but GridAware should aim larger for frequent field tasks.
- Do not require hover to discover critical actions.
- Provide visible focus indicators for keyboard use.
- Avoid placing destructive and primary actions immediately adjacent without spacing or confirmation.
- Ensure drawers, dialogs, and popovers fit the viewport and do not trap content behind browser UI.

## 9. Responsive behavior for empty/error/loading states

- Skeletons must follow the responsive geometry of the final component.
- Empty states must not consume an entire narrow screen with decorative illustration.
- Error banners must wrap and keep the retry action visible.
- Offline and stale-data indicators must be visible without requiring hover.
- Toasts must not cover primary mobile actions or the bottom navigation area.

## 10. Testing matrix

At minimum, review these viewport widths:

| Width | Representative class           | Required review                                   |
| ----: | ------------------------------ | ------------------------------------------------- |
|   320 | Small mobile                   | No horizontal page overflow; core status readable |
|   375 | Standard mobile                | Navigation, cards, forms, buttons                 |
|   430 | Large mobile                   | Charts and incident actions                       |
|   768 | Tablet portrait                | Drawer and chart stacking                         |
|  1024 | Small desktop/tablet landscape | Sidebar transition and table layout               |
|  1280 | Desktop                        | Main dashboard and detailed screens               |
|  1440 | Desktop                        | Information density and max-width                 |
|  1920 | Wide desktop                   | No excessively stretched content                  |

Also test browser zoom at 200%, long organization/site/asset names, translated or long status strings, and keyboard-only navigation.

## 11. Acceptance criteria

- [ ] No horizontal overflow at supported viewport widths, except intentionally scrollable data regions.
- [ ] The global navigation remains operable at every breakpoint.
- [ ] Users can complete core MVP workflows on supported devices.
- [ ] Asset identity, severity, status, and freshness remain visible.
- [ ] Mobile layouts do not depend on hover.
- [ ] Tables transform into readable mobile patterns.
- [ ] Charts preserve threshold and anomaly meaning.
- [ ] Dialogs, drawers, and sticky controls do not obscure content or focus.
- [ ] Empty, loading, offline, stale, and error states are designed responsively.

## 12. Open decisions

- Final sidebar behavior at tablet widths.
- Whether mobile uses a bottom navigation bar or a navigation drawer.
- Whether advanced simulator configuration is supported on mobile.
- Whether asset table column customization is part of MVP or a later release.

These decisions must be settled in Figma and recorded in `design-acceptance-criteria.md` before front-end implementation.
