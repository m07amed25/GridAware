# Phase 3.3 Review Gate

## Required approvals before public/integration implementation

1. [ ] REST endpoint catalog and permission requirements reviewed.
2. [ ] Browser authentication strategy selected and final ADR recorded.
3. [ ] Organization role matrix approved.
4. [ ] MQTT topic hierarchy, QoS, broker persistence, and subscriber redelivery tested.
5. [ ] Telemetry schema validated against simulator fixtures.
6. [ ] WebSocket transport selected.
7. [ ] Outbox schema/dispatcher and BullMQ job identity approved.
8. [ ] Python service authentication/private networking selected.
9. [ ] OpenAPI, AsyncAPI, and JSON Schemas validated in CI.
10. [ ] Contract tests cover tenant isolation, duplicates, state transitions, stale data, and downstream outages.

## Work that can begin in Phase 4 before every decision closes

- Monorepo/repository setup.
- TypeScript lint, type-check, test, and build pipelines.
- NestJS bootstrap, config validation, structured logging, and health checks.
- Prisma configuration spike and Neon connectivity test without final production schema lock.
- Docker local Redis/Mosquitto setup.
- Shared DTO/schema validation harness.

Do not expose public auth, production device credentials, or external MQTT topics until the respective open decisions have been approved.
