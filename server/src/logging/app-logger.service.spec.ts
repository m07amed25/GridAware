import { stripVTControlCharacters } from 'node:util';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import {
  AppLogger,
  redactUrlCredentials,
  resolveEnabledLogLevels,
  sanitizeLogValue,
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

function hasAnsi(value: string): boolean {
  return stripVTControlCharacters(value) !== value;
}

describe('AppLogger', () => {
  const originalNoColor = process.env.NO_COLOR;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNoColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = originalNoColor;
    }
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

  it('redacts embedded credentials from infrastructure URLs and nested values', () => {
    expect(
      redactUrlCredentials(
        'Failed connecting to postgresql://griduser:s3cr3t@db.neon.tech/neondb and redis://:tok@redis:6379',
      ),
    ).toBe(
      'Failed connecting to postgresql://[REDACTED]@db.neon.tech/neondb and redis://[REDACTED]@redis:6379',
    );

    const sanitized = sanitizeLogValue({
      target: 'mqtt://device:superpass@broker.internal:1883',
      nested: ['redis://:mysecret@cache:6379'],
    });
    expect(sanitized).toEqual({
      target: 'mqtt://[REDACTED]@broker.internal:1883',
      nested: ['redis://[REDACTED]@cache:6379'],
    });
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
            replicaUrl: 'postgresql://reader:hiddenpw@replica.example.com/app',
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
      replicaUrl: 'postgresql://[REDACTED]@replica.example.com/app',
      nested: {
        authorization: '[REDACTED]',
        assetId: 'asset-1',
      },
    });
    expect(typeof parsed.time).toBe('string');
    expect(Number.isNaN(Date.parse(String(parsed.time)))).toBe(false);
    expect(writes[0]).not.toContain('topsecret');
    expect(writes[0]).not.toContain('hiddenpw');
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

  it('formats pretty logs cleanly with aligned columns, indented metadata, and secret redaction', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    const logger = new AppLogger(
      createEnv({
        NODE_ENV: 'test',
        LOG_FORMAT: 'pretty',
        LOG_LEVEL: 'debug',
      }),
    );

    logger.log(
      'GridAware server listening on port 3001',
      {
        port: 3001,
        environment: 'development',
        password: 'never-show-this-password',
        brokerUrl: 'mqtt://user:brokerpass@localhost:1883',
        nested: { swaggerPath: '/api/docs', token: 'secret-token' },
      },
      'Bootstrap',
    );

    expect(writes).toHaveLength(1);
    const output = writes[0];
    expect(hasAnsi(output)).toBe(false);
    expect(output).not.toContain('[Nest]');
    expect(output).not.toContain('never-show-this-password');
    expect(output).not.toContain('brokerpass');
    expect(output).not.toContain('secret-token');

    const lines = output.trimEnd().split('\n');
    expect(lines[0]).toMatch(
      /^\d{2}:\d{2}:\d{2}\.\d{3}  INFO   \[Bootstrap\]         GridAware server listening on port 3001$/,
    );
    expect(lines).toContain('                     │ port: 3001');
    expect(lines).toContain('                     │ environment: development');
    expect(lines).toContain('                     │ password: [REDACTED]');
    expect(lines).toContain(
      '                     │ brokerUrl: mqtt://[REDACTED]@localhost:1883',
    );
    expect(lines).toContain('                     │ nested:');
    expect(lines).toContain('                     │   swaggerPath: /api/docs');
    expect(lines).toContain('                     │   token: [REDACTED]');
  });

  it('renders compact single-line HTTP summaries for 2xx and expanded diagnostics for 4xx/5xx', () => {
    const stdoutWrites: string[] = [];
    const stderrWrites: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutWrites.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrWrites.push(String(chunk));
      return true;
    });

    const logger = new AppLogger(
      createEnv({
        NODE_ENV: 'test',
        LOG_FORMAT: 'pretty',
        LOG_LEVEL: 'debug',
      }),
    );

    logger.log(
      'GET /api/v1/assets 200 14.32ms',
      {
        method: 'GET',
        path: '/api/v1/assets',
        statusCode: 200,
        durationMs: 14.32,
        requestId: 'req_123',
        correlationId: 'cor_456',
        ip: '127.0.0.1',
        userAgent: 'Mozilla/5.0 test-browser',
      },
      'HTTP',
    );

    logger.error(
      'POST /api/v1/telemetry 503 1250ms',
      {
        method: 'POST',
        path: '/api/v1/telemetry',
        statusCode: 503,
        durationMs: 1250,
        requestId: 'req_err1',
        correlationId: 'cor_err2',
        ip: '10.0.0.5',
        userAgent: 'curl/8.0',
      },
      'HTTP',
    );

    expect(stdoutWrites).toHaveLength(1);
    const okLines = stdoutWrites[0].trimEnd().split('\n');
    expect(okLines).toHaveLength(1);
    expect(okLines[0]).toMatch(
      /^\d{2}:\d{2}:\d{2}\.\d{3}  INFO   \[HTTP\]              GET    \/api\/v1\/assets  200  14\.32ms  req=req_123$/,
    );

    expect(stderrWrites).toHaveLength(1);
    const errLines = stderrWrites[0].trimEnd().split('\n');
    expect(errLines[0]).toMatch(
      /^\d{2}:\d{2}:\d{2}\.\d{3}  ERROR  \[HTTP\]              POST   \/api\/v1\/telemetry  503  1\.25s  req=req_err1$/,
    );
    expect(errLines).toContain('                     │ correlationId: cor_err2');
    expect(errLines).toContain('                     │ ip: 10.0.0.5');
    expect(errLines).toContain('                     │ userAgent: curl/8.0');
  });

  it('appends compact trace IDs on single-line request logs and indents sanitized stack traces', () => {
    const stdoutWrites: string[] = [];
    const stderrWrites: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      stdoutWrites.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      stderrWrites.push(String(chunk));
      return true;
    });

    const logger = new AppLogger(
      createEnv({
        NODE_ENV: 'test',
        LOG_FORMAT: 'pretty',
        LOG_LEVEL: 'debug',
      }),
    );

    runWithRequestContext(
      { requestId: 'req_inline1', correlationId: 'cor_inline2' },
      () => {
        logger.debug('Cache miss for asset snapshot', 'RedisService');
      },
    );

    expect(stdoutWrites).toHaveLength(1);
    const debugLines = stdoutWrites[0].trimEnd().split('\n');
    expect(debugLines).toHaveLength(1);
    expect(debugLines[0]).toContain(
      '[RedisService]      Cache miss for asset snapshot  req=req_inline1 cor=cor_inline2',
    );

    logger.error(
      'Database connection failed',
      'Error: connect ECONNREFUSED postgresql://dbuser:secretpw@db:5432/app\n    at Pool.connect (src/db/pool.ts:42:11)\n    at processTicksAndRejections (node:internal/process/task_queues:95:5)',
      'DatabaseService',
    );

    const combinedErr = stderrWrites.join('');
    expect(combinedErr).not.toContain('secretpw');
    expect(combinedErr).toContain(
      '│ Error: connect ECONNREFUSED postgresql://[REDACTED]@db:5432/app',
    );
    expect(combinedErr).toContain(
      '│   at Pool.connect (src/db/pool.ts:42:11)',
    );
  });

  it('enables ANSI color hierarchy in development and respects NO_COLOR', () => {
    const writes: string[] = [];
    vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      writes.push(String(chunk));
      return true;
    });

    delete process.env.NO_COLOR;
    const coloredLogger = new AppLogger(
      createEnv({
        NODE_ENV: 'development',
        LOG_FORMAT: 'pretty',
        LOG_LEVEL: 'debug',
      }),
    );
    coloredLogger.log('Connected to Redis', 'RedisService');
    expect(hasAnsi(writes[0])).toBe(true);
    expect(stripVTControlCharacters(writes[0])).toMatch(
      /^\d{2}:\d{2}:\d{2}\.\d{3}  INFO   \[RedisService\]      Connected to Redis\n$/,
    );

    process.env.NO_COLOR = '1';
    const plainLogger = new AppLogger(
      createEnv({
        NODE_ENV: 'development',
        LOG_FORMAT: 'pretty',
        LOG_LEVEL: 'debug',
      }),
    );
    plainLogger.log('Connected to Redis', 'RedisService');
    expect(hasAnsi(writes[1])).toBe(false);
  });
});
