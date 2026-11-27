# GridAware — Phase 3.3 API, Events & Integration Contracts

**Version:** 0.1 · **Status:** Draft for technical review · **Date:** 2026-11-26

This cumulative package contains GridAware Phase 3.1 (System Context/C4), Phase 3.2 (Domain Model/Database), and Phase 3.3 (API, Events, and Integration Contracts), plus machine-readable starter contracts.

## Product and technology baseline

- Multi-tenant B2B SaaS for factories and commercial buildings.
- Simulator-first MVP, first vertical slice is one simulated generator.
- Next.js + TypeScript frontend.
- NestJS modular monolith backend.
- Neon PostgreSQL + Prisma ORM.
- MQTT (Mosquitto candidate), Redis + BullMQ (proposed).
- Internal Python AI service boundary; advanced models deferred until validated.
- Monitoring/decision support only; no control commands to physical equipment.

## Folder map

```text
docs/
├── architecture/
│   ├── README.md
│   ├── Phase 3.1 context/C4 documents
│   ├── Phase 3.2 domain/database documents
│   └── phase-3.3/                 # API/events/integration contracts
└── contracts/
    ├── README.md
    ├── openapi.yaml
    ├── asyncapi.yaml
    └── schemas/
```

## Implementation status

- **Phase 5.1 — Authentication & Identity**: Implemented in `server/` and `client/` (Argon2id passphrases, HttpOnly JWT + rotating refresh sessions, CSRF double-submit, email verification, password reset, active session management).
- **Phase 5.2 & 5.3 — Organizations, Memberships & RBAC**: Implemented (`@OrgProtected()` 4-stage pipeline, 5-role capability matrix, member administration, ownership transfer, invitations, access-context endpoints & UI).
- **Phase 5.4 — Sites & Buildings Management**: Implemented end-to-end (`Organization -> Site -> Building` Prisma schema with composite tenant-safe FK and 6 PostgreSQL `CHECK` constraints, 16 REST endpoints under `/api/v1/organizations/:organizationId/sites`, tenant-safe keyset cursor pagination, non-destructive archive/restore lifecycle with parent-child dependency protection, 12 atomic `AuditLog` events, ADRs `ADR-0010`–`ADR-0012`, and EVARAX WCAG 2.2 AA management screens in `client/`).

Start at [`docs/architecture/README.md`](docs/architecture/README.md), then review [`docs/architecture/phase-3.3/README.md`](docs/architecture/phase-3.3/README.md).
