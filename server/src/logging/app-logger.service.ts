import {
  ConsoleLogger,
  Injectable,
  type LogLevel,
} from '@nestjs/common';
import type { AppLogLevel } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import {
  formatClockTimestamp,
  formatPrettyLogEntry,
  formatStackTrace,
} from './log-formatter.js';
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

export function sanitizeLogValue<T>(
  value: T,
  seen: WeakMap<object, unknown> = new WeakMap(),
): T {
  if (typeof value === 'string') {
    return redactUrlCredentials(value) as T;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  if (value instanceof Error) {
    if (
      !URL_CREDENTIALS_PATTERN.test(value.message) &&
      (!value.stack || !URL_CREDENTIALS_PATTERN.test(value.stack))
    ) {
      URL_CREDENTIALS_PATTERN.lastIndex = 0;
      return value;
    }
    URL_CREDENTIALS_PATTERN.lastIndex = 0;
    const sanitizedError = new Error(redactUrlCredentials(value.message));
    sanitizedError.name = value.name;
    if (value.stack) {
      sanitizedError.stack = redactUrlCredentials(value.stack);
    }
    return sanitizedError as T;
  }

  const cached = seen.get(value);
  if (cached !== undefined) {
    return cached as T;
  }

  if (Array.isArray(value)) {
    const copy: unknown[] = [];
    seen.set(value, copy);
    for (const item of value) {
      copy.push(sanitizeLogValue(item, seen));
    }
    return copy as T;
  }

  const proto = Object.getPrototypeOf(value) as unknown;
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }

  const copy: Record<string, unknown> = {};
  seen.set(value, copy);
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    copy[key] = sanitizeLogValue(entry, seen);
  }
  return copy as T;
}

/**
 * Structured application logger aligned with NFR-OBS-001 and NFR-SEC-003.
 *
 * Emits compact JSON lines in production (or when LOG_FORMAT=json) and
 * clean, column-aligned human-readable logs in local development,
 * automatically enriching records with service, environment, requestId,
 * and correlationId while redacting sensitive keys and URL credentials.
 */
@Injectable()
export class AppLogger extends ConsoleLogger {
  private readonly environment: string;
  private readonly serviceName: string;

  constructor(env: EnvService) {
    const isJson = env.logFormat === 'json';
    const noColor = Boolean(process.env.NO_COLOR);
    super({
      logLevels: resolveEnabledLogLevels(env.logLevel),
      json: isJson,
      colors: !isJson && !env.isTest && !noColor,
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

  protected override printMessages(
    messages: unknown[],
    context = '',
    logLevel: LogLevel = 'log',
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
    params?: Record<string, any>,
  ): void {
    if (this.options.json) {
      super.printMessages(
        messages,
        context,
        logLevel,
        writeStreamType,
        errorStack,
        params,
      );
      return;
    }

    const colors = Boolean(this.options.colors);
    const requestContext = getRequestContext();
    const redactedParams = params
      ? (sanitizeLogValue(this.redact(params)) as Record<string, unknown>)
      : undefined;

    for (const rawMessage of messages) {
      const resolved = this.resolveMessage(rawMessage);
      const redacted = this.redact(resolved);
      const sanitized = sanitizeLogValue(redacted);
      const timestampDiff = this.updateAndGetTimestampDiff();

      const formatted = formatPrettyLogEntry({
        logLevel,
        message: sanitized,
        context: context || undefined,
        params: redactedParams,
        traceContext: requestContext
          ? {
              requestId: requestContext.requestId,
              correlationId: requestContext.correlationId,
            }
          : undefined,
        timestamp: formatClockTimestamp(),
        timestampDiff,
        colors,
      });

      this.writeOutput(formatted, writeStreamType);

      if (!errorStack && sanitized instanceof Error && sanitized.stack) {
        this.printStackTrace(sanitized.stack);
      }
    }
  }

  protected override printStackTrace(stack: string): void {
    if (!stack || this.options.json) {
      return;
    }
    const sanitized = redactUrlCredentials(stack);
    const formatted = formatStackTrace(sanitized, Boolean(this.options.colors));
    if (formatted) {
      this.writeOutput(formatted, 'stderr');
    }
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
    const sanitizedParams = options.params
      ? (sanitizeLogValue(options.params) as Record<string, any>)
      : undefined;

    const base = super.getJsonLogObject(sanitizeLogValue(message), {
      ...options,
      errorStack: sanitizedErrorStack,
      params: sanitizedParams,
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

  private writeOutput(
    chunk: string,
    writeStreamType?: 'stdout' | 'stderr',
  ): void {
    if (this.options.forceConsole) {
      if (writeStreamType === 'stderr') {
        console.error(chunk.trimEnd());
      } else {
        console.log(chunk.trimEnd());
      }
      return;
    }
    process[writeStreamType ?? 'stdout'].write(chunk);
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
