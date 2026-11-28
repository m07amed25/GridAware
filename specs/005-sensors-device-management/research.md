# Research & Architectural Decisions: Sensors & Device Management

**Feature**: `005-sensors-device-management` | **Date**: 2026-11-27

## 1. Minimal Asset Foundation Scope

- **Decision**: Add a minimal tenant-scoped `Asset` model (`id`, `organizationId`, `siteId`, `buildingId?`, `assetCode`, `name`, `assetType`, `status`) and basic `POST /api/v1/assets` + `GET /api/v1/assets` endpoints in `server/src/assets/`.
- **Rationale**: `server/prisma/schema.prisma` currently stops at `Site` and `Building` (Phase 5.4). Including a minimal `Asset` foundation lets `Sensor.assetId` and `Device.assetId` enforce real database-level tenant-safe foreign keys (`@@unique([id, organizationId])`) immediately without temporary nullable hacks.
- **Alternatives considered**: Making `Sensor.assetId` nullable until a separate Assets phase lands (rejected: creates migration debt and weakens domain invariants).

## 2. Canonical MQTT Topic Namespace

- **Decision**: Standardize on `gridaware/v1/orgs/{organizationId}/devices/{deviceKey}/{telemetry|status|availability}` (site-independent, using `deviceKey`).
- **Rationale**: Matches Phase 5.6 specification and avoids breaking device credentials/ACLs when a device's optional `siteId` is unset or updated. `deviceKey` is immutable after activation.
- **Alternatives considered**: `gridaware/v1/orgs/{organizationId}/sites/{siteId}/devices/{deviceId}/{telemetry|status|events}` from Phase 3.3 draft (rejected because `siteId` is optional on `Device`).

## 3. Device Credential Storage & Rotation Strategy

- **Decision**: Store only cryptographic hashes (`secretHash`) in `DeviceCredential` (using Mosquitto-compatible PBKDF2-SHA512 / Argon2id verifier) and enforce **immediate invalidation** of the previous credential upon rotation (at most one `ACTIVE` credential per device).
- **Rationale**: Eliminates dual-active-secret complexity for the simulator-first MVP, ensures immediate revocation on compromise, and guarantees plaintext secrets are returned strictly once in the provisioning/rotation HTTP response.
- **Alternatives considered**: Time-bounded 24-hour overlap window (deferred to physical hardware fleet phase).

## 4. Broker Auth & ACL Synchronization (Local Mosquitto vs. Production)

- **Decision**: Implement a pluggable `BrokerProvisioningAdapter` interface in `server/src/device-provisioning/`. For local development, provide a `MosquittoFileAdapter` that writes per-device credentials and topic ACL rules to Mosquitto's password/ACL files and triggers `SIGHUP` reload (or container reload). Document production replacement (dynamic security plugin / HTTP auth plugin over TLS).
- **Rationale**: Keeps NestJS domain logic decoupled from Mosquitto file mechanics while enabling real broker-level ACL tests in local Docker Compose.
- **Alternatives considered**: Hardcoding Mosquitto file writes inside `DevicesService` (rejected: violates modular boundaries and blocks future production auth plugins).

## 5. Single Active Device Assignment per Sensor

- **Decision**: Enforce at most one `ACTIVE` `DeviceSensorAssignment` per `sensorId` using a PostgreSQL partial unique index (`CREATE UNIQUE INDEX uq_active_device_sensor_assignment ON device_sensor_assignments (organization_id, sensor_id) WHERE status = 'ACTIVE';`) in the Prisma SQL migration, paired with service-level validation.
- **Rationale**: Prisma schema `@@unique` alone cannot express conditional uniqueness on `status = 'ACTIVE'` while allowing historical `REVOKED` rows. A reviewed partial unique index enforces the invariant atomically at the database level.
- **Alternatives considered**: Application-only check without DB constraint (rejected: vulnerable to race conditions).

## 6. Freshness State Derivation

- **Decision**: Compute derived connectivity/freshness states (`ONLINE`, `STALE`, `OFFLINE`, `UNKNOWN`, `MAINTENANCE`) dynamically in a pure domain helper (`FreshnessEvaluator`) using `expectedReportingIntervalSeconds` (default fallback `60s` when unset), a configurable grace multiplier (default `2x` for `STALE`, `4x` for `OFFLINE`), `lastSeenAt` / `lastReadingAt`, and `lastDisconnectedAt`.
- **Rationale**: Avoids stale persisted enums and guarantees connectivity is never conflated with physical asset health (`Constitution Principle IV`).
- **Alternatives considered**: Persisting `ONLINE`/`OFFLINE` directly on `Device.status` (rejected: mixes administrative lifecycle with transient connectivity).
