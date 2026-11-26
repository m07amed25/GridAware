# ADR-0005: Store Telemetry as Event Envelopes and Normalized Measurements

- **Status:** Proposed for approval
- **Date:** 2026-11-26
- **Decision owner:** GridAware engineering
- **Related:** ADR-0002; `telemetry-storage-architecture.md`; `database-erd.md`

## Context

GridAware receives messages from a Device. A single message may carry multiple sensor measurements. The system needs event-level idempotency, source provenance, observed/received timestamps, per-reading quality, and query paths for sensor/asset charts.

Storing one raw JSON row only would simplify ingestion but make relational constraints, metric queries, and quality handling harder. Storing only readings would lose a natural envelope boundary for deduplicating a multi-measurement message.

## Decision

Use two logical persistence models:

1. `TelemetryEvent` stores one accepted publisher envelope and the unique identity `(organizationId, deviceId, sourceEventId)`.
2. `TelemetryReading` stores one normalized measurement per Sensor within the envelope.

The initial contract allows at most one reading per Sensor per event. If repeated samples are required inside one envelope, add a stable sample index and update the uniqueness constraint before rollout.

Store event time and receive time separately. Store normalized measurements in canonical units and preserve raw payload only when required for diagnostics under a shorter retention policy.

## Alternatives Considered

### One row per source envelope only

Advantages: simpler writes, exact raw preservation. Disadvantages: JSON extraction for every chart/query, weaker relational validation, more complex aggregation and quality filtering.

### One row per measurement only

Advantages: simple numeric queries. Disadvantages: event-level deduplication and message provenance require repeating event fields or a separate idempotency table.

### Separate time-series database from the start

Deferred because telemetry volume and retention are not yet measured and the initial product needs a simple source of truth.

## Consequences

Positive:
- Event-level idempotency is explicit.
- Multi-metric envelope supported.
- Per-reading quality and canonical unit are queryable.
- Simulation provenance can be traced.
- Operational metadata and readings can be joined in PostgreSQL.

Negative:
- Each message produces an event row and one or more reading rows.
- Ingestion must persist the envelope/readings atomically.
- Queries need indexes and bounded time windows.
- The one-reading-per-sensor/event assumption must be enforced by the MQTT contract.

## Guardrails

- Persist event and readings in one transaction.
- Deduplicate on organization + authenticated device + sourceEventId.
- Never trust device/organization/asset/sensor IDs in payload without registry validation.
- Use observedAt for charts and receivedAt for ingestion-lag/freshness diagnostics.
- Do not gate telemetry persistence on AI service availability.
- Use outbox events for durable post-commit processing.

## Review Triggers

Revisit if the device protocol emits repeated samples per sensor per envelope, write volume exceeds the measured PostgreSQL capacity/cost target, or query workloads require partitioning or a specialized time-series store.
