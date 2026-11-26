# GridAware — Wireframe Specifications

**Document version:** 1.0  
**Status:** Draft for low-fidelity wireframe production  
**Product baseline:** GridAware PRD v1.0  
**Related documents:** `information-architecture.md`, `sitemap.md`, `user-flows.md`, `screen-inventory.md`, `brand-color-foundation.md`  
**Brand:** EVARAX palette; low-fidelity wireframes should remain neutral except for annotations and semantic callouts

---

## 1. Purpose

This document translates the approved information architecture, sitemap, and user flows into practical layout instructions for low-fidelity wireframes. It defines screen regions, hierarchy, content order, component placement, responsive behavior, and state coverage.

Wireframes should validate task completion, information hierarchy, and layout density. They are not visual-polish deliverables. Do not spend time on final gradients, shadows, icon styling, or decorative treatments at this stage.

## 2. Wireframe Principles

1. **Task-first hierarchy:** The most important user question and action appear before secondary detail.
2. **Consistent shell:** Sidebar, top bar, breadcrumbs, and content structure behave consistently across authenticated routes.
3. **Contextual continuity:** Organization, site, asset, and record context stay visible as users move through workflows.
4. **Operational clarity:** Status, severity, timestamps, units, and data freshness are explicit.
5. **Progressive disclosure:** Advanced configuration and raw technical data are available without overwhelming first-time users.
6. **Responsive intent:** Wireframes show how content reflows; mobile is not simply a scaled desktop screenshot.
7. **Empty states are first-class:** The initial tenant has no sites/assets/telemetry, so first-run layouts are essential.
8. **Permission-aware actions:** Actions are shown only for roles that can perform them, or clearly marked as read-only where context is needed.

## 3. Reference Frames and Grid

### 3.1 Desktop reference

Use a 1440px-wide desktop frame as the primary wireframe baseline.

Proposed layout regions:

- Sidebar: 240–264px expanded.
- Main application top bar: 64–72px high.
- Main content horizontal padding: 28–32px.
- Main content vertical spacing: 24–32px between major sections.
- Content max width: allow wide operational tables/charts; avoid unnecessarily constraining dense monitoring screens.

The above dimensions are starting points, not final pixel-perfect constraints. Recheck with real content and the selected typography.

### 3.2 Compact desktop / laptop

Use a 1280px frame. Sidebar may collapse to an icon rail, and content padding may reduce to 20–24px. Dashboard cards may reflow from four columns to two. Tables should preserve primary columns and use horizontal scrolling only when necessary.

### 3.3 Tablet

Use 768–1024px frames. Replace the persistent expanded sidebar with a collapsible drawer or compact rail. Two-column card layouts are preferred. Detail pages may stack summary information above charts and activity.

### 3.4 Mobile

Use 375px and 430px frames. Use a drawer, compact top navigation, or bottom navigation only if usability testing supports it. Keep the active organization visible. Dense tables should become structured cards or focused list rows. Full-screen detail pages may be preferable for incidents and work orders.

### 3.5 Spacing grid

Use an 8px spacing rhythm as the default wireframe system:

- 4px: compact inline spacing.
- 8px: small component gap.
- 16px: standard internal spacing.
- 24px: card/section gap.
- 32px: major region gap.
- 40–48px: page-level separation where needed.

Use 4px only for fine alignment, not as a general spacing substitute.

## 4. Authenticated Application Shell

Every authenticated P0 desktop wireframe should show:

1. Left sidebar with primary navigation.
2. Top bar with active organization, notifications, and profile menu.
3. Breadcrumb/page-title region.
4. Page-level primary action aligned consistently.
5. Main content region.

### Sidebar hierarchy

- Dashboard
- Infrastructure
  - Sites
  - Assets
  - Sensors
- Monitoring
- Alerts
- Incidents
- Work Orders
- Maintenance
- Analytics
- Administration / Settings

