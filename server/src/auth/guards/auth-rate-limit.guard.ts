import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import {
  type AuthRateLimitPolicy,
  AuthRateLimitService,
  RateLimitExceededError,
} from '../auth-rate-limit.service.js';
import { AUTH_RATE_LIMIT_POLICY_KEY } from '../decorators/auth-rate-limit.decorator.js';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: AuthRateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy = this.reflector.getAllAndOverride<
      AuthRateLimitPolicy | undefined
    >(AUTH_RATE_LIMIT_POLICY_KEY, [context.getHandler(), context.getClass()]);

    if (!policy) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const bodyEmail =
      req.body && typeof (req.body as Record<string, unknown>).email === 'string'
        ? ((req.body as Record<string, unknown>).email as string)
        : undefined;

    try {
      await this.rateLimitService.consumeOrThrow(policy, {
        ip: req.ip,
        email: bodyEmail,
      });
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        res.setHeader('Retry-After', String(err.retryAfterSeconds));
      }
      throw err;
    }

    return true;
  }
}
