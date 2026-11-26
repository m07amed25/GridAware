# GridAware — Success Metrics & Measurement Plan

**Version:** 1.1  
**Status:** Proposed measurement framework; numeric targets require baseline data  
**Related:** `PRD.md`, `mvp-scope.md`, `non-functional-requirements.md`, `discovery-assumptions.md`

---

## 1. Purpose

This document defines how GridAware measures product usefulness, workflow effectiveness, platform quality, telemetry reliability, and AI model performance. Metric definitions must remain stable so that a dashboard, report, or evaluation run means the same thing over time.

A metric is not a success claim until its data source, denominator, observation window, exclusions, and calculation are documented. Product metrics, engineering metrics, and model metrics must not be merged into one generic “success score.”

## 2. Measurement principles

1. Separate customer outcomes from system performance and ML metrics.
2. Distinguish simulated environments from pilot/customer environments.
3. Report denominators, sample sizes, and filters.
4. Do not compare metrics across different workloads without explaining the difference.
5. Store timestamps in UTC and define display-timezone behavior.
6. Treat stale and missing data as explicit states.
7. Never equate a model score with calibrated failure probability unless calibration has been tested.
8. Avoid vanity metrics such as raw alert count without quality or action context.
9. Do not claim business savings without a defensible baseline and measurement method.

## 3. Product outcome metrics

### 3.1 Workflow completion rate

**Definition:** Percentage of eligible incidents created in a period that reach the defined terminal state (resolved/closed) within a selected observation window.

`Workflow Completion Rate = Eligible Incidents Closed Within Window / Eligible Incidents Created × 100`

Segment by organization, site, severity, incident source, and period. Define how cancelled, duplicate, test, and reopened incidents are handled.

### 3.2 Time to acknowledge

**Definition:** Elapsed time between incident creation and the first valid acknowledgement/triage action.

`Time to Acknowledge = First Triage Timestamp - Incident Created Timestamp`

Report median and p90/p95, not only average. Define which state transition counts as acknowledgement.

### 3.3 Time to assignment

**Definition:** Elapsed time between incident creation and its first assignment to an eligible owner.

`Time to Assignment = First Assignment Timestamp - Incident Created Timestamp`

Report unassigned incidents separately; otherwise they may disappear from the calculation.

### 3.4 Time to resolution

**Definition:** Elapsed time between incident creation and resolution timestamp.

`Time to Resolution = Resolved Timestamp - Created Timestamp`

Report by severity and incident source. This is an operational workflow measure and is not automatically MTTR in the reliability-engineering sense.

### 3.5 Work-order completion rate

`Completed Work Orders / Work Orders Due in the Period × 100`

Define whether cancelled, deferred, or reopened work orders are included. Report overdue work orders separately.

### 3.6 Asset data coverage

**Definition:** Percentage of configured active sensors expected to report that have supplied at least one valid measurement within the freshness window.

`Data Coverage = Sensors With Valid Recent Measurement / Active Sensors Expected to Report × 100`

Exclude intentionally disabled sensors. Identify sensors without a configured reporting interval rather than silently assuming a freshness window.

### 3.7 Alert review rate

**Definition:** Percentage of eligible alerts that receive a recorded acknowledgement, triage, dismissal, or incident-link action within the review window.

`Alert Review Rate = Alerts With Recorded Review Action / Eligible Alerts × 100`

This metric needs a documented distinction between reviewed, dismissed as noise, and unresolved.

### 3.8 Adoption indicators

Potential signals include weekly active users by role, active sites, monitored assets, reviewed alerts, and updated work orders. These indicate activity, not proof of customer value by themselves.

## 4. Telemetry and platform metrics

### 4.1 Telemetry accepted rate

`Accepted Events / Valid Inbound Events × 100`

Keep malformed/rejected events separate from valid events accepted for processing. Report the number and top reasons for rejection.

### 4.2 Persistence success/accounting rate

`Persisted Unique Accepted Events / Unique Accepted Events × 100`

For events not yet persisted, show pending/retrying/failed state. A target near 100% is expected for the defined test workload, but the metric must account for in-flight work fairly.

### 4.3 Duplicate event rate

`Duplicate Event Deliveries / Total Inbound Deliveries × 100`

A duplicate delivery is not necessarily a failure if safely deduplicated. Track duplicate side effects separately; the intended result for supported idempotent operations is zero additional logical records or business actions.

### 4.4 Telemetry end-to-end latency

Measure separately:

- **Transport/ingestion delay:** ingestion time minus observed time, with device clock-skew caveats.
- **Processing delay:** processing completion minus ingestion time.
- **UI freshness latency:** frontend receipt/display time minus ingestion time.

Report p50, p95, p99, and test workload. Do not rely on a device clock for accurate latency unless clock synchronization is known.

### 4.5 Queue health

Track queue depth, age of oldest pending job, retry count, failed/dead-letter count, and processing throughput. Compare published, accepted, completed, and failed jobs; queue depth alone is not enough.

### 4.6 API performance

Track request rate, error rate, and p50/p95/p99 latency by route class. Separate ordinary reads, writes, telemetry ingestion, WebSocket, exports, and long-running analysis requests.

