# GridAware — Screen Inventory

**Document version:** 1.0  
**Status:** Draft for design review  
**Product baseline:** GridAware PRD v1.0  
**Design phase:** UX/UI — Screen Definition  
**Product model:** Multi-tenant B2B SaaS  
**Initial mode:** Simulator only  
**Brand foundation:** EVARAX palette

---

## 1. Purpose

This document is the master list of user-facing pages, screen-level views, and important overlays required to design the GridAware MVP. It defines why each screen exists, who uses it, the information it must contain, the actions it exposes, its key states, and its priority.

A screen is not automatically a separate URL. Tabs, drawers, modals, and wizard steps may be part of a parent route. The final route mapping is defined in `sitemap.md`; this inventory is the UX design checklist.

## 2. Scope and Priority Definitions

- **P0 — MVP required:** Needed for the first coherent generator-monitoring-to-work-order workflow.
- **P1 — MVP enhancement:** Useful for an operationally complete pilot but can follow the first vertical slice.
- **P2 — Later:** Advanced capability outside the first release.

Role abbreviations:

- **OWN:** Organization Owner
- **FM:** Facility Manager
- **ENG:** Maintenance Engineer
- **TEC:** Technician
- **VIEW:** Viewer
- **PLAT:** Internal platform administrator (not a normal customer role)

Access is always tenant-scoped. The role labels describe intended access, not a substitute for server-side authorization.

## 3. Screen Summary

| ID    | Screen                           | Route / context                          | Primary roles                                          | Priority                                   |
| ----- | -------------------------------- | ---------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| SC-01 | Sign In                          | `/login`                                 | All authenticated customer roles                       | P0                                         |
| SC-02 | Sign Up                          | `/register`                              | New user                                               | P0                                         |
| SC-03 | Forgot Password                  | `/forgot-password`                       | All                                                    | P0                                         |
| SC-04 | Verify Email / Invitation        | `/verify-email`, `/invite/accept`        | New/invited user                                       | P0/P1                                      |
| SC-05 | Create Organization              | `/onboarding/organization`               | New Owner                                              | P0                                         |
| SC-06 | Onboarding Checklist             | `/onboarding`                            | OWN, FM                                                | P0                                         |
| SC-07 | Dashboard                        | `/dashboard`                             | All, role-personalized                                 | P0                                         |
| SC-08 | Site List                        | `/sites`                                 | OWN, FM, ENG, VIEW                                     | P0                                         |
| SC-09 | Create/Edit Site                 | `/sites/new`, `/sites/:siteId/edit`      | OWN, FM                                                | P0                                         |
| SC-10 | Site Detail                      | `/sites/:siteId`                         | OWN, FM, ENG, TEC (limited), VIEW                      | P0                                         |
| SC-11 | Building/Area List & Detail      | `/sites/:siteId/buildings`               | OWN, FM, ENG, VIEW                                     | P1 / conditional                           |
| SC-12 | Asset List                       | `/assets`                                | OWN, FM, ENG, TEC (limited), VIEW                      | P0                                         |
| SC-13 | Create/Edit Asset                | `/assets/new`, `/assets/:assetId/edit`   | OWN, FM, ENG                                           | P0                                         |
| SC-14 | Asset Detail — Overview          | `/assets/:assetId`                       | All authorized roles                                   | P0                                         |
| SC-15 | Asset Sensors & Devices          | Asset detail tab                         | OWN, FM, ENG                                           | P0                                         |
| SC-16 | Asset Monitoring                 | Asset detail tab                         | OWN, FM, ENG, TEC (limited), VIEW                      | P0                                         |
| SC-17 | Asset Alerts & History           | Asset detail tab                         | OWN, FM, ENG, TEC (limited), VIEW                      | P0                                         |
| SC-18 | Sensor List                      | `/sensors`                               | OWN, FM, ENG, VIEW (read-only)                         | P0                                         |
| SC-19 | Sensor Detail / Configuration    | `/sensors/:sensorId`                     | OWN, FM, ENG                                           | P0                                         |
| SC-20 | Live Monitoring                  | `/monitoring`                            | OWN, FM, ENG, TEC (limited), VIEW                      | P0                                         |
| SC-21 | Historical Monitoring Query      | `/monitoring/history` or same-page state | OWN, FM, ENG, VIEW                                     | P0                                         |
| SC-22 | Alert Inbox                      | `/alerts`                                | OWN, FM, ENG, TEC (limited), VIEW (read-only policy)   | P0                                         |
| SC-23 | Alert Detail                     | `/alerts/:alertId`                       | OWN, FM, ENG, TEC (limited), VIEW                      | P0                                         |
| SC-24 | Incident List                    | `/incidents`                             | OWN, FM, ENG, TEC (assigned/limited), VIEW (read-only) | P0                                         |
| SC-25 | Create Incident                  | `/incidents/new` or modal                | OWN, FM, ENG                                           | P0                                         |
| SC-26 | Incident Detail                  | `/incidents/:incidentId`                 | OWN, FM, ENG, TEC (assigned), VIEW (read-only)         | P0                                         |
| SC-27 | Work Order List                  | `/work-orders`                           | OWN, FM, ENG, TEC, VIEW (read-only policy)             | P0                                         |
| SC-28 | Create/Edit Work Order           | `/work-orders/new`, edit context         | OWN, FM, ENG                                           | P0                                         |
| SC-29 | Work Order Detail                | `/work-orders/:workOrderId`              | OWN, FM, ENG, assigned TEC, VIEW (read-only)           | P0                                         |
| SC-30 | My Work Orders                   | `/my-work-orders`                        | TEC                                                    | P0                                         |
| SC-31 | Maintenance History              | `/maintenance/records`                   | OWN, FM, ENG, TEC (limited), VIEW                      | P1                                         |
| SC-32 | Maintenance Schedule             | `/maintenance/schedules`                 | OWN, FM, ENG                                           | P1                                         |
| SC-33 | Basic Analytics                  | `/analytics`                             | OWN, FM, VIEW; ENG (limited)                           | P1                                         |
| SC-34 | Organization Members             | `/settings/members`                      | OWN, delegated admin if supported                      | P0 minimum                                 |
| SC-35 | Roles & Access Summary           | `/settings/roles`                        | OWN                                                    | P0 read/config capability according to PRD |
| SC-36 | Organization Settings            | `/settings/organization`                 | OWN                                                    | P0                                         |
| SC-37 | Profile & Preferences            | `/profile`                               | All                                                    | P0                                         |
| SC-38 | Notifications Center             | `/notifications`                         | All                                                    | P0                                         |
| SC-39 | Audit Log                        | `/settings/audit-log`                    | OWN, limited FM if approved                            | P1                                         |
| SC-40 | Simulator Control                | Asset detail / simulator workspace       | OWN, FM, ENG in simulator environment                  | P0                                         |
| SC-41 | Global Search / Quick Switcher   | Global overlay                           | Authorized user                                        | P1                                         |
| SC-42 | Permission Denied / Access Error | State, not necessarily route             | All                                                    | P0                                         |
| SC-43 | System Status / Service Error    | State or internal route                  | All / PLAT                                             | P0                                         |

