# GridAware — Architecture & Database Documentation

**Architecture phases:** 3.1 — System Context & C4; 3.2 — Domain Model & Database Architecture  
**Documentation version:** 0.2  
**Status:** Detailed design proposal for review; not an implemented database  
**Product baseline:** GridAware PRD v1.0 / Product Discovery v1.1  
**Last updated:** 2026-11-26

---

## 1. Purpose

This folder defines the first two architecture increments for GridAware. Phase 3.1 describes the system boundary, actors, containers, and high-level data flows. Phase 3.2 translates the approved product scope into a domain model and a relational database design suitable for the simulator-first MVP.

The design is intentionally conservative: use Neon PostgreSQL as the initial system of record, Prisma ORM for typed data access and migrations, and PostgreSQL-native tables for the first telemetry workflow. The project should not introduce a separate time-series database or database extension until realistic load tests justify it.

These documents are design specifications. They do not claim that the schema, indexes, security policies, migrations, or services have already been implemented.

## 2. Approved Product Baseline

| Area | Approved baseline |
|---|---|
| Product | Multi-tenant B2B SaaS infrastructure monitoring and predictive maintenance platform |
| Initial markets | Factories and commercial buildings |
| Initial operating mode | Simulator-first; physical devices are outside the MVP execution scope |
| First vertical slice | Simulated generator → telemetry → monitoring → anomaly/alert → incident → work order |
| Frontend | Next.js + TypeScript |
| Backend | NestJS + TypeScript, Modular Monolith |
| Database | Neon PostgreSQL |
| ORM | Prisma ORM |
| Messaging | MQTT; Mosquitto is the initial broker candidate |
| Background jobs | Redis + BullMQ is the proposed initial implementation |
| AI | Python service boundary; advanced predictive models are later increments |
| Product safety posture | Monitoring and decision support only; no equipment-control commands |

The simulator is a data source, not a privileged shortcut. Simulated data must carry explicit provenance and must never be confused with telemetry from a physical device.

## 3. Documents

### Phase 3.1 — Context and Containers

- [System Context](./system-context.md)
- [C4 Context](./c4-context.md)
- [C4 Container](./c4-container.md)
- [Data Flow Overview](./data-flow-overview.md)
- [Open Architecture Decisions](./open-architecture-decisions.md)
- [ADR-0001 — Modular Monolith](./architecture-decision-records/ADR-0001-modular-monolith.md)
- [ADR-0002 — Neon PostgreSQL and Telemetry](./architecture-decision-records/ADR-0002-neon-postgresql-and-telemetry.md)
- [ADR-0003 — Python AI Service Boundary](./architecture-decision-records/ADR-0003-python-ai-service-boundary.md)

### Phase 3.2 — Domain and Database

- [Domain Model](./domain-model.md)
- [Database ERD](./database-erd.md)
- [Entity Catalog](./entity-catalog.md)
- [Multi-Tenancy Data Model](./multi-tenancy-data-model.md)
- [Telemetry Storage Architecture](./telemetry-storage-architecture.md)
- [Indexing, Queries, and Retention](./indexing-query-retention-strategy.md)
- [Prisma Schema Design](./prisma-schema-design.md)
- [Data Integrity and Lifecycle](./data-integrity-and-lifecycle.md)
- [Database Decisions and Open Questions](./database-decisions.md)
- [ADR-0004 — Tenant Ownership and Isolation](./architecture-decision-records/ADR-0004-tenant-ownership-and-isolation.md)
- [ADR-0005 — Telemetry Event and Measurement Model](./architecture-decision-records/ADR-0005-telemetry-event-measurement-model.md)

## 4. Decision Status Vocabulary

- **Approved product constraint:** Explicitly selected in the product baseline and must be preserved.
- **Proposed baseline:** The recommended technical approach; requires review before implementation.
- **Open decision:** Needs an explicit decision before the relevant implementation or release gate.
- **Deferred:** Intentionally postponed until evidence or a later product phase exists.
- **Future option:** A valid extension, but not a dependency for the simulator-first MVP.

A document marked `Draft` or `Proposed` must not be treated as an approved production design.

## 5. Phase 3.2 Design Summary

