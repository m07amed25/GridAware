import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { validateServerEnv } from '../../config/env.schema.js';
import { EnvService } from '../../config/env.service.js';
import { CSRF_COOKIE_NAME } from '../cookie.service.js';
import { CsrfGuard } from './csrf.guard.js';

function createGuard(corsOrigin = 'http://localhost:3000') {
  const env = new EnvService(
    validateServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      CORS_ORIGIN: corsOrigin,
    }),
  );
  return new CsrfGuard(env);
}

function createContext(opts: {
  method?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}): ExecutionContext {
  const headers = Object.fromEntries(
    Object.entries(opts.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
  );
  const req = {
    method: opts.method ?? 'POST',
    cookies: opts.cookies ?? {},
    get: (name: string) => headers[name.toLowerCase()],
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  it('allows safe GET requests without CSRF token', () => {
    const guard = createGuard();
    expect(guard.canActivate(createContext({ method: 'GET' }))).toBe(true);
  });

  it('allows POST when X-CSRF-Token matches ga_csrf cookie and Origin is allowed', () => {
    const guard = createGuard();
    expect(
      guard.canActivate(
        createContext({
          method: 'POST',
          cookies: { [CSRF_COOKIE_NAME]: 'csrf-token-value-123' },
          headers: {
            'x-csrf-token': 'csrf-token-value-123',
            origin: 'http://localhost:3000',
          },
        }),
      ),
    ).toBe(true);
  });

  it('rejects missing or mismatched CSRF tokens with CSRF_INVALID', () => {
    const guard = createGuard();
    try {
      guard.canActivate(
        createContext({
          method: 'POST',
          cookies: { [CSRF_COOKIE_NAME]: 'token-a' },
          headers: { 'x-csrf-token': 'token-b' },
        }),
      );
      expect.unreachable('Expected AppException');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(ErrorCode.CSRF_INVALID);
    }
  });

  it('rejects disallowed Origin headers with CSRF_INVALID', () => {
    const guard = createGuard('http://localhost:3000');
    try {
      guard.canActivate(
        createContext({
          method: 'DELETE',
          cookies: { [CSRF_COOKIE_NAME]: 'token-a' },
          headers: {
            'x-csrf-token': 'token-a',
            origin: 'https://evil.example.com',
          },
        }),
      );
      expect.unreachable('Expected AppException');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(ErrorCode.CSRF_INVALID);
    }
  });
});
