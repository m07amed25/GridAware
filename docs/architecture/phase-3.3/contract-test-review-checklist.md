# Contract Test and Review Checklist

**ID:** ARC-TEST-CONTRACT-001 · **Version:** 0.1 · **Status:** Acceptance baseline

## 1. REST API tests

- [ ] Every route has request/response DTO schema.
- [ ] Every route has auth and permission requirements.
- [ ] Tenant context is resolved from membership/resource ownership.
- [ ] Cross-tenant ID substitution is rejected/concealed consistently.
- [ ] Parent-child tenant ownership mismatches fail.
- [ ] Unknown command DTO properties fail validation.
- [ ] Pagination/filter/time-range limits are enforced.
- [ ] Error codes are stable and no secret/internal trace is exposed.
- [ ] Invalid state transitions fail predictably.
- [ ] Idempotency-Key behavior is tested on designated writes.

## 2. MQTT tests

- [ ] Simulator publishes only to its exact provisioned topics.
- [ ] Credential-to-Device identity is validated.
- [ ] Topic Organization/Site/Device matches registry scope.
- [ ] Unsupported schema version is rejected/quarantined.
- [ ] Duplicate same-payload event does not duplicate readings/outbox effect.
- [ ] Duplicate conflicting payload produces integrity conflict.
- [ ] Unknown or unauthorized Sensor is rejected.
- [ ] Sensor metric mismatch is rejected.
- [ ] Unit conversion and invalid unit cases are tested.
- [ ] NaN/Infinity/oversized payload is rejected.
- [ ] Late/out-of-order time is retained correctly.
- [ ] Broker and subscriber restart behavior is verified.
- [ ] QoS 1 redelivery does not duplicate business effects.
- [ ] Simulator source cannot be spoofed as physical source.

## 3. WebSocket tests

- [ ] Unauthenticated connection rejected.
- [ ] User cannot subscribe to another Organization/Site.
- [ ] Membership revocation closes or invalidates access.
- [ ] Notifications are delivered only to the owning User.
- [ ] Duplicate/out-of-order event handling is safe.
- [ ] Reconnect triggers REST state refresh.
- [ ] High-rate telemetry is batched/throttled.

## 4. Job/outbox tests

- [ ] Outbox row and business mutation commit atomically.
- [ ] Dispatcher crash/restart recovers pending events.
- [ ] Enqueue-before-mark-published duplicate is harmless.
- [ ] Worker retry does not duplicate Incident/Notification/Prediction.
- [ ] Permanent validation failures are not retried indefinitely.
- [ ] Failed jobs are inspectable and safe to replay.
- [ ] Correlation/causation IDs survive every hop.
- [ ] Consumer reloads the aggregate under tenant scope.

## 5. AI integration tests

- [ ] Only internal authenticated service can invoke inference.
- [ ] Request and feature schema versions are validated.
- [ ] Unsupported model/version returns stable error.
- [ ] Insufficient/stale data results in explicit abstention/error.
- [ ] Anomaly score is not presented as calibrated failure probability.
- [ ] Response contains immutable model version and artifact digest.
- [ ] Timeout/model-not-ready/resource exhaustion behavior is tested.
- [ ] Python cannot bypass NestJS authorization/persistence.
- [ ] AI failure does not block telemetry acceptance.

## 6. End-to-end vertical slice contract test

1. Provision a simulated Device and Generator Sensors.
2. Start an authorized Generator SimulationRun.
3. Publish valid envelope through MQTT.
4. Verify TelemetryEvent and readings persist logically once.
5. Verify `telemetry.accepted` OutboxEvent exists.
6. Verify worker evaluates freshness and configured thresholds.
7. Verify AnomalyEvent is created/deduplicated as specified.
8. Verify incident policy creates Incident only when criteria match.
9. Verify authorized Engineer can triage/assign.
10. Verify Technician can execute only assigned WorkOrder.
11. Verify completion/resolution history is preserved.
12. Disconnect/reconnect WebSocket and verify REST recovery.

## 7. Security and performance acceptance

- [ ] No cross-tenant access through REST, WebSocket, MQTT, queues, cache, or analytics.
- [ ] No credentials appear in logs, API responses, or job payloads.
- [ ] AI service is private/internal.
- [ ] Rate limits protect auth and expensive operations.
- [ ] Structured logging redacts secrets and untrusted payload details.
- [ ] API p95, telemetry ingest rate, database write latency, queue lag, WebSocket fan-out, and inference latency are measured under a repeatable load profile.

Previous planning numbers such as 100 telemetry events/sec or a sub-three-second UI update are targets to validate, not achieved results.

## 8. Approval requirements

Each contract has owner/reviewer, version, status, open questions, and a corresponding automated test (or explicit reason it cannot yet be tested). Phase 3.3 is approved only after auth/transport decisions are resolved, machine-readable schemas validate, and critical failure/security scenarios are tested.