1. Every tenant-owned business record carries an organization ownership boundary.
2. A user's access to an organization is represented by a Membership; an authenticated user alone does not imply tenant access.
3. Site, building, asset, device, and sensor ownership must be consistent.
4. Telemetry is represented as an event envelope plus one or more normalized measurements.
5. Event identity is unique within an organization and device, enabling idempotent ingestion.
6. Event time (`observedAt`) and ingestion time (`receivedAt`) are separate.
7. Raw payload retention and normalized measurement retention are separate policy decisions.
8. Incidents and work orders preserve a lifecycle and append-only event history.
9. AI outputs are versioned, time-bounded assessments; they do not overwrite source telemetry.
10. PostgreSQL is the initial store; specialized time-series infrastructure is a benchmark-triggered future decision.

## 6. Recommended Domain Boundaries

| Domain | Owns |
|---|---|
| Identity & Access | Users, memberships, invitations, sessions/identities, authorization context |
| Organizations | Tenant profile and organization lifecycle |
| Sites & Facilities | Sites, buildings, facility metadata |
| Assets | Asset registry, types, criticality, asset status |
| Devices & Sensors | Device identity, sensors, metrics, thresholds |
| Simulation | Simulation runs, scenario metadata, generated-data provenance |
| Telemetry | Event envelopes, normalized readings, ingestion state |
| Intelligence | Anomalies, predictions, model versions, risk assessments |
| Incidents | Incident record, assignment, triage and investigation history |
| Maintenance | Work orders, schedules, maintenance records |
| Notifications | User-facing notification records and delivery state |
| Audit | Security- and operations-relevant audit events |

Domain boundaries are logical ownership boundaries. They do not imply one microservice or one database per domain.

## 7. Phase 3.2 Exit Criteria

Phase 3.2 is ready for approval when:

- The domain concepts and their ownership are understood.
- The ERD covers the MVP use case without modeling every future feature.
- Tenant ownership and cross-tenant isolation rules are explicit.
- The telemetry event and measurement model supports deduplication, late arrival, quality, and time-window queries.
- The incident and work-order lifecycles are represented.
- Important uniqueness rules, foreign keys, indexes, and retention questions are documented.
- The Prisma design approach is compatible with the chosen Prisma/Neon versions and runtime adapter strategy.
- Open decisions have owners and resolution gates.
- No document implies that production migrations or RLS are already deployed.

## 8. Next Architecture Increment

**Phase 3.3 — API, Event, and Integration Contracts** should turn this logical model into implementation contracts:

- REST resources, request/response schemas, pagination, errors, and authorization requirements.
- MQTT topics, QoS, message schemas, validation, and acknowledgement behavior.
- WebSocket event names and subscription authorization.
- BullMQ job payloads, retries, idempotency, and dead-letter handling.
- NestJS-to-Python AI request/response contracts.
- Outbox-to-worker delivery semantics.

After Phase 3.3, Phase 4 can establish the repository, Prisma implementation, migration pipeline, and local infrastructure.


### Phase 3.3 — API, Events, and Integration Contracts

- [Phase 3.3 Index](./phase-3.3/README.md)
- [API Overview](./phase-3.3/api-overview.md)
- [REST API Endpoint Catalog](./phase-3.3/rest-api-endpoint-catalog.md)
- [Request/Response/Error Standards](./phase-3.3/request-response-error-standards.md)
- [Authentication & Authorization](./phase-3.3/authentication-authorization-contracts.md)
- [MQTT Topic & Message Contracts](./phase-3.3/mqtt-topic-message-contracts.md)
- [WebSocket Event Contracts](./phase-3.3/websocket-event-contracts.md)
- [Background Jobs & Outbox](./phase-3.3/background-jobs-outbox-contracts.md)
- [Python AI Integration](./phase-3.3/ai-service-integration-contract.md)
- [Validation, Idempotency, Retry & Ordering](./phase-3.3/validation-idempotency-retry-ordering.md)
- [Contract Test Checklist](./phase-3.3/contract-test-review-checklist.md)
- [Open Decisions & ADR Index](./phase-3.3/open-decisions-adr-index.md)

Machine-readable drafts are in `docs/contracts/`: OpenAPI, AsyncAPI, and JSON Schemas. They require automated validation and approval before code generation or external exposure.

Phase 3.3 proposes `/api/v1`, Membership-derived human authorization, Device-scoped versioned MQTT topics, QoS 1 with idempotent persistence, WebSocket best-effort events with REST recovery, PostgreSQL transactional outbox plus at-least-once BullMQ consumers, and an internal Python AI boundary.
