# GridAware — Epics, User Stories & Acceptance Scenarios

**Version:** 1.1  
**Status:** Proposed backlog baseline  
**Related:** `PRD.md`, `target-users.md`, `functional-requirements.md`, `use-cases.md`

---

## 1. Purpose and usage

This backlog converts product needs into user-centered stories that can be planned, implemented, and tested. Stories are grouped into epics. Each story includes priority, rationale, acceptance scenarios, and requirement references.

A story is not complete merely because its UI exists. It must include backend authorization, validation, error handling, persistence behavior, and tests appropriate to its risk.

## 2. Priority model

- **P0:** Required for the first complete MVP workflow.
- **P1:** Important for the pilot or the next MVP increment.
- **P2:** Useful enhancement; defer unless capacity and evidence justify it.
- **Later:** Not part of the approved MVP.

## 3. Epic EP-01 — Authentication and organization access

### US-001 — Sign in

**As a** registered user, **I want** to sign in securely, **so that** I can access organizations and resources I am authorized to use.  
**Priority:** P0 · **References:** FR-AUTH-001

Acceptance scenarios:

- Given an active account and valid credentials, when I submit the sign-in form, then I receive an authenticated session and land on an authorized application view.
- Given invalid credentials, when I submit the form, then I see a generic failure message and no account-existence information is disclosed.
- Given a disabled account, when I attempt to sign in, then access is denied.
- Given repeated failed attempts, when the configured abuse threshold is reached, then additional attempts are rate-limited or otherwise protected.

### US-002 — View my profile and memberships

**As a** signed-in user, **I want** to view my profile and active organization memberships, **so that** I can select the correct workspace.  
**Priority:** P0 · **References:** FR-AUTH-003, FR-ORG-002

Acceptance scenarios:

- Only active memberships are shown.
- A membership from another user's account is never visible.
- Switching organization updates application context but does not bypass server-side authorization.

### US-003 — Create an organization

**As an** organization owner, **I want** to create an organization, **so that** I can manage facilities in a dedicated tenant workspace.  
**Priority:** P0 · **References:** FR-ORG-001

Acceptance scenarios:

- Creating an organization establishes the creator's owner membership.
- Failed creation leaves no orphaned partial records.
- A user outside the organization cannot retrieve it by guessing its ID.

### US-004 — Manage members

**As an** organization owner, **I want** to invite and manage organization members, **so that** the right people can perform operational tasks.  
**Priority:** P0 · **References:** FR-ORG-003

Acceptance scenarios:

- Owner can invite an eligible user using the selected invitation flow.
- Owner can change an allowed role and deactivate a membership.
- The last owner cannot be removed without a safe ownership-transfer process.
- Membership changes are audited.

## 4. Epic EP-02 — Site and asset registry

### US-005 — Create a site

**As an** organization owner or authorized facility manager, **I want** to create a site, **so that** I can organize assets by physical facility.  
**Priority:** P0 · **References:** FR-SITE-001

Acceptance scenarios:

- Site is created under the active organization.
- Required fields are validated.
- User cannot attach a site to another organization.
- Archived sites remain represented in relevant historical records.

### US-006 — Register a generator

**As a** maintenance engineer, **I want** to register a generator asset, **so that** telemetry and maintenance records can be associated with known equipment.  
**Priority:** P0 · **References:** FR-ASSET-001

Acceptance scenarios:

- Asset is linked to a site in the active organization.
- Asset type is Generator.
- Criticality can be set from the supported list.
- Optional manufacturer/model/serial fields do not block creation when unavailable.
- Duplicate asset identifiers follow the documented uniqueness rule.

### US-007 — View asset history

**As a** maintenance engineer, **I want** to see an asset's measurements, alerts, incidents, and maintenance history, **so that** I can investigate a condition with context.  
**Priority:** P0 · **References:** FR-ASSET-002

Acceptance scenarios:

- The page shows asset identity, location, status, and criticality.
- The page shows sensor data with units and freshness.
- Empty sections explain that no records exist yet.
- Related records remain within the authorized tenant/site scope.

### US-008 — Register and configure sensors

**As an** authorized engineer, **I want** to associate sensors and metrics with an asset, **so that** incoming readings are interpreted correctly.  
**Priority:** P0 · **References:** FR-SENSOR-001, FR-SENSOR-002

Acceptance scenarios:

- Sensor belongs to the selected asset.
- Metric and unit are required and validated.
- Unsupported metric/unit combinations are rejected or explicitly mapped.
- Sensor configuration changes are audited where sensitive.

