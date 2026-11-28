# Implementation Plan: Sensors & Device Management

**Branch**: `005-sensors-device-management` | **Date**: 2026-11-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-sensors-device-management/spec.md`

## Summary

Deliver Phase 5.6 (Sensors & Device Management) as a tenant-isolated registry and security lifecycle layer connecting GridAware's infrastructure assets to incoming operational measurements. This feature introduces a minimal tenant-scoped `Asset` foundation, `Device` and `Sensor` registries, a seeded canonical `MetricDefinition` catalog, `SensorMetric` configuration, `DeviceSensorAssignment` authorization boundaries, one-time `DeviceCredential` provisioning with immediate-cutover rotation and revocation, Mosquitto broker authentication/ACL synchronization for the site-independent topic namespace `gridaware/v1/orgs/{organizationId}/devices/{deviceKey}/{telemetry|status|availability}`, envelope contract validation, derived freshness semantics, audit logging, and EVARAX-compliant WCAG 2.2 AA frontend management screens.

## Technical Context

**Language/Version**: TypeScript 5.x (Node.js 22 LTS) for `server/` and `client/`; Python 3.11+ for local simulator verification
**Primary Dependencies**: NestJS 11 (`server/`), Prisma ORM 7 + Neon PostgreSQL, Next.js 16 App Router + Tailwind CSS (`client/`), Eclipse Mosquitto 2.x (MQTT 5 local broker), `argon2` / Node `crypto` for credential hashing
**Storage**: Neon PostgreSQL via Prisma ORM 7 (`server/prisma/schema.prisma`) with reviewed SQL migrations
**Testing**: Jest (unit + e2e integration in `server/`), Mosquitto container ACL integration tests, Playwright / Vitest (frontend UI states), `pnpm contracts:validate`
**Target Platform**: Linux/Docker container server (`server/` port 3001, `/api/v1`), modern web browsers (`client/` port 3000)
**Project Type**: Full-stack monorepo web application (`pnpm` workspace: `server/`, `client/`, `docker/`, `docs/contracts/`)
**Performance Goals**: Authenticated read API `p95 < 300 ms` (ceiling `< 500 ms`); paginated list queries bounded to max `100` items/page
**Constraints**: Zero plaintext secret storage/logging; strict `organizationId` tenant isolation via composite DB keys + service scoping; no physical equipment actuation or high-volume telemetry persistence in this phase
**Scale/Scope**: Multi-tenant B2B SaaS; initial MVP simulator-first generator workflow; 7 database models (minimal `Asset`, `Device`, `DeviceCredential`, `Sensor`, `MetricDefinition`, `SensorMetric`, `DeviceSensorAssignment`), 6 NestJS domain modules, 4 primary frontend screens

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate Status | Compliance Notes |
|-----------|-------------|------------------|
| **I. Tenant Isolation & Least-Privilege Access** | PASS | All tenant entities carry `organizationId` and `@@unique([id, organizationId])` composite keys. Human RBAC derives from `Membership`; `OWNER` and `FACILITY_MANAGER` only for credential provisioning/rotation and device suspend/revoke; `TECHNICIAN` scoped. Device auth derives from provisioned credentials + broker ACLs. |
| **II. Decision-Support Only — No Physical Equipment Control** | PASS | Publish-only device topics (`telemetry`, `status`, `availability`). Zero command/actuation topics or APIs. |
| **III. Simulator-First Provenance & Incremental Scope** | PASS | `deviceType: SIMULATOR` explicitly labeled in API responses and UI. High-volume telemetry persistence and ML/anomaly pipelines remain out of scope. |
| **IV. Durable, Idempotent & Truthful Telemetry Pipeline** | PASS | Envelope contract validates `eventId`, finite values, and timestamps; freshness states (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, `MAINTENANCE`) never default to `HEALTHY`. |
| **V. Modular Monolith & Explicit Service Boundaries** | PASS | New modules (`assets`, `devices`, `sensors`, `device-credentials`, `device-provisioning`, `metric-catalog`, `mqtt-access`) live inside `server/src/` with thin controllers and zero circular dependencies. |
| **VI. Contract-First Interfaces & Runtime Validation** | PASS | REST DTOs validated via `class-validator`; MQTT telemetry/status envelopes validated against JSON Schemas (`contracts/mqtt-envelope.md`). |
| **VII. Progressive, Explainable Intelligence & Auditability** | PASS | All 17 security-sensitive device/sensor/assignment/credential mutations emit redacted `AuditLog` entries with `requestId`/`correlationId`. |
| **VIII. Operational Clarity, EVARAX Fidelity & WCAG 2.2 AA** | PASS | Device/Sensor list and detail screens use EVARAX tokens, non-color status indicators, keyboard navigation, and all required loading/empty/error/forbidden/stale/offline/maintenance states. |

*Post-Design Re-Check*: PASS — All data-model constraints, REST/MQTT contracts, and quickstart verification steps satisfy Principles I–VIII with zero violations.

## Project Structure

### Documentation (this feature)

```text
specs/005-sensors-device-management/
├── plan.md              # This file
├── research.md          # Phase 0 architectural decisions
├── data-model.md        # Phase 1 Prisma entities, constraints, and state machines
├── quickstart.md        # Phase 1 end-to-end validation guide
├── contracts/           # Phase 1 REST API and MQTT envelope contracts
│   ├── rest-api.md
│   └── mqtt-envelope.md
└── tasks.md             # Phase 2 dependency-ordered task list (/speckit-tasks)
```

### Source Code (repository root)

```text
server/
├── prisma/
│   ├── schema.prisma                    # Add Asset, Device, DeviceCredential, Sensor, MetricDefinition, SensorMetric, DeviceSensorAssignment
│   ├── seed-metrics.ts                  # Seed canonical MetricDefinition catalog
│   └── migrations/                      # Reviewed SQL migration (including partial unique index for active DeviceSensorAssignment)
├── src/
│   ├── assets/                          # Minimal tenant-scoped Asset foundation (FR-000)
│   ├── authorization/                   # Extend permission-map.ts with devices.*, sensors.*, device_credentials.*, assets.*
│   ├── devices/                         # Device CRUD, lifecycle state machine, freshness derivation
│   ├── sensors/                         # Sensor CRUD, lifecycle state machine, SensorMetric config, DeviceSensorAssignment
│   ├── device-credentials/              # One-time secret generation, argon2/PBKDF2 hashing, immediate-cutover rotation, revocation
│   ├── device-provisioning/             # Provisioning orchestration + Mosquitto auth/ACL sync adapter
│   ├── metric-catalog/                  # Canonical MetricDefinition read/validation service
│   └── mqtt-access/                     # Topic ACL policy builder + telemetry/status envelope validator
└── test/
    ├── devices-sensors.e2e-spec.ts      # API, RBAC, lifecycle, and cross-tenant isolation tests
    └── mqtt-acl.e2e-spec.ts             # Local Mosquitto broker auth & topic ACL isolation tests

client/
├── app/(protected)/app/organizations/[orgSlug]/
│   ├── devices/
│   │   ├── page.tsx                     # Device list screen
│   │   └── [deviceKey]/page.tsx         # Device detail screen (overview, credentials metadata, assigned sensors, topics, audit)
│   └── sensors/
│       ├── page.tsx                     # Sensor list screen
│       └── [sensorKey]/page.tsx         # Sensor detail screen (overview, metric config, device assignment, freshness, audit)
├── components/
│   ├── devices/                         # Device table, registration/provisioning modals, one-time secret dialog, lifecycle actions
│   └── sensors/                         # Sensor table, registration/metric config/assignment modals, freshness badges
└── lib/
    └── api/                             # Typed API clients for assets, devices, sensors, metrics

docker/
└── mosquitto/
    ├── mosquitto.conf                   # Local broker auth & ACL config (anonymous disabled)
    └── entrypoint.sh                    # Password/ACL file initialization
```

**Structure Decision**: Extends the existing `pnpm` monorepo (`server/` NestJS modular monolith + `client/` Next.js App Router + `docker/mosquitto/`) following established conventions from Phases 5.1–5.4.

## Complexity Tracking

No Constitution violations — table intentionally omitted.
