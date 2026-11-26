# GridAware — UI Component Catalog

**Document version:** 1.0  
**Status:** Proposed component inventory for Figma and frontend implementation  
**Design foundation:** EVARAX / dark-first  
**Related documents:** `design-system.md`, `brand-color-foundation.md`, `interaction-specifications.md`, `accessibility-specification.md`, `responsive-design-guidelines.md`

---

## 1. Purpose

This catalog defines the reusable UI component families required by GridAware. It is a component inventory and behavior contract, not a claim that the components have already been implemented. Each component should be represented in Figma with variants, states, responsive behavior, and accessibility notes before production development.

## 2. Component principles

- Components should represent reusable product patterns, not one-off page decoration.
- Component names should describe purpose and behavior.
- Variants should be limited to meaningful semantic differences.
- States must be explicit: default, hover, focus, pressed, selected, disabled, loading, error, empty, and unavailable where applicable.
- Operational status and component interaction state must not share one ambiguous color mapping.
- Components should use design tokens rather than direct color values.

## 3. Global shell components

| Component              | Purpose                                         | Key variants/states                            |
| ---------------------- | ----------------------------------------------- | ---------------------------------------------- |
| `AppShell`             | Global app frame                                | Desktop, tablet, mobile                        |
| `Sidebar`              | Primary navigation                              | Expanded, collapsed, overlay, active item      |
| `SidebarGroup`         | Navigation grouping                             | Expanded/collapsed                             |
| `TopBar`               | Global controls                                 | Default, compact                               |
| `Breadcrumbs`          | Hierarchical location                           | Full, collapsed                                |
| `OrganizationSwitcher` | Change tenant context                           | Closed, open, searching, no access             |
| `SiteSelector`         | Scope pages to a site                           | Selected, empty, loading, unauthorized         |
| `GlobalSearch`         | Search assets/incidents/sites                   | Idle, typing, results, no results, error       |
| `UserMenu`             | Profile and session actions                     | Open, closed                                   |
| `NotificationBell`     | Unread notification entry                       | Empty, unread count, muted (if supported)      |
| `PageHeader`           | Title, description, actions                     | With/without breadcrumbs, one/multiple actions |
| `ContextBanner`        | Demo, stale, permission, or maintenance context | Info, warning, critical (semantic)             |

## 4. Navigation and feedback components

| Component       | Purpose                        | Required behavior                                     |
| --------------- | ------------------------------ | ----------------------------------------------------- |
| `NavItem`       | Navigation destination         | Active/current semantics; keyboard support            |
| `Tabs`          | Switch local content           | Selected state and keyboard navigation                |
| `Pagination`    | Navigate result pages          | Disabled edges and current page                       |
| `Stepper`       | Multi-step setup               | Current/completed/error states                        |
| `Toast`         | Temporary feedback             | Success/info/warning/error; dismissible; non-blocking |
| `InlineAlert`   | Persistent contextual feedback | Title, description, action, severity                  |
| `ConfirmDialog` | Confirm impactful action       | Explicit consequence and safe cancel                  |
| `Drawer`        | Contextual side panel          | Focus management and responsive behavior              |
| `Popover`       | Small contextual content       | Keyboard behavior and dismissal                       |
| `Tooltip`       | Short nonessential hint        | Never the only source of critical information         |

## 5. Data display components

| Component            | Purpose                       | Variants                                                           |
| -------------------- | ----------------------------- | ------------------------------------------------------------------ |
| `MetricCard`         | KPI summary                   | Neutral, positive, warning, critical, unavailable                  |
| `StatusBadge`        | Named status                  | Operational, warning, critical, offline, stale, unknown, simulated |
| `SeverityBadge`      | Alert/incident severity       | Info, low, warning, high, critical                                 |
| `FreshnessIndicator` | Data recency                  | Live, delayed, stale, unavailable                                  |
| `DataQualityBadge`   | Measurement quality           | Valid, partial, invalid, estimated, unknown                        |
| `AssetIdentity`      | Asset title/type/id           | Compact, full, with site context                                   |
| `AssetHealthSummary` | Health/risk overview          | Known, unknown, insufficient data                                  |
| `SensorMetricRow`    | Current metric reading        | Normal, threshold warning, missing, stale                          |
| `TrendIndicator`     | Change over comparison period | Up, down, stable, unknown; direction semantics configurable        |
| `ActivityTimeline`   | Chronological actions/events  | Compact, full, grouped                                             |
| `EmptyState`         | No data or no results         | First-use, filter-empty, unavailable                               |
| `Skeleton`           | Loading placeholder           | Card, table row, chart, page section                               |
| `DataTable`          | Structured lists              | Sortable, selectable, loading, empty, error                        |
| `FilterBar`          | Search and filtering          | Compact, expanded, drawer                                          |
| `DateRangePicker`    | Select time range             | Presets, custom, timezone context                                  |

## 6. Chart components

| Component           | Purpose                          | Required states                                       |
| ------------------- | -------------------------------- | ----------------------------------------------------- |
| `TimeSeriesChart`   | Metric over time                 | Live, historical, stale, partial, empty, error        |
| `ThresholdOverlay`  | Warning/critical threshold lines | Configured, missing, hidden                           |
| `AnomalyMarker`     | Mark detection point/window      | Selected, grouped, unavailable details                |
| `ForecastOverlay`   | Show predicted horizon           | Preview, active, unavailable; distinguish from actual |
| `ChartLegend`       | Series selection                 | Visible/hidden series                                 |
| `ChartToolbar`      | Range, aggregation, export       | Enabled/disabled/loading                              |
| `ChartDataTable`    | Accessible equivalent            | Paginated/expanded                                    |
| `RiskRankingChart`  | Compare risk by asset            | Ranked, tie, insufficient data                        |
| `DistributionChart` | Health/severity distribution     | Empty/partial and text legend                         |