## 5. Epic EP-03 — Simulator and telemetry

### US-009 — Start a normal simulator scenario

**As a** developer or demo operator, **I want** to generate repeatable normal generator telemetry, **so that** I can test monitoring without physical hardware.  
**Priority:** P0 · **References:** FR-SIM-001

Acceptance scenarios:

- Scenario has a documented identifier and configuration.
- Events include unique IDs, timestamps, values, metrics, and units.
- Data is labeled as simulated.
- A run can be reproduced sufficiently for regression testing.

### US-010 — Publish an abnormal scenario

**As a** developer or demo operator, **I want** to trigger a controlled abnormal generator scenario, **so that** alert and incident behavior can be tested.  
**Priority:** P0 · **References:** FR-SIM-002

Acceptance scenarios:

- Scenario produces the expected labeled condition.
- Ground-truth labels are not leaked into model input features.
- Scenario can be stopped/reset.
- Scenario limitations are documented.

### US-011 — Ingest telemetry safely

**As a** platform operator, **I want** incoming telemetry to be validated, authorized, deduplicated, and persisted, **so that** dashboards and alerts use trustworthy records.  
**Priority:** P0 · **References:** FR-TLM-001 through FR-TLM-005, FR-DEVICE-001

Acceptance scenarios:

- Valid messages are persisted with observed and ingestion times.
- Invalid messages are rejected or quarantined with a reason.
- Repeated event IDs do not create duplicate records.
- Unauthorized device/asset combinations are rejected.
- Accepted events can be accounted for as completed, pending, retried, or failed.

### US-012 — View current sensor readings

**As a** facility manager, **I want** to view current readings and freshness state, **so that** I can understand the latest reported equipment condition.  
**Priority:** P0 · **References:** FR-MON-001, FR-SENSOR-003

Acceptance scenarios:

- Value and unit are visible.
- Last observed/updated time is visible.
- Stale, offline, unknown, and normal are distinct.
- No data is not presented as healthy.

### US-013 — Explore historical telemetry

**As a** maintenance engineer, **I want** to inspect trends over a time range, **so that** I can compare current behavior with recent history.  
**Priority:** P0 · **References:** FR-MON-002, FR-TLM-005

Acceptance scenarios:

- User can select supported time ranges.
- Chart displays time and metric unit.
- Missing intervals remain visible or are clearly represented.
- Query is bounded and tenant-scoped.

## 6. Epic EP-04 — Rules and alerting

### US-014 — Configure threshold rules

**As an** authorized engineer, **I want** to configure threshold rules for supported metrics, **so that** the system can flag conditions that require review.  
**Priority:** P0 · **References:** FR-RULE-001

Acceptance scenarios:

- Rule includes metric, comparison, threshold, unit, severity, enabled state, and optional persistence/cooldown settings.
- Incompatible units are rejected.
- Rule changes are audited.

### US-015 — Receive a contextual alert

**As a** facility manager, **I want** to receive an alert containing the affected asset and evidence, **so that** I can decide whether investigation is required.  
**Priority:** P0 · **References:** FR-RULE-002, FR-RULE-003

Acceptance scenarios:

- Alert contains asset, sensor, metric, value, unit, timestamp, rule, and severity.
- Duplicate deliveries do not create duplicate alerts.
- Alert links to asset detail and relevant history.
- Detection source is clear (rule vs model).

### US-016 — Review an anomaly result

**As a** maintenance engineer, **I want** to review an anomaly score and its model context, **so that** I can use it as supporting evidence rather than an unexplained verdict.  
**Priority:** P1 · **References:** FR-ANOM-001

Acceptance scenarios:

- Detector name/version and analysis time are shown.
- Score/category definition is documented.
- Input data quality is visible.
- Model output is not labeled as a guaranteed failure prediction.

## 7. Epic EP-05 — Risk and prioritization

### US-017 — Set asset criticality

**As an** authorized manager, **I want** to set an asset's operational criticality, **so that** the system can display operational context when reviewing alerts.  
**Priority:** P0 · **References:** FR-RISK-001

Acceptance scenarios:

- Criticality options have documented descriptions.
- Change is permission-checked and audited.
- Unknown criticality is represented explicitly.

### US-018 — View risk context

**As a** facility manager, **I want** to view a risk indicator with its inputs and limitations, **so that** I can prioritize review transparently.  
**Priority:** P1 · **References:** FR-RISK-002

