/**
 * Presentation-only permission helpers for GridAware UI visibility.
 * Backend authorization remains the sole security enforcement boundary.
 */

export const ASSIGNABLE_NON_OWNER_ROLES = Object.freeze([
  "FACILITY_MANAGER",
  "ENGINEER",
  "TECHNICIAN",
  "VIEWER",
]);

export const ROLE_LABELS = Object.freeze({
  OWNER: "Owner",
  FACILITY_MANAGER: "Facility Manager",
  ENGINEER: "Engineer",
  TECHNICIAN: "Technician",
  VIEWER: "Viewer",
});

/**
 * Checks whether a single permission is present in the server-provided capability set.
 * @param {ReadonlySet<string>} permissions
 * @param {string} required
 * @returns {boolean}
 */
export function can(permissions, required) {
  if (!(permissions instanceof Set) || typeof required !== "string") {
    return false;
  }
  return permissions.has(required);
}

/**
 * Checks whether ALL listed permissions are present (AND semantics).
 * @param {ReadonlySet<string>} permissions
 * @param {readonly string[]} required
 * @returns {boolean}
 */
export function canAll(permissions, required) {
  if (
    !(permissions instanceof Set) ||
    !Array.isArray(required) ||
    required.length === 0
  ) {
    return false;
  }
  return required.every((perm) => permissions.has(perm));
}

/**
 * Checks whether ANY listed permission is present (used strictly for navigation
 * section visibility, never for backend enforcement).
 * @param {ReadonlySet<string>} permissions
 * @param {readonly string[]} candidates
 * @returns {boolean}
 */
export function canAny(permissions, candidates) {
  if (
    !(permissions instanceof Set) ||
    !Array.isArray(candidates) ||
    candidates.length === 0
  ) {
    return false;
  }
  return candidates.some((perm) => permissions.has(perm));
}

/**
 * Identifies the strictly read-only Viewer role for explicit read-only UX states.
 * @param {string | null | undefined} role
 * @returns {boolean}
 */
export function isReadOnlyRole(role) {
  return role === "VIEWER";
}

/**
 * Filters organization-scoped navigation destinations based on server-provided capabilities.
 * @param {string} organizationId
 * @param {ReadonlySet<string>} permissions
 * @returns {Array<{ id: string; label: string; href: string; requiredPermissions: string[] }>}
 */
export function getVisibleOrgNavItems(organizationId, permissions) {
  const catalog = [
    {
      id: "overview",
      label: "Organization Overview",
      href: `/app/organizations/${organizationId}`,
      requiredPermissions: ["organization:read"],
    },
    {
      id: "members",
      label: "Members & Roles",
      href: `/app/organizations/${organizationId}/members`,
      requiredPermissions: ["members:read"],
    },
    {
      id: "roles",
      label: "Permissions Matrix",
      href: `/app/organizations/${organizationId}/roles`,
      requiredPermissions: ["members:read"],
    },
    {
      id: "settings",
      label: "Settings",
      href: `/app/organizations/${organizationId}/settings`,
      requiredPermissions: ["organization:read"],
    },
  ];

  return catalog.filter((item) => canAll(permissions, item.requiredPermissions));
}
