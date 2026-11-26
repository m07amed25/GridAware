# Request, Response, Pagination, and Error Standards

**ID:** ARC-API-STD-001 · **Version:** 0.1 · **Status:** Proposed

## 1. JSON conventions

- Content type: `application/json; charset=utf-8`.
- Property names: `camelCase`; enum strings: `UPPER_SNAKE_CASE`.
- Reject unknown fields on command DTOs unless an endpoint explicitly supports extensions.
- Validate numeric finiteness; NaN and Infinity are invalid JSON domain values.
- Avoid implicit coercion of security-sensitive fields.
- API timestamps are UTC ISO 8601/RFC 3339 strings.
- Public DTOs must not expose raw database-only or secret fields.

## 2. Success envelope

```json
{
  "data": { "id": "2cba9fe5-720a-4f59-a191-5390af7eb4c1", "name": "Backup Generator 01" },
  "meta": { "requestId": "req_01JCV8Z0Q7K1", "servedAt": "2026-11-26T10:31:00.000Z" }
}
```

Collection example:

```json
{
  "data": [{ "id": "a7c...", "name": "Backup Generator 01" }],
  "meta": { "requestId": "req_01JCV8Z0Q7K1", "pagination": { "nextCursor": "opaque-token", "hasMore": true, "limit": 50 } }
}
```

`meta` should be consistently present. Do not return internal fields by default.

## 3. Correlation and idempotency headers

| Header | Rule |
|---|---|
| `X-Request-Id` | Optional request trace hint; validate length/charset; server generates a new ID if absent/invalid |
| `X-Correlation-Id` | Workflow trace; server generates if absent |
| `Idempotency-Key` | Used on designated retriable create/command routes; never an auth credential |
| `Authorization` | Abstract bearer access credential pending final auth ADR |
| `Content-Type` | JSON for JSON bodies |

Return `requestId` in response metadata and a response header. Never use correlation IDs to grant access.

## 4. Pagination

Cursor pagination is preferred for telemetry, incidents, anomalies, notifications, audit history, and work-order timelines.

- Cursor is opaque and bound to query filters, sort order, and authorized scope.
- Ordering is deterministic, e.g. `(observedAt, id)` or `(createdAt, id)`.
- Suggested ordinary list maximum is 100; telemetry point limits are separate and lower/aggregation-based.
- Every page re-derives tenant access; a cursor never grants access.
- Offset pagination may be used for small reference lists only when bounded and deterministic.

## 5. Filters and sorting

Use allowlisted fields. Reject unknown sort fields/directions. Never accept a Prisma `where`/`orderBy` object or SQL fragment from a public request. Bound time ranges and multi-value filters. Telemetry queries must use approved intervals such as `raw`, `1m`, `5m`, `15m`, `1h`; never pass arbitrary interval text into SQL.

## 6. Error envelope

```json
{
  "type": "https://gridaware.example/problems/validation-error",
  "title": "Request validation failed",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "detail": "One or more request fields are invalid.",
  "instance": "/api/v1/assets",
  "requestId": "req_01JCV8Z0Q7K1",
  "errors": [{ "field": "criticality", "code": "INVALID_ENUM_VALUE", "message": "Unsupported criticality value." }]
}
```

Never return stack traces, SQL exception detail, tokens, raw credentials, broker internals, private hostnames, or unredacted message payloads.

## 7. Initial error code catalog

| Code | HTTP | Meaning |
|---|---:|---|
| `VALIDATION_ERROR` | 400 | Request schema/field validation failed |
| `INVALID_TIME_RANGE` | 400 | Invalid or excessive time range |
| `UNAUTHENTICATED` | 401 | Missing/invalid auth |
| `FORBIDDEN` | 403 | Actor lacks permission |
| `RESOURCE_NOT_FOUND` | 404 | Missing or concealed cross-tenant resource |
| `TENANT_SCOPE_MISMATCH` | 404/403 | Resource outside authorized tenant |
| `STATE_TRANSITION_NOT_ALLOWED` | 409 | Current workflow state forbids command |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key reused with different input |
| `RESOURCE_CONFLICT` | 409 | Unique/domain constraint conflict |
| `PRECONDITION_FAILED` | 412 | Expected entity version does not match |
| `RATE_LIMITED` | 429 | Request quota exceeded |
| `DEPENDENCY_UNAVAILABLE` | 503 | Required service unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected failure |

## 8. Validation and concurrency

Validate DTOs at the transport boundary (NestJS ValidationPipe or equivalent), then enforce domain invariants in services. Use ETag/`expectedVersion` where concurrent editing can overwrite important state. Always re-check incident/work-order transition state inside the transaction. Return `412 PRECONDITION_FAILED` for version mismatch and `409 STATE_TRANSITION_NOT_ALLOWED` for illegal domain transitions.

## 9. Time and locale

Persist UTC instants. Site timezone is an IANA identifier such as `Africa/Cairo`. Recurring maintenance schedules must represent local recurrence plus timezone. UI language/formatting must never change the stored instant.