Acceptance scenarios:

- Indicator shows its calculation/model version.
- Missing/stale data is identified.
- UI describes it as a decision-support indicator.
- Users can access the underlying alert/measurement evidence.

## 8. Epic EP-06 — Incident management

### US-019 — Create and triage an incident

**As a** maintenance engineer, **I want** to create or triage an incident from an alert, **so that** a condition becomes a managed operational issue.  
**Priority:** P0 · **References:** FR-INC-001, FR-INC-002, FR-INC-005

Acceptance scenarios:

- Incident links to asset and triggering event(s).
- Status begins in the defined initial state.
- Severity and description are present.
- Triage is recorded with actor and time.

### US-020 — Assign an incident

**As a** facility manager, **I want** to assign an incident to an eligible engineer, **so that** investigation has clear ownership.  
**Priority:** P0 · **References:** FR-INC-003

Acceptance scenarios:

- Assignee is an active member of the same organization.
- Assignment is visible in the timeline.
- Cross-tenant assignment is rejected.

### US-021 — Resolve an incident

**As a** maintenance engineer, **I want** to resolve an incident with documented findings, **so that** the organization retains a useful record of what happened.  
**Priority:** P0 · **References:** FR-INC-004, FR-INC-005

Acceptance scenarios:

- Resolution notes and timestamp are required.
- Invalid transitions are rejected.
- Reopened incidents retain prior history.

## 9. Epic EP-07 — Work orders and maintenance

### US-022 — Create a work order

**As a** maintenance engineer, **I want** to create a work order linked to an asset and incident, **so that** the required action is explicit and trackable.  
**Priority:** P0 · **References:** FR-WO-001

Acceptance scenarios:

- Work order identifies asset, task, priority, status, and creator.
- Optional incident link is valid and tenant-consistent.
- Assignee is eligible if set.

### US-023 — View assigned work

**As a** technician, **I want** to see work orders assigned to me, **so that** I can prioritize my tasks.  
**Priority:** P0 · **References:** FR-WO-002

Acceptance scenarios:

- Only authorized assigned work is shown.
- Details include asset and location context.
- Technician cannot modify unrelated work orders.

### US-024 — Record work completion

**As a** technician, **I want** to record findings and completion notes, **so that** the engineer can review the result and the asset history remains complete.  
**Priority:** P0 · **References:** FR-WO-003, FR-MNT-001

Acceptance scenarios:

- Completion notes meet configured requirements.
- Actor and timestamp are recorded.
- Completing a work order does not silently resolve the incident unless policy says so.

## 10. Epic EP-08 — Notifications, analytics, and audit

### US-025 — Receive an assignment notification

**As an** assigned user, **I want** to be notified when work is assigned to me, **so that** I can respond without continuously refreshing the dashboard.  
**Priority:** P1 · **References:** FR-NOT-001

Acceptance scenarios:

- Notification is delivered to an authorized recipient.
- Link requires authentication and authorization.
- Failure to send an optional notification does not lose the underlying assignment.

### US-026 — Review operational summary

**As a** facility manager, **I want** to review asset, incident, and work-order summaries, **so that** I can understand outstanding operational work.  
**Priority:** P1 · **References:** FR-ANL-001

Acceptance scenarios:

- Summary respects organization/site scope.
- Metric definitions and reporting period are available.
- Stale or incomplete source data is not hidden.

### US-027 — Review audit history

**As an** organization owner, **I want** to review sensitive administrative and operational actions, **so that** I can understand who changed important records.  
**Priority:** P1 · **References:** FR-AUD-001

Acceptance scenarios:

- Audit entries contain actor, action, target, and timestamp.
- Unauthorized users cannot alter audit entries.
- Sensitive secrets are not displayed.

## 11. Definition of Ready

A story is ready for implementation when:

- Persona and user value are clear.
- Scope and non-goals are stated.
- Acceptance scenarios are testable.
- API/data dependencies are understood.
- Authorization requirements are identified.
- Error, empty, loading, and stale states are considered.
- Design or interaction behavior is available where UI is required.
- The story has requirement IDs and an agreed priority.

## 12. Definition of Done

A story is done when:

- Acceptance criteria pass.
- Backend validation and authorization are implemented.
- Unit/integration/E2E tests are added according to risk.
- Logs and operational errors are handled.
- API and user documentation are updated.
- Simulated data is labeled correctly.
- Requirement traceability is updated.
