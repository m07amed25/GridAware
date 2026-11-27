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
  ORG_SLUG_PATTERN,
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

    const rawOrganizationRef = request.params?.organizationId;
    const organizationRef =
      typeof rawOrganizationRef === 'string' ? rawOrganizationRef.trim() : '';

    const isUuid = UUID_PATTERN.test(organizationRef);
    const normalizedSlug = organizationRef.toLowerCase();
    const isSlug = !isUuid && ORG_SLUG_PATTERN.test(normalizedSlug);

    if (!isUuid && !isSlug) {
      await this.recordDenial(actor.userId, null, request, 'INVALID_ORG_PARAM');
      throw AppException.notFound();
    }

    const membership = await this.prisma.membership.findFirst({
      where: isUuid
        ? {
            organizationId: organizationRef,
            userId: actor.userId,
            status: MembershipStatus.ACTIVE,
            organization: {
              status: OrganizationStatus.ACTIVE,
            },
          }
        : {
            userId: actor.userId,
            status: MembershipStatus.ACTIVE,
            organization: {
              slug: normalizedSlug,
              status: OrganizationStatus.ACTIVE,
            },
          },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        role: true,
        organization: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!membership) {
      await this.recordDenial(
        actor.userId,
        isUuid ? organizationRef : normalizedSlug,
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
      organizationSlug: membership.organization?.slug,
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
