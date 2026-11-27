# Frontend Locations UI & UX Contract (Phase 5.4)

**Feature**: `004-sites-buildings-management` | **Date**: 2026-11-27 | **API Contract**: [sites-buildings-openapi.yaml](./sites-buildings-openapi.yaml)

## 1. Navigation & Protected Routes

All Sites & Buildings routes live inside `OrganizationShell` (`client/components/authorization/organization-shell.tsx`) and inherit `AccessContextProvider`, automatic HttpOnly cookie + CSRF authentication via `apiRequest()`, and immediate tenant-state clearing on organization switch.

| Route | Screen | Required Capability | Primary Purpose |
|---|---|---|---|
| `/app/organizations/[organizationId]/sites` | **Sites Directory** | `sites:read` | Search, filter (`ACTIVE`/`INACTIVE`), sort (`createdAt`/`name`/`code`), paginate sites; toggle archived view (`sites:archive`); create site (`sites:create`) |
| `/app/organizations/[organizationId]/sites/[siteId]` | **Site Overview & Buildings** | `sites:read` (+ `buildings:read`) | Inspect site metadata, address, coordinates, site local time (IANA `timeZone`), and nested Buildings list; edit/activate/deactivate/archive/restore site (`sites:update` / `sites:archive`); create/manage buildings (`buildings:create` / `buildings:update` / `buildings:archive`) |
| `/app/organizations/[organizationId]/sites/[siteId]/buildings/[buildingId]` | **Building Overview** | `buildings:read` | Breadcrumb (`Sites / Site Name / Building Name`), building specs (type, `floorCount`, `grossAreaSqM` formatted with `m²`), edit/activate/deactivate/archive/restore building (`buildings:update` / `buildings:archive`) |

### Organization Navigation Update

Add `{ id: "sites", label: "Sites & Buildings", href: "/app/organizations/${organizationId}/sites", requiredPermissions: ["sites:read"] }` to `getVisibleOrgNavItems` in `client/lib/authorization/permissions.mjs`. Mark active whenever `pathname === item.href || pathname.startsWith(`${item.href}/`)`.

---

## 2. Role-Aware Capability Gating (Presentation Only)

| Control / Surface | Required Permission | Visible To | Notes |
|---|---|---|---|
| Sites & Buildings nav item, lists, detail views | `sites:read` / `buildings:read` | All 5 roles | `VIEWER`, `ENGINEER`, `TECHNICIAN` see clean read-only views |
| **New Site** button & dialog | `sites:create` | `OWNER`, `FACILITY_MANAGER` | Hidden from other roles; backend still enforces `403` |
| **Edit Site** / **Activate** / **Deactivate** | `sites:update` | `OWNER`, `FACILITY_MANAGER` | Disabled when site is archived (prompting restore first) |
| **Archive Site** / **Restore Site** / **Show Archived Sites** toggle | `sites:archive` | `OWNER`, `FACILITY_MANAGER` | Hidden from `ENGINEER`, `TECHNICIAN`, `VIEWER` (`FR-015`) |
| **Add Building** button & dialog | `buildings:create` | `OWNER`, `FACILITY_MANAGER` | Disabled with clear guidance when parent site is `INACTIVE` or archived (`FR-010`) |
| **Edit Building** / **Activate** / **Deactivate** | `buildings:update` | `OWNER`, `FACILITY_MANAGER` | Disabled when building is archived |
| **Archive Building** / **Restore Building** / **Show Archived Buildings** toggle | `buildings:archive` | `OWNER`, `FACILITY_MANAGER` | Restore dialog explains if parent site is archived or `INACTIVE` |

---

## 3. EVARAX Visual Craft & Domain Presentation Rules

1. **Operate Mode Discipline** (`DESIGN.md` & `/impeccable`): Dark-first EVARAX canvas (`--canvas #080808`), semantic surfaces (`--surface-1..3`), primary CTA `#F4E952` with `#080808` text, focus ring `#F6FA45`, zero raw HEX values in components.
2. **Typography Hierarchy**:
   - Site and Building **names** render as primary titles (`Geist Sans`).
   - Site and Building **codes** (`CAI-PLANT-01`, `PROD-HALL-01`), coordinates, floor counts, gross area (`4,200.00 m²`), and timestamps render in `Geist Mono` (`font-mono`) as technical identifiers—never replacing human titles.
3. **Status Semantics (Never Equipment Health)**:
   - Operational status badges pair an icon + explicit text label (`Active`, `Inactive`, `Archived`)—never color alone, never brand yellow.
   - Detail headers explicitly clarify that location status reflects administrative enablement and does not represent equipment or asset health.
4. **Time-Zone Presentation**:
   - Store and transmit UTC ISO 8601 timestamps; display the site's current local time formatted via `Intl.DateTimeFormat` using the site's configured IANA `timeZone` alongside the zone label (e.g., `Africa/Cairo`).
5. **Archive-Blocked Dependency Guidance**:
   - When `POST .../sites/:siteId/archive` returns `409 SITE_HAS_ACTIVE_BUILDINGS`, the archive dialog keeps focus safely, explains that non-archived buildings must be archived first (displaying the count), and provides a direct button/link scrolling to or navigating to the site's Buildings section.
6. **Required UI States (Constitution Principle VIII)**:
   - Loading skeletons (`aria-busy="true"`), empty states (with permission-gated primary CTA), inline field validation error summaries (`role="alert"`, `aria-describedby`), server conflict alerts, `403` `<PermissionDeniedState>`, and `404` non-disclosure not-found states.
7. **Tenant-Switch Clearing**:
   - All client panels key local state on `organizationId` (and reset lists/details immediately in `useEffect` cleanup when `organizationId` changes) so previous-tenant locations never flash during organization switching.
8. **Accessibility (WCAG 2.2 AA)**:
   - 100% keyboard-operable (`Tab`, `Enter`, `Space`, `Escape`), Radix `AlertDialog` focus management, unobscured focus rings, minimum 40px touch targets, and `prefers-reduced-motion` compliance.
