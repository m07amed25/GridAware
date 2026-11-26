# GridAware — Information Architecture (IA)

**Document version:** 1.0  
**Status:** Draft for review  
**Product baseline:** GridAware Product Discovery & PRD v1.0  
**Design phase:** UX/UI — Step 1: Information Architecture  
**Target product:** Multi-tenant B2B SaaS for factories and commercial buildings  
**Initial data mode:** Simulator only  
**Initial end-to-end asset:** Generator  
**Brand direction:** EVARAX palette supplied by the product owner

---

## 1. Purpose

This document defines how GridAware information is grouped, named, prioritized, and exposed through the application interface. It is the structural foundation for the sitemap, screen inventory, user flows, wireframes, and navigation design.

The objective is not to describe visual styling in detail. The objective is to make sure each user can answer the questions relevant to their job and reach the next action without having to understand the internal database or engineering architecture.

This IA is based on the approved product decisions:

- GridAware is a B2B SaaS product with multiple customer organizations (tenants).
- The initial target segments are factories and commercial buildings.
- The first release uses simulated data only.
- The first complete workflow is monitoring a simulated generator and following an alert through incident handling and work-order completion.
- The core customer roles are Organization Owner, Facility Manager, Maintenance Engineer, Technician, and Viewer.
- The initial product includes infrastructure management, telemetry monitoring, alerts, incidents, work orders, basic maintenance records, and a basic overview dashboard.

## 2. IA Goals

The application structure must:

1. Give users a clear view of their currently selected organization and site context.
2. Separate infrastructure configuration from live monitoring and operational follow-up.
3. Make critical work visible without making the entire application feel like an alarm console.
4. Keep assets as the central link between locations, sensors, telemetry, alerts, incidents, and maintenance history.
5. Keep alerts and incidents distinct because they represent different stages of work.
6. Present only actions that the current user is permitted to perform.
7. Support both factory and commercial-building hierarchies without forcing every customer to use buildings or areas.
8. Allow later equipment types and AI capabilities to be introduced without restructuring the primary navigation.
9. Work for both data-rich states and empty states where an organization has not configured sites, assets, or simulator streams yet.
10. Preserve a consistent navigation model on desktop and smaller screens.

## 3. IA Design Principles

### 3.1 Organize around user tasks, not backend modules

The navigation should reflect what users are trying to do: understand current conditions, configure their infrastructure, investigate alerts, and complete maintenance. It should not mirror NestJS module names or database tables one-to-one.

### 3.2 Asset context is persistent

An asset should be reachable from its site, from the asset directory, from a telemetry chart, from an alert, from an incident, and from a work order. Wherever possible, the interface should preserve a link back to the asset's canonical detail page.

### 3.3 Separate detection from response

- **Alert:** A signal that a rule or detector found a condition worth reviewing.
- **Incident:** A managed operational case that requires ownership, investigation, and potentially corrective action.
- **Work order:** An assigned task to inspect, maintain, or repair an asset.

This distinction must be reflected in labels, page titles, filters, status values, and user flows.

### 3.4 Progressive disclosure

Show the most important summary information first. Put advanced configuration, raw event payloads, model metadata, and detailed audit information deeper in the relevant page or behind tabs, drawers, or expandable sections.

### 3.5 Context before action

An action such as acknowledging an alert or assigning a work order should show the affected asset, site, current condition, and relevant timestamps. The user should not have to navigate away to understand what they are acting on.

### 3.6 Be explicit about data freshness

The product must visibly distinguish current, delayed, stale, missing, and simulator-paused data. A missing telemetry stream must never be represented as a healthy asset state.

### 3.7 Role-aware, not role-fragmented

Users should share a consistent information architecture where possible. Permissions determine visibility and available actions; the product should not create entirely different applications for every role. Where a role has a different first task (for example, technicians need assigned work), the dashboard may be personalized without changing the whole navigation model.