## 4. Detailed Screen Specifications

### SC-01 — Sign In

**Purpose:** Authenticate a returning user.  
**Content:** Product identity, email/username field, password field, password visibility toggle, remember-session option if supported, sign-in action, forgot-password link, registration link.  
**Primary action:** Sign in.  
**Secondary actions:** Show/hide password, recover password, register.  
**States:** Default, validation error, invalid credentials, rate-limited, submitting, service unavailable, account disabled, session expired.  
**Notes:** Avoid exposing whether an email exists in security-sensitive recovery flows. Keep the form focused and do not place operational dashboard imagery behind the authentication fields if it reduces readability.

### SC-02 — Sign Up

**Purpose:** Create a user account before organization creation or invitation acceptance.  
**Content:** Name, email, password, confirm password if needed, terms/privacy acknowledgement if required, password guidance.  
**Actions:** Create account, sign in instead.  
**States:** Validation, email already registered, weak password, submitting, verification pending, service error.  
**Notes:** Do not ask for detailed organization configuration on the registration form; organization creation is a separate onboarding step.

### SC-03 — Forgot Password

**Purpose:** Start account recovery.  
**Content:** Email field, concise privacy-safe explanation, submit, return to sign in.  
**States:** Empty, invalid format, submitting, request accepted, rate-limited, unavailable.  
**Notes:** Confirmation wording should not reveal whether the account exists.

### SC-04 — Verify Email / Accept Invitation

