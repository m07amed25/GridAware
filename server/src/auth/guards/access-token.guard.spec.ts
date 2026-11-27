import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { validateServerEnv } from '../../config/env.schema.js';
import { EnvService } from '../../config/env.service.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { ACCESS_COOKIE_NAME } from '../cookie.service.js';
import { TokenCryptoService } from '../token-crypto.service.js';
import { AccessTokenGuard } from './access-token.guard.js';

describe('AccessTokenGuard', () => {
  const env = new EnvService(
    validateServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      AUTH_ACCESS_TOKEN_SECRET: 'guard-test-secret-with-at-least-32-characters',
    }),
  );
  const tokenCrypto = new TokenCryptoService(env);

  function createCtx(cookies: Record<string, string>, isPublic = false) {
    const req: any = { cookies };
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(isPublic),
    } as unknown as Reflector;

    const ctx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    return { ctx, req, reflector };
  }

  it('bypasses checks on @Public() routes', async () => {
    const { ctx, reflector } = createCtx({}, true);
    const guard = new AccessTokenGuard(
      reflector,
      tokenCrypto,
      {} as any,
      {} as any,
    );
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('attaches AuthenticatedActor for ACTIVE user with active session', async () => {
    const token = await tokenCrypto.signAccessToken({
      sub: 'user-1',
      sid: 'sess-1',
      email: 'alex@example.com',
      status: UserStatus.ACTIVE,
    });
    const { ctx, req, reflector } = createCtx({ [ACCESS_COOKIE_NAME]: token });
    const guard = new AccessTokenGuard(
      reflector,
      tokenCrypto,
      {
        findById: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'alex@example.com',
          status: UserStatus.ACTIVE,
        }),
      } as any,
      {
        findActiveById: vi.fn().mockResolvedValue({
          id: 'sess-1',
          userId: 'user-1',
        }),
      } as any,
    );

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({
      userId: 'user-1',
      sessionId: 'sess-1',
      email: 'alex@example.com',
      status: UserStatus.ACTIVE,
    });
  });

  it('rejects SUSPENDED users with ACCOUNT_NOT_ACTIVE', async () => {
    const token = await tokenCrypto.signAccessToken({
      sub: 'user-1',
      sid: 'sess-1',
      email: 'alex@example.com',
      status: UserStatus.ACTIVE,
    });
    const { ctx, reflector } = createCtx({ [ACCESS_COOKIE_NAME]: token });
    const guard = new AccessTokenGuard(
      reflector,
      tokenCrypto,
      {
        findById: vi.fn().mockResolvedValue({
          id: 'user-1',
          email: 'alex@example.com',
          status: UserStatus.SUSPENDED,
        }),
      } as any,
      { findActiveById: vi.fn() } as any,
    );

    try {
      await guard.canActivate(ctx);
      expect.unreachable('Expected AppException');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(ErrorCode.ACCOUNT_NOT_ACTIVE);
    }
  });
});
