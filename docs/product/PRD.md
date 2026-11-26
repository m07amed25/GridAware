# GridAware — Product Requirements Document (PRD)

**Version:** 1.1  
**Document status:** Product Discovery baseline approved; detailed requirements proposed for implementation  
**Product:** GridAware  
**Category:** B2B SaaS · Infrastructure Monitoring · Predictive Maintenance  
**Primary markets:** Factories and commercial buildings  
**Initial operating mode:** Simulator-only  
**Initial end-to-end scenario:** Simulated generator monitoring  
**Backend baseline:** NestJS + TypeScript  
**Database baseline:** Neon PostgreSQL + Prisma ORM  
**Frontend baseline:** Next.js + TypeScript  
**AI baseline:** Python services; model selection and production claims subject to evaluation

---

## 1. Executive Summary

GridAware is a multi-tenant B2B SaaS platform for monitoring physical infrastructure and coordinating maintenance operations across factories and commercial buildings.

The platform provides a unified view of sites, buildings, equipment, sensors, telemetry, operational alerts, incidents, and maintenance work. It is intended to help facility and maintenance teams identify abnormal equipment behavior earlier, understand the context of an alert, prioritize investigation, and record the actions taken.

GridAware will begin with simulated telemetry rather than physical device integrations. A Python simulator will generate realistic, timestamped telemetry and controlled fault scenarios. The data will pass through an MQTT-based ingestion pipeline, be validated and stored, and then be made available to the web application. A rules engine will detect configured threshold violations. A later MVP increment can add baseline anomaly detection after the data pipeline and rule-based workflow are reliable.

The first complete product workflow will use a simulated generator:

1. An organization creates a site and registers a generator asset.
2. The asset is assigned one or more simulated sensors.
3. The simulator publishes telemetry.
4. GridAware validates, deduplicates, and stores the measurements.
5. The monitoring interface displays current and historical readings.
6. A configured rule detects an abnormal operating condition.
7. GridAware creates an alert and, when policy conditions are met, an incident.
8. An authorized user assigns a work order to a technician.
9. The technician records the investigation and resolution.
10. The incident and asset history retain the full event trail.

The initial product is not an industrial control system. It is a monitoring and maintenance decision-support platform. It will not send control commands to generators, PLCs, electrical protection systems, or other physical equipment.

## 2. Product Decisions and Approved Baseline

The following decisions were explicitly selected and are treated as the baseline for this PRD.

| Decision               | Approved baseline                  | Product implication                                                                                        |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Initial operating mode | Simulator only                     | The first release does not require physical sensor installation or customer OT network integration.        |
| Target markets         | Factories and commercial buildings | The domain model must support both site types, while equipment coverage is introduced incrementally.       |
| Product model          | Multi-tenant B2B SaaS              | Multiple customer organizations use one platform with strict tenant data isolation.                        |
| First end-to-end asset | Generator                          | The first demo and acceptance workflow focuses on generator telemetry, alerts, incidents, and work orders. |
| Backend                | NestJS + TypeScript                | Business logic and public APIs are implemented in a modular NestJS application.                            |
| Database               | Neon PostgreSQL + Prisma           | PostgreSQL is the transactional data store; Prisma is the data-access and schema tool.                     |
| Frontend               | Next.js + TypeScript               | The browser application provides dashboards and operational workflows.                                     |
| AI implementation      | Python-based services              | Python is used for data science, model training, and inference where needed.                               |

### 2.1 Important scope interpretation

Targeting factories and commercial buildings does not mean the first release will fully model every industrial and building system. The platform will use a common hierarchy and configurable asset/sensor model. The first simulated scenario is a generator. A second representative scenario, such as HVAC, should be added before claiming that the MVP has been validated for both market segments.

### 2.2 Decisions intentionally not made yet

The following items are not blockers for Product Discovery, but must be decided before the relevant implementation stage:

- Commercial pricing and subscription tiers.
- Exact supported countries, languages, currencies, and time zones.
- Customer identity-provider integrations (Google, Microsoft, SAML, or OIDC).
- Email/SMS/push notification provider.
- Final hosting provider for the Next.js, NestJS, worker, and Python workloads.
- Long-term telemetry retention and archival policy.
- Whether customers can define custom asset types and metrics in the first paid release.
- Physical device protocol integrations and field deployment model.

## 3. Product Vision

**Vision:** Help organizations understand the operational condition of their infrastructure, identify emerging equipment risks, and coordinate maintenance actions through one data-driven platform.

**Product promise:** Turn equipment data into actionable maintenance intelligence.

GridAware should help a facility team answer five questions:

1. What equipment do we have, and where is it installed?
2. What is happening to each asset right now?
3. Which readings or operating patterns require attention?
4. Why was an alert or incident raised, and how urgent is it?
5. Who is responsible for investigating and resolving the issue?

GridAware is not intended to replace qualified engineers, equipment protection systems, or manufacturer maintenance procedures. It organizes information and supports decisions made by authorized personnel.

## 4. Problem Statement

Organizations operating factories and commercial buildings depend on assets such as generators, HVAC equipment, pumps, electrical distribution equipment, and other facility systems. Equipment condition information may be spread across local monitoring interfaces, spreadsheets, manual inspection records, and maintenance logs.

This fragmentation can make it difficult for facility teams to maintain a consistent view of asset condition, recognize changes in operating behavior, connect alerts with equipment history, and follow a problem from initial detection through maintenance resolution.

Some failures are preceded by changes in measurable signals such as temperature, vibration, voltage, current, pressure, or operating state. If those signals are not collected, contextualized, and reviewed in time, teams may discover the problem only after operational impact has occurred.

GridAware addresses this problem by combining asset context, telemetry history, alerting, risk context, incident workflows, and maintenance records in one platform.

### 4.1 Problem hypotheses to validate

These are product hypotheses, not yet proven customer research findings:

- H1: Facility teams need a unified asset and site view rather than separate spreadsheets and device interfaces.
- H2: Teams benefit when telemetry alerts are linked to asset identity, location, severity, and history.
- H3: A structured incident and work-order workflow can reduce the time and information loss between detection and resolution.
- H4: Historical trends and anomaly indicators can help engineers prioritize inspections.
- H5: Organizations with multiple sites need organization-level visibility and controlled site-level permissions.

### 4.2 Discovery validation plan

Before production positioning or pricing decisions, validate these hypotheses through interviews and workflow observation with:

