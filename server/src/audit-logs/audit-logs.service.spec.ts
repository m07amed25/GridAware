import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../database/prisma.service.js';
import { runWithRequestContext } from '../logging/request-context.js';
import { AuditLogsService } from './audit-logs.service.js';

describe('AuditLogsService', () => {
  it('propagates RequestContext IDs and strips sensitive keys from metadata', async () => {
    const createMock = vi.fn().mockResolvedValue({ id: 'audit-1' });
    const prisma = {
      auditLog: { create: createMock },
    } as unknown as PrismaService;

    const service = new AuditLogsService(prisma);

    await runWithRequestContext(
      { requestId: 'req_abc', correlationId: 'cor_xyz' },
      () =>
        service.record({
          action: 'AUTH_LOGIN_FAILED',
          entityType: 'User',
          entityId: 'user-1',
          actorUserId: 'user-1',
          metadata: {
            reason: 'INVALID_CREDENTIALS',
            password: 'super-secret-password',
            refreshToken: 'raw-refresh',
            nested: {
              tokenHash: 'abcd',
              safeCode: 'OK',
            },
          },
        }),
    );

    expect(createMock).toHaveBeenCalledWith({
      data: {
        organizationId: null,
        actorUserId: 'user-1',
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: 'user-1',
        requestId: 'req_abc',
        correlationId: 'cor_xyz',
        metadata: {
          reason: 'INVALID_CREDENTIALS',
          nested: {
            safeCode: 'OK',
          },
        },
      },
    });
  });
});
