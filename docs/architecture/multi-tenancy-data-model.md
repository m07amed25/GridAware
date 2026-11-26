# GridAware — Multi-Tenancy Data Model and Isolation Strategy

**Document ID:** ARC-DB-TENANT-001  
**Version:** 0.1  
**Status:** Proposed baseline; security-critical and requires review before implementation

---

## 1. Purpose and Threat Model

GridAware is a B2B SaaS application. Different customer organizations share the application and initial Neon PostgreSQL database, but customer operational data must remain isolated.

The primary threat addressed here is Broken Object Level Authorization / cross-tenant data exposure: a user from Organization A changes a record ID, query parameter, request body, or WebSocket subscription and obtains or modifies Organization B's data.

The design also addresses accidental cross-tenant links created by a backend bug—for example, an Asset owned by one organization being attached to another organization's Site.

## 2. Tenant Identity Model

### Global identity

`User` represents a human identity and is global. Email uniqueness is global according to the selected authentication policy.

### Tenant membership

`Membership` connects `User` and `Organization` and contains role/status. A User may have zero, one, or many memberships.

A user is authorized for an organization only when:
- The user is authenticated.
- A Membership exists for that user and organization.
- Membership status is ACTIVE.
- The requested action is allowed by the membership role/permission policy.
- The target resource belongs to that organization.

### Organization selection

The frontend may let a user select an organization. The selected organization ID may be sent in a route, header, or request context, but it is only a selector—not proof of authorization.

The backend must resolve the selected organization against the authenticated user's active memberships on every request or trusted request context. Never trust a client-supplied `organizationId` as the source of tenant authority.

## 3. Tenant-Owned Tables

The following records are tenant-owned and must carry `organizationId` directly or be reachable through an explicitly documented tenant-owned parent:

- Membership, Invitation.
- Site, Building, Asset.
- Device, Sensor, SensorThreshold.
- SimulationRun.
- TelemetryEvent, TelemetryReading.
- AnomalyEvent, Prediction, RiskAssessment.
- Incident, IncidentEvent.
- WorkOrder, MaintenanceSchedule, MaintenanceRecord.
- Notification, AuditLog (where tenant-specific), OutboxEvent.

Global reference data such as MetricDefinition and AssetType may be shared platform catalogs. They must not contain customer-specific operational data.

## 4. Required Query Pattern

Every tenant-scoped read or write must include organization scope in the database query. Prefer domain-specific services/repositories that require an `OrganizationContext` argument rather than relying on every caller to remember a filter.

Conceptual example:

```ts
// Organization context must be resolved from the authenticated request.
const asset = await prisma.asset.findFirst({
  where: {
    id: assetId,
    organizationId: context.organizationId,
    archivedAt: null,
  },
});
```

Avoid:

```ts
// Unsafe: looks up an asset globally and may expose another tenant's record.
const asset = await prisma.asset.findUnique({
  where: { id: assetId },
});
```

Even if UUIDs are difficult to guess, unscoped queries are not safe.

## 5. Write Path Requirements

For create/update operations:

1. Resolve authenticated User.
2. Resolve active Membership for selected Organization.
3. Check role/permission for the action.
4. Derive organizationId from trusted server context; do not trust it from the body.
5. Validate that referenced Site/Building/Asset/Device/Sensor belongs to the same tenant and valid parent scope.
6. Perform related changes transactionally where necessary.
7. Write audit/outbox history when the action requires it.
8. Return only fields the user is allowed to see.

Use DTO validation to reject unexpected ownership fields in client input where practical. Do not allow clients to set `organizationId`, `createdByUserId`, or security-sensitive statuses arbitrarily.

## 6. Cross-Tenant Referential Integrity

Application-level checks are mandatory but are not sufficient by themselves to protect against every programming mistake.

The database design should add composite unique keys and composite foreign keys for critical relationships where Prisma and PostgreSQL support the chosen mapping. For example, a tenant-owned Building can expose a unique key on `(organizationId, siteId, id)`, and an Asset can reference the same tuple for its optional Building relationship.

Where overlapping composite relations become awkward in Prisma, use carefully reviewed SQL migrations to add constraints that Prisma's schema representation cannot fully express. Document such constraints and add migration tests so later `db pull` or schema edits do not silently remove them.

At minimum, verify tenant consistency for:
- Asset ↔ Site / Building.
- Device ↔ Site.
- Sensor ↔ Asset / Device.
- TelemetryEvent ↔ Device / SimulationRun.
- TelemetryReading ↔ Event / Sensor / Asset.
- Incident ↔ Asset / source Anomaly.
- WorkOrder ↔ Asset / Incident.
- Assigned users ↔ active organization Membership.

## 7. Role-Based Access Control

