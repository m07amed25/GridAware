# GridAware — MVP Scope & Release Definition

**Version:** 1.1  
**Status:** Approved product direction; detailed release plan is proposed  
**Related:** `PRD.md`, `functional-requirements.md`, `user-stories.md`, `success-metrics.md`

---

## 1. Why this MVP exists

The MVP must prove that GridAware can deliver one coherent infrastructure monitoring and maintenance workflow for a multi-tenant organization. It is not intended to prove that every asset category is supported, that an advanced AI model predicts real industrial failures, or that the platform is ready to control physical equipment.

The MVP demonstrates value through a simulated generator scenario while establishing product foundations that can later support factories and commercial buildings.

## 2. Release objective

**Objective:** An authorized user can configure a simulated generator inside an organization/site, observe telemetry, receive a contextual alert when a configured condition is met, manage the resulting incident, assign a work order, and review the recorded resolution.

## 3. Fixed MVP decisions

| Dimension                | Decision                                                                                                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Product model            | Multi-tenant B2B SaaS                                                                                          |
| Markets                  | Factories and commercial buildings                                                                             |
| Initial telemetry source | Simulator only                                                                                                 |
| First equipment          | Generator                                                                                                      |
| Backend                  | NestJS + TypeScript                                                                                            |
| Persistence              | Neon PostgreSQL + Prisma ORM                                                                                   |
| Frontend                 | Next.js + TypeScript                                                                                           |
| Messaging                | MQTT-based simulator ingestion; broker such as Mosquitto for development                                       |
| Background work          | Redis/BullMQ or an equivalent queue where needed                                                               |
| AI                       | Baseline anomaly detection is an incremental capability; advanced prediction is not a core vertical-slice gate |

## 4. Included capabilities

### 4.1 Platform foundations — P0

- User authentication.
- Organization creation and membership.
- Role/permission enforcement.
- Site hierarchy and optional building/area support.
- Tenant-scoped data access.
- Audit records for sensitive actions.
- Environment configuration and service health checks.

### 4.2 Infrastructure registry — P0

- Create a site.
- Register a generator asset.
- Store identity, location, type, criticality, and status.
- Register associated sensors.
- Configure metric names and units.
- Associate simulator identity with permitted asset/sensor scope.

### 4.3 Telemetry — P0

- Generate normal and controlled abnormal telemetry.
- Publish using a documented MQTT topic/message contract.
- Validate payloads and device scope.
- Preserve observed and ingestion timestamps.
- Deduplicate repeated events.
- Persist valid readings.
- Expose bounded historical queries.
- Display last-seen/freshness status.

### 4.4 Monitoring — P0

- Asset overview.
- Current sensor values and units.
- Historical time-series charts.
- Stale/offline/unknown states.
- Basic filters and time-range selection.

### 4.5 Detection — P0/P1 distinction

**P0:** Configurable threshold rules and contextual alert generation.  
**P1:** A baseline anomaly detector after telemetry, labels, and event processing are reliable.

Rule-based alerts and ML anomaly detection must be shown as different detection sources. A threshold violation is not automatically a model-discovered anomaly.

### 4.6 Incident and maintenance workflow — P0

- Create incident manually or from approved alert policy.
- Triage and severity.
- Assign owner.
- Maintain incident timeline.
- Create work order linked to asset and optionally incident.
- Assign technician.
- Record work and completion notes.
- Resolve and close using explicit state transitions.

### 4.7 Analytics — limited P1

- Asset counts by status.
- Current active alerts/incidents.
- Work orders by status.
- Site-level summaries for authorized users.

Advanced reliability analytics, MTBF/MTTR claims, energy optimization, predictive savings, and broad reporting are not required for the first demonstration unless validated user research changes the release plan.

## 5. Explicit exclusions

Out of scope for MVP:

- Physical sensor provisioning and field installation.
- Live integration with customer PLC, SCADA, BMS, or industrial gateways.
- Remote equipment control or write commands.
- Automated shutdown, setpoint adjustment, or safety intervention.
- Universal support for all factory/building equipment.
- Full CMMS replacement, procurement, inventory, parts management, or contractor billing.
- Advanced Remaining Useful Life estimation.
- Production claims based on synthetic data alone.
- Guaranteed downtime reduction or failure prevention.
- Custom per-customer model training.
- Complex enterprise SSO/SCIM unless separately approved.
- Multi-language and multi-currency support unless required by a selected pilot.

## 6. First vertical-slice acceptance scenario

The release is accepted only when this scenario works end to end:

1. Owner creates an organization.
2. Owner creates a site.
3. Authorized user registers a generator asset.
4. User configures sensors and supported metrics.
5. Simulator publishes valid normal telemetry.
6. Backend validates, deduplicates, and stores readings.
7. Dashboard shows current/historical measurements and freshness.
8. Simulator triggers a documented abnormal condition.
9. A rule creates a contextual event/alert.
10. An authorized user triages the event and creates/opens an incident.
11. User assigns a work order to a technician.
12. Technician records investigation and completion.
13. Engineer/manager resolves the incident.
14. Asset history shows event, incident, work order, and resolution.
15. A user from another organization cannot access any of these records.