- Facility managers in commercial buildings.
- Maintenance engineers in factories.
- Technicians who perform inspections and repairs.
- Operations or engineering managers responsible for multiple sites.

Questions should focus on current workflows, existing monitoring tools, asset criticality, typical failure handling, data availability, incident ownership, maintenance records, and the cost of downtime. Do not lead interviewees toward a preferred AI solution; first understand the problem they actually experience.

## 5. Target Market and Initial Customer Profile

### 5.1 Primary segments

**Factories**

Potential monitored systems include backup generators, electrical panels, pumps, motors, HVAC systems, and selected production-support equipment. The initial value proposition is operational visibility and organized maintenance follow-up.

**Commercial buildings**

Potential monitored systems include backup generators, HVAC equipment, pumps, electrical distribution, and other building services. The initial value proposition is a consistent view of facility assets, equipment status, alerts, and maintenance actions.

### 5.2 Initial ideal customer profile hypothesis

An organization that:

- Operates one or more factories or commercial buildings.
- Has multiple maintainable assets.
- Has an identifiable facility or maintenance team.
- Performs periodic inspections and corrective maintenance.
- Can provide or simulate equipment measurements for a pilot.
- Wants a centralized operational record across its sites.

This profile is a starting hypothesis and should be refined through discovery interviews.

### 5.3 Buyer, admin, and daily users

- **Economic buyer:** Operations Director, Facility Director, or business owner.
- **Product administrator:** Organization Owner or designated IT administrator.
- **Operational owner:** Facility Manager or Maintenance Manager.
- **Daily users:** Maintenance Engineers and Technicians.
- **Read-only stakeholder:** Senior management or auditor.

## 6. Personas and Jobs to Be Done

### Persona A — Organization Owner

**Goal:** Manage the organization, its sites, users, and access policies.

**Needs:**

- Create and configure an organization.
- Invite and deactivate members.
- Assign roles and site access.
- Review organization-level asset and incident summaries.
- Maintain oversight of activity and audit history.

**Success looks like:** The organization can onboard its operational team and ensure users only access the sites and data they are authorized to see.

### Persona B — Facility Manager

**Goal:** Understand the health and operational status of facilities and equipment.

**Needs:**

- See asset status across assigned sites.
- Identify assets requiring attention.
- Review active alerts and incidents.
- Track work orders and overdue tasks.
- Compare site-level operational summaries.

**Success looks like:** The manager can identify what needs attention and who owns the next action without manually consolidating information from multiple places.

### Persona C — Maintenance Engineer

**Goal:** Investigate equipment problems and organize appropriate maintenance actions.

**Needs:**

- Inspect current and historical telemetry.
- Review threshold configuration and anomaly context.
- See related incidents and maintenance history.
- Assign or create work orders.
- Record investigation findings and resolution details.

**Success looks like:** The engineer can understand why an issue was raised, assess available evidence, and coordinate a documented response.

### Persona D — Technician

**Goal:** Complete assigned inspections and maintenance tasks.

**Needs:**

- View assigned work orders.
- See asset location and reported symptoms.
- Record observations, actions, parts, and completion notes.
- Update work-order status.

**Success looks like:** The technician can execute and document a task without needing access to unrelated organization data or administrative settings.

### Persona E — Viewer

**Goal:** Review operational information without changing it.

**Needs:**

- View authorized dashboards, assets, and reports.
- Review incident status.
- Export or access reports only when permitted.

**Success looks like:** The user can access relevant information without modification privileges.

### Internal Platform Administrator

A platform-level operator is required for SaaS support and platform operations. This is an internal role, not a customer organization role. Its access must be restricted, audited, and separated from normal tenant users.

## 7. Product Principles

1. **Operational context first:** A reading is meaningful only when linked to a sensor, asset, location, unit, and timestamp.
2. **Explain alerts:** Every alert should show the measurement, rule or detector, observed time, and relevant context.
3. **Human responsibility:** AI output supports investigation; it does not independently control equipment or replace engineering judgment.
4. **Tenant isolation by design:** Organization boundaries must be enforced on every data-access path.
5. **Reliable ingestion:** Duplicate, late, malformed, and missing telemetry must be handled explicitly.
6. **Progressive intelligence:** Start with transparent threshold rules and measurable baselines before advanced deep learning.
7. **Auditability:** Important configuration changes and operational actions must be traceable.
8. **Incremental coverage:** Add equipment types only when their data model, simulator, user workflow, and evaluation criteria are defined.

## 8. Product Scope

### 8.1 MVP — Included

The MVP is the smallest coherent SaaS product that demonstrates the full generator monitoring and maintenance workflow.

**Platform and access**

- User authentication.
- Organization creation and membership.
- Role-based permissions.
- Site and building hierarchy.
- Tenant-aware audit trail for important actions.

**Infrastructure configuration**

- Site registration.
- Optional building/area records.
- Asset registration and categorization.
- Generator asset template.
- Sensor/device registration.
- Metric and unit configuration.
- Configurable threshold rules.

**Simulator and telemetry**

- Python-based generator simulator.
- Normal operating scenario.
- Progressive overheating scenario.
- Abnormal vibration scenario.
- Cooling degradation scenario.
- Simulated shutdown or offline scenario.
- MQTT telemetry publishing.
- Device/topic authorization in the development/pilot setup.
- Payload validation, event deduplication, timestamp validation, and data-quality status.
- Historical telemetry storage and retrieval.

**Monitoring and operations**

- Asset overview.
- Live telemetry view.
- Historical charts.
- Sensor connectivity and data freshness status.
- Threshold alerts.
- Alert acknowledgement and status handling.
- Incident creation and assignment.
- Work-order creation and assignment.
- Technician work-order updates.
- Maintenance and incident history.
- In-app notifications or a clearly defined first notification channel.

**Operational administration**

- Basic overview dashboard.
- Basic incident and work-order summaries.
- Audit events for critical actions.

### 8.2 MVP enhancement — after the vertical slice is reliable

- Statistical anomaly baseline (for example, rolling statistics or robust z-score).
- Isolation Forest experiment where the selected data supports it.
- Basic asset risk indicator using documented, configurable inputs.
- Second simulator scenario for HVAC to test the commercial-building segment.
- CSV export for selected reports.

These items should not delay delivery of the first complete generator workflow.

### 8.3 Later releases

