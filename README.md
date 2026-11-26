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

## Status note

These are design documents and starter contract files, not implemented services. Open decisions remain clearly recorded. Approve transport/security decisions and validate machine-readable contracts before implementing public APIs or provisioning production device credentials.

Start at [`docs/architecture/README.md`](docs/architecture/README.md), then review [`docs/architecture/phase-3.3/README.md`](docs/architecture/phase-3.3/README.md).
