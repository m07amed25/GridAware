import { describe, expect, it } from 'vitest';
import {
  EnvValidationError,
  validateServerEnv,
  validateSimulatorEnv,
} from './env.schema.js';

const BASE_VALID_ENV: NodeJS.ProcessEnv = {
  DATABASE_URL:
    'postgresql://user:supersecret@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
  REDIS_URL: 'redis://localhost:6379',
  MQTT_URL: 'mqtt://localhost:1883',
};

describe('validateServerEnv', () => {
  it('parses minimal required variables and applies defaults', () => {
    const env = validateServerEnv(BASE_VALID_ENV);

    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 3001,
      CORS_ORIGIN: 'http://localhost:3000',
      SWAGGER_ENABLED: true,
      LOG_LEVEL: undefined,
      LOG_FORMAT: undefined,
      HEALTH_CHECK_TIMEOUT_MS: 2000,
      DATABASE_URL: BASE_VALID_ENV.DATABASE_URL,
      DATABASE_URL_UNPOOLED: undefined,
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      MQTT_USERNAME: undefined,
      MQTT_PASSWORD: undefined,
      OBSERVE_APP_KEY: undefined,
      OBSERVE_APP_SECRET: undefined,
      OBSERVE_ENDPOINT: undefined,
      AUTH_ACCESS_TOKEN_SECRET: undefined,
      AUTH_ACCESS_TOKEN_TTL: '15m',
      AUTH_SESSION_IDLE_TTL_DAYS: 14,
      AUTH_SESSION_ABSOLUTE_TTL_DAYS: 30,
      AUTH_MAX_ACTIVE_SESSIONS: 10,
      AUTH_ISSUER: 'http://localhost:3001',
      AUTH_AUDIENCE: 'gridaware-web',
      COOKIE_SECURE: undefined,
      COOKIE_SAME_SITE: 'lax',
      COOKIE_DOMAIN: undefined,
      AUTH_RATE_LIMIT_WINDOW_SEC: 900,
      AUTH_RATE_LIMIT_LOGIN_IP_MAX: 10,
      AUTH_RATE_LIMIT_LOGIN_ACCOUNT_MAX: 5,
      AUTH_RATE_LIMIT_REGISTER_IP_MAX: 5,
      AUTH_RATE_LIMIT_REGISTER_ACCOUNT_MAX: 3,
      AUTH_RATE_LIMIT_VERIFY_IP_MAX: 5,
      AUTH_RATE_LIMIT_VERIFY_ACCOUNT_MAX: 3,
      AUTH_RATE_LIMIT_RESET_IP_MAX: 5,
      AUTH_RATE_LIMIT_RESET_ACCOUNT_MAX: 3,
      AUTH_RATE_LIMIT_REFRESH_IP_MAX: 30,
      AUTH_RATE_LIMIT_REFRESH_WINDOW_SEC: 300,
      MAIL_PROVIDER: 'console',
      MAIL_FROM: 'no-reply@gridaware.local',
      MAIL_API_KEY: undefined,
      MAIL_API_URL: undefined,
      MAIL_SMTP_HOST: undefined,
      MAIL_SMTP_PORT: 465,
      MAIL_SMTP_SECURE: undefined,
      MAIL_SMTP_USER: undefined,
      MAIL_SMTP_PASS: undefined,
      APP_URL: 'http://localhost:3000',
      SIMULATOR_DEMO_CONTROL_ENABLED: false,
    });
  });

  it('treats empty and whitespace-only strings as unset for defaults and optionals', () => {
    const env = validateServerEnv({
      ...BASE_VALID_ENV,
      NODE_ENV: '   ',
      PORT: '',
      CORS_ORIGIN: '  ',
      DATABASE_URL_UNPOOLED: '',
      MQTT_USERNAME: '   ',
      MQTT_PASSWORD: '',
      OBSERVE_APP_KEY: '',
      OBSERVE_APP_SECRET: '  ',
      OBSERVE_ENDPOINT: '',
    });

    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3001);
    expect(env.CORS_ORIGIN).toBe('http://localhost:3000');
    expect(env.DATABASE_URL_UNPOOLED).toBeUndefined();
    expect(env.MQTT_USERNAME).toBeUndefined();
    expect(env.MQTT_PASSWORD).toBeUndefined();
    expect(env.OBSERVE_APP_KEY).toBeUndefined();
    expect(env.OBSERVE_APP_SECRET).toBeUndefined();
    expect(env.OBSERVE_ENDPOINT).toBeUndefined();
  });

  it('accepts full production configuration with TLS URLs and multiple CORS origins', () => {
    const env = validateServerEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      CORS_ORIGIN: 'https://app.gridaware.io/, https://admin.gridaware.io',
      DATABASE_URL: 'postgres://user:pass@db.example.com:5432/gridaware',
      DATABASE_URL_UNPOOLED:
        'postgresql://user:pass@db-direct.example.com:5432/gridaware',
      REDIS_URL: 'rediss://default:token@redis.example.com:6379',
      MQTT_URL: 'mqtts://broker.example.com:8883',
      MQTT_USERNAME: 'gridaware-api',
      MQTT_PASSWORD: 'mqtt-secret-value',
      OBSERVE_APP_KEY: 'obs_key_123',
      OBSERVE_APP_SECRET: 'obs_secret_456',
      OBSERVE_ENDPOINT: 'https://observe-proxy.gridaware.io',
      AUTH_ACCESS_TOKEN_SECRET: 'super-strong-production-secret-at-least-32-chars',
      MAIL_PROVIDER: 'resend',
      MAIL_API_KEY: 're_live_123456',
      MAIL_FROM: 'auth@gridaware.io',
      APP_URL: 'https://app.gridaware.io',
    });

    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
    expect(env.CORS_ORIGIN).toEqual([
      'https://app.gridaware.io',
      'https://admin.gridaware.io',
    ]);
    expect(env.MQTT_USERNAME).toBe('gridaware-api');
    expect(env.MQTT_PASSWORD).toBe('mqtt-secret-value');
    expect(env.OBSERVE_APP_KEY).toBe('obs_key_123');
    expect(env.OBSERVE_APP_SECRET).toBe('obs_secret_456');
    expect(env.OBSERVE_ENDPOINT).toBe('https://observe-proxy.gridaware.io');
  });

  it('reports all missing required variables in a single EnvValidationError', () => {
    let caught: unknown;
    try {
      validateServerEnv({});
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EnvValidationError);
    const err = caught as EnvValidationError;
    const paths = err.issues.map((issue) => issue.path);
    expect(paths).toEqual(
      expect.arrayContaining(['DATABASE_URL', 'REDIS_URL', 'MQTT_URL']),
    );
    expect(err.message).toContain('Invalid server environment configuration:');
  });

  it.each(['0', '65536', '-1', '3001.5', 'abc', '3001abc'])(
    'rejects invalid PORT %s',
    (port) => {
      expect(() =>
        validateServerEnv({ ...BASE_VALID_ENV, PORT: port }),
      ).toThrow(EnvValidationError);
    },
  );

  it('rejects invalid NODE_ENV', () => {
    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, NODE_ENV: 'staging' }),
    ).toThrow(EnvValidationError);
  });

  it.each([
    'not-a-url',
    'ftp://localhost:3000',
    'http://localhost:3000/api',
    'http://localhost:3000?foo=bar',
    'http://localhost:3000#section',
    'http://localhost:3000, invalid-origin',
  ])('rejects invalid CORS_ORIGIN %s', (origin) => {
    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, CORS_ORIGIN: origin }),
    ).toThrow(EnvValidationError);
  });

  it('rejects wrong protocols for infrastructure URLs without leaking credentials', () => {
    const secretToken = 'super-secret-password-98765';
    let caught: unknown;
    try {
      validateServerEnv({
        DATABASE_URL: `http://user:${secretToken}@example.com/db`,
        REDIS_URL: `https://default:${secretToken}@example.com`,
        MQTT_URL: `http://broker.example.com:1883`,
        DATABASE_URL_UNPOOLED: `mysql://user:${secretToken}@example.com/db`,
        OBSERVE_ENDPOINT: 'ftp://observe.example.com',
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(EnvValidationError);
    const err = caught as EnvValidationError;
    expect(err.issues.map((i) => i.path)).toEqual(
      expect.arrayContaining([
        'DATABASE_URL',
        'DATABASE_URL_UNPOOLED',
        'REDIS_URL',
        'MQTT_URL',
        'OBSERVE_ENDPOINT',
      ]),
    );
    expect(err.message).not.toContain(secretToken);
  });

  it('requires OBSERVE_APP_KEY and OBSERVE_APP_SECRET to be set together', () => {
    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, OBSERVE_APP_KEY: 'only-key' }),
    ).toThrow(/OBSERVE_APP_SECRET: Required when OBSERVE_APP_KEY is set/);

    expect(() =>
      validateServerEnv({
        ...BASE_VALID_ENV,
        OBSERVE_APP_SECRET: 'only-secret',
      }),
    ).toThrow(/OBSERVE_APP_KEY: Required when OBSERVE_APP_SECRET is set/);
  });

  it('normalizes LOG_LEVEL, LOG_FORMAT, and HEALTH_CHECK_TIMEOUT_MS', () => {
    const env = validateServerEnv({
      ...BASE_VALID_ENV,
      LOG_LEVEL: ' WARN ',
      LOG_FORMAT: 'JSON',
      HEALTH_CHECK_TIMEOUT_MS: '5000',
    });

    expect(env.LOG_LEVEL).toBe('warn');
    expect(env.LOG_FORMAT).toBe('json');
    expect(env.HEALTH_CHECK_TIMEOUT_MS).toBe(5000);
  });

  it('rejects invalid LOG_LEVEL, LOG_FORMAT, or out-of-range HEALTH_CHECK_TIMEOUT_MS', () => {
    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, LOG_LEVEL: 'info' }),
    ).toThrow(EnvValidationError);
    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, LOG_FORMAT: 'xml' }),
    ).toThrow(EnvValidationError);
    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, HEALTH_CHECK_TIMEOUT_MS: '50' }),
    ).toThrow(EnvValidationError);
    expect(() =>
      validateServerEnv({
        ...BASE_VALID_ENV,
        HEALTH_CHECK_TIMEOUT_MS: '60000',
      }),
    ).toThrow(EnvValidationError);
  });

  it('parses SWAGGER_ENABLED boolean values and rejects invalid values', () => {
    expect(
      validateServerEnv({ ...BASE_VALID_ENV, SWAGGER_ENABLED: 'false' })
        .SWAGGER_ENABLED,
    ).toBe(false);
    expect(
      validateServerEnv({ ...BASE_VALID_ENV, SWAGGER_ENABLED: ' TRUE ' })
        .SWAGGER_ENABLED,
    ).toBe(true);
    expect(
      validateServerEnv({ ...BASE_VALID_ENV, SWAGGER_ENABLED: '   ' })
        .SWAGGER_ENABLED,
    ).toBe(true);

    expect(() =>
      validateServerEnv({ ...BASE_VALID_ENV, SWAGGER_ENABLED: 'yes' }),
    ).toThrow(EnvValidationError);
  });

  it('rejects MAIL_PROVIDER=console and short AUTH_ACCESS_TOKEN_SECRET in production', () => {
    expect(() =>
      validateServerEnv({
        ...BASE_VALID_ENV,
        NODE_ENV: 'production',
        MAIL_PROVIDER: 'console',
        AUTH_ACCESS_TOKEN_SECRET: 'short',
      }),
    ).toThrow(EnvValidationError);
  });

  it('requires MAIL_API_KEY when MAIL_PROVIDER is resend or http', () => {
    expect(() =>
      validateServerEnv({
        ...BASE_VALID_ENV,
        MAIL_PROVIDER: 'resend',
      }),
    ).toThrow(/MAIL_API_KEY/);
  });

  it('requires MAIL_SMTP_HOST, MAIL_SMTP_USER, and MAIL_SMTP_PASS when MAIL_PROVIDER is smtp', () => {
    expect(() =>
      validateServerEnv({
        ...BASE_VALID_ENV,
        MAIL_PROVIDER: 'smtp',
      }),
    ).toThrow(/MAIL_SMTP_HOST/);

    const parsed = validateServerEnv({
      ...BASE_VALID_ENV,
      NODE_ENV: 'production',
      AUTH_ACCESS_TOKEN_SECRET: 'a-very-strong-production-secret-32-chars',
      MAIL_PROVIDER: 'smtp',
      MAIL_SMTP_HOST: 'smtp.gmail.com',
      MAIL_SMTP_PORT: '465',
      MAIL_SMTP_SECURE: 'true',
      MAIL_SMTP_USER: 'sender@gmail.com',
      MAIL_SMTP_PASS: 'app-password-value',
    });
    expect(parsed.MAIL_PROVIDER).toBe('smtp');
    expect(parsed.MAIL_SMTP_PORT).toBe(465);
    expect(parsed.MAIL_SMTP_SECURE).toBe(true);
  });

  it('requires COOKIE_SECURE=true when COOKIE_SAME_SITE=none', () => {
    expect(() =>
      validateServerEnv({
        ...BASE_VALID_ENV,
        COOKIE_SAME_SITE: 'none',
        COOKIE_SECURE: 'false',
      }),
    ).toThrow(/COOKIE_SECURE/);
  });
});

describe('validateSimulatorEnv', () => {
  it('defaults MQTT_URL without requiring database or redis variables', () => {
    const env = validateSimulatorEnv({});
    expect(env).toEqual({
      MQTT_URL: 'mqtt://localhost:1883',
      MQTT_USERNAME: undefined,
      MQTT_PASSWORD: undefined,
    });
  });

  it('accepts valid MQTT websocket URL and credentials', () => {
    const env = validateSimulatorEnv({
      MQTT_URL: 'wss://broker.example.com:9001',
      MQTT_USERNAME: 'sim-device',
      MQTT_PASSWORD: 'sim-password',
    });
    expect(env).toEqual({
      MQTT_URL: 'wss://broker.example.com:9001',
      MQTT_USERNAME: 'sim-device',
      MQTT_PASSWORD: 'sim-password',
    });
  });

  it('rejects invalid MQTT_URL', () => {
    expect(() =>
      validateSimulatorEnv({ MQTT_URL: 'http://localhost:1883' }),
    ).toThrow(EnvValidationError);
  });
});
