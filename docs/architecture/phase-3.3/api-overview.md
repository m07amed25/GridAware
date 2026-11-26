# API Overview and Contract Principles

**ID:** ARC-API-OV-001 · **Version:** 0.1 · **Status:** Proposed

## 1. Responsibilities and service boundaries

NestJS is the public application API and business-rule owner. It authenticates human users, resolves Membership, enforces tenant and role permissions, validates commands, accesses Neon through Prisma, and returns user-facing data to Next.js.

The telemetry ingestion worker consumes MQTT messages, validates Device/Sensor ownership, persists accepted records, and creates durable work for downstream processing. It is not a public REST API.

The Python AI service performs model-specific preprocessing/inference and returns structured outputs. It does not expose public browser APIs, define tenant authorization, or directly mutate product records. NestJS owns persistence of business-linked Prediction, Anomaly, and RiskAssessment records.

## 2. API surfaces

| Surface | Consumer | Transport | Exposure |
|---|---|---|---|
| Product API | Next.js | HTTPS REST | Public application API |
| Live updates | Next.js | WSS | Authenticated, tenant-authorized |
| Device ingestion | Simulator initially | MQTT | Broker endpoint, device credential scoped |
| Background jobs | NestJS / workers | Redis + BullMQ | Internal only |
| AI inference | NestJS worker | Internal HTTP(S) | Private network only |
| Health probes | Platform | HTTP | Sanitized/restricted |

## 3. Versioning

Public REST base: `/api/v1`. The version identifies the public contract generation, not the application deployment version. Additive optional response fields are generally compatible. Renaming/removing fields, changing meaning, changing enum semantics, or making optional inputs required is breaking and needs a migration plan or new version.

Do not expose Prisma model structures as permanent public DTOs. DTOs should represent business concepts and may aggregate multiple database entities.

## 4. Tenant context

Human requests are authorized by the authenticated User plus an active Membership in the Organization that owns the requested resource. Example routes:

- `GET /api/v1/organizations/{organizationId}/sites`
- `GET /api/v1/sites/{siteId}/assets`
- `GET /api/v1/assets/{assetId}`

A route ID is not authorization. Every target and parent resource must be loaded under tenant scope. A client-supplied `organizationId` in a body is never trusted as evidence of ownership.

Device identity is separate: MQTT credentials map to a registered Device and its Organization/Site scope. Topic path and payload IDs are checked against that trusted record.

## 5. Domain ownership and mutation boundaries

| Resource | Public boundary | Mutation policy |
|---|---|---|
| User | Identity | Self-profile fields only |
| Organization/Membership | Organization access | Owner/Admin policies |
| Site/Building | Facilities | Authorized tenant roles |
| Asset | Asset domain | Facility/engineering role |
| Device/Sensor | Device domain | Provisioning and technical roles |
| Telemetry | Telemetry domain | Ingestion-owned; REST read/query only in MVP |
| SimulationRun | Simulation domain | Authorized simulator operators |
| AnomalyEvent | Intelligence | System-created; constrained acknowledge/dismiss actions |
| Prediction/RiskAssessment | Intelligence | System-created, versioned snapshots |
| Incident | Incident domain | Command-oriented workflow |
| WorkOrder | Maintenance | Command-oriented workflow |
| Notification | Notifications | User can read/mark own notification; delivery is system-owned |
| AuditLog | Audit | Append-only writes; restricted search |

## 6. Command-oriented workflows

Use explicit command routes for state transitions rather than generic PATCH operations that permit arbitrary status changes. Examples:

- `POST /incidents/{incidentId}/triage`
- `POST /incidents/{incidentId}/assign`
- `POST /incidents/{incidentId}/resolve`
- `POST /incidents/{incidentId}/close`
- `POST /work-orders/{workOrderId}/start`
- `POST /work-orders/{workOrderId}/complete`

Each command validates current state, actor permission, required evidence, and concurrency/version rules, then writes the new state and its history event in one database transaction.

## 7. Endpoint contract requirements

Every route must document method/path, auth, permission, tenant scope, path/query/header/body schemas, successful response, error codes, paging/filtering, idempotency behavior, audit/history effects, outbox effects, and rate/payload limits.

## 8. Internal details that must not leak

Do not expose outbox row IDs, queue job IDs, worker hostnames, broker credentials, raw connection strings, model filesystem paths, or private service addresses. Provide safe public IDs and request/correlation IDs for support instead.
