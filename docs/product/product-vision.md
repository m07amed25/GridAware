# GridAware — Product Vision & Strategy

**Version:** 1.1  
**Status:** Approved direction; positioning hypotheses require validation  
**Related:** `PRD.md`, `problem-statement.md`, `target-users.md`, `mvp-scope.md`

---

## 1. Vision statement

**Help organizations understand the operational condition of their infrastructure, identify emerging equipment risks, and coordinate maintenance actions through one data-driven platform.**

GridAware is intended to make asset information easier to observe, interpret, prioritize, and act upon. It connects the asset registry, live and historical telemetry, alerts, risk context, incidents, and maintenance records instead of treating them as unrelated screens.

## 2. Product promise

**From Equipment Data to Actionable Maintenance Intelligence.**

A user should be able to move through five questions:

1. **What do we operate?** Organization, site, building, asset, and sensor context.
2. **What is happening now?** Current measurements, operational state, and freshness.
3. **What needs attention?** Threshold alerts, anomaly indicators, and severity.
4. **Why does it need attention?** Evidence, history, rules, and prediction context.
5. **What happened next?** Assignment, investigation, work order, and resolution record.

## 3. Category, market, and positioning

- **Category:** B2B SaaS for infrastructure monitoring and maintenance decision support.
- **Initial segments:** Factories and commercial buildings.
- **Product model:** Multi-tenant SaaS with organization and site boundaries.
- **Initial operating mode:** Simulator-only.
- **First workflow:** Generator telemetry monitoring and maintenance handling.

Positioning hypothesis:

> For organizations responsible for maintaining equipment across factories and commercial buildings, GridAware is an infrastructure monitoring and maintenance decision-support platform that connects asset context, telemetry, alerts, and maintenance execution in one traceable workflow. Unlike a standalone charting dashboard or isolated alert feed, GridAware links a condition to the asset, responsible person, investigation, and recorded outcome.

This is a hypothesis to test against existing customer tools and alternatives, not a proven market differentiator.

## 4. Strategic outcomes

### Customer outcomes

- More coherent visibility across managed assets and sites.
- Easier access to measurement history during investigation.
- Clearer ownership of alerts and maintenance tasks.
- More complete records of investigation and repair.
- Better ability to identify recurring issues and review asset history.

### Product outcomes

- Users can register an asset and associate sensors with it.
- Telemetry is traceable, time-aware, and quality-aware.
- Alerts are linked to assets and detection logic.
- Incidents and work orders have clear lifecycle states.
- Organization-level data isolation is enforced.
- Product events and model outputs can be measured and audited.

### Engineering outcomes

- Modular NestJS backend with clear domain boundaries.
- Typed Next.js application using documented API contracts.
- Neon PostgreSQL accessed through Prisma.
- Ingestion pipeline designed for duplicates, late messages, and retries.
- Python AI components isolated from core transaction logic.
- Automated tests, CI, deployment controls, and observability.

## 5. Value proposition by audience

| Audience             | Proposed value                                   | Evidence to demonstrate                             |
| -------------------- | ------------------------------------------------ | --------------------------------------------------- |
| Organization Owner   | Organization oversight and controlled access     | Tenant setup, member controls, site summaries       |
| Facility Manager     | Clearer view of equipment and unresolved issues  | Asset status, alerts, incidents, work orders        |
| Maintenance Engineer | Better context for reviewing abnormal conditions | Trends, thresholds, asset history, anomaly evidence |
| Technician           | Clear work ownership and documented completion   | Assigned task, asset details, completion record     |
| Viewer               | Read-only access to operational information      | Authorized dashboards and reports                   |

## 6. Product principles

### 6.1 Context before intelligence

The system must identify organization, site, asset, sensor, metric, timestamp, unit, and quality before advanced analysis is trusted.

### 6.2 Traceability over black-box output

Users must trace an alert to the measurement or rule that produced it. A model result must identify model version and prediction time. The UI must show limitations rather than presenting a risk label as unquestionable truth.

### 6.3 Human-in-the-loop operations

GridAware supports authorized people. It does not independently declare equipment safe, issue control commands, or replace qualified inspection.

### 6.4 Workflow over feature count

