# MQTT Topic and Message Contracts

**ID:** ARC-MQTT-001 · **Version:** 0.1 · **Status:** Proposed MVP contract

## 1. Purpose

MQTT transports telemetry and device status from the simulator in MVP and physical devices in a later release. MQTT is not the source of truth. Accepted normalized telemetry is stored in Neon PostgreSQL through the ingestion boundary. The simulator must use the same MQTT path rather than writing directly to the database.

## 2. Broker and protocol baseline

- Broker candidate: Mosquitto.
- MQTT 5.0 preferred if the selected client library and deployment prove compatibility; MQTT 3.1.1 fallback requires documented behavior.
- Telemetry QoS: 1 (at least once).
- Status QoS: 1; retained last-known status may be used with expiry semantics when supported.
- Telemetry/events retain: false.
- TLS required when broker traffic crosses a host/network trust boundary. Local isolated development may use non-TLS credentials that are never reused elsewhere.
- Broker persistence, session expiry, shared subscriptions, and subscriber restart behavior must be tested.

QoS 1 may redeliver. It does not guarantee exactly-once persistence in GridAware. Database idempotency is mandatory.

## 3. Canonical topic hierarchy

```text
gridaware/v1/orgs/{organizationId}/sites/{siteId}/devices/{deviceId}/telemetry
gridaware/v1/orgs/{organizationId}/sites/{siteId}/devices/{deviceId}/status
gridaware/v1/orgs/{organizationId}/sites/{siteId}/devices/{deviceId}/events
```

This versioned Device-scoped topic supersedes earlier shorthand topic samples that used Asset ID directly. Device is the authenticated producer; Asset/Sensor references are in message content and are verified from registry relationships. Device credentials must not publish with wildcard topics.

## 4. Device identity and topic authorization

Broker authentication maps the credential to one Device. Ingestion validates credential active state, topic Organization/Site/Device, payload Device ID, every Sensor ID, Sensor-to-Asset relationship, and tenant consistency. Payload must not override trusted source classification. For simulator-originated data, source is assigned from the provisioned simulator Device/SimulationRun record.

## 5. Telemetry envelope

```json
{
  "schemaVersion": "1.0",
  "eventId": "01936f10-9a7d-7e21-9e25-4a4cb9b90a01",
  "deviceId": "f5b3aa39-3403-40ad-9caf-852e1b719177",
  "observedAt": "2026-11-26T10:30:00.000Z",
  "simulationRunId": "bc681e35-7e8e-4861-9ef0-9f4eec4189e9",
  "metrics": [
    { "sensorId": "987b4268-eeb5-4421-a4bb-0beeb891b2a1", "metricCode": "temperature", "value": 86.5, "unit": "Cel", "observedAt": "2026-11-26T10:30:00.000Z", "sourceQuality": "GOOD" },
    { "sensorId": "4f36548e-8af1-46b7-b6e6-c1e2c94dbe95", "metricCode": "vibration_velocity", "value": 4.2, "unit": "mm/s", "sourceQuality": "GOOD" }
  ]
}
```

Field rules:
- `schemaVersion`: supported envelope schema.
- `eventId`: stable publisher event ID reused on retry.
- `deviceId`: must match authenticated credential and topic.
- `observedAt`: event default timestamp; each metric may override it.
- `simulationRunId`: required for simulator provenance; physical devices cannot claim a simulator run.
- `metrics`: non-empty, bounded array.
- `sensorId`: registered Sensor authorized to the Device.
- `metricCode`: must match the Sensor's configured MetricDefinition.
- `value`: finite number; NaN/Infinity rejected.
- `unit`: an accepted unit for the metric; server converts to canonical unit.
- `sourceQuality`: optional untrusted device hint; server computes final quality.

## 6. Idempotency and conflicts

Event identity: `(organizationId, authenticatedDeviceId, sourceEventId)`. On first acceptance, persist a content hash after canonical serialization. Same key and same hash is a duplicate no-op. Same key with a different hash is an integrity conflict/quarantine case; never overwrite silently. MVP permits at most one sample per Sensor per envelope; multiple same-Sensor samples require a new version/sample index.

## 7. Device status

```json
{
  "schemaVersion": "1.0",
  "deviceId": "f5b3aa39-3403-40ad-9caf-852e1b719177",
  "status": "ONLINE",
  "observedAt": "2026-11-26T10:30:00.000Z",
  "sequence": 1842
}
```

States: `ONLINE`, `DEGRADED`, `OFFLINE`, `MAINTENANCE`. MQTT Last Will may publish OFFLINE. Device status is not equivalent to every Sensor being healthy; freshness is also computed from telemetry receipt.

## 8. Diagnostic event

`/events` is for bounded device lifecycle/diagnostic messages, not a hidden second telemetry stream.

```json
{
  "schemaVersion": "1.0",
  "eventId": "01936f10-9a7d-7e21-9e25-4a4cb9b90a02",
  "deviceId": "f5b3aa39-3403-40ad-9caf-852e1b719177",
  "eventType": "DEVICE_DIAGNOSTIC",
  "observedAt": "2026-11-26T10:30:00.000Z",
  "details": { "code": "BUFFER_RECOVERED" }
}
```

Allowlist event types and detail fields. Never accept credentials, executable content, or unlimited text in `details`.

## 9. Acknowledgement and durability semantics

- Publisher PUBACK at QoS 1 means the broker accepted the publish, not that GridAware stored it.
- Subscriber delivery is at-least-once and may repeat.
- Ingestion writes TelemetryEvent, TelemetryReadings, and OutboxEvent atomically.
- Whether subscriber acknowledgement can be delayed until commit depends on the exact MQTT client/protocol implementation. Verify it; do not claim commit-before-ack unless supported and tested.
- If broker acknowledgement occurs before database persistence, configure durable broker sessions/persistence and replay/monitoring; explicitly test subscriber crash windows.
- Use `observedAt` for time series. Preserve late/out-of-order data.

## 10. Proposed limits for load-test validation

- Max payload: 64 KiB.
- Max metrics per envelope: 64.
- Simulator timestamp future skew: suggested 5 minutes; configurable.
- Per-Device publish rate: configured quota.
- Enforce payload/rate limits both broker-side where possible and ingestion-side.

These are starting limits, not measured capacity.

## 11. Unit and quality handling

MetricDefinition owns the canonical unit and allowed conversions. Ingestion validates compatibility and finite values. Final quality states: `VALID`, `SUSPECT`, `INVALID`. INVALID readings are excluded from trusted metrics and may be preserved only in restricted diagnostic/quarantine storage. Missing is not zero; stale is a separate state.

## 12. Evolution and safety

Keep schemaVersion. Add optional fields compatibly; reject unsupported major versions. Do not change the meaning/unit of an existing field without versioning. Maintain simulator fixtures. Do not create MQTT command topics for PLC, relay, motor, or other physical equipment control. Simulator control uses authenticated application commands and a controlled simulator worker.
