import { type INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ErrorCode } from '../src/common/exceptions/error-codes.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { UserStatus } from '../src/generated/prisma/enums.js';
import { AppLogger } from '../src/logging/app-logger.service.js';
import { MAILER_PORT } from '../src/mail/mailer.port.js';
import { MqttService } from '../src/mqtt/mqtt.service.js';
import { RedisService } from '../src/redis/redis.service.js';

function createInMemoryPrisma() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const emailTokens = new Map<string, any>();
  const resetTokens = new Map<string, any>();
  const auditLogs: any[] = [];

  const client: any = {
    isHealthy: vi.fn().mockResolvedValue(true),
    $transaction: async (fn: (tx: any) => Promise<any>) => fn(client),
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return users.get(where.id) ?? null;
        if (where.normalizedEmail) {
          return (
            [...users.values()].find(
              (u) => u.normalizedEmail === where.normalizedEmail,
            ) ?? null
          );
        }
        return null;
      },
      create: async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: randomUUID(),
          emailVerifiedAt: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        users.set(row.id, row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const existing = users.get(where.id);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        users.set(where.id, updated);
        return updated;
      },
    },
    authSession: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: randomUUID(),
          revokedAt: null,
          revokedReason: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        sessions.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }: any) => {
        const s = sessions.get(where.id) ?? null;
        if (!s) return null;
        if (include?.user) {
          return { ...s, user: users.get(s.userId) };
        }
        return s;
      },
      findMany: async ({ where, orderBy }: any) => {
        const list = [...sessions.values()].filter(
          (s) =>
            s.userId === where.userId &&
            (where.revokedAt === undefined || s.revokedAt === where.revokedAt) &&
            (!where.idleExpiresAt?.gt || s.idleExpiresAt > where.idleExpiresAt.gt) &&
            (!where.absoluteExpiresAt?.gt ||
              s.absoluteExpiresAt > where.absoluteExpiresAt.gt),
        );
        if (orderBy) {
          list.sort(
            (a, b) =>
              a.lastUsedAt.getTime() - b.lastUsedAt.getTime() ||
              a.createdAt.getTime() - b.createdAt.getTime(),
          );
        }
        return list;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const s of sessions.values()) {
          if (where.id && typeof where.id === 'string' && s.id !== where.id) continue;
          if (where.id?.in && !where.id.in.includes(s.id)) continue;
          if (where.userId && s.userId !== where.userId) continue;
          if (where.revokedAt === null && s.revokedAt !== null) continue;
          if (
            where.refreshTokenHash &&
            s.refreshTokenHash !== where.refreshTokenHash
          ) {
            continue;
          }
          Object.assign(s, data, { updatedAt: new Date() });
          count += 1;
        }
        return { count };
      },
    },
    emailVerificationToken: {
      findUnique: async ({ where }: any) =>
        [...emailTokens.values()].find(
          (t) => t.tokenHash === where.tokenHash,
        ) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          usedAt: null,
          invalidatedAt: null,
          createdAt: new Date(),
          ...data,
        };
        emailTokens.set(row.id, row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const t of emailTokens.values()) {
          if (where.id && t.id !== where.id) continue;
          if (where.userId && t.userId !== where.userId) continue;
          if (where.usedAt === null && t.usedAt !== null) continue;
          if (where.invalidatedAt === null && t.invalidatedAt !== null) continue;
          if (where.expiresAt?.gt && t.expiresAt <= where.expiresAt.gt) continue;
          Object.assign(t, data);
          count += 1;
        }
        return { count };
      },
    },
    passwordResetToken: {
      findUnique: async ({ where }: any) =>
        [...resetTokens.values()].find(
          (t) => t.tokenHash === where.tokenHash,
        ) ?? null,
      create: async ({ data }: any) => {
        const row = {
          id: randomUUID(),
          usedAt: null,
          invalidatedAt: null,
          createdAt: new Date(),
          ...data,
        };
        resetTokens.set(row.id, row);
        return row;
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const t of resetTokens.values()) {
          if (where.id && t.id !== where.id) continue;
          if (where.userId && t.userId !== where.userId) continue;
          if (where.usedAt === null && t.usedAt !== null) continue;
          if (where.invalidatedAt === null && t.invalidatedAt !== null) continue;
          if (where.expiresAt?.gt && t.expiresAt <= where.expiresAt.gt) continue;
          Object.assign(t, data);
          count += 1;
        }
        return { count };
      },
    },
    auditLog: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), occurredAt: new Date(), ...data };
        auditLogs.push(row);
        return row;
      },
    },
  };

  return { client, users, sessions, auditLogs };
}

