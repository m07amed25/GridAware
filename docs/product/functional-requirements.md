# GridAware — Functional Requirements Specification

**Version:** 1.1  
**Status:** Proposed detailed requirements for MVP implementation  
**Related:** `PRD.md`, `user-stories.md`, `use-cases.md`, `requirements-traceability.md`

---

## 1. Purpose and conventions

This document defines the observable behavior GridAware must provide. Each requirement has a stable identifier, priority, statement, and acceptance criteria. Engineering issues and QA tests should reference these IDs.

**Priority definitions:** P0 = required for the MVP; P1 = important for a usable pilot; P2 = later or optional; Later = outside the MVP baseline.

A feature is not complete when only its frontend is implemented. It must include backend validation, authorization, persistence behavior, relevant failure handling, and tests appropriate to its risk.

## 2. Authentication and account lifecycle

### FR-AUTH-001 — User sign-in (P0)

The system MUST allow a registered user to authenticate using the approved credential method.

Acceptance criteria:

- Valid credentials establish an authenticated session/token according to the chosen auth architecture.
- Invalid credentials return a generic authentication failure without revealing whether an email exists.
- Disabled or suspended accounts cannot authenticate.
- Authentication attempts are rate-limited or protected against automated abuse.
- Authentication secrets are never returned in API responses or logs.

### FR-AUTH-002 — Sign-out and session invalidation (P0)

The system MUST provide sign-out that invalidates or expires the current session according to the chosen session strategy.

Acceptance criteria:

- A signed-out session cannot access protected endpoints after invalidation takes effect.
- The frontend clears authenticated state.
- Expired sessions return a consistent authentication response.

### FR-AUTH-003 — Current-user profile (P0)

The system MUST provide the authenticated user's approved profile and active organization memberships without exposing credential fields.

Acceptance criteria:

- Response includes only approved profile and membership information.
- Password hashes, token hashes, and secrets are excluded.
- A user can select only an organization in which they have active membership.

### FR-AUTH-004 — Account recovery (P1)

The system SHOULD support secure account recovery before external pilot onboarding if password authentication is selected.

Acceptance criteria:

- Recovery tokens are random, short-lived, single-use, and stored safely.
- Responses do not disclose whether an account exists.
- Successful recovery invalidates appropriate existing sessions.

## 3. Organizations and memberships

### FR-ORG-001 — Create organization (P0)

An authorized user MUST be able to create an organization where self-service onboarding is enabled.

Acceptance criteria:

- Organization has a unique identifier and required display name.
- Creator receives initial owner membership.
- Tenant-owned records are associated with the organization.
- Creation is transactional; partial tenant records are not left after failure.

### FR-ORG-002 — List accessible organizations (P0)

A user MUST see only organizations in which they have active membership.

Acceptance criteria:

- API filters organizations using authenticated membership.
- Supplying an organization ID outside the user's membership does not grant access.
- Revoked memberships are not listed as active.

### FR-ORG-003 — Manage memberships (P0)

An Organization Owner MUST be able to invite, change role, deactivate, and review members within the organization, subject to the approved invitation flow.

Acceptance criteria:

- All changes are organization-scoped.
- The last active owner cannot be removed unless a safe ownership-transfer process exists.
- Membership changes are audited.
- Deactivated members lose access immediately or within a documented session invalidation window.

### FR-ORG-004 — Organization settings (P1)

An authorized owner SHOULD configure approved organization preferences such as display name and time zone.

Acceptance criteria:

- Preferences are validated.
- Time zone is stored as a valid identifier.
- Changes are audited.

## 4. Sites, buildings, and assets

### FR-SITE-001 — Manage sites (P0)

Authorized users MUST be able to create, view, update, and archive sites belonging to their organization.

Acceptance criteria:

- A site belongs to exactly one organization.
- Required fields and address fields are validated.
- A site identifier cannot expose another tenant's records.
- Archiving does not silently delete historical telemetry or incidents.

### FR-SITE-002 — Manage buildings/areas (P1)

The platform SHOULD support buildings or named facility areas nested under a site.

Acceptance criteria:

- A building belongs to one site and therefore one organization.
- An asset cannot be associated with a building from another site/tenant.
- The first generator workflow may use a site-level asset if building nesting is not yet needed.

### FR-ASSET-001 — Register asset (P0)

Authorized users MUST be able to register an asset under an organization site.

