# REST API Endpoint Catalog

**ID:** ARC-API-CAT-001 · **Version:** 0.1 · **Status:** Proposed MVP contract  
All paths are relative to `/api/v1`. This is the broad planned endpoint catalog; exact DTO schemas and automated tests must be created from it before routes are considered implemented.

## 1. Common rules

- HTTPS outside local development; authenticated routes require a valid human access credential.
- Tenant access is resolved through active Membership and verified resource ownership.
- UUID IDs are strings; timestamps are UTC ISO 8601.
- List queries are bounded; event/time-series collections use cursor pagination.
- Supported writes use `Idempotency-Key` where retrying could create duplicate business effects.
- Tenant IDs supplied in body content are never accepted as proof of access.

## 2. Health and identity

| Method | Path | Auth/permission | Purpose | Success |
|---|---|---|---|---|
| GET | `/health/live` | Public/platform restricted | Process liveness | 200 |
| GET | `/health/ready` | Platform restricted | Dependency readiness | 200/503 |
| GET | `/me` | Authenticated | User profile and memberships | 200 |
| PATCH | `/me` | Authenticated | Update safe self-profile fields | 200 |
| POST | `/auth/login` | Public, rate-limited | Authenticate | 200 |
| POST | `/auth/refresh` | Refresh/session credential | Rotate/refresh session | 200 |
| POST | `/auth/logout` | Authenticated | Revoke current session | 204 |
| POST | `/auth/forgot-password` | Public, rate-limited | Request reset | 202 |
| POST | `/auth/reset-password` | Reset token | Change password | 204 |

Health responses must never disclose connection strings, credentials, or raw infrastructure errors.

`GET /me` response example:

```json
{
  "data": {
    "id": "2cba9fe5-720a-4f59-a191-5390af7eb4c1",
    "email": "engineer@example.com",
    "displayName": "Alex Engineer",
    "memberships": [{
      "organizationId": "87e2caa3-b85e-4f8b-a21c-4984d43d4f95",
      "organizationName": "North Plant Group",
      "role": "ENGINEER",
      "status": "ACTIVE"
    }]
  },
  "meta": { "requestId": "req_01J..." }
}
```

## 3. Organizations and membership

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/organizations` | Authenticated | List organizations with active membership |
| POST | `/organizations` | Authenticated | Create organization plus initial OWNER membership |
| GET | `/organizations/{organizationId}` | `organization.read` | Get tenant profile |
| PATCH | `/organizations/{organizationId}` | `organization.update` | Update profile/settings |
| GET | `/organizations/{organizationId}/members` | `membership.read` | List members |
| POST | `/organizations/{organizationId}/invitations` | `membership.invite` | Create invitation |
| POST | `/organizations/{organizationId}/invitations/{invitationId}/resend` | `membership.invite` | Resend eligible invitation |
| POST | `/invitations/accept` | Valid invitation token | Accept invitation |
| PATCH | `/organizations/{organizationId}/members/{membershipId}` | `membership.manage` | Change allowed role/status fields |
| DELETE | `/organizations/{organizationId}/members/{membershipId}` | `membership.manage` | Revoke membership, never delete global User |

Rules:
- A User may join multiple Organizations with different roles.
- Organization creation and initial OWNER membership must be atomic.
- The last active OWNER cannot be demoted/revoked without ownership transfer.
- Invitation acceptance validates expiry, one-time use, email binding, Organization state, and allowed role.
- Custom role builder is outside MVP.

## 4. Sites and buildings

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/organizations/{organizationId}/sites` | `site.read` | List tenant sites |
| POST | `/organizations/{organizationId}/sites` | `site.create` | Create site |
| GET | `/sites/{siteId}` | `site.read` | Site details |
| PATCH | `/sites/{siteId}` | `site.update` | Update site metadata |
| POST | `/sites/{siteId}/archive` | `site.archive` | Archive after lifecycle checks |
| GET | `/sites/{siteId}/buildings` | `building.read` | List buildings |
| POST | `/sites/{siteId}/buildings` | `building.create` | Create building under site |
| GET | `/buildings/{buildingId}` | `building.read` | Building details |
| PATCH | `/buildings/{buildingId}` | `building.update` | Update building |
| POST | `/buildings/{buildingId}/archive` | `building.archive` | Archive after asset checks |

A Building must belong to the same Organization as its Site. A Site uses an IANA timezone such as `Africa/Cairo`. Geolocation is optional for MVP.