Charts must follow `data-visualization-guidelines.md` and provide accessible summaries.

## 7. Infrastructure components

| Component                | Purpose                 | States                                           |
| ------------------------ | ----------------------- | ------------------------------------------------ |
| `SiteTree`               | Site/building hierarchy | Expanded, collapsed, loading, empty              |
| `AssetCard`              | Asset summary           | Operational, warning, critical, offline, unknown |
| `AssetTableRow`          | Asset list entry        | Selected, hovered, stale, unauthorized           |
| `SensorCard`             | Sensor details          | Connected, disconnected, stale, invalid          |
| `SensorMetricSelector`   | Choose metric           | Selected, disabled, missing data                 |
| `DeviceConnectionStatus` | Device connectivity     | Online, offline, reconnecting, unknown           |
| `AssetCriticalityLabel`  | Business importance     | Configurable levels and text labels              |

## 8. Operations components

| Component                 | Purpose                       | States                                                            |
| ------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `AlertCard`               | Alert summary                 | New, read, acknowledged, resolved, suppressed                     |
| `IncidentCard`            | Incident summary              | Detected, triaged, assigned, investigating, resolved, closed      |
| `IncidentSeverityPanel`   | Severity and response context | All severities                                                    |
| `AssignmentControl`       | Assign owner/team             | Unassigned, assigned, no eligible users, saving, error            |
| `IncidentTimeline`        | Investigation history         | Loading, empty, full                                              |
| `WorkOrderCard`           | Work summary                  | Draft, open, assigned, in progress, blocked, completed, cancelled |
| `WorkOrderChecklist`      | Technician tasks              | Not started, in progress, completed, blocked                      |
| `MaintenanceScheduleItem` | Scheduled service             | Upcoming, due, overdue, completed, cancelled                      |
| `CommentComposer`         | Add note                      | Empty, typing, saving, failed                                     |
| `AttachmentList`          | Evidence files                | Uploading, uploaded, failed, unavailable                          |

Lifecycle labels must use the approved product terms and remain distinct from severity labels.

## 9. Simulator components

| Component                | Purpose                      | States                                   |
| ------------------------ | ---------------------------- | ---------------------------------------- |
| `SimulationModeBanner`   | Persistent demo-data context | Active, paused, stopped, historical demo |
| `ScenarioSelector`       | Choose scenario              | Available, selected, unavailable         |
| `SimulationControlBar`   | Start/pause/resume/stop      | Idle, running, paused, stopping, failed  |
| `SimulationSpeedControl` | Adjust simulation rate       | Supported presets and current selection  |
| `FaultInjectionPanel`    | Configure test fault         | Available, scheduled, active, completed  |
| `SimulationRunSummary`   | Show run id and outcome      | In progress, completed, failed           |
| `SimulationEventLog`     | Show generated events        | Streaming, paused, empty, error          |

Simulator controls must never look like controls for real equipment. Use `SIMULATED` or `DEMO DATA` in the surrounding context.

## 10. Form components

- Text input.
- Number input with unit suffix.
- Select / searchable select.
- Multi-select.
- Checkbox.
- Radio group.
- Switch/toggle.
- Textarea.
- Date/time picker.
- File upload.
- Search input.
- Inline field hint/error.
- Form section and summary.

Every input needs label, help, error, disabled, read-only, and loading behavior as appropriate. Do not use placeholder text as the only label.

## 11. Design tokens and variants

All components should use:

- Color tokens from `design-system.md`.
- Typography tokens.
- Spacing and radius tokens.
- Focus-ring tokens.
- Elevation/border tokens.
- Motion tokens with reduced-motion fallback.

Do not hardcode the six source EVARAX colors inside component-specific styles. Use named tokens such as `color-brand-primary` and `status-critical`.

## 12. Component documentation template

Each Figma component page should record:

1. Component name and purpose.
2. Usage / non-usage guidance.
3. Anatomy and slot definitions.
4. Variants and properties.
5. Interaction states.
6. Responsive behavior.
7. Accessibility requirements.
8. Content guidance.
9. Related components.
10. Acceptance checklist.

## 13. Priority order

### Foundation (before high-fidelity screens)

`AppShell`, `Sidebar`, `TopBar`, `PageHeader`, `Button`, `Input`, `Select`, `StatusBadge`, `SeverityBadge`, `MetricCard`, `DataTable`, `Dialog`, `Toast`, `Tabs`, `EmptyState`, `Skeleton`.

### MVP operational patterns

`AssetCard`, `SiteTree`, `SensorMetricRow`, `TimeSeriesChart`, `AlertCard`, `IncidentTimeline`, `AssignmentControl`, `WorkOrderCard`, `SimulationControlBar`, `SimulationEventLog`.

### Later / extended analytics

`ForecastOverlay`, advanced comparison charts, configurable chart builder, advanced report widgets.

## 14. Acceptance criteria

- [ ] Every high-priority component has documented variants and states.
- [ ] Components reference semantic tokens.
- [ ] Interactive components define keyboard/focus behavior.
- [ ] Data components define loading, empty, stale, partial, and error states.
- [ ] Operational status and severity are not conflated.
- [ ] Simulator components remain visually distinct from real equipment controls.
- [ ] Figma components map to implementation-friendly names and properties.
