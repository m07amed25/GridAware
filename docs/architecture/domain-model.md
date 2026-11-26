# GridAware — Domain Model

**Document ID:** ARC-DOM-001  
**Version:** 0.1  
**Status:** Proposed for review  
**Scope:** Phase 3.2 — Domain Model & Database Architecture

---

## 1. Purpose

This document describes the business concepts GridAware needs to represent, how those concepts relate, and which domain owns each concept. It is not a database schema by itself. The ERD and entity catalog translate this model into persistence structures.

The domain model must support two initial market categories—factories and commercial buildings—without forcing separate products or separate data models. The first end-to-end scenario remains a simulated generator.

## 2. Core Domain Concepts

### 2.1 Organization (Tenant)

An Organization is the customer workspace that owns sites, users' memberships, assets, sensors, incidents, work orders, and operational data.

Rules:
- An organization is the primary SaaS tenant boundary.
- Organization data must not be visible to another organization by changing an ID in a URL, query, body, or WebSocket subscription.
- Users may belong to multiple organizations through separate Membership records.
- Organization status can prevent access without deleting historical records.

### 2.2 User and Membership

A User is a global human identity. A Membership is the relationship between one User and one Organization, including the role and membership status in that organization.

This distinction is essential: a person may be an Owner in one organization and a Viewer in another.

Proposed organization roles:

| Role | Core responsibility |
|---|---|
| OWNER | Owns the tenant workspace and high-impact organization settings |
| ADMIN | Manages organization users, configuration, and operational resources |
| FACILITY_MANAGER | Oversees sites, assets, incidents, and maintenance operations |
| ENGINEER | Reviews equipment condition, anomalies, incidents, and technical findings |
| TECHNICIAN | Performs assigned work orders and records maintenance activity |
| VIEWER | Read-only access to permitted operational information |

Roles are organization-scoped. The first MVP should use a fixed role set and a centralized permission map rather than introduce a custom role builder.

### 2.3 Site and Building

A Site is a physical facility or campus managed by an organization. A Building is an optional subdivision of a site.

Examples:
- A factory campus can be one Site with several production and utility Buildings.
- A commercial property can be one Site with office, retail, parking, and plant-room Buildings.
- Some outdoor or site-level equipment may belong directly to a Site without a Building.

A Building must belong to exactly one Site and the same Organization as that Site.

### 2.4 Asset

An Asset is a maintainable item of infrastructure monitored by GridAware.

MVP example: a backup generator.

Asset attributes include:
- Organization and Site ownership.
- Optional Building location.
- Asset code and display name.
- Asset type/category.
- Manufacturer and model, when known.
- Criticality classification.
- Lifecycle/operational status.
- Commissioning and decommissioning metadata.
- Optional specifications as structured metadata.

An Asset is not the same as a Sensor or Device. An Asset is the equipment being monitored; sensors observe it; devices or gateways transport readings.

### 2.5 Device

A Device is a logical or physical telemetry producer that authenticates to the messaging layer and publishes sensor data. In the simulator-first MVP, a simulator-managed logical device represents the data source.

Device identity must be independent from a sensor identity because one gateway may publish readings from multiple sensors.

Device fields include organization, site, device code, kind, status, last-seen time, credential reference/hash, and provisioning metadata.

Never store raw reusable device secrets in plaintext in the operational database.

### 2.6 Sensor

A Sensor represents a measurement source associated with an Asset. A sensor may be connected directly to a Device or may be temporarily unassigned during configuration.

Examples:
- Generator engine temperature sensor.
- Generator vibration sensor.
- Generator output voltage sensor.
- Generator current sensor.

A Sensor should have a defined Metric and canonical unit. If a physical device reports another unit, ingestion must validate and normalize the measurement before it becomes a trusted normalized reading.

### 2.7 Metric Definition

A Metric Definition describes a known type of measurement, such as `temperature`, `vibration`, `voltage`, `current`, `frequency`, or `pressure`.

The catalog should define:
- Stable machine-readable code.
- Human-readable name and description.
- Canonical unit.
- Dimension/measurement family.
- Numeric range/validation hints, where meaningful.
- Display precision, where appropriate.

Metric definitions are platform-level reference data in the initial model. Organization-specific custom metrics are a future extension.

### 2.8 Threshold

