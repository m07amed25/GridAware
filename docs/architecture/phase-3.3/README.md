# GridAware — Phase 3.3: API, Events & Integration Contracts

**Version:** 0.1 · **Status:** Draft for technical review · **Date:** 2026-11-26

## Purpose

Phase 3.3 translates the product/domain/database design into explicit contracts between Next.js, NestJS, MQTT devices/simulator, background workers, Redis/BullMQ, Neon PostgreSQL, WebSockets, and the internal Python AI service. The goal is to prevent each implementation area from independently inventing payloads, authorization rules, retry semantics, or error behavior.

These files are **design proposals**, not implemented endpoints or deployed services. Items marked Proposed/Open Decision must be reviewed before implementation. The machine-readable files are starter contracts and require validation before code generation.

## Approved baseline

| Concern | Baseline |
|---|---|
| Product | Multi-tenant B2B SaaS for factories and commercial buildings |
| First workflow | Simulated generator → telemetry → monitoring → anomaly/event → incident → work order |
| Data source | Python simulator only for the MVP |
| Frontend | Next.js + TypeScript |
| Backend | NestJS + TypeScript, modular monolith |
| Database | Neon PostgreSQL + Prisma ORM |
| Messaging | MQTT; Mosquitto is the initial broker candidate |
| Jobs | Redis + BullMQ, proposed |
| AI | Internal Python/FastAPI boundary; advanced inference deferred until validated |
| Safety | Monitoring and decision support only; no commands to physical equipment |

## Documents

1. [API Overview](./api-overview.md)
2. [REST API Endpoint Catalog](./rest-api-endpoint-catalog.md)
3. [Request, Response, Pagination & Error Standards](./request-response-error-standards.md)
4. [Authentication & Authorization Contracts](./authentication-authorization-contracts.md)
5. [MQTT Topic & Message Contracts](./mqtt-topic-message-contracts.md)
6. [WebSocket Event Contracts](./websocket-event-contracts.md)
7. [Background Jobs & Transactional Outbox](./background-jobs-outbox-contracts.md)
8. [Python AI Service Integration Contract](./ai-service-integration-contract.md)
9. [Validation, Idempotency, Retry & Ordering](./validation-idempotency-retry-ordering.md)
10. [Contract Test & Review Checklist](./contract-test-review-checklist.md)
11. [Open Decisions & ADR Index](./open-decisions-adr-index.md)
12. [Phase 3.3 Review Gate](./phase-3.3-review-gate.md)
13. [ADR-0006 — Versioned REST API](./architecture-decision-records/ADR-0006-versioned-rest-api.md)
14. [ADR-0007 — MQTT QoS and Device Topics](./architecture-decision-records/ADR-0007-mqtt-qos-and-device-topics.md)
15. [ADR-0008 — Transactional Outbox](./architecture-decision-records/ADR-0008-transactional-outbox.md)
16. [ADR-0009 — Internal AI Service Boundary](./architecture-decision-records/ADR-0009-internal-ai-service-boundary.md)

## Machine-readable contracts

See [`docs/contracts/`](../../contracts/):
- `openapi.yaml` — OpenAPI 3.1 starter specification for core public REST routes.
- `asyncapi.yaml` — AsyncAPI 2.6 starter specification for MQTT channels.
- `schemas/` — JSON Schema 2020-12 payload definitions.

## Contract principles

1. **Server-derived tenant access:** an organization ID supplied by a browser is only a requested scope, never proof of access. Human access is resolved through active Membership. Device access is derived from device credentials and broker ACLs.
2. **Domain contracts are not Prisma models:** API DTOs are stable transport contracts and may map to multiple persistence records.
3. **At-least-once delivery:** MQTT and queue consumers can receive duplicates. Idempotency is mandatory; end-to-end exactly-once processing is not promised.
4. **PostgreSQL is the source of truth:** WebSockets are best-effort notification/update channels, not durable records.
5. **Persist first, process later:** telemetry persistence must not depend on AI availability.
6. **Traceability:** propagate request, correlation, causation, event, and aggregate identifiers across boundaries.
7. **Version contracts:** breaking message/API semantics require explicit version or migration handling.
8. **Simulator provenance:** simulator-generated data remains marked as `SIMULATOR` through storage, UI, export, and model evaluation.
9. **No equipment control:** the MVP has no MQTT command topic or public command to control physical assets.

## Naming and data conventions

| Concern | Convention |
|---|---|
| Public API base | `/api/v1` |
| Internal AI base | `/internal/v1` |
| WebSocket path | `/ws/v1` (proposed) |
| JSON fields | `camelCase` |
| Enums | `UPPER_SNAKE_CASE` |
| IDs | UUID strings in public contracts unless documented otherwise |
| Time | UTC ISO 8601/RFC 3339 timestamps |
| Units | Metric Definition canonical unit codes |
| Collection paging | Cursor-first for telemetry and event history |
| Error identity | Stable `code` plus `requestId` |

## Implementation order

1. Shared DTO/schema and error conventions.
2. Health, identity, and tenant scope.
3. Sites, buildings, assets, devices, and sensors.
4. MQTT envelope validation and simulator publishing.
5. Telemetry persistence, deduplication, and outbox.
6. Telemetry query API and real-time fan-out.
7. Threshold evaluation, anomaly lifecycle, incident and work order commands.
8. AI inference integration after deterministic telemetry processing is stable.

## Exit criteria

Phase 3.3 is ready for approval when endpoint schemas and permissions are reviewed; MQTT identity/QoS semantics are tested against the actual broker/client; WebSocket authorization and reconnect behavior are defined; jobs/outbox have stable identities and retry rules; AI requests/results are traceable and versioned; machine-readable files validate; and contract tests cover tenant isolation, duplicates, invalid data, stale telemetry, illegal state transitions, and downstream outages.