### 4.7 Availability

For production pilot, define availability as the percentage of agreed measurement intervals during which the key user-facing service is reachable and can complete a defined synthetic transaction. Define planned maintenance, provider outages, and exclusions before publishing an SLA.

## 5. AI and detection metrics

AI metrics are task-specific. Never reduce model quality to one generic accuracy figure.

### 5.1 Anomaly detection

Evaluate with precision, recall, F1, PR-AUC where appropriate, false alerts per asset per day, detection delay from labeled scenario onset, and both event-level and window-level performance where relevant.

Before evaluation, define:

- What constitutes an anomaly event.
- How overlapping detection windows are merged.
- The alert persistence and recovery policy.
- Whether normal periods are sufficiently represented.
- Whether labels are independent of model features.

### 5.2 Failure prediction

Evaluate with precision/recall at a defined threshold and prediction horizon, PR-AUC/ROC-AUC where appropriate, calibration (for example, reliability curves and Brier score), lead time before labeled failure, false positives per asset/time period, and performance by asset type when data permits.

A failure probability must identify its horizon and failure definition. A model trained on an unrelated dataset cannot be called validated for generators without domain-appropriate evidence.

### 5.3 Forecasting

Evaluate using MAE and RMSE. MAPE may be inappropriate when actual values are zero or close to zero; choose metrics based on the variable and operating context. Evaluate multiple forecast horizons and compare with simple baselines.

### 5.4 Model operations

Track inference latency, inference failures, model version distribution, feature/data validation failures, prediction volume by task, and drift indicators where meaningful and supported by labels or review processes.

## 6. Proposed initial engineering targets

These are test goals, not measured claims or customer SLAs.

| Metric                           |       Proposed initial target | Qualification                                               |
| -------------------------------- | ----------------------------: | ----------------------------------------------------------- |
| Ordinary API read latency        |                  p95 < 300 ms | Defined staging workload; excludes AI/exports/cold starts   |
| Telemetry throughput             | 100 events/sec sustained test | Specify payload size, duration, and concurrent publishers   |
| Ingestion-to-UI visibility       |                   p95 < 3 sec | Under normal local/staging conditions                       |
| Duplicate business side effects  |                             0 | For repeated event IDs within supported deduplication scope |
| Unauthorized cross-tenant access |            0 successful cases | Automated negative tests                                    |
| Accepted event accounting        |            100% accounted for | Completed, pending, retrying, or failed/dead-letter state   |
| Release-gating test suite        |                     100% pass | Does not substitute for reviewing test coverage/quality     |

## 7. Instrumentation plan

Potential privacy-conscious events:

| Event                      | When emitted                      | Useful properties                         |
| -------------------------- | --------------------------------- | ----------------------------------------- |
| `organization_created`     | Organization successfully created | Actor role, environment                   |
| `site_created`             | Site created                      | Organization ID, site category            |
| `asset_created`            | Asset created                     | Asset type, site ID, criticality category |
| `sensor_registered`        | Sensor registered                 | Metric type, asset type                   |
| `telemetry_event_accepted` | Unique event accepted             | Source, scenario ID, processing state     |
| `alert_created`            | Alert/event generated             | Rule/detector ID, severity, asset type    |
| `incident_created`         | Incident created                  | Source, severity, site                    |
| `incident_triaged`         | Incident triaged                  | Previous/new state, actor role            |
| `work_order_assigned`      | Work order assigned               | Assignee role, priority                   |
| `work_order_completed`     | Work order completed              | Duration, completion status               |
| `incident_resolved`        | Incident resolved                 | Resolution category, elapsed time         |

Do not send secrets, raw credentials, unnecessary personal data, or sensitive operational details to third-party analytics without a privacy review.

## 8. Metric ownership and cadence

| Metric group               | Suggested owner       | Review cadence                    |
| -------------------------- | --------------------- | --------------------------------- |
| Product workflow           | Product owner         | Weekly during pilot               |
| Adoption                   | Product owner         | Weekly/monthly                    |
| API and telemetry platform | Backend/DevOps        | Continuous alerts + weekly review |
| Data quality               | Data/Backend engineer | Daily during simulator/pilot runs |
| Model quality              | ML owner              | Per experiment/model release      |
| Security                   | Engineering owner     | Per release and scheduled review  |

## 9. Baseline and target-setting procedure

1. Collect baseline measurements from simulator scenarios.
2. Define a representative test workload and data volume.
3. Run repeatable tests against the intended hosting region and resource sizes.
4. Report percentiles and error counts.
5. Validate workflow metrics with users during pilot.
6. Set targets from operational need and measured capacity, not arbitrary marketing numbers.

## 10. Reporting requirements

Every metric report must include metric definition, time window, population/denominator, filters/exclusions, environment, data completeness/freshness, sample size, and calculation version if changed.

## 11. MVP demonstration success criteria

The MVP demo is successful when a simulated generator workflow can be repeated; an event is linked to the correct asset; an incident can be assigned and resolved; timestamps are recorded; data freshness and simulator identity are visible; cross-tenant tests pass; and technical measurements are collected and reported honestly.

This demonstrates software workflow execution. It does not prove commercial adoption or real-world predictive performance.
