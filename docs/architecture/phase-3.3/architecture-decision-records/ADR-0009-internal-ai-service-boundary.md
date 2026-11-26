# ADR-0009: Keep Python AI as an Internal Inference Boundary

**Status:** Proposed · **Date:** 2026-11-26 · **Owners:** AI Engineering / Backend Engineering

## Context

NestJS owns product workflows while Python is the natural runtime for ML training/inference. Letting both services write the same product tables creates duplicated business ownership and weakens authorization boundaries.

## Decision

NestJS owns tenant scope, product API authorization, and persistence of Anomaly/Prediction/RiskAssessment records. Python exposes private versioned inference endpoints and returns structured results, model versions, feature schema versions, and provenance. Python does not expose browser-facing APIs or write product tables directly.

## Consequences

Benefits: clear ownership, independent model runtime, centralized tenant authorization, AI outage isolation from telemetry acceptance. Costs: input data must be transferred/prepared, schemas/version compatibility need maintenance, and internal service authentication is required.

## Alternatives

- Embed Python into NestJS runtime: poor language/runtime boundary.
- Give Python direct DB write permission: rejected due to duplicated data ownership and authorization.
- Browser calls Python directly: rejected because it bypasses NestJS product policy.

## Validation

Test internal auth, unsupported feature schema, insufficient data, timeout, model readiness, result traceability, and AI failure isolation.