**Purpose:** Verify identity or accept an organization membership invitation.  
**Content:** Organization name for invitations, invited email, proposed role, invitation validity, accept action.  
**States:** Valid, expired, revoked, already accepted, wrong account, authentication required.  
**Notes:** Show the organization and role before acceptance. Do not expose other members or tenant data before membership is active.

### SC-05 — Create Organization

**Purpose:** Create the first tenant workspace.  
**Content:** Organization name, optional display name, industry segment (Factory / Commercial Building), optional country/timezone.  
**Actions:** Create organization, cancel/return.  
**States:** Validation, duplicate organization identifier if applicable, saving, success, failure.  
**Notes:** Owner membership is created as part of the same logical operation. The screen must explain that organization data is isolated from other tenants.

### SC-06 — Onboarding Checklist

**Purpose:** Guide the owner/manager to a working first monitored asset.  
**Content:** Organization profile, create site, register generator, configure simulated device/sensors, start simulator, verify first telemetry, optional invite team.  
**Actions:** Continue setup, skip optional step, resume incomplete step.  
**States:** Not started, in progress, complete, blocked by permission, blocked by service issue.  
**Notes:** Checklist completion should be evidence-based; do not mark telemetry complete just because a simulator was configured.

### SC-07 — Dashboard

**Purpose:** Answer "What needs my attention now?" and direct the user to the next meaningful action.  
**Content hierarchy:** Page context; summary cards; asset-health/status distribution; active alerts/incidents; telemetry freshness/device status; recent activity; assigned work or pending tasks depending on role.  
**Primary actions:** Add asset (where permitted), review critical alert, open incident, view site, open assigned work.  
**Filters:** Organization context (global), site, time range where applicable.  
**States:** First-run empty, no assets, assets but no telemetry, live data, stale data, partial service failure, loading, error.  
**Role variants:** Owner sees organization overview; Manager sees site/operational summary; Engineer emphasizes alerts/incidents; Technician emphasizes My Work Orders; Viewer is read-only.  
**Do not:** Present fabricated KPI values or imply model-driven predictive scores exist before the relevant feature is implemented.

### SC-08 — Site List

**Purpose:** Locate and manage sites within the active organization.  
**Content:** Site name, site code, address/region if available, asset count, status/telemetry summary when meaningful, updated date.  
**Actions:** Search, filter, sort, create site, open site.  
**States:** No sites, no search results, loading, error, partial data.  
**Notes:** A site with no telemetry should not show 0% health as if measured; use Not monitored / No data.

### SC-09 — Create/Edit Site

**Purpose:** Enter or update site metadata.  
**Fields:** Name (required), code (optional/unique if configured), address, timezone, description, segment or site type if required.  
**Actions:** Save, cancel, discard unsaved changes.  
**States:** Inline validation, saving, duplicate value, save failure, read-only access.  
**Notes:** If timezone affects chart display, clearly show the selected timezone and use UTC for persisted timestamps.

### SC-10 — Site Detail

**Purpose:** Provide a site-level overview and entry point to its buildings/assets/operations.  
**Content:** Site header, metadata, asset count, asset status summary, latest telemetry freshness, active alerts/incidents, assets table/list, optional building hierarchy.  
**Actions:** Edit site, add asset, view monitoring, open alert/incident.  
**States:** Empty site, assets with no telemetry, live data, stale, access denied.  
**Notes:** Do not force a building layer; assets may be directly attached to a site.

### SC-11 — Buildings / Areas

**Purpose:** Organize assets physically when a customer uses buildings, floors, or areas.  
**Content:** Hierarchical location list, child counts, asset associations.  
**Actions:** Create/edit location, move asset if permitted, open location.  
**States:** No buildings, empty location, duplicate code, permission-limited.  
**Priority:** P1/conditional; the product hierarchy allows buildings/areas, but the first generator workflow does not require them.

### SC-12 — Asset List

**Purpose:** Find equipment and understand its current monitoring state.  
**Content:** Asset name/code, type, site/location, criticality, connection/freshness, latest status, open alert/incident count if available.  
**Actions:** Search, filter by site/type/status/criticality, sort, add asset, open asset.  
**States:** No assets, no search result, no telemetry, stale, offline, loading, error.  
**Notes:** Keep operational state, connection status, and data freshness separate.

### SC-13 — Create/Edit Asset