Expected fields include name, asset type, site, optional building/area, asset tag, manufacturer/model/serial number when available, operational status, criticality, and optional installation date.

Acceptance criteria:

- Asset is associated with exactly one owning organization and site.
- Required fields are validated.
- Asset type comes from the supported taxonomy or a controlled extension mechanism.
- Duplicate identifiers follow documented organization-level uniqueness rules.

### FR-ASSET-002 — View asset details (P0)

The system MUST provide asset identity, location, status, criticality, sensors, recent measurements, alerts, incidents, and maintenance history where available.

Acceptance criteria:

- Every displayed record belongs to the same tenant and authorized scope.
- Missing sections have explicit empty states.
- Archived assets remain discoverable in historical records according to policy.

### FR-ASSET-003 — Update/archive asset (P0)

Authorized users MUST update allowed metadata and archive assets.

Acceptance criteria:

- Changes to criticality, type, location, or status are audited.
- Archiving prevents prohibited new operations but retains history.
- Invalid asset/site relationships are rejected.

## 5. Sensors and simulator devices

### FR-SENSOR-001 — Register sensor (P0)

Authorized users MUST register a sensor associated with an asset.

Acceptance criteria:

- Sensor has a stable ID and belongs to the asset's organization.
- Sensor has a display name, metric mapping, unit, and expected reporting behavior where configured.
- Cross-tenant sensor-to-asset links are rejected.

### FR-SENSOR-002 — Configure metric and unit (P0)

The system MUST maintain the metric name and expected unit for each sensor.

Acceptance criteria:

- Metric/unit combinations are validated against a supported catalog or approved custom definition.
- Incompatible telemetry is rejected or quarantined according to policy.
- Unit conversion is explicit and tested; values are never silently relabeled.

### FR-SENSOR-003 — Connectivity/freshness (P0)

The platform MUST show last successful observation and sensor freshness state.

Acceptance criteria:

- State is derived from configured expected interval and last-seen time.
- Missing or stale data is not displayed as healthy.
- A sensor that has never reported has a distinct state.

### FR-DEVICE-001 — Simulator device identity (P0)

The system MUST associate simulator publishers with an approved identity and permitted asset/sensor scope.

Acceptance criteria:

- Publisher cannot submit for arbitrary organization or asset IDs.
- Simulator credentials are separate from user credentials.
- Events are attributable to a simulator identity and scenario run.

## 6. Telemetry ingestion and storage

### FR-TLM-001 — Accept telemetry (P0)

The ingestion pipeline MUST accept telemetry matching the documented contract from authorized simulator publishers.

Acceptance criteria:

- Schema is validated before persistence.
- Required identifiers, timestamp, metric, value, and unit are checked.
- Invalid payloads are rejected or quarantined with a reason.
- Tenant ownership is resolved from trusted device authorization, not blindly trusted from the payload.

### FR-TLM-002 — Preserve event and ingestion times (P0)

The system MUST preserve measurement observed time separately from server ingestion time.

Acceptance criteria:

- Both timestamps use a consistent storage strategy (UTC recommended).
- Late-arriving measurements remain distinguishable from current readings.
- UI communicates the time context.

### FR-TLM-003 — Deduplicate telemetry (P0)

The platform MUST prevent repeated delivery of the same event from creating duplicate logical records or downstream business effects.

Acceptance criteria:

- Repeated event IDs do not create duplicate telemetry or duplicate incidents.
- Retry response is deterministic.
- Deduplication scope is documented, such as device identity plus event ID.

### FR-TLM-004 — Store valid measurements (P0)

Valid telemetry MUST be stored with sensor, asset/tenant context, metric, value, unit, observed time, ingestion time, quality, and source metadata as appropriate.

Acceptance criteria:

- Referential integrity or equivalent ownership checks are applied.
- Queries can retrieve a sensor's measurements by bounded time range.
- Retention and deletion behavior is documented.

### FR-TLM-005 — Query historical telemetry (P0)

Authorized users MUST query measurements for an asset or sensor over a bounded time range.

Acceptance criteria:

- Tenant and permission filters are enforced server-side.
- Time range and result limits are validated.
- Large responses are aggregated or paginated.
- Empty results are explicit.

### FR-TLM-006 — Handle late, out-of-order, and poor-quality data (P1)

The pipeline SHOULD distinguish valid late data, out-of-order data, invalid values, and sensor-quality problems.

