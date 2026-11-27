# Frontend Authorization & Role-Aware UI Contract (Phase 5.3)

**Feature**: `003-rbac-permission-management` | **Date**: 2026-11-27 | **API Contract**: [rbac-openapi.yaml](./rbac-openapi.yaml)

## 1. Security Boundary Principle

Frontend permission checks are **strictly for presentation and user experience**. Every protected API endpoint, WebSocket subscription, export, and background job enforces its own authorization server-side. Client-held capability lists MUST NEVER be persisted in `localStorage`/`sessionStorage` or sent back to the server as authority.

---

## 2. Capability Data Flow & Refresh Lifecycle

### 2.1 Capability Fetch

- On entering an organization-scoped route (`/app/organizations/[organizationId]/...`) or selecting an active organization, the client calls `GET /api/v1/organizations/{organizationId}/access-context` via `apiRequest()` (`client/lib/auth/client.ts`), which inherits HttpOnly cookie authentication (`ga_access`) and Web Locks `/auth/refresh` serialization.
- Response payload:
  ```ts
  export interface OrganizationAccessContext {
    organizationId: string;
    membershipId: string;
    role: 'OWNER' | 'FACILITY_MANAGER' | 'ENGINEER' | 'TECHNICIAN' | 'VIEWER';
    permissions: readonly string[];
    policyVersion: string;
  }
  ```
- Convert `permissions` into an immutable `ReadonlySet<string>` inside `AccessContextProvider` for O(1) presentation checks.

### 2.2 Pure Capability Helpers (`client/lib/authorization/permissions.mjs`)

- `can(permissions: ReadonlySet<string>, required: string): boolean`
- `canAll(permissions: ReadonlySet<string>, required: readonly string[]): boolean`
- `canAny(permissions: ReadonlySet<string>, candidates: readonly string[]): boolean` (used only for navigation group visibility, e.g., showing Administration group if any admin permission is present)
- `isReadOnlyRole(role: MembershipRole): boolean` (`role === 'VIEWER'`)

### 2.3 Mandatory Capability Refresh & Stale-Tenant Clearing Triggers

`AccessContextProvider` MUST immediately clear prior-tenant capability state and re-fetch `access-context` whenever:
1. The active `organizationId` changes via `OrganizationSwitcher` or URL navigation.
2. `BroadcastChannel('gridaware:auth')` receives `SESSION_REFRESHED` (and clears all capability state on `SESSION_INVALIDATED`).
3. `BroadcastChannel('gridaware:org')` receives `MEMBERSHIP_CHANGED` (emitted after role update, suspension, removal, or ownership transfer).
4. Any organization-scoped API mutation returns `403 FORBIDDEN` or `404 RESOURCE_NOT_FOUND` (triggering a fresh capability sync so revoked permissions disappear immediately).

If the user switches into an organization where their current route requires a permission absent from the new organization's capability set (for example, switching from `OWNER` in Org A on `/members` to `TECHNICIAN` in Org B), the UI clears previous-tenant state immediately and navigates to the safe organization landing route or renders `<PermissionDeniedState>`.

---

## 3. Role-Aware Navigation & Action Visibility

| UI Surface / Action | Required Permission(s) | Visible To | Notes |
|---|---|---|---|
| **Administration → Members** | `members:read` | `OWNER` | Hidden from non-owners; direct URL access renders `<PermissionDeniedState>` when backend returns `403` |
| **Invite Member / Revoke Invitation** | `members:invite` / `members:revoke-invitation` | `OWNER` | Role dropdown excludes `OWNER` |
| **Update Member Role** | `members:update-role` | `OWNER` | Disabled on self and on `OWNER` rows with accessible tooltip explaining ownership transfer |
| **Suspend / Reactivate / Remove Member** | `members:suspend` / `members:remove` | `OWNER` | Uses Radix `AlertDialog` confirmation; surfaces `409` last-owner conflict cleanly |
| **Transfer Ownership** | `role === 'OWNER'` | `OWNER` | Dedicated explicit-confirmation Radix `AlertDialog` requiring target selection + confirmation checkbox |
| **Organization Settings Edit** | `organization:update` | `OWNER` | Non-owners see read-only overview |
| **Audit Log** | `audit-logs:read` | `OWNER` | Hidden from non-owners |
| **Create / Edit / Archive Site or Building** | `sites:create` / `sites:update` / `sites:archive` | `OWNER`, `FACILITY_MANAGER` | Hidden from `ENGINEER`, `TECHNICIAN`, `VIEWER` |
| **Create / Edit Asset or Sensor; Manage Thresholds** | `assets:create`, `sensors:create`, `thresholds:manage` | `OWNER`, `FACILITY_MANAGER`, `ENGINEER` | Archive actions hidden from `ENGINEER` (`assets:archive`, `sensors:archive`) |
| **Work Orders (All vs My Work)** | `work-orders:read` vs `work-orders:read-assigned` | All (`TECHNICIAN` sees assigned-work view) | `TECHNICIAN` never sees assign/reassign controls |
| **Viewer Read-Only State** | `role === 'VIEWER'` | `VIEWER` | Displays explicit non-color-only `Read-only` badge (icon + text); zero enabled mutation controls |
| **Export Telemetry / Analytics** | `telemetry:export`, `analytics:export` | `OWNER`, `FACILITY_MANAGER` | Hidden from `ENGINEER`, `TECHNICIAN`, `VIEWER` |

---

## 4. Protected Routes & Screens Added in Phase 5.3

| Route | Purpose | Required Access | States |
|---|---|---|---|
| `/app/organizations/[organizationId]` | Organization workspace overview showing active organization badge, current role badge, effective capability summary (diagnostics/role overview), and role-aware navigation | Active membership (`access-context`) | Loading skeleton, active overview, Viewer read-only banner, 404 inaccessible org state |
| `/app/organizations/[organizationId]/members` | Owner-only Organization Members roster with role updates, suspend/reactivate, soft removal, and dedicated Ownership Transfer dialog | `members:read` (`OWNER`) | Loading skeleton, populated table + narrow-screen card reflow, empty filter state, `403` `<PermissionDeniedState>`, `404` non-disclosure state, `409` conflict alert |

---

## 5. EVARAX Visual Fidelity & WCAG 2.2 AA Requirements

- All role badges (`Owner`, `Facility Manager`, `Engineer`, `Technician`, `Viewer`), membership status badges (`Active`, `Suspended`, `Removed`), and `<PermissionDeniedState>` banners MUST pair icons + clear text labels (never color alone).
- Exact EVARAX palette tokens (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`) and derived dark surfaces from `client/app/globals.css` MUST be used consistently; semantic destructive/warning/success states remain distinct from brand accents.
- Every member management control (role selector, suspend/reactivate/remove confirmation dialog, ownership-transfer dialog, organization switcher) MUST be 100% keyboard-operable (`Tab`, `Enter`, `Space`, `Escape`) with unobscured focus rings and proper ARIA roles (`role="alert"`, `aria-live="polite"`, `aria-describedby`).
- Permission-denied and non-disclosure `404` screens MUST NEVER reveal whether a foreign organization ID or foreign membership/resource ID exists.