**Purpose:** Register a maintainable item.  
**Fields:** Name, asset type (Generator first), site, optional building/area, unique asset code, manufacturer/model/serial if known, criticality, description, optional installation metadata.  
**Actions:** Save, cancel, delete/archive only if policy allows.  
**States:** Validation, duplicate identifier, saving, save failure, unsaved changes.  
**Notes:** Provide a review step for multi-field configuration. Do not ask for sensor details in the asset identity form.

### SC-14 — Asset Detail: Overview

**Purpose:** The canonical page for an asset.  
**Content:** Asset identity, location, asset type, criticality, device/telemetry freshness, current readings summary, current alerts/incidents, recent events, shortcuts to Monitoring and Maintenance.  
**Actions:** Edit asset, add/configure sensor, view monitoring, create incident (permission-gated), create work order.  
**States:** Awaiting sensor setup, configured/no telemetry, current telemetry, stale telemetry, device offline, archived (if supported).  
**Notes:** This page should be the destination linked from alert, incident, chart, and work-order context.

### SC-15 — Asset Sensors & Devices

**Purpose:** Configure simulated device identity and metric/sensor mappings.  
**Content:** Device identity, simulated/real source label (MVP: simulated only), connection state, sensor rows, metric name, unit, latest received value/time, configuration status.  
**Actions:** Add sensor, edit mapping, deactivate sensor, view sensor detail, start simulator.  
**States:** No device, no sensors, configured/waiting, receiving, stale, simulator offline, validation error.  
**Notes:** The screen must visibly state that the initial source is a simulator.

### SC-16 — Asset Monitoring

**Purpose:** Inspect live and historical telemetry for one asset.  
**Content:** Asset header, metric selector, latest value/unit/time, freshness indicator, time-range selector, trend charts, threshold markers, event annotations.  
**Actions:** Change metric, change time range, compare metrics if supported, open alert at timestamp.  
**States:** Loading, no telemetry ever, no data in range, stale, live, partial metric availability, query failure.  
**Notes:** Charts must label units and timezone. Simulator data label remains visible.

### SC-17 — Asset Alerts & History

**Purpose:** Review alerts and operational history related to one asset.  
**Content:** Chronological list with date, type, severity/status, linked incident, summary.  
**Actions:** Open alert/incident, filter history type, create work order where permitted.  
**States:** Empty history, filtered empty, loading, error.  
**Notes:** This is an asset-context view, not a replacement for the global alert/incident queue.

### SC-18 — Sensor List

**Purpose:** Locate sensors and identify missing/stale streams.  
**Content:** Sensor name/id, asset, metric, unit, device, latest reading time, data-quality/connection status.  
**Actions:** Search, filter, sort, open sensor.  
**States:** No sensors, no telemetry, stale, offline, loading, error.

### SC-19 — Sensor Detail / Configuration

**Purpose:** Inspect sensor metadata and change configuration if authorized.  
**Content:** Sensor identity, linked asset/device, metric/unit, configuration, latest event, recent history, status.  
**Actions:** Edit name/mapping, deactivate/reactivate if supported, view telemetry.  
**States:** Configured, missing, stale, invalid mapping, read-only, service error.  
**Notes:** Unit changes must not silently reinterpret historical measurements; any conversion or versioning behavior must be specified before implementation.

### SC-20 — Live Monitoring

**Purpose:** Monitor a selected site or a set of assets in near real time.  
**Content:** Site selector, metric/status filters, asset summary list, live values, freshness, alerts/annotations, update timestamp.  
**Actions:** Filter assets, open asset, select time range, pause visual auto-refresh where useful.  
**States:** No assets, no data, live, stale, disconnected, partial stream, service unavailable.  
**Notes:** Never animate numeric values in a way that obscures the actual measurement or unit.

### SC-21 — Historical Monitoring Query

**Purpose:** Explore past telemetry across an asset or site.  
**Content:** Date/time range, metric/asset selectors, chart, data table/export only if approved, timezone context.  
**Actions:** Apply range, reset range, switch metric, inspect point.  
**States:** Invalid range, empty range, large-query loading, unavailable data.  
**Notes:** Query limits and export behavior should be defined before offering exports.

### SC-22 — Alert Inbox