The sidebar must reflect role permissions. The wireframe should annotate hidden, read-only, or unavailable controls for each role rather than duplicate the entire application per role.

### Top bar

- Active organization switcher.
- Optional site context where relevant.
- Notification entry point.
- User profile menu.
- Global search may be represented as P1 and should not displace core context.

## 5. Page Wireframe Specifications

## WF-01 — Dashboard

**User question:** What needs my attention now?

**Layout order:**

1. Page title and date/context.
2. Organization/site filter where relevant.
3. Summary metric row (assets, monitored assets, active alerts, open incidents, assigned work as applicable).
4. Asset status / monitoring coverage section.
5. Active alerts and incidents section.
6. Site/asset operational overview.
7. Recent activity.
8. Role-specific task panel.

**Card guidance:** Use 3–4 summary cards at wide desktop; 2 per row at compact widths; stack on mobile. Each card needs a label, value, optional trend/context, and click behavior. Avoid unexplained donut charts for a small number of assets.

**Important distinctions:**

- Total assets is not the same as monitored assets.
- No telemetry is not healthy.
- Simulator running is not the same as receiving fresh telemetry.
- A count must define whether it is current, time-windowed, or all-time.

**Empty state:** Welcome message, setup checklist, and a single primary action (Create first site). Do not show zero-valued charts that imply measured performance.

## WF-02 — Site List

**Layout order:**

1. Title, description, Add Site action.
2. Search field and relevant filters.
3. Site table/list.
4. Pagination if required.

**Suggested columns:** Site, code, location, assets, monitoring/data status, updated. On mobile show site name, location, asset count, and status in a card.

**Empty state:** Explain that sites group physical or operational locations; primary action is Add Site.

## WF-03 — Site Detail

**Layout order:**

1. Breadcrumb: Sites → Site Name.
2. Site header with name, location, and Edit action.
3. Summary strip: assets, devices receiving data, active alerts, open incidents.
4. Asset list for this site.
5. Active alerts/incidents.
6. Optional buildings/areas hierarchy.

Do not require a building to exist before an asset can be created. Show an empty buildings section only if the customer has chosen to use that hierarchy.

## WF-04 — Asset List

**Layout order:**

1. Title and Add Asset action.
2. Search and filters: site, type, connection/freshness, criticality.
3. Table or list.

**Suggested columns:** Asset, type, site/location, criticality, device status, data freshness, active alerts, updated. Avoid collapsing all statuses into one colored dot.

**Empty states:** No assets; no results for filters; assets exist but no telemetry has arrived.

## WF-05 — Asset Creation Wizard

A short 3-step wizard is preferred over one long form:

**Step 1: Identity**

- Asset name.
- Asset type (Generator in initial workflow).
- Asset code/identifier.
- Site and optional building/area.

**Step 2: Operational metadata**

- Manufacturer/model/serial (optional unless product requirements change).
- Criticality.
- Description and installation metadata.

**Step 3: Review**

- Show all entered values.
- Explain that sensor/device setup follows as a separate step.
- Save asset.

Provide back/continue controls, step progress, field-level validation, and safe exit with unsaved-change warning.

## WF-06 — Asset Detail

**Header:** Asset name, type, code, site breadcrumb, current data freshness, Edit action.

**Summary region:** Criticality, device status, latest telemetry received, open alert/incident count.

**Tabs:** Overview, Monitoring, Sensors & Devices, Alerts & History, Maintenance.

**Overview layout:** Current metric cards; recent alert/incident; asset metadata; recent activity; next action (configure sensors or open monitoring).

**No-telemetry state:** Show Awaiting First Telemetry with the simulator/device setup action. Do not show green Healthy state.

## WF-07 — Sensor & Device Configuration

**Layout:**

1. Asset context header.
2. Device card with simulated source label and state.
3. Sensor/metric table.
4. Add sensor action.
5. Configuration summary and simulator launch.

