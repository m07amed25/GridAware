# GridAware — Requirements Traceability Matrix

**Version:** 1.1  
**Status:** Initial traceability baseline; update as tests and implementation are created  
**Related:** All documents in `docs/product/`

---

## 1. Purpose

This matrix connects product goals to requirements, user stories, use cases, tests, and MVP release gates. It helps the team detect missing tests, unimplemented requirements, and scope changes that affect product outcomes.

The intended chain is:

`Product Goal → Persona/Need → User Story → Functional Requirement → Use Case → Test Case → Release Gate`

Non-functional requirements are cross-cutting and may apply to multiple stories and use cases.

## 2. Product goal references

| Goal ID | Product goal                               | Evidence of completion                                                |
| ------- | ------------------------------------------ | --------------------------------------------------------------------- |
| PG-01   | Establish a secure multi-tenant workspace  | Organization and membership workflows; cross-tenant tests             |
| PG-02   | Maintain an asset and sensor registry      | Asset and sensor records linked to sites and tenants                  |
| PG-03   | Ingest reliable simulator telemetry        | Validation, deduplication, persistence, and recovery evidence         |
| PG-04   | Provide useful monitoring context          | Current values, units, timestamps, freshness, and history             |
| PG-05   | Detect and communicate abnormal conditions | Contextual threshold alert and optional evaluated anomaly baseline    |
| PG-06   | Organize response and maintenance          | Incident, assignment, work order, completion, and resolution timeline |
| PG-07   | Provide operational oversight              | Authorized summaries with defined metrics                             |
| PG-08   | Operate safely and observably              | Security, reliability, performance, backup, and monitoring evidence   |

## 3. Story-to-requirement matrix

| Story                           | Epic  | Requirement IDs               | Use case                    | MVP gate |
| ------------------------------- | ----- | ----------------------------- | --------------------------- | -------- |
| US-001 Sign in                  | EP-01 | FR-AUTH-001                   | UC-01 / protected use cases | G1       |
| US-002 View profile/memberships | EP-01 | FR-AUTH-003, FR-ORG-002       | UC-01                       | G1       |
| US-003 Create organization      | EP-01 | FR-ORG-001                    | UC-01                       | G1       |
| US-004 Manage members           | EP-01 | FR-ORG-003                    | UC-01                       | G1       |
| US-005 Create site              | EP-02 | FR-SITE-001                   | UC-02                       | G1       |
| US-006 Register generator       | EP-02 | FR-ASSET-001                  | UC-03                       | G1       |
| US-007 View asset history       | EP-02 | FR-ASSET-002                  | UC-06                       | G4       |
| US-008 Configure sensors        | EP-02 | FR-SENSOR-001/002             | UC-04                       | G1       |
| US-009 Normal simulator         | EP-03 | FR-SIM-001                    | UC-05                       | G2       |
| US-010 Abnormal scenario        | EP-03 | FR-SIM-002                    | UC-05/07                    | G3       |
| US-011 Ingest telemetry         | EP-03 | FR-TLM-001–005, FR-DEVICE-001 | UC-05                       | G2       |
| US-012 Current readings         | EP-03 | FR-MON-001, FR-SENSOR-003     | UC-06                       | G4       |
| US-013 Historical telemetry     | EP-03 | FR-MON-002, FR-TLM-005        | UC-06                       | G4       |
| US-014 Configure thresholds     | EP-04 | FR-RULE-001                   | UC-07                       | G3       |
| US-015 Contextual alert         | EP-04 | FR-RULE-002/003               | UC-07                       | G3       |
| US-016 Review anomaly           | EP-04 | FR-ANOM-001                   | UC-07                       | G6 / P1  |
| US-017 Set criticality          | EP-05 | FR-RISK-001                   | UC-03/08                    | G1/G3    |
| US-018 View risk context        | EP-05 | FR-RISK-002                   | UC-08                       | G6 / P1  |
| US-019 Create/triage incident   | EP-06 | FR-INC-001/002/005            | UC-08                       | G3       |
| US-020 Assign incident          | EP-06 | FR-INC-003                    | UC-08                       | G3       |
| US-021 Resolve incident         | EP-06 | FR-INC-004/005                | UC-09                       | G5       |
| US-022 Create work order        | EP-07 | FR-WO-001                     | UC-09                       | G5       |
| US-023 View assigned work       | EP-07 | FR-WO-002                     | UC-09                       | G5       |
| US-024 Complete work            | EP-07 | FR-WO-003, FR-MNT-001         | UC-09                       | G5       |
| US-025 Assignment notification  | EP-08 | FR-NOT-001                    | UC-08/09                    | P1       |
| US-026 Operational summary      | EP-08 | FR-ANL-001                    | UC-10                       | P1       |
| US-027 Audit history            | EP-08 | FR-AUD-001                    | UC-01/03/04/07/08/09        | G1–G5    |

