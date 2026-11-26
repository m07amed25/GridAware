# GridAware — Use Case Specification

**Version:** 1.1  
**Status:** MVP use-case baseline  
**Related:** `PRD.md`, `target-users.md`, `functional-requirements.md`, `user-stories.md`

---

## 1. Purpose

This document describes the main interactions between GridAware actors and the system. Use cases provide a shared understanding of behavior before detailed UI and API design. They define actors, preconditions, triggers, main flows, alternate flows, and postconditions.

## 2. Actors

| Actor                | Type             | Responsibility                                             |
| -------------------- | ---------------- | ---------------------------------------------------------- |
| Organization Owner   | Human            | Manages organization membership and settings               |
| Facility Manager     | Human            | Oversees assets and operational status in assigned scope   |
| Maintenance Engineer | Human            | Investigates alerts and coordinates maintenance decisions  |
| Technician           | Human            | Executes assigned work orders and records findings         |
| Viewer               | Human            | Reviews authorized information without write permissions   |
| Simulator            | System           | Publishes generated telemetry for approved devices/assets  |
| MQTT Broker          | System           | Routes simulator messages to authorized subscribers        |
| Ingestion Worker     | System           | Validates, deduplicates, and persists telemetry            |
| Rules Engine         | System           | Evaluates configured threshold rules                       |
| AI Service           | System, optional | Returns evaluated model outputs using documented contracts |
| Notification Service | System           | Delivers approved user notifications                       |

## 3. UC-01 — Create an organization

**Primary actor:** Organization Owner  
**Goal:** Establish a tenant workspace for facilities and users.  
**Priority:** P0  
**Related requirements:** FR-ORG-001, FR-AUTH-001  
**Trigger:** User selects **Create Organization**.

### Preconditions

- User is authenticated.
- The onboarding policy permits the user to create an organization.

### Main flow

1. System displays the organization setup form.
2. User enters required organization details.
3. User submits the form.
4. System validates the input and checks any uniqueness rule.
5. System creates the organization.
6. System creates an active owner membership for the creator.
7. System writes the relevant audit event.
8. System displays the new organization workspace.

### Alternate/exception flows

- **A1 — Validation failure:** System highlights invalid fields; no organization is created.
- **A2 — Name/slug conflict:** System explains the conflict without exposing another tenant's private details.
- **A3 — Persistence failure:** System returns a safe error and avoids partial organization/membership state through a transaction or compensating procedure.
- **A4 — Permission failure:** System denies the operation and records a security-relevant event where appropriate.

### Postconditions

One organization exists and the creator has active owner membership.

### Acceptance checks

- Creator can access the organization.
- An unrelated user cannot retrieve it by guessing its ID.
- Owner membership and organization creation are consistent.

## 4. UC-02 — Create a site

**Primary actor:** Organization Owner or authorized Facility Manager  
**Goal:** Create a physical facility under an organization.  
**Priority:** P0  
**Related requirements:** FR-SITE-001

### Preconditions

- User is authenticated.
- User has active membership and site-management permission in the selected organization.

### Main flow

1. User selects the active organization.
2. User opens **Sites**.
3. User selects **Add Site**.
4. User enters site name and available location details.
5. System validates permission and fields.
6. System creates the site under the active organization.
7. System records the action where audit policy requires it.
8. Site appears in the site's list and becomes selectable for asset registration.

### Alternate/exception flows

- **A1 — No permission:** Request is denied.
- **A2 — Cross-tenant relationship:** Request is rejected if the selected organization/site context is not authorized.
- **A3 — Optional address incomplete:** System accepts only fields defined as optional; it does not invent missing address values.

### Postconditions

The site belongs to exactly one organization and can contain buildings/assets according to the configured hierarchy.

## 5. UC-03 — Register a generator asset

**Primary actor:** Facility Manager or Maintenance Engineer  
**Goal:** Create an asset record for a generator.  
**Priority:** P0  
**Related requirements:** FR-ASSET-001, FR-RISK-001

### Preconditions

- Organization and site exist.
- User has asset-creation permission in the selected scope.

### Main flow

1. User opens the selected site.
2. User selects **Add Asset**.
3. User chooses **Generator** as asset type.
4. User enters name, identifier, criticality, status, and available specifications.
5. User submits the form.
6. Backend verifies membership, permission, and site ownership.
7. Backend validates asset fields and uniqueness constraints.
8. Backend creates the asset.
9. UI displays the asset detail page and its initial monitoring state.

### Alternate/exception flows

- **A1 — Cross-tenant site:** Reject without exposing the site's private details.
- **A2 — Duplicate tag:** Show a conflict according to the organization-level uniqueness policy.
- **A3 — Unknown manufacturer data:** Allow creation if the fields are optional.
- **A4 — Missing criticality:** Preserve an explicit unknown/default state rather than silently assigning a misleading value.