- Calibrated failure probability models.
- Remaining Useful Life estimation.
- Advanced temporal deep-learning models.
- SHAP-based explanations for suitable models.
- Advanced cross-asset correlation and root-cause investigation.
- Physical IoT device onboarding.
- Industrial protocol connectors such as Modbus TCP or OPC UA, subject to security review.
- Digital-twin capabilities.
- Customer-defined automation and advanced workflow rules.
- Enterprise identity provider integrations.
- Subscription billing and usage metering.
- Advanced multi-region or high-availability architecture.

### 8.4 Explicitly out of scope

- Direct control of machinery, PLCs, relays, or building automation systems.
- Certified safety monitoring or equipment protection.
- Automatic shutdown or actuation.
- Guaranteeing that equipment failure will be predicted or prevented.
- Replacing manufacturer instructions or qualified inspections.
- Full coverage of every asset type in the first release.
- Claiming model accuracy or business savings before measured validation.

## 9. Product Information Architecture

Proposed primary navigation:

1. **Dashboard** — organization/site overview, asset status, active incidents, and recent activity.
2. **Infrastructure** — sites, buildings, areas, assets, sensors, and devices.
3. **Monitoring** — live telemetry, historical trends, sensor status, and alert conditions.
4. **Alerts** — threshold and anomaly events requiring review.
5. **Incidents** — incident queue, assignment, investigation, and resolution.
6. **Work Orders** — technician tasks, priorities, due dates, and completion.
7. **Maintenance** — schedules and maintenance history; the MVP may expose only basic records.
8. **Analytics** — operational summaries and trends; advanced reporting is later scope.
9. **Administration** — organization members, roles, preferences, and audit history.

Navigation must be permission-aware. A technician should not see organization administration actions, and a Viewer should not see controls they cannot execute.

## 10. Domain Model and Hierarchy

### 10.1 Organizational hierarchy

Recommended logical hierarchy:

```text
Platform
└── Organization (tenant)
    ├── Members and Roles
    └── Site
        ├── Building (optional)
        │   └── Area / Floor (optional)
        └── Assets
            ├── Asset Type / Specifications
            └── Sensors / Devices
                └── Telemetry Measurements
```

A site may contain assets directly or group them into buildings and areas. This accommodates factories and commercial buildings without forcing the same physical hierarchy on every customer.

### 10.2 Core entities

- **Organization:** Customer tenant and primary data-isolation boundary.
- **Membership:** Relationship between a user and an organization, including role and status.
- **Site:** A physical or operational location owned by an organization.
- **Building:** Optional structure within a site.
- **Area:** Optional zone, floor, room, or plant area.
- **Asset:** Maintainable equipment item.
- **AssetType:** Reusable equipment category/template.
- **Sensor:** Measurement source associated with an asset.
- **Device:** Simulator or future physical gateway identity that publishes messages.
- **Metric:** A named measurement with a defined unit and validation rules.
- **Telemetry:** Time-stamped measurement event.
- **ThresholdRule:** Configurable condition applied to one or more metrics.
- **Alert:** Detected condition requiring review.
- **Incident:** Operational case created from an alert or manual report.
- **WorkOrder:** Assigned maintenance task linked to an asset and optionally an incident.
- **MaintenanceRecord:** Completed maintenance activity.
- **Notification:** User-facing notification.
- **AuditLog:** Trace of important administrative and operational changes.

### 10.3 Tenant ownership rules

- Every customer-owned record must be associated with an organization directly or through a parent entity.
- Every request must derive the active organization from an authenticated and authorized membership context, not trust a client-provided organization identifier by itself.
- A user may belong to multiple organizations; requests must select and validate the active organization.
- Related records must be checked for tenant consistency. An asset from Organization A must not be attached to a site from Organization B.
- Cross-tenant access must be denied even when a caller knows another tenant's record identifier.
- Platform-level support access must be explicit and audited.

## 11. Roles and Permission Model

Proposed customer roles:

| Capability                   | Owner |  Facility Manager  | Engineer |   Technician    | Viewer |
| ---------------------------- | :---: | :----------------: | :------: | :-------------: | :----: |
| View authorized dashboards   |  Yes  |        Yes         |   Yes    |     Limited     |  Yes   |
| Manage organization settings |  Yes  |      Limited       |    No    |       No        |   No   |
| Invite/manage members        |  Yes  | Optional delegated |    No    |       No        |   No   |
| Manage sites/buildings       |  Yes  |        Yes         |   View   |      View       |  View  |
| Create/update assets         |  Yes  |        Yes         |   Yes    |     Limited     |   No   |
| Manage sensors/rules         |  Yes  |        Yes         |   Yes    |       No        |   No   |
| View telemetry               |  Yes  |        Yes         |   Yes    | Assigned assets |  Yes   |
| Acknowledge alerts           |  Yes  |        Yes         |   Yes    |    Optional     |   No   |
| Create/assign incidents      |  Yes  |        Yes         |   Yes    |   Report only   |   No   |
| Create/assign work orders    |  Yes  |        Yes         |   Yes    |       No        |   No   |
| Update assigned work orders  |  Yes  |        Yes         |   Yes    |       Yes       |   No   |
| View audit records           |  Yes  |      Limited       |    No    |       No        |   No   |

This is a proposed initial matrix. Site-scoped permissions and delegated permissions may be refined after the first authorization design. Authorization must be enforced in the backend, not merely by hiding frontend controls.

## 12. Core User Journeys

### Journey A — Organization onboarding

1. User registers or accepts an invitation.
2. User creates an organization or joins an existing organization.
3. Owner configures organization details.
4. Owner invites team members.
5. Owner assigns roles and, where supported, site access.
6. User sees only authorized organization data.

**Acceptance:** A user in one organization cannot retrieve another organization's sites, assets, sensors, incidents, or work orders by changing an ID in the request.

### Journey B — Site and generator setup

1. Authorized user creates a site.
2. User optionally creates building/area records.
3. User registers a generator asset.
4. User selects the generator asset type/template.
5. User configures asset identifiers and operational metadata.
6. User registers simulated device and sensor identities.
7. User maps metrics and units to sensors.
8. User activates the simulator scenario.

**Acceptance:** The asset page shows its site/location, sensor configuration, device status, and whether any valid telemetry has been received.

### Journey C — Live monitoring

