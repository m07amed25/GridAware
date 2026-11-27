import { Injectable } from '@nestjs/common';
import { POLICY_VERSION } from './authorization.constants.js';
import type {
  AccessContextPayload,
  OrganizationAuthorizationContext,
  Permission,
} from './authorization.types.js';
import {
  getPermissionListForRole,
  getPermissionSetForRole,
  isKnownMembershipRole,
} from './permission-map.js';

@Injectable()
export class AuthorizationService {
  isKnownRole(role: unknown): boolean {
    return isKnownMembershipRole(role);
  }

  getRolePermissions(role: unknown): readonly Permission[] {
    return getPermissionListForRole(role);
  }

  hasPermission(
    context: OrganizationAuthorizationContext | undefined,
    permission: Permission,
  ): boolean {
    if (!context || !isKnownMembershipRole(context.role)) {
      return false;
    }
    return getPermissionSetForRole(context.role).has(permission);
  }

  hasAllPermissions(
    context: OrganizationAuthorizationContext | undefined,
    required: readonly Permission[],
  ): boolean {
    if (!context || required.length === 0 || !isKnownMembershipRole(context.role)) {
      return false;
    }
    const granted = getPermissionSetForRole(context.role);
    return required.every((permission) => granted.has(permission));
  }

  buildAccessContext(
    context: OrganizationAuthorizationContext,
  ): AccessContextPayload {
    return {
      organizationId: context.organizationId,
      membershipId: context.membershipId,
      role: context.role,
      permissions: getPermissionListForRole(context.role),
      policyVersion: POLICY_VERSION,
    };
  }
}
