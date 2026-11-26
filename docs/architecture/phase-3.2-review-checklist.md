# Phase 3.2 — Database Design Review Checklist

**Status:** Proposed design; review required before implementation.

## Product baseline
- [x] Simulator-first MVP
- [x] B2B SaaS, multi-tenant
- [x] Factories and commercial buildings
- [x] NestJS + Neon PostgreSQL + Prisma
- [x] Python AI service boundary

## Review decisions
- [ ] Approve global User + Membership tenant access model
- [ ] Approve fixed organization roles for MVP
- [ ] Confirm organization-wide scope; defer site grants unless pilot requires
- [ ] Approve Event Envelope + Normalized Readings telemetry model
- [ ] Approve PostgreSQL-native telemetry for initial MVP
- [ ] Confirm retention durations before pilot
- [ ] Decide whether RLS is deferred or added after pooled-connection tests
- [ ] Confirm exact telemetry envelope supports one measurement per sensor per event

## Required technical review
- [ ] Validate same-tenant relationship constraints
- [ ] Review composite unique and foreign-key approach
- [ ] Review indexes against expected query plans
- [ ] Review incident/work-order state transitions
- [ ] Review raw payload privacy and retention
- [ ] Review Neon/Prisma connection setup against pinned package versions
- [ ] Review migration and rollback strategy

## Exit gate
Phase 3.2 is approved only when every blocking item above has an explicit decision or a named follow-up ticket with an agreed due phase. This checklist is not evidence of implementation.