1. Simulator publishes telemetry.
2. Ingestion pipeline authenticates/identifies the device.
3. Payload is validated and normalized.
4. Duplicate events are rejected or safely ignored.
5. Valid telemetry is persisted.
6. Frontend receives a real-time update or refreshes the current view.
7. Historical charts can query a selected time range.
8. If telemetry becomes stale, the UI shows stale/offline status instead of presenting the asset as healthy.

**Acceptance:** A test event is visible with the correct value, unit, event time, asset association, and data-quality status.

### Journey D — Alert and incident handling

1. A configured threshold or detector evaluates telemetry.
2. A condition is detected.
3. The system creates or updates an alert, avoiding duplicate alert storms.
4. An authorized user reviews and acknowledges the alert.
5. If policy conditions are met, an incident is created or linked.
6. Engineer assigns an owner and priority.
7. Work order is created when investigation or maintenance is required.

**Acceptance:** Repeated messages for the same sustained condition do not create uncontrolled duplicate incidents.

### Journey E — Work-order completion

1. Engineer creates a work order linked to an asset and optionally an incident.
2. Work order is assigned to a technician.
3. Technician views the task and asset context.
4. Technician starts work and records findings/actions.
5. Technician submits completion details.
6. Authorized engineer/manager reviews and closes the work order.
7. Maintenance history is updated and linked to the asset.
8. Related incident can be resolved or closed according to policy.

**Acceptance:** The complete status and action history is retained and visible to authorized users.

## 13. Functional Requirements

Priority definitions:

- **P0:** Required for the first coherent MVP vertical slice.
- **P1:** Required for a useful MVP release after the vertical slice.
- **P2:** Later enhancement.

### 13.1 Authentication and user management

| ID          | Requirement                                                                                           | Priority |
| ----------- | ----------------------------------------------------------------------------------------------------- | -------- |
| FR-AUTH-001 | The system shall allow a user to register or be invited, subject to the selected onboarding policy.   | P0       |
| FR-AUTH-002 | The system shall authenticate users securely and maintain an authenticated session.                   | P0       |
| FR-AUTH-003 | The system shall support logout and session/token invalidation according to the selected auth design. | P0       |
| FR-AUTH-004 | The system shall expose the current user and active organization context.                             | P0       |
| FR-AUTH-005 | Organization owners shall be able to invite, deactivate, and manage members.                          | P1       |
| FR-AUTH-006 | The system shall enforce role permissions on backend operations.                                      | P0       |

### 13.2 Organization and tenancy

| ID         | Requirement                                                                                     | Priority |
| ---------- | ----------------------------------------------------------------------------------------------- | -------- |
| FR-ORG-001 | An authorized user shall be able to create an organization.                                     | P0       |
| FR-ORG-002 | A user may belong to more than one organization.                                                | P1       |
| FR-ORG-003 | Each organization shall have independent customer-owned data.                                   | P0       |
| FR-ORG-004 | The backend shall resolve and validate organization context for every tenant-scoped request.    | P0       |
| FR-ORG-005 | The system shall prevent cross-tenant reads and writes, including through nested relationships. | P0       |
| FR-ORG-006 | Important organization and membership changes shall be audited.                                 | P1       |

### 13.3 Sites, buildings, and assets

| ID         | Requirement                                                                                     | Priority |
| ---------- | ----------------------------------------------------------------------------------------------- | -------- |
| FR-INF-001 | Authorized users shall create, view, update, and deactivate sites.                              | P0       |
| FR-INF-002 | The system shall support optional buildings and areas under a site.                             | P1       |
| FR-INF-003 | Authorized users shall register and update assets.                                              | P0       |
| FR-INF-004 | Assets shall have an asset type, identifier, name, location, and operational status.            | P0       |
| FR-INF-005 | The initial catalog shall include a generator asset template.                                   | P0       |
| FR-INF-006 | Asset criticality shall be configurable using a documented scale.                               | P1       |
| FR-INF-007 | Asset relationships shall be tenant-consistent and validated by the backend.                    | P0       |
| FR-INF-008 | Users shall be able to view asset history, related sensors, alerts, incidents, and work orders. | P1       |

### 13.4 Sensors, devices, and metrics

| ID         | Requirement                                                                      | Priority |
| ---------- | -------------------------------------------------------------------------------- | -------- |
| FR-SEN-001 | Authorized users shall register a simulated device identity.                     | P0       |
| FR-SEN-002 | Authorized users shall associate one or more sensors with an asset.              | P0       |
| FR-SEN-003 | Each sensor shall have a defined metric and unit.                                | P0       |
| FR-SEN-004 | The system shall validate telemetry against configured metric/unit rules.        | P0       |
| FR-SEN-005 | The system shall track the last valid measurement time for a sensor.             | P0       |
| FR-SEN-006 | The system shall distinguish active, inactive, stale, and unknown sensor states. | P1       |
| FR-SEN-007 | Device identity shall be mapped to authorized organization/site/asset context.   | P0       |

### 13.5 Simulator and telemetry ingestion

| ID         | Requirement                                                                              | Priority |
| ---------- | ---------------------------------------------------------------------------------------- | -------- |
| FR-TEL-001 | The simulator shall publish timestamped generator telemetry.                             | P0       |
| FR-TEL-002 | The simulator shall support normal and fault-injection scenarios.                        | P0       |
| FR-TEL-003 | Telemetry shall be transported through an MQTT broker in the development architecture.   | P0       |
| FR-TEL-004 | The ingestion pipeline shall validate device identity and message structure.             | P0       |
| FR-TEL-005 | Each event shall have a unique event identifier for idempotent processing.               | P0       |
| FR-TEL-006 | The pipeline shall distinguish event time from ingestion time.                           | P0       |
| FR-TEL-007 | Invalid payloads shall be rejected or quarantined with an observable reason.             | P0       |
| FR-TEL-008 | Duplicate events shall not create duplicate persisted measurements or downstream alerts. | P0       |
| FR-TEL-009 | The system shall persist valid telemetry for historical queries.                         | P0       |
| FR-TEL-010 | Temporary downstream failures shall not silently discard accepted messages.              | P0       |
| FR-TEL-011 | The pipeline shall record data quality and late/out-of-order event conditions.           | P1       |
| FR-TEL-012 | Telemetry query APIs shall support time-range filters and bounded result sizes.          | P0       |

### 13.6 Monitoring and visualization

