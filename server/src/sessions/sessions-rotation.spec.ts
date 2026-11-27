import { describe, expect, it, vi } from 'vitest';
import { TokenCryptoService } from '../auth/token-crypto.service.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { SessionRevokeReason, UserStatus } from '../generated/prisma/enums.js';
import { SessionsService } from './sessions.service.js';

describe('User Story 2: Refresh Rotation, Replay Detection & Session Management', () => {
  function createHarness(maxActiveSessions = 10) {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
        AUTH_ACCESS_TOKEN_SECRET: 'us2-test-secret-with-at-least-32-characters',
        AUTH_MAX_ACTIVE_SESSIONS: String(maxActiveSessions),
      }),
    );
    const tokenCrypto = new TokenCryptoService(env);
    const sessions = new Map<string, any>();
    const users = new Map<string, any>([
      [
        'user-a',
        {
          id: 'user-a',
          email: 'a@example.com',
          status: UserStatus.ACTIVE,
        },
      ],
      [
        'user-b',
        {
          id: 'user-b',
          email: 'b@example.com',
          status: UserStatus.ACTIVE,
        },
      ],
    ]);
    const auditLogs: any[] = [];

    const prisma = {
      $transaction: async (fn: (tx: any) => Promise<any>) => fn({}),
    };

    const sessionsRepo = {
      create: vi.fn(async (data: any) => {
        const id = `11111111-1111-4111-8111-${String(sessions.size + 1).padStart(12, '0')}`;
        const row = {
          id,
          ...data,
          revokedAt: null,
          revokedReason: null,
          createdAt: new Date(Date.now() + sessions.size),
          updatedAt: new Date(),
        };
        sessions.set(id, row);
        return row;
      }),
      findById: vi.fn(async (id: string) => sessions.get(id) ?? null),
      findByIdWithUser: vi.fn(async (id: string) => {
        const s = sessions.get(id);
        if (!s) return null;
        return { ...s, user: users.get(s.userId) };
      }),
      findActiveByUserOrderedLru: vi.fn(async (userId: string, now: Date) =>
        [...sessions.values()]
          .filter(
            (s) =>
              s.userId === userId &&
              s.revokedAt === null &&
              s.idleExpiresAt > now &&
              s.absoluteExpiresAt > now,
          )
          .sort(
            (a, b) =>
              a.lastUsedAt.getTime() - b.lastUsedAt.getTime() ||
              a.createdAt.getTime() - b.createdAt.getTime(),
          ),
      ),
      revokeManyByIds: vi.fn(
        async (ids: string[], reason: SessionRevokeReason, now: Date) => {
          let count = 0;
          for (const id of ids) {
            const s = sessions.get(id);
            if (s && s.revokedAt === null) {
              s.revokedAt = now;
              s.revokedReason = reason;
              count += 1;
            }
          }
          return count;
        },
      ),
      rotateIfHashMatches: vi.fn(
        async (
          id: string,
          expectedHash: string,
          data: {
            refreshTokenHash: string;
            lastUsedAt: Date;
            idleExpiresAt: Date;
          },
        ) => {
          const s = sessions.get(id);
          if (!s || s.revokedAt !== null || s.refreshTokenHash !== expectedHash) {
            return 0;
          }
          s.refreshTokenHash = data.refreshTokenHash;
          s.lastUsedAt = data.lastUsedAt;
          s.idleExpiresAt = data.idleExpiresAt;
          return 1;
        },
      ),
      revokeById: vi.fn(
        async (id: string, userId: string, reason: SessionRevokeReason, now: Date) => {
          const s = sessions.get(id);
          if (!s || s.userId !== userId || s.revokedAt !== null) return 0;
          s.revokedAt = now;
          s.revokedReason = reason;
          return 1;
        },
      ),
      revokeAllForUser: vi.fn(
        async (userId: string, reason: SessionRevokeReason, now: Date) => {
          let count = 0;
          for (const s of sessions.values()) {
            if (s.userId === userId && s.revokedAt === null) {
              s.revokedAt = now;
              s.revokedReason = reason;
              count += 1;
            }
          }
          return count;
        },
      ),
    };

    const auditLogsService = {
      record: vi.fn(async (entry: any) => {
        auditLogs.push(entry);
      }),
    };

    const service = new SessionsService(
      env,
      sessionsRepo as any,
      tokenCrypto,
      auditLogsService as any,
      prisma as any,
    );

    return { service, sessions, users, auditLogs };
  }

  it('rotates refresh token atomically and immediately revokes session on superseded token replay', async () => {
    const h = createHarness();
    const initial = await h.service.createSessionForLogin({
      userId: 'user-a',
      userAgent: 'Tab1',
    });

    const rotated = await h.service.rotateSession(initial.refreshToken);
    expect(rotated.refreshToken).not.toBe(initial.refreshToken);
    expect(rotated.session.idleExpiresAt.getTime()).toBeLessThanOrEqual(
      rotated.session.absoluteExpiresAt.getTime(),
    );

    // Replay superseded token -> immediate TOKEN_REUSE revocation
    await expect(
      h.service.rotateSession(initial.refreshToken),
    ).rejects.toMatchObject({ code: ErrorCode.SESSION_EXPIRED });

    expect(h.sessions.get(initial.session.id).revokedReason).toBe(
      SessionRevokeReason.TOKEN_REUSE,
    );
    expect(
      h.auditLogs.some((a) => a.action === 'AUTH_SESSION_REUSE_DETECTED'),
    ).toBe(true);

    // Even the newer rotated token is now rejected because the session is revoked
    await expect(
      h.service.rotateSession(rotated.refreshToken),
    ).rejects.toMatchObject({ code: ErrorCode.SESSION_EXPIRED });
  });

  it('evicts the least-recently-used session when exceeding max active sessions (10)', async () => {
    const h = createHarness(10);
    const createdIds: string[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await h.service.createSessionForLogin({
        userId: 'user-a',
        userAgent: `Client-${i}`,
      });
      createdIds.push(res.session.id);
    }

    const active = await h.service.listActiveSessions('user-a');
    expect(active).toHaveLength(10);
    expect(h.sessions.get(createdIds[0]).revokedReason).toBe(
      SessionRevokeReason.MAX_SESSIONS_EVICTED,
    );
  });

  it('isolates session deletion across users and revokes all sessions on logout-all', async () => {
    const h = createHarness();
    const sessA1 = await h.service.createSessionForLogin({ userId: 'user-a' });
    const sessA2 = await h.service.createSessionForLogin({ userId: 'user-a' });

    const deletedByB = await h.service.revokeSessionById(
      sessA1.session.id,
      'user-b',
      SessionRevokeReason.USER_SESSION_REVOKE,
    );
    expect(deletedByB).toBe(false);
    expect(h.sessions.get(sessA1.session.id).revokedAt).toBeNull();

    const revokedCount = await h.service.revokeAllForUser(
      'user-a',
      SessionRevokeReason.USER_LOGOUT_ALL,
    );
    expect(revokedCount).toBe(2);
    expect(h.sessions.get(sessA2.session.id).revokedReason).toBe(
      SessionRevokeReason.USER_LOGOUT_ALL,
    );
  });
});
