# MQTT Topic & Envelope Contract: Sensors & Device Management

**Feature**: `005-sensors-device-management` | **Protocol**: MQTT 5.0 (Mosquitto 2.x local)

## Topic Namespace

```text
gridaware/v1/orgs/{organizationId}/devices/{deviceKey}/telemetry
gridaware/v1/orgs/{organizationId}/devices/{deviceKey}/status
gridaware/v1/orgs/{organizationId}/devices/{deviceKey}/availability
```

### Broker Authorization Rules
- Each `ACTIVE` device authenticates with its unique per-device credential (`username = {organizationId}:{deviceKey}` or mapped unique identity).
- Publish-only ACLs restricted strictly to the device's own `telemetry`, `status`, and `availability` topics.
- No subscribe permission to other devices' topics; no wildcard publish/subscribe for device credentials.
- Anonymous access disabled. `PENDING`, `SUSPENDED`, `REVOKED`, `RETIRED`, and unknown devices rejected.
- QoS `1` for telemetry (`retain: false`), status (`retain: false` or bounded), and availability/LWT (`retain: true`).

## Telemetry Envelope Validation (`schemaVersion: "1.0"`)

Required fields: `schemaVersion` (`"1.0"`), `eventId` (16–128 chars, `^[A-Za-z0-9_-]+$`), `deviceKey` (must match broker-authenticated device), `sentAt` (ISO 8601 UTC, within configurable skew window ±5m), `readings` (1–100 items).
Each reading requires:
- `sensorKey`: must be actively assigned to the authenticated device in the same organization, and sensor status must be `ACTIVE`.
- `metricKey` & `unit`: must match the sensor's configured `SensorMetric` and `MetricDefinition.supportedUnits`.
- `value`: finite number (`Number.isFinite(value)` — reject `NaN`, `Infinity`, strings).
- `quality`: `"GOOD" | "UNCERTAIN" | "BAD"`.
- Max payload size: `64 KiB`.

## Device Status Envelope Validation (`schemaVersion: "1.0"`)

Required fields: `schemaVersion` (`"1.0"`), `eventId`, `deviceKey` (matches authenticated identity), `sentAt` (ISO 8601 UTC), `status` (`"ONLINE" | "OFFLINE" | "DEGRADED"`).
Optional fields: `firmwareVersion` (max 80 chars), `reportedUptimeSeconds` (int >= 0), `details` (max 20 primitive key-value pairs; no secret keys).
Accepted status/telemetry messages update `Device.lastSeenAt` (and `lastConnectedAt`/`lastDisconnectedAt` for availability/LWT).