## 5. Assets

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/sites/{siteId}/assets` | `asset.read` | List site assets |
| POST | `/sites/{siteId}/assets` | `asset.create` | Register asset |
| GET | `/assets/{assetId}` | `asset.read` | Asset details |
| PATCH | `/assets/{assetId}` | `asset.update` | Update editable fields |
| POST | `/assets/{assetId}/archive` | `asset.archive` | Archive, retain history |
| GET | `/assets/{assetId}/sensors` | `sensor.read` | List associated Sensors |
| GET | `/assets/{assetId}/health` | `asset.read` | Derived health summary with freshness/data quality |
| GET | `/assets/{assetId}/timeline` | `asset.read` | Cursor-paginated operational timeline |

Create example:

```json
{
  "code": "GEN-001",
  "name": "Backup Generator 01",
  "assetTypeCode": "GENERATOR",
  "buildingId": "56ce327d-9c09-44c4-a250-1e2eae6717af",
  "criticality": "HIGH",
  "manufacturer": "Example Manufacturer",
  "model": "DG-500"
}
```

The route's Site determines tenant scope. If `buildingId` is supplied, the service must verify that it belongs to that Site and Organization. Site-level assets may omit `buildingId`.

## 6. Devices, sensors, and thresholds

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/sites/{siteId}/devices` | `device.read` | List devices |
| POST | `/sites/{siteId}/devices` | `device.provision` | Provision logical simulator/device identity |
| GET | `/devices/{deviceId}` | `device.read` | Device detail/status |
| POST | `/devices/{deviceId}/revoke-credentials` | `device.manage` | Revoke credentials |
| POST | `/assets/{assetId}/sensors` | `sensor.create` | Register sensor |
| GET | `/sensors/{sensorId}` | `sensor.read` | Sensor details |
| PATCH | `/sensors/{sensorId}` | `sensor.update` | Update metadata/configuration |
| POST | `/sensors/{sensorId}/retire` | `sensor.retire` | Retire while preserving history |
| GET | `/sensors/{sensorId}/thresholds` | `threshold.read` | Current/history thresholds |
| POST | `/sensors/{sensorId}/thresholds` | `threshold.manage` | Create a new effective threshold version |
| POST | `/thresholds/{thresholdId}/deactivate` | `threshold.manage` | End threshold validity |

Provisioning may return a one-time credential. It must not appear in later GET responses or logs. Store a verifier/hash or secure credential reference, not reusable plaintext.

## 7. Simulator control

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/sites/{siteId}/simulations` | `simulation.read` | List runs |
| POST | `/assets/{assetId}/simulations` | `simulation.manage` | Start a configured scenario |
| GET | `/simulations/{simulationRunId}` | `simulation.read` | Run detail/status |
| POST | `/simulations/{simulationRunId}/pause` | `simulation.manage` | Pause run |
| POST | `/simulations/{simulationRunId}/resume` | `simulation.manage` | Resume run |
| POST | `/simulations/{simulationRunId}/stop` | `simulation.manage` | Stop run |
| GET | `/simulation-scenarios` | Authenticated | List supported scenarios and safe parameter bounds |

A SimulationRun records scenario code, simulator version, config version, start/end, speed, and deterministic seed if supported. Commands are idempotent. Do not expose arbitrary Python execution or unrestricted runtime parameters through the API. All generated data is visibly marked `SIMULATOR`.

## 8. Telemetry query endpoints

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/assets/{assetId}/telemetry` | `telemetry.read` | Asset readings |
| GET | `/sensors/{sensorId}/telemetry` | `telemetry.read` | Sensor readings |
| GET | `/sites/{siteId}/telemetry/latest` | `telemetry.read` | Latest values plus freshness |
| GET | `/sites/{siteId}/telemetry/summary` | `telemetry.read` | Bounded aggregates |

Query options:
- `from`, `to`: UTC timestamps; validate `from < to` and maximum window.
- `metric`: allowlisted metric code.
- `quality`: `VALID`, `SUSPECT`, `INVALID`; UI defaults to exclude INVALID from trusted charts.
- `interval`: allowlisted `raw`, `1m`, `5m`, `15m`, `1h`.
- `limit`, `cursor`: bounded results.

Long time windows must return downsampled data, not unlimited raw points. Responses identify aggregation interval and source coverage so UI does not misrepresent data.

