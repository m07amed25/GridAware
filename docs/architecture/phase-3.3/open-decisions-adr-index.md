# Phase 3.3 — Open Decisions and ADR Index

**ID:** ARC-DEC-33-001 · **Version:** 0.1 · **Status:** Review required

## 1. Decision register

| ID | Topic | Proposed default | Decide before |
|---|---|---|---|
| API-01 | REST versioning | `/api/v1` | Public API |
| API-02 | Pagination | Cursor for time-series/event data | List endpoints |
| AUTH-01 | Browser auth transport | Short-lived access + rotating session/refresh; exact library/provider open | Auth implementation |
| AUTH-02 | Site-level grants | Organization role baseline + Technician assignment rules | Authorization implementation |
| MQTT-01 | Topic hierarchy | Versioned Organization/Site/Device path | Simulator MQTT |
| MQTT-02 | QoS/durability | QoS 1; verify broker/client persistence and redelivery | Broker integration |
| MQTT-03 | Message schema | Versioned JSON + JSON Schema | Simulator publishing |
| WS-01 | Gateway protocol | NestJS gateway; Socket.IO vs native WS open | Frontend real-time |
| JOB-01 | Job queue | Redis + BullMQ | Worker foundation |
| JOB-02 | Event delivery | Transactional outbox + at-least-once consumer | Event workflows |
| AI-01 | Internal authentication | Private network + service identity | AI deployment |
| AI-02 | Inference mode | Sync for bounded inference; async for long/batch tasks | AI integration |
| DATA-01 | Telemetry dedupe | Tenant + authenticated Device + sourceEventId | Ingestion |

## 2. Recommended decisions

### AUTH-01

Use a maintained auth solution rather than writing cryptography/session rotation from scratch. Evaluate multi-tenant Membership, invitation, password reset, revocation, secure cookie support, and Next.js integration. Never store long-lived secrets in localStorage. Record a final ADR before implementation.

### WS-01

NestJS remains the gateway. Socket.IO has room/reconnect ergonomics; native WebSocket is leaner. Select based on client needs, host support, and authorization complexity. The event shape remains transport-neutral. Never use transport room names as authorization.

### MQTT-02

Start with QoS 1. Test persistent session, broker persistence, subscriber restart, and redelivery with the exact broker/client versions. Publisher PUBACK means broker accepted the publish, not that PostgreSQL committed it. Do not promise manual subscriber acknowledgment unless the chosen client supports and tests it.

### JOB-02

Use outbox rows in the same PostgreSQL transaction as business state. The dispatcher may enqueue duplicates; all consumer side effects must be idempotent.

## 3. ADR index

- [ADR-0006 — Versioned REST API](./architecture-decision-records/ADR-0006-versioned-rest-api.md)
- [ADR-0007 — MQTT QoS and Device Topics](./architecture-decision-records/ADR-0007-mqtt-qos-and-device-topics.md)
- [ADR-0008 — Transactional Outbox](./architecture-decision-records/ADR-0008-transactional-outbox.md)
- [ADR-0009 — Internal AI Service Boundary](./architecture-decision-records/ADR-0009-internal-ai-service-boundary.md)

## 4. Intentionally deferred

- Separate time-series database.
- Custom roles and detailed per-site role builder.
- Physical device onboarding beyond logical simulator identity.
- PLC/Modbus/OPC UA support.
- Physical equipment control commands.
- Model training/model registry APIs.
- Multi-region routing.
- Guaranteed replay of all WebSocket events.

These are not MVP blockers unless product evidence changes the scope.