## 4. Primary Information Domains

The application is divided into the following user-facing domains.

| Domain         | User question                                              | Main objects                                                 | Primary users                                                           | MVP status                                           |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | ---------------------------------------------------- |
| Dashboard      | What needs my attention now?                               | Site summaries, asset status, alerts, incidents, work orders | All roles, personalized                                                 | P0                                                   |
| Infrastructure | What equipment do we have, and where is it?                | Sites, buildings, areas, assets, devices, sensors            | Owner, Facility Manager, Engineer; read-only for others                 | P0                                                   |
| Monitoring     | What is happening to equipment now and over time?          | Telemetry, metrics, sensor status, simulator state           | Facility Manager, Engineer, Technician (limited), Viewer                | P0                                                   |
| Alerts         | What condition was detected and does it need review?       | Alerts, threshold rules, detection context                   | Facility Manager, Engineer; limited Technician visibility               | P0                                                   |
| Incidents      | Which operational problems are being investigated?         | Incidents, assignments, comments, event history              | Owner, Facility Manager, Engineer; Technician may view assigned context | P0                                                   |
| Work Orders    | What maintenance tasks need to be completed?               | Work orders, assignments, due dates, completion records      | Engineer, Facility Manager, Technician                                  | P0                                                   |
| Maintenance    | What maintenance has been performed or is planned?         | Maintenance records, basic schedules                         | Facility Manager, Engineer, Technician (limited)                        | P0 basic records; schedules can follow               |
| Analytics      | How is the organization or site performing over time?      | Aggregated operational summaries                             | Owner, Facility Manager, Viewer                                         | Basic dashboard summaries P0; deeper analytics later |
| Administration | Who can access this organization and how is it configured? | Members, roles, organization settings, audit logs            | Owner; delegated admins if defined                                      | P0 minimum                                           |

## 5. Global Application Shell

### 5.1 Layout regions

The authenticated desktop application uses four persistent regions:

1. **Left navigation sidebar:** Primary domains and their destinations.
2. **Top application bar:** Organization context, optional site context, global search/quick navigation, notifications, and user profile.
3. **Breadcrumb/title region:** Current page title, location in the hierarchy, and page-level actions.
4. **Main content region:** The actual page content, data tables, forms, charts, or workflows.

A secondary contextual panel may be used on detail pages, but it must not compete with the main content.

### 5.2 Organization context

Because GridAware is multi-tenant, the active organization is a first-class part of the application shell.

The organization switcher should:

- Display the currently active organization.
- Allow switching only to organizations where the user has an active membership.
- Reset or revalidate the selected site and page context after switching organizations.
- Prevent stale data from the previous organization from remaining visible during the transition.
- Clearly show the organization context in the page shell or breadcrumb.

If the user belongs to one organization only, the switcher may be visually compact, but the active organization context must still be clear.

### 5.3 Site context

A site filter may be available on Dashboard, Monitoring, Alerts, Incidents, Work Orders, Maintenance, and Analytics. It should support:

- All authorized sites.
- One selected site.
- A clear action to remove the site filter.

The site filter must not silently change the organization. Site context is a filter, not a security boundary; the backend still validates access.

### 5.4 Global top-bar elements

Recommended order:

1. Organization switcher.
2. Optional site selector or current site context.
3. Breadcrumbs or page title (depending on available width).
4. Global search/quick navigation (can be deferred if not part of MVP).
5. Notifications.
6. User menu.

The top bar should not become a crowded toolbar. Page-specific actions belong beside the page title or in the page content.

### 5.5 Sidebar behavior

- Expanded state shows icons and labels.
- Collapsed state shows icons with accessible tooltips.
- Current destination is clearly highlighted.
- Parent groups remain expanded when one of their child routes is active.
- Navigation groups can collapse, but core destinations should remain discoverable.
- On small screens, use a drawer or compact navigation pattern rather than squeezing the full sidebar.