A Threshold is a configured boundary used by deterministic rule evaluation. It may define warning and critical upper/lower limits for a sensor's metric.

Thresholds must not be confused with learned anomaly boundaries. Threshold rules are explicit operational configuration; anomaly models identify patterns not necessarily captured by static limits.

Threshold configuration needs version/effective-time history so that an incident can be explained using the threshold that was active at the time of detection.

### 2.9 Simulation Run

A Simulation Run is one execution of a generated operating scenario against a simulated device/asset.

It records:
- Organization, site, asset, and simulated device.
- Scenario code (normal operation, overheating, abnormal vibration, cooling degradation, etc.).
- Start/end timestamps and current status.
- Speed multiplier and random seed, if deterministic replay is supported.
- Scenario configuration and simulator version.

Every event produced by a simulation must be traceable to its Simulation Run. User interfaces must visibly label this data as simulated/demo data.

### 2.10 Telemetry Event and Reading

A Telemetry Event is the message/envelope accepted from a Device. It carries event identity, source, observed time, received time, schema version, and optional raw payload for diagnostics.

A Telemetry Reading is one normalized measurement inside that event. One event may contain multiple readings.

This separation supports:
- Idempotent event ingestion.
- Multi-metric event payloads.
- Per-reading quality and unit normalization.
- Queries by sensor, asset, metric, and time.
- Event-level traceability without duplicating a full raw payload per measurement.

### 2.11 Anomaly Event

An Anomaly Event is a detected unusual condition. It is distinct from an Incident.

A single anomaly may be informational and never become an incident. Multiple anomalies may contribute to one incident. Repeated anomaly observations may be deduplicated or grouped according to a policy.

Anomaly attributes include detection source (rule/model), detection code, severity, score, evidence/window, detected time, status, and deduplication fingerprint.

### 2.12 Prediction and Model Version

A Prediction is a model output for an Asset or a specific measurement context. It must reference the model version that produced it and have a prediction timestamp and, where applicable, a validity horizon.

A Model Version records model identity, task type, version, artifact URI/reference, evaluation metadata, deployment status, and compatibility information. Model binaries should be stored in suitable artifact/object storage, not as large blobs in transactional rows.

### 2.13 Risk Assessment

A Risk Assessment combines operational evidence, predictions, data quality, and equipment criticality into a time-stamped assessment.

Risk assessments are snapshots, not mutable truth. Preserve the factors and policy/model versions used so that a past score can be explained.

### 2.14 Incident

An Incident is a managed operational case requiring review or action. It may originate from an Anomaly Event or be created manually.

It has:
- Organization, Site, and Asset ownership.
- Title, description, severity, and status.
- Optional source anomaly/risk assessment.
- Assignee and creator.
- Detection/creation, acknowledgement, resolution, and closure timestamps.
- Append-only incident event history.

An Incident is not an alarm counter. It is a workflow record with triage, assignment, investigation, and resolution.

### 2.15 Work Order

A Work Order is an actionable maintenance task. It may be created from an Incident or scheduled preventive maintenance.

It contains assignment, priority, due date, work description, status, completion summary, and associated asset. A Work Order may exist without an Incident, such as routine maintenance.

### 2.16 Maintenance Schedule and Record

A Maintenance Schedule defines planned recurring or one-time maintenance. A Maintenance Record stores what was actually inspected or performed, by whom, and when.

Planned work and completed work must remain separate records so that schedule history is not overwritten by execution details.

### 2.17 Notification and Audit Log

A Notification is a user-facing message with read/unread and delivery state. An Audit Log is a security/operational record of an important action.

Notifications are not the authoritative incident history. Audit records should be append-only and access-controlled.

## 3. Domain Ownership Matrix