| ID         | Requirement                                                                           | Priority |
| ---------- | ------------------------------------------------------------------------------------- | -------- |
| FR-MON-001 | Users shall view an organization/site summary of registered assets.                   | P1       |
| FR-MON-002 | Users shall view current readings for an asset's configured metrics.                  | P0       |
| FR-MON-003 | Users shall view historical telemetry over a selected time range.                     | P0       |
| FR-MON-004 | Every measurement shown shall include a unit and timestamp context.                   | P0       |
| FR-MON-005 | The interface shall display stale/offline data status distinctly from healthy status. | P0       |
| FR-MON-006 | The interface shall communicate loading, empty, partial-data, and error states.       | P1       |
| FR-MON-007 | The system shall provide asset detail pages with telemetry and operational history.   | P1       |

### 13.7 Threshold rules and alerts

| ID         | Requirement                                                                                                           | Priority |
| ---------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ALT-001 | Authorized users shall configure threshold rules for supported metrics.                                               | P0       |
| FR-ALT-002 | The rule engine shall evaluate valid telemetry against active rules.                                                  | P0       |
| FR-ALT-003 | An alert shall record the triggering value, threshold, metric, asset, rule, and event time.                           | P0       |
| FR-ALT-004 | Alerts shall have severity and lifecycle status.                                                                      | P0       |
| FR-ALT-005 | The system shall deduplicate repeated alerts for a sustained condition using configurable grouping/cooldown behavior. | P0       |
| FR-ALT-006 | Authorized users shall acknowledge and resolve alerts.                                                                | P1       |
| FR-ALT-007 | The system shall retain alert history.                                                                                | P1       |
| FR-ALT-008 | Missing or stale measurements shall not be treated as proof of healthy operation.                                     | P0       |

### 13.8 Incidents

| ID         | Requirement                                                                                | Priority |
| ---------- | ------------------------------------------------------------------------------------------ | -------- |
| FR-INC-001 | Authorized users shall create an incident from an alert or manually.                       | P0       |
| FR-INC-002 | An incident shall reference an organization and affected asset.                            | P0       |
| FR-INC-003 | An incident shall have a severity, status, owner, summary, and timestamps.                 | P0       |
| FR-INC-004 | Authorized users shall assign and reassign incident ownership.                             | P0       |
| FR-INC-005 | Authorized users shall add investigation notes and status updates.                         | P1       |
| FR-INC-006 | Every status transition shall be validated and recorded.                                   | P0       |
| FR-INC-007 | The system shall prevent unauthorized tenant access to incidents.                          | P0       |
| FR-INC-008 | Related alerts, telemetry context, work orders, and maintenance records shall be linkable. | P1       |

### 13.9 Work orders and maintenance

| ID        | Requirement                                                                        | Priority |
| --------- | ---------------------------------------------------------------------------------- | -------- |
| FR-WO-001 | Authorized users shall create work orders for an asset.                            | P0       |
| FR-WO-002 | A work order may be linked to an incident.                                         | P0       |
| FR-WO-003 | Work orders shall support priority, assignee, description, due date, and status.   | P0       |
| FR-WO-004 | Technicians shall view work orders assigned to them.                               | P0       |
| FR-WO-005 | Authorized technicians shall record findings, actions taken, and completion notes. | P0       |
| FR-WO-006 | Work-order status transitions shall be validated and audited.                      | P0       |
| FR-WO-007 | Completed work shall contribute to asset maintenance history.                      | P1       |
| FR-WO-008 | Preventive maintenance scheduling shall be supported in a later release.           | P2       |

### 13.10 Notifications and audit

| ID         | Requirement                                                                                                         | Priority |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-SYS-001 | The system shall provide an in-app notification for relevant assigned incidents/work orders.                        | P1       |
| FR-SYS-002 | Users shall be able to mark notifications as read.                                                                  | P1       |
| FR-SYS-003 | Important changes to roles, asset configuration, rules, incidents, and work orders shall be auditable.              | P1       |
| FR-SYS-004 | Audit records shall include actor, action, target, timestamp, and relevant change context without exposing secrets. | P1       |

### 13.11 Intelligence and analytics

| ID        | Requirement                                                                                                                          | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-AI-001 | The initial system shall provide deterministic threshold-based detection.                                                            | P0       |
| FR-AI-002 | The architecture shall allow a separate Python service to process model inference requests.                                          | P1       |
| FR-AI-003 | The system may add statistical anomaly detection after the telemetry pipeline is validated.                                          | P1       |
| FR-AI-004 | Every stored prediction shall reference its model/version, input window, timestamp, and output metadata.                             | P1       |
| FR-AI-005 | The interface shall distinguish a model estimate from a confirmed failure.                                                           | P1       |
| FR-AI-006 | Calibrated failure probability and remaining-useful-life outputs are later-release capabilities.                                     | P2       |
| FR-AN-001 | The dashboard shall summarize asset counts and current operational statuses.                                                         | P1       |
| FR-AN-002 | The system shall summarize active incidents and work-order statuses.                                                                 | P1       |
| FR-AN-003 | Advanced reliability, downtime, and predictive analytics shall be introduced after their definitions and data quality are validated. | P2       |

## 14. Business Rules

### 14.1 Telemetry event rules

- A telemetry event must be associated with a known device identity.
- Device identity, not an untrusted payload field, determines the allowed tenant and asset scope.
- An event must have a unique `eventId` within the defined producer scope.
- `observedAt` represents when the measurement occurred; `ingestedAt` is assigned by the platform.
- Values must be validated against expected numeric ranges and metric definitions where configured.
- Units must be explicit; unit conversion must be deterministic and documented.
- Invalid messages must not be silently converted into valid-looking measurements.
- Duplicate events must be idempotent.
- Out-of-order events may be stored with their original observation time, but must not corrupt the latest-value view.
- Stale data must have a distinct status.

### 14.2 Alert rules

- An alert is evidence of a configured condition, not necessarily proof of equipment failure.
- The alert must retain the rule version/configuration used at detection time or an immutable representation of the condition.
- Repeated measurements for the same sustained condition should be grouped or suppressed according to a documented cooldown policy.
- Alert severity should be configurable and based on asset/metric context; generic thresholds must not be presented as manufacturer-approved safety limits.
- A missing sensor signal should produce a data-quality/connectivity condition, not a healthy status.

### 14.3 Incident rules

Proposed initial lifecycle:

```text
OPEN → TRIAGED → ASSIGNED → INVESTIGATING → RESOLVED → CLOSED
                      ↘ REASSIGNED ↗
```

- Not every alert must automatically create an incident.
- Incident creation can depend on severity, duration, recurrence, asset criticality, and configured policy.
- Every transition must be authorized and recorded.
- Closing an incident should require a resolution summary.
- Reopening a resolved incident should preserve previous history.

### 14.4 Work-order rules

Proposed lifecycle:

```text
DRAFT → OPEN → ASSIGNED → IN_PROGRESS → COMPLETED → VERIFIED → CLOSED
```

The initial MVP may use a simplified subset, but all status changes must be explicit and validated. A technician may update execution details only for work orders they are authorized to access.

### 14.5 Asset health and risk wording

- A dashboard health label is an operational indicator, not a certified safety classification.
- If data is stale or unavailable, the system must show `UNKNOWN`, `STALE`, or `OFFLINE` rather than infer `HEALTHY`.
- Initial risk scoring, if included, must be documented as a configurable heuristic until calibrated against suitable historical outcomes.
- No universal numeric temperature/vibration threshold should be hard-coded as safe for all equipment types.

## 15. Simulator Requirements

The simulator is a first-class development component used to exercise the ingestion and product workflows. It is not a substitute for field data and must be clearly identified as simulated.

### 15.1 Simulator capabilities

- Generate deterministic or seeded telemetry for repeatable tests.
- Simulate multiple assets/devices under different organizations/sites.
- Publish configurable sampling intervals.
- Generate timestamps and unique event identifiers.
- Support normal, anomaly, fault progression, shutdown, and sensor-offline scenarios.
- Inject missing, duplicated, delayed, and out-of-order messages for resilience testing.
- Produce scenario labels or event metadata for evaluation.
- Allow start, pause, stop, and scenario switching from a development control interface or CLI.

### 15.2 Generator V1 metrics

The exact metric set depends on the simulator's physical assumptions. A proposed initial set:

- Engine/coolant temperature.
- Vibration level.
- Output voltage.
- Output current or load percentage.
- Frequency.
- Running state / operating hours.

Values and fault profiles must be documented as synthetic assumptions. Do not present them as manufacturer specifications or real-world safe operating thresholds.

### 15.3 Generator scenarios

| Scenario                    | Purpose                                    | Expected platform behavior                                        |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------------------- |
| Normal operation            | Establish baseline                         | Measurements display normally; no false critical alert.           |
| Gradual overheating         | Test trend and threshold behavior          | Warning/critical condition appears according to configured rules. |
| Abnormal vibration          | Test second metric and correlation context | Alert shows the affected metric and time.                         |
| Cooling degradation         | Test gradual multi-signal change           | Historical charts show the progression.                           |
| Sudden shutdown             | Test state transition                      | Asset/device status changes and incident policy can be exercised. |
| Sensor offline              | Test missing data                          | UI indicates stale/offline data, never healthy by default.        |
| Duplicate/out-of-order data | Test ingestion robustness                  | Duplicate effects are prevented; timestamps remain correct.       |

### 15.4 Second segment validation scenario

Before calling the product validated for both factories and commercial buildings, add a representative commercial-building scenario such as an HVAC unit. It should define its own metrics, operating profile, thresholds, and use cases. Do not reuse generator thresholds or failure assumptions for HVAC.

## 16. Telemetry Contract — Initial Proposal

Example MQTT payload:

```json
{
  "eventId": "evt_01J...",
  "deviceId": "sim-device-gen-001",
  "schemaVersion": "1.0",
  "observedAt": "2026-11-26T10:30:00.000Z",
  "metrics": [
    {
      "name": "engine_temperature",
      "value": 86.5,
      "unit": "degC",
      "quality": "VALID"
    },
    {
      "name": "vibration",
      "value": 4.2,
      "unit": "mm_per_s",
      "quality": "VALID"
    }
  ]
}
```

Notes:

- The example is illustrative; the final schema should be versioned and validated.
- Organization/site/asset scope should be derived from authenticated device configuration or a trusted device registry, not accepted blindly from the message body.
- `ingestedAt` should be assigned by the ingestion service.
- The message format should support multiple metrics while preserving each metric's unit and quality.
- Schema compatibility rules must be documented before adding new producers.

Proposed topic pattern:

```text
gridaware/{organizationKey}/{siteKey}/{deviceKey}/telemetry
```

The broker must enforce device-level topic permissions. Topic names alone are not a security boundary.

## 17. Data and Integration Architecture Constraints

### 17.1 Transactional data

Neon PostgreSQL is the source of truth for organizations, users/memberships, sites, assets, sensor definitions, alerts, incidents, work orders, and other transactional product records.

Prisma is used for type-safe data access and schema/migration workflows. Runtime connection pooling and direct migration connections must be configured according to the selected Neon/Prisma version and official integration guidance.

### 17.2 Telemetry data

The initial implementation may store telemetry in PostgreSQL using a dedicated time-indexed table and bounded query APIs. The design must measure write volume, storage growth, index size, and query performance before choosing partitioning, retention, or a specialized time-series extension/service.

Do not assume that a particular PostgreSQL extension is available on every managed database plan. Any TimescaleDB decision requires a compatibility and operational review.

### 17.3 Queue and processing

Redis/BullMQ may be used for asynchronous jobs such as alert evaluation, notifications, aggregation, and AI inference orchestration. Jobs must be idempotent and observable. For workflows that write to PostgreSQL and enqueue a job, consider an outbox pattern to avoid a database/queue dual-write gap.

### 17.4 AI service boundary

Python services own model preprocessing, training, evaluation, and inference code. NestJS owns product authorization, tenant context, orchestration, and persistence of product-facing results. The interface must have explicit request/response schemas, timeouts, version metadata, and failure handling.

AI service unavailability must not stop core authentication, asset management, telemetry persistence, or rule-based alerting.

## 18. Non-Functional Requirements

The following are proposed initial targets and must be validated through testing. They are not claims about an already deployed system.

### 18.1 Security and privacy

- Enforce authentication and authorization in the backend.
- Apply tenant-scoped access to all customer-owned records.
- Validate all external inputs, including simulator and MQTT messages.
- Keep secrets out of source control and client bundles.
- Use encrypted connections for hosted services.
- Apply least-privilege credentials to application, migration, and device identities.
- Record important administrative and operational changes.
- Avoid storing sensitive credentials or unnecessary personal information in telemetry and logs.
- Define data export, deletion, retention, and account offboarding behavior before commercial production.

