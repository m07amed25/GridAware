import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import type { TokenCryptoService } from '../../auth/token-crypto.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import type { PrismaService } from '../../database/prisma.service.js';
import {
  MembershipRole,
  UserStatus,
} from '../../generated/prisma/enums.js';
import { OrganizationInvitationsController } from '../../memberships/invitations.controller.js';
import { MembershipsController } from '../../memberships/memberships.controller.js';
import { OrganizationDetailController } from '../../organizations/organizations.controller.js';
import type { RedisService } from '../../redis/redis.service.js';
import type { SessionsService } from '../../sessions/sessions.service.js';
import type { UsersService } from '../../users/users.service.js';
import {
  ALLOW_ACTIVE_MEMBER_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../authorization.constants.js';
import { AuthorizationController } from '../authorization.controller.js';
import { AuthorizationService } from '../authorization.service.js';
import { BackgroundJobAuthorizationService } from '../channels/background-job-authorization.service.js';
import { DeviceIsolationGuardrail } from '../channels/device-isolation.guardrail.js';
import { WsAuthorizationService } from '../channels/ws-authorization.service.js';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const SITE_A = '33333333-3333-4333-8333-333333333333';
const DEVICE_A = '44444444-4444-4444-8444-444444444444';
const USER_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const MEM_1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('Cross-Channel Authorization & Route Policy Coverage', () => {
  const authorizationService = new AuthorizationService();

  describe('WsAuthorizationService', () => {
    it('authenticates handshake, resolves server rooms, enforces tenant/role scope, and fans out revocations', async () => {
      const tokenCrypto = {
        verifyAccessToken: vi
          .fn()
          .mockResolvedValue({ sub: USER_1, sid: 'sess-1' }),
      } as unknown as TokenCryptoService;
      const usersService = {
        findById: vi
          .fn()
          .mockResolvedValue({ id: USER_1, status: UserStatus.ACTIVE }),
      } as unknown as UsersService;
      const sessionsService = {
        findActiveById: vi
          .fn()
          .mockResolvedValue({ id: 'sess-1', userId: USER_1 }),
      } as unknown as SessionsService;
      const findFirst = vi.fn();
      const publish = vi.fn().mockResolvedValue(1);
      const redis = {
        client: { status: 'ready', publish },
      } as unknown as RedisService;

      const wsAuth = new WsAuthorizationService(
        tokenCrypto,
        usersService,
        sessionsService,
        { membership: { findFirst } } as unknown as PrismaService,
        authorizationService,
        redis,
      );

      const principal = await wsAuth.authenticateHandshake('valid-jwt');
      expect(principal).toEqual({ userId: USER_1, sessionId: 'sess-1' });

      // Own notification stream allowed; another user's denied
      const ownNotif = await wsAuth.authorizeSubscription(principal, {
        topic: 'user.notifications',
        resourceId: USER_1,
      });
      expect(ownNotif.room).toBe(`user:${USER_1}:notifications`);
      await expect(
        wsAuth.authorizeSubscription(principal, {
          topic: 'user.notifications',
          resourceId: USER_2,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });

      // Cross-tenant site subscription denied with concealed 404
      findFirst.mockResolvedValueOnce(null);
      await expect(
        wsAuth.authorizeSubscription(principal, {
          topic: 'site.telemetry',
          resourceId: SITE_A,
          resolvedOrganizationId: ORG_B,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_NOT_FOUND });

      // Technician work-order subscription gets assignee-scoped room only
      findFirst.mockResolvedValueOnce({
        id: MEM_1,
        organizationId: ORG_A,
        userId: USER_1,
        role: MembershipRole.TECHNICIAN,
      });
      const techSub = await wsAuth.authorizeSubscription(principal, {
        topic: 'site.work-orders',
        resourceId: SITE_A,
        resolvedOrganizationId: ORG_A,
      });
      expect(techSub.room).toBe(
        `org:${ORG_A}:site:${SITE_A}:work-orders:assignee:${USER_1}`,
      );

      // Revocation pub/sub notifies listeners and publishes to Redis
      const listener = vi.fn();
      const unsubscribe = wsAuth.onMembershipRevoked(listener);
      await wsAuth.publishMembershipRevocation({
        organizationId: ORG_A,
        userId: USER_1,
        membershipId: MEM_1,
        reason: 'MEMBERSHIP_SUSPENDED',
      });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(publish).toHaveBeenCalledTimes(1);
      unsubscribe();
    });
  });

  describe('BackgroundJobAuthorizationService', () => {
    const jobAuth = new BackgroundJobAuthorizationService(authorizationService);

    it('authorizes producers before enqueueing and re-validates tenant ownership & system capabilities in workers', () => {
      const fmContext = {
        userId: USER_1,
        organizationId: ORG_A,
        membershipId: MEM_1,
        role: MembershipRole.FACILITY_MANAGER,
        policyVersion: '1',
      };
      const viewerContext = {
        ...fmContext,
        role: MembershipRole.VIEWER,
      };

      expect(() =>
        jobAuth.authorizeAndBuildUserJobProvenance(
          viewerContext,
          'telemetry:export',
          { aggregateType: 'Export', aggregateId: 'exp-1', correlationId: 'c1' },
        ),
      ).toThrowError(AppException);

      const provenance = jobAuth.authorizeAndBuildUserJobProvenance(
        fmContext,
        'telemetry:export',
        { aggregateType: 'Export', aggregateId: 'exp-1', correlationId: 'c1' },
      );

      expect(
        jobAuth.validateWorkerExecution(provenance, {
          id: 'exp-1',
          organizationId: ORG_A,
        }).aggregate.id,
      ).toBe('exp-1');

      // Cross-tenant aggregate rejected with 404
      expect(() =>
        jobAuth.validateWorkerExecution(provenance, {
          id: 'exp-1',
          organizationId: ORG_B,
        }),
      ).toThrowError(AppException);

      // System job rejected if capability does not match handler expectation
      const sysProv = jobAuth.buildSystemJobProvenance({
        organizationId: ORG_A,
        serviceCapability: 'TELEMETRY_EVALUATE',
        aggregateType: 'TelemetryEvent',
        aggregateId: 'evt-1',
        correlationId: 'c2',
      });
      expect(() =>
        jobAuth.validateWorkerExecution(
          sysProv,
          { id: 'evt-1', organizationId: ORG_A },
          'EXPORT_GENERATE',
        ),
      ).toThrowError(AppException);
    });
  });

  describe('DeviceIsolationGuardrail', () => {
    const guardrail = new DeviceIsolationGuardrail();
    const topicA = `gridaware/v1/orgs/${ORG_A}/sites/${SITE_A}/devices/${DEVICE_A}/telemetry`;
    const topicB = `gridaware/v1/orgs/${ORG_B}/sites/${SITE_A}/devices/${DEVICE_A}/telemetry`;

    it('prevents human OWNER principals from publishing to MQTT device topics and isolates device creds by tenant/site/device', () => {
      expect(() =>
        guardrail.assertDeviceMayPublishToTopic(
          {
            credentialType: 'HUMAN_SESSION',
            userId: USER_1,
            organizationId: ORG_A,
            role: MembershipRole.OWNER,
          },
          topicA,
        ),
      ).toThrowError(/Human user roles cannot publish/i);

      const deviceCred = {
        credentialType: 'DEVICE_MQTT' as const,
        deviceId: DEVICE_A,
        organizationId: ORG_A,
        siteId: SITE_A,
        active: true,
      };
      expect(guardrail.assertDeviceMayPublishToTopic(deviceCred, topicA)).toMatchObject({
        organizationId: ORG_A,
        deviceId: DEVICE_A,
      });
      expect(() =>
        guardrail.assertDeviceMayPublishToTopic(deviceCred, topicB),
      ).toThrowError(AppException);
      expect(() =>
        guardrail.assertNotDeviceCredentialForHumanContext(deviceCred),
      ).toThrowError(AppException);
    });
  });

  describe('Controller Route Permission Metadata Audit', () => {
    it('ensures every handler on @OrgProtected controllers declares @RequirePermissions or @AllowActiveMember', () => {
      const controllers = [
        AuthorizationController,
        MembershipsController,
        OrganizationDetailController,
        OrganizationInvitationsController,
      ];

      for (const ControllerClass of controllers) {
        const prototype = ControllerClass.prototype as unknown as Record<
          string,
          unknown
        >;
        const methodNames = Object.getOwnPropertyNames(prototype).filter(
          (name) =>
            name !== 'constructor' && typeof prototype[name] === 'function',
        );

        expect(methodNames.length).toBeGreaterThan(0);

        for (const methodName of methodNames) {
          const handler = prototype[methodName] as object;
          const required = Reflect.getMetadata(REQUIRED_PERMISSIONS_KEY, handler) as
            | string[]
            | undefined;
          const allowActive = Reflect.getMetadata(
            ALLOW_ACTIVE_MEMBER_KEY,
            handler,
          ) as boolean | undefined;

          expect(
            Boolean(allowActive) || Boolean(required && required.length > 0),
            `Handler ${ControllerClass.name}.${methodName} is missing @RequirePermissions or @AllowActiveMember metadata`,
          ).toBe(true);
        }
      }
    });
  });
});
