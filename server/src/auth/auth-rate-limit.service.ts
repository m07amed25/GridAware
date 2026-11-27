import { Injectable, Logger } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AppException } from '../common/exceptions/app.exception.js';
import { EnvService } from '../config/env.service.js';
import { RedisService } from '../redis/redis.service.js';

export type AuthRateLimitPolicy =
  | 'register'
  | 'login'
  | 'verifyResend'
  | 'passwordResetRequest'
  | 'refresh';

export class RateLimitExceededError extends AppException {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super({
      code: 'RATE_LIMITED',
      detail: `Too many requests. Please retry in ${retryAfterSeconds} seconds.`,
    });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, 0, now - window_ms)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry_sec = math.ceil(window_ms / 1000)
  if oldest[2] then
    retry_sec = math.max(1, math.ceil((tonumber(oldest[2]) + window_ms - now) / 1000))
  end
  return {0, retry_sec}
end
redis.call('ZADD', key, now, member)
redis.call('PEXPIRE', key, window_ms)
return {1, 0}
`;

@Injectable()
export class AuthRateLimitService {
  private readonly logger = new Logger(AuthRateLimitService.name);

  constructor(
    private readonly env: EnvService,
    private readonly redis: RedisService,
  ) {}

  private resolveLimits(policy: AuthRateLimitPolicy): {
    windowSec: number;
    ipMax: number;
    accountMax?: number;
  } {
    const windowSec = this.env.authRateLimitWindowSec;
    switch (policy) {
      case 'register':
        return {
          windowSec,
          ipMax: this.env.authRateLimitRegisterIpMax,
          accountMax: this.env.authRateLimitRegisterAccountMax,
        };
      case 'login':
        return {
          windowSec,
          ipMax: this.env.authRateLimitLoginIpMax,
          accountMax: this.env.authRateLimitLoginAccountMax,
        };
      case 'verifyResend':
        return {
          windowSec,
          ipMax: this.env.authRateLimitVerifyIpMax,
          accountMax: this.env.authRateLimitVerifyAccountMax,
        };
      case 'passwordResetRequest':
        return {
          windowSec,
          ipMax: this.env.authRateLimitResetIpMax,
          accountMax: this.env.authRateLimitResetAccountMax,
        };
      case 'refresh':
        return {
          windowSec: this.env.authRateLimitRefreshWindowSec,
          ipMax: this.env.authRateLimitRefreshIpMax,
        };
    }
  }

  async consumeOrThrow(
    policy: AuthRateLimitPolicy,
    context: { ip?: string; email?: string },
  ): Promise<void> {
    const client = this.redis.client;
    if (!client || client.status !== 'ready' || typeof client.eval !== 'function') {
      return;
    }

    const limits = this.resolveLimits(policy);
    const windowMs = limits.windowSec * 1000;
    const now = Date.now();
    const ipKey = `rl:auth:${policy}:ip:${context.ip || 'unknown'}`;

    await this.checkKey(ipKey, now, windowMs, limits.ipMax);

    if (limits.accountMax && context.email && context.email.trim().length > 0) {
      const normalized = context.email.trim().toLowerCase();
      const emailHash = createHash('sha256')
        .update(normalized, 'utf8')
        .digest('hex');
      const acctKey = `rl:auth:${policy}:acct:${emailHash}`;
      await this.checkKey(acctKey, now, windowMs, limits.accountMax);
    }
  }

  private async checkKey(
    key: string,
    now: number,
    windowMs: number,
    limit: number,
  ): Promise<void> {
    let rawResult: unknown;
    try {
      rawResult = await this.redis.client.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        String(now),
        String(windowMs),
        String(limit),
        `${now}:${randomUUID()}`,
      );
    } catch (err) {
      this.logger.warn(
        `Redis rate-limit check failed for ${key}: ${(err as Error).message}`,
      );
      return;
    }

    if (Array.isArray(rawResult) && Number(rawResult[0]) === 0) {
      const retryAfter = Math.max(1, Number(rawResult[1]) || 60);
      throw new RateLimitExceededError(retryAfter);
    }
  }
}
