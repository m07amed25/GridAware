import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import {
  ACCESS_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CookieService,
  REFRESH_COOKIE_NAME,
} from './cookie.service.js';

function createCookieService(overrides: Record<string, string> = {}) {
  const env = new EnvService(
    validateServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      ...overrides,
    }),
  );
  return new CookieService(env);
}

describe('CookieService', () => {
  it('sets HttpOnly access/refresh cookies and readable CSRF cookie with scoped paths', () => {
    const service = createCookieService();
    const cookieSpy = vi.fn();
    const res = { cookie: cookieSpy } as unknown as Response;

    service.setAuthCookies(res, {
      accessToken: 'jwt-1',
      refreshToken: 'sess.secret',
      csrfToken: 'csrf-1',
    });

    expect(cookieSpy).toHaveBeenCalledWith(
      ACCESS_COOKIE_NAME,
      'jwt-1',
      expect.objectContaining({
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(cookieSpy).toHaveBeenCalledWith(
      REFRESH_COOKIE_NAME,
      'sess.secret',
      expect.objectContaining({
        httpOnly: true,
        path: '/api/v1/auth',
        sameSite: 'lax',
        secure: false,
      }),
    );
    expect(cookieSpy).toHaveBeenCalledWith(
      CSRF_COOKIE_NAME,
      'csrf-1',
      expect.objectContaining({
        httpOnly: false,
        path: '/',
      }),
    );
  });

  it('clears auth cookies with symmetric path and security attributes', () => {
    const service = createCookieService({
      COOKIE_SECURE: 'true',
      COOKIE_SAME_SITE: 'strict',
      COOKIE_DOMAIN: '.gridaware.io',
    });
    const clearSpy = vi.fn();
    const res = { clearCookie: clearSpy } as unknown as Response;

    service.clearAuthCookies(res);

    expect(clearSpy).toHaveBeenCalledWith(ACCESS_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      domain: '.gridaware.io',
    });
    expect(clearSpy).toHaveBeenCalledWith(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/api/v1/auth',
      domain: '.gridaware.io',
    });
  });
});
