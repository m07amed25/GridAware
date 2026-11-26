# GridAware — Non-Functional Requirements (NFR)

**Version:** 1.1  
**Status:** Proposed quality baseline; numeric targets require measurement and capacity validation  
**Related:** `PRD.md`, `functional-requirements.md`, `success-metrics.md`, `requirements-traceability.md`

---

## 1. Purpose and interpretation

This document defines quality attributes that apply across GridAware. Functional requirements describe what the product does; non-functional requirements describe the qualities, constraints, and operational properties expected from that behavior.

Numbers in this document are proposed engineering targets for an initial test environment, not measured performance or contractual service-level commitments. They must be validated using realistic workloads and the actual deployment topology.

## 2. Security and privacy

### NFR-SEC-001 — Tenant isolation (P0)

Every request, background job, WebSocket subscription, export, and internal service operation involving tenant-owned data MUST enforce organization ownership and the caller's permission scope.

**Verification:**

- Automated tests attempt cross-tenant reads, updates, deletes, assignments, and nested-resource access.
- Tests include guessed IDs, modified organization IDs, stale memberships, and manipulated background-job payloads.
- Unauthorized access is denied without disclosing unnecessary information about another tenant's records.

### NFR-SEC-002 — Least privilege (P0)

Users, services, database roles, MQTT clients, and deployment identities MUST receive only the permissions required for their functions.

**Verification:**

- Review the role/permission matrix.
- Ensure runtime database credentials are not migration-owner credentials.
- Keep simulator identities separate from user identities.
- Restrict internal AI service access to required endpoints.

### NFR-SEC-003 — Credential and secret handling (P0)

Passwords, tokens, device credentials, database URLs, and API secrets MUST not be committed to source control, exposed in frontend bundles, or written to logs.

**Verification:**

- Enable secret scanning in repository/CI where available.
- Validate required environment configuration at startup.
- Document credential rotation and revocation procedures.
- Review error messages and diagnostic output for accidental secret exposure.

### NFR-SEC-004 — Transport protection (P0 outside local development)

External application, database, and device communication MUST use encrypted transport appropriate to the deployment.

**Verification:**

- Production application endpoints use HTTPS.
- Neon connections use TLS according to provider configuration.
- MQTT communication outside a trusted isolated local test environment uses TLS and authenticated clients.

### NFR-SEC-005 — Authentication and session safety (P0)

Authentication MUST protect against brute-force attempts and unsafe session handling.

**Verification:**

- Rate limiting or equivalent abuse protection is tested.
- Cookie settings or token storage are reviewed against the selected authentication design.
- Logout, expiry, refresh, and revocation behavior are tested.

### NFR-SEC-006 — Auditability (P0)

Sensitive user and configuration actions MUST produce tamper-resistant application-level audit records.

**Verification:**

- Audit coverage maps to FR-AUD-001.
- Records include actor, action, target, timestamp, and tenant context.
- Secrets and full credentials are excluded.
- Normal application operations cannot rewrite historical audit entries.

### NFR-SEC-007 — Secure development and dependency management (P1)

The project SHOULD run dependency and container-image checks and maintain a documented process for reviewing critical vulnerabilities.

**Verification:**

- CI stores dependency check results.
- Critical/high findings are reviewed before pilot deployment.
- Base images and runtime dependencies are updated through reviewed changes.

## 3. Reliability and data integrity

### NFR-REL-001 — No silent loss of accepted telemetry (P0)

Once ingestion acknowledges a telemetry event as accepted, the system MUST either persist it or retain it in a recoverable processing path. It must not silently discard accepted events.

**Verification:**

- Failure tests cover database interruption, worker restart, queue unavailability, and retry behavior.
- Accepted, rejected, retried, pending, and dead-lettered counts are observable.

### NFR-REL-002 — Idempotent processing (P0)

Repeated delivery of the same event MUST NOT produce duplicate telemetry records or duplicate downstream business effects.

**Verification:**

- Submit the same event repeatedly.
- Confirm one logical telemetry record and one eligible alert/incident effect.
- Verify retries after partial failure.

### NFR-REL-003 — Explicit data quality and freshness (P0)

The platform MUST distinguish valid, invalid, stale, missing, and delayed data as applicable.

**Verification:**

- API and UI tests cover each state.
- No-data conditions are not displayed as healthy operation.
- Last-observed and last-ingested times can be distinguished.

