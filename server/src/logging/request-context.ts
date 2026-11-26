import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { Request } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
export const CORRELATION_ID_HEADER = 'x-correlation-id';

const SAFE_TRACE_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export interface RequestContext {
  readonly requestId: string;
  readonly correlationId: string;
  readonly method?: string;
  readonly path?: string;
}

const REQUEST_CONTEXT_KEY = Symbol.for('gridaware.requestContext');

type RequestWithContext = Request & {
  [REQUEST_CONTEXT_KEY]?: RequestContext;
};

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function resolveTraceId(
  headerValue: string | string[] | undefined,
  prefix: 'req' | 'cor',
): string {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof candidate === 'string') {
    const trimmed = candidate.trim();
    if (SAFE_TRACE_ID_PATTERN.test(trimmed)) {
      return trimmed;
    }
  }
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}

export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

export function runWithRequestContext<T>(
  context: RequestContext,
  fn: () => T,
): T {
  return requestContextStorage.run(context, fn);
}

export function attachRequestContext(
  request: Request,
  context: RequestContext,
): void {
  (request as RequestWithContext)[REQUEST_CONTEXT_KEY] = context;
}

export function getHttpRequestContext(
  request: Request | undefined,
): RequestContext | undefined {
  if (request) {
    const attached = (request as RequestWithContext)[REQUEST_CONTEXT_KEY];
    if (attached) {
      return attached;
    }
  }
  return getRequestContext();
}
