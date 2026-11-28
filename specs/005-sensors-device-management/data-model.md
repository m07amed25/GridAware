# Data Model: Sensors & Device Management

**Feature**: `005-sensors-device-management` | **Date**: 2026-11-27

All new models integrate into `server/prisma/schema.prisma` using UUID primary keys (`@db.Uuid`), `Timestamptz(6)` timestamps, and tenant-safe composite unique constraints (`@@unique([id, organizationId])`) matching existing `Organization`, `Site`, `Building`, `User`, and `Membership` models.

## Enums

- `AssetStatus`: `ACTIVE`, `INACTIVE`, `UNDER_MAINTENANCE`, `DECOMMISSIONED`
- `DeviceType`: `GATEWAY`, `SIMULATOR`, `EDGE_CONTROLLER`, `OTHER`
- `DeviceStatus`: `PENDING`, `ACTIVE`, `SUSPENDED`, `REVOKED`, `RETIRED`
- `CredentialType`: `PASSWORD`, `CERTIFICATE`
- `CredentialStatus`: `ACTIVE`, `ROTATED`, `REVOKED`, `EXPIRED`
- `SensorStatus`: `PLANNED`, `ACTIVE`, `MAINTENANCE`, `DISABLED`, `RETIRED`
- `AssignmentStatus`: `ACTIVE`, `REVOKED`
- `MetricValueType`: `NUMERIC`

## Entities

### 1. Asset (Minimal Foundation)
Table: `assets`
- `id`: UUID PK
- `organizationId`: UUID FK -> `Organization.id` (required)
- `siteId`: UUID FK -> `Site` (composite `[siteId, organizationId]`, required)
- `buildingId`: UUID? FK -> `Building` (composite `[buildingId, organizationId]`, optional; if set, must belong to `siteId`)
- `assetCode`: `VarChar(80)` (required, unique per org `@@unique([organizationId, assetCode])`)
- `name`: `VarChar(120)` (required, trimmed non-empty)
- `assetType`: `VarChar(60)` (required, e.g., `GENERATOR`, `HVAC`, `TRANSFORMER`, `PUMP`)
- `status`: `AssetStatus` (default `ACTIVE`)
- `createdAt`, `updatedAt`: `Timestamptz(6)`
- Constraints: `@@unique([id, organizationId])`, `@@index([organizationId, siteId])`

### 2. Device
Table: `devices`
- `id`: UUID PK
- `organizationId`: UUID FK -> `Organization.id` (required)
- `siteId`: UUID? FK -> `Site` (composite `[siteId, organizationId]`, optional)
- `assetId`: UUID? FK -> `Asset` (composite `[assetId, organizationId]`, optional; if both `siteId` and `assetId` are set, `asset.siteId` must equal `siteId`)
- `deviceKey`: `VarChar(100)` (required, lowercase slug `^[a-z0-9][a-z0-9._-]{2,99}$`, immutable after activation, `@@unique([organizationId, deviceKey])`)
- `name`: `VarChar(120)` (required, trimmed non-empty)
- `description`: `VarChar(500)`? (optional)
- `deviceType`: `DeviceType` (default `SIMULATOR`)
- `status`: `DeviceStatus` (default `PENDING`)
- `serialNumber`: `VarChar(120)`? (optional, normalized trimmed)
- `manufacturer`: `VarChar(120)`? (optional)
- `model`: `VarChar(120)`? (optional)
- `firmwareVersion`: `VarChar(80)`? (optional)
- `metadata`: `Json?` (optional, bounded allowlisted key-value object; must not contain secret keys)
- `lastSeenAt`: `Timestamptz(6)?` (updated only on accepted authenticated message)
- `lastConnectedAt`: `Timestamptz(6)?`
- `lastDisconnectedAt`: `Timestamptz(6)?`
- `revokedAt`: `Timestamptz(6)?`
- `createdById`: UUID FK -> `User.id`
- `createdAt`, `updatedAt`: `Timestamptz(6)`
- Constraints: `@@unique([organizationId, deviceKey])`, `@@unique([id, organizationId])`, `@@index([organizationId, status])`, `@@index([organizationId, lastSeenAt])`

### 3. DeviceCredential
Table: `device_credentials`
- `id`: UUID PK
- `organizationId`: UUID (required)
- `deviceId`: UUID FK -> `Device` (composite `[deviceId, organizationId]`)
- `credentialVersion`: `Int` (monotonic >= 1 per device, `@@unique([deviceId, credentialVersion])`)
- `credentialType`: `CredentialType` (default `PASSWORD`)
- `secretHash`: `Text` (required; non-plaintext hash/verifier; never returned by read endpoints)
- `status`: `CredentialStatus` (default `ACTIVE`)
- `issuedAt`: `Timestamptz(6)` (default `now()`)
- `expiresAt`: `Timestamptz(6)?` (optional)
- `lastUsedAt`: `Timestamptz(6)?`
- `revokedAt`: `Timestamptz(6)?`
- `createdById`: UUID FK -> `User.id`
- `createdAt`: `Timestamptz(6)`
- Constraints: `@@unique([deviceId, credentialVersion])`, `@@index([organizationId, deviceId, status])`, partial unique index on `(device_id) WHERE status = 'ACTIVE'`