Acceptance criteria:

- Original observed timestamp is preserved.
- Historical readings are not overwritten to force arrival order.
- Quality is queryable and visible where relevant.
- Future timestamp and excessive clock-drift policy is documented.

## 7. Monitoring and detection rules

### FR-MON-001 — Display current measurements (P0)

Authorized users MUST view recent readings for a selected asset.

Acceptance criteria:

- Values display metric name and unit.
- Last-updated time is visible.
- Stale/offline state is distinct from normal.
- Real-time updates respect tenant/site authorization.

### FR-MON-002 — Display historical trends (P0)

Authorized users MUST view measurements over selected time ranges.

Acceptance criteria:

- Chart axes include time and unit.
- Missing intervals are not silently interpolated as real measurements.
- Selected range and display timezone are clear.

### FR-RULE-001 — Configure threshold rules (P0)

Authorized users MUST configure a threshold rule for supported metrics.

Acceptance criteria:

- Rule defines metric, operator, threshold, unit, severity, and enabled state.
- Rule is validated against metric unit.
- Rule changes are audited.
- Rule cannot target sensors outside the user's authorized scope.

### FR-RULE-002 — Evaluate threshold rules (P0)

The system MUST evaluate incoming valid measurements against enabled matching rules.

Acceptance criteria:

- Evaluation uses correct metric and unit.
- Persistence/debounce may prevent one transient sample from creating repeated alerts.
- Evaluation records rule configuration/version context.
- Repeated conditions follow deduplication/cooldown policy.

### FR-RULE-003 — Generate contextual alert/event (P0)

When a configured rule is satisfied, the platform MUST create a contextual event.

Acceptance criteria:

- Event includes asset, sensor, metric, value, unit, time, rule, severity, and evidence.
- Duplicate telemetry does not create duplicate events.
- Detection source is explicit.

### FR-ANOM-001 — Basic anomaly detection (P1)

The platform SHOULD integrate an evaluated baseline detector after the rule-based pipeline is reliable.

Acceptance criteria:

- Detector name/version is recorded.
- Input window and feature definitions are documented.
- Output includes score/category and context.
- Evaluation metrics and limitations are documented.
- Synthetic-only evaluation is not presented as real-world validation.

## 8. Risk and prioritization

### FR-RISK-001 — Asset criticality (P0)

The system MUST allow authorized users to assign a configurable criticality level.

Acceptance criteria:

- Options and meanings are documented.
- Changes are audited.
- Missing criticality is represented as unknown/default, not silently treated as lowest or highest risk.

### FR-RISK-002 — Risk context (P1)

The system SHOULD combine detection evidence, asset criticality, and data quality as a prioritization aid.

Acceptance criteria:

- Inputs and calculation logic are documented.
- Missing/stale data is represented explicitly.
- UI labels the result as decision support, not certified probability or safety rating.
- Calculation/model version is traceable.

## 9. Incident management

### FR-INC-001 — Create incident (P0)

Authorized users or approved automated policies MUST create an incident linked to an asset and relevant event(s).

Acceptance criteria:

- Incident has unique ID, tenant, site, asset, title, description, severity, status, source, and creation time.
- Automated creation is idempotent under duplicate event delivery.
- Access is authorized by tenant and permission scope.

### FR-INC-002 — Triage incident (P0)

An authorized user MUST review and classify an incident.

Acceptance criteria:

- Triage records actor and time.
- Severity/priority changes are audited.
- Allowed status transitions are enforced.

### FR-INC-003 — Assign incident (P0)

An authorized user MUST assign an incident to an eligible organization member.

Acceptance criteria:

- Assignee belongs to the same organization and is active.
- Assignment is recorded in the incident timeline.
- Cross-tenant assignment is rejected.

### FR-INC-004 — Resolve/reopen incident (P0)

An authorized user MUST resolve an incident with resolution information and reopen it when policy permits.

Acceptance criteria:

- Resolution notes and timestamp are captured.
- Invalid transitions are rejected.
- Reopening preserves prior history.

### FR-INC-005 — Incident timeline (P0)

The platform MUST retain lifecycle events, notes, assignments, and linked work orders.

Acceptance criteria:

- Each event records actor/source and timestamp.
- Timeline order is consistent.
- Normal edit operations cannot alter immutable audit events.

## 10. Work orders and maintenance

### FR-WO-001 — Create work order (P0)

