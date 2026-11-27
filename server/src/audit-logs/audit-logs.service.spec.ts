import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { runWithRequestContext } from '../logging/request-context.js';
import { AuditLogsService } from './audit-logs.service.js';

describe('AuditLogsService', () => {
  it('propagates RequestContext IDs, actorMembershipId, and strips sensitive keys from metadata', async () => {
    const createMock = vi.fn().mockResolvedValue({ id: 'audit-1' });
    const prisma = {
      auditLog: { create: createMock },
    } as unknown as PrismaService;

    const service = new AuditLogsService(prisma);

    await runWithRequestContext(
      { requestId: 'req_abc', correlationId: 'cor_xyz' },
      () =>
        service.record({
          action: 'MEMBERSHIP_ROLE_CHANGED',
          entityType: 'Membership',
          entityId: 'mem-target',
          organizationId: 'org-1',
          actorUserId: 'user-1',
          actorMembershipId: 'mem-actor',
          metadata: {
            previousRole: 'VIEWER',
            newRole: 'ENGINEER',
            password: 'super-secret-password',
            refreshToken: 'raw-refresh',
            invitationSecret: 'inv-secret',
            rawBody: { leaked: true },
            nested: {
              tokenHash: 'abcd',
              deviceCredential: 'dev-cred',
              safeCode: 'OK',
            },
          },
        }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        actorUserId: 'user-1',
        actorMembershipId: 'mem-actor',
        action: 'MEMBERSHIP_ROLE_CHANGED',
        entityType: 'Membership',
        entityId: 'mem-target',
        requestId: 'req_abc',
        correlationId: 'cor_xyz',
        metadata: {
          previousRole: 'VIEWER',
          newRole: 'ENGINEER',
          nested: {
            safeCode: 'OK',
          },
        },
      },
    });
  });
});
