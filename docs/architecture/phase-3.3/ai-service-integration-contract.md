# Python AI Service Integration Contract

**ID:** ARC-AI-INT-001 · **Version:** 0.1 · **Status:** Proposed; advanced inference is deferred

## 1. Service ownership

NestJS owns product entities, user/tenant authorization, and persistence of Prediction, AnomalyEvent, and RiskAssessment records. Python owns model-specific preprocessing/inference and returns structured outputs plus immutable model metadata. Python is not a second product API and does not directly mutate product tables.

Flow: NestJS/worker authorizes request → loads a bounded time window from PostgreSQL → builds normalized input → calls private Python API → validates response and model metadata → persists business result through NestJS domain service → UI reads through NestJS REST/WebSocket.

AI unavailability must not block telemetry persistence.

## 2. Proposed internal endpoints

Internal base `/internal/v1`:

| Method | Endpoint | Purpose | Phase |
|---|---|---|---|
| GET | `/health/live` | Process liveness | When deployed |
| GET | `/health/ready` | Model/runtime readiness | When deployed |
| GET | `/models` | Safe model aliases/versions | Later |
| POST | `/inference/anomaly` | Anomaly inference | After baseline validated |
| POST | `/inference/failure-risk` | Failure-risk inference | Requires valid failure labels/calibration |
| POST | `/inference/forecast` | Forecast values | Later |

The MVP can implement threshold/rule evaluation in NestJS workers first. A simulator does not automatically justify presenting an unvalidated AI probability.

## 3. Service authentication

Private network only. Select service-to-service authentication (short-lived service token, mTLS, or platform workload identity) before deployment. Do not forward a user's browser access token. Rotate service credentials, validate operation scope, apply strict timeouts/concurrency and payload limits, and propagate correlation IDs.

**Open AI-01:** choose service authentication/networking in deployment design.

## 4. Common request fields

- `schemaVersion`, `requestId`, `correlationId`.
- `requestedModel` stable alias or explicit approved version.
- `asset` with product asset ID and asset type code.
- `window` with UTC start/end, sample count, expected interval.
- `featureSchemaVersion`.
- `source` (`SIMULATOR`, `DEVICE`, `IMPORT`).
- `series` measurements with sensor ID, metric code, canonical unit, observedAt, value, quality.

NestJS has already resolved tenant access. An organization ID may be included for audit correlation but Python must not treat it as authorization proof.

## 5. Anomaly request example

```json
{
  "schemaVersion": "1.0",
  "requestId": "a2fb59a2-1c65-4a18-a9ea-76b22c0e20b2",
  "correlationId": "corr_01JCV...",
  "requestedModel": "generator-anomaly-default",
  "asset": { "assetId": "d105eebb-e403-4d1b-b4ae-cb6a58ca5b70", "assetTypeCode": "GENERATOR" },
  "window": { "from": "2026-11-26T10:00:00.000Z", "to": "2026-11-26T10:30:00.000Z", "sampleCount": 180, "expectedIntervalSeconds": 10 },
  "featureSchemaVersion": "generator-v1",
  "source": "SIMULATOR",
  "series": [
    { "sensorId": "987b4268-eeb5-4421-a4bb-0beeb891b2a1", "metricCode": "temperature", "unit": "Cel", "observedAt": "2026-11-26T10:30:00.000Z", "value": 86.5, "quality": "VALID" }
  ]
}
```

## 6. Anomaly response example

```json
{
  "schemaVersion": "1.0",
  "requestId": "a2fb59a2-1c65-4a18-a9ea-76b22c0e20b2",
  "task": "ANOMALY_DETECTION",
  "result": {
    "isAnomalous": true,
    "score": 0.91,
    "scoreMeaning": "NORMALIZED_ANOMALY_SCORE",
    "severitySuggestion": "HIGH",
    "evidence": [{ "metricCode": "temperature", "contribution": 0.62, "direction": "INCREASED" }]
  },
  "model": { "name": "generator-anomaly-default", "version": "1.2.0", "artifactDigest": "sha256:..." },
  "evaluation": { "calibratedProbability": null, "calibrationStatus": "NOT_CALIBRATED" },
  "input": { "featureSchemaVersion": "generator-v1", "windowFrom": "2026-11-26T10:00:00.000Z", "windowTo": "2026-11-26T10:30:00.000Z", "qualitySummary": "VALID_WITH_GAPS" },
  "inference": { "completedAt": "2026-11-26T10:30:02.100Z", "durationMs": 38 }
}
```

An anomaly score is not a failure probability. `calibratedProbability` remains null until calibration is measured and validated.

## 7. Failure prediction requirements

A failure-risk response must specify target label/event definition, prediction horizon, calibrated probability only if calibrated, model version, training/evaluation data references, input quality, validity period, uncertainty/abstention state, and timestamp. If representative failure labels do not exist, return an explicit `INSUFFICIENT_DATA` or `NOT_SUPPORTED` result.

## 8. Forecast response requirements

Return metric code, canonical unit, forecast origin, horizon, frequency, timestamp/value points, optional lower/upper intervals and confidence level, model version, and data quality summary. Forecast values must never be stored or rendered as observed telemetry.

## 9. Error contract

| Code | Meaning | Retry |
|---|---|---|
| `INVALID_INPUT` | Schema invalid | No |
| `UNSUPPORTED_FEATURE_SCHEMA` | Model cannot consume feature version | No |
| `MODEL_NOT_FOUND` | Model alias/version missing | No |
| `INSUFFICIENT_DATA` | Window too short or low quality | No until data changes |
| `MODEL_NOT_READY` | Runtime/model unavailable | Bounded retry |
| `INFERENCE_TIMEOUT` | Deadline exceeded | Bounded retry if idempotent |
| `RESOURCE_EXHAUSTED` | Concurrency limit | Retry with backoff |
| `INTERNAL_INFERENCE_ERROR` | Unexpected failure | Bounded retry and alert |

Response includes safe code/detail, requestId, `retryable`, and optional retry-after seconds. Never return Python stack traces to NestJS or users.

## 10. Synchronous vs asynchronous work

Small bounded inference may use internal synchronous HTTP with strict deadline. Long-running inference, batch processing, forecast across many assets, and training use asynchronous jobs. A public operation queued for processing returns `202 Accepted` and a status reference. Never block MQTT acceptance on inference.

## 11. Model traceability

Persist model name/version, artifact digest, task type, feature schema version, inference timestamp/duration, input window/quality summary, score semantics/calibration status, and output schema version. Model artifacts belong in object/artifact storage or a model registry, not as large blobs in transactional rows.

## 12. Safety and provenance

Synthetic results must remain marked `SIMULATOR`. Synthetic evaluation is not evidence of real-world predictive performance. No AI output sends physical control commands. When telemetry is stale/incomplete, model must abstain or clearly report degraded input confidence. Explanations such as feature contribution are not proof of physical root cause.