## 4. MVP release gates

| Gate | Name                   | Entry conditions                      | Exit evidence                                                                        |
| ---- | ---------------------- | ------------------------------------- | ------------------------------------------------------------------------------------ |
| G0   | Engineering foundation | Product baseline approved             | Repository, CI, environment validation, DB connectivity, migration workflow          |
| G1   | Tenant and registry    | G0 complete                           | Auth, organization, site, asset, sensor workflows; tenant tests pass                 |
| G2   | Telemetry pipeline     | G1 complete                           | Simulator → broker → worker → validated persistence; idempotency/recovery tested     |
| G3   | Rules and incidents    | G2 complete                           | Threshold configuration, alert creation, incident triage/assignment                  |
| G4   | Monitoring UX          | G2 complete                           | Asset detail, live/history data, time ranges, error/empty/stale states               |
| G5   | Maintenance workflow   | G3 complete                           | Work-order assignment, technician completion, resolution timeline                    |
| G6   | Intelligence increment | Reliable labeled data and G3 complete | Evaluated baseline and documented limitations; not required for basic vertical slice |
| G7   | Pilot readiness        | G0–G5 complete plus quality gates     | Staging deployment, security review, load report, backup restore, observability      |

## 5. Cross-cutting NFR traceability

| NFR ID                               | Applies to                               | Verification evidence                  |
| ------------------------------------ | ---------------------------------------- | -------------------------------------- |
| NFR-SEC-001 Tenant isolation         | Tenant endpoints, jobs, sockets, exports | Adversarial cross-tenant tests         |
| NFR-SEC-002 Least privilege          | App, workers, database, MQTT, AI service | Permission review and negative tests   |
| NFR-SEC-003 Secret safety            | Services and CI                          | Secret scan and configuration review   |
| NFR-SEC-004 Transport protection     | Deployed external connections            | TLS configuration inspection           |
| NFR-REL-001 No silent telemetry loss | Ingestion and worker pipeline            | Failure injection/accounting report    |
| NFR-REL-002 Idempotency              | Telemetry, alerts, incidents, jobs       | Duplicate replay tests                 |
| NFR-REL-003 Data freshness           | Sensors, API, dashboard                  | Stale/offline UI tests                 |
| NFR-REL-004 Recoverable jobs         | Workers and queues                       | Retry/dead-letter/replay tests         |
| NFR-REL-005 Transaction consistency  | Business writes and queue publication    | Partial-failure tests                  |
| NFR-PERF-001 API latency             | API endpoints                            | Load test report                       |
| NFR-PERF-002 Telemetry throughput    | Ingestion                                | Sustained/burst workload report        |
| NFR-PERF-003 UI freshness            | Telemetry-to-dashboard path              | End-to-end timestamp report            |
| NFR-AVAIL-003 Backup/restore         | Production database                      | Restore-test report                    |
| NFR-OBS-001 Structured logs          | Every deployable service                 | Log inspection and correlation test    |
| NFR-UX-001 Clear status              | Monitoring and operations UI             | Usability/accessibility test           |
| NFR-MAINT-003 Migration discipline   | Prisma/database deployment               | Migration review and staging rehearsal |

## 6. Test case identifier convention

Recommended test IDs:

- `AUTH-TC-###` — Authentication.
- `TENANT-TC-###` — Tenant isolation.
- `ASSET-TC-###` — Asset registry.
- `TLM-TC-###` — Telemetry.
- `RULE-TC-###` — Rules and alerts.
- `INC-TC-###` — Incidents.
- `WO-TC-###` — Work orders.
- `NFR-TC-###` — Non-functional tests.
- `AI-EVAL-###` — Model evaluation runs.

Each test record should include requirement ID, setup, input, expected result, actual result, environment, data source (simulated or other), and execution date.

## 7. Change-impact procedure

When a requirement changes:

1. Update its definition and acceptance criteria.
2. Identify affected stories and use cases.
3. Update this matrix.
4. Identify impacted API contracts, database schema, UI, simulator, AI features, and deployment.
5. Add or modify tests before or with implementation.
6. Reassess the MVP gate and release risk.
7. Record approval and rationale.

## 8. Current traceability limitations

This is an initial product-level matrix. It does not yet map to concrete source files, automated test IDs, migration names, or deployed service monitors because those implementation artifacts do not yet exist. Add those links as engineering begins.