function extractCookie(setCookies: string[] | undefined, name: string): string {
  const match = (setCookies ?? []).find((c) => c.startsWith(`${name}=`));
  if (!match) return '';
  return decodeURIComponent(match.split(';')[0].slice(name.length + 1));
}

describe('Phase 5.1 Auth & Identity E2E (HTTP + Cookie + CSRF + Security)', () => {
  let app: INestApplication<App>;
  let db: ReturnType<typeof createInMemoryPrisma>;
  let sentVerificationUrls: string[];
  let sentResetUrls: string[];

  beforeEach(async () => {
    db = createInMemoryPrisma();
    sentVerificationUrls = [];
    sentResetUrls = [];

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(db.client)
      .overrideProvider(RedisService)
      .useValue({
        isHealthy: vi.fn().mockResolvedValue(true),
        client: { status: 'wait' },
      })
      .overrideProvider(MqttService)
      .useValue({
        isHealthy: vi.fn().mockReturnValue(true),
        subscribe: vi.fn(),
        publish: vi.fn(),
      })
      .overrideProvider(MAILER_PORT)
      .useValue({
        sendVerificationEmail: vi.fn(async (p: { verificationUrl: string }) => {
          sentVerificationUrls.push(p.verificationUrl);
        }),
        sendPasswordResetEmail: vi.fn(async (p: { resetUrl: string }) => {
          sentResetUrls.push(p.resetUrl);
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(AppLogger));
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('completes register -> verify -> login -> /me -> refresh -> replay revocation -> password reset -> logout', async () => {
    const server = app.getHttpServer();

    // 1. Bootstrap CSRF cookie
    const csrfRes = await request(server).get('/api/v1/auth/csrf').expect(200);
    const csrfToken = csrfRes.body.data.csrfToken as string;

    // 2. Register
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: '  Alex@Example.COM ',
        password: 'correct-horse-battery-staple',
        displayName: 'Alex Morgan',
      })
      .expect(201);

    expect(regRes.body.data.user.status).toBe(UserStatus.PENDING_VERIFICATION);
    expect(regRes.body.data.user.passwordHash).toBeUndefined();

    // 3. Blocked login before verification
    const unverifiedLogin = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'alex@example.com',
        password: 'correct-horse-battery-staple',
      })
      .expect(403);
    expect(unverifiedLogin.body.code).toBe(ErrorCode.ACCOUNT_NOT_ACTIVE);

    // 4. Confirm email verification
    const verifyToken = new URL(sentVerificationUrls[0]).searchParams.get('token')!;
    await request(server)
      .post('/api/v1/auth/email-verification/confirm')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({ token: verifyToken })
      .expect(200);

    // 5. Login succeeds and sets HttpOnly cookies
    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrfToken}`])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'alex@example.com',
        password: 'correct-horse-battery-staple',
      })
      .expect(200);

    const setCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const access1 = extractCookie(setCookies, 'ga_access');
    const refresh1 = extractCookie(setCookies, 'ga_refresh');
    const csrf1 = extractCookie(setCookies, 'ga_csrf');
    expect(access1.length).toBeGreaterThan(20);
    expect(refresh1).toContain('.');

    // 6. GET /auth/me & GET /me
    const meRes = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', [`ga_access=${access1}`])
      .expect(200);
    expect(meRes.body.data.user.email).toBe('Alex@Example.COM');

    const aliasRes = await request(server)
      .get('/api/v1/me')
      .set('Cookie', [`ga_access=${access1}`])
      .expect(200);
    expect(aliasRes.body.data.memberships).toEqual([]);

    // 7. Refresh rotation + replay detection
    const refreshRes = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_refresh=${refresh1}`, `ga_csrf=${csrf1}`])
      .set('X-CSRF-Token', csrf1)
      .expect(200);

    const refreshCookies = refreshRes.headers['set-cookie'] as unknown as string[];
    const refresh2 = extractCookie(refreshCookies, 'ga_refresh');
    const csrf2 = extractCookie(refreshCookies, 'ga_csrf');
    expect(refresh2).not.toBe(refresh1);

    // Replay superseded refresh1 -> 401 SESSION_EXPIRED & session revoked
    const replayRes = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_refresh=${refresh1}`, `ga_csrf=${csrf2}`])
      .set('X-CSRF-Token', csrf2)
      .expect(401);
    expect(replayRes.body.code).toBe(ErrorCode.SESSION_EXPIRED);

    // 8. CSRF rejection on disallowed origin (even before session auth)
    const csrfFail = await request(server)
      .post('/api/v1/auth/logout')
      .set('Origin', 'https://evil.example.com')
      .set('Cookie', [`ga_access=${access1}`, `ga_csrf=${csrf2}`])
      .set('X-CSRF-Token', csrf2)
      .expect(403);
    expect(csrfFail.body.code).toBe(ErrorCode.CSRF_INVALID);

    // Sign in again to hold an active session before password reset
    const login2Res = await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrf2}`])
      .set('X-CSRF-Token', csrf2)
      .send({
        email: 'alex@example.com',
        password: 'correct-horse-battery-staple',
      })
      .expect(200);
    const access2 = extractCookie(
      login2Res.headers['set-cookie'] as unknown as string[],
      'ga_access',
    );

    // 9. Password reset revokes all sessions
    await request(server)
      .post('/api/v1/auth/password-reset/request')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrf2}`])
      .set('X-CSRF-Token', csrf2)
      .send({ email: 'alex@example.com' })
      .expect(202);

    const resetToken = new URL(sentResetUrls[0]).searchParams.get('token')!;
    await request(server)
      .post('/api/v1/auth/password-reset/confirm')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_csrf=${csrf2}`])
      .set('X-CSRF-Token', csrf2)
      .send({
        token: resetToken,
        newPassword: 'brand-new-strong-passphrase',
      })
      .expect(200);

    // Active session access2 is now rejected because password reset revoked all sessions
    await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', [`ga_access=${access2}`])
      .expect(401);

    // 10. Verify zero secret leakage in audit logs
    const serializedLogs = JSON.stringify(db.auditLogs);
    expect(serializedLogs).not.toContain('correct-horse-battery-staple');
    expect(serializedLogs).not.toContain('brand-new-strong-passphrase');
    expect(serializedLogs).not.toContain(refresh1);
    expect(serializedLogs).not.toContain(refresh2);
  });

  it('enforces cross-user session isolation, CORS headers, mid-session suspension, resend, and logout-all', async () => {
    const server = app.getHttpServer();
    const csrfRes = await request(server).get('/api/v1/auth/csrf').expect(200);
    const csrf = csrfRes.body.data.csrfToken as string;

    async function createVerifiedUser(email: string, displayName: string) {
      await request(server)
        .post('/api/v1/auth/register')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', [`ga_csrf=${csrf}`])
        .set('X-CSRF-Token', csrf)
        .send({
          email,
          password: 'correct-horse-battery-staple',
          displayName,
        })
        .expect(201);

      // Resend verification email (non-enumerating 202)
      await request(server)
        .post('/api/v1/auth/email-verification/resend')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', [`ga_csrf=${csrf}`])
        .set('X-CSRF-Token', csrf)
        .send({ email })
        .expect(202);

      // Confirm with the newest verification link
      const latestUrl = sentVerificationUrls[sentVerificationUrls.length - 1];
      const verifyToken = new URL(latestUrl).searchParams.get('token')!;
      await request(server)
        .post('/api/v1/auth/email-verification/confirm')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', [`ga_csrf=${csrf}`])
        .set('X-CSRF-Token', csrf)
        .send({ token: verifyToken })
        .expect(200);

      const loginRes = await request(server)
        .post('/api/v1/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Cookie', [`ga_csrf=${csrf}`])
        .set('X-CSRF-Token', csrf)
        .send({ email, password: 'correct-horse-battery-staple' })
        .expect(200);

      const cookies = loginRes.headers['set-cookie'] as unknown as string[];
      return {
        userId: loginRes.body.data.user.id as string,
        access: extractCookie(cookies, 'ga_access'),
        refresh: extractCookie(cookies, 'ga_refresh'),
        csrf: extractCookie(cookies, 'ga_csrf'),
        corsOrigin: loginRes.headers['access-control-allow-origin'],
        corsCreds: loginRes.headers['access-control-allow-credentials'],
      };
    }

    const alice = await createVerifiedUser('alice@example.com', 'Alice One');
    const bob = await createVerifiedUser('bob@example.com', 'Bob Two');

    // CORS headers reflect allowlisted origin with credentials
    expect(alice.corsOrigin).toBe('http://localhost:3000');
    expect(alice.corsCreds).toBe('true');

    // Disallowed origin is never reflected or wildcarded in ACAO header
    const badOriginRes = await request(server)
      .get('/api/v1/auth/csrf')
      .set('Origin', 'https://untrusted.example.com')
      .expect(200);
    expect(badOriginRes.headers['access-control-allow-origin']).not.toBe(
      'https://untrusted.example.com',
    );
    expect(badOriginRes.headers['access-control-allow-origin']).not.toBe('*');

    // Fetch Bob's session id
    const bobSessions = await request(server)
      .get('/api/v1/auth/sessions')
      .set('Cookie', [`ga_access=${bob.access}`])
      .expect(200);
    const bobSessionId = bobSessions.body.data.sessions[0].id as string;

    // Cross-user isolation: Alice cannot revoke Bob's session -> 404
    const crossRevoke = await request(server)
      .delete(`/api/v1/auth/sessions/${bobSessionId}`)
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_access=${alice.access}`, `ga_csrf=${alice.csrf}`])
      .set('X-CSRF-Token', alice.csrf)
      .expect(404);
    expect(crossRevoke.body.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);

    // Bob's session remains valid
    await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', [`ga_access=${bob.access}`])
      .expect(200);

    // Mid-session SUSPENDED transition blocks Bob on /auth/me and /auth/refresh
    const bobUser = db.users.get(bob.userId);
    bobUser.status = UserStatus.SUSPENDED;

    const suspendedMe = await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', [`ga_access=${bob.access}`])
      .expect(403);
    expect(suspendedMe.body.code).toBe(ErrorCode.ACCOUNT_NOT_ACTIVE);

    const suspendedRefresh = await request(server)
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_refresh=${bob.refresh}`, `ga_csrf=${bob.csrf}`])
      .set('X-CSRF-Token', bob.csrf)
      .expect(403);
    expect(suspendedRefresh.body.code).toBe(ErrorCode.ACCOUNT_NOT_ACTIVE);

    // Alice signs out of all sessions
    const logoutAllRes = await request(server)
      .post('/api/v1/auth/logout-all')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_access=${alice.access}`, `ga_csrf=${alice.csrf}`])
      .set('X-CSRF-Token', alice.csrf)
      .expect(200);
    expect(logoutAllRes.body.data.revokedCount).toBeGreaterThanOrEqual(1);

    await request(server)
      .get('/api/v1/auth/me')
      .set('Cookie', [`ga_access=${alice.access}`])
      .expect(401);
  });

  it('meets warm-request p95 < 300ms latency target on GET /auth/me, GET /auth/sessions, and POST /auth/logout', async () => {
    const server = app.getHttpServer();
    const csrfRes = await request(server).get('/api/v1/auth/csrf').expect(200);
    const csrf = csrfRes.body.data.csrfToken as string;

    await request(server)
      .post('/api/v1/auth/register')
      .set('Cookie', [`ga_csrf=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'perf@example.com',
        password: 'correct-horse-battery-staple',
        displayName: 'Perf User',
      })
      .expect(201);

    const verifyToken = new URL(sentVerificationUrls[0]).searchParams.get('token')!;
    await request(server)
      .post('/api/v1/auth/email-verification/confirm')
      .set('Cookie', [`ga_csrf=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .send({ token: verifyToken })
      .expect(200);

    const loginRes = await request(server)
      .post('/api/v1/auth/login')
      .set('Cookie', [`ga_csrf=${csrf}`])
      .set('X-CSRF-Token', csrf)
      .send({
        email: 'perf@example.com',
        password: 'correct-horse-battery-staple',
      })
      .expect(200);

    const loginCookies = loginRes.headers['set-cookie'] as unknown as string[];
    const access = extractCookie(loginCookies, 'ga_access');
    const loginCsrf = extractCookie(loginCookies, 'ga_csrf');

    const samples: number[] = [];
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      await request(server)
        .get('/api/v1/auth/me')
        .set('Cookie', [`ga_access=${access}`])
        .expect(200);
      await request(server)
        .get('/api/v1/auth/sessions')
        .set('Cookie', [`ga_access=${access}`])
        .expect(200);
      samples.push(performance.now() - start);
    }

    const logoutStart = performance.now();
    await request(server)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:3000')
      .set('Cookie', [`ga_access=${access}`, `ga_csrf=${loginCsrf}`])
      .set('X-CSRF-Token', loginCsrf)
      .expect(200);
    const logoutDuration = performance.now() - logoutStart;

    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95) - 1];
    expect(p95).toBeLessThan(300);
    expect(logoutDuration).toBeLessThan(300);
  });
});