### 18.2 Performance targets for initial benchmark

| Measure                       |                Initial target | Notes                                                         |
| ----------------------------- | ----------------------------: | ------------------------------------------------------------- |
| Standard read API latency     |                  p95 < 500 ms | Under documented test load and with representative queries.   |
| Dashboard telemetry freshness |                   < 5 seconds | In local/staging simulator path under normal test conditions. |
| Initial ingestion benchmark   |             100 events/second | Starting benchmark, not a guaranteed production capacity.     |
| Duplicate processing          | No duplicate business effects | Verified by automated tests.                                  |
| Telemetry query               |           Bounded and indexed | All time-range queries must have safe limits.                 |

### 18.3 Reliability

- Accepted telemetry must not be silently discarded during transient downstream failures.
- Failed jobs must be retryable with bounded retry policy and dead-letter visibility.
- Health endpoints must distinguish process health from dependency health.
- The system must show offline/stale states clearly.
- Database backups and restore tests are required before production.

### 18.4 Scalability

- Separate API request handling from long-running telemetry/AI jobs.
- Keep ingestion workers horizontally scalable where practical.
- Use pagination and time-window limits for large data queries.
- Avoid loading unbounded telemetry ranges into API memory.
- Measure Neon connection usage and worker concurrency.

### 18.5 Maintainability

- Keep NestJS modules aligned with business domains.
- Use DTO/schema validation at system boundaries.
- Keep API and MQTT contracts versioned.
- Maintain automated tests and CI checks.
- Document non-obvious business rules and state transitions.
- Track model versions and evaluation artifacts separately from application releases.

### 18.6 Usability and accessibility

- Present units, timestamps, status, and data freshness clearly.
- Do not communicate status by color alone; use text/icon labels as well.
- Support empty, loading, error, offline, stale, and partial-data states.
- Use consistent date/time display based on user/site timezone while storing timestamps in UTC.
- Provide responsive layouts for desktop and tablet workflows.
- Keep destructive actions explicit and confirmable.

## 19. Success Metrics and Measurement Plan

Metrics are divided into product adoption, operational workflow, data pipeline, and model quality. Baselines are unknown until pilot usage begins.

### 19.1 Product adoption

| Metric                          | Definition                                                                             | Why it matters                       |
| ------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------ |
| Activated organizations         | Organizations with at least one configured site, asset, sensor, and received telemetry | Measures successful onboarding.      |
| Active monitored assets         | Assets with valid recent telemetry                                                     | Measures actual monitoring coverage. |
| Weekly active operational users | Users who view or act on operational records weekly                                    | Measures recurring workflow usage.   |
| Work-order completion rate      | Completed work orders / work orders due in the period                                  | Measures workflow follow-through.    |

### 19.2 Operational workflow

| Metric                     | Definition                                                               |
| -------------------------- | ------------------------------------------------------------------------ |
| Alert acknowledgement time | Time from alert creation to first acknowledgement.                       |
| Incident resolution time   | Time from incident creation to resolution/closure, reported by severity. |
| Assignment delay           | Time from incident creation to assignment.                               |
| Reopened incident rate     | Incidents reopened / resolved incidents.                                 |

These metrics describe workflow activity; they do not by themselves prove reduced downtime or savings.

### 19.3 Data pipeline

| Metric                | Definition                                                |
| --------------------- | --------------------------------------------------------- |
| Valid ingestion rate  | Valid events persisted / valid events received.           |
| Duplicate event rate  | Duplicate events detected / events received.              |
| Data freshness        | Current time minus latest valid observation time.         |
| Processing delay      | Time from ingestion to completion of required processing. |
| Rejected payload rate | Rejected messages / received messages, grouped by reason. |

### 19.4 AI quality — when AI models are introduced

- Precision, recall, F1, and PR-AUC for labeled anomaly evaluation.
- False alarms per asset per day.
- Detection delay from ground-truth event onset.
- Precision/recall and calibration for failure prediction.
- MAE/RMSE for forecasting.
- Performance by asset type and scenario, not just one aggregate score.

Do not publish accuracy claims until the dataset, split strategy, baseline, evaluation procedure, and results are documented and reproducible.

## 20. MVP Acceptance Criteria and Release Gates

The MVP is considered functionally complete only when all P0 requirements pass acceptance testing and the following end-to-end gates are met.

### Gate A — SaaS foundation

- A user can authenticate.
- An organization can be created.
- At least two test organizations can coexist.
- A user cannot access another organization's records by manipulating request IDs.
- Role restrictions are enforced in backend endpoints.

### Gate B — Asset setup

- An authorized user can create a site.
- An authorized user can register a generator asset.
- Sensors and device identity can be associated with the correct asset.
- Invalid cross-organization relationships are rejected.

### Gate C — Telemetry

- Simulator telemetry reaches the MQTT broker.
- The ingestion service validates device and payload.
- Valid readings are persisted.
- Duplicate events do not create duplicate measurements or alerts.
- Event time and ingestion time are both retained.
- Stale/offline data is distinguishable from healthy data.

### Gate D — Monitoring and alerting

- A user can see latest readings with units and timestamps.
- A user can query historical readings within a bounded time range.
- A configured threshold condition produces an alert with complete context.
- Repeated sustained conditions are grouped or suppressed according to policy.

### Gate E — Incident and maintenance

- An authorized user can create or promote an alert into an incident.
- An incident can be assigned and its status transitions are recorded.
- A work order can be created and assigned.
- A technician can record findings and completion notes.
- The resolved incident and completed work order remain visible in asset history.

### Gate F — Operational readiness

- Automated tests cover critical P0 workflows.
- CI runs lint/type-check/tests/build successfully.
- No known critical or high-severity release-blocking security issue remains unresolved.
- Logs and health checks exist for the API and worker.
- Backup and restore procedure is documented and tested for the production database plan.
- Deployment and rollback procedures are documented.

## 21. Risks, Assumptions, and Mitigations

