# ADR-0006: Version the Public REST API

**Status:** Proposed · **Date:** 2026-11-26 · **Owners:** Backend Lead / Product Engineering

## Context

Next.js and NestJS need a stable interface while product entities and persistence evolve. Exposing Prisma model shapes directly would couple clients to storage decisions and make schema evolution risky.

## Decision

Use `/api/v1` for public REST, explicit request/response DTOs, stable error codes, bounded cursor pagination for event/time-series data, and public DTOs separate from Prisma records.

## Consequences

Benefits: clear compatibility boundary, reviewable contracts, persistence independence. Costs: explicit DTO mapping and a breaking-change/deprecation policy. Additive optional fields are normally compatible; changing meaning/removing fields or changing enum semantics is breaking.

## Alternatives

- No version: simpler initially but breaks clients silently.
- Date/header-only version: less visible and harder to inspect while debugging.

## Validation

OpenAPI contract tests must verify controller responses against v1 schemas. Any breaking change requires a version/migration review.
