# ADR-0008: Use Transactional Outbox for Asynchronous Business Events

**Status:** Proposed · **Date:** 2026-11-26 · **Owner:** Backend Engineering

## Context

GridAware commits product data in PostgreSQL and dispatches asynchronous work through Redis/BullMQ. Publishing directly after database commit can lose the event if the process crashes between the two operations. Publishing before commit can enqueue work for a rolled-back record.

## Decision

Insert an OutboxEvent in the same PostgreSQL transaction as the business/telemetry mutation. A dispatcher publishes stable references to BullMQ and tracks delivery. Consumers use idempotent effects because dispatch can enqueue more than once.

## Consequences

Benefits: durable event intent, safer dual-write boundary, traceable retries. Costs: additional table/dispatcher, cleanup/retention, duplicate enqueue handling, and monitoring.

## Alternatives

- Direct publish after commit: simple but has a crash gap.
- Distributed transaction across PostgreSQL and Redis: unnecessary complexity for MVP.
- Poll domain tables: couples workers to table layout and obscures event intent.

## Validation

Crash-test before dispatch, after enqueue, and before marking published. Prove a repeated job produces one logical domain effect.
