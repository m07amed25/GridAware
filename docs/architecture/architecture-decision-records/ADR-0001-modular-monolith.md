# ADR-0001: Use a Modular NestJS Backend with Separate Runtime Roles

- **Status:** Proposed for approval
- **Date:** 2026-11-26
- **Decision owners:** GridAware engineering
- **Related:** PRD v1.0; ARC-C4-002

## Context

GridAware needs a backend for authentication, multi-tenant authorization, infrastructure management, telemetry APIs, alerts, incidents, maintenance workflows, and analytics. It also needs background processing for MQTT ingestion, threshold evaluation, notifications, aggregation, and later AI orchestration.

These responsibilities are related to one product domain and will be developed by a small team during the MVP. Starting with many independently deployed microservices would introduce distributed transactions, service discovery, versioned inter-service contracts, additional deployment pipelines, and operational overhead before there is evidence that this complexity is needed.

At the same time, telemetry ingestion and background jobs should not compete directly with latency-sensitive API requests. They need independent concurrency, retries, and scaling controls.

## Decision

Use a **Modular Monolith** implemented in NestJS and TypeScript for the core backend domain. Organize the code around business modules and domain responsibilities.

Deploy/run the same backend codebase using separate runtime roles:

1. **API role:** Handles HTTP requests, authentication, authorization, business commands/queries, and WebSocket gateway responsibilities.
2. **Worker role:** Handles MQTT consumption, telemetry ingestion, BullMQ jobs, rule evaluation, scheduled work, and asynchronous processing.

Both roles may reuse shared domain services, DTOs/contracts, authorization policies where relevant, and Prisma data-access code. They must not duplicate business rules.

Python AI workloads remain in a separate Python service because their language/runtime, model dependencies, training lifecycle, and scaling profile differ materially from the NestJS application.

## Alternatives considered

### A. One NestJS process for API, MQTT, and all workers

**Advantages:** Simplest local setup and deployment model.  
**Disadvantages:** Long-running processing can consume resources needed by interactive requests; separate scaling and failure control are limited.

### B. Microservice per domain from the beginning

**Advantages:** Independent deployment and technology choices; clear network-level boundaries.  
**Disadvantages:** High operational overhead, distributed failure modes, cross-service data consistency concerns, and more contracts than the MVP needs.

### C. Modular NestJS application with separate API/worker runtime roles — selected

**Advantages:** Shared code and domain rules with independent process scaling; fewer distributed boundaries; fits a small team and evolving MVP.  
**Disadvantages:** Requires strict module boundaries, dependency rules, and discipline to prevent the monolith becoming a tightly coupled codebase.

## Consequences

### Positive

- Faster initial delivery with one backend codebase.
- Shared domain logic for API and background processing.
- API and worker workloads can scale independently.
- Easier transactional data consistency within one PostgreSQL database.
- Future extraction into services remains possible when supported by measured requirements.

### Negative / risks

- A poorly structured modular monolith can become tightly coupled.
- API and worker releases may be coupled unless build/deployment packaging is designed carefully.
- Shared database access requires careful transaction, migration, and schema ownership practices.
- Worker jobs need idempotency because retries are expected.

## Guardrails

- Align modules with business domains, not only technical file types.
- Avoid circular module dependencies.
- Keep controllers thin; domain rules belong in services/domain logic.
- Do not let one module reach into another module's internal implementation arbitrarily.
- Define explicit contracts for cross-module operations.
- Keep ingestion processing out of HTTP request handlers.
- Use queues for slow/retryable work.
- Use idempotent handlers and durable dispatch patterns where required.
- Extract a service only when scaling, team ownership, fault isolation, or deployment requirements justify it.

## Review triggers

Revisit this decision if:

- Ingestion throughput requires a different runtime or language.
- A domain needs independent release cadence or ownership.
- Worker/API resource contention persists after independent scaling.
- A subsystem requires a separate data/security boundary.
- The team grows enough to own bounded services independently.

## Implementation status

Not implemented yet. This ADR defines a proposed baseline for Phase 4 engineering foundation.
