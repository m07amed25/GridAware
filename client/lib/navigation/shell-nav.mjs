import { getVisibleOrgNavItems } from "../authorization/permissions.mjs";

/**
 * Extracts and safely URL-decodes the active organization ID from a protected route path.
 * @param {string} pathname
 * @returns {string | null}
 */
export function extractActiveOrgId(pathname) {
  if (typeof pathname !== "string") {
    return null;
  }
  const match = pathname.match(/^\/app\/organizations\/([^/]+)/);
  if (!match || !match[1]) {
    return null;
  }
  const rawSegment = match[1];
  try {
    return decodeURIComponent(rawSegment);
  } catch {
    return rawSegment;
  }
}

/**
 * Resolves the active sidebar navigation item ID for a pathname and active organization ID.
 * @param {string} pathname
 * @param {string | null} activeOrgId
 * @returns {string | undefined}
 */
export function resolveActiveSidebarId(pathname, activeOrgId) {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return undefined;
  }
  const normalized =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  if (normalized === "/app") {
    return "workspace-overview";
  }
  if (normalized === "/onboarding" || normalized.startsWith("/onboarding/")) {
    return "onboarding";
  }
  if (normalized === "/app/profile" || normalized.startsWith("/app/profile/")) {
    return "profile";
  }

  if (typeof activeOrgId === "string" && activeOrgId.length > 0) {
    const pathOrgId = extractActiveOrgId(normalized);
    if (pathOrgId === activeOrgId) {
      const subMatch = normalized.match(/^\/app\/organizations\/[^/]+(.*)$/);
      const rest = subMatch ? subMatch[1] : "";
      if (rest === "") {
        return "org-overview";
      }
      if (rest === "/sites" || rest.startsWith("/sites/")) {
        return "org-sites";
      }
      if (rest === "/devices" || rest.startsWith("/devices/")) {
        return "org-devices";
      }
      if (rest === "/sensors" || rest.startsWith("/sensors/")) {
        return "org-sensors";
      }
      if (rest === "/members" || rest.startsWith("/members/")) {
        return "org-members";
      }
      if (rest === "/roles" || rest.startsWith("/roles/")) {
        return "org-roles";
      }
      if (rest === "/settings" || rest.startsWith("/settings/")) {
        return "org-settings";
      }
    }
  }

  return undefined;
}

/**
 * Builds the navigation groups for the authenticated shell sidebar.
 * Omits the organization group when no organization is active or permissions are still loading.
 * @param {{ activeOrgId: string | null; activeOrgName?: string | null; permissions: ReadonlySet<string> | null }} params
 * @returns {Array<{ label: string; items: Array<{ id: string; label: string; href: string; iconKey: string }> }>}
 */
export function buildShellNavGroups({
  activeOrgId,
  activeOrgName,
  permissions,
}) {
  const groups = [
    {
      label: "Workspace",
      items: [
        {
          id: "workspace-overview",
          label: "Overview",
          href: "/app",
          iconKey: "workspace-overview",
        },
        {
          id: "onboarding",
          label: "Onboarding",
          href: "/onboarding",
          iconKey: "onboarding",
        },
      ],
    },
  ];

  if (
    typeof activeOrgId === "string" &&
    activeOrgId.trim().length > 0 &&
    permissions instanceof Set
  ) {
    const visibleItems = getVisibleOrgNavItems(activeOrgId, permissions);
    if (visibleItems.length > 0) {
      groups.push({
        label:
          typeof activeOrgName === "string" && activeOrgName.trim().length > 0
            ? activeOrgName.trim()
            : "Organization",
        items: visibleItems.map((item) => ({
          id: `org-${item.id}`,
          label: item.label,
          href: item.href,
          iconKey: `org-${item.id}`,
        })),
      });
    }
  }

  return groups;
}

/**
 * Derives crisp 2-letter uppercase user initials, falling back to "GA".
 * @param {string} name
 * @returns {string}
 */
export function getUserInitials(name) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (trimmed.length === 0) {
    return "GA";
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }
  return `${tokens[0].charAt(0)}${tokens[tokens.length - 1].charAt(0)}`.toUpperCase();
}
