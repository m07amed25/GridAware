import { EventEmitter } from 'node:events';
import { Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpLoggingMiddleware } from './http-logging.middleware.js';
import {
  getHttpRequestContext,
  getRequestContext,
} from './request-context.js';

function createMockHttp(
  overrides: {
    method?: string;
    originalUrl?: string;
    headers?: Record<string, string>;
    statusCode?: number;
  } = {},
) {
  const responseHeaders = new Map<string, string>();
  const emitter = new EventEmitter();

  const request = {
    method: overrides.method ?? 'GET',
    originalUrl: overrides.originalUrl ?? '/api/v1/assets?token=secret',
    url: overrides.originalUrl ?? '/api/v1/assets?token=secret',
    headers: overrides.headers ?? {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const response = Object.assign(emitter, {
    statusCode: overrides.statusCode ?? 200,
    setHeader: vi.fn((name: string, value: string) => {
      responseHeaders.set(name.toLowerCase(), value);
    }),
  }) as unknown as Response;

  return { request, response, responseHeaders, emitter };
}

describe('HttpLoggingMiddleware', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('propagates valid trace headers, binds request context, and logs without query strings', () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    const middleware = new HttpLoggingMiddleware();
    const { request, response, responseHeaders, emitter } = createMockHttp({
      headers: {
        'x-request-id': 'req_incoming_123',
        'x-correlation-id': 'cor_workflow_456',
        'user-agent': 'vitest-agent',
      },
      statusCode: 200,
    });

    let contextInsideNext: ReturnType<typeof getRequestContext>;
    middleware.use(request, response, () => {
      contextInsideNext = getRequestContext();
    });

    expect(responseHeaders.get('x-request-id')).toBe('req_incoming_123');
    expect(responseHeaders.get('x-correlation-id')).toBe('cor_workflow_456');
    expect(contextInsideNext).toEqual({
      requestId: 'req_incoming_123',
      correlationId: 'cor_workflow_456',
      method: 'GET',
      path: '/api/v1/assets',
    });
    expect(getHttpRequestContext(request)).toEqual(contextInsideNext);

    emitter.emit('finish');

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [message, metadata] = logSpy.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(message).toContain('GET /api/v1/assets 200');
    expect(message).not.toContain('token=secret');
    expect(metadata).toMatchObject({
      method: 'GET',
      path: '/api/v1/assets',
      statusCode: 200,
      requestId: 'req_incoming_123',
      correlationId: 'cor_workflow_456',
    });
  });

  it('logs 200 health probes at debug level, 4xx at warn, and 5xx at error', () => {
    const debugSpy = vi
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => {});
    const warnSpy = vi
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    const errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    const middleware = new HttpLoggingMiddleware();

    const health = createMockHttp({
      originalUrl: '/api/v1/health/live',
      statusCode: 200,
    });
    middleware.use(health.request, health.response, () => {});
    health.emitter.emit('finish');
    expect(debugSpy).toHaveBeenCalledTimes(1);

    const notFound = createMockHttp({
      originalUrl: '/api/v1/missing',
      statusCode: 404,
    });
    middleware.use(notFound.request, notFound.response, () => {});
    notFound.emitter.emit('finish');
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const failure = createMockHttp({
      originalUrl: '/api/v1/health/ready',
      statusCode: 503,
    });
    middleware.use(failure.request, failure.response, () => {});
    failure.emitter.emit('finish');
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
