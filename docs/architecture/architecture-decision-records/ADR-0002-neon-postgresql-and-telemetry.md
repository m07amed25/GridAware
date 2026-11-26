# ADR-0002: Use Neon PostgreSQL as the Initial System of Record

- **Status:** Proposed for approval
- **Date:** 2026-11-26
- **Decision owners:** GridAware engineering
- **Related:** PRD v1.0; ARC-C4-002; Phase 3.2 database design

## Context

GridAware needs durable storage for multi-tenant product records and an initial telemetry history. The product has not yet established a real production telemetry volume or retention profile. The approved baseline selects Neon PostgreSQL and Prisma ORM.

The MVP benchmark target is 100 telemetry events per second as an initial test target, not a production guarantee. The platform must first measure ingestion throughput, query patterns, storage growth, indexes, and connection usage before introducing a specialized time-series store or database extension.

## Decision

Use **Neon PostgreSQL as the initial system of record** for:

- Users, organizations, memberships, and access-related records.
- Sites, buildings, areas, assets, devices, sensors, metrics, and threshold configuration.
- Telemetry events and measurements for the initial MVP.
- Alerts, incidents, work orders, maintenance records, notifications, audit logs, and outbox records.

Use **Prisma ORM** from NestJS API and worker runtimes for typed data access and schema/migration workflows.

Start with PostgreSQL-native telemetry tables, timestamp-oriented indexes, and bounded time-window queries. Evaluate partitioning, archival, and specialized time-series capabilities using measured data and verified Neon compatibility. Do not assume TimescaleDB or any other extension is available on the selected plan.

## Alternatives considered

### A. Neon PostgreSQL for all initial product data including telemetry — selected

**Advantages:** One transactional source of truth, simpler local development, easier joins between telemetry and assets, fewer services to operate.  
**Disadvantages:** Telemetry growth may eventually require partitioning, retention, aggregation, or a specialized store.

### B. PostgreSQL for product data and separate time-series database from day one

**Advantages:** Specialized time-series features and independent telemetry scaling.  
**Disadvantages:** More infrastructure, cross-store consistency, additional backup/monitoring requirements, and premature optimization without measured load.

### C. Object storage / data lake for raw telemetry from day one

**Advantages:** Economical long-term raw data storage and analytics flexibility.  
**Disadvantages:** Not a replacement for low-latency operational queries; adds ingestion and query infrastructure not required for the first workflow.

## Consequences

### Positive

- One durable source of truth for the initial platform.
- Simpler Prisma model and transactional workflows.
- Telemetry can be queried alongside asset and sensor metadata.
- Lower operational complexity during the MVP.

### Negative / risks

- High-volume telemetry can increase table/index size and query costs.
- Long time-range queries can affect operational database performance if unbounded.
- Managed database connection limits require controlled worker concurrency and pooling.
- Data retention and deletion policies must be defined before a production pilot.

## Guardrails

- Store event time and ingestion time separately.
- Index by the access patterns defined in Phase 3.2, likely sensor/metric plus observed time and tenant/resource scoping.
- Enforce unique event identity to support idempotent ingestion.
- Bound all telemetry API queries by time range and result count.
- Design aggregation and retention jobs before data volume becomes large.
- Benchmark realistic message sizes and metric counts.
- Measure query plans, index growth, database connections, and write latency.
- Keep the data-access boundary behind NestJS; do not connect browsers or the simulator directly to Neon.
- Verify the exact Neon and Prisma version-specific pooled/direct connection setup during Phase 4.

## Review triggers

Revisit this decision if:

- The defined ingestion benchmark cannot be met reliably.
- Telemetry workloads degrade transactional query latency.
- Storage retention costs or index growth become unacceptable.
- Required time-series capabilities are unavailable in the selected managed database plan.
- Analytics needs exceed the operational database's suitable workload.

## Implementation status

Not implemented yet. Detailed event/measurement schema, indexing, retention, and connection configuration are Phase 3.2/Phase 4 decisions.