## 6. Recommended Primary Navigation

The initial primary navigation is:

1. Dashboard
2. Infrastructure
   - Sites
   - Buildings (where used)
   - Assets
   - Sensors & Devices
3. Monitoring
   - Live Monitoring
   - Telemetry Explorer
4. Alerts
5. Incidents
6. Work Orders
7. Maintenance
   - Maintenance Records
   - Schedules (when implemented)
8. Analytics
9. Administration
   - Members
   - Roles & Permissions (Owner/admin only)
   - Organization Settings
   - Audit Log (Owner/admin only)

### 6.1 Why Alerts are a top-level destination

Alerts are time-sensitive and represent the review queue between raw telemetry and managed incidents. They need a direct route from the sidebar and dashboard. They should not be buried under Analytics or Infrastructure.

### 6.2 Why Incidents and Work Orders are separate

An incident records an operational issue and its investigation. A work order records a task assigned to someone. One incident may have no work order, one work order, or multiple work orders over time. Combining both concepts in one page would make ownership and status ambiguous.

### 6.3 Why AI Intelligence is not a top-level MVP destination yet

The approved MVP begins with simulator data, monitoring, threshold rules, and a reliable operational workflow. Basic anomaly experiments and richer predictive intelligence are later increments. A dedicated Intelligence navigation group should only be introduced when users have enough real product functionality to justify it. Until then, anomaly and prediction context can appear inside Monitoring, Alert, and Asset detail pages behind capability-aware sections.

## 7. Information Hierarchy and Object Relationships

The user-facing hierarchy is:

```text
Platform
└── Organization
    ├── Members
    └── Site
        ├── Building (optional)
        │   └── Area / Floor (optional)
        ├── Assets
        │   ├── Asset details
        │   ├── Sensors / Devices
        │   │   └── Telemetry
        │   ├── Alerts
        │   ├── Incidents
        │   └── Maintenance history
        └── Site activity
```

Important interpretation:

- A site can contain assets directly without requiring a building record.
- Buildings and areas are optional organizational layers.
- A sensor belongs to an asset; a device may publish data for one or more configured sensors depending on the simulator/device model.
- Telemetry is accessed primarily through sensor and asset context, not as a standalone business object detached from equipment.
- Alerts, incidents, and work orders link back to the affected asset and site.

## 8. Page-Level Information Architecture

### 8.1 Dashboard

**Purpose:** Provide a role-relevant summary of current operational conditions and direct users to the next useful action.

**Primary content:**

- Asset status summary (for example, normal, attention required, offline/unknown).
- Active alerts and open incidents.
- Work orders awaiting action or overdue.
- Site selector or organization-level scope.
- Recent activity.
- Asset status distribution.
- Data freshness or simulator status indicator.

**Role variation:**

- Owner: organization-wide roll-up and site comparison.
- Facility Manager: selected-site/assigned-sites health and open operations.
- Engineer: active alerts, incidents requiring investigation, and assigned work.
- Technician: assigned work orders and tasks due soon; asset summaries may be secondary.
- Viewer: read-only overview of authorized sites.

Dashboard cards must link to filtered destination pages. A number without a meaningful drill-down is not sufficient.

### 8.2 Infrastructure

**Purpose:** Maintain a trusted catalog of locations and equipment.

**Sites list:**

- Site name and type (factory/commercial building/other supported category).
- Address or location metadata where appropriate.
- Asset count.
- Current operational summary.
- Active issue count.
- Status of recent telemetry.

**Site details:**

- Overview.
- Buildings/areas (optional).
- Assets.
- Recent alerts/incidents.
- Recent activity.
- Site metadata and settings, subject to permissions.

**Assets list:**

- Asset name and identifier.
- Asset type.
- Site/building/area.
- Operational status and data freshness.
- Criticality.
- Active alert/incident indicator.
- Last telemetry time.

**Asset details:** Recommended tabs/sections:

