# GridAware — Indexing, Query, and Retention Strategy

**Document ID:** ARC-DB-PERF-001  
**Version:** 0.1  
**Status:** Proposed starting point; validate with EXPLAIN and load tests

---

## 1. Objectives

This document defines initial access patterns and database performance guardrails. Indexes should be derived from real query shapes, not added indiscriminately to every column.

The expected workload contains:
- Transactional CRUD for organizations, sites, assets, sensors, incidents, and work orders.
- High-write append-oriented telemetry.
- Time-window queries for charts and incident investigation.
- Dashboard aggregate queries.
- Background jobs and audit/event history.

## 2. Query Guardrails

- Every tenant-owned query includes organization scope.
- Telemetry reads require a bounded time range or a dedicated latest-reading query.
- Paginate list endpoints using a stable ordering; prefer cursor pagination for large/changing tables.
- Do not fetch unbounded telemetry rows for charts. Query aggregate/downsampled series at larger ranges.
- Select only needed columns; avoid returning raw payload JSON in routine list endpoints.
- Avoid N+1 relation loading; use bounded includes/selects and inspect generated SQL.
- Use database transactions for multi-record invariants, not for long-running AI calls or external network requests.
- Do not hold a PostgreSQL transaction open while waiting on MQTT, HTTP AI inference, or user input.

## 3. Initial Index Proposal

Exact index names and sort directions should be generated from the final Prisma model and confirmed by actual query plans.

### Organization and membership

| Table | Proposed constraint/index | Why |
|---|---|---|
| Organization | unique `slug` | Organization routing/lookup |
| Membership | unique `(organizationId, userId)` | One membership per user/tenant |
| Membership | index `(userId, status)` | List active organizations for user |
| Invitation | index `(organizationId, status, expiresAt)` | Pending invitation management |

### Facilities and assets

| Table | Proposed constraint/index | Why |
|---|---|---|
| Site | unique `(organizationId, code)` | Tenant-unique site code |
| Site | index `(organizationId, status, name)` | Site selector/list |
| Building | unique `(organizationId, siteId, code)` | Site-scoped building code |
| Asset | unique `(organizationId, assetCode)` | Tenant-unique asset identifier |
| Asset | index `(organizationId, siteId, status)` | Site asset inventory |
| Asset | index `(organizationId, criticality, status)` | Risk/criticality views |
| Asset | index `(organizationId, buildingId)` | Building inventory |

### Devices and sensors

| Table | Proposed constraint/index | Why |
|---|---|---|
| Device | unique `(organizationId, deviceCode)` | Tenant device identity |
| Device | index `(organizationId, siteId, status)` | Site device health |
| Sensor | unique `(organizationId, sensorCode)` | Tenant sensor identity |
| Sensor | index `(organizationId, assetId, status)` | Asset detail page |
| Sensor | index `(organizationId, deviceId)` | Device-to-sensor authorization |
| SensorThreshold | index `(organizationId, sensorId, effectiveFrom)` | Active/historical threshold selection |

### Telemetry

| Table | Proposed constraint/index | Why |
|---|---|---|
| TelemetryEvent | unique `(organizationId, deviceId, sourceEventId)` | Idempotent event ingestion |
| TelemetryEvent | index `(organizationId, receivedAt DESC)` | Ingestion monitoring |
| TelemetryEvent | index `(organizationId, deviceId, receivedAt DESC)` | Device ingestion history |
| TelemetryReading | index `(organizationId, sensorId, observedAt DESC)` | Primary chart query |
| TelemetryReading | index `(organizationId, assetId, observedAt DESC)` | Asset telemetry history |
| TelemetryReading | index `(organizationId, metricCode, observedAt DESC)` only if query evidence justifies it | Metric exploration/reporting |
| TelemetryReading | unique `(telemetryEventId, sensorId)` | Prevent duplicate sample per sensor/event under current contract |

For a high-write table, each extra index increases write amplification and storage. Benchmark before adding alternate indexes. A BRIN index on time may be evaluated later if the physical row ordering and query plans justify it; it is not required on day one.

### Intelligence and operations

| Table | Proposed constraint/index | Why |
|---|---|---|
| AnomalyEvent | index `(organizationId, status, severity, detectedAt DESC)` | Open/critical anomaly queues |
| AnomalyEvent | index `(organizationId, assetId, detectedAt DESC)` | Asset history |
| Prediction | index `(organizationId, assetId, predictedAt DESC)` | Latest predictions |
| RiskAssessment | index `(organizationId, assetId, assessedAt DESC)` | Latest risk history |
| Incident | unique `(organizationId, incidentNumber)` | Tenant incident number |
| Incident | index `(organizationId, status, severity, detectedAt DESC)` | Incident queue |
| Incident | index `(organizationId, assetId, status)` | Asset-linked incidents |
| WorkOrder | unique `(organizationId, workOrderNumber)` | Tenant work-order number |
| WorkOrder | index `(organizationId, status, dueAt)` | Due work queue |
| WorkOrder | index `(organizationId, assignedToUserId, status)` | Technician queue |
| Notification | index `(organizationId, recipientUserId, readAt, createdAt DESC)` | Notification inbox |
| AuditLog | index `(organizationId, occurredAt DESC)` | Tenant audit history |
| OutboxEvent | index `(status, availableAt, createdAt)` | Dispatcher claims |

