import { SetMetadata } from '@nestjs/common';
import type { AuthRateLimitPolicy } from '../auth-rate-limit.service.js';

export const AUTH_RATE_LIMIT_POLICY_KEY = 'gridaware.auth.rateLimitPolicy';

export const AuthRateLimit = (policy: AuthRateLimitPolicy) =>
  SetMetadata(AUTH_RATE_LIMIT_POLICY_KEY, policy);
