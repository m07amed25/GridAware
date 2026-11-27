import { describe, expect, it } from 'vitest';
import { runWithRequestContext } from '../../logging/request-context.js';
import { buildApiResponse } from './api-response.js';

describe('buildApiResponse', () => {
  it('wraps data with requestId from RequestContext and ISO servedAt', () => {
    const result = runWithRequestContext(
      { requestId: 'req_123', correlationId: 'cor_456' },
      () => buildApiResponse({ ok: true }),
    );

    expect(result.data).toEqual({ ok: true });
    expect(result.meta.requestId).toBe('req_123');
    expect(Date.parse(result.meta.servedAt)).not.toBeNaN();
  });

  it('uses explicit requestId override or fallback when outside RequestContext', () => {
    expect(buildApiResponse({ id: 1 }, 'req_override').meta.requestId).toBe(
      'req_override',
    );
    expect(buildApiResponse({ id: 2 }).meta.requestId).toBe('req_unknown');
  });
});