**Purpose:** Prioritize detected conditions requiring review.  
**Content:** Alert count summary, alert table/list, severity, alert type, asset, site, detected time, last event, acknowledgement state, linked incident.  
**Actions:** Search, filter, sort, acknowledge, open detail, create/open incident according to policy.  
**States:** No alerts, no filter matches, unacknowledged, acknowledged, resolved, stale source data, loading, error.  
**Notes:** The alert list must make the difference between an alert and an incident clear.

### SC-23 — Alert Detail

**Purpose:** Explain the detected condition and support the next operational action.  
**Content:** Severity and status; asset/site; metric/value/unit; threshold or detector reason; observed time; source data freshness; trend context; event history; linked incident.  
**Actions:** Acknowledge, create/link incident, open asset, add note if supported.  
**States:** New, acknowledged, resolved, duplicate/merged, stale data, permission read-only.  
**Notes:** For threshold alerts, show the configured rule and observed value. For anomaly-model events later, show model/version and explanation only when validated and available.

### SC-24 — Incident List

**Purpose:** Manage operational cases and identify unresolved work.  
**Content:** Incident ID/title, severity/priority, status, asset/site, assignee, created/updated time, linked alert count.  
**Actions:** Search, filter, sort, create manual incident, open incident, bulk actions only if explicitly designed.  
**States:** Empty, no results, unassigned, overdue if due dates exist, loading, error.  
**Notes:** Default sort should prioritize critical and unresolved incidents, not simply newest first.

### SC-25 — Create Incident

**Purpose:** Create an incident from an alert or manually.  
**Content:** Title, description, asset, site, linked alert (prefilled when launched from alert), severity/priority, assignee.  
**Actions:** Create, cancel.  
**States:** Validation, duplicate/link warning, saving, authorization failure, service error.  
**Notes:** The alert-origin path should prefill context to reduce re-entry and incorrect associations.

### SC-26 — Incident Detail

**Purpose:** Coordinate investigation, assignment, and resolution.  
**Content:** Header with status/severity; asset/site context; description; owner/assignee; linked alerts; event timeline; comments/notes; linked work orders; resolution summary.  
**Actions:** Assign/reassign, update valid status, add note, create work order, resolve/close where permitted.  
**States:** Open, triaged, assigned, investigating, resolved, closed, reopened if supported, read-only.  
**Notes:** Show allowed next transitions; do not offer every status as a free-form dropdown.

### SC-27 — Work Order List

**Purpose:** View all work orders within the active organization.  
**Content:** Work order ID/title, status, priority, asset/site, assignee, due date, linked incident, last updated.  
**Actions:** Filter, sort, search, create work order, open detail.  
**States:** Empty, unassigned, overdue, no filter matches, loading, error.  
**Notes:** Technician landing view can be a filtered My Work Orders page.

### SC-28 — Create/Edit Work Order

**Purpose:** Define a maintenance or inspection task.  
**Content:** Title, instructions, asset, site, linked incident, priority, assignee, due date, optional checklist/safety notes.  
**Actions:** Save, assign, cancel.  
**States:** Missing asset, invalid assignee, date validation, saving, update conflict.  
**Notes:** The asset and organization context should be prefilled when launched from an asset or incident.

### SC-29 — Work Order Detail

**Purpose:** Give assignee and reviewer the full task context and history.  
**Content:** Status, priority, instructions, asset/location, assignee, due date, linked incident, activity history, technician findings, performed actions, review/closure summary.  
**Actions:** Start work, update progress, submit completion, request changes, approve/close, reassign according to role.  
**States:** Draft, open, assigned, in progress, ready for review, completed/closed, blocked/cancelled if supported.  
**Notes:** Show which actions are available to the current role.

### SC-30 — My Work Orders

**Purpose:** Give technicians a task-focused landing page.  
**Content:** Assigned open work, due/overdue indicators, priority, asset/site, status, quick access to task details.  
**Actions:** Open task, start/update/submit completion.  
**States:** No assigned work, due soon, overdue, offline/limited connectivity if relevant, loading, error.  
**Notes:** Avoid showing administration navigation or controls the technician cannot use.

### SC-31 — Maintenance History

**Purpose:** Review completed maintenance activity by asset/site.  
**Content:** Date, asset, work order, technician, activity summary, outcome.  
**Actions:** Filter, open work order, open asset.  
**States:** No records, no results, loading, error.  
**Priority:** P1 unless basic records are needed to complete the initial vertical slice.

### SC-32 — Maintenance Schedule

