# WebSocket Event Contracts

**ID:** ARC-WS-001 · **Version:** 0.1 · **Status:** Proposed

## 1. Purpose

WebSockets push near-real-time updates to Next.js dashboards and detail pages. They are a best-effort low-latency delivery channel, not the system of record and not a durable event log. REST remains authoritative. After reconnect, the client fetches the current resource/timeline state.

## 2. Connection and transport

Proposed endpoint: `/ws/v1`, preferably same trusted application origin as REST. WSS is mandatory outside local development. NestJS owns the gateway. Socket.IO versus native WebSocket is an open decision; event schema below is transport-neutral.

Authenticate the connection with the same human identity/session strategy as REST. Authenticate and authorize each subscription independently.

## 3. Logical subscription topics

| Topic | Scope | Permission |
|---|---|---|
| `site.telemetry` | One Site | `telemetry.read` |
| `site.sensor-status` | One Site | `sensor.read` |
| `site.anomalies` | One Site | `anomaly.read` |
| `site.incidents` | One Site | `incident.read` |
| `site.work-orders` | One Site | `work-order.read` |
| `user.notifications` | Authenticated User | Own notifications only |
| `simulation.status` | One authorized Site/Run | `simulation.read` |

Client may request subscription by resource ID; server resolves ownership, verifies Membership/permission, and joins a server-generated room. Never accept arbitrary client room names or tenant-wide wildcard subscriptions.

## 4. Event envelope

```json
{
  "eventId": "01936f11-1df9-7d7b-a4e4-33f9ec31c951",
  "eventType": "telemetry.reading.created",
  "eventVersion": "1.0",
  "occurredAt": "2026-11-26T10:30:01.000Z",
  "organizationId": "87e2caa3-b85e-4f8b-a21c-4984d43d4f95",
  "siteId": "7ad0be98-c8f7-4c54-a6a5-13dc59b6ae0f",
  "correlationId": "corr_01JCV...",
  "data": {
    "assetId": "d105eebb-e403-4d1b-b4ae-cb6a58ca5b70",
    "sensorId": "987b4268-eeb5-4421-a4bb-0beeb891b2a1",
    "metricCode": "temperature",
    "value": 86.5,
    "unit": "Cel",
    "observedAt": "2026-11-26T10:30:00.000Z",
    "quality": "VALID",
    "source": "SIMULATOR"
  }
}
```

Organization/Site IDs are informational scope fields, not client authorization credentials. Server only emits events after authorization and ownership checks.

## 5. Event catalog

| Event | Scope | Payload | Trigger |
|---|---|---|---|
| `telemetry.reading.created` | Site | Sensor/Asset, metric, value, unit, quality, observedAt, source | Accepted reading; may be batched |
| `sensor.freshness.changed` | Site | Sensor, freshness state, lastSeenAt | Freshness state transition |
| `device.status.changed` | Site | Device, status, lastSeenAt | Device state transition |
| `anomaly.detected` | Site | Anomaly, Asset, severity, source, detectedAt | New deduplicated anomaly |
| `anomaly.updated` | Site | Anomaly state/acknowledgement | Allowed state change |
| `incident.created` | Site | Incident, Asset, severity, status, title | Incident transaction committed |
| `incident.updated` | Site | Incident ID, state, assignee summary, version | Domain transition committed |
| `work-order.created` | Site | WorkOrder, Asset, priority, status | WorkOrder transaction committed |
| `work-order.updated` | Site | WorkOrder state, assignee, version | State/assignment changed |
| `notification.created` | User | Notification ID, category, safe summary | Notification persisted |
| `simulation.status.changed` | Site/Run | Run ID, scenario, status, speed, timestamps | Simulation transition |

Do not emit every raw reading as an unbounded individual WebSocket event. Use controlled rate, batching, sampled latest-value messages, or aggregate updates. The simulator MVP rate must be configured and load-tested.

## 6. Delivery, ordering, and deduplication

- Events may be duplicated or missed across disconnects.
- `eventId` supports client-side duplicate suppression.
- `occurredAt` is not a global ordering guarantee.
- Include resource version or `updatedAt` for mutable workflow entities.
- Telemetry history is ordered by `observedAt`, not WebSocket arrival time.
- Client must not use WebSocket payload as final authority for an Incident or WorkOrder state transition.

## 7. Reconnect and recovery

After reconnect: re-authenticate, reauthorize desired subscriptions, refetch open screen state, then refresh timelines through REST cursor APIs. Never assume no events were missed. Important Incident/WorkOrder history must come from REST.

## 8. Client behavior

Show `LIVE`, `RECONNECTING`, and `DISCONNECTED` state plus last update time. Use exponential backoff with jitter. Stop subscriptions when user logs out or changes tenant/site. Distinguish stale telemetry from healthy measurements. Do not show success for a command until REST confirms it; a WebSocket event may subsequently refresh the UI.

## 9. Security

- Enforce WSS and validate Origin.
- Authenticate connection and every subscription.
- Rate-limit connections and subscription counts.
- Never send user notifications to a Site room.
- Redact secrets and sensitive details.
- Revoke active access on logout, session revocation, Membership suspension, or Organization suspension.

## 10. Performance

Proposed MVP target: UI updates normally within three seconds under the defined test workload. This is a target, not a measured result. Monitor active connections, outbound events/sec, queue lag, payload size, batching, drops, reconnects, and per-tenant fan-out.
