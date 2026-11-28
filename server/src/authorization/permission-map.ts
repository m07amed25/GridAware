import { MembershipRole } from '../generated/prisma/enums.js';
import { ALL_PERMISSIONS, type Permission } from './authorization.types.js';

const VIEWER_READ_PERMISSIONS: readonly Permission[] = Object.freeze([
  'organization:read',
  'sites:read',
  'buildings:read',
  'assets:read',
  'devices:read',
  'sensors:read',
  'thresholds:read',
  'telemetry:read',
  'monitoring:read',
  'anomalies:read',
  'predictions:read',
  'risk-assessments:read',
  'simulator:read',
  'incidents:read',
  'work-orders:read',
  'maintenance:read',
  'analytics:read',
  'notifications:read',
]);

const SELF_SERVICE_NOTIFICATION_PERMISSIONS: readonly Permission[] =
  Object.freeze(['notifications:read', 'notifications:manage-preferences']);

const FACILITY_MANAGER_PERMISSIONS: readonly Permission[] = Object.freeze([
  ...VIEWER_READ_PERMISSIONS,
  'sites:create',
  'sites:update',
  'sites:archive',
  'buildings:create',
  'buildings:update',
  'buildings:archive',
  'assets:create',
  'assets:update',
  'assets:archive',
  'sensors:create',
  'sensors:update',
  'sensors:disable',
  'sensors:maintenance',
  'sensors:archive',
  'thresholds:manage',
  'devices:read',
  'devices:create',
  'devices:update',
  'devices:activate',
  'devices:suspend',
  'devices:revoke',
  'devices:rotate-credentials',
  'device-credentials:provision',
  'telemetry:export',
  'anomalies:acknowledge',
  'simulator:control',
  'incidents:create',
  'incidents:assign',
  'incidents:investigate',
  'incidents:resolve',
  'incidents:close',
  'work-orders:create',
  'work-orders:assign',
  'work-orders:update',
  'work-orders:complete',
  'maintenance:manage',
  'maintenance-records:create',
  'analytics:export',
  'notifications:manage-preferences',
]);

const ENGINEER_PERMISSIONS: readonly Permission[] = Object.freeze([
  ...VIEWER_READ_PERMISSIONS,
  'devices:read',
  'devices:create',
  'devices:update',
  'devices:activate',
  'assets:create',
  'assets:update',
  'sensors:create',
  'sensors:update',
  'sensors:disable',
  'sensors:maintenance',
  'thresholds:manage',
  'anomalies:acknowledge',
  'simulator:control',
  'incidents:create',
  'incidents:investigate',
  'incidents:resolve',
  'work-orders:create',
  'work-orders:update',
  'work-orders:complete',
  'maintenance-records:create',
  'notifications:manage-preferences',
]);

const TECHNICIAN_PERMISSIONS: readonly Permission[] = Object.freeze([
  'organization:read',
  'sites:read',
  'buildings:read',
  'assets:read',
  'devices:read',
  'sensors:read',
  'sensors:maintenance',
  'telemetry:read',
  'monitoring:read',
  'anomalies:read',
  'predictions:read',
  'risk-assessments:read',
  'incidents:read',
  'incidents:add-related-note',
  'work-orders:read-assigned',
  'work-orders:update-assigned',
  'work-orders:complete-assigned',
  'maintenance:read',
  'maintenance-records:create',
  ...SELF_SERVICE_NOTIFICATION_PERMISSIONS,
]);

const VIEWER_PERMISSIONS: readonly Permission[] = Object.freeze([
  ...VIEWER_READ_PERMISSIONS,
  'notifications:manage-preferences',
]);

function uniquePermissions(
  list: readonly Permission[],
): readonly Permission[] {
  return Object.freeze([...new Set(list)]);
}

/**
 * Authoritative immutable role-to-permission matrix keyed directly by Prisma's
 * generated MembershipRole enum (no duplicate role enum definitions).
 */
export const ROLE_PERMISSION_LISTS: Readonly<
  Record<MembershipRole, readonly Permission[]>
> = Object.freeze({
  [MembershipRole.OWNER]: uniquePermissions(ALL_PERMISSIONS),
  [MembershipRole.FACILITY_MANAGER]: uniquePermissions(
    FACILITY_MANAGER_PERMISSIONS,
  ),
  [MembershipRole.ENGINEER]: uniquePermissions(ENGINEER_PERMISSIONS),
  [MembershipRole.TECHNICIAN]: uniquePermissions(TECHNICIAN_PERMISSIONS),
  [MembershipRole.VIEWER]: uniquePermissions(VIEWER_PERMISSIONS),
});

export const ROLE_PERMISSIONS: Readonly<
  Record<MembershipRole, ReadonlySet<Permission>>
> = Object.freeze({
  [MembershipRole.OWNER]: new Set(ROLE_PERMISSION_LISTS[MembershipRole.OWNER]),
  [MembershipRole.FACILITY_MANAGER]: new Set(
    ROLE_PERMISSION_LISTS[MembershipRole.FACILITY_MANAGER],
  ),
  [MembershipRole.ENGINEER]: new Set(
    ROLE_PERMISSION_LISTS[MembershipRole.ENGINEER],
  ),
  [MembershipRole.TECHNICIAN]: new Set(
    ROLE_PERMISSION_LISTS[MembershipRole.TECHNICIAN],
  ),
  [MembershipRole.VIEWER]: new Set(
    ROLE_PERMISSION_LISTS[MembershipRole.VIEWER],
  ),
});

const EMPTY_PERMISSION_SET: ReadonlySet<Permission> = new Set();

export function isKnownMembershipRole(role: unknown): role is MembershipRole {
  return (
    typeof role === 'string' &&
    Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role)
  );
}

/**
 * Fail-closed lookup: unknown roles always resolve to an empty permission set.
 */
export function getPermissionSetForRole(
  role: unknown,
): ReadonlySet<Permission> {
  if (!isKnownMembershipRole(role)) {
    return EMPTY_PERMISSION_SET;
  }
  return ROLE_PERMISSIONS[role];
}

export function getPermissionListForRole(
  role: unknown,
): readonly Permission[] {
  if (!isKnownMembershipRole(role)) {
    return [];
  }
  return ROLE_PERMISSION_LISTS[role];
}
