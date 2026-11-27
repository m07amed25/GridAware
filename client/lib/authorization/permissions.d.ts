import type { AssignableNonOwnerRole, MembershipRole } from "./types";

export declare const ASSIGNABLE_NON_OWNER_ROLES: readonly AssignableNonOwnerRole[];

export declare const ROLE_LABELS: Readonly<Record<MembershipRole, string>>;

export declare function can(
  permissions: ReadonlySet<string>,
  required: string,
): boolean;

export declare function canAll(
  permissions: ReadonlySet<string>,
  required: readonly string[],
): boolean;

export declare function canAny(
  permissions: ReadonlySet<string>,
  candidates: readonly string[],
): boolean;

export declare function isReadOnlyRole(
  role: MembershipRole | string | null | undefined,
): boolean;

export interface OrgNavItem {
  id: string;
  label: string;
  href: string;
  requiredPermissions: string[];
}

export declare function getVisibleOrgNavItems(
  organizationId: string,
  permissions: ReadonlySet<string>,
): OrgNavItem[];