**Sensor row fields:** Sensor name, metric, unit, source/device, latest event, quality/freshness, configuration state.

**Configuration form:** Metric, unit, display name, optional expected range/rule link. Do not present undocumented manufacturer safe ranges as defaults.

## WF-08 — Simulator Control

**Layout:**

1. Persistent **SIMULATED DATA** banner.
2. Target asset/device.
3. Scenario selector with brief description.
4. Sampling interval or advanced controls if exposed.
5. Start/Pause/Resume/Stop controls.
6. Run state and last telemetry received.
7. Recent simulator events/log summary.

**State model:** Not configured → Ready → Starting → Running ↔ Paused → Stopping → Stopped; error/offline is a separate state.

This must look like a development/test data source, not a physical equipment control panel.

## WF-09 — Live Monitoring

**Layout order:**

1. Title + site/asset context.
2. Filters: site, asset, metric, time window.
3. Latest reading cards (value + unit + observed time + freshness).
4. Main trend chart.
5. Secondary metric charts or metric selector.
6. Event/alert annotations and asset list.

**Chart requirements:** Axes labels with units; readable time ticks; threshold annotation; anomaly marker; tooltip with exact timestamp/value/unit/quality/source; legend with accessible non-color differentiation.

On mobile, show a selected metric chart with a metric selector rather than compressing multiple charts into unreadable columns.

## WF-10 — Alert Inbox

**Layout order:**

1. Title and count summary.
2. Search and filters: status, severity, site, asset, alert type, time.
3. Alert table/list.
4. Pagination or progressive loading.

**Suggested columns:** Severity, alert title/type, asset, site, detected time, last occurrence, status, linked incident.

**Row action:** Open detail. Acknowledge may be a direct action only if the interaction can be made safe and clear; otherwise place it on detail.

## WF-11 — Alert Detail

**Layout:**

1. Severity/status header.
2. Summary: what was detected and when.
3. Affected asset/site.
4. Detection reason: threshold rule/observed value or model info if available.
5. Chart around event time.
6. Event history and data freshness.
7. Related incident panel.
8. Primary action: Acknowledge or Create/Open Incident according to state.

Do not show speculative root-cause claims. For threshold-based alerts, explain the configured rule and observed value.

## WF-12 — Incident List

**Layout:**

1. Title and open/critical counts.
2. Filters: status, priority/severity, assignee, site, date.
3. Incident table/list.

**Columns:** Incident ID/title, severity/priority, status, asset, site, assignee, created/updated, linked work orders.

Default sorting should promote unresolved high-priority cases while remaining predictable and explainable.

## WF-13 — Incident Detail

**Two-column desktop layout:**

- Main column: title/description, event timeline, investigation notes/comments, linked alerts, linked work orders, resolution summary.
- Side column: status, severity, asset/site, assignee, created date, allowed next actions.

On mobile, stack the summary card first, then event timeline and work content. Keep the primary status/action accessible without a wide two-column layout.

## WF-14 — Work Order List / My Work Orders

**Manager/Engineer view:** organization work-order table with filters, assignee, priority, due date, status, and asset.

**Technician view:** task-focused list with assigned work, due indicator, site/asset, priority, and status. Hide creation/admin actions not available to technicians.

**Mobile:** cards with title, priority, due date, asset, and next action.

## WF-15 — Work Order Detail

**Layout:**

1. Work-order title, status, priority.
2. Assignment/due information.
3. Task instructions.
4. Asset/site context.
5. Linked incident and relevant alert context.
6. Technician findings/performed actions form.
7. Activity/status timeline.
8. Review/close actions for authorized roles.

For technicians, the completion form must be easy to use on mobile and must preserve entered work if validation fails.

## WF-16 — Organization Members / Settings

**Layout:**

1. Settings navigation.
2. Organization profile section.
3. Members table with role and membership state.
4. Invite member form/modal.
5. Role/access summary.

Do not expose secret credentials or internal authorization implementation details. Keep removal/revocation behind explicit confirmation.

