import { describe, expect, it } from 'vitest';
import { EnvService } from '../config/env.service.js';
import { validateServerEnv } from '../config/env.schema.js';
import { UserStatus } from '../generated/prisma/enums.js';
import { TokenCryptoService } from './token-crypto.service.js';

function createTokenCrypto(overrides: Record<string, string> = {}) {
  const env = new EnvService(
    validateServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      AUTH_ACCESS_TOKEN_SECRET: 'test-secret-with-at-least-32-characters-1234',
      ...overrides,
    }),
  );
  return new TokenCryptoService(env);
}

describe('TokenCryptoService', () => {
  it('generates 256-bit random tokens and deterministic SHA-256 hex digests', () => {
    const crypto = createTokenCrypto();
    const t1 = crypto.generateRandomToken();
    const t2 = crypto.generateRandomToken();
    expect(t1).not.toBe(t2);
    expect(t1.length).toBeGreaterThanOrEqual(43);
    expect(crypto.sha256Hex(t1)).toHaveLength(64);
    expect(crypto.sha256Hex(t1)).toBe(crypto.sha256Hex(t1));
  });

  it('formats and parses <sessionId>.<secret> refresh tokens safely', () => {
    const crypto = createTokenCrypto();
    const sid = '11111111-1111-4111-8111-111111111111';
    const secret = crypto.generateRandomToken();
    const formatted = crypto.formatSessionToken(sid, secret);

    expect(crypto.parseSessionToken(formatted)).toEqual({
      sessionId: sid,
      secret,
    });
    expect(crypto.parseSessionToken('not-a-uuid.secret1234567890123')).toBeNull();
    expect(crypto.parseSessionToken(`${sid}.short`)).toBeNull();
    expect(crypto.parseSessionToken(undefined)).toBeNull();
  });

  it('signs and verifies HS256 access tokens with pinned issuer and audience', async () => {
    const crypto = createTokenCrypto();
    const token = await crypto.signAccessToken({
      sub: 'user-123',
      sid: 'sess-456',
      email: 'alex@example.com',
      status: UserStatus.ACTIVE,
    });

    const verified = await crypto.verifyAccessToken(token);
    expect(verified).toEqual({
      sub: 'user-123',
      sid: 'sess-456',
      email: 'alex@example.com',
      status: UserStatus.ACTIVE,
    });

    const otherAudience = createTokenCrypto({ AUTH_AUDIENCE: 'other-app' });
    await expect(otherAudience.verifyAccessToken(token)).rejects.toThrow();
  });
});
