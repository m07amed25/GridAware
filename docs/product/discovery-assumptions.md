# GridAware — Discovery Assumptions, Risks & Validation Register

**Version:** 1.1  
**Status:** Open register; update throughout discovery and pilot  
**Related:** `PRD.md`, `problem-statement.md`, `product-vision.md`, `success-metrics.md`

---

## 1. Purpose

This document prevents assumptions from silently becoming product facts. Each uncertain belief is recorded with its impact, confidence, validation method, and current status.

The approved product direction (simulator-only, factories and commercial buildings, multi-tenant SaaS, generator-first) is a planning baseline. It does not mean the market need, willingness to pay, or effectiveness of the proposed workflow has already been proven.

## 2. Status and confidence definitions

**Status:**

- **Open:** Not yet investigated.
- **In validation:** Evidence is being collected.
- **Supported:** Evidence currently supports the hypothesis, but it may change.
- **Rejected:** Evidence contradicts the hypothesis.
- **Deferred:** Not required for the current release; revisit later.
- **Decision:** Product direction explicitly approved by the owner.

**Confidence:**

- **Low:** Based mainly on intuition or limited indirect evidence.
- **Medium:** Supported by some relevant evidence, but important gaps remain.
- **High:** Supported by multiple relevant sources or direct repeatable evidence.

## 3. Approved decisions

| ID   | Decision                                                 | Status   | Product implication                                               |
| ---- | -------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| D-01 | Initial runtime input is simulator-only                  | Decision | No physical sensor/OT integration in the first release            |
| D-02 | Initial market covers factories and commercial buildings | Decision | Product model supports both; coverage rolls out incrementally     |
| D-03 | Product model is multi-tenant B2B SaaS                   | Decision | Tenant isolation is an architecture and test requirement          |
| D-04 | Generator is first end-to-end equipment scenario         | Decision | MVP workflow is generator telemetry to work-order resolution      |
| D-05 | Backend uses NestJS + TypeScript                         | Decision | NestJS is the business API and orchestration baseline             |
| D-06 | Database uses Neon PostgreSQL + Prisma ORM               | Decision | Connection and migration workflow must match selected versions    |
| D-07 | Frontend uses Next.js + TypeScript                       | Decision | Browser application is the primary user interface                 |
| D-08 | AI components use Python where appropriate               | Decision | Model development/serving remains separate from core transactions |

## 4. Product hypothesis register

| ID   | Hypothesis                                                                   | Impact if false | Confidence | Validation method                                          | Status                                                                   |
| ---- | ---------------------------------------------------------------------------- | --------------- | ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| H-01 | Facility teams struggle to see asset condition across multiple tools         | High            | Low        | Interviews and workflow observation                        | Open                                                                     |
| H-02 | Linking telemetry to asset context/history improves investigation            | High            | Low        | Prototype test with engineers                              | Open                                                                     |
| H-03 | Managers need organization/site operational summaries                        | Medium          | Low        | Interviews across both segments                            | Open                                                                     |
| H-04 | Structured incident-to-work-order flow is valuable                           | High            | Low        | Observe maintenance handoff                                | Open                                                                     |
| H-05 | Generator monitoring is a relevant first demonstration scenario              | Medium          | Medium     | Validate with factory/building stakeholders                | In validation                                                            |
| H-06 | HVAC is an appropriate second scenario for commercial buildings              | Medium          | Low        | Interview building operations users                        | Open                                                                     |
| H-07 | One organization/site/asset/sensor model can support both segments initially | High            | Low        | Compare real asset hierarchies                             | Open                                                                     |
| H-08 | Simulator-only is acceptable for early prototype demonstrations              | Medium          | Medium     | Demo feedback; distinguish prototype from production needs | In validation                                                            |
| H-09 | Users can identify meaningful generator measurements and units               | High            | Low        | Review with qualified equipment specialists                | Open                                                                     |
| H-10 | Threshold rules are useful as a first detection mechanism                    | Medium          | Medium     | Workflow test and domain review                            | Supported as an MVP engineering approach, not proof of detection quality |
| H-11 | Anomaly detection adds value beyond thresholds with available data           | High            | Low        | Controlled experiments and user review                     | Open                                                                     |
| H-12 | Customer organizations accept a multi-tenant SaaS deployment model           | High            | Low        | Buyer interviews and security requirement research         | Open                                                                     |

