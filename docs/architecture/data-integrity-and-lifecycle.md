# GridAware — Data Integrity, State, and Lifecycle Rules

**Document ID:** ARC-DB-LIFE-001  
**Version:** 0.1  
**Status:** Proposed for review

---

## 1. Purpose

This document defines integrity rules that span tables and domains. Database constraints protect structural correctness; domain services enforce business transitions; audit/history tables explain important changes.

## 2. Primary Data Integrity Layers

### Layer 1 — Schema constraints

Use:
- Primary keys.
- Foreign keys.
- Unique constraints.
- Not-null constraints.
- Check constraints where feasible.
- Composite constraints for tenant/site ownership.

### Layer 2 — Domain validation

NestJS services validate rules that require multiple records or business context, such as:
- User membership and permission.
- Site/building/asset consistency.
- Device-to-Sensor authorization.
- Threshold band consistency.
- Incident transitions.
- Work Order assignment.
- Simulation limits and ownership.

### Layer 3 — Transactional boundaries

Changes that must succeed or fail together must share a database transaction. Do not include external network calls or long-running AI inference inside the transaction.

### Layer 4 — Asynchronous delivery

Use a durable outbox record in the same database transaction as the business state change, then publish asynchronously. Consumers must be idempotent.

## 3. Idempotency Rules

| Operation | Idempotency identity |
|---|---|
| Telemetry event ingestion | organizationId + deviceId + sourceEventId |
| Reading within event | telemetryEventId + sensorId (initial contract) |
| Simulation start command | client request id / operation key per run request |
| Incident creation from anomaly | policy-defined tenant + anomaly/deduplication key |
| Outbox consumption | outboxEventId + consumer processing record or domain uniqueness |
| Work Order creation from incident | explicit business rule and unique source linkage where only one is allowed |
| Notification delivery | notification ID + channel/provider idempotency key |

Idempotency does not mean silently accepting a conflicting payload. If the same event identity arrives with a different content hash, record a conflict signal and follow a defined quarantine/rejection path.

## 4. Transaction Boundaries

### Telemetry acceptance

One transaction should persist:
- TelemetryEvent.
- Normalized TelemetryReadings.
- OutboxEvent(s) required for downstream processing.

If any required row fails, the transaction rolls back. A duplicate event should not create another reading or another processing event.

### Incident creation

If the incident policy creates an Incident from an Anomaly Event, create the Incident and its first IncidentEvent in one transaction. If outbox notification is required, write its OutboxEvent in the same transaction.

### Work Order creation

Create WorkOrder and its initial status/history record atomically if a separate WorkOrderEvent history table is selected. At minimum, preserve who created it and its first status.

### State transition

Use a conditional update or transaction to ensure the state has not changed unexpectedly between read and write. Consider optimistic concurrency/version fields for high-contention workflows.

## 5. Incident Lifecycle

Proposed states:

`DETECTED → TRIAGED → ASSIGNED → INVESTIGATING → RESOLVED → CLOSED`

Allowed rework path: `INVESTIGATING → ASSIGNED` when reassignment is required; `RESOLVED → INVESTIGATING` only under an explicit reopen policy and with a history event.

Rules:
- System-created incident starts at DETECTED.
- A user triage action records actor and timestamp.
- Assignment requires an active Member with suitable permissions.
- Investigation notes are append-only events/comments, not overwritten description text.
- Resolution requires a summary or resolution code according to product policy.
- Closure is a distinct action from resolution.
- Reopening a closed incident should either be prohibited or create a linked follow-up incident; decide in Phase 3.3.

## 6. Work Order Lifecycle

Proposed states:

`DRAFT → OPEN → ASSIGNED → IN_PROGRESS → COMPLETED`

Optional states: `BLOCKED`, `CANCELLED`.

Rules:
- A Work Order belongs to one Asset and one Organization.
- An assignee must be an active tenant Member with a compatible role.
- Only authorized roles can assign/reassign/cancel.
- Technician completion records findings and a completion summary.
- A Work Order completion does not automatically close its linked Incident unless an explicit workflow rule does so.
- A completed Work Order should not be silently edited; corrections should be recorded as an amendment/history event.

