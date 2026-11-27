import { Injectable } from '@nestjs/common';
import { TokenCryptoService } from '../../auth/token-crypto.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '../../generated/prisma/enums.js';
import { RedisService } from '../../redis/redis.service.js';
import { SessionsService } from '../../sessions/sessions.service.js';
import { UsersService } from '../../users/users.service.js';
import {
  MEMBERSHIP_REVOKED_REDIS_CHANNEL,
  POLICY_VERSION,
} from '../authorization.constants.js';
import { AuthorizationService } from '../authorization.service.js';
import type {
  OrganizationAuthorizationContext,
  Permission,
} from '../authorization.types.js';

export type WsSubscriptionTopic =
  | 'site.telemetry'
  | 'site.sensor-status'
  | 'site.anomalies'
  | 'site.incidents'
  | 'site.work-orders'
  | 'simulation.status'
  | 'user.notifications';

export interface WsAuthenticatedPrincipal {
  readonly userId: string;
  readonly sessionId: string;
}

export interface WsSubscriptionRequest {
  readonly topic: WsSubscriptionTopic;
  readonly resourceId: string;
  /**
   * Server-resolved owning organization of the requested site/simulation run.
   * Client-supplied room names or organization IDs are never trusted.
   */
  readonly resolvedOrganizationId?: string;
}

export interface AuthorizedWsSubscription {
  readonly room: string;
  readonly organizationId: string | null;
  readonly context: OrganizationAuthorizationContext | null;
}

export interface MembershipRevocationEvent {
  readonly organizationId: string;
  readonly userId: string;
  readonly membershipId: string;
  readonly reason:
    | 'ROLE_CHANGED'
    | 'MEMBERSHIP_SUSPENDED'
    | 'MEMBERSHIP_REMOVED'
    | 'ORGANIZATION_SUSPENDED';
}

export type RevocationListener = (event: MembershipRevocationEvent) => void;

const TOPIC_PERMISSION_MAP: Readonly<
  Record<Exclude<WsSubscriptionTopic, 'user.notifications'>, Permission>
> = {
  'site.telemetry': 'telemetry:read',
  'site.sensor-status': 'sensors:read',
  'site.anomalies': 'anomalies:read',
  'site.incidents': 'incidents:read',
  'site.work-orders': 'work-orders:read',
  'simulation.status': 'simulator:read',
};

@Injectable()
export class WsAuthorizationService {
  private readonly listeners = new Set<RevocationListener>();

  constructor(
    private readonly tokenCrypto: TokenCryptoService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly prisma: PrismaService,
    private readonly authorizationService: AuthorizationService,
    private readonly redis: RedisService,
  ) {}

  async authenticateHandshake(
    rawAccessToken: string | undefined,
  ): Promise<WsAuthenticatedPrincipal> {
    if (!rawAccessToken) {
      throw AppException.unauthenticated('Missing WebSocket authentication.');
    }

    let payload;
    try {
      payload = await this.tokenCrypto.verifyAccessToken(rawAccessToken);
    } catch {
      throw AppException.unauthenticated('Invalid WebSocket token.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw AppException.unauthenticated();
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw AppException.accountNotActive();
    }

    const session = await this.sessionsService.findActiveById(payload.sid);
    if (!session || session.userId !== user.id) {
      throw AppException.unauthenticated();
    }

    return {
      userId: user.id,
      sessionId: session.id,
    };
  }

  async authorizeSubscription(
    principal: WsAuthenticatedPrincipal,
    request: WsSubscriptionRequest,
  ): Promise<AuthorizedWsSubscription> {
    if (request.topic === 'user.notifications') {
      if (request.resourceId !== principal.userId) {
        throw AppException.forbidden(
          'Cannot subscribe to another user notification stream.',
        );
      }
      return {
        room: `user:${principal.userId}:notifications`,
        organizationId: null,
        context: null,
      };
    }

    if (!request.resolvedOrganizationId) {
      throw AppException.notFound();
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId: request.resolvedOrganizationId,
        userId: principal.userId,
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
      throw AppException.notFound();
    }

    const orgContext: OrganizationAuthorizationContext = {
      userId: membership.userId,
      organizationId: membership.organizationId,
      membershipId: membership.id,
      role: membership.role,
      policyVersion: POLICY_VERSION,
    };

    // Technicians receive strictly assignment-scoped work-order channels
    // rather than tenant-wide site work-order streams.
    if (
      request.topic === 'site.work-orders' &&
      orgContext.role === MembershipRole.TECHNICIAN
    ) {
      if (
        !this.authorizationService.hasPermission(
          orgContext,
          'work-orders:read-assigned',
        )
      ) {
        throw AppException.forbidden('Insufficient WebSocket permissions.');
      }
      return {
        room: `org:${orgContext.organizationId}:site:${request.resourceId}:work-orders:assignee:${orgContext.userId}`,
        organizationId: orgContext.organizationId,
        context: orgContext,
      };
    }

    const requiredPermission = TOPIC_PERMISSION_MAP[request.topic];
    if (
      !this.authorizationService.hasPermission(orgContext, requiredPermission)
    ) {
      throw AppException.forbidden('Insufficient WebSocket permissions.');
    }

    return {
      room: `org:${orgContext.organizationId}:resource:${request.resourceId}:${request.topic}`,
      organizationId: orgContext.organizationId,
      context: orgContext,
    };
  }

  onMembershipRevoked(listener: RevocationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async publishMembershipRevocation(
    event: MembershipRevocationEvent,
  ): Promise<void> {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Isolate subscriber callback errors.
      }
    }

    try {
      if (this.redis?.client?.status === 'ready') {
        await this.redis.client.publish(
          MEMBERSHIP_REVOKED_REDIS_CHANNEL,
          JSON.stringify(event),
        );
      }
    } catch {
      // Best-effort cross-instance fan-out; live HTTP guards remain authoritative.
    }
  }
}
