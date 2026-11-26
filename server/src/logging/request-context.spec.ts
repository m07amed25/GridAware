import { describe, expect, it } from 'vitest';
import {
  getRequestContext,
  resolveTraceId,
  runWithRequestContext,
} from './request-context.js';

describe('request-context', () => {
  it('accepts valid X-Request-Id and X-Correlation-Id header values', () => {
    expect(resolveTraceId('req_01JCV8Z0Q7K1', 'req')).toBe('req_01JCV8Z0Q7K1');
    expect(resolveTraceId('  cor.trace-123_abc  ', 'cor')).toBe(
      'cor.trace-123_abc',
    );
    expect(resolveTraceId(['first-valid', 'second'], 'req')).toBe(
      'first-valid',
    );
  });

  it('regenerates trace IDs when header is missing, overly long, or contains unsafe characters', () => {
    const missing = resolveTraceId(undefined, 'req');
    expect(missing).toMatch(/^req_[0-9a-f]{32}$/);

    const injected = resolveTraceId('bad\r\nheader', 'req');
    expect(injected).toMatch(/^req_[0-9a-f]{32}$/);

    const tooLong = resolveTraceId('a'.repeat(129), 'cor');
    expect(tooLong).toMatch(/^cor_[0-9a-f]{32}$/);
  });

  it('propagates request context across async boundaries via AsyncLocalStorage', async () => {
    expect(getRequestContext()).toBeUndefined();

    const observed = await runWithRequestContext(
      {
        requestId: 'req_test_1',
        correlationId: 'cor_test_1',
        method: 'GET',
        path: '/api/v1/health/live',
      },
      async () => {
        await Promise.resolve();
        return getRequestContext();
      },
    );

    expect(observed).toEqual({
      requestId: 'req_test_1',
      correlationId: 'cor_test_1',
      method: 'GET',
      path: '/api/v1/health/live',
    });
    expect(getRequestContext()).toBeUndefined();
  });
});
