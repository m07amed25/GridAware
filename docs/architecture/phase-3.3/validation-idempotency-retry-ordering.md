# Validation, Idempotency, Retry, and Ordering Rules

**ID:** ARC-CONTRACT-REL-001 · **Version:** 0.1 · **Status:** Proposed

## 1. Purpose

GridAware accepts commands and events over HTTP, MQTT, WebSockets, and job queues. Retries, duplicates, delayed messages, and out-of-order events are normal distributed-system conditions. The contracts must define what is a duplicate, what is a conflict, and how the system avoids multiple business effects.

## 2. Operation/idempotency matrix

| Operation | Stable identity | Duplicate behavior |
|---|---|---|
| Telemetry event | Organization + authenticated Device + sourceEventId | Same hash: duplicate no-op; different hash: integrity conflict/quarantine |
| Reading in event | TelemetryEvent ID + Sensor ID | Duplicate sample rejected in MVP |
| Organization create | Idempotency-Key + actor + request fingerprint | Return original result for same key/body |
| Simulation start | Idempotency-Key + target Asset + run command | Do not start second process for same logical request |
| Incident from anomaly | Tenant + dedupe fingerprint + policy window | Reuse/link active case or record suppressed policy outcome |
| Outbox consumer | OutboxEvent ID + consumer name | No-op if effect is already committed |
| Notification delivery | Notification ID + channel/provider key | Deduplicate where provider allows; retain attempts |
| AI inference | Request ID + task/model/input-window fingerprint | Reuse result or avoid duplicate business record |
| WorkOrder from source | Explicit Incident/Schedule source relation + key | Prevent duplicate corrective order by repeated trigger |

## 3. HTTP Idempotency-Key

For designated create/command operations:
- Client creates a high-entropy key per logical operation.
- Server scopes it by actor, organization, and operation.
- Server stores key, request fingerprint, resulting resource/reference, status, and retention timestamps.
- Same key + same fingerprint returns prior outcome (or current status for async operation).
- Same key + different fingerprint returns `409 IDEMPOTENCY_CONFLICT`.
- Key never authenticates a caller.
- Define retention window before external pilot; expiration means a future request may be treated as new only after the documented window.

## 4. Transaction boundaries

Telemetry acceptance transaction:
1. Resolve authenticated Device/tenant scope.
2. Validate topic/payload/Device/Sensor ownership.
3. Insert TelemetryEvent under unique identity.
4. Insert normalized TelemetryReadings.
5. Insert required OutboxEvent(s).
6. Commit.

Incident automation transaction:
1. Check deduplication policy/fingerprint under concurrency control.
2. Create Incident if policy says action is required.
3. Create initial IncidentEvent.
4. Write notification/outbox intent.
5. Commit.

Workflow command transaction:
- Check entity version/current state.
- Validate actor and target assignment.
- Update state.
- Append IncidentEvent or other history record.
- Add outbox event if downstream work is required.
- Commit atomically.

## 5. Retry classification

Retryable failures: transient network errors, service unavailable, temporary Redis outage, database transaction conflict after safe rollback, bounded AI timeout, or an external provider rate limit.

Non-retryable failures: malformed JSON, invalid schema version, unknown/unowned Sensor, incompatible Metric/Unit, permission failure, illegal state transition, or Idempotency-Key reused with a different body.

Do not retry permanent business validation errors indefinitely.

## 6. Retry design

- Exponential backoff with jitter.
- Finite attempts and explicit operation deadline.
- Per-queue retry configuration; no universal retry count.
- Honor safe `Retry-After` hints.
- Avoid synchronized retry storms.
- Exhausted jobs move to failed/dead-letter handling.
- Manual replay preserves the original idempotency identity.
- Operators need visibility into retry reason and last attempt without access to secrets/raw sensitive payloads.

Exact attempt counts and delay intervals are configuration decisions to be tuned after integration/load tests.

## 7. Ordering and late arrival

- MQTT events may arrive out of order.
- Time-series history uses `observedAt` plus deterministic tie-breaker ID.
- Ingestion lag uses `receivedAt - observedAt`.
- Queue completion order is not telemetry event order.
- Late measurements may update historical windows but should not overwrite a newer latest-value snapshot.
- Incident/WorkOrder events include resource version or transition state so stale jobs cannot reverse newer state.

## 8. Missing and stale data

- Missing sample is not zero.
- No recent telemetry is not healthy status.
- Freshness is calculated from expected cadence and policy window.
- Model windows report data coverage/missingness.
- Long gaps are not silently interpolated.
- `SUSPECT` and `INVALID` quality use an explicit, model-specific feature policy.

## 9. Rate limits and quotas

Separate controls apply to login/reset, general user API, expensive telemetry queries, simulation start/control, per-device MQTT publish rate, WebSocket connections/subscriptions, and AI inference. Use tenant-aware quotas to limit noisy-neighbor effects. Return `429 RATE_LIMITED` with safe retry guidance. Browser throttling is not a security control.

## 10. Required failure tests

- Same event identity/same payload twice.
- Same event identity/different payload.
- Same HTTP idempotency key/body twice.
- Same key with changed payload.
- Dispatcher crash after enqueue but before marking published.
- Queue delivers already-completed job again.
- Two users assign one Incident concurrently.
- Late event arrives after newer observation.
- Sensor stops reporting but last value was non-zero.
- AI times out after it may have completed inference.
