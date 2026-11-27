import { describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { UserStatus } from '../generated/prisma/enums.js';
import { AuthService } from './auth.service.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { TokenCryptoService } from './token-crypto.service.js';

describe('User Story 3: Email Ownership Verification', () => {
  function createHarness() {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
        AUTH_ACCESS_TOKEN_SECRET: 'us3-test-secret-with-at-least-32-characters',
      }),
    );
    const hasher = new PasswordHasherService();
    const tokenCrypto = new TokenCryptoService(env);

    const users = new Map<string, any>([
      [
        'user-pending',
        {
          id: 'user-pending',
          email: 'pending@example.com',
          normalizedEmail: 'pending@example.com',
          displayName: 'Pending User',
          passwordHash: 'hash',
          status: UserStatus.PENDING_VERIFICATION,
          emailVerifiedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const tokens: any[] = [];
    const sentUrls: string[] = [];

    const prisma = {
      $transaction: async (fn: (tx: any) => Promise<any>) => fn({}),
    };

    const usersService = {
      normalizeEmail: (e: string) => e.trim().toLowerCase(),
      findByNormalizedEmail: vi.fn(async (n: string) =>
        [...users.values()].find((u) => u.normalizedEmail === n) ?? null,
      ),
      activateVerifiedUser: vi.fn(async (userId: string, now: Date) => {
        const u = users.get(userId);
        if (!u || u.status !== UserStatus.PENDING_VERIFICATION) return 0;
        u.status = UserStatus.ACTIVE;
        u.emailVerifiedAt = now;
        return 1;
      }),
      toSafeProfile: (u: any) => u,
    };

    const emailVerificationRepo = {
      issueForUser: vi.fn(async (input: any) => {
        const now = new Date();
        for (const t of tokens) {
          if (
            t.userId === input.userId &&
            t.usedAt === null &&
            t.invalidatedAt === null
          ) {
            t.invalidatedAt = now;
          }
        }
        const row = {
          id: `vt-${tokens.length + 1}`,
          userId: input.userId,
          tokenHash: input.tokenHash,
          expiresAt: input.expiresAt,
          usedAt: null,
          invalidatedAt: null,
          createdAt: now,
        };
        tokens.push(row);
        return row;
      }),
      consumeValidToken: vi.fn(async (tokenHash: string, now: Date) => {
        const row = tokens.find((t) => t.tokenHash === tokenHash);
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
      sendVerificationEmail: vi.fn(async (p: { verificationUrl: string }) => {
        sentUrls.push(p.verificationUrl);
      }),
      sendPasswordResetEmail: vi.fn(async () => undefined),
    };

    const auditLogsService = { record: vi.fn(async () => undefined) };

    const authService = new AuthService(
      env,
      prisma as any,
      usersService as any,
      {} as any,
      emailVerificationRepo as any,
      {} as any,
      hasher,
      tokenCrypto,
      auditLogsService as any,
      mailer as any,
    );

    return { authService, users, tokens, sentUrls };
  }

  it('invalidates prior unused verification links on resend and confirms newest link once', async () => {
    const h = createHarness();

    const r1 = await h.authService.resendVerification('pending@example.com');
    const r2 = await h.authService.resendVerification('pending@example.com');
    const rUnknown = await h.authService.resendVerification(
      'unknown@example.com',
    );

    expect(r1).toEqual(r2);
    expect(r1).toEqual(rUnknown);

    const token1 = new URL(h.sentUrls[0]).searchParams.get('token')!;
    const token2 = new URL(h.sentUrls[1]).searchParams.get('token')!;

    // Superseded token 1 must be rejected
    await expect(
      h.authService.confirmEmailVerification(token1),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_TOKEN });

    // Newest token 2 succeeds and transitions user to ACTIVE
    const confirmed = await h.authService.confirmEmailVerification(token2);
    expect(confirmed.verified).toBe(true);
    expect(h.users.get('user-pending').status).toBe(UserStatus.ACTIVE);
    expect(h.users.get('user-pending').emailVerifiedAt).toBeInstanceOf(Date);

    // Replaying used token 2 must be rejected
    await expect(
      h.authService.confirmEmailVerification(token2),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_TOKEN });
  });
});
