# Quickstart & Validation Guide: Sensors & Device Management

**Feature**: `005-sensors-device-management`

## Prerequisites

- Docker Compose running local PostgreSQL/Neon connection, Redis, and Mosquitto (`docker compose -f docker-compose.dev.yml up -d`)
- `pnpm install` completed at repository root
- Prisma migrations applied and metric catalog seeded

## Setup Commands

```powershell
# 1. Apply migrations and generate Prisma client
pnpm --filter server prisma:migrate:dev
pnpm --filter server prisma:generate

# 2. Seed canonical MetricDefinition catalog
pnpm --filter server seed:metrics

# 3. Run unit and e2e integration tests
pnpm --filter server test
pnpm --filter server test:e2e -- devices-sensors.e2e-spec.ts
pnpm --filter server test:e2e -- mqtt-acl.e2e-spec.ts
```

## End-to-End Validation Scenarios

1. **Device Onboarding & One-Time Secret**: Sign in as `OWNER` or `FACILITY_MANAGER` -> create a minimal `Asset` under a `Site` -> register a `SIMULATOR` device (`PENDING`) -> call `POST /api/v1/devices/:id/provision` -> verify plaintext password is returned once -> call `GET /api/v1/devices/:id/credentials` and confirm zero secret material is returned -> call `POST /api/v1/devices/:id/activate` and verify status becomes `ACTIVE`.
2. **Sensor & Metric Configuration**: Register `gen-001-engine-temperature` (`PLANNED`) under the Asset -> configure `temperature` (`°C`) via `PUT /api/v1/sensors/:id/metrics` -> assign sensor to the device -> activate sensor.
3. **Cross-Tenant & RBAC Isolation**: Attempt to link Organization B's asset/device/sensor from Organization A (expect `404`/`403` without leaking existence); attempt credential provisioning as `ENGINEER` (expect `403`).
4. **Broker ACL & Simulator Envelope**: Connect local simulator using provisioned credentials -> publish valid telemetry/status to `gridaware/v1/orgs/{orgId}/devices/{deviceKey}/telemetry` -> verify `Device.lastSeenAt` updates and UI shows `ONLINE` with `SIMULATOR` provenance -> attempt publish to another device's topic (expect broker rejection) -> suspend device and confirm reconnection is rejected.
5. **UI States & Accessibility**: Visit `/app/organizations/[orgSlug]/devices` and `/sensors` -> verify loading, empty, error, forbidden, `UNKNOWN`, `ONLINE`, `STALE`, `OFFLINE`, `MAINTENANCE`, and `RETIRED` states render with non-color cues and keyboard navigation.
