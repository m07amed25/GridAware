import { describe, expect, it } from 'vitest';
import { MembershipRole } from '../../generated/prisma/enums.js';
import { ALL_PERMISSIONS } from '../authorization.types.js';
import {
  getPermissionListForRole,
  getPermissionSetForRole,
  isKnownMembershipRole,
  ROLE_PERMISSION_LISTS,
  ROLE_PERMISSIONS,
} from '../permission-map.js';

describe('Permission Catalogue & Role-to-Permission Map', () => {
  it('defines 70 unique, action-oriented <resource>:<action> permissions', () => {
    expect(ALL_PERMISSIONS.length).toBe(70);
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    for (const permission of ALL_PERMISSIONS) {
      expect(permission).toMatch(/^[a-z-]+:[a-z-]+$/);
    }
  });

  it('covers every Prisma MembershipRole enum value with no missing or extra keys', () => {
    const prismaRoles = Object.values(MembershipRole).sort();
    const mapRoles = Object.keys(ROLE_PERMISSIONS).sort();
    expect(mapRoles).toEqual(prismaRoles);
    expect(Object.keys(ROLE_PERMISSION_LISTS).sort()).toEqual(prismaRoles);
  });

  it('grants OWNER 100% of ALL_PERMISSIONS and reserves org/member/audit admin exclusively for OWNER', () => {
    const ownerSet = ROLE_PERMISSIONS[MembershipRole.OWNER];
    expect(ownerSet.size).toBe(ALL_PERMISSIONS.length);
    for (const permission of ALL_PERMISSIONS) {
      expect(ownerSet.has(permission)).toBe(true);
    }

    const ownerOnlyPermissions = [
      'organization:update',
      'organization:archive',
      'members:read',
      'members:invite',
      'members:revoke-invitation',
      'members:update-role',
      'members:suspend',
      'members:remove',
      'audit-logs:read',
      'devices:manage',
    ] as const;

    const nonOwnerRoles = [
      MembershipRole.FACILITY_MANAGER,
      MembershipRole.ENGINEER,
      MembershipRole.TECHNICIAN,
      MembershipRole.VIEWER,
    ];

    for (const role of nonOwnerRoles) {
      for (const perm of ownerOnlyPermissions) {
        expect(ROLE_PERMISSIONS[role].has(perm)).toBe(false);
      }
    }
  });

  it('grants VIEWER strictly read-only permissions plus self-service notifications and zero mutation/export permissions', () => {
    const viewerPerms = getPermissionListForRole(MembershipRole.VIEWER);
    expect(viewerPerms).toContain('organization:read');
    expect(viewerPerms).toContain('notifications:read');
    expect(viewerPerms).toContain('notifications:manage-preferences');

    for (const perm of viewerPerms) {
      const isRead = perm.endsWith(':read');
      const isSelfPrefs = perm === 'notifications:manage-preferences';
      expect(
        isRead || isSelfPrefs,
        `VIEWER should not hold mutation/export permission "${perm}"`,
      ).toBe(true);
    }
  });

  it('grants ENGINEER PRD-aligned asset/sensor/threshold writes and harmonized work-order completion without archiving or closing incidents', () => {
    const engineer = ROLE_PERMISSIONS[MembershipRole.ENGINEER];
    expect(engineer.has('assets:create')).toBe(true);
    expect(engineer.has('assets:update')).toBe(true);
    expect(engineer.has('sensors:create')).toBe(true);
    expect(engineer.has('sensors:update')).toBe(true);
    expect(engineer.has('thresholds:manage')).toBe(true);
    expect(engineer.has('work-orders:update')).toBe(true);
    expect(engineer.has('work-orders:complete')).toBe(true);
    expect(engineer.has('incidents:resolve')).toBe(true);
    expect(engineer.has('notifications:read')).toBe(true);
    expect(engineer.has('notifications:manage-preferences')).toBe(true);

    // Explicit denials for ENGINEER
    expect(engineer.has('sites:create')).toBe(false);
    expect(engineer.has('buildings:create')).toBe(false);
    expect(engineer.has('assets:archive')).toBe(false);
    expect(engineer.has('sensors:archive')).toBe(false);
    expect(engineer.has('incidents:assign')).toBe(false);
    expect(engineer.has('incidents:close')).toBe(false);
    expect(engineer.has('work-orders:assign')).toBe(false);
    expect(engineer.has('telemetry:export')).toBe(false);
    expect(engineer.has('analytics:export')).toBe(false);
  });

  it('restricts TECHNICIAN to assignment-scoped work-order permissions and related incident notes only', () => {
    const tech = ROLE_PERMISSIONS[MembershipRole.TECHNICIAN];
    expect(tech.has('work-orders:read-assigned')).toBe(true);
    expect(tech.has('work-orders:update-assigned')).toBe(true);
    expect(tech.has('work-orders:complete-assigned')).toBe(true);
    expect(tech.has('incidents:add-related-note')).toBe(true);
    expect(tech.has('maintenance-records:create')).toBe(true);
    expect(tech.has('notifications:read')).toBe(true);

    expect(tech.has('work-orders:read')).toBe(false);
    expect(tech.has('work-orders:create')).toBe(false);
    expect(tech.has('work-orders:assign')).toBe(false);
    expect(tech.has('work-orders:update')).toBe(false);
    expect(tech.has('work-orders:complete')).toBe(false);
    expect(tech.has('incidents:investigate')).toBe(false);
    expect(tech.has('incidents:resolve')).toBe(false);
    expect(tech.has('analytics:read')).toBe(false);
    expect(tech.has('simulator:control')).toBe(false);
  });

  it('fails closed on unknown or tampered role values', () => {
    expect(isKnownMembershipRole('SUPERADMIN')).toBe(false);
    expect(isKnownMembershipRole('ADMIN')).toBe(false);
    expect(isKnownMembershipRole('')).toBe(false);
    expect(isKnownMembershipRole(undefined)).toBe(false);
    expect(getPermissionSetForRole('SUPERADMIN').size).toBe(0);
    expect(getPermissionListForRole('SUPERADMIN')).toEqual([]);
  });
});