## 5. Technical and operational assumptions

| ID   | Assumption                                                         | Risk        | Validation action                                                     |
| ---- | ------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------- |
| T-01 | MQTT is suitable for initial simulator messaging                   | Low/Medium  | Test reconnect, QoS, duplicate delivery, authorization                |
| T-02 | Neon PostgreSQL supports initial transactional/telemetry workload  | Medium      | Benchmark payload volume, connections, indexes, retention             |
| T-03 | Prisma is suitable for transactional access                        | Low/Medium  | Test migrations, transactions, query behavior, adapter setup          |
| T-04 | Separate worker is appropriate for ingestion/background work       | Medium      | Compare direct API ingestion with worker-based recovery under failure |
| T-05 | Python service is appropriate for ML inference                     | Low/Medium  | Define internal contract and test failure isolation                   |
| T-06 | Initial telemetry volume is manageable in PostgreSQL-native design | Medium/High | Benchmark time-series inserts and queries before retention decisions  |
| T-07 | Redis/BullMQ is suitable for background jobs                       | Medium      | Test retries, idempotency, durability, monitoring, failure recovery   |
| T-08 | WebSockets are needed for initial live monitoring                  | Medium      | Compare polling and WebSocket prototypes for value and complexity     |

## 6. Commercial questions not yet approved

These remain open until research is completed:

- Pricing basis: organization, site, asset, sensor, or usage.
- Trial/demo policy.
- Subscription tiers and limits.
- Data retention tiers.
- Support and onboarding commitments.
- Hosting region and data residency expectations.
- Availability and response-time commitments.
- Integrations and professional-services model.

No pricing, SLA, compliance certification, or customer-adoption claim should be published based only on this discovery baseline.

## 7. Research plan

### 7.1 Participant groups

Seek input from factory maintenance engineers, factory facility/operations managers, commercial-building facility managers, technicians/maintenance contractors, and organization-level operations/engineering decision makers.

A single interview or friendly reviewer is not representative of an entire market.

### 7.2 Research methods

- **Problem interview:** Understand existing workflows without pitching the solution.
- **Artifact review:** With permission, inspect blank/anonymized inspection forms, maintenance logs, asset lists, or alert examples.
- **Workflow observation:** Ask participants to walk through a recent issue from detection to resolution.
- **Prototype evaluation:** After understanding the problem, test information architecture and workflows.
- **Technical validation:** Ask domain specialists to review simulated signals, units, scenarios, and limits of interpretation.

### 7.3 Interview note template

For each interview, record participant code (avoid unnecessary personal identifiers), segment, operating context, role, current tools, current workflow, a recent equipment issue, detection source, evidence used, people involved, information gaps, workarounds, reported consequences/frequency, product implications, contradictions, and follow-up questions.

Use direct quotes only with permission. Separate direct observation, participant statement, researcher interpretation, and product hypothesis.

## 8. Validation experiments

### E-01 — Current workflow discovery

**Question:** How do target users monitor equipment and coordinate maintenance?  
**Method:** Semi-structured interviews and workflow walkthroughs.  
**Evidence:** Process maps, artifacts, repeated pain points, role handoffs.  
**Decision:** Confirm or revise the problem statement and primary user.

### E-02 — Generator scenario relevance

**Question:** Is a generator a suitable first scenario for factory and commercial-building contexts?  
**Method:** Review with facility/maintenance specialists from both segments.  
**Evidence:** Signal availability, maintenance workflow, criticality context, realism feedback.  
**Decision:** Retain generator-first or document a segment-specific alternative.

