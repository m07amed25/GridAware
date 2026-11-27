import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import {
  AppLogger,
  redactUrlCredentials,
  resolveEnabledLogLevels,
} from './app-logger.service.js';
import { runWithRequestContext } from './request-context.js';

function createEnv(overrides: NodeJS.ProcessEnv = {}): EnvService {
  return new EnvService(
    validateServerEnv({
      DATABASE_URL:
        'postgresql://user:secret@ep-example.aws.neon.tech/neondb?sslmode=require',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      ...overrides,
    }),
  );
}

describe('AppLogger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves cumulative enabled log levels up to the configured threshold', () => {
    expect(resolveEnabledLogLevels('warn')).toEqual(['fatal', 'error', 'warn']);
    expect(resolveEnabledLogLevels('debug')).toEqual([
      'fatal',
      'error',
      'warn',
      'log',
      'debug',
    ]);
  });

  it('redacts embedded credentials from infrastructure URLs', () => {
    expect(
      redactUrlCredentials(
        'Failed connecting to postgresql://griduser:s3cr3t@db.neon.tech/neondb and redis://:tok@redis:6379',
      ),
    ).toBe(
      'Failed connecting to postgresql://[REDACTED]@db.neon.tech/neondb and redis://[REDACTED]@redis:6379',
    );
  });

  it('emits structured JSON logs with service, environment, correlation IDs, and secret redaction', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    const logger = new AppLogger(
      createEnv({
        NODE_ENV: 'production',
        LOG_FORMAT: 'json',
        LOG_LEVEL: 'log',
        AUTH_ACCESS_TOKEN_SECRET: 'prod-logger-test-secret-at-least-32-chars',
        MAIL_PROVIDER: 'resend',
        MAIL_API_KEY: 're_test_123',
      }),
    );

    runWithRequestContext(
      { requestId: 'req_abc123', correlationId: 'cor_xyz789' },
      () => {
        logger.log(
          'Connected to postgresql://admin:topsecret@db.example.com/app',
          {
            password: 'plain-password',
            nested: { authorization: 'Bearer secret-jwt', assetId: 'asset-1' },
          },
          'DatabaseService',
        );
      },
    );

    expect(writes).toHaveLength(1);
    const parsed = JSON.parse(writes[0]) as Record<string, unknown>;
    expect(parsed).toMatchObject({
      level: 'log',
      service: 'gridaware-server',
      environment: 'production',
      context: 'DatabaseService',
      requestId: 'req_abc123',
      correlationId: 'cor_xyz789',
      message: 'Connected to postgresql://[REDACTED]@db.example.com/app',
      password: '[REDACTED]',
      nested: {
        authorization: '[REDACTED]',
        assetId: 'asset-1',
      },
    });
    expect(typeof parsed.time).toBe('string');
    expect(Number.isNaN(Date.parse(String(parsed.time)))).toBe(false);
    expect(writes[0]).not.toContain('topsecret');
    expect(writes[0]).not.toContain('plain-password');
    expect(writes[0]).not.toContain('secret-jwt');
  });

  it('suppresses messages below the configured LOG_LEVEL', () => {
    const stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const logger = new AppLogger(
      createEnv({
        NODE_ENV: 'production',
        LOG_FORMAT: 'json',
        LOG_LEVEL: 'warn',
        AUTH_ACCESS_TOKEN_SECRET: 'prod-logger-test-secret-at-least-32-chars',
        MAIL_PROVIDER: 'resend',
        MAIL_API_KEY: 're_test_123',
      }),
    );

    logger.debug('hidden debug message', 'TestContext');
    logger.log('hidden info message', 'TestContext');
    logger.warn('visible warning', 'TestContext');

    expect(stdoutSpy).toHaveBeenCalledTimes(1);
  });
});
