# GridAware — Interaction Specifications

**Document version:** 1.0  
**Status:** Draft for interaction design and frontend handoff  
**Product baseline:** GridAware PRD v1.0  
**Related documents:** `user-flows.md`, `screen-inventory.md`, `wireframe-specifications.md`, `design-system.md`  
**Product model:** Multi-tenant B2B SaaS  
**Initial mode:** Simulator only

---

## 1. Purpose

This document specifies how GridAware UI elements behave after a user clicks, types, selects, submits, navigates, or receives an asynchronous update. It covers interaction states, validation, feedback, permissions, real-time telemetry, incident/work-order transitions, and error recovery.

The document complements the screen inventory: the screen inventory says what exists; this document defines how it behaves.

## 2. Global Interaction Principles

1. Every interactive control has a clear purpose and visible affordance.
2. Every action provides timely feedback: pending, success, or actionable failure.
3. Prevent duplicate submissions for create/update operations.
4. Preserve safe user input when a request fails validation or has a recoverable network error.
5. Do not silently discard unsaved changes.
6. Never use color or animation as the only status signal.
7. Respect role permissions in the UI and enforce them again in the backend.
8. Clear tenant-scoped client cache when organization context changes.
9. Distinguish current, stale, delayed, missing, and simulated data.
10. Confirm destructive or high-impact actions, not routine navigation.

## 3. Navigation and Context Interactions

### 3.1 Sidebar

- Clicking a parent group expands/collapses it when it contains children.
- Clicking a route navigates to that route and updates active styling.
- Active child route keeps its parent group expanded.
- Collapsed sidebar icons expose accessible labels/tooltips.
- Keyboard navigation must support focus and activation.
- On mobile, route selection closes the navigation drawer after navigation succeeds.

### 3.2 Organization switcher

**Open:** Click/tap organization identity in top bar.  
**List:** Show active memberships only, with organization name and optional segment.  
**Select:** On selection, show a transition state, clear tenant-specific caches, validate membership, then load the new tenant.  
**Failure:** If membership is revoked or unavailable, show a safe error and do not render cached records from the previous tenant.  
**Focus:** Return focus to the switcher after closing without selection.

### 3.3 Site filter

- The filter is a page-level query control, not a permission boundary.
- Options are limited to sites accessible in the active organization.
- Selecting a site updates relevant data and the visible filter chip.
- Clear action returns to All Sites or the page's defined default.
- If the selected site is deleted or access changes, clear it and show a non-blocking explanation.
- Preserve site filter only where the PRD/product design defines shared context. Do not unexpectedly leak a site filter into unrelated modules.

### 3.4 Breadcrumbs

- Each breadcrumb navigates to a valid parent route.
- Current page is not an active link.
- Breadcrumb context must reflect the active organization and resource hierarchy.
- Do not include inaccessible parents in a way that reveals another tenant's metadata.

## 4. Forms and Validation

### 4.1 General form behavior

- Labels remain visible after values are entered.
- Required and optional fields are consistently identified.
- Validation runs on submit and may run on blur for simple fields; avoid aggressive validation while the user is still typing.
- Error messages explain how to correct the field.
- Form-level/server errors appear near the form heading or submit area.
- Submission disables duplicate submit actions and shows progress.
- If a server error occurs, preserve user-entered values when safe.
- Successful submission confirms the saved record and gives a sensible next action.

### 4.2 Unsaved changes

If a user edits a form and navigates away, show a confirmation only when changes would actually be lost. The dialog offers Stay and Discard; a Save Draft option appears only if drafts are supported. Do not show this dialog when no changes exist.

### 4.3 Field validation patterns

| Field type        | Interaction rule                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| Name              | Trim whitespace; require non-empty value; show length limits if applicable                                |
| Identifier/code   | Normalize according to policy; show duplicate conflicts without clearing the value                        |
| Email             | Validate format; do not expose account existence in recovery flows                                        |
| Password          | Show requirements before submission; provide visibility toggle accessible to keyboard/screen reader       |
| Date/time         | Show timezone; reject invalid range; explain due-date constraints                                         |
| Numeric metric    | Validate type, precision, and allowed schema range; show unit separately                                  |
| Unit              | Select from supported units; do not allow arbitrary incompatible unit changes without a conversion policy |
| Assignee          | List only eligible active members with required access                                                    |
| Description/notes | Preserve content; show character guidance if limits exist                                                 |

### 4.4 Create/update confirmation

Routine create/update operations should not require a redundant confirmation after the user submits a well-labeled form. Confirm before irreversible deletion, membership removal/revocation, or simulator reset if it can discard important test state.

## 5. Tables, Lists, and Filters

### 5.1 Sorting

- Sortable columns show current direction.
- Default sort is documented per list.
- Sort changes preserve filters and pagination when possible.
- Numeric/date sorting must use underlying values, not formatted strings.

### 5.2 Filtering

