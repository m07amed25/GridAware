# GridAware — Database Decisions and Open Questions

**Document ID:** ARC-DB-DEC-001  
**Version:** 0.1  
**Status:** Active decision register for Phase 3.2

---

## 1. Decision Status

- **Proposed:** Recommended design; needs explicit approval.
- **Approved:** Accepted and recorded in an ADR.
- **Open:** Not decided; must be resolved before the dependent implementation.
- **Deferred:** Intentionally postponed.

## 2. Proposed Baseline Decisions

| ID | Decision | Proposed baseline | Needed by |
|---|---|---|---|
| DB-001 | Tenant key | `organizationId` on every tenant-owned record | Phase 4 |
| DB-002 | User model | Global User + organization Membership | Phase 4 |
| DB-003 | Role strategy | Fixed roles on Membership for MVP | Phase 4 |
| DB-004 | Site scope | Organization-wide role scope initially; optional site grants deferred unless pilot requires | Phase 3.3 |
| DB-005 | Relational store | Neon PostgreSQL as initial system of record | Approved product/architecture constraint; implementation Phase 4 |
| DB-006 | ORM | Prisma ORM | Approved product/architecture constraint; implementation Phase 4 |
| DB-007 | Telemetry logical model | Event envelope + normalized readings | Phase 3.2 approval |
| DB-008 | Telemetry event idempotency | Unique organization + device + source event ID | Phase 4 |
| DB-009 | Time fields | observedAt and receivedAt separate | Phase 4 |
| DB-010 | Initial telemetry engine | PostgreSQL-native tables; no TimescaleDB dependency | Approved proposed baseline |
| DB-011 | Raw payload | Optional diagnostic JSON with shorter configurable retention | Before pilot |
| DB-012 | Telemetry partitioning | Deferred until measured benchmark justifies it | After MVP benchmark |
| DB-013 | Tenant consistency | Service validation plus composite DB constraints where feasible | Phase 4 |
| DB-014 | RLS | Defense-in-depth candidate; do not rely on it until pooling/context is proven | Before production design approval |
| DB-015 | Async durable handoff | Transactional outbox for important post-commit processing | Phase 3.3 / Phase 4 |
| DB-016 | Telemetry numeric type | PostgreSQL double precision for MVP measurements unless instrument domain requires exact decimal | Phase 4 schema review |
| DB-017 | Unit normalization | Store trusted values in canonical unit; preserve source details only as needed | Phase 3.3 contract |
| DB-018 | Business deletion | Archive/retire rather than hard delete referenced operational records | Phase 4 |

## 3. Open Decisions

| ID | Question | Recommendation | Needed by |
|---|---|---|---|
| ODB-001 | Does MVP need site-scoped access grants? | Start organization-wide roles; revisit after pilot interviews | Phase 3.3 |
| ODB-002 | Which authentication/session system is selected? | Decide after domain, deployment, and security review | Phase 3.3 |
| ODB-003 | Is invitation support part of first MVP? | Include minimal invitation lifecycle if multi-user onboarding is required | Phase 4 |
| ODB-004 | Can a Device publish for multiple Assets? | Model Device at Site scope; permit only explicitly assigned Sensors | Phase 3.3 |
| ODB-005 | Can one Sensor report multiple metrics? | MVP assumes one primary metric per Sensor; if multi-channel instruments are needed, introduce SensorChannel | Before sensor contract |
| ODB-006 | Does one event allow multiple samples for one Sensor? | MVP says no; otherwise add sampleIndex/sequence | Before telemetry contract |
| ODB-007 | Exact retention durations? | Determine from customer needs, costs, contractual and legal requirements | Before pilot |
| ODB-008 | Raw payload enabled by default? | Off or short-lived by default; enable only for diagnostic need | Phase 4 |
| ODB-009 | RLS implementation? | Test Neon pooling and per-transaction tenant context before enabling | Before production |
| ODB-010 | Need aggregate/rollup tables? | Begin with bounded SQL aggregation; add after query benchmarks | After MVP benchmark |
| ODB-011 | Need native partitioning? | Defer until volume, retention, and query plan measurements | After MVP benchmark |
| ODB-012 | Need object storage? | Add when model artifacts, attachments, or exports require it | Phase 8 / before attachments |
| ODB-013 | Do we need custom roles? | No for MVP; fixed RBAC role map | Future |
| ODB-014 | Exact incident deduplication policy? | Define in domain/API contracts; allow multiple anomaly events per incident | Phase 3.3 |
| ODB-015 | Work Order history table? | Start with status fields + AuditLog; add WorkOrderEvent if detailed timeline requirements demand it | Phase 3.3 |

## 4. Explicit Trade-offs

### One table vs event + readings

Selected proposal: event envelope plus readings. It adds a join and two inserts but improves event-level idempotency, multi-metric envelope handling, payload provenance, and normalized per-reading queries.

### One database vs separate time-series store

Selected proposal: Neon PostgreSQL initially. It reduces operational complexity and allows telemetry to join with operational metadata. The trade-off is that telemetry growth may later require partitioning, rollups, or a dedicated store.

### Application tenant filtering vs RLS

Selected proposal: application-level tenant scoping and relationship validation are mandatory. RLS is an additional defense-in-depth option after the Prisma/Neon pooled connection context has been proven.

### Prisma vs database-native features

Selected proposal: Prisma for the majority of schema and typed application access; reviewed SQL migrations for constraints/indexes/features not adequately expressed through Prisma. Maintain a test that detects schema drift.

## 5. Decisions Required to Close Phase 3.2

1. Accept or change the event-envelope + readings model.
2. Accept the global User + Membership model.
3. Accept organization-scoped fixed roles for MVP and decide if site grants are deferred.
4. Approve the ownership consistency constraints.
5. Agree that exact retention durations remain open until pilot needs are known.
6. Agree that partitioning and TimescaleDB are deferred until benchmark evidence exists.
7. Approve Prisma v7 + Neon adapter configuration strategy only after the exact installed versions are pinned in Phase 4.

## 6. Approval Record Template

```text
Decision ID:
Decision:
Status: Proposed / Approved / Rejected / Deferred
Approved by:
Date:
Reason / comments:
Follow-up ADR or implementation ticket:
```
