import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { SessionRevokeReason, UserStatus } from '../generated/prisma/enums.js';
import { AuthService } from './auth.service.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { TokenCryptoService } from './token-crypto.service.js';

describe('User Story 4: Password Reset & Mass Session Revocation', () => {
  function createHarness() {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
        AUTH_ACCESS_TOKEN_SECRET: 'us4-test-secret-with-at-least-32-characters',
      }),
    );
    const hasher = new PasswordHasherService();
    const tokenCrypto = new TokenCryptoService(env);

    const users = new Map<string, any>([
      [
        'user-1',
        {
          id: 'user-1',
          email: 'alex@example.com',
          normalizedEmail: 'alex@example.com',
          displayName: 'Alex',
          passwordHash: 'old-hash',
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const resetTokens: any[] = [];
    const sentUrls: string[] = [];
    const revokedAllCalls: any[] = [];

    const prisma = {
      $transaction: async (fn: (tx: any) => Promise<any>) => fn({}),
    };

    const usersService = {
      normalizeEmail: (e: string) => e.trim().toLowerCase(),
      findByNormalizedEmail: vi.fn(async (n: string) =>
        [...users.values()].find((u) => u.normalizedEmail === n) ?? null,
      ),
      updatePasswordHash: vi.fn(async (userId: string, nextHash: string) => {
        users.get(userId).passwordHash = nextHash;
      }),
    };

    const sessionsService = {
      revokeAllForUser: vi.fn(
        async (userId: string, reason: SessionRevokeReason) => {
          revokedAllCalls.push({ userId, reason });
          return 2;
        },
      ),
    };

    const passwordResetRepo = {
      issueForUser: vi.fn(async (input: any) => {
        const now = new Date();
        for (const t of resetTokens) {
          if (
            t.userId === input.userId &&
            t.usedAt === null &&
            t.invalidatedAt === null
          ) {
            t.invalidatedAt = now;
          }
        }
        const row = {
          id: `prt-${resetTokens.length + 1}`,
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          usedAt: null,
          invalidatedAt: null,
          createdAt: now,
        };
        resetTokens.push(row);
        return row;
      }),
      consumeValidToken: vi.fn(async (tokenHash: string, now: Date) => {
        const row = resetTokens.find((t) => t.tokenHash === tokenHash);
        if (
          !row ||
          row.usedAt !== null ||
          row.invalidatedAt !== null ||
          row.expiresAt <= now
        ) {
          return null;
        }
        row.usedAt = now;
        return row;
      }),
    };

    const mailer = {
      sendVerificationEmail: vi.fn(async () => undefined),
      sendPasswordResetEmail: vi.fn(async (p: { resetUrl: string }) => {
        sentUrls.push(p.resetUrl);
      }),
    };

    const auditLogsService = { record: vi.fn(async () => undefined) };

    const authService = new AuthService(
      env,
      prisma as any,
      usersService as any,
      sessionsService as any,
      {} as any,
      passwordResetRepo as any,
      hasher,
      tokenCrypto,
      auditLogsService as any,
      mailer as any,
    );

    return {
      authService,
      users,
      sentUrls,
      revokedAllCalls,
      hasher,
    };
  }

  it('returns identical non-enumerating 202 response, invalidates superseded reset links, updates password, and revokes all sessions', async () => {
    const h = createHarness();

    const rKnown = await h.authService.requestPasswordReset('alex@example.com');
    const rKnown2 = await h.authService.requestPasswordReset('alex@example.com');
    const rUnknown = await h.authService.requestPasswordReset(
      'unknown@example.com',
    );

    expect(rKnown).toEqual(rKnown2);
    expect(rKnown).toEqual(rUnknown);
    expect(h.sentUrls).toHaveLength(2);

    const t1 = new URL(h.sentUrls[0]).searchParams.get('token')!;
    const t2 = new URL(h.sentUrls[1]).searchParams.get('token')!;

    await expect(
      h.authService.confirmPasswordReset(t1, 'new-very-strong-passphrase'),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_TOKEN });

    const res = await h.authService.confirmPasswordReset(
      t2,
      'new-very-strong-passphrase',
    );
    expect(res.reset).toBe(true);
    expect(
      await h.hasher.verify(
        h.users.get('user-1').passwordHash,
        'new-very-strong-passphrase',
      ),
    ).toBe(true);
    expect(h.revokedAllCalls).toEqual([
      { userId: 'user-1', reason: SessionRevokeReason.PASSWORD_RESET },
    ]);

    // Replay T2 fails
    await expect(
      h.authService.confirmPasswordReset(t2, 'another-strong-passphrase'),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_TOKEN });
  });
});