- Filter state is visible as chips or selected controls.
- Clear all resets to the documented default.
- No-results state differs from no-records state.
- Filters must be applied consistently to counts and visible rows.
- Tenant and authorization scope must be applied server-side regardless of frontend filters.

### 5.3 Row interactions

- If a row navigates, action buttons inside the row must not trigger row navigation accidentally.
- Keyboard users can reach the row destination and actions separately.
- Destructive actions live in a clearly labeled menu or dialog, not an accidental row-click target.

### 5.4 Pagination and loading

- Keep current filters/sort when moving between pages.
- Show loading state without losing page context.
- If a result set changes due to live updates, avoid unexpectedly moving the user's current row or changing page without notice.

## 6. Telemetry and Real-Time Interactions

### 6.1 Data labels

Every telemetry context must be able to show:

- Metric name.
- Current/most recent value.
- Unit.
- Observed timestamp.
- Last received/ingested timestamp where relevant.
- Data quality.
- Source label (Simulator in the initial release).
- Freshness state.

### 6.2 Freshness states

Recommended UI state vocabulary:

| State                  | Meaning                                                       | UI treatment                                   |
| ---------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Waiting for first data | No valid telemetry has ever arrived                           | Neutral empty state and setup guidance         |
| Live / Current         | Latest data is within configured freshness window             | Neutral status plus last-update time           |
| Delayed                | Data is arriving later than expected                          | Warning/info treatment and delay context       |
| Stale                  | Latest data exceeds configured freshness threshold            | Explicit stale label and last received time    |
| Offline                | Device/broker/simulator connection is known to be unavailable | Offline state, not healthy                     |
| Unknown                | System cannot reliably determine status                       | Unknown label and explanation                  |
| Simulated              | Data source is synthetic                                      | Persistent SIMULATED label in relevant context |

Freshness thresholds should be configured per stream/device class or product policy; do not hardcode a universal number without validation.

### 6.3 Live updates

- Live values update without full-page reload.
- Show a small last-updated indicator.
- Avoid shifting the page when values change width; use tabular numerals and stable containers.
- If updates stop, transition to delayed/stale according to the freshness policy.
- If the real-time channel disconnects but historical query remains available, explain that live updates are disconnected while the last known data remains visible.
- Reconnect behavior must not create duplicate chart points or duplicate alerts.

### 6.4 Historical queries

- Changing time range shows a loading state within the chart region.
- Invalid ranges show inline validation and do not issue a misleading query.
- Empty ranges explain that no records exist for the selected interval.
- Chart points preserve their source timestamps; display formatting may use the user's selected timezone.
- Do not interpolate missing data as normal operation by default.

### 6.5 Simulator controls

- Start is enabled only when device/asset configuration is valid.
- Start changes state to Starting; show Running only after confirmation.
- Pause and Resume reflect confirmed simulator state.
- Stop asks for confirmation only if the action could disrupt an active demo/test; otherwise provide clear immediate feedback.
- Scenario switch should explain that generated data behavior will change.
- Simulator process failure must show Simulator Offline, not just a frozen Running label.
- All simulator-originated records remain labeled as simulated.

## 7. Alert Interactions

### 7.1 Alert acknowledgement

- Acknowledge is available only to authorized roles and valid alert states.
- On action, show pending state and prevent repeated submission.
- On success, update status, actor, and timestamp in the history.
- If the alert changed since the page loaded, refresh its current state and explain the conflict.

### 7.2 Alert detail

- Show trigger reason, value, threshold/rule, asset, site, event time, and freshness.
- Create Incident action prefills relevant context.
- If an incident is already linked, show Open Incident instead of creating another by default.
- Duplicate/merged alert state should link to the canonical record if the backend supports deduplication.

### 7.3 Alert state changes

Only valid transitions are available. Do not expose a generic status dropdown allowing arbitrary state changes. If a state is no longer valid due to a concurrent update, display the new state and offer refresh.

## 8. Incident Interactions

### 8.1 Status transitions

The UI should present allowed next actions based on the current incident state and actor permissions. The initial lifecycle is expected to include states such as Detected, Triaged, Assigned, Investigating, Resolved, and Closed; exact transition rules must follow the PRD/backend state machine.

### 8.2 Assignment

- Assignee picker searches active eligible members.
- Show name, role, and relevant site eligibility where available.
- Require an assignee only if the business rule requires it for the selected transition.
- Reassignment creates an activity entry.
- If selected assignee becomes invalid before save, preserve the form and request a new choice.

### 8.3 Investigation notes

- New notes are timestamped and attributed to the author.
- Clarify whether notes are editable/deletable; audit-sensitive records should not be silently overwritten.
- Provide empty state explaining what an investigation note is for.

### 8.4 Resolution

- Resolution requires a summary when mandated by the PRD.
- If open work orders remain, show a warning or block closure according to policy.
- Confirm only if closure is difficult to reverse or closes related records.
- Update the incident timeline and related asset history on success.

