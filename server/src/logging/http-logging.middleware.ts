import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  attachRequestContext,
  CORRELATION_ID_HEADER,
  REQUEST_ID_HEADER,
  resolveTraceId,
  runWithRequestContext,
} from './request-context.js';

const HEALTH_PROBE_PATHS = new Set([
  '/api/v1/health',
  '/api/v1/health/live',
  '/api/v1/health/ready',
]);

function extractSafePath(request: Request): string {
  const raw = request.originalUrl || request.url || '/';
  const [pathname] = raw.split(/[?#]/, 1);
  return pathname || '/';
}

/**
 * Assigns validated X-Request-Id and X-Correlation-Id headers, binds them into
 * AsyncLocalStorage for the request lifecycle, and emits a structured HTTP
 * completion log without exposing credentials or query strings.
 */
@Injectable()
export class HttpLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = resolveTraceId(request.headers[REQUEST_ID_HEADER], 'req');
    const correlationId = resolveTraceId(
      request.headers[CORRELATION_ID_HEADER],
      'cor',
    );
    const path = extractSafePath(request);
    const context = {
      requestId,
      correlationId,
      method: request.method,
      path,
    };

    attachRequestContext(request, context);
    response.setHeader('X-Request-Id', requestId);
    response.setHeader('X-Correlation-Id', correlationId);

    const startNs = process.hrtime.bigint();
    response.on('finish', () => {
      const durationMs =
        Math.round(Number(process.hrtime.bigint() - startNs) / 10_000) / 100;
      const statusCode = response.statusCode;
      const rawUserAgent = request.headers['user-agent'];
      const userAgent =
        typeof rawUserAgent === 'string'
          ? rawUserAgent.slice(0, 200)
          : undefined;

      const metadata = {
        method: request.method,
        path,
        statusCode,
        durationMs,
        requestId,
        correlationId,
        ...(request.ip ? { ip: request.ip } : {}),
        ...(userAgent ? { userAgent } : {}),
      };
      const message = `${request.method} ${path} ${statusCode} ${durationMs}ms`;

      if (statusCode >= 500) {
        this.logger.error(message, metadata);
      } else if (statusCode >= 400) {
        this.logger.warn(message, metadata);
      } else if (HEALTH_PROBE_PATHS.has(path)) {
        this.logger.debug(message, metadata);
      } else {
        this.logger.log(message, metadata);
      }
    });

    runWithRequestContext(context, () => next());
  }
}
