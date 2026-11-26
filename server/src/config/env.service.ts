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
}