## 9. Work Order Interactions

### 9.1 Creation

- When launched from an asset or incident, prefill linked context.
- Validate asset and assignee belong to the same organization and are eligible.
- Show priority and due date clearly.
- Warn if no assignee is selected when assignment is required.

### 9.2 Technician execution

- My Work Orders is the technician's primary queue.
- Detail page prioritizes instructions, asset/location, linked incident, and required completion fields.
- Start work is available only for valid statuses and authorized assignees.
- Completion form retains values after validation error.
- Submission creates a visible history entry.

### 9.3 Review and closure

- Reviewer sees technician findings and completion details before approval.
- Request Changes returns the task to a valid work state and captures a reason if required.
- Close action is permission-gated.
- A closed work order cannot be silently edited; any correction path must be explicit and audited.

## 10. Notifications

- Notification item is clickable when it has a valid related destination.
- Read/unread state is distinguishable without color alone.
- Mark-as-read is optimistic only if failure can be recovered; otherwise wait for server confirmation.
- Notification list updates for authorized user events only.
- Switching organizations resets the notification context to the new tenant according to the data model.
- Critical incident state remains available in Incidents even if the notification is dismissed.

## 11. Dialogs, Drawers, and Menus

### Dialog rules

- Use for confirmations and short focused tasks.
- Title describes the decision, not a generic "Are you sure?".
- Primary action uses a verb (Delete Site, Revoke Invitation, Stop Simulator).
- Destructive action uses semantic critical styling.
- Focus is trapped while open and restored after close.
- Escape closes only if it is safe to dismiss without losing required input.

### Drawer rules

- Preserve parent-page context when showing detail or quick-edit.
- Include a clear title and close action.
- On mobile, drawer may become a full-screen page/sheet.

### Menu rules

- All items are keyboard accessible.
- Disabled items explain why when discoverability is important.
- Menus do not contain unrelated actions.

## 12. Loading, Empty, Error, and Success Feedback

| State                 | Behavior                                                           | Avoid                                           |
| --------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Initial loading       | Skeleton or progress indicator matching content shape              | Blank page with no feedback                     |
| Background refresh    | Small refresh state; preserve existing data with timestamp         | Full-page flash on every update                 |
| Empty                 | Explain why empty and give next action                             | Zero-value chart that implies measured data     |
| Filtered empty        | Show active filters and Clear filters                              | Same copy as first-run empty                    |
| Validation error      | Inline field message and summary if needed                         | Generic "Something went wrong"                  |
| Network/API error     | Explain unavailable action, preserve input, offer retry            | Silent failure or false success                 |
| Permission error      | Safe explanation and route back/request access                     | Exposing cross-tenant resource existence        |
| Success               | Update page and show persistent state change; toast can supplement | Toast as the only evidence of a critical change |
| Conflict/stale update | Refresh current state and explain that data changed                | Overwriting newer state silently                |

## 13. Accessibility Interactions

- Every control is keyboard reachable in logical order.
- Focus is visible and not obscured by sticky headers.
- Dialog focus is managed correctly.
- Chart values have a non-hover-only way to inspect critical details.
- Live updates do not overwhelm screen readers; use restrained announcements for meaningful state changes only.
- Error messages are associated with inputs.
- Status badges expose textual values.
- Reduced motion preferences are respected.
- Touch controls have adequate hit areas.

## 14. Analytics and Tracking Events

If product analytics are added, event names should describe user actions, not expose sensitive values. Proposed events:

- `organization_created`
- `site_created`
- `asset_created`
- `sensor_configured`
- `simulator_started`
- `telemetry_first_received`
- `monitoring_viewed`
- `alert_acknowledged`
- `incident_created`
- `incident_assigned`
- `work_order_created`
- `work_order_started`
- `work_order_submitted`
- `work_order_closed`

Do not send raw telemetry payloads, secrets, personal data, or sensitive notes to generic product analytics. Define consent, retention, and tenant aggregation rules before enabling analytics collection.

## 15. Interaction Acceptance Checklist

- [ ] Every button/control has a documented behavior.
- [ ] Forms provide consistent validation and pending states.
- [ ] Duplicate submissions are prevented.
- [ ] Unsaved changes are protected.
- [ ] Organization switching clears tenant-specific data.
- [ ] Live/stale/offline/no-data/simulated states are distinct.
- [ ] Chart interaction exposes exact value, unit, and time.
- [ ] Alert and incident transitions follow allowed state paths.
- [ ] Work-order completion and review are role-aware.
- [ ] Errors preserve safe user input and explain next steps.
- [ ] Keyboard, screen-reader, and reduced-motion interactions are covered.
- [ ] Destructive actions have appropriate confirmation.

---

**Document owner:** UX Design / Frontend Engineering  
**Review status:** Draft for interaction specification review.