### E-03 — Alert-context usability

**Question:** Can an engineer understand why an alert was generated and what to inspect next?  
**Method:** Prototype session using a simulated event.  
**Evidence:** Task completion, interpretation errors, time to locate evidence, qualitative feedback.  
**Decision:** Revise alert detail information and terminology.

### E-04 — Incident/work-order workflow

**Question:** Does the workflow match the handoff among engineer, manager, and technician?  
**Method:** Storyboard and clickable prototype walkthrough.  
**Evidence:** Missing states, approval requirements, assignment rules, close-out fields.  
**Decision:** Approve or revise the state machine and permissions.

### E-05 — Simulator credibility

**Question:** Are scenarios useful for demonstrating software behavior without implying real predictive validity?  
**Method:** Domain review of signal assumptions, dynamics, labels, and limitations.  
**Evidence:** Reviewed assumptions, limitations, reproducibility.  
**Decision:** Approve the scenario for engineering/demo use or revise it.

### E-06 — Commercial-building second scenario

**Question:** What is the smallest HVAC workflow that demonstrates relevance to commercial buildings?  
**Method:** Interviews and concept tests with building facility staff.  
**Evidence:** Required metrics, alert types, user tasks, data availability.  
**Decision:** Define an HVAC scenario or keep commercial-building claims limited until later.

## 9. Risk register

| ID   | Risk                                                         | Likelihood |   Impact | Mitigation                                                                  |
| ---- | ------------------------------------------------------------ | ---------: | -------: | --------------------------------------------------------------------------- |
| R-01 | Scope expands across too many equipment types                |       High |     High | Generator-first scope gate; require evidence for each addition              |
| R-02 | Synthetic patterns are mistaken for real-world AI validation |     Medium |     High | Label simulated data; publish dataset/scenario limitations                  |
| R-03 | Unqualified thresholds are interpreted as safety limits      |     Medium |     High | Treat thresholds as configurable rules; seek domain review                  |
| R-04 | Tenant isolation is incomplete                               |     Medium | Critical | Central authorization, relationship validation, adversarial tests           |
| R-05 | Poor data quality creates false alerts                       |       High |     High | Schema validation, freshness/quality states, alert persistence rules        |
| R-06 | Alert volume becomes noisy                                   |     Medium |     High | Debounce, deduplication, grouping, acknowledgement, false-alert review      |
| R-07 | Real customers need physical integration immediately         |     Medium |     High | Validate early; disclose simulator-only first release                       |
| R-08 | Commercial-building needs are underrepresented               |     Medium |   Medium | Add HVAC second-scenario validation before balanced-market claims           |
| R-09 | Database is overloaded by time-series workload               |     Medium |     High | Benchmark, indexes, retention, partitioning, or separate store if justified |
| R-10 | AI service failure blocks core workflow                      |     Medium |     High | Isolate inference; ingestion and core operations continue without AI        |

## 10. Decision log template

| Field              | Description                                    |
| ------------------ | ---------------------------------------------- |
| Decision ID        | Stable identifier                              |
| Date               | Date of decision                               |
| Context            | Problem or uncertainty triggering the decision |
| Options considered | Alternatives evaluated                         |
| Decision           | Selected option                                |
| Rationale          | Evidence and trade-offs                        |
| Consequences       | Product and technical impact                   |
| Owner              | Person accountable                             |
| Review trigger     | New evidence that should reopen the decision   |

## 11. Discovery exit criteria

- Relevant roles from both target segments have been interviewed, or the unvalidated segment is explicitly deferred.
- Current workflows are documented with concrete examples.
- Generator-first is reviewed by a relevant domain stakeholder.
- The need for an HVAC second scenario is understood.
- MVP boundaries are clear and accepted.
- High-impact assumptions have validation owners.
- No unsupported claim about model performance, customer savings, market demand, or compliance is used.