### NFR-REL-004 — Recoverable background processing (P0)

Background jobs MUST have documented retry limits, backoff behavior, idempotency rules, failure visibility, and dead-letter handling where appropriate.

**Verification:**

- Poison-message test.
- Worker restart test.
- Retry exhaustion test.
- Recovery/replay procedure test.

### NFR-REL-005 — Transactional consistency (P0)

Business operations that modify related records MUST use transactional or otherwise consistent patterns. When a database write and queue publication must succeed together, use a documented mechanism such as transactional outbox or an equivalent recovery design.

**Verification:**

- Inject failure between database commit and job publication.
- Confirm the operation can be recovered without missing or duplicating business effects.

## 4. Performance and capacity

### NFR-PERF-001 — Interactive API latency (proposed)

For ordinary authenticated read endpoints under a defined MVP test workload, target p95 response time below 300 ms. Exclude large exports, cold starts, external AI inference, and intentionally long-running operations.

**Verification:**

- Use k6 or an equivalent load tool.
- Publish request rate, concurrency, test duration, dataset size, p50/p95/p99, and error rate.
- Record resource profile and hosting region.

### NFR-PERF-002 — Initial telemetry throughput (proposed)

Test the initial architecture against a sustained workload of 100 telemetry events per second, with a separately defined burst profile. This is a capacity test target, not a guarantee that every hosted configuration supports it without tuning.

**Verification:**

- Run a repeatable simulator/load generator.
- Measure accepted rate, persisted rate, queue lag, end-to-end processing delay, and errors.
- Document message size, metric count, test duration, and concurrent publishers.

### NFR-PERF-003 — Monitoring freshness (proposed)

Under defined normal test conditions, newly ingested telemetry should become visible in the monitoring interface within 3 seconds at p95 where real-time delivery is enabled.

**Verification:** Record source event time, ingestion time, processing time, and frontend receipt/display time. Report p50, p95, and p99.

### NFR-PERF-004 — Bounded queries (P0)

Telemetry and analytics APIs MUST enforce bounded time ranges, result limits, and pagination/aggregation rules to prevent unbounded database queries.

**Verification:** API validation tests cover excessive ranges and limits; database query plans are reviewed for critical paths.

## 5. Scalability and extensibility

### NFR-SCALE-001 — Multi-tenant growth (P0)

The data model and authorization design MUST support multiple organizations without relying on one global tenant or hard-coded customer identity.

### NFR-SCALE-002 — Independently scalable workers (P1)

Telemetry processing and asynchronous work SHOULD be deployable as independently scaled worker processes without changing product-level business behavior.

### NFR-SCALE-003 — Extensible asset model (P1)

The asset and sensor model SHOULD accommodate more than generators without requiring a new table set for every equipment category. Equipment-specific specifications and supported metrics must remain validated and typed where practical.

### NFR-SCALE-004 — Telemetry growth strategy (P1)

The team MUST document indexes, partitioning/retention options, aggregation strategy, and archival options before production telemetry volume grows beyond the tested workload.

## 6. Availability and recoverability

### NFR-AVAIL-001 — Initial pilot availability objective (proposed)

A 99.5% monthly application availability objective MAY be used for planning after the external pilot architecture is selected. It is not a customer SLA until monitoring, exclusions, and support operations are defined.

### NFR-AVAIL-002 — Dependency degradation

If AI inference is unavailable, telemetry ingestion and core asset/incident operations SHOULD continue. The system should mark intelligence results as delayed or unavailable rather than blocking core operations.

### NFR-AVAIL-003 — Backup and restore

Production backup and recovery procedures MUST be documented and restore-tested before real customer data is accepted.

**Verification:** Record backup frequency/retention; restore into an isolated environment; measure recovery time and recovery point; document gaps and owner.

## 7. Observability and operability

### NFR-OBS-001 — Structured logs (P0)

Services MUST emit structured logs with timestamp, service, environment, severity, correlation/request ID, and safe operational context.

### NFR-OBS-002 — Cross-service correlation (P1)

A telemetry event or business operation SHOULD be traceable across ingestion, processing, persistence, AI invocation, incident creation, and frontend update using correlation identifiers.

### NFR-OBS-003 — Service metrics (P0 for pilot)

At minimum, monitor:

- API request count, latency, and error rate.
- Database connections and query behavior.
- MQTT connection state and message throughput.
- Worker queue depth, lag, retries, and failures.
- Telemetry accepted/rejected/duplicate counts.
- AI inference request rate, latency, and failures.
- WebSocket connection and delivery failures.

### NFR-OBS-004 — Operational alerting

Before pilot, configure alerts for critical service failures, unusual queue growth, database unavailability, telemetry ingestion failure, and excessive application errors.

### NFR-OBS-005 — Health checks

Each deployable component MUST expose health/readiness behavior suitable for orchestration. Health responses must not reveal secrets or sensitive configuration.

## 8. Usability and accessibility

### NFR-UX-001 — Clear status language

Users MUST distinguish healthy, warning, critical, offline, stale, unknown, and resolved states through text labels and not color alone.

### NFR-UX-002 — Measurement context

Every measurement display MUST include its unit and meaningful timestamp or last-updated context.

### NFR-UX-003 — Recoverable forms

Forms SHOULD preserve appropriate user input after non-destructive validation errors and show actionable field-level messages.

### NFR-UX-004 — Role-appropriate views

Technicians should receive task-oriented views; engineers should receive investigation context; managers should receive summary and prioritization views.

### NFR-UX-005 — Responsive experience

Core workflows SHOULD remain usable on common laptop/tablet viewports. Mobile-specific field workflows require separate validation before claiming full mobile support.

### NFR-UX-006 — Accessibility

Aim for WCAG 2.2 AA alignment for core interactive flows where feasible. Include keyboard operation, visible focus, appropriate contrast, semantic labels, and non-color-only status indicators. Do not claim compliance until assessed.

## 9. Maintainability and engineering quality

### NFR-MAINT-001 — Modular backend

NestJS modules MUST follow documented domain boundaries. Cross-domain access should use explicit services/contracts rather than arbitrary imports of internal implementation details.

### NFR-MAINT-002 — Runtime validation

TypeScript and Python interfaces MUST validate external inputs at runtime; compile-time types alone do not validate API or MQTT messages.

### NFR-MAINT-003 — Database migration discipline

Schema changes MUST be versioned and applied through reviewed migrations. Production deployment must not use development migration commands.

### NFR-MAINT-004 — Risk-based testing

Tenant-isolation, authentication, telemetry idempotency, incident transitions, and work-order authorization MUST have automated tests. A single overall coverage percentage is not sufficient evidence.

### NFR-MAINT-005 — Service documentation

Each deployable service MUST document purpose, configuration, local startup, health checks, dependencies, and operational failure modes.

## 10. Compatibility and portability

- Select and pin supported stable Node.js and Python versions in the engineering baseline.
- Support the agreed modern desktop browsers.
- Keep database behavior compatible with the chosen Neon PostgreSQL capabilities; do not assume extensions are available without checking the selected environment.
- Use reproducible containerized dependencies for local development where practical.

## 11. Simulator-specific quality requirements

- Every simulation run has a scenario ID and configuration/seed metadata.
- Generated data is clearly labeled as simulated in storage and UI.
- Scenario truth labels are stored separately from model input features to avoid label leakage.
- Simulator clock, event timestamp, and publish time are controlled and testable.
- Simulator supports normal, fault, and data-quality scenarios.
- A scenario can be replayed to reproduce a bug or evaluation run.

## 12. Verification matrix

| NFR area             | Test type                      | Evidence required                      |
| -------------------- | ------------------------------ | -------------------------------------- |
| Tenant isolation     | API integration/security tests | Cross-tenant test report               |
| Credential safety    | Code review/secret scan        | CI output and review record            |
| Telemetry durability | Failure injection              | Accepted vs persisted/recovered counts |
| Idempotency          | Replay test                    | Duplicate event result                 |
| Performance          | Load test                      | Workload and percentile report         |
| Monitoring freshness | End-to-end timing test         | p50/p95/p99 latency                    |
| Backup recovery      | Restore exercise               | Recovery report                        |
| Accessibility        | Manual and automated audit     | Findings and remediation list          |
| Maintainability      | Static analysis and review     | CI status and architecture review      |

## 13. NFR approval gate

Before external pilot, Product/Engineering must review each P0 requirement, record test evidence, document exceptions, and assign remediation owners. Proposed numerical targets must be confirmed or replaced using measurements from the selected hosting environment.