## 4. Cursor Pagination

Use cursor pagination for large operational lists and stable orderings such as `(createdAt, id)` or `(detectedAt, id)`. A cursor must be scoped by Organization and filters. Do not expose a cursor that allows a user to cross tenant boundaries.

For small reference lists, offset pagination may be acceptable. Telemetry should use explicit time-window APIs and aggregation rather than ordinary offset pagination.

## 5. Telemetry Query Profiles

### Latest sensor state

Return one latest valid measurement per requested Sensor plus:
- observedAt.
- receivedAt.
- quality.
- sensor staleAfterSeconds.
- status derived by freshness policy.

Avoid querying all historical readings to calculate a latest value repeatedly. A latest-state projection/table/cache may be introduced if benchmarks show the query is expensive; it must be rebuildable from telemetry history.

### Sensor chart

Inputs: organization, sensor, from, to, resolution, optional quality filter.

Rules:
- Validate max time range and resolution combinations.
- Use server-side aggregation/downsampling for wide ranges.
- Return gaps/missing intervals explicitly; do not fill with zero.
- Keep `observedAt` as the time axis.

### Asset chart

Filter by Asset and time range; return a bounded series by metric/sensor. Enforce a point cap and avoid returning every raw sample for large windows.

### Incident context

Fetch a bounded window before and after the detection time. The window size should be configured by metric/detection policy and recorded in incident evidence.

## 6. Retention and Archival

Retention is a product, customer, operational, and potentially legal decision. The following is a policy framework, not a final contractual duration.

| Data class | Storage behavior | Retention decision |
|---|---|---|
| Raw payload | Optional, diagnostic only, redact and bound | Shorter than normalized readings; exact days TBD |
| Normalized telemetry | Primary operational measurements | Define by customer plan / pilot needs |
| Aggregated telemetry | Downsampled chart/report data | May outlive raw data, subject to policy |
| Anomaly events | Operational history | Define business retention and legal needs |
| Predictions/risk snapshots | Explainability and trend history | Define model/audit needs |
| Incidents/work orders | Business maintenance records | Preserve according to customer and legal requirements |
| Audit logs | Security/traceability | Restrict deletion; define compliant retention |
| Outbox events | Delivery/retry mechanics | Delete/archive after terminal state and debug window |

### Retention implementation principles

- Retention must be configurable and documented.
- Delete in bounded batches to avoid long-running locks and load spikes.
- Delete raw payloads independently where normalized readings must be preserved.
- Define whether customer deletion/export is supported and how audit obligations interact.
- Record retention job outcomes and counts.
- Test restoration and deletion semantics.
- Do not cascade-delete business history simply because an Asset is archived.

## 7. Aggregation Strategy

Start by computing bounded aggregates for dashboard/chart requests using SQL queries. If dashboard performance requires it, add daily/hourly rollup tables with explicit bucket keys and an aggregation version.

Possible aggregate fields:
- min, max, avg, count.
- first/last value and timestamp.
- standard deviation/variance where useful.
- quality counts.
- sample coverage ratio.

Do not calculate percentiles from tiny or incomplete windows and present them as statistically robust. Do not average unlike units or mix metrics.

## 8. Partitioning and Specialized Storage

No partitioning or TimescaleDB extension is required for the first simulator-only MVP. The initial unpartitioned design should still use timestamp-aware indexes and bounded queries.

Evaluate native PostgreSQL range partitioning only after measuring table size, retention workload, write volume, and query plans. Partitioned-table unique constraints often require the partition key to be part of the unique key; this must be reflected in the event-idempotency design before adopting partitions.

Evaluate a separate time-series database only when there is evidence that the operational database cannot meet the needed write/query/retention requirements at acceptable cost and complexity. Verify Neon compatibility for any required extension; do not assume extension availability.

## 9. Benchmark Plan

Use a reproducible synthetic workload with realistic event sizes and metric counts. Measure:
- Sustained writes and burst writes.
- Duplicate event rate.
- Write transaction latency p50/p95/p99.
- Latest-value query latency.
- One-hour, one-day, and one-month chart latency.
- Incident-context query latency.
- Index growth and total table size.
- Connection usage and pool wait time.
- Retention batch duration.
- Queue lag and end-to-end freshness.

The PRD's initial 100 events/second target is a benchmark hypothesis, not a guaranteed production capacity. Record the test environment and workload profile with results.

## 10. Review Triggers

Revisit this strategy when:
- Telemetry query latency rises beyond the agreed SLO.
- Retention deletes create unacceptable load.
- One tenant's telemetry volume impacts others.
- Table/index growth becomes operationally expensive.
- The product requires longer history or high-cardinality analytics.
- Database connection pool pressure becomes a bottleneck.
