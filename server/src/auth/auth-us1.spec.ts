import { describe, expect, it, vi } from 'vitest';
import { AppException } from '../common/exceptions/app.exception.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { SessionRevokeReason, UserStatus } from '../generated/prisma/enums.js';
import { AuthService } from './auth.service.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { TokenCryptoService } from './token-crypto.service.js';

describe('User Story 1: Registration, Sign-In, Profile & Sign-Out', () => {
  function createHarness() {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
        AUTH_ACCESS_TOKEN_SECRET: 'us1-test-secret-with-at-least-32-characters',
      }),
    );

    const hasher = new PasswordHasherService();
    const tokenCrypto = new TokenCryptoService(env);

    const users = new Map<string, any>();
    const sessions = new Map<string, any>();
    const verificationTokens: any[] = [];
    const auditLogs: any[] = [];

    const prisma = {
      $transaction: async (fn: (tx: any) => Promise<any>) => fn({}),
    };

    const usersService = {
      normalizeEmail: (email: string) => email.trim().toLowerCase(),
      findByNormalizedEmail: vi.fn(async (normalized: string) =>
        [...users.values()].find((u) => u.normalizedEmail === normalized) ?? null,
      ),
      findById: vi.fn(async (id: string) => users.get(id) ?? null),
      createPendingUser: vi.fn(
        async (input: {
          email: string;
          displayName: string;
          passwordHash: string;
        }) => {
          const normalizedEmail = input.email.trim().toLowerCase();
          const existing = [...users.values()].find(
            (u) => u.normalizedEmail === normalizedEmail,
          );
          if (existing) {
            throw AppException.emailUnavailable();
          }
          const user = {
            id: `00000000-0000-4000-8000-${String(users.size + 1).padStart(12, '0')}`,
            email: input.email.trim(),
            normalizedEmail,
            displayName: input.displayName.trim(),
            passwordHash: input.passwordHash,
            status: UserStatus.PENDING_VERIFICATION,
            emailVerifiedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          users.set(user.id, user);
          return user;
        },
      ),
      toSafeProfile: (user: any) => ({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        status: user.status,
        emailVerified: user.emailVerifiedAt !== null,
        emailVerifiedAt: user.emailVerifiedAt
          ? user.emailVerifiedAt.toISOString()
          : null,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      }),
    };

    const sessionsService = {
      createSessionForLogin: vi.fn(
        async (input: {
          userId: string;
          userAgent?: string;
          ipAddress?: string;
        }) => {
          const id = `11111111-1111-4111-8111-${String(sessions.size + 1).padStart(12, '0')}`;
          const secret = tokenCrypto.generateRandomToken();
          const now = new Date();
          const session = {
            id,
            userId: input.userId,
            refreshTokenHash: tokenCrypto.sha256Hex(secret),
            userAgent: input.userAgent ?? null,
            ipHash: null,
            lastUsedAt: now,
            idleExpiresAt: new Date(now.getTime() + 14 * 86400 * 1000),
            absoluteExpiresAt: new Date(now.getTime() + 30 * 86400 * 1000),
            revokedAt: null,
            revokedReason: null,
            createdAt: now,
            updatedAt: now,
          };
          sessions.set(id, session);
          return {
            session,
            refreshToken: tokenCrypto.formatSessionToken(id, secret),
          };
        },
      ),
      revokeSessionById: vi.fn(
        async (
          sessionId: string,
          userId: string,
          reason: SessionRevokeReason,
        ) => {
          const s = sessions.get(sessionId);
          if (!s || s.userId !== userId || s.revokedAt) {
            return false;
          }
          s.revokedAt = new Date();
          s.revokedReason = reason;
          return true;
        },
      ),
    };

    const emailVerificationRepo = {
      issueForUser: vi.fn(async (input: any) => {
        verificationTokens.push(input);
        return { id: 'vt-1' };
      }),
    };

    const passwordResetRepo = {};

    const auditLogsService = {
      record: vi.fn(async (entry: any) => {
        auditLogs.push(entry);
      }),
    };

    const mailer = {
      sendVerificationEmail: vi.fn(async () => undefined),
      sendPasswordResetEmail: vi.fn(async () => undefined),
    };

    const authService = new AuthService(
      env,
      prisma as any,
      usersService as any,
      sessionsService as any,
      emailVerificationRepo as any,
      passwordResetRepo as any,
      hasher,
      tokenCrypto,
      auditLogsService as any,
      mailer as any,
    );

    return {
      authService,
      users,
      sessions,
      auditLogs,
      mailer,
      hasher,
    };
  }

  it('normalizes email on registration, creates PENDING_VERIFICATION user, and rejects case-varied duplicates', async () => {
    const h = createHarness();
    const res = await h.authService.register({
      email: '  Alex@Example.COM  ',
      password: 'correct-horse-battery-staple',
      displayName: '  Alex Morgan  ',
    });

    expect(res.user.email).toBe('Alex@Example.COM');
    expect(res.user.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(res.user.emailVerified).toBe(false);
    expect((res.user as any).passwordHash).toBeUndefined();
    expect(h.mailer.sendVerificationEmail).toHaveBeenCalledTimes(1);

    await expect(
      h.authService.register({
        email: 'alex@example.com',
        password: 'another-long-passphrase',
        displayName: 'Duplicate',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.EMAIL_UNAVAILABLE,
    });
  });

  it('blocks PENDING_VERIFICATION sign-in with ACCOUNT_NOT_ACTIVE and uses identical INVALID_CREDENTIALS for unknown email vs wrong password', async () => {
    const h = createHarness();
    const { user } = await h.authService.register({
      email: 'alex@example.com',
      password: 'correct-horse-battery-staple',
      displayName: 'Alex Morgan',
    });

    await expect(
      h.authService.login({
        email: 'alex@example.com',
        password: 'correct-horse-battery-staple',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.ACCOUNT_NOT_ACTIVE,
    });

    // Activate user
    h.users.get(user.id).status = UserStatus.ACTIVE;
    h.users.get(user.id).emailVerifiedAt = new Date();

    const dummySpy = vi.spyOn(h.hasher, 'verifyDummy');
    let unknownErr: unknown;
    try {
      await h.authService.login({
        email: 'nobody@example.com',
        password: 'wrong-password-123',
      });
    } catch (e) {
      unknownErr = e;
    }
    expect(dummySpy).toHaveBeenCalledTimes(1);

    let wrongPwErr: unknown;
    try {
      await h.authService.login({
        email: 'alex@example.com',
        password: 'wrong-password-123',
      });
    } catch (e) {
      wrongPwErr = e;
    }

    expect(unknownErr).toBeInstanceOf(AppException);
    expect(wrongPwErr).toBeInstanceOf(AppException);
    expect((unknownErr as AppException).code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect((wrongPwErr as AppException).code).toBe(ErrorCode.INVALID_CREDENTIALS);
    expect((unknownErr as AppException).detail).toBe(
      (wrongPwErr as AppException).detail,
    );
  });

  it('signs in ACTIVE user, returns safe profile, and revokes current session on logout', async () => {
    const h = createHarness();
    const { user } = await h.authService.register({
      email: 'alex@example.com',
      password: 'correct-horse-battery-staple',
      displayName: 'Alex Morgan',
    });
    h.users.get(user.id).status = UserStatus.ACTIVE;
    h.users.get(user.id).emailVerifiedAt = new Date();

    const loginResult = await h.authService.login({
      email: 'ALEX@example.com',
      password: 'correct-horse-battery-staple',
      userAgent: 'Vitest/1.0',
    });

    expect(loginResult.accessToken).toBeTypeOf('string');
    expect(loginResult.refreshToken).toContain('.');
    expect(loginResult.user.status).toBe(UserStatus.ACTIVE);

    const profile = await h.authService.getMe(user.id);
    expect(profile.email).toBe('alex@example.com');
    expect((profile as any).passwordHash).toBeUndefined();

    await h.authService.logout(loginResult.sessionId, user.id);
    const storedSession = h.sessions.get(loginResult.sessionId);
    expect(storedSession.revokedAt).toBeInstanceOf(Date);
    expect(storedSession.revokedReason).toBe(SessionRevokeReason.USER_LOGOUT);
  });
});
