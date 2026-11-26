# ADR-0004: Organization-Scoped Tenant Ownership and Isolation

- **Status:** Proposed for approval
- **Date:** 2026-11-26
- **Decision owner:** GridAware engineering
- **Related:** PRD v1.0; Phase 3.1; `multi-tenancy-data-model.md`

## Context

GridAware is a multi-tenant B2B SaaS platform. Organizations share application infrastructure, but sites, buildings, assets, sensors, telemetry, incidents, and maintenance records must be isolated. A global User may participate in multiple Organizations under different roles.

## Decision

Use a global `User` entity and an organization-scoped `Membership` entity. Every tenant-owned business record carries `organizationId`. All API, worker, WebSocket, MQTT, cache, export, and background-job access must validate organization ownership and authorization.

Use a fixed role enum on Membership for the MVP. The proposed initial scope is organization-wide role access; technician operations remain assignment-limited. Site-specific grants are deferred unless a pilot requirement makes them necessary.

Use service-layer tenant scoping as mandatory enforcement. Add composite foreign keys/unique constraints for critical same-tenant relationships where practical. Evaluate PostgreSQL RLS as defense-in-depth only after Neon pooling and transaction-local context are validated.

## Alternatives Considered

### Separate database per Organization

Rejected for MVP due to provisioning, migration, connection, and operational complexity. Revisit if enterprise isolation or residency requirements justify it.

### Schema per Organization

Rejected for MVP due to migration and connection complexity and weaker fit for self-service SaaS onboarding.

### Shared tables without organizationId on child records

Rejected because ownership filtering becomes harder to audit and cross-tenant joins are easier to implement incorrectly.

### RLS as the only tenant control

Rejected because application authorization is still required, and request context over pooled connections must be proven not to leak.

## Consequences

Positive:
- Supports users in multiple organizations.
- Provides a consistent tenant filter for queries and jobs.
- Simplifies shared SaaS operations.
- Enables automated tenant-isolation testing.

Negative:
- Every query and write must be tenant-aware.
- Composite keys/constraints add schema complexity.
- Cache keys, exports, and background jobs also require tenant context.
- Site-level scope may need a later model extension.

## Guardrails

- Never trust organizationId from client payload as authorization.
- All tenant-owned queries include organizationId.
- Test cross-tenant reads/writes for every resource domain.
- Validate referenced Site/Asset/Sensor belongs to the same tenant.
- Include tenant context in background jobs and revalidate against the referenced record.
- Do not use shared Device credentials across tenants.

## Review Triggers

Revisit when a customer requires site-level access segmentation, database-per-tenant isolation, regulatory data residency, or a formal RLS control requirement.