## 7. Asset and Sensor Lifecycle

- Archive Assets rather than hard-delete them when they have telemetry or maintenance history.
- Decommissioning is a lifecycle transition with timestamp and reason.
- Sensors can be retired/replaced while historical readings remain queryable.
- Replacing a Sensor should create a new Sensor identity rather than reusing the old Sensor ID for a new physical instrument.
- Device credentials can be revoked without deleting historical Device/Telemetry references.
- Site/Building archive must be blocked or require an explicit migration plan if active Assets remain assigned.

## 8. Audit and History

### AuditLog

Capture security-sensitive and important administrative actions:
- Organization settings and membership/role changes.
- Asset and Sensor configuration changes.
- Threshold changes.
- Device credential provisioning/revocation.
- Incident assignment/status changes.
- Work Order assignment/status/completion.
- Simulation start/stop and scenario changes.
- Data export and destructive retention operations.

Audit events should include actor (or system), organization, action, target entity, request/correlation ID, timestamp, and safe metadata.

### Domain history

Use specialized history tables where the UI needs a business timeline. IncidentEvent is mandatory for incident workflow history. A future WorkOrderEvent can be added if work order timeline complexity requires it.

Do not use a generic AuditLog as the only business workflow history if a domain-specific event model is needed for user-facing context.

## 9. Time and Ordering

- Persist timestamps as UTC instants.
- Display in the Site's IANA timezone, with explicit timezone where operationally relevant.
- Store observedAt, receivedAt, and createdAt separately for telemetry.
- Do not assume arrival order equals measurement order.
- Use deterministic tie-breakers (timestamp plus ID) for pagination and event timelines.
- Record timezone for recurrence schedules; a UTC timestamp alone does not define a local recurring maintenance schedule.

## 10. Unit and Metric Integrity

- Each Sensor maps to a MetricDefinition.
- Every reading must use a unit compatible with the metric.
- Normalize to a canonical unit before storing trusted normalized values.
- Store raw reported unit/value only in the bounded raw event payload or explicit source fields if audit requirements demand it.
- Conversion functions must be versioned/tested.
- Never compare thresholds expressed in different units.
- Display precision is a presentation choice and must not mutate stored values.

## 11. Delete, Archive, Export

Define lifecycle separately for each data class:
- User: deactivate/anonymize according to legal and authentication policy; do not cascade-delete operational history without an explicit anonymization model.
- Organization: suspension first; permanent deletion/export follows an approved customer data policy.
- Asset/Sensor/Device: archive/retire/revoke; preserve telemetry and historical incident references.
- Telemetry: retention and export policy to be finalized.
- Audit: restricted append-only retention; deletion obligations need legal review.
- Outbox: clean terminal events after the retry/debug retention window.

Avoid blanket `onDelete: Cascade` across tenant-owned operational records. Cascade is appropriate only for dependent records whose deletion is truly safe and intended.

## 12. Data Quality and Corrections

A normalized reading should be immutable after acceptance. If a correction is required:
- Record a corrected/replacement reading with provenance, or
- Mark the prior reading invalid/superseded using a controlled process.

Do not silently rewrite source telemetry. Corrections must preserve source event and actor/system reason.

## 13. Integrity Test Scenarios

- Attempt to create an Asset in a Site owned by another Organization.
- Attempt to attach a Building from another Site to an Asset.
- Attempt to attach a Sensor to an Asset in another tenant.
- Publish a telemetry message for a Sensor not assigned to the Device.
- Send a duplicate event ID with identical payload.
- Send the same event ID with conflicting payload.
- Send out-of-order timestamps.
- Send future-dated timestamps beyond allowed clock skew.
- Attempt an invalid Incident state transition.
- Assign a Work Order to an inactive/non-member User.
- Archive a Site containing active Assets.
- Delete a user referenced by historical maintenance records.

All tests must verify both expected API response and resulting database state.