**Purpose:** View and manage planned maintenance.  
**Content:** Schedule, asset, task type, due date/frequency, assignee, status.  
**Actions:** Create/edit schedule, generate work order.  
**States:** No schedules, overdue, upcoming, conflict, loading.  
**Priority:** P1; advanced recurring scheduling is not required for the initial vertical slice.

### SC-33 — Basic Analytics

**Purpose:** Summarize operational patterns without overstating predictive capability.  
**Content:** Asset count/status, alert/incident trend, work-order completion, telemetry coverage/freshness, selected time range.  
**Actions:** Filter by site/date, open underlying records.  
**States:** Insufficient history, no data, loading, error.  
**Notes:** All metrics need clear definitions and denominators. Mark sample/simulated data.

### SC-34 — Organization Members

**Purpose:** Manage membership and invitations.  
**Content:** Name/email, role, membership status, invitation status, last activity if available.  
**Actions:** Invite, resend/revoke invitation, change role, deactivate/remove membership subject to policy.  
**States:** No members beyond Owner, pending invitations, revoked, action confirmation, permission denied.  
**Notes:** Clearly distinguish user account from organization membership.

### SC-35 — Roles & Access Summary

**Purpose:** Explain permissions available to organization roles.  
**Content:** Role descriptions, permission matrix, delegated capabilities if configurable.  
**Actions:** View; edit only if custom roles are part of approved scope.  
**States:** Default roles, custom roles later, permission denied.  
**Notes:** A role summary in MVP may be read-only if roles are predefined.

### SC-36 — Organization Settings

**Purpose:** Maintain organization profile and workspace-level preferences.  
**Content:** Organization name, segment, timezone/default locale, optional logo/contact details, retention/preferences when approved.  
**Actions:** Edit/save.  
**States:** Validation, save, read-only, failure.  
**Notes:** Do not expose unsupported compliance or retention controls before implementation.

### SC-37 — Profile & Preferences

**Purpose:** Let each user manage personal settings.  
**Content:** Name, email (verification/readonly policy), password/security controls, time zone preference, notification preferences.  
**Actions:** Update profile, change password, manage preferences.  
**States:** Validation, email verification pending, save error, session reauthentication required.

### SC-38 — Notifications Center

**Purpose:** Review and navigate to user-relevant events.  
**Content:** Notification title/body, category, related asset/alert/incident/work order, timestamp, read state.  
**Actions:** Mark read/unread, open related record, mark all read if supported.  
**States:** Empty, unread, loading, error.  
**Notes:** Notification content must not reveal data from another organization.

### SC-39 — Audit Log

**Purpose:** Provide traceability for sensitive configuration and operational changes.  
**Content:** Actor, action, entity, timestamp, organization/site context, outcome, safe metadata.  
**Actions:** Filter by actor/action/date/entity, open entity if authorized.  
**States:** No records, no results, loading, access denied.  
**Notes:** Avoid displaying secrets, tokens, raw credentials, or unnecessarily sensitive payloads.

### SC-40 — Simulator Control

**Purpose:** Configure and control synthetic telemetry in development/demo environments.  
**Content:** Simulator badge, target asset/device, selected scenario, run state, sampling interval, last event, event rate, scenario description.  
**Actions:** Start, pause, resume, stop, select scenario, reset test stream where supported.  
**States:** Not configured, stopped, starting, running, paused, stopping, broker unavailable, worker unavailable, error.  
**Notes:** Must never look like a production device-control panel. Use an unmistakable Simulated label and keep destructive reset actions behind confirmation.

### SC-41 — Global Search / Quick Switcher

**Purpose:** Navigate to authorized sites, assets, alerts, incidents, or work orders quickly.  
**Content:** Search input, categorized results, recent items.  
**Actions:** Search, open result, keyboard navigation, close.  
**States:** Idle, typing, loading, results, no results, error.  
**Priority:** P1. Search results must be filtered server-side by authorization.

### SC-42 — Permission Denied / Access Error

**Purpose:** Explain that a user cannot access a route or action.  
**Content:** Concise message, safe context, link to a permitted destination, contact organization owner where appropriate.  
**Actions:** Return to dashboard, switch organization, request access.  
**States:** Missing membership, insufficient role, revoked access, resource not found (avoid leaking existence across tenants).  
**Notes:** Do not reveal whether a cross-tenant resource exists.