The first MVP should use a fixed organization role enum and a centralized permission map. Do not create a custom policy editor before the product has validated role needs.

| Capability | Owner | Admin | Facility Manager | Engineer | Technician | Viewer |
|---|---:|---:|---:|---:|---:|---:|
| Read organization overview | ✓ | ✓ | ✓ | ✓ | scoped | ✓ |
| Manage organization settings | ✓ | ✓ | — | — | — | — |
| Manage members/roles | ✓ | ✓ | — | — | — | — |
| Manage sites/buildings | ✓ | ✓ | ✓ | read | read | read |
| Register/manage assets | ✓ | ✓ | ✓ | ✓ (policy) | read | read |
| Configure sensors/thresholds | ✓ | ✓ | ✓ | ✓ | — | read |
| View telemetry | ✓ | ✓ | ✓ | ✓ | assigned/scoped | ✓ |
| Acknowledge/triage incidents | ✓ | ✓ | ✓ | ✓ | assigned/scoped | — |
| Assign work orders | ✓ | ✓ | ✓ | ✓ (policy) | — | — |
| Execute assigned work orders | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Close incidents | ✓ | ✓ | ✓ | ✓ (policy) | submit findings | — |
| Read analytics | ✓ | ✓ | ✓ | ✓ | limited | ✓ |

This table is a product policy baseline, not a substitute for endpoint-level permission definitions. The final permission matrix is to be reconciled with the PRD roles and user stories in Phase 3.3.

### Site-level scope

The current recommendation is **organization-wide role scope for the first MVP**, with assignment-based restrictions for Technician actions (for example, a technician can only execute assigned Work Orders). If a pilot customer requires different users to see only selected Sites, add a `MembershipSiteGrant` model or equivalent before that pilot. Do not add ambiguous scope semantics silently.

## 8. PostgreSQL Row-Level Security (RLS)

RLS may provide defense-in-depth, but it should not be represented as the primary tenant isolation mechanism until the runtime connection and transaction-context strategy has been tested with Neon pooling and Prisma.

Potential RLS design:
- Use policies on tenant-owned tables.
- Set organization context transaction-locally, not as a connection-global value that can leak across pooled connections.
- Ensure all statements execute within the intended transaction/context.
- Test pooled connections for context reset and leakage.
- Keep application-level authorization and tenant filters even when RLS is enabled.

Do not enable RLS with a policy that assumes a session variable is always set unless the application guarantees and tests that behavior. Migration/admin connections also need deliberate policy handling.

## 9. WebSocket and MQTT Tenant Isolation

### WebSocket

A WebSocket subscription to a Site or Organization must be authorized when the connection/subscription is established and revalidated when relevant membership or permission changes occur. Never accept a room name from the browser without checking ownership.

### MQTT

A simulator/device credential must be mapped server-side to an Organization, Site, Device, and permitted topic namespace. A payload's claimed organizationId, siteId, assetId, or sensorId is data to validate, not authority.

Broker ACLs must restrict publish/subscribe topics per credential. A shared global simulator credential is not acceptable for tenant-isolation testing.

## 10. Tenant Isolation Test Matrix

| Test | Expected result |
|---|---|
| Org A user requests Org B Asset ID | Not found or forbidden; no data returned |
| Org A user submits Org B siteId during Asset creation | Rejected |
| Org A Device publishes to Org B topic | Broker rejects publication |
| Org A Device claims Org B Sensor ID in payload | Ingestion rejects/quarantines message |
| Org A user subscribes to Org B Site WebSocket room | Subscription rejected |
| Membership is suspended during active session | Subsequent requests/subscriptions denied according to revocation policy |
| Technician tries to update unassigned Work Order | Forbidden |
| User changes organization selector to an unjoined organization | No tenant context is created |
| Background job contains wrong organizationId | Worker validates aggregate ownership and fails safely |
| Export endpoint omits tenant filter | Automated test must fail; export never returns cross-tenant rows |

## 11. Operational Requirements

- Tenant context must be included in structured logs as a non-sensitive identifier where needed.
- Audit tenant-configuration changes.
- Do not put sensitive tenant payloads in logs or traces.
- Include organizationId in job payloads, then validate it against the aggregate before processing.
- Ensure cache keys include organizationId.
- Ensure idempotency keys and deduplication scopes include tenant/device where appropriate.
- Ensure search indexes and export jobs are tenant-scoped.

## 12. Approval Gate

Before implementation, approve:
1. Organization-scoped role strategy.
2. Whether site-level membership grants are MVP or deferred.
3. Composite tenant consistency constraints.
4. Whether RLS is deferred or implemented as defense-in-depth in the first release.
5. WebSocket/MQTT authorization ownership and test coverage.