1. Overview — identity, location, type, criticality, current status, last data received.
2. Live Signals — key metrics and current sensor readings.
3. History — time-range charts and measurement table.
4. Alerts & Incidents — open and historical items related to the asset.
5. Maintenance — work orders and maintenance records.
6. Configuration — specifications, sensors, metric mappings, and thresholds (authorized roles only).

**Sensors & Devices:**

- List and filter by site, asset, metric, and connection/data status.
- Show device identity and simulator/physical source designation.
- Show last received event and data-quality state.
- Sensor configuration must make metric names and units explicit.

### 8.3 Monitoring

**Live Monitoring:**

- Site/asset selection.
- Current readings with units.
- Last updated time and freshness state.
- Trend chart over a recent time window.
- Sensor/device connectivity state.
- Clear indication if data is simulated.

**Telemetry Explorer:**

- Asset and sensor filters.
- Metric selector.
- Date/time range.
- Chart and tabular view.
- Unit and quality information.
- Empty, delayed, and no-data states.
- Export may be deferred until its operational and security requirements are defined.

Monitoring should help users understand what is happening; configuration of rules and sensors should remain under Infrastructure or a contextual configuration area.

### 8.4 Alerts

**Alert queue:**

- Alert title/condition.
- Severity or priority.
- Affected asset and site.
- Triggered metric and observed value/unit.
- Triggered time and latest update.
- Rule/detector source.
- Acknowledgement/status.
- Related incident indicator.

**Alert details:**

- Condition summary.
- Observed value and configured threshold/rule.
- Event timeline and related telemetry context.
- Asset link.
- Acknowledge/review action.
- Create/link incident action, subject to policy and permission.
- Related alerts to help identify repeated conditions.

The UI must not imply that an alert is a confirmed equipment failure. Use language such as "condition detected" or "threshold exceeded" unless a qualified user records a confirmed diagnosis.

### 8.5 Incidents

**Incident queue:**

- Incident ID and title.
- Severity/priority.
- Status.
- Asset and site.
- Owner/assignee.
- Created/updated time.
- Linked alert count.
- Open work order indicator.

**Incident details:**

- Summary and current status.
- Affected asset and location.
- Detection source and linked alerts.
- Timeline/event history.
- Assignee and priority.
- Notes and investigation findings.
- Linked work orders.
- Resolution and closure information.

The detail page should support a clear next action based on status. Do not show a generic group of buttons that allows invalid state transitions.

### 8.6 Work Orders

**Work-order queue:**

- Work-order identifier/title.
- Task type (inspection, preventive, corrective, or other defined category).
- Priority.
- Status.
- Asset/site.
- Assignee.
- Due date.
- Related incident.

**Work-order details:**

- Task instructions and reported condition.
- Asset context.
- Assignee and due date.
- Status timeline.
- Findings and actions performed.
- Completion notes.
- Related incident and maintenance record.

Technicians should have a focused view of assigned work rather than needing broad administrative navigation.

### 8.7 Maintenance

For the first MVP, Maintenance should primarily provide maintenance history and links to completed work orders. Full recurring schedule automation can follow after the operational workflow is reliable.

Initial page areas:

- Maintenance history.
- Completed work orders.
- Asset maintenance timeline.
- Basic schedule list if schedule functionality is delivered.

Avoid presenting schedule management as available if only maintenance history has been implemented.

### 8.8 Analytics

MVP analytics should remain descriptive and traceable:

- Asset status counts.
- Alert and incident counts over time.
- Open and overdue work orders.
- Basic site-level comparison where enough data exists.
- Telemetry availability/freshness summary.

Advanced reliability metrics, failure probability distributions, remaining useful life, and predictive savings claims are later capabilities requiring validated data and metric definitions.

### 8.9 Administration

**Members:** Invite, view, deactivate, and manage organization membership where implemented.

