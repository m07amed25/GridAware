# Authentication and Authorization Contracts

**ID:** ARC-SEC-AUTH-001 · **Version:** 0.1 · **Status:** Proposed; exact auth transport remains an open decision

## 1. Identity model

- `User` is a global human identity.
- `Membership` links one User to one Organization and carries organization-scoped role/status.
- A User without an active Membership has no access to tenant-owned operational data.
- A User may be OWNER in one Organization and VIEWER in another.
- MVP fixed roles: `OWNER`, `ADMIN`, `FACILITY_MANAGER`, `ENGINEER`, `TECHNICIAN`, `VIEWER`.
- Custom roles and per-site membership policy are deferred unless pilot discovery requires them.

## 2. Human authentication contract

Every protected REST request resolves a current User identity. The API must not trust a role or organization ID held in browser state as authorization proof.

Proposed requirements:
- Short-lived access credential.
- Refresh/session rotation and revocation.
- Server-side check for disabled User and suspended Membership/Organization.
- HTTPS outside local development.
- Secure browser credential transport; never store long-lived secrets in localStorage.
- Rate-limit login, reset, invitation acceptance, and refresh endpoints.
- Do not log passwords, bearer tokens, session identifiers, or reset tokens.

**Open AUTH-01:** choose an implementation before Phase 4 auth coding: managed auth provider, opaque server session, or short-lived access JWT plus rotating refresh credential. Current REST docs use abstract `Authorization: Bearer` as a contract placeholder. If cookies are selected, define Secure, HttpOnly, SameSite, CSRF, domain scope, CORS, and local-development behavior. Prefer a maintained identity/auth library over custom cryptographic/session code.

## 3. Authorization evaluation order

For every human request:
1. Authenticate caller.
2. Check User active state.
3. Resolve requested Organization from path/resource.
4. Load active Membership for `(userId, organizationId)`.
5. Resolve permission from Membership role.
6. Load target resource within the tenant scope.
7. Verify parent-child owner consistency.
8. Verify assignment and lifecycle constraints.
9. Execute domain service transaction and record audit/history as required.

Never fetch a resource globally and depend on frontend hiding to protect it.

## 4. Permission catalog

| Permission family | Examples |
|---|---|
| Organization | `organization.read`, `organization.update` |
| Membership | `membership.read`, `membership.invite`, `membership.manage` |
| Sites/buildings | `site.read/create/update/archive`, `building.read/create/update/archive` |
| Assets | `asset.read/create/update/archive` |
| Devices | `device.read`, `device.provision`, `device.manage` |
| Sensors | `sensor.read/create/update/retire` |
| Thresholds | `threshold.read`, `threshold.manage` |
| Telemetry | `telemetry.read` |
| Simulation | `simulation.read`, `simulation.manage` |
| Intelligence | `anomaly.read/acknowledge/dismiss`, `prediction.read`, `risk.read`, `model.read` |
| Incidents | `incident.read/create/triage/assign/investigate/resolve/close/reopen` |
| Work orders | `work-order.read/create/assign/start/update/complete/cancel` |
| Maintenance | `maintenance.read/record/manage` |
| Analytics/audit | `analytics.read`, `audit.read` |

## 5. Proposed role policy

This is a starting policy for product review, not a compliance certification.

| Capability | OWNER | ADMIN | FACILITY_MANAGER | ENGINEER | TECHNICIAN | VIEWER |
|---|---:|---:|---:|---:|---:|---:|
| Organization settings | Full | Manage | Read | Read | No | Limited read |
| Memberships | Full | Manage | Read | No | No | No |
| Sites/buildings | Full | Manage | Manage | Read | Assigned scope | Read |
| Assets | Full | Manage | Manage | Technical update | Assigned asset read | Read |
| Devices/sensors | Full | Manage | Manage | Technical manage | Assigned read | Read |
| Thresholds | Full | Manage | Manage | Manage | Read | Read |
| Telemetry | Read | Read | Read | Read | Assigned asset | Read |
| Simulations | Manage | Manage | Manage | Manage | No | Read |
| Anomalies/risk | Read | Read | Read | Read/acknowledge | Related only | Read |
| Incidents | Full | Manage | Manage | Triage/investigate | Notes on assigned work | Read |
| Work orders | Full | Manage | Manage | Create/assign | Execute assigned | Read |
| Analytics | Full | Read | Read | Technical views | Assigned only | Read |
| Audit logs | Read | Read | Limited | No | No | No |

Rules:
- OWNER remains protected from accidental deletion/demotion if they are the last active owner.
- ADMIN must not transfer ownership or change billing/security-sensitive settings unless explicitly authorized.
- FACILITY_MANAGER manages site operations but not tenant ownership.
- ENGINEER handles technical investigation and approved sensor/threshold configuration.
- TECHNICIAN can act on assigned WorkOrders and access only the minimum asset/telemetry information required for that work. The precise site scoping approach is an open decision; enforce assignment-level checks in MVP.
- VIEWER is read-only.

## 6. Resource authorization

Role check is not enough. Check Organization membership, resource ownership, Site/Building/Asset consistency, assignment status, and current workflow state. Technician completion must require assignment or an explicit supervisor delegation. A parent ID from the payload must be queried under the current tenant scope.

## 7. Device authentication

Devices are not Users and do not use Membership roles.
- Provision each logical simulator/physical device identity in Device registry.
- Bind credentials to exactly one Device and allowed Organization/Site/topic scope.
- Credentials must be revocable and non-reusable after revocation.
- Reveal provisioning secret only once; never return it from GET endpoints or logs.
- Broker ACL is derived from credential identity and limits publishing to exact topics.
- Payload IDs are checked against the authenticated Device record.
- Simulator and future physical-device credentials must be distinguishable.

## 8. WebSocket authorization

At connection: authenticate identity. At subscription: resolve Site/Organization, verify Membership and permission, then join a server-generated room. Never treat a client-supplied room name as authorization. On logout, session revocation, Membership suspension, or Organization suspension, close/re-authorize active connections.

## 9. Audit requirements

Audit: login security events (without secrets), Membership/role changes, device provision/revoke, threshold changes, simulation controls, Incident transitions/assignment, WorkOrder assignment/completion/cancel, exports, and sensitive settings. Each record includes actor/system identity, Organization, action, target type/ID, timestamp, request/correlation ID, and safe metadata.

## 10. Authorization contract tests

- Org A user cannot read Org B resources by changing any URL/body ID.
- Same User gets different permissions in each Organization.
- Suspended Membership loses API and WebSocket access.
- Technician cannot mutate unassigned WorkOrder unless delegated.
- Device A cannot publish to Org B or Device B topic.
- Payload cannot relabel simulator data as physical data.
- Revoked credentials are rejected.
- Viewer cannot mutate operations.