| Concept | Owning domain | Tenant-owned? | MVP status |
|---|---|---:|---|
| User | Identity | No (global identity) | Yes |
| Organization | Organizations | Root tenant | Yes |
| Membership | Identity & Access | Yes | Yes |
| Site / Building | Facilities | Yes | Yes |
| Asset / Asset Type | Assets | Asset yes; type catalog global | Yes |
| Device / Sensor | Devices | Yes | Yes |
| Metric Definition | Reference Data | Global catalog | Yes |
| Threshold | Monitoring | Yes | Yes |
| Simulation Run | Simulation | Yes | Yes |
| Telemetry Event / Reading | Telemetry | Yes | Yes |
| Anomaly Event | Intelligence | Yes | Basic rules in MVP |
| Model Version / Prediction | Intelligence | Model registry global or workspace-scoped; predictions tenant-owned | Later/basic metadata |
| Risk Assessment | Intelligence | Yes | Basic policy in MVP |
| Incident / Incident Event | Incidents | Yes | Yes |
| Work Order | Maintenance | Yes | Yes |
| Maintenance Schedule / Record | Maintenance | Yes | Basic |
| Notification | Notifications | Yes | Basic in-app |
| Audit Log | Audit | Tenant and selected platform events | Yes |
| Outbox Event | Integration Infrastructure | Yes/technical | Yes when async handoff is introduced |

## 4. Relationship Rules

1. An Organization owns zero or more Sites.
2. A Site belongs to exactly one Organization.
3. A Building belongs to exactly one Site and its Organization.
4. An Asset belongs to exactly one Organization and one Site; Building is optional but, when present, must belong to that same Site.
5. A Device belongs to exactly one Organization and Site. A device may publish data for multiple Sensors within its authorized scope.
6. A Sensor belongs to exactly one Asset and one Metric Definition; Device assignment is optional/configurable.
7. A Telemetry Event belongs to one Organization and one Device; it may reference one Simulation Run.
8. A Telemetry Reading belongs to one Event, one Sensor, one Asset, and one Organization. These ownership values must be consistent.
9. An Anomaly Event belongs to an Asset and may reference a Sensor, Telemetry Event, or Model Version.
10. An Incident belongs to an Asset and may reference one source Anomaly Event; the incident history captures all subsequent actions.
11. A Work Order belongs to an Asset and may be linked to an Incident.
12. A Maintenance Record belongs to an Asset and may reference a Work Order.

## 5. Lifecycle and State Ownership

Each domain owns its own lifecycle. A Sensor status does not represent an Asset status; an Anomaly status does not represent an Incident status; an Incident status does not represent a Work Order status.

### Suggested state sets

- Organization: `ACTIVE`, `SUSPENDED`, `ARCHIVED`.
- Membership: `INVITED`, `ACTIVE`, `SUSPENDED`, `REMOVED`.
- Site/Building: `ACTIVE`, `INACTIVE`, `ARCHIVED`.
- Asset: `ACTIVE`, `INACTIVE`, `UNDER_MAINTENANCE`, `DECOMMISSIONED`.
- Device: `PROVISIONED`, `ONLINE`, `OFFLINE`, `REVOKED`, `RETIRED`.
- Sensor: `ACTIVE`, `INACTIVE`, `FAULTY`, `RETIRED`.
- Anomaly: `OPEN`, `ACKNOWLEDGED`, `RESOLVED`, `IGNORED`.
- Incident: `DETECTED`, `TRIAGED`, `ASSIGNED`, `INVESTIGATING`, `RESOLVED`, `CLOSED`.
- Work Order: `DRAFT`, `OPEN`, `ASSIGNED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `CANCELLED`.

State transitions must be validated by domain services and recorded in event/history tables when the transition matters operationally.

## 6. Explicitly Out of Scope for the Initial Domain Model

- Direct commands to PLCs or physical equipment.
- Financial billing and subscription invoicing.
- Custom workflow designer.
- Custom role/permission builder.
- Full digital-twin graph.
- Cross-customer benchmarking.
- Customer-defined metric catalogs.
- Regulatory certification workflows.
- Advanced root-cause graph and causal inference.

These may be added later without weakening the core ownership boundaries.

## 7. Domain Invariants

The following invariants are mandatory:

- Every tenant-owned record has an organization identity.
- A user can access tenant data only through an active Membership and an authorized role/permission.
- Site, Building, Asset, Device, Sensor, Telemetry, Incident, and Work Order ownership must be consistent.
- A normalized telemetry reading must reference a known Sensor and Metric Definition.
- Telemetry identity is idempotent at event level.
- Historical telemetry is not silently updated to represent a later measurement.
- AI outputs identify the model/policy version used.
- Incident and Work Order state changes are validated and auditable.
- Simulated data is explicitly identified throughout ingestion, storage, UI, export, and reporting.