**Roles & Permissions:** Show roles and assigned capabilities. Avoid allowing arbitrary permission editing unless the authorization model supports it safely.

**Organization Settings:** Organization profile, default time zone, units/display preferences if supported, and operational defaults.

**Audit Log:** Filterable record of important membership, configuration, incident, and work-order actions. Access restricted to permitted roles.

Platform administration is a separate internal surface and must not appear in customer navigation.

## 9. Role-Aware Navigation and Access

Navigation visibility and action availability are separate concerns:

- Hiding a navigation link improves usability but does not enforce authorization.
- Every protected endpoint and resource lookup must enforce authorization on the backend.
- A read-only user may see pages but must not see edit/assign/resolve actions.
- A technician may see their assigned work orders and relevant asset context without receiving organization administration privileges.
- Site-scoped access, if introduced, must affect lists, direct routes, dashboard cards, search results, WebSocket subscriptions, and exports consistently.

### 9.1 Initial navigation expectations

| Destination       |     Owner     | Facility Manager |     Engineer     |           Technician            |          Viewer           |
| ----------------- | :-----------: | :--------------: | :--------------: | :-----------------------------: | :-----------------------: |
| Dashboard         |     Full      |       Full       |   Operational    |       Technician-focused        |         Read-only         |
| Sites             |    Manage     |      Manage      |       View       |        Assigned context         |           View            |
| Assets            |    Manage     |      Manage      | Manage/configure |        Assigned context         |           View            |
| Sensors & Devices |    Manage     |      Manage      | Manage/configure |             Limited             |           View            |
| Monitoring        |     View      |       View       |       View       |        Assigned context         |           View            |
| Alerts            | Manage/review |      Review      |      Review      |        Limited/assigned         | View or hidden per policy |
| Incidents         |    Manage     |      Manage      |      Manage      | Assigned context/update limited |           View            |
| Work Orders       |    Manage     |      Manage      |  Create/assign   |         Assigned/update         | View or hidden per policy |
| Maintenance       |  View/manage  |      Manage      |      Manage      |     Record/update assigned      |           View            |
| Analytics         | Organization  |       Site       |   Operational    |             Limited             |         Read-only         |
| Administration    |    Manage     |  Delegated only  |        No        |               No                |            No             |

This table is a navigation concept only. It must be reconciled with the approved backend permission matrix before implementation.

## 10. Global Interaction and Context Rules

### 10.1 Organization switching

Switching organization must:

- Revalidate membership.
- Clear stale site and entity selections.
- Reload organization-scoped data.
- Avoid showing cached data from the previous tenant.
- Return the user to a safe default destination if the current route is unavailable in the new organization.

### 10.2 Site filters

Site filters should persist only within a defined session or route scope. The product must make the active filter visible and provide a clear reset. Filter state must never be mistaken for access control.

### 10.3 Date/time filters

Monitoring, Alerts, Incidents, and Analytics should use consistent date-range controls. The interface should show the timezone used for interpretation, especially when displaying event time and ingestion time.

### 10.4 Search

Global search is a candidate enhancement. If implemented, it should search only authorized resources and distinguish result types (site, asset, alert, incident, work order). Search results must not leak the existence of unauthorized records.

### 10.5 Destructive actions

Deleting or deactivating sites, assets, sensors, members, or configuration should require appropriate permission and confirmation. Prefer archive/deactivate behavior when historical telemetry or operational records depend on the object.

## 11. Critical States That Must Be Represented

The IA must leave room for these states across the relevant pages:

- Loading.
- Empty organization (no sites).
- Empty site (no assets).
- Asset without sensors.
- Sensor configured but no telemetry received.
- Simulator stopped or paused.
- Device offline.
- Telemetry delayed/stale.
- Telemetry invalid or quality-degraded.
- Alert active, acknowledged, resolved, or linked to an incident.
- Incident unassigned, assigned, investigating, resolved, or closed.
- Work order unassigned, assigned, in progress, blocked, completed, or cancelled (exact states to follow the workflow specification).
- Permission denied.
- Integration/queue/AI service degraded where that state affects user-visible behavior.