### Postconditions

The generator has a stable ID and belongs to one site and one organization.

## 6. UC-04 — Configure generator sensors

**Primary actor:** Maintenance Engineer  
**Goal:** Define sensors and metrics expected from the simulator.  
**Priority:** P0  
**Related requirements:** FR-SENSOR-001, FR-SENSOR-002

### Preconditions

- Generator asset exists.
- User has sensor-configuration permission.

### Main flow

1. User opens the generator.
2. User opens **Sensors**.
3. User adds a sensor with display name.
4. User selects a metric and supported unit.
5. User configures expected reporting interval where supported.
6. System validates metric/unit compatibility.
7. System stores the sensor under the selected asset.
8. UI displays the sensor with an initial **No Data Yet** state.

### Alternate/exception flows

- **A1 — Unsupported metric/unit:** Reject with an actionable message.
- **A2 — Duplicate sensor identifier:** Reject or require an explicit mapping decision.
- **A3 — Unauthorized user:** Deny operation.
- **A4 — Asset archived:** Do not permit new sensor registration unless the product policy explicitly allows it.

### Postconditions

Sensor is associated with the asset and has a defined measurement contract.

## 7. UC-05 — Run a normal simulator scenario

**Primary actor:** Simulator operator/developer  
**System actors:** Simulator, MQTT Broker, Ingestion Worker  
**Goal:** Generate repeatable telemetry for a registered generator.  
**Priority:** P0  
**Related requirements:** FR-SIM-001, FR-DEVICE-001, FR-TLM-001 through FR-TLM-004

### Preconditions

- Generator and sensors are configured.
- Simulator identity is authorized for the relevant asset/sensor scope.
- MQTT broker and ingestion path are available.

### Main flow

1. Operator selects a normal-operation scenario.
2. Simulator loads scenario configuration and run identifier.
3. Simulator generates measurements with event IDs, observed timestamps, metric names, values, and units.
4. Simulator publishes messages to the authorized topic.
5. Ingestion Worker receives the message.
6. Worker authenticates/validates the source identity.
7. Worker validates payload schema and resource mapping.
8. Worker checks event identity for duplicates.
9. Worker persists valid measurements.
10. Processing pipeline updates sensor last-seen state.
11. Monitoring API makes readings available to authorized users.

### Alternate/exception flows

- **A1 — Invalid payload:** Reject or quarantine and record the validation reason.
- **A2 — Duplicate event:** Do not repeat persistence or downstream business effects.
- **A3 — Broker unavailable:** Simulator records publish failure and applies documented retry behavior.
- **A4 — Database unavailable:** Accepted data remains recoverable; the system does not silently discard it.
- **A5 — Unknown sensor/device mapping:** Reject because source identity is not authorized for the target resource.

### Postconditions

Valid measurements are stored and attributable to the simulator identity and scenario run.

## 8. UC-06 — View current and historical monitoring

**Primary actor:** Facility Manager or Maintenance Engineer  
**Goal:** Understand current measurements and recent behavior.  
**Priority:** P0  
**Related requirements:** FR-MON-001, FR-MON-002, FR-TLM-005, FR-SENSOR-003

### Preconditions

- User can access the organization/site/asset.
- Measurements exist, or the asset has an explicit no-data state.

### Main flow

1. User opens the asset detail page.
2. System displays asset identity, location, sensor list, and latest valid readings.
3. Each value appears with metric name, unit, and last-observed time.
4. User selects a time range.
5. System runs a bounded, tenant-scoped historical query.
6. UI displays trend data and identifies missing/stale intervals.

### Alternate/exception flows

- **A1 — No measurements:** Display a no-data state and simulator setup guidance.
- **A2 — Stale sensor:** Display stale/offline state; do not show the last value as current without a stale indicator.
- **A3 — Range too large:** Require a smaller time range or aggregated result.
- **A4 — Unauthorized asset:** Deny query.
- **A5 — Partial history:** Show the available range and disclose gaps.

### Postconditions

User has a contextual view of available readings without stale data being misrepresented as healthy.

## 9. UC-07 — Generate a threshold alert

**Primary actor:** Rules Engine  
**Supporting actor:** Maintenance Engineer or Facility Manager  
**Goal:** Create a contextual event when a configured rule is satisfied.  
**Priority:** P0  
**Related requirements:** FR-RULE-001, FR-RULE-002, FR-RULE-003

### Preconditions

- Sensor and metric are configured.
- An enabled rule exists.
- Valid telemetry is available.

### Main flow

1. Valid telemetry enters the processing pipeline.
2. Rules Engine identifies matching rules.
3. Engine checks metric, unit, comparison, persistence, and cooldown conditions.
4. Engine records evaluation outcome.
5. If the rule is satisfied, system creates a contextual alert/event.
6. System links the event to the correct asset and sensor.
7. UI updates the alert list and relevant asset view.