| Risk / assumption                                           | Potential impact                     | Mitigation                                                                                         |
| ----------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Simulator patterns may not represent real equipment         | False confidence in model quality    | Clearly label synthetic data; validate scenarios with domain experts and later field data.         |
| Factories and commercial buildings have different workflows | Overgeneralized product design       | Use a shared core model with configurable asset templates; validate each segment separately.       |
| Scope expands to too many asset types                       | Delayed MVP                          | Keep generator as the first end-to-end asset; add HVAC as a deliberate second validation scenario. |
| Poor telemetry quality                                      | Misleading alerts and charts         | Validate payloads, units, timestamps, and quality; expose stale/missing data.                      |
| Alert fatigue                                               | Users ignore alerts                  | Deduplicate, configure thresholds, record acknowledgements, and evaluate false alarms.             |
| Cross-tenant data leakage                                   | Critical SaaS security failure       | Enforce tenant context at service/data-access boundaries and run negative authorization tests.     |
| Database/queue dual-write failure                           | Lost downstream processing           | Use idempotent jobs and consider a transactional outbox.                                           |
| AI service outage                                           | Delayed intelligence                 | Keep core telemetry persistence and threshold alerts independent of AI availability.               |
| Overstated predictive capability                            | Operational misuse and loss of trust | Label outputs as estimates; require suitable labels, calibration, validation, and human review.    |
| Telemetry volume grows faster than expected                 | Storage and query degradation        | Benchmark early; implement retention, aggregation, indexing, and partitioning based on evidence.   |

## 22. Product Roadmap

The roadmap is ordered by dependency. Dates should be assigned only after estimating capacity and resolving major technical uncertainties.

### Phase 1 — Product Discovery (this document)

- Approve product decisions.
- Define user personas and core workflows.
- Define MVP and non-goals.
- Document product and quality requirements.
- Identify validation questions for customer interviews.

### Phase 2 — UX/UI and interaction design

- Information architecture.
- User flows.
- Wireframes.
- Design system.
- High-fidelity designs for the generator workflow.
- Empty/loading/error/stale/offline states.
- Usability review.

### Phase 3 — System and data design

- System context/container/component diagrams.
- Entity relationship diagram.
- Tenant and permission model.
- API contracts.
- MQTT schema and topic policy.
- Incident/work-order state diagrams.
- Deployment and threat model.

### Phase 4 — Engineering foundation

- Monorepo and code standards.
- Next.js and NestJS applications.
- Prisma and Neon setup.
- Authentication and tenant context.
- CI checks and local development environment.

### Phase 5 — First vertical slice

- Site/asset/sensor configuration.
- Generator simulator.
- MQTT ingestion.
- Telemetry persistence and visualization.
- Threshold rules and alerts.
- Incident and work-order workflows.

### Phase 6 — Intelligence increment

- Data-quality analysis.
- Statistical anomaly baseline.
- Model evaluation and versioning.
- Python inference integration.
- Risk explanation and UI labeling.

### Phase 7 — Segment validation and product hardening

- Add HVAC simulator scenario.
- Validate commercial-building workflows.
- Conduct factory and building user reviews.
- Improve performance, security, and operational tooling.

### Phase 8 — Staging and production pilot

- Production-like staging.
- Load and failure testing.
- Backup/restore verification.
- Security review.
- Pilot release and monitoring.

## 23. Definition of Done

A feature is not complete just because its primary happy path works. A feature is done when:

- Its user story and acceptance criteria are satisfied.
- Backend authorization and tenant isolation are enforced.
- Input validation and error handling are implemented.
- Loading, empty, error, and relevant offline/stale states exist in the UI.
- Unit/integration/E2E tests are added at the appropriate level.
- Logs and important audit events are present.
- API/schema documentation is updated.
- Accessibility and responsive behavior are reviewed.
- No secrets or sensitive data are exposed.
- The change passes CI and is reviewed before merge.

## 24. Open Questions for Later Product Decisions

These questions do not invalidate the approved Product Discovery baseline. They should be answered before the relevant design or release:

1. What organization onboarding model should be used: self-service creation, invitation-only, or both?
2. Can an individual user belong to multiple customer organizations in the first release?
3. Which customer roles need site-level restrictions beyond organization-level roles?
4. Should alerts automatically create incidents for selected severities, or should a user promote them?
5. What is the exact initial incident severity model and SLA language?
6. Which notification channel is required in the pilot: in-app only, email, or both?
7. What retention period should apply to raw telemetry and aggregated data?
8. What exact telemetry sampling interval and simulator event rate should be used for the first benchmark?
9. Which HVAC metrics and building workflows should be included in the second simulator scenario?
10. Which language(s) and time-zone behavior are required for the first user-facing release?

## 25. Glossary

| Term                   | Meaning                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Asset                  | Physical equipment tracked by GridAware.                                                      |
| Sensor                 | Measurement source associated with an asset.                                                  |
| Device                 | Publisher identity, such as a simulator or future edge gateway.                               |
| Telemetry              | Time-stamped operational measurement data.                                                    |
| Metric                 | Named measurement, such as temperature or vibration.                                          |
| Threshold Rule         | Configured condition applied to a metric or state.                                            |
| Alert                  | Detected condition that requires review.                                                      |
| Anomaly                | Behavior identified as unusual relative to a defined baseline or model.                       |
| Incident               | Managed operational case requiring investigation or action.                                   |
| Work Order             | Assigned task for inspection, maintenance, or repair.                                         |
| Tenant                 | Customer organization boundary in the SaaS platform.                                          |
| Data Freshness         | How recently valid telemetry was observed.                                                    |
| Predictive Maintenance | Use of equipment condition and history to estimate maintenance needs or failure risk.         |
| RUL                    | Remaining Useful Life estimate; a later capability requiring appropriate data and validation. |

---

## Approval Record

### Approved product decisions

- [x] Simulator-only initial operation.
- [x] Factories and commercial buildings as target markets.
- [x] Multi-tenant B2B SaaS product model.
- [x] Generator as the first end-to-end scenario.
- [x] NestJS + TypeScript backend.
- [x] Neon PostgreSQL + Prisma ORM.
- [x] Next.js + TypeScript frontend direction.
- [x] Python-based AI services direction.

### Approval note

The product direction and scope baseline above reflect the decisions approved for GridAware Product Discovery. Functional requirements, priorities, proposed targets, and operational policies in this document are the implementation baseline to review during UX and system design. Market hypotheses must still be validated with representative users; this approval does not claim customer validation, measured model performance, or production readiness.

**Document owner:** GridAware Product Team  
**Version:** 1.0