The exact status vocabulary must be standardized in the interaction and domain specifications.

## 12. MVP Priority and Deferred IA

### P0 — Required for the first coherent experience

- Dashboard.
- Organization context.
- Sites and Assets.
- Sensors/Devices.
- Live Monitoring.
- Telemetry Explorer (basic).
- Alerts.
- Incidents.
- Work Orders.
- Basic Maintenance History.
- Minimum Administration (members, roles, organization settings, audit for key actions).

### P1 — Add after the vertical slice is stable

- More detailed Analytics.
- HVAC simulator and commercial-building workflow validation.
- Basic asset risk indicator and anomaly summaries.
- Improved filtering and exports.
- More complete maintenance scheduling.

### P2 — Later product capabilities

- Dedicated Intelligence workspace.
- Predictive failure modeling and remaining useful life.
- Cross-asset correlation.
- Advanced reporting and integrations.
- Physical IoT device onboarding.

## 13. IA Decisions to Carry into the Sitemap

1. Use Dashboard as the authenticated landing page, with role-aware content.
2. Use one Infrastructure group for Sites, Buildings, Assets, and Sensors/Devices.
3. Keep Monitoring separate from configuration.
4. Keep Alerts separate from Incidents.
5. Keep Incidents separate from Work Orders.
6. Expose Maintenance as a basic history destination initially; do not overstate schedule automation.
7. Keep Analytics descriptive in the MVP.
8. Defer a dedicated AI Intelligence navigation group until validated functionality exists.
9. Use organization context globally and site context as a filter.
10. Keep platform administration out of customer navigation.

## 14. Open Design Questions

These questions do not prevent the initial sitemap, but should be resolved during wireframes and detailed interaction design:

- Should the sidebar be permanently expanded on desktop or default to a compact state?
- Should a site detail page use tabs or a summary page with linked sections?
- Should alert details use a dedicated page, a side drawer, or both?
- Should technician users land on a dedicated My Work page or a role-personalized Dashboard?
- Which global search capabilities are required in the first release?
- Which list filters should persist across navigation?
- Which analytics cards are meaningful before real telemetry and customer history exist?

## 15. Acceptance Criteria for This IA

The IA is ready to be used for the next design step when:

- Every P0 PRD capability maps to a clear navigation destination or contextual page section.
- Every customer persona can identify their primary destination.
- Alerts, incidents, and work orders are clearly differentiated.
- Asset context is reachable from telemetry, alerts, incidents, and work orders.
- Optional building/area levels do not block organizations that only need sites and assets.
- The navigation accounts for simulator-only operation and data freshness states.
- Role-aware visibility is mapped without treating frontend visibility as security enforcement.
- Deferred AI and physical-device capabilities are not presented as available MVP features.
- The organization and site context rules are documented.
- The sitemap and screen inventory can be derived without inventing new product capabilities.

## 16. Traceability to the PRD

This IA is derived primarily from:

- PRD §2 — Product Decisions and Approved Baseline.
- PRD §8 — Product Scope.
- PRD §9 — Product Information Architecture.
- PRD §10 — Domain Model and Hierarchy.
- PRD §11 — Roles and Permission Model.
- PRD §12 — Core User Journeys.
- PRD §13 — Functional Requirements.
- PRD §14 — Business Rules.
- PRD §18 — Non-Functional Requirements.
- PRD §20 — MVP Acceptance Criteria and Release Gates.

If a future design decision conflicts with the PRD, record the change and update the PRD or create an explicit design exception. Do not silently expand product scope from a UI mockup.

---

**Next document:** `sitemap.md`  
**Next design activity:** Review the sitemap and role-based navigation, then produce the screen inventory and user-flow diagrams.
