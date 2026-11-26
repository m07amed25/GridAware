# GridAware — User Flow Specifications

**Document version:** 1.0  
**Status:** Draft for design review  
**Product baseline:** GridAware PRD v1.0  
**Design phase:** UX/UI — User Journeys  
**Product model:** Multi-tenant B2B SaaS  
**Initial operating mode:** Simulator only  
**Initial end-to-end asset:** Simulated generator  
**Brand foundation:** EVARAX palette (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`)

---

## 1. Purpose

This document defines the user journeys that must be represented in GridAware's UX/UI design. It describes the user's goal, entry point, preconditions, main path, decision points, alternate paths, failure states, permissions, and completion criteria.

The flows are product-level interaction specifications. They do not prescribe the final visual design or backend implementation. The diagrams should be translated into Figma flows and later verified against the PRD and API contracts.

## 2. Flow Design Principles

1. **One clear primary goal per flow.** Do not combine organization setup, asset configuration, and incident resolution into one long form.
2. **Keep context visible.** The user should know the active organization, site, asset, and current operational state while acting.
3. **Progressive setup.** Ask for the minimum information needed at each step; expose advanced configuration only when relevant.
4. **No silent success or failure.** Every submitted action must produce a visible result or actionable error.
5. **Protect against duplicate actions.** Disable duplicate submission while a request is pending and make critical operations idempotent at the service boundary.
6. **Respect role and tenant boundaries.** A user must not see or execute actions outside their organization membership and permissions.
7. **Represent data freshness.** No-data, paused simulator, stale telemetry, and offline device states must never look like healthy operation.
8. **Preserve an audit trail.** High-impact operational actions must leave a visible history entry when supported by the product.
9. **Do not overstate AI output.** The initial flow uses simulator data and rule-based alerts; predictive claims remain outside the first vertical slice until validated models exist.

## 3. Actors and Permissions

| Actor                    | Primary goals in these flows                                                        | Important restrictions                                                        |
| ------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Organization Owner       | Create organization, manage members, inspect organization status                    | May delegate limited administration; cannot bypass platform security controls |
| Facility Manager         | Configure sites/assets, monitor operations, review alerts, coordinate work          | Organization/site access applies                                              |
| Maintenance Engineer     | Configure equipment/sensors, review alert context, manage incidents and work orders | Cannot administer unrelated organizations                                     |
| Technician               | View assigned work, record inspection and completion details                        | Cannot change organization settings or manage sensor configuration by default |
| Viewer                   | View authorized dashboards, assets, and reports                                     | Read-only; no acknowledgements, assignment, configuration, or closure actions |
| Simulator (system actor) | Generate synthetic telemetry and scenario events                                    | Development/pilot data source only; clearly labeled as simulated              |
| GridAware system         | Validate telemetry, evaluate rules, create alerts, update workflow events           | Must apply idempotency, tenant validation, and audit rules                    |

## 4. Flow Catalogue

| Flow ID | Name                                      | Primary actor               | Priority | Release                                         |
| ------- | ----------------------------------------- | --------------------------- | -------- | ----------------------------------------------- |
| UF-01   | Register and create organization          | Organization Owner          | P0       | MVP                                             |
| UF-02   | Join an invited organization              | Invited User                | P0       | MVP if invitations are enabled in first release |
| UF-03   | Complete organization onboarding          | Organization Owner          | P0       | MVP                                             |
| UF-04   | Create a site                             | Owner / Facility Manager    | P0       | MVP                                             |
| UF-05   | Register a generator asset                | Facility Manager / Engineer | P0       | MVP                                             |
| UF-06   | Configure simulated device and sensors    | Engineer / Manager          | P0       | MVP                                             |
| UF-07   | Start and control a simulator scenario    | Engineer / Manager          | P0       | MVP, simulator environment                      |
| UF-08   | Monitor live and historical telemetry     | Manager / Engineer / Viewer | P0       | MVP                                             |
| UF-09   | Detect and review an alert                | Engineer / Manager          | P0       | MVP                                             |
| UF-10   | Convert an alert into an incident         | Engineer / Manager          | P0       | MVP                                             |
| UF-11   | Assign and investigate an incident        | Engineer / Manager          | P0       | MVP                                             |
| UF-12   | Create and assign a work order            | Engineer / Manager          | P0       | MVP                                             |
| UF-13   | Complete a work order                     | Technician                  | P0       | MVP                                             |
| UF-14   | Review and close operational work         | Engineer / Manager          | P0       | MVP                                             |
| UF-15   | Switch organization context               | Multi-organization user     | P0       | MVP                                             |
| UF-16   | Recover from no-data or simulator failure | Manager / Engineer          | P0       | MVP                                             |
| UF-17   | Review basic maintenance history          | Manager / Engineer / Viewer | P1       | MVP enhancement                                 |

## 5. UF-01 — Register and Create an Organization

**Goal:** A new customer owner creates an account and establishes the first tenant workspace.

**Entry points:** Public landing page → Sign up; or an approved registration link.

**Preconditions:** User has a valid email address and is not already authenticated.

**Main flow:**

1. User opens the registration page.
2. User enters name, email, and password (or follows the selected authentication method).
3. System validates required fields and password policy.
4. User submits the form.
5. System verifies the email if verification is enabled.
6. User chooses **Create an organization**.
7. User enters organization name and optional industry segment (Factory or Commercial Building).
8. System creates the organization and owner membership.
9. User is taken to organization onboarding with the new organization selected.

**Decision points and alternate paths:**

- If the email already exists, show a sign-in/recovery path rather than creating a duplicate account.
- If email verification is required, show a verification-pending state and a resend action.
- If organization creation fails, retain safe form values and show a retry action.
- If the user accepts an invitation instead, follow UF-02.

**Permissions and security:** The new user receives the Owner role only for the organization they created. Client-provided organization IDs are not trusted as proof of membership.

**Completion criteria:** The user is authenticated, the organization exists, an Owner membership is recorded, and the onboarding checklist is visible.

## 6. UF-02 — Join an Invited Organization

**Goal:** An existing or new user joins a tenant through a valid invitation.

**Main flow:**

1. User opens an invitation URL.
2. System validates the invitation token, expiration, email binding, and current status.
3. If unauthenticated, user signs in or creates an account using the invited email.
4. System presents the organization name and assigned role before acceptance.
5. User accepts the invitation.
6. Membership becomes active.
7. System routes the user to the organization landing page appropriate to their role.

**Alternate paths:** Expired, revoked, already-used, or mismatched-email invitations show a clear state with a safe next step. A user who is already a member sees an appropriate confirmation rather than a duplicate membership.

**Completion criteria:** The membership is active and the new organization appears in the organization switcher.

## 7. UF-03 — Complete Organization Onboarding

**Goal:** Help an Owner or authorized Manager move from an empty tenant to a usable initial workspace.

**Onboarding checklist:**

1. Confirm organization profile.
2. Create the first site.
3. Add the first asset (initial example: Generator 01).
4. Configure a simulated device and its sensors.
5. Start the simulator.
6. Confirm that telemetry is arriving.
7. Invite team members (can be skipped for a solo demo workspace).

**UX requirements:**

- Show progress without implying that skipped optional tasks are complete.
- Distinguish required setup from optional setup.
- Allow the user to resume later.
- Do not mark monitoring as active until valid telemetry is received.
- Provide links to the exact unfinished setup step.

**Completion criteria:** At least one site and one generator asset exist, the simulator is configured, and a valid telemetry event has been received. The workspace may still show incomplete optional setup items.

## 8. UF-04 — Create a Site

**Goal:** Create a physical or operational location under the active organization.

**Entry points:** Infrastructure → Sites → Add Site; onboarding checklist.

**Required information:** Site name. Optional fields may include site code, address, timezone, description, and segment-specific metadata.

**Main flow:**

1. User opens Add Site.
2. User enters required site details.
3. System validates required fields and organization-level uniqueness rules, if configured.
4. User saves.
5. Site detail page opens with an empty-state prompt to add an asset.

**Alternate paths:** Duplicate site code, missing required field, invalid timezone, or authorization failure must be shown inline or in a clear form-level message.

**Completion criteria:** Site appears in the site list and is selectable in relevant filters.

## 9. UF-05 — Register a Generator Asset

**Goal:** Register a maintainable generator under a site, optionally within a building or area.

**Required information:** Asset name, site, asset type, and a stable asset identifier or code according to the product's uniqueness policy.

**Optional information:** Manufacturer, model, serial number, installation date, criticality, description, building/area, and expected operating metadata.

**Main flow:**

1. User navigates to Infrastructure → Assets → Add Asset.
2. User selects the active site.
3. User selects Generator as the asset type.
4. User enters the asset name and required identifiers.
5. User sets criticality if permitted.
6. User reviews the summary.
7. User saves the asset.
8. System opens the asset detail page and prompts for sensor/device setup.

**Alternate paths:** If no site exists, guide the user to create one. If the user lacks create permission, hide or disable the action with a clear explanation. If a duplicate identifier is found, preserve form values and identify the conflicting field.

**Completion criteria:** The asset is visible under the correct organization/site and displays **Awaiting sensor setup** or equivalent, not Healthy.

## 10. UF-06 — Configure a Simulated Device and Sensors

**Goal:** Associate a simulator device with a generator and configure its telemetry metrics.

**Proposed initial generator metrics:** engine/coolant temperature, vibration, output voltage, output current or load percentage, frequency, and running state/operating hours. Exact metric definitions, units, and ranges must be documented by the simulator specification; the UI must not imply manufacturer-certified operating limits.

**Main flow:**

1. User opens the generator's Sensors tab.
2. User chooses Add Simulated Device.
3. System provisions or selects a simulator device identity scoped to the active tenant and asset.
4. User adds the available sensor/metric mappings.
5. For each metric, user reviews name, unit, and expected data type.
6. User confirms configuration.
7. System shows the device as Configured / Not yet sending until data arrives.

**Alternate paths:** Duplicate sensor mapping, unsupported unit, invalid metric, or device already assigned to another asset must be rejected with clear guidance.

**Security note:** Device-to-organization/site/asset mapping is stored in trusted configuration. Incoming message fields must not be treated as authoritative tenant ownership.

**Completion criteria:** A device and at least one valid metric mapping exist, and the asset page clearly shows that telemetry has not yet been received.

## 11. UF-07 — Start and Control a Simulator Scenario

**Goal:** Start a controlled synthetic telemetry stream for a configured asset.

**Main flow:**

1. Authorized user opens the asset's Simulator panel or development simulator console.
2. User selects a scenario, initially Normal Operation.
3. User reviews the scenario label and simulated-data warning.
4. User selects sampling interval or accepts the default, where exposed.
5. User starts the scenario.
6. UI shows Starting, then Running after the simulator confirms its state.
7. User may pause, resume, stop, or switch scenarios according to permissions.
8. Scenario transitions are reflected in the UI and recorded for traceability.

**Alternate paths:** If the broker is unavailable, show connection failure and preserve configuration. If the asset has no device configuration, route to UF-06. If the simulator process stops unexpectedly, display Simulator Offline and do not show stale readings as live.

**Completion criteria:** The simulator reports Running and valid telemetry is received. A Running badge alone is insufficient to prove data is arriving.

## 12. UF-08 — Monitor Live and Historical Telemetry

**Goal:** Understand current measurements and how they have changed over time.

**Main flow:**

1. User opens Monitoring or an asset's Monitoring tab.
2. User selects site/asset/metric as permitted.
3. UI shows the latest value, unit, event timestamp, freshness, and source.
4. User selects a time range.
5. Historical chart loads with loading, empty, or error state as appropriate.
6. User hovers/focuses chart points to inspect exact timestamps and values.
7. User may navigate to the related alert or asset detail page.

**Required behavior:**

- Display the difference between observed time and ingestion time where useful for diagnosing delayed data.
- Indicate simulated data visibly in the relevant page context.
- Use a defined stale threshold per stream/configuration; do not assume one universal value for all assets.
- Keep the selected metric and time range when navigating within the same asset context where feasible.
- A chart with no data must explain whether no telemetry has ever arrived, the selected range has no data, or the stream is stale.

**Completion criteria:** A user can identify the latest measurement, its unit and timestamp, inspect historical values, and understand whether the stream is current.

## 13. UF-09 — Detect and Review an Alert

**Goal:** Review a condition generated by a threshold rule or detector.

**Main flow:**

1. Telemetry processing evaluates a configured rule.
2. A condition is detected and an Alert is created or updated according to deduplication policy.
3. Notification indicator and Alerts list update.
4. User opens the alert.
5. Alert detail shows severity, status, affected asset, site, metric, observed value, threshold/rule, timestamp, and relevant chart context.
6. Authorized user acknowledges or dismisses the alert according to policy.
7. User chooses whether to create/link an incident, if not created automatically by an approved policy.

**Alternate paths:** If the alert is already acknowledged or resolved, show the latest status and actor. If the underlying data is stale, make data freshness prominent. If an alert is duplicated, show it as part of the existing alert/event history rather than creating a confusing second item.

**Completion criteria:** The user understands what was detected, why it was detected, which asset is affected, and what next action is available.

## 14. UF-10 — Convert an Alert into an Incident

**Goal:** Create an actionable operational case from a reviewed alert.

**Main flow:**

1. Authorized user selects Create Incident from the alert.
2. System pre-fills the affected asset, site, alert reference, description, and severity suggestion.
3. User reviews and edits title, priority, assignee, and description as permitted.
4. User submits.
5. System creates the incident and links the originating alert.
6. Alert detail shows the linked incident.
7. Incident detail opens with an event history entry.

**Rules:** A single alert should not create uncontrolled duplicate incidents. If an incident is already linked, the UI should open that incident or explain the existing relationship. The system may auto-create incidents only where a configured policy and PRD requirement explicitly allow it; do not imply automatic behavior in the design otherwise.

**Completion criteria:** Incident exists, is linked to the alert and asset, and appears in the incident queue.

## 15. UF-11 — Assign and Investigate an Incident

**Goal:** Establish ownership and record the investigation of an operational issue.

**Main flow:**

1. Engineer opens the incident queue.
2. Engineer filters by site, severity, status, or assignee.
3. Engineer opens an incident.
4. Engineer reviews alert context, asset, telemetry, and event history.
5. Engineer assigns an authorized team member.
6. Engineer changes status to the next valid state.
7. Engineer adds investigation notes or comments.
8. Engineer creates a work order if physical inspection or maintenance is required.

**Required UI cues:** Current status, allowed next actions, assignee, priority, affected asset, linked alert, related work orders, and chronological activity history.

**Alternate paths:** If assignee becomes unavailable, allow reassignment with an audit entry. If the user lacks permission, present read-only detail. Invalid state transitions must be rejected and explained.

**Completion criteria:** Incident has a valid owner, valid state, and a traceable investigation history.

## 16. UF-12 — Create and Assign a Work Order

**Goal:** Create a task with enough context for a technician to perform an inspection or maintenance action.

**Main flow:**

1. Engineer selects Create Work Order from an asset or incident.
2. System pre-fills organization, site, asset, and linked incident when applicable.
3. User enters title, task description, priority, due date (if required), instructions, and assignee.
4. User reviews the work order.
5. System creates the work order and notifies the assignee.
6. Work order appears in the open work queue and in asset/incident context.

**Alternate paths:** User may save a draft if supported. If no technician is available, allow an unassigned work order only if the product policy permits; clearly label it Unassigned. Invalid or past due dates are handled according to product rules and locale.

**Completion criteria:** Work order exists, is linked correctly, has a valid priority/status, and is visible to the assigned technician.

## 17. UF-13 — Complete a Work Order

**Goal:** Technician records the inspection or maintenance activity and submits it for review/closure.

**Main flow:**

1. Technician opens My Work Orders.
2. Technician selects a work order.
3. Technician reviews asset, location, instructions, linked incident, and safety notes supplied by the organization.
4. Technician starts work where a start action is supported.
5. Technician records findings, performed actions, parts/materials if supported, and completion notes.
6. Technician marks the task Ready for Review or Completed according to the configured workflow.
7. System records actor and timestamp.
8. Engineer/Manager reviews the result and closes the work order if approval is required.

**Alternate paths:** Technician may return the task to In Progress if more work is needed. A failed inspection may require a new incident or escalation rather than allowing the task to be marked successful. A rejected submission must explain missing information.

**Completion criteria:** Completion details are saved, status history is retained, and the work order is closed only by an authorized role if closure approval is required.

## 18. UF-14 — Review and Close Operational Work

**Goal:** Ensure the operational record is complete and related alert/incident states are consistent.

**Main flow:**

1. Engineer/Manager opens the work order completion submission.
2. Reviews technician findings and actions.
3. Confirms whether the equipment can return to the expected operational state (the platform records the decision; it does not control the equipment).
4. Approves or requests more information.
5. Closes the work order.
6. Updates the related incident to Resolved or another valid state when criteria are met.
7. Adds resolution summary.
8. System records the status transitions and updates asset maintenance history.

**Completion criteria:** Work order, incident, alert, and asset history links remain consistent and traceable.

## 19. UF-15 — Switch Organization Context

**Goal:** Move between organizations without exposing data from the previously selected tenant.

**Main flow:**

1. User opens organization switcher.
2. System lists active organization memberships only.
3. User selects another organization.
4. UI shows a loading/transition state and clears tenant-specific cached data.
5. System validates the membership and loads the new organization context.
6. Site selection is reset or restored only if valid in the new organization.
7. Dashboard displays the new tenant's data.

**Failure path:** If access was revoked during the switch, show an access error and route to a valid organization or sign-in state. Never briefly render cached data from the previous tenant under the new organization header.

## 20. UF-16 — Recover from No-Data or Simulator Failure

**Goal:** Help the user distinguish setup errors, paused simulation, disconnected device, and an expected empty time range.

**Decision logic:**

- No device configured → show Configure Device action.
- Device configured but never sent → show Waiting for First Telemetry.
- Simulator paused → show Paused and Resume action for permitted users.
- Simulator process offline → show Simulator Offline and troubleshooting action.
- Data older than configured freshness threshold → show Stale / Last received timestamp.
- Selected time range contains no records but recent stream is active → show No data in selected range.
- Service unavailable → show system error and retry guidance, not a false zero value.

**Completion criteria:** User can identify the reason for missing data and take an appropriate action or report a service issue.

## 21. Cross-Flow Rules

### 21.1 Context preservation

When moving from asset → alert → incident → work order, preserve links and display relevant asset/site context. Breadcrumbs should help users return to the asset or incident without losing the current operational record.

### 21.2 Status language

Use distinct terms for device connection, telemetry freshness, asset operational state, alert status, incident status, and work-order status. Do not reuse one generic label such as "Active" for all domains without a qualifier.

### 21.3 Confirmation

Ask for confirmation before destructive or difficult-to-reverse actions such as deleting an asset, revoking an invitation, or permanently dismissing an alert if supported. Do not add confirmation dialogs to low-risk navigation or filter changes.

### 21.4 Permissions

If an action is not allowed, prefer hiding it when its existence would confuse the user. If a workflow requires a visible explanation (for example, a read-only detail page), render a disabled action with a concise reason. Backend authorization is mandatory regardless of UI behavior.

### 21.5 Simulated data labeling

Use a consistent **SIMULATED DATA** label or equivalent for simulator-originated telemetry, charts, alerts, and reports. Keep it visible enough to prevent screenshots or exports from being mistaken for production field data.

## 22. Figma Flow Deliverables

Create one Figma flow per journey group:

1. **Account & Organization:** UF-01 to UF-03.
2. **Infrastructure Setup:** UF-04 to UF-07.
3. **Monitoring & Alerts:** UF-08 to UF-10 and UF-16.
4. **Incident & Maintenance:** UF-11 to UF-14.
5. **Tenant Navigation:** UF-15.

Each Figma flow must show the happy path plus at least one relevant error/empty/permission branch. Label nodes with Flow IDs so they can be traced to this document.

## 23. User Flow Acceptance Criteria

- [ ] Every P0 journey in the catalogue has a diagram and written steps.
- [ ] Each flow identifies actor, entry point, preconditions, success state, and alternate paths.
- [ ] Tenant switching includes cached-data isolation behavior.
- [ ] Simulator setup and simulator failure are represented separately.
- [ ] Telemetry UI distinguishes never received, stale, paused, and selected-range empty states.
- [ ] Alert, incident, and work-order lifecycles are distinct.
- [ ] Technician and Viewer restrictions are visible in the design.
- [ ] High-impact actions include appropriate confirmation or review.
- [ ] Every P0 flow can be completed without relying on an undocumented screen.
- [ ] Figma flow nodes use the same names and IDs as this specification.

## 24. Traceability

| Flow        | Related PRD areas                              | Related design files                                           |
| ----------- | ---------------------------------------------- | -------------------------------------------------------------- |
| UF-01–UF-03 | Authentication, tenancy, onboarding, roles     | `screen-inventory.md`, `wireframe-specifications.md`           |
| UF-04–UF-07 | Sites, assets, sensors, simulator requirements | `screen-inventory.md`, `wireframe-specifications.md`           |
| UF-08       | Telemetry, monitoring, data freshness          | `screen-inventory.md`, `interaction-specifications.md`         |
| UF-09–UF-10 | Thresholds, alerts, incident rules             | `screen-inventory.md`, `interaction-specifications.md`         |
| UF-11–UF-14 | Incident lifecycle, work orders, maintenance   | `screen-inventory.md`, `interaction-specifications.md`         |
| UF-15       | Tenant isolation and memberships               | `information-architecture.md`, `design-acceptance-criteria.md` |
| UF-16       | Simulator and telemetry reliability            | `wireframe-specifications.md`, `interaction-specifications.md` |

---

**Document owner:** Product / UX Design  
**Review status:** Draft — requires walkthrough against PRD v1.0 before wireframe sign-off.