### Alternate/exception flows

- **A1 — Unit mismatch:** Do not evaluate incompatible units as equivalent; reject/quarantine according to policy.
- **A2 — Duplicate event:** Do not create another logical alert.
- **A3 — Disabled rule:** No alert is created from that rule.
- **A4 — Stale sensor:** Show data-quality state and avoid inferring normal operation.
- **A5 — Rule changed during processing:** Evaluation must use a defined rule version/snapshot.

### Postconditions

A traceable alert exists, or the evaluation is recorded as not triggered.

## 10. UC-08 — Triage and assign an incident

**Primary actor:** Maintenance Engineer or Facility Manager  
**Goal:** Turn an alert into an owned operational issue.  
**Priority:** P0  
**Related requirements:** FR-INC-001 through FR-INC-005

### Preconditions

- Alert exists.
- User has incident triage permission.

### Main flow

1. User opens the alert.
2. User reviews asset, measurement, rule, timestamp, data quality, and history.
3. User selects **Create Incident** or opens an existing deduplicated incident.
4. User confirms title, description, severity, and priority.
5. System creates/updates the incident.
6. User assigns an eligible organization member.
7. System records triage and assignment events.
8. Assignee sees the incident in their authorized work queue.

### Alternate/exception flows

- **A1 — Permission denied:** Operation is rejected.
- **A2 — Ineligible assignee:** Assignment is rejected if user is inactive or outside the organization.
- **A3 — Existing active incident:** System points the user to the existing incident according to deduplication policy.
- **A4 — Concurrent assignment:** System detects stale update/version conflict and asks the user to refresh or retry.

### Postconditions

Incident has clear ownership and an auditable timeline.

## 11. UC-09 — Create and complete a work order

**Primary actors:** Maintenance Engineer, Facility Manager, Technician  
**Goal:** Assign, execute, and document maintenance work.  
**Priority:** P0  
**Related requirements:** FR-WO-001 through FR-WO-003, FR-MNT-001

### Preconditions

- Asset exists.
- User has the appropriate work-order permission.

### Main flow

1. Engineer creates a work order linked to an asset and optionally an incident.
2. Engineer enters task description, priority, and due information if supported.
3. Engineer assigns an eligible technician.
4. System records creation and assignment.
5. Technician opens assigned work.
6. Technician reviews asset location and reported condition.
7. Technician updates status and records findings/action.
8. Technician submits completion.
9. Engineer/manager reviews the completion.
10. Incident is resolved separately according to policy.

### Alternate/exception flows

- **A1 — Assignee deactivated:** Work must be reassigned or visibly marked as needing reassignment.
- **A2 — Missing completion notes:** Reject completion if notes are required by work-order policy.
- **A3 — Work blocked:** Technician records blocked status/reason if that state is supported.
- **A4 — Work completed but incident open:** This is allowed until an authorized user resolves the incident.
- **A5 — Asset archived during work:** Preserve work history and apply explicit policy to whether work can continue.

### Postconditions

Work order has a documented outcome and asset history can reference it.

## 12. UC-10 — Review operational summary

**Primary actor:** Organization Owner or Facility Manager  
**Goal:** Review authorized asset, incident, and work-order status at organization/site level.  
**Priority:** P1  
**Related requirements:** FR-ANL-001

### Preconditions

- User has summary-view permission.
- Organization contains records or an explicit empty state is available.

### Main flow

1. User opens Dashboard.
2. System resolves authorized organization/site scope.
3. System retrieves or computes asset and workflow summaries.
4. User selects a site/time filter.
5. System returns data with clear period and freshness context.
6. User opens a detail record for investigation.

### Alternate/exception flows

- **A1 — No records:** Show onboarding/empty states.
- **A2 — Incomplete/stale data:** Show the limitation in the summary.
- **A3 — Organization switch:** Reload using the new active membership scope.
- **A4 — Aggregation failure:** Show partial/error state rather than fabricated zero values.

### Postconditions

User sees only the summary they are authorized to access.

## 13. Global exception scenarios

These apply across use cases:

- Authentication expires during an action.
- User membership is revoked while a session is active.
- A resource is archived while another user is viewing it.
- An event arrives late or out of order.
- A worker retries a job after partial completion.
- A dependency (database, Redis, broker, AI service) becomes unavailable.
- A request references a resource from another organization.
- A model is unavailable or returns invalid output.

Each exception needs a defined user-facing outcome and an operational log/metric where appropriate.

## 14. Use-case completion criteria

A use case is ready for implementation when its actor, preconditions, trigger, main flow, alternate flows, postconditions, requirement links, permission needs, and observable success conditions are documented.