## WF-17 — Notifications

**Layout:**

- Unread/read sections or filter.
- Notification item with type, concise summary, timestamp, related record, read state.
- Bulk mark-as-read only if needed.

A notification should lead to a relevant record and never be the only place where a critical event exists.

## 6. Shared Component Wireframes

### Data table

- Clear column labels.
- Sortable headings visibly marked.
- Filters separated from row actions.
- Selection checkboxes only if bulk actions exist.
- Row click behavior must not conflict with action buttons.
- Loading skeleton must preserve approximate table geometry.
- Empty and filtered-empty states must be distinct.

### Metric card

- Metric name.
- Latest value.
- Unit.
- Observed time.
- Freshness/quality.
- Optional trend indicator with a defined comparison period.

### Status badge

- Text label plus optional icon/shape.
- Never color-only.
- Fixed semantic meaning across the application.
- Do not use EVARAX accent colors as the only operational severity indicator.

### Form

- Label above input.
- Required indicator and help text.
- Error message adjacent to field.
- Group fields by task, not database table.
- Keep primary submit action stable.
- Warn about unsaved changes when navigation would discard work.

### Chart

- Title and metric context.
- Unit and time range.
- Axis labels and grid.
- Legend when more than one series exists.
- Tooltip with exact value/time.
- Loading/empty/stale/error states.
- Text or table alternative for critical values where practical.

## 7. Required State Wireframes

At minimum, create wireframes for the following states:

| State                       | Applicable screens                | Required content                                                              |
| --------------------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| First-run empty             | Dashboard, Sites, Assets, Sensors | Explain next setup step and show one primary action                           |
| Configured but no telemetry | Asset, Monitoring, Sensors        | Awaiting first telemetry, last received = never, setup/troubleshooting action |
| Live telemetry              | Monitoring, Asset, Dashboard      | Values, units, timestamps, freshness                                          |
| Stale telemetry             | Monitoring, Asset, Dashboard      | Last received timestamp, stale label, reason/action if known                  |
| Simulator paused            | Simulator, Asset                  | Paused state and Resume for permitted user                                    |
| Simulator offline           | Simulator, Monitoring             | Service/connection failure and retry/troubleshooting                          |
| No results                  | Lists                             | Explain current filters and provide Clear filters                             |
| Permission denied           | Any protected route               | Safe explanation and return/request-access action                             |
| API/service error           | Data pages                        | Error message, retry, request/reference ID if available                       |
| Saving                      | Forms                             | Disabled duplicate submission and visible pending state                       |
| Success                     | Forms/workflows                   | Confirm saved result and next useful action                                   |

## 8. Low-Fidelity Visual Rules

- Use grayscale boxes and neutral labels.
- Use annotations for `Primary`, `Secondary`, `Optional`, `Role-gated`, `Live`, `Stale`, and `Simulated`.
- Do not polish the EVARAX palette during this phase; color direction is documented separately.
- Use realistic sample lengths in labels and table rows so text wrapping can be assessed.
- Include long asset names, long organization names, no assignee, missing dates, and unusually large values in layout stress tests.
- Do not use real customer data in design mockups.

## 9. Wireframe Handoff Checklist

- [ ] All P0 screens in `screen-inventory.md` have wireframes.
- [ ] Primary and alternate flows in `user-flows.md` are represented.
- [ ] Desktop and mobile behavior is documented for each P0 page.
- [ ] First-run, no-data, stale, offline, error, and permission states exist.
- [ ] Page content matches PRD scope.
- [ ] Every chart includes unit/time/freshness context.
- [ ] Every main action has a clear location and outcome.
- [ ] User role differences are annotated.
- [ ] No P2 feature is presented as an MVP commitment.
- [ ] Wireframes are reviewed before high-fidelity styling starts.

---

**Document owner:** UX Design  
**Review status:** Ready for low-fidelity wireframe drafting; pending product review.
