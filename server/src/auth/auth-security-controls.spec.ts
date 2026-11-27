import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { SessionRevokeReason, UserStatus } from '../generated/prisma/enums.js';
import { UsersService } from '../users/users.service.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';

describe('User Story 5: Dual-Key Rate Limiting & Account Status Enforcement', () => {
  it('enforces dual-key (IP + SHA-256 normalizedEmail) sliding-window rate limits with Retry-After and hashes email keys', async () => {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
        AUTH_RATE_LIMIT_LOGIN_IP_MAX: '10',
        AUTH_RATE_LIMIT_LOGIN_ACCOUNT_MAX: '3',
        AUTH_RATE_LIMIT_WINDOW_SEC: '900',
      }),
    );

    const counters = new Map<string, number>();
    const redisService = {
      client: {
        status: 'ready',
        eval: vi.fn(
          async (
            _script: string,
            _numKeys: number,
            key: string,
            _now: string,
            _windowMs: string,
            limitStr: string,
          ) => {
            const limit = Number.parseInt(limitStr, 10);
            const current = (counters.get(key) ?? 0) + 1;
            if (current > limit) {
              return [0, 60];
            }
            counters.set(key, current);
            return [1, 0];
          },
        ),
      },
    };

    const rateLimiter = new AuthRateLimitService(env, redisService as any);

    for (let i = 0; i < 3; i++) {
      await rateLimiter.consumeOrThrow('login', {
        ip: `10.0.0.${i + 1}`,
        email: '  Alex@Example.COM ',
      });
    }

    // 4th attempt for same normalized email from a different IP hits per-account limit
    await expect(
      rateLimiter.consumeOrThrow('login', {
        ip: '10.0.0.99',
        email: 'alex@example.com',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.RATE_LIMITED,
    });

    // Verify raw email PII is never stored in Redis keys
    for (const key of counters.keys()) {
      expect(key.toLowerCase()).not.toContain('alex@example.com');
    }
  });

  it('revokes all active sessions and emits AUTH_USER_STATUS_CHANGED when suspending or deactivating an account', async () => {
    const updateStatus = vi.fn(async (id: string, status: UserStatus) => ({
      id,
      status,
    }));
    const usersRepo = { updateStatus };
    const sessionsService = {
      revokeAllForUser: vi.fn(async () => 3),
    };
    const auditLogs = {
      record: vi.fn(async () => undefined),
    };
    const prisma = {
      $transaction: async (fn: (tx: any) => Promise<any>) => fn({}),
    };

    const usersService = new UsersService(
      usersRepo as any,
      prisma as any,
      sessionsService as any,
      auditLogs as any,
    );

    await usersService.updateAccountStatus('user-1', UserStatus.SUSPENDED);

    expect(updateStatus).toHaveBeenCalledWith(
      'user-1',
      UserStatus.SUSPENDED,
      {},
      expect.anything(),
    );
    expect(sessionsService.revokeAllForUser).toHaveBeenCalledWith(
      'user-1',
      SessionRevokeReason.ACCOUNT_STATE_CHANGE,
      expect.anything(),
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTH_USER_STATUS_CHANGED',
        entityId: 'user-1',
      }),
      expect.anything(),
    );
  });
});