An authorized user MUST create a work order linked to an asset and optionally an incident.

Acceptance criteria:

- Work order contains title, description, priority, status, asset, organization, and creator.
- Assignee, if present, is an eligible member of the same organization.
- Required information is validated.

### FR-WO-002 — Assign/update work order (P0)

Authorized users MUST assign work orders and update allowed status fields.

Acceptance criteria:

- State transitions are validated.
- Assignment changes are recorded.
- Technicians update only work assigned to them or explicitly within their scope.

### FR-WO-003 — Complete work order (P0)

An assigned technician or authorized manager MUST submit a completion record.

Acceptance criteria:

- Completion notes are required according to the work-order policy.
- Actor and completion time are captured.
- Completion does not automatically close an incident unless explicitly configured.

### FR-MNT-001 — Maintenance record (P1)

The platform SHOULD retain a maintenance record linked to the asset and completed work order.

Acceptance criteria:

- Record includes work performed, findings, timestamps, and responsible people.
- Record remains available in asset history after asset archival.

## 11. Simulator and scenarios

### FR-SIM-001 — Normal generator telemetry (P0)

The simulator MUST publish repeatable normal-operation generator measurements with documented metric names, units, timestamps, and event IDs.

### FR-SIM-002 — Controlled fault scenarios (P0)

The simulator MUST support at least one progressive abnormal scenario, such as rising temperature, and one additional signal/scenario that creates a meaningful monitoring test.

Acceptance criteria:

- Scenario start/end is deterministic or seed-controlled where feasible.
- Ground-truth labels are stored separately from detector input features.
- Simulated data is visibly identified in product views.
- Scenario parameters and limitations are documented.

### FR-SIM-003 — Data-quality fault simulation (P1)

The simulator SHOULD support duplicate events, delayed messages, missing measurements, sensor disconnects, and out-of-order delivery.

## 12. Notifications, analytics, audit, and operations

### FR-NOT-001 — In-app notifications (P1)

The platform SHOULD notify authorized users about assigned incidents, work orders, and important status changes.

Acceptance criteria:

- Recipients are resolved from organization/site permissions.
- Notification links do not bypass authorization.
- Optional notification delivery failure does not lose the underlying assignment.

### FR-ANL-001 — Operational overview (P1)

The platform SHOULD summarize asset status, active incidents, and work-order state for the user's authorized scope.

Acceptance criteria:

- Aggregations respect tenant and site filters.
- Period and freshness are clear.
- Definitions exist in `success-metrics.md`.

### FR-ANL-002 — Historical summaries (P2)

The platform MAY provide trends by site, asset type, severity, and period after source data is reliable.

### FR-AUD-001 — Audit sensitive operations (P0)

The platform MUST record membership/permission changes, criticality changes, threshold changes, incident transitions, work-order assignments, and administrative access.

Acceptance criteria:

- Audit record identifies actor, action, resource, time, and relevant change metadata.
- Secrets and unnecessary sensitive data are excluded.
- Tenant context is recorded.
- Normal users cannot modify/delete audit history.

### FR-OPS-001 — Health endpoints (P0)

Backend components MUST expose health/readiness information for deployment monitoring.

Acceptance criteria:

- Liveness indicates process is running.
- Readiness checks critical dependencies without revealing secrets.
- Dependency failures are distinguishable from process failure.

## 13. Global functional rules

1. Every tenant-owned resource is scoped to an organization.
2. Every child relationship is validated against the parent organization's ownership.
3. User-supplied IDs never substitute for authorization.
4. Timestamps follow a UTC storage and display-timezone policy.
5. Measurement values retain units and data-quality context.
6. Missing data is never interpreted as a normal reading.
7. Duplicate event delivery must not create duplicate business effects.
8. Incident and work-order transitions are explicit and auditable.
9. Automated events and user-entered records are distinguishable by source.
10. AI output includes detector/model version and limitations where applicable.

## 14. Deferred functionality

Direct PLC control, physical device provisioning, automatic corrective action, certified safety assessment, universal equipment coverage, advanced remaining-useful-life estimation, and customer-specific ML training are not MVP commitments. They require separate product, safety, and technical review.

## 15. Requirement change process

When a requirement changes: explain the user/business reason; identify affected personas and workflows; assess security, tenant, data, and migration impact; update IDs and acceptance criteria; update stories and traceability; add/revise tests; and record whether the change affects the MVP gate.