No step should require manual database edits to make the demo complete.

## 7. Recommended implementation slices and exit gates

### Slice 0 — Local foundation

**Deliver:** Repository, CI, environment validation, database connectivity, Prisma migration workflow, service health checks, baseline observability.  
**Exit gate:** A developer can start required local dependencies and run API tests against an isolated database.

### Slice 1 — Tenant and asset registry

**Deliver:** Authentication, organizations, memberships, roles, sites, assets, sensors, tenant-isolation tests.  
**Exit gate:** Authorized users can create and retrieve generator assets only within their organization.

### Slice 2 — Simulator and ingestion

**Deliver:** Simulator, MQTT configuration, ingestion worker, validation, idempotency, persistence, simulated-data labeling.  
**Exit gate:** Replaying a scenario produces expected records without duplicate side effects.

### Slice 3 — Monitoring UX

**Deliver:** Asset detail, live values, historical charts, time ranges, freshness states.  
**Exit gate:** Users can understand the value, unit, time, and freshness of each measurement.

### Slice 4 — Rules and incidents

**Deliver:** Threshold configuration, alert creation, incident lifecycle, assignment, audit history.  
**Exit gate:** A simulated abnormal condition creates a contextual, deduplicated incident under configured policy.

### Slice 5 — Work orders

**Deliver:** Technician assignment, task view, status updates, completion notes, maintenance history.  
**Exit gate:** The issue can be followed from detection through documented resolution.

### Slice 6 — Pilot analytics and basic ML

**Deliver:** Small operational summaries and, if data quality is sufficient, a baseline anomaly detector with evaluation.  
**Exit gate:** Analytics definitions are documented and model limitations are visible.

### Slice 7 — Pilot readiness

**Deliver:** Staging deployment, security review, performance evidence, backup/restore test, alerting and runbooks.  
**Exit gate:** Release owner accepts the pilot checklist and unresolved risks are documented.

## 8. MVP release acceptance checklist

### Product behavior

- [ ] Core vertical slice is demonstrated without manual database edits.
- [ ] Required fields and statuses are understandable to intended users.
- [ ] Empty, loading, error, offline, and stale states are designed.
- [ ] Incident and work-order transitions are valid and auditable.

### Security

- [ ] Cross-tenant access tests pass.
- [ ] Role and resource-scope tests pass.
- [ ] Credentials and secrets are not exposed.
- [ ] Device/simulator publishing scope is enforced.

### Data reliability

- [ ] Duplicate telemetry is idempotent.
- [ ] Observed and ingestion timestamps are stored.
- [ ] Invalid payloads are observable and not silently accepted.
- [ ] Worker retries and failure recovery are tested.

### Quality and operations

- [ ] Critical backend unit/integration tests pass.
- [ ] Main browser workflow passes E2E tests.
- [ ] Performance tests document workload and results.
- [ ] Backup and restore are tested before real customer data is accepted.
- [ ] Logs, service metrics, and operational alerts exist.

### AI claims

- [ ] Every released model has documented training/evaluation data.
- [ ] No model metric is claimed without a reproducible report.
- [ ] Synthetic-data evaluation is clearly labeled as synthetic.

## 9. MVP risks and mitigation

| Risk                                        | Impact                    | Mitigation                                                                                        |
| ------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| Scope expands to many equipment types       | Delayed coherent release  | Generator-first gate; require evidence for each added type                                        |
| Simulator appears more realistic than it is | Misleading demo/AI claims | Document assumptions and label data simulated                                                     |
| Telemetry volume grows unexpectedly         | Query/storage problems    | Define schema, retention, indexes, and load tests                                                 |
| AI becomes a blocker                        | Core workflow delayed     | Ship rules first; ML is a separately gated increment                                              |
| Tenant access is inconsistent               | Critical security defect  | Central authorization patterns and cross-tenant tests                                             |
| Database connection limits                  | Runtime instability       | Use appropriate pooled runtime connection and direct migration connection; test deployed topology |
| Background processing loses events          | Incomplete monitoring     | Idempotency, retries, outbox/recovery approach, failure injection                                 |
| UI shows stale values as healthy            | Unsafe interpretation     | Explicit freshness and data-quality states                                                        |

## 10. Scope change control

Every request to add a feature to MVP must include target persona/problem, expected value, requirements and acceptance criteria, dependencies/data needs, security/tenant impact, delivery/testing impact, and which existing scope item will be reduced or deferred if capacity is fixed.

A feature is not part of MVP merely because it is technically interesting or uses AI.

## 11. Release naming and claims

Use language such as **prototype**, **simulated MVP**, or **pilot candidate** until corresponding gates pass. Do not describe a simulator-only build as physically connected to equipment. Do not describe synthetic-data anomaly evaluation as proven predictive maintenance for real customer equipment.
