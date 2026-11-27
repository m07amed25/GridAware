import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditLogsService } from '../../audit-logs/audit-logs.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import {
  ALLOW_ACTIVE_MEMBER_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../authorization.constants.js';
import { AuthorizationService } from '../authorization.service.js';
import type {
  Permission,
  RequestWithOrganizationContext,
} from '../authorization.types.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authorizationService: AuthorizationService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOrganizationContext>();
    const orgContext = request.organizationContext;

    if (!orgContext?.role) {
      await this.recordDenial(request, 'MISSING_ORGANIZATION_CONTEXT', []);
      throw AppException.forbidden('Organization context is required.');
    }

    if (!this.authorizationService.isKnownRole(orgContext.role)) {
      await this.recordDenial(request, 'UNKNOWN_ROLE', []);
      throw AppException.forbidden('Insufficient permissions.');
    }

    const allowActiveMember = this.reflector.getAllAndOverride<boolean>(
      ALLOW_ACTIVE_MEMBER_KEY,
      [context.getHandler(), context.getClass()],
    );

    const required = this.reflector.getAllAndOverride<Permission[]>(
      REQUIRED_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (allowActiveMember && (!required || required.length === 0)) {
      return true;
    }

    // Deny by default: missing permission metadata is NEVER an implicit allow.
    if (!required || required.length === 0) {
      await this.recordDenial(request, 'NO_PERMISSION_POLICY_DECLARED', []);
      throw AppException.forbidden('No permission policy declared.');
    }

    const allowed = this.authorizationService.hasAllPermissions(
      orgContext,
      required,
    );

    if (!allowed) {
      await this.recordDenial(request, 'INSUFFICIENT_PERMISSIONS', required);
      throw AppException.forbidden('Insufficient permissions.');
    }

    return true;
  }

  private async recordDenial(
    request: RequestWithOrganizationContext,
    reason: string,
    requiredPermissions: readonly Permission[],
  ): Promise<void> {
    const orgContext = request.organizationContext;
    try {
      await this.auditLogs.record({
        action: 'AUTHZ_DENIED',
        entityType: 'PermissionPolicy',
        entityId: request.path ?? request.url ?? null,
        organizationId: orgContext?.organizationId ?? null,
        actorUserId: orgContext?.userId ?? request.user?.userId ?? null,
        actorMembershipId: orgContext?.membershipId ?? null,
        metadata: {
          reason,
          actorRole: orgContext?.role ?? null,
          requiredPermissions: [...requiredPermissions],
          method: request.method,
          path: request.path ?? request.url,
        },
      });
    } catch {
      // Never allow a failed audit write to bypass authorization enforcement.
    }
  }
}
