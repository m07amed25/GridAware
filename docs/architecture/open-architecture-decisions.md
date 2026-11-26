# GridAware — Open Architecture Decisions

**Document ID:** ARC-OPEN-001  
**Version:** 0.1  
**Status:** Active decision register

---

## 1. Purpose

This register prevents assumptions from quietly becoming implementation decisions. The C4 diagrams describe a proposed baseline, but several choices need an explicit decision before implementation or production.

Each item includes when it must be resolved. Not every open decision blocks Phase 3.1.

## 2. Decision Status

- **Open:** No final decision has been made.
- **Proposed:** A recommended direction exists but awaits approval.
- **Deferred:** Intentionally postponed until a later phase.
- **Approved:** Decision recorded in an ADR and accepted.

## 3. Decision Register

| ID | Decision | Current status | Needed by | Recommendation / note |
|---|---|---|---|---|
| ARCH-001 | API and worker deployment model | Proposed | Phase 3.3 / Phase 4 | Same NestJS codebase, separate API and worker runtime processes |
| ARCH-002 | Authentication/session strategy | Open | Phase 3.3 / Phase 4 | Choose secure cookie/session or access/refresh-token pattern after frontend deployment and domain topology are known |
| ARCH-003 | Native auth implementation/provider | Open | Phase 4 | No external IdP required for initial MVP; select a maintained implementation and review security implications |
| ARCH-004 | Organization context transport | Proposed | Phase 3.3 | Explicit selected organization context; server must validate membership on every request |
| ARCH-005 | Site-level permission granularity | Open | Phase 3.3 | Decide whether first MVP uses organization-wide roles only or includes site assignments |
| ARCH-006 | Database tenant enforcement | Proposed | Phase 3.2 / Phase 3.3 | Mandatory service-layer tenant scoping; evaluate PostgreSQL RLS as defense-in-depth after Prisma/runtime design review |
| ARCH-007 | Neon connection strategy | Proposed | Phase 4 | Use pooled runtime connection where suitable and direct connection for migrations/CLI, following the exact selected Prisma/Neon version guidance |
| ARCH-008 | Telemetry relational model | Open | Phase 3.2 | Decide event envelope table plus per-metric readings or another model; benchmark query shapes |
| ARCH-009 | Telemetry retention and archival | Open | Before pilot | Define retention by tenant/product needs and storage cost; include deletion/export obligations |
| ARCH-010 | PostgreSQL partitioning/time-series extension | Deferred | After telemetry benchmark | Start with PostgreSQL-native design; evaluate partitioning/extension only with measured evidence and hosting compatibility |
| ARCH-011 | MQTT QoS and session behavior | Open | Phase 3.3 / Phase 4 | Define delivery guarantees and persistence behavior; verify broker/client acknowledgement semantics in tests |
| ARCH-012 | Device authentication method | Open | Phase 3.3 / Phase 4 | Unique per-device credentials or certificates; avoid shared credentials |
| ARCH-013 | MQTT topic ACL provisioning | Proposed | Phase 3.3 | Broker ACL must map each credential to allowed topic(s); topic strings alone are not identity |
| ARCH-014 | Device credential rotation/revocation | Open | Before production | Define lifecycle and emergency revocation process |
| ARCH-015 | Transactional outbox implementation | Proposed | Phase 3.3 | Use outbox for durable DB-to-queue dispatch where a committed write must trigger async processing |
| ARCH-016 | Redis hosting and topology | Open | Phase 4 / production | Docker Compose locally; choose managed/self-hosted production option based on availability and operations capability |
| ARCH-017 | Real-time transport and fan-out | Proposed | Phase 3.3 | NestJS WebSocket gateway with authorized subscriptions; Redis Pub/Sub or equivalent for cross-process fan-out |
| ARCH-018 | AI service invocation pattern | Proposed | Before Phase 8 | Queue-based/asynchronous inference for heavier tasks; internal HTTP for bounded low-latency operations if justified |
| ARCH-019 | Model artifact and registry location | Open | Phase 8 | Compare MLflow/object storage/database metadata; do not store large model binaries in transactional tables |
| ARCH-020 | Notification provider | Open | Before outbound notification release | Keep in-app notifications independent; choose email/SMS provider later |
| ARCH-021 | Hosting provider and regions | Open | Phase 4 / staging | Keep deployment containerized; select providers after evaluating latency, cost, reliability, and data residency |
| ARCH-022 | Simulator hosting posture | Open | Phase 4 / demo pilot | Local CLI for development; decide whether demo tenants can start/stop hosted simulator scenarios in shared SaaS |
| ARCH-023 | Observability stack/provider | Open | Phase 4 | Standardize structured logs, metrics, traces, correlation IDs; provider can be selected later |
| ARCH-024 | File/object storage | Deferred | Before attachments/reports | Not needed for first telemetry vertical slice; choose object storage when incident attachments or exports are introduced |
| ARCH-025 | Multi-language and localization | Deferred | Before localization release | English-first UI; keep terminology and date/number formatting localization-ready |
| ARCH-026 | Subscription, usage metering, billing | Deferred | Commercial SaaS planning | Not an MVP runtime dependency; define tenant quotas before public scale |
| ARCH-027 | Disaster recovery objectives | Open | Before production | Define RPO/RTO based on customer impact and provider capabilities, then verify restore procedures |
| ARCH-028 | Production simulator data policy | Open | Before public demo/pilot | All simulated assets/data must be visibly labeled and isolated from real-device data namespaces |

## 4. Blocking vs Non-Blocking Decisions

### 4.1 Must decide before database design (Phase 3.2)

- ARCH-006 — Tenant enforcement strategy.
- ARCH-008 — Telemetry storage model.
- ARCH-009 — Initial retention assumptions.
- ARCH-015 — Outbox and durable asynchronous handoff requirements.

The database ERD must make ownership and telemetry access patterns explicit.

### 4.2 Must decide before API/backend implementation (Phase 3.3 / Phase 4)

- ARCH-002 / ARCH-003 — Authentication/session implementation.
- ARCH-004 — Organization context handling.
- ARCH-005 — Site-level permission granularity.
- ARCH-007 — Neon and Prisma runtime/migration connection configuration.
- ARCH-011 / ARCH-012 / ARCH-013 — MQTT QoS, device credentials, and ACLs.
- ARCH-016 — Redis local and hosted arrangement.
- ARCH-017 — WebSocket fan-out.

### 4.3 Must decide before production pilot

- ARCH-014 — Device credential rotation/revocation.
- ARCH-020 — External notifications if promised to users.
- ARCH-021 — Hosting and regions.
- ARCH-022 / ARCH-028 — Simulator hosting and simulated-data policy.
- ARCH-023 — Observability backend.
- ARCH-027 — Recovery objectives and tested restore process.

## 5. Decision-Management Rules

1. Every material architecture choice should be recorded as an ADR.
2. ADRs should state context, decision, status, alternatives, consequences, and review triggers.
3. Update diagrams and affected docs when a decision changes.
4. Do not mark a decision approved just because it appears in a draft diagram.
5. Do not introduce a new infrastructure service without explaining which requirement it satisfies.
6. Prefer the simplest implementation that meets measured MVP needs.
