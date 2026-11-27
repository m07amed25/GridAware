import { Injectable } from '@nestjs/common';
import type { CookieOptions, Response } from 'express';
import { EnvService } from '../config/env.service.js';

export const ACCESS_COOKIE_NAME = 'ga_access';
export const REFRESH_COOKIE_NAME = 'ga_refresh';
export const CSRF_COOKIE_NAME = 'ga_csrf';

function parseDurationMs(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl.trim());
  if (!match) {
    return 15 * 60 * 1000;
  }
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 15 * 60 * 1000;
  }
}

@Injectable()
export class CookieService {
  constructor(private readonly env: EnvService) {}

  private baseOptions(httpOnly: boolean, path: string): CookieOptions {
    return {
      httpOnly,
      secure: this.env.cookieSecure,
      sameSite: this.env.cookieSameSite,
      path,
      ...(this.env.cookieDomain ? { domain: this.env.cookieDomain } : {}),
    };
  }

  setCsrfCookie(res: Response, csrfToken: string): void {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...this.baseOptions(false, '/'),
      maxAge: this.env.authSessionAbsoluteTtlDays * 24 * 60 * 60 * 1000,
    });
  }

  setAuthCookies(
    res: Response,
    tokens: {
      accessToken: string;
      refreshToken: string;
      csrfToken: string;
    },
  ): void {
    res.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, {
      ...this.baseOptions(true, '/'),
      maxAge: parseDurationMs(this.env.authAccessTokenTtl),
    });

    res.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, {
      ...this.baseOptions(true, '/api/v1/auth'),
      maxAge: this.env.authSessionIdleTtlDays * 24 * 60 * 60 * 1000,
    });

    this.setCsrfCookie(res, tokens.csrfToken);
  }

  clearAuthCookies(res: Response): void {
    res.clearCookie(ACCESS_COOKIE_NAME, this.baseOptions(true, '/'));
    res.clearCookie(REFRESH_COOKIE_NAME, this.baseOptions(true, '/api/v1/auth'));
  }
}
