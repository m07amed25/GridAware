import {
  ConsoleLogger,
  Injectable,
  type LogLevel,
} from '@nestjs/common';
import type { AppLogLevel } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { getRequestContext } from './request-context.js';

export const SERVICE_NAME = 'gridaware-server';

const LOG_LEVEL_ORDER: readonly LogLevel[] = [
  'fatal',
  'error',
  'warn',
  'log',
  'debug',
  'verbose',
];

export const SENSITIVE_LOG_KEYS: readonly string[] = [
  'password',
  'pass',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'authorization',
  'cookie',
  'set-cookie',
  'credential',
  'credentials',
  'privateKey',
  'databaseUrl',
  'databaseUrlUnpooled',
  'connectionString',
  'mqttPassword',
  'observeAppSecret',
];

const URL_CREDENTIALS_PATTERN = /([a-z][a-z0-9+.-]*:\/\/)([^/\s@:]*:[^/\s@]+)@/gi;

export function resolveEnabledLogLevels(level: AppLogLevel): LogLevel[] {
  const index = LOG_LEVEL_ORDER.indexOf(level);
  if (index === -1) {
    return [...LOG_LEVEL_ORDER];
  }
  return LOG_LEVEL_ORDER.slice(0, index + 1);
}

export function redactUrlCredentials(value: string): string {
  return value.replace(URL_CREDENTIALS_PATTERN, '$1[REDACTED]@');
}

function sanitizeMessage(message: unknown): unknown {
  return typeof message === 'string' ? redactUrlCredentials(message) : message;
}

/**
 * Structured application logger aligned with NFR-OBS-001 and NFR-SEC-003.
 *
 * Emits compact JSON lines in production (or when LOG_FORMAT=json) and
 * human-readable logs in local development, automatically enriching records
 * with service, environment, requestId, and correlationId while redacting
 * sensitive keys and URL credentials.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
  private readonly environment: string;
  private readonly serviceName: string;

  constructor(env: EnvService) {
    const isJson = env.logFormat === 'json';
    super({
      logLevels: resolveEnabledLogLevels(env.logLevel),
      json: isJson,
      colors: !isJson && !env.isTest,
      structuredParams: true,
      flattenParams: isJson,
      redact: {
        paths: [...SENSITIVE_LOG_KEYS],
        censor: '[REDACTED]',
      },
    });
    this.environment = env.nodeEnv;
    this.serviceName = SERVICE_NAME;
  }

  protected override getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
      params?: Record<string, any>;
      error?: Error;
    },
  ): {
    [key: string]: unknown;
    level: LogLevel;
    pid: number;
    timestamp: number;
    message: unknown;
    context?: string;
    stack?: unknown;
    error?: Record<string, unknown>;
    params?: Record<string, any>;
  } {
    const sanitizedErrorStack =
      typeof options.errorStack === 'string'
        ? redactUrlCredentials(options.errorStack)
        : options.errorStack;

    const base = super.getJsonLogObject(sanitizeMessage(message), {
      ...options,
      errorStack: sanitizedErrorStack,
    });

    if (base.error && typeof base.error === 'object') {
      base.error = this.sanitizeSerializedError(base.error);
    }

    const requestContext = getRequestContext();
    const enriched: typeof base = {
      ...base,
      time: new Date(base.timestamp).toISOString(),
      service: this.serviceName,
      environment: this.environment,
    };

    if (requestContext) {
      enriched.requestId ??= requestContext.requestId;
      enriched.correlationId ??= requestContext.correlationId;
    }

    return enriched;
  }

  protected override formatMessage(
    logLevel: LogLevel,
    message: unknown,
    pidMessage: string,
    formattedLogLevel: string,
    contextMessage: string,
    timestampDiff: string,
    params?: Record<string, any>,
  ): string {
    const requestContext = getRequestContext();
    const enrichedParams = requestContext
      ? {
          requestId: requestContext.requestId,
          correlationId: requestContext.correlationId,
          ...params,
        }
      : params;

    return super.formatMessage(
      logLevel,
      sanitizeMessage(message),
      pidMessage,
      formattedLogLevel,
      contextMessage,
      timestampDiff,
      enrichedParams,
    );
  }

  private sanitizeSerializedError(
    serialized: Record<string, unknown>,
  ): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...serialized };
    if (typeof copy.message === 'string') {
      copy.message = redactUrlCredentials(copy.message);
    }
    if (typeof copy.stack === 'string') {
      copy.stack = redactUrlCredentials(copy.stack);
    }
    if (copy.cause && typeof copy.cause === 'object') {
      copy.cause = this.sanitizeSerializedError(
        copy.cause as Record<string, unknown>,
      );
    }
    return copy;
  }
}
