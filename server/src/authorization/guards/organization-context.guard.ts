import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuditLogsService } from '../../audit-logs/audit-logs.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  MembershipStatus,
  OrganizationStatus,
} from '../../generated/prisma/enums.js';
import {
  POLICY_VERSION,
  UUID_PATTERN,
} from '../authorization.constants.js';
import type { RequestWithOrganizationContext } from '../authorization.types.js';

@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithOrganizationContext>();
    const actor = request.user;

    if (!actor?.userId) {
      throw AppException.unauthenticated();
    }

    const rawOrganizationId = request.params?.organizationId;
    const organizationId =
      typeof rawOrganizationId === 'string' ? rawOrganizationId.trim() : '';

    if (!UUID_PATTERN.test(organizationId)) {
      await this.recordDenial(actor.userId, null, request, 'INVALID_ORG_PARAM');
      throw AppException.notFound();
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: actor.userId,
        status: MembershipStatus.ACTIVE,
        organization: {
          status: OrganizationStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        role: true,
      },
    });

    if (!membership) {
      await this.recordDenial(
        actor.userId,
        organizationId,
        request,
        'ORGANIZATION_ACCESS_DENIED',
      );
      // Strict non-disclosure (Spec FR-008 Option A): conceal non-existent,
      // unjoined, or inactive organizations and inactive/removed memberships.
      throw AppException.notFound();
    }

    request.organizationContext = {
      userId: membership.userId,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      role: membership.role,
      policyVersion: POLICY_VERSION,
    };

    return true;
  }

  private async recordDenial(
    actorUserId: string,
    organizationId: string | null,
    request: RequestWithOrganizationContext,
    reason: string,
  ): Promise<void> {
    try {
      await this.auditLogs.record({
        action: 'AUTHZ_DENIED',
        entityType: 'Organization',
        entityId: organizationId,
        organizationId: null,
        actorUserId,
        actorMembershipId: null,
        metadata: {
          reason,
          method: request.method,
          path: request.path ?? request.url,
        },
      });
    } catch {
      // Never leak audit persistence issues or turn a denial into an allow.
    }
  }
}