### SC-43 — System Status / Service Error

**Purpose:** Explain when a service dependency prevents a task.  
**Content:** Affected capability, user impact, time, retry guidance, reference/request ID if available.  
**Actions:** Retry, return, copy reference ID.  
**States:** API unavailable, database unavailable, telemetry delayed, simulator offline, partial failure.  
**Notes:** Distinguish system errors from user validation errors.

## 5. Shared Overlays and Components

These are not standalone routes but require design coverage:

| ID    | Overlay/component      | Trigger                        | Required behavior                                                          |
| ----- | ---------------------- | ------------------------------ | -------------------------------------------------------------------------- |
| OV-01 | Organization switcher  | Top bar                        | List memberships, show active tenant, handle loading and revoked access    |
| OV-02 | Site filter popover    | Page filter                    | Search/select/clear; persist only within agreed context                    |
| OV-03 | Notification panel     | Top bar                        | Show recent notifications and link to center                               |
| OV-04 | Create menu            | Header action                  | Show only permitted creation actions                                       |
| OV-05 | Confirm dialog         | Destructive/high-impact action | Explain consequence and require explicit confirmation                      |
| OV-06 | Assign-user dialog     | Assignment action              | Show eligible members and role/status; prevent invalid assignees           |
| OV-07 | Date/time range picker | Monitoring/analytics           | Provide presets and custom range with timezone clarity                     |
| OV-08 | Metric detail tooltip  | Chart point                    | Show metric, value, unit, observed time, quality/source                    |
| OV-09 | Command/search palette | Keyboard shortcut or search    | Search only authorized records                                             |
| OV-10 | Toast/inline feedback  | Save/action result             | State success/failure with next step; not sole evidence for critical state |
| OV-11 | Empty-state panel      | No records/data                | Explain why empty and provide relevant setup action                        |
| OV-12 | Data freshness badge   | Telemetry contexts             | Live/Delayed/Stale/No data/SIMULATED labels                                |

## 6. Global States Required Across Screens

Every data-driven page must specify applicable states:

- Initial loading.
- Background refresh.
- Empty because no records exist.
- Empty because the current filter returns no records.
- No telemetry ever received.
- Data stale/delayed.
- Simulator paused or unavailable.
- Partial data or partial dependency failure.
- Permission denied.
- Validation error.
- Network/API failure.
- Success after mutation.
- Unsaved changes.

## 7. Responsive and Adaptive Coverage

Every P0 screen must be designed for:

- Desktop wide (1440px reference).
- Desktop compact / laptop (1280px reference).
- Tablet (768–1024px range).
- Mobile (375–430px reference).

Not every dense table must preserve the same layout on mobile. It may transform into a card list, hide secondary columns behind details, or require a focused full-screen detail. Critical operational actions and status information must remain accessible.

## 8. Screen Inventory Review Checklist

- [ ] Every route in `sitemap.md` maps to one or more screen IDs.
- [ ] Every P0 user flow maps to a complete set of screens.
- [ ] Each screen has a primary user goal.
- [ ] Roles and read/write actions are specified.
- [ ] Required content and primary actions are listed.
- [ ] Empty, loading, error, stale, and offline states are assigned where applicable.
- [ ] Simulator-specific UI is unmistakably labeled.
- [ ] Asset detail remains the canonical context for equipment.
- [ ] Alerts, incidents, and work orders are separate concepts.
- [ ] P1/P2 items do not silently expand MVP scope.

## 9. Traceability

| Screen group              | Related flows       | Primary references                       |
| ------------------------- | ------------------- | ---------------------------------------- |
| Authentication/onboarding | UF-01–UF-03         | PRD authentication, tenancy, onboarding  |
| Sites/assets/sensors      | UF-04–UF-06         | PRD sites, assets, sensors, device model |
| Simulator/monitoring      | UF-07, UF-08, UF-16 | PRD simulator and telemetry contract     |
| Alerts/incidents          | UF-09–UF-11         | PRD alert and incident rules             |
| Work orders/maintenance   | UF-12–UF-14, UF-17  | PRD maintenance/work-order requirements  |
| Tenant/profile/admin      | UF-01, UF-02, UF-15 | PRD roles, membership, audit/security    |

---

**Document owner:** Product / UX Design  
**Review status:** Draft — use as the source checklist for wireframe coverage.
