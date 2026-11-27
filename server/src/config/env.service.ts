import { Injectable } from '@nestjs/common';
import type {
  AppLogLevel,
  LogFormat,
  NodeEnv,
  ServerEnv,
} from './env.schema.js';

@Injectable()
export class EnvService {
  constructor(private readonly env: Readonly<ServerEnv>) {}

  get<K extends keyof ServerEnv>(key: K): ServerEnv[K] {
    return this.env[key];
  }

  get nodeEnv(): NodeEnv {
    return this.env.NODE_ENV;
  }

  get isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.env.NODE_ENV === 'development';
  }

  get isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }

  get port(): number {
    return this.env.PORT;
  }

  get corsOrigin(): string | string[] {
    return this.env.CORS_ORIGIN;
  }

  get swaggerEnabled(): boolean {
    return this.env.SWAGGER_ENABLED;
  }

  get logLevel(): AppLogLevel {
    if (this.env.LOG_LEVEL) {
      return this.env.LOG_LEVEL;
    }
    if (this.isProduction) {
      return 'log';
    }
    if (this.isTest) {
      return 'warn';
    }
    return 'debug';
  }

  get logFormat(): LogFormat {
    if (this.env.LOG_FORMAT) {
      return this.env.LOG_FORMAT;
    }
    return this.isProduction ? 'json' : 'pretty';
  }

  get healthCheckTimeoutMs(): number {
    return this.env.HEALTH_CHECK_TIMEOUT_MS;
  }

  get databaseUrl(): string {
    return this.env.DATABASE_URL;
  }

  get databaseUrlUnpooled(): string | undefined {
    return this.env.DATABASE_URL_UNPOOLED;
  }

  get redisUrl(): string {
    return this.env.REDIS_URL;
  }

  get mqttUrl(): string {
    return this.env.MQTT_URL;
  }

  get mqttUsername(): string | undefined {
    return this.env.MQTT_USERNAME;
  }

  get mqttPassword(): string | undefined {
    return this.env.MQTT_PASSWORD;
  }

  get observeAppKey(): string | undefined {
    return this.env.OBSERVE_APP_KEY;
  }

  get observeAppSecret(): string | undefined {
    return this.env.OBSERVE_APP_SECRET;
  }

  get observeEndpoint(): string | undefined {
    return this.env.OBSERVE_ENDPOINT;
  }

  get authAccessTokenSecret(): string {
    return (
      this.env.AUTH_ACCESS_TOKEN_SECRET ??
      'gridaware-dev-only-access-secret-min-32-chars'
    );
  }

  get authAccessTokenTtl(): string {
    return this.env.AUTH_ACCESS_TOKEN_TTL;
  }

  get authSessionIdleTtlDays(): number {
    return this.env.AUTH_SESSION_IDLE_TTL_DAYS;
  }

  get authSessionAbsoluteTtlDays(): number {
    return this.env.AUTH_SESSION_ABSOLUTE_TTL_DAYS;
  }

  get authMaxActiveSessions(): number {
    return this.env.AUTH_MAX_ACTIVE_SESSIONS;
  }

  get authIssuer(): string {
    return this.env.AUTH_ISSUER;
  }

  get authAudience(): string {
    return this.env.AUTH_AUDIENCE;
  }

  get cookieSecure(): boolean {
    return this.env.COOKIE_SECURE ?? this.isProduction;
  }

  get cookieSameSite(): 'lax' | 'strict' | 'none' {
    return this.env.COOKIE_SAME_SITE;
  }

  get cookieDomain(): string | undefined {
    return this.env.COOKIE_DOMAIN;
  }

  get authRateLimitWindowSec(): number {
    return this.env.AUTH_RATE_LIMIT_WINDOW_SEC;
  }

  get authRateLimitLoginIpMax(): number {
    return this.env.AUTH_RATE_LIMIT_LOGIN_IP_MAX;
  }

  get authRateLimitLoginAccountMax(): number {
    return this.env.AUTH_RATE_LIMIT_LOGIN_ACCOUNT_MAX;
  }

  get authRateLimitRegisterIpMax(): number {
    return this.env.AUTH_RATE_LIMIT_REGISTER_IP_MAX;
  }

  get authRateLimitRegisterAccountMax(): number {
    return this.env.AUTH_RATE_LIMIT_REGISTER_ACCOUNT_MAX;
  }

  get authRateLimitVerifyIpMax(): number {
    return this.env.AUTH_RATE_LIMIT_VERIFY_IP_MAX;
  }

  get authRateLimitVerifyAccountMax(): number {
    return this.env.AUTH_RATE_LIMIT_VERIFY_ACCOUNT_MAX;
  }

  get authRateLimitResetIpMax(): number {
    return this.env.AUTH_RATE_LIMIT_RESET_IP_MAX;
  }

  get authRateLimitResetAccountMax(): number {
    return this.env.AUTH_RATE_LIMIT_RESET_ACCOUNT_MAX;
  }

  get authRateLimitRefreshIpMax(): number {
    return this.env.AUTH_RATE_LIMIT_REFRESH_IP_MAX;
  }

  get authRateLimitRefreshWindowSec(): number {
    return this.env.AUTH_RATE_LIMIT_REFRESH_WINDOW_SEC;
  }

  get mailProvider(): 'console' | 'resend' | 'http' {
    return this.env.MAIL_PROVIDER;
  }

  get mailFrom(): string {
    return this.env.MAIL_FROM;
  }

  get mailApiKey(): string | undefined {
    return this.env.MAIL_API_KEY;
  }

  get mailApiUrl(): string | undefined {
    return this.env.MAIL_API_URL;
  }

  get appUrl(): string {
    return this.env.APP_URL;
  }
}