### 4. Sensor
Table: `sensors`
- `id`: UUID PK
- `organizationId`: UUID FK -> `Organization.id` (required)
- `assetId`: UUID FK -> `Asset` (composite `[assetId, organizationId]`, required)
- `sensorKey`: `VarChar(120)` (required, lowercase slug `^[a-z0-9][a-z0-9._-]{2,119}$`, immutable after activation, `@@unique([organizationId, sensorKey])`)
- `name`: `VarChar(120)` (required, trimmed non-empty)
- `description`: `VarChar(500)`? (optional)
- `sensorType`: `VarChar(80)` (required)
- `status`: `SensorStatus` (default `PLANNED`)
- `installationLocation`: `VarChar(160)`? (optional)
- `manufacturer`: `VarChar(120)`? (optional)
- `model`: `VarChar(120)`? (optional)
- `serialNumber`: `VarChar(120)`? (optional)
- `samplingIntervalSeconds`: `Int?` (optional, positive integer `1..86400`)
- `expectedReportingIntervalSeconds`: `Int?` (optional, positive integer `1..86400`)
- `lastReadingAt`: `Timestamptz(6)?`
- `createdById`: UUID FK -> `User.id`
- `createdAt`, `updatedAt`: `Timestamptz(6)`
- Constraints: `@@unique([organizationId, sensorKey])`, `@@unique([id, organizationId])`, `@@index([organizationId, assetId])`, `@@index([organizationId, status])`

### 5. MetricDefinition
Table: `metric_definitions` (global platform catalog)
- `key`: `VarChar(80)` PK (lowercase snake_case `^[a-z][a-z0-9_]{1,79}$`)
- `displayName`: `VarChar(120)` (required)
- `description`: `VarChar(500)` (required)
- `dimension`: `VarChar(60)` (required, e.g., `TEMPERATURE`, `VIBRATION`, `ELECTRICAL`)
- `canonicalUnit`: `VarChar(20)` (required, e.g., `°C`, `mm/s`, `V`, `A`, `Hz`, `kPa`, `m3/h`, `kW`, `kWh`)
- `supportedUnits`: `String[]` (required, non-empty list including canonicalUnit and UCUM aliases e.g. `Cel`, `°F`)
- `valueType`: `MetricValueType` (default `NUMERIC`)
- `isActive`: `Boolean` (default `true`)

### 6. SensorMetric
Table: `sensor_metrics`
- `id`: UUID PK
- `organizationId`: UUID (required)
- `sensorId`: UUID FK -> `Sensor` (composite `[sensorId, organizationId]`)
- `metricKey`: `VarChar(80)` FK -> `MetricDefinition.key`
- `unit`: `VarChar(20)` (required; must be in `MetricDefinition.supportedUnits`)
- `precision`: `Int?` (optional, `0..6`)
- `minPlausibleValue`: `Float?` (optional, finite number)
- `maxPlausibleValue`: `Float?` (optional, finite number; if both min & max set, `minPlausibleValue < maxPlausibleValue`)
- `isPrimary`: `Boolean` (default `true`)
- `configuration`: `Json?` (optional, validated object)
- `createdAt`, `updatedAt`: `Timestamptz(6)`
- Constraints: `@@unique([sensorId, metricKey])`, `@@index([organizationId, sensorId])`

### 7. DeviceSensorAssignment
Table: `device_sensor_assignments`
- `id`: UUID PK
- `organizationId`: UUID (required)
- `deviceId`: UUID FK -> `Device` (composite `[deviceId, organizationId]`)
- `sensorId`: UUID FK -> `Sensor` (composite `[sensorId, organizationId]`)
- `status`: `AssignmentStatus` (default `ACTIVE`)
- `assignedAt`: `Timestamptz(6)` (default `now()`)
- `unassignedAt`: `Timestamptz(6)?`
- `assignedById`: UUID FK -> `User.id`
- Constraints: `@@index([organizationId, sensorId, status])`, `@@index([organizationId, deviceId, status])`, partial unique index on `(organization_id, sensor_id) WHERE status = 'ACTIVE'`

## State Machines

### Device Lifecycle
- `PENDING` -> `ACTIVE` (requires active `DeviceCredential` + explicit `devices.activate`)
- `ACTIVE` -> `SUSPENDED` | `REVOKED` | `RETIRED`
- `SUSPENDED` -> `ACTIVE` | `REVOKED` | `RETIRED`
- `REVOKED`, `RETIRED` -> Terminal (no transitions allowed)

### Sensor Lifecycle
- `PLANNED` -> `ACTIVE` | `RETIRED`
- `ACTIVE` -> `MAINTENANCE` | `DISABLED` | `RETIRED`
- `MAINTENANCE` -> `ACTIVE` | `RETIRED`
- `DISABLED` -> `ACTIVE` | `RETIRED`
- `RETIRED` -> Terminal (no transitions allowed)
