# Background Jobs, Transactional Outbox, and Delivery Contracts

**ID:** ARC-JOB-001 · **Version:** 0.1 · **Status:** Proposed

## 1. Purpose

Telemetry enrichment, threshold evaluation, notifications, aggregation, exports, simulator control, and later AI inference must not block ordinary API requests or durable telemetry acceptance. Redis + BullMQ is the proposed MVP queue; Neon PostgreSQL remains the durable system of record.

## 2. Delivery semantics

Assume **at-least-once** job delivery. A job may execute more than once after worker restart, retry, redelivery, or crash. Every consumer must be idempotent. Do not claim exactly-once business processing across PostgreSQL and Redis.

## 3. Transactional outbox pattern

When a database transaction changes product state and requires downstream processing, insert an `OutboxEvent` in the same PostgreSQL transaction.

Examples:
- TelemetryEvent + TelemetryReadings + `telemetry.accepted` outbox row.
- AnomalyEvent + `anomaly.detected` outbox row.
- Incident + first IncidentEvent + `incident.created` row.
- WorkOrder + initial state/history + `work-order.created` row.

A dispatcher claims pending rows and publishes stable references to BullMQ. A crash after enqueue but before marking the row as published may enqueue again; use stable job IDs and consumer-side idempotency. Do not hold a PostgreSQL transaction open during a Redis network operation.

## 4. Outbox logical fields

Recommended logical fields:
- `id`, `organizationId` (nullable only for genuinely global events).
- `aggregateType`, `aggregateId`.
- `eventType`, `eventVersion`.
- `payload` JSON with bounded references, not large telemetry arrays.
- `occurredAt`, `createdAt`.
- `status`: `PENDING`, `PROCESSING`, `PUBLISHED`, `FAILED`.
- `attemptCount`, `nextAttemptAt`, `publishedAt`.
- `correlationId`, `causationId`.
- `lastErrorCode` and safe diagnostics.

Use lease expiry/row claiming to recover a crashed dispatcher. Final indexes/locking strategy are part of Prisma/database implementation design.

## 5. Job payload shape

Include schema version, OutboxEvent ID, event type, tenant ID, aggregate type/ID, correlation/causation IDs, and creation time. Prefer references rather than copied entity graphs. Never include passwords, access tokens, reusable device secrets, or raw unredacted payloads.

```json
{
  "schemaVersion": "1.0",
  "outboxEventId": "8b2dd6f3-32d3-49f6-82c3-3947fe6b1048",
  "eventType": "telemetry.accepted",
  "organizationId": "87e2caa3-b85e-4f8b-a21c-4984d43d4f95",
  "aggregateType": "TelemetryEvent",
  "aggregateId": "1b9dc42f-9f48-4e75-962b-7c8c28e351c4",
  "correlationId": "corr_01JCV...",
  "createdAt": "2026-11-26T10:30:01.000Z"
}
```

## 6. Initial queue/job catalog

| Queue | Job | Trigger | Responsibility |
|---|---|---|---|
| `telemetry-processing` | `telemetry.evaluate` | Telemetry accepted | Freshness, thresholds, processing fan-out |
| `intelligence` | `anomaly.detect` | New window/trigger | Deterministic or ML anomaly analysis |
| `risk-assessment` | `risk.calculate` | New evidence/prediction | Create risk snapshot |
| `incident-automation` | `incident.evaluate-policy` | Anomaly/risk created | Deduplicate and create Incident by policy |
| `notifications` | `notification.deliver` | Notification created | In-app/email delivery |
| `analytics` | `analytics.aggregate` | Scheduled/domain event | Update aggregate/read models |
| `simulation-control` | `simulation.start/pause/resume/stop` | API command | Control simulator worker/run |
| `ai-inference` | `ai.anomaly.infer`, `ai.failure.infer`, `ai.forecast` | Approved intelligence workflow | Call Python service and store result through domain owner |

MVP priority: telemetry evaluation, incident policy, notification delivery, and simulator control. Advanced AI jobs remain disabled until the AI phase.

## 7. Retry policy

Use finite, queue-specific retry counts, exponential backoff with jitter, and timeouts. Retry transient network/availability failures. Do not endlessly retry invalid schema, unsupported version, permission failure, wrong Sensor ownership, illegal state transitions, or idempotency conflicts. Honor safe `Retry-After` hints where relevant. Numeric attempts/delays must be set during implementation based on provider/worker behavior and tested load.

## 8. Dead-letter and replay

Failed jobs retain original job name/version, event/outbox reference, tenant/aggregate, attempts/timestamps, sanitized error code, and correlation ID. Manual replay is operator-restricted and preserves original idempotency key. Never replay a job against deleted/archived records without explicit policy.

## 9. Consumer idempotency

Suggested identities:
- Telemetry consumer: `(outboxEventId, consumerName)`.
- Incident automation: tenant + anomaly fingerprint + policy window.
- Notification delivery: notification ID + channel/provider key.
- AI inference: request ID + task/model/input-window fingerprint.

If effect is already committed, return successful no-op rather than duplicate creation.

## 10. Ordering and backpressure

BullMQ does not guarantee global domain ordering across concurrent workers. For stateful aggregates, check entity version and transition rules. For telemetry, use `observedAt`; late readings update historical analysis but must not overwrite newer latest-state values. Start with conservative concurrency and scale based on queue lag, DB connection use, CPU, and downstream capacity. Apply tenant quotas/fairness. Ensure worker concurrency does not exhaust Prisma/Neon connection pool.

## 11. Observability

Measure queue depth, oldest job age, latency, attempts, failures, dead-letter count, outbox oldest pending age, dispatcher errors, idempotent no-ops, and per-tenant throughput. Alert on sustained backlog and stuck outbox rows.
