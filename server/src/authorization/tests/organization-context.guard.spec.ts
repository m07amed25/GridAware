import { type ExecutionContext, HttpStatus } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuditLogsService } from '../../audit-logs/audit-logs.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import type { PrismaService } from '../../database/prisma.service.js';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '../../generated/prisma/enums.js';
import type { RequestWithOrganizationContext } from '../authorization.types.js';
import { OrganizationContextGuard } from '../guards/organization-context.guard.js';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const USER_1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MEM_1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function createContext(request: Partial<RequestWithOrganizationContext>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('OrganizationContextGuard', () => {
  it('throws 401 UNAUTHENTICATED when request.user is absent', async () => {
    const prisma = { membership: { findFirst: vi.fn() } } as unknown as PrismaService;
    const auditLogs = { record: vi.fn() } as unknown as AuditLogsService;
    const guard = new OrganizationContextGuard(prisma, auditLogs);

    await expect(
      guard.canActivate(createContext({ params: { organizationId: ORG_A } })),
    ).rejects.toMatchObject({
      code: ErrorCode.UNAUTHENTICATED,
    });
  });

  it('conceals malformed organizationId with 404 RESOURCE_NOT_FOUND and audits denial', async () => {
    const findFirst = vi.fn();
    const record = vi.fn().mockResolvedValue(undefined);
    const guard = new OrganizationContextGuard(
      { membership: { findFirst } } as unknown as PrismaService,
      { record } as unknown as AuditLogsService,
    );

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: USER_1, sessionId: 's1', email: 'a@b.com', status: UserStatus.ACTIVE },
          params: { organizationId: 'not-a-uuid' },
          method: 'GET',
          path: '/api/v1/organizations/not-a-uuid/members',
        }),
      ),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppException &&
        err.getStatus() === HttpStatus.NOT_FOUND &&
        err.code === ErrorCode.RESOURCE_NOT_FOUND,
    );

    expect(findFirst).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTHZ_DENIED',
        actorUserId: USER_1,
      }),
    );
  });

  it('queries strictly by route organizationId + authenticated userId + ACTIVE status and ignores spoofed body fields', async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: MEM_1,
      organizationId: ORG_A,
      userId: USER_1,
      role: MembershipRole.ENGINEER,
    });
    const record = vi.fn();
    const guard = new OrganizationContextGuard(
      { membership: { findFirst } } as unknown as PrismaService,
      { record } as unknown as AuditLogsService,
    );

    const req: Partial<RequestWithOrganizationContext> = {
      user: { userId: USER_1, sessionId: 's1', email: 'a@b.com', status: UserStatus.ACTIVE },
      params: { organizationId: ORG_A },
      body: { organizationId: ORG_B, role: MembershipRole.OWNER },
      method: 'GET',
      path: `/api/v1/organizations/${ORG_A}/access-context`,
    };

    const result = await guard.canActivate(createContext(req));
    expect(result).toBe(true);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: ORG_A,
          userId: USER_1,
          status: MembershipStatus.ACTIVE,
          organization: { status: OrganizationStatus.ACTIVE },
        },
      }),
    );
    expect(req.organizationContext).toEqual({
      userId: USER_1,
      organizationId: ORG_A,
      membershipId: MEM_1,
      role: MembershipRole.ENGINEER,
      policyVersion: '1',
    });
  });

  it('returns concealed 404 RESOURCE_NOT_FOUND when membership or organization is inactive or missing', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const record = vi.fn().mockResolvedValue(undefined);
    const guard = new OrganizationContextGuard(
      { membership: { findFirst } } as unknown as PrismaService,
      { record } as unknown as AuditLogsService,
    );

    await expect(
      guard.canActivate(
        createContext({
          user: { userId: USER_1, sessionId: 's1', email: 'a@b.com', status: UserStatus.ACTIVE },
          params: { organizationId: ORG_B },
          method: 'GET',
          path: `/api/v1/organizations/${ORG_B}/access-context`,
        }),
      ),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppException &&
        err.getStatus() === HttpStatus.NOT_FOUND &&
        err.code === ErrorCode.RESOURCE_NOT_FOUND,
    );

    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTHZ_DENIED',
        entityType: 'Organization',
        entityId: ORG_B,
        actorUserId: USER_1,
      }),
    );
  });
});