## 9. Intelligence

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/organizations/{organizationId}/anomalies` | `anomaly.read` | Filter anomaly list |
| GET | `/anomalies/{anomalyId}` | `anomaly.read` | Evidence and event detail |
| POST | `/anomalies/{anomalyId}/acknowledge` | `anomaly.acknowledge` | Acknowledge |
| POST | `/anomalies/{anomalyId}/dismiss` | `anomaly.dismiss` | Dismiss with reason |
| GET | `/assets/{assetId}/predictions` | `prediction.read` | Prediction history |
| GET | `/assets/{assetId}/risk-assessments` | `risk.read` | Risk history |
| GET | `/models` | `model.read` | Safe model metadata only |

A score is not automatically a calibrated failure probability. Responses must include model/version, input window, quality, score meaning, calibration state where applicable, and time horizon. Do not show a probability the model did not return.

## 10. Incidents

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/organizations/{organizationId}/incidents` | `incident.read` | Filtered list |
| POST | `/organizations/{organizationId}/incidents` | `incident.create` | Manual incident |
| GET | `/incidents/{incidentId}` | `incident.read` | Detail and timeline |
| POST | `/incidents/{incidentId}/triage` | `incident.triage` | Triage decision |
| POST | `/incidents/{incidentId}/assign` | `incident.assign` | Assign/reassign |
| POST | `/incidents/{incidentId}/start-investigation` | `incident.investigate` | Start investigation |
| POST | `/incidents/{incidentId}/notes` | `incident.investigate` | Append note |
| POST | `/incidents/{incidentId}/resolve` | `incident.resolve` | Resolve with summary/code |
| POST | `/incidents/{incidentId}/close` | `incident.close` | Close resolved incident |
| POST | `/incidents/{incidentId}/reopen` | `incident.reopen` | Explicit reopen under policy; closed incidents should not silently reopen |

Do not expose generic status PATCH. Every transition creates an IncidentEvent in the same transaction. One anomaly does not necessarily equal one incident; deduplication/correlation policy controls grouping.

## 11. Work orders and maintenance

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/organizations/{organizationId}/work-orders` | `work-order.read` | Filtered list |
| POST | `/organizations/{organizationId}/work-orders` | `work-order.create` | Create task |
| GET | `/work-orders/{workOrderId}` | `work-order.read` | Detail/timeline |
| POST | `/work-orders/{workOrderId}/assign` | `work-order.assign` | Assign member |
| POST | `/work-orders/{workOrderId}/start` | `work-order.start` | Begin task |
| POST | `/work-orders/{workOrderId}/block` | `work-order.update` | Block with reason |
| POST | `/work-orders/{workOrderId}/complete` | `work-order.complete` | Complete with findings/summary |
| POST | `/work-orders/{workOrderId}/cancel` | `work-order.cancel` | Cancel with reason |
| GET | `/assets/{assetId}/maintenance-records` | `maintenance.read` | History |
| POST | `/assets/{assetId}/maintenance-records` | `maintenance.record` | Record completed maintenance |
| GET | `/organizations/{organizationId}/maintenance-schedules` | `maintenance.read` | List schedules |
| POST | `/organizations/{organizationId}/maintenance-schedules` | `maintenance.manage` | Create schedule |

WorkOrder completion does not automatically close an Incident. These are separate business decisions.

## 12. Notifications, analytics, and audit

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/me/notifications` | Authenticated | Current user's notifications |
| POST | `/me/notifications/{notificationId}/read` | Notification owner | Mark read |
| POST | `/me/notifications/read-all` | Authenticated | Mark allowed notifications read |
| GET | `/organizations/{organizationId}/analytics/overview` | `analytics.read` | Tenant KPIs |
| GET | `/sites/{siteId}/analytics/health` | `analytics.read` | Health distribution |
| GET | `/sites/{siteId}/analytics/incidents` | `analytics.read` | Trends and resolution aggregates |
| GET | `/sites/{siteId}/analytics/availability` | `analytics.read` | Availability if evidence supports calculation |
| GET | `/organizations/{organizationId}/audit-logs` | `audit.read` | Restricted audit search |

Analytics responses document time range, timezone, aggregation method, freshness, and data coverage. Missing telemetry must not be counted as healthy operation.

## 13. Standard status codes

| HTTP | Meaning |
|---:|---|
| 200 | Successful read or command with representation |
| 201 | Created |
| 202 | Accepted asynchronous command, not yet complete |
| 204 | Success with no body |
| 400 | Malformed request/query |
| 401 | Unauthenticated |
| 403 | Authenticated but forbidden |
| 404 | Missing or intentionally concealed resource |
| 409 | State/idempotency/business conflict |
| 412 | Optimistic version/precondition failure |
| 422 | Semantically invalid request if distinguished from 400 |
| 429 | Rate limited |
| 500 | Unexpected server failure |
| 502/503/504 | Safe upstream/dependency failure |

## 14. Endpoint review questions

For every route ask: Is it tenant-scoped? Is the actor permitted? Are parent/child owners consistent? Is the transition legal? Is it idempotent? Does it need audit/history? Does it emit outbox work? Is the response bounded and free of secrets? Is the route tested for cross-tenant ID substitution?
