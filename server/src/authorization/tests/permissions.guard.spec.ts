import { type ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import type { AuditLogsService } from '../../audit-logs/audit-logs.service.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { MembershipRole } from '../../generated/prisma/enums.js';
import {
  ALLOW_ACTIVE_MEMBER_KEY,
  REQUIRED_PERMISSIONS_KEY,
} from '../authorization.constants.js';
import { AuthorizationService } from '../authorization.service.js';
import type {
  OrganizationAuthorizationContext,
  Permission,
  RequestWithOrganizationContext,
} from '../authorization.types.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';

function createContext(
  orgContext: OrganizationAuthorizationContext | undefined,
  required?: Permission[],
  allowActiveMember = false,
): { context: ExecutionContext; reflector: Reflector } {
  const reflector = {
    getAllAndOverride: vi.fn((key: string) => {
      if (key === REQUIRED_PERMISSIONS_KEY) return required;
      if (key === ALLOW_ACTIVE_MEMBER_KEY) return allowActiveMember;
      return undefined;
    }),
  } as unknown as Reflector;

  const request: Partial<RequestWithOrganizationContext> = {
    organizationContext: orgContext,
    method: 'POST',
    path: '/api/v1/organizations/org-1/members',
  };

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class DummyController {},
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;

  return { context, reflector };
}

const baseOrgContext = (
  role: MembershipRole,
): OrganizationAuthorizationContext => ({
  userId: 'user-1',
  organizationId: 'org-1',
  membershipId: 'mem-1',
  role,
  policyVersion: '1',
});

describe('PermissionsGuard', () => {
  const authorizationService = new AuthorizationService();

  it('fails closed (403) when permission metadata is missing on a protected route', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const { context, reflector } = createContext(
      baseOrgContext(MembershipRole.OWNER),
      undefined,
      false,
    );
    const guard = new PermissionsGuard(
      reflector,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );

    await expect(guard.canActivate(context)).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AppException &&
        err.getStatus() === HttpStatus.FORBIDDEN &&
        err.code === ErrorCode.FORBIDDEN,
    );
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTHZ_DENIED',
        metadata: expect.objectContaining({
          reason: 'NO_PERMISSION_POLICY_DECLARED',
        }),
      }),
    );
  });

  it('fails closed (403) when organizationContext is missing', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const { context, reflector } = createContext(undefined, ['assets:read']);
    const guard = new PermissionsGuard(
      reflector,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });

  it('fails closed (403) on an unknown role', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const { context, reflector } = createContext(
      baseOrgContext('UNRECOGNIZED_ROLE' as MembershipRole),
      ['assets:read'],
    );
    const guard = new PermissionsGuard(
      reflector,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });

  it('allows any active member when @AllowActiveMember() is explicitly set', async () => {
    const record = vi.fn();
    const { context, reflector } = createContext(
      baseOrgContext(MembershipRole.VIEWER),
      undefined,
      true,
    );
    const guard = new PermissionsGuard(
      reflector,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(record).not.toHaveBeenCalled();
  });

  it('enforces AND semantics when multiple permissions are required', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const { context: engCtx, reflector: engRefl } = createContext(
      baseOrgContext(MembershipRole.ENGINEER),
      ['assets:create', 'assets:archive'],
    );
    const engGuard = new PermissionsGuard(
      engRefl,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );
    await expect(engGuard.canActivate(engCtx)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });

    const { context: fmCtx, reflector: fmRefl } = createContext(
      baseOrgContext(MembershipRole.FACILITY_MANAGER),
      ['assets:create', 'assets:archive'],
    );
    const fmGuard = new PermissionsGuard(
      fmRefl,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );
    await expect(fmGuard.canActivate(fmCtx)).resolves.toBe(true);
  });

  it('reflects role downgrades immediately on the next evaluation', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const { context: beforeCtx, reflector: beforeRefl } = createContext(
      baseOrgContext(MembershipRole.FACILITY_MANAGER),
      ['sites:create'],
    );
    const guardBefore = new PermissionsGuard(
      beforeRefl,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );
    await expect(guardBefore.canActivate(beforeCtx)).resolves.toBe(true);

    const { context: afterCtx, reflector: afterRefl } = createContext(
      baseOrgContext(MembershipRole.VIEWER),
      ['sites:create'],
    );
    const guardAfter = new PermissionsGuard(
      afterRefl,
      authorizationService,
      { record } as unknown as AuditLogsService,
    );
    await expect(guardAfter.canActivate(afterCtx)).rejects.toMatchObject({
      code: ErrorCode.FORBIDDEN,
    });
  });
});
