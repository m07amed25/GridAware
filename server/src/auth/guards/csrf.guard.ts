import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { AppException } from '../../common/exceptions/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import { CSRF_COOKIE_NAME } from '../cookie.service.js';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function extractOrigin(rawUrl: string | undefined): string | null {
  if (!rawUrl) {
    return null;
  }
  try {
    return new URL(rawUrl).origin;
  } catch {
    return null;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly allowedOrigins: ReadonlySet<string>;

  constructor(env: EnvService) {
    const origins = Array.isArray(env.corsOrigin)
      ? env.corsOrigin
      : [env.corsOrigin];
    this.allowedOrigins = new Set(origins);
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
      return true;
    }

    const originHeader = req.get('origin');
    const refererHeader = req.get('referer');

    if (originHeader !== undefined) {
      const origin = extractOrigin(originHeader);
      if (!origin || !this.allowedOrigins.has(origin)) {
        throw AppException.csrfInvalid('Request origin is not allowed.');
      }
    } else if (refererHeader !== undefined) {
      const refererOrigin = extractOrigin(refererHeader);
      if (!refererOrigin || !this.allowedOrigins.has(refererOrigin)) {
        throw AppException.csrfInvalid('Request referer origin is not allowed.');
      }
    }

    const cookieToken = (req.cookies as Record<string, unknown> | undefined)?.[
      CSRF_COOKIE_NAME
    ];
    const headerToken = req.get('x-csrf-token');

    if (
      typeof cookieToken !== 'string' ||
      typeof headerToken !== 'string' ||
      cookieToken.length === 0 ||
      headerToken.length === 0
    ) {
      throw AppException.csrfInvalid('Missing CSRF token.');
    }

    const cookieBuf = Buffer.from(cookieToken, 'utf8');
    const headerBuf = Buffer.from(headerToken, 'utf8');
    if (
      cookieBuf.length !== headerBuf.length ||
      !timingSafeEqual(cookieBuf, headerBuf)
    ) {
      throw AppException.csrfInvalid('Invalid CSRF token.');
    }

    return true;
  }
}