A complete workflow is more valuable than many disconnected modules. The first release should demonstrate monitoring through maintenance closure.

### 6.5 Secure multi-tenancy by design

Every user-facing and background processing path must preserve organization ownership and access scope. Tenant isolation is a core product property.

### 6.6 Progressive intelligence

Start with transparent rules and reliable telemetry. Add statistical baselines and ML only when data requirements, evaluation, operational consequences, and failure modes are understood.

### 6.7 Visible data quality

Missing, stale, invalid, duplicated, or delayed measurements must be represented explicitly. Lack of data must never be silently interpreted as healthy operation.

### 6.8 Extensibility without premature complexity

Use a common asset and sensor model that can represent different equipment categories. Do not build generalized configuration systems or microservices until a validated need justifies them.

## 7. Strategic product pillars

### Pillar A — Infrastructure Registry

A reliable inventory of organizations, sites, buildings, assets, and sensors. This is the context layer for all monitoring and maintenance data.

### Pillar B — Operational Monitoring

Collect, validate, store, and visualize telemetry. Make current status and history available with clear freshness and data-quality indicators.

### Pillar C — Detection and Prioritization

Provide configurable threshold rules first. Add anomaly detection and predictive models as separately evaluated capabilities. Combine technical evidence with asset criticality only through transparent, configurable logic.

### Pillar D — Maintenance Execution

Connect alerts to incidents, incidents to work orders, and work orders to maintenance records. Preserve who did what and when.

### Pillar E — Learning and Analytics

Summarize trends, incidents, asset availability, and maintenance outcomes. Use outcomes to inform future product and model evaluation without automatically treating every incident as a valid ML label.

## 8. Product evolution

| Horizon         | Focus                                     | Expected capability                                                  |
| --------------- | ----------------------------------------- | -------------------------------------------------------------------- |
| Foundation      | Product definition and design             | PRD, user flows, architecture, data contracts                        |
| MVP             | One complete simulated generator workflow | Registry, telemetry, monitoring, rules, incidents, work orders       |
| Expansion 1     | Validate a second market context          | Simulated HVAC scenario for commercial buildings                     |
| Intelligence    | Evaluated ML capabilities                 | Anomaly detection, failure-prediction experiments, forecasting       |
| Pilot readiness | Controlled external evaluation            | Staging, security, monitoring, user feedback, documented limitations |
| Future          | Broader equipment and integrations        | Additional asset types, device protocols, enterprise integrations    |

No horizon is a release-date commitment. Progress depends on validated requirements, test results, and implementation capacity.

## 9. Differentiation hypotheses

Potential differentiators to test:

- One workflow connecting telemetry to maintenance execution.
- Multi-organization and multi-site structure from the beginning.
- Asset-centric historical context.
- Explicit data-quality and freshness indicators.
- Explainable, versioned intelligence outputs.
- Consistent operational experiences for managers, engineers, and technicians.

Do not claim these are unique to GridAware until competitive research is completed.

## 10. What GridAware is not

- Not a SCADA replacement.
- Not a PLC or industrial control system.
- Not a safety certification platform.
- Not a guarantee of failure prevention.
- Not an autonomous maintenance agent.
- Not a generic AI chatbot with asset data attached.
- Not a full CMMS replacement in the first release.
- Not a platform with validated real-world predictive accuracy merely because it can run a model.

## 11. Product decision filters

For each feature request, ask:

1. Which target user has this problem?
2. What existing workflow does it improve?
3. Does it strengthen the asset-to-action workflow?
4. Is it required to demonstrate the MVP?
5. Does it introduce safety, privacy, tenant-isolation, or data-quality risks?
6. Can it be tested with a clear acceptance criterion?
7. Does it require real hardware or a new equipment-specific model?
8. What is the smallest useful version?

If these questions cannot be answered, keep the request as an idea rather than committed scope.

## 12. Vision success criteria

The vision is being translated effectively when a pilot user can:

- Find an asset within the correct organization and site.
- Understand the freshness and trend of its measurements.
- See why a condition was flagged.
- Identify the responsible person and current incident status.
- Review what maintenance action was performed.
- Trust that other organizations cannot access their data.

The long-term vision remains aspirational; these observable behaviors are the first evidence that GridAware is moving toward it.
