# REST API Contract: Sensors & Device Management

**Base Path**: `/api/v1` | **Auth**: Authenticated session + active Organization membership (tenant derived server-side)

## Minimal Assets Endpoints (FR-000)

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/assets` | `assets.read` | List organization assets (filters: `siteId`, `buildingId`, `status`, `search`, paginated) |
| `POST` | `/assets` | `assets.create` | Create tenant-scoped asset under a valid site (and optional building) |
| `GET` | `/assets/:assetId` | `assets.read` | Get asset details |

## Devices Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/devices` | `devices.read` | List devices (`status`, `deviceType`, `siteId`, `assetId`, `lastSeenFrom`, `lastSeenTo`, `search`, `page`, `pageSize` max 100, `sort`, `order`) |
| `POST` | `/devices` | `devices.create` | Register device in `PENDING` status |
| `GET` | `/devices/:deviceId` | `devices.read` | Get device details + derived freshness state + safe topic namespace |
| `PATCH` | `/devices/:deviceId` | `devices.update` | Update editable metadata (rejects direct `status` changes and post-activation `deviceKey` edits) |
| `POST` | `/devices/:deviceId/provision` | `device_credentials.provision` | Issue initial one-time credential + sync broker ACL; returns secret once |
| `POST` | `/devices/:deviceId/activate` | `devices.activate` | Transition `PENDING -> ACTIVE` (requires active provisioned credential) |
| `POST` | `/devices/:deviceId/suspend` | `devices.suspend` | Transition `ACTIVE -> SUSPENDED` + deny broker access |
| `POST` | `/devices/:deviceId/reactivate` | `devices.activate` | Transition `SUSPENDED -> ACTIVE` + restore broker access |
| `POST` | `/devices/:deviceId/rotate-credentials` | `devices.rotate_credentials` | Issue new credential version, immediately invalidate old version, sync broker; returns new secret once |
| `POST` | `/devices/:deviceId/revoke` | `devices.revoke` | Permanently transition to `REVOKED` + revoke all credentials & broker access |
| `POST` | `/devices/:deviceId/retire` | `devices.update` | Transition to `RETIRED` + revoke broker access |
| `GET` | `/devices/:deviceId/credentials` | `devices.read` | List credential metadata only (never returns `secretHash` or plaintext) |
| `GET` | `/devices/:deviceId/sensors` | `devices.read` | List sensors actively assigned to this device |
| `POST` | `/devices/:deviceId/sensors/:sensorId` | `sensors.update` | Assign sensor to device (same org, no other active device assignment) |
| `DELETE` | `/devices/:deviceId/sensors/:sensorId` | `sensors.update` | Unassign sensor from device (`status = REVOKED`, sets `unassignedAt`) |
| `GET` | `/devices/:deviceId/audit-logs` | `audit.read` | List redacted audit history for this device |

## Sensors & Metric Catalog Endpoints

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/metric-definitions` | `sensors.read` | List active canonical metric definitions |
| `GET` | `/sensors` | `sensors.read` | List sensors (`assetId`, `deviceId`, `status`, `search`, `page`, `pageSize` max 100, `sort`, `order`) |
| `POST` | `/sensors` | `sensors.create` | Register sensor in `PLANNED` status under an organization asset |
| `GET` | `/sensors/:sensorId` | `sensors.read` | Get sensor details + active device assignment + metrics + derived freshness state |
| `PATCH` | `/sensors/:sensorId` | `sensors.update` | Update editable metadata (rejects direct `status` changes and post-activation `sensorKey` edits) |
| `POST` | `/sensors/:sensorId/activate` | `sensors.update` | Transition `PLANNED -> ACTIVE` |
| `POST` | `/sensors/:sensorId/maintenance` | `sensors.maintenance` | Transition `ACTIVE -> MAINTENANCE` (or `MAINTENANCE -> ACTIVE` via `/enable` or `/complete-maintenance`) |
| `POST` | `/sensors/:sensorId/disable` | `sensors.disable` | Transition `ACTIVE -> DISABLED` |
| `POST` | `/sensors/:sensorId/enable` | `sensors.update` | Transition `DISABLED` or `MAINTENANCE -> ACTIVE` |
| `POST` | `/sensors/:sensorId/retire` | `sensors.update` | Permanently transition to `RETIRED` |
| `GET` | `/sensors/:sensorId/metrics` | `sensors.read` | List configured `SensorMetric` rows |
| `PUT` | `/sensors/:sensorId/metrics` | `sensors.update` | Replace sensor metric configuration (validated against `MetricDefinition`) |
| `GET` | `/sensors/:sensorId/audit-logs` | `audit.read` | List redacted audit history for this sensor |

## RBAC Role Matrix

- `OWNER`, `FACILITY_MANAGER`: Full device, credential (`provision`, `rotate_credentials`, `suspend`, `revoke`), sensor, and asset management.
- `ENGINEER`: `assets.read/create`, `devices.read/create/update/activate`, `sensors.read/create/update/disable/maintenance`. **Denied**: `device_credentials.provision`, `devices.rotate_credentials`, `devices.suspend`, `devices.revoke`.
- `TECHNICIAN`: `devices.read`, `sensors.read`, `sensors.maintenance` (within assigned scope).
- `VIEWER`: `assets.read`, `devices.read`, `sensors.read` only.
