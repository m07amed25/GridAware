import { getRequestContext } from '../../logging/request-context.js';

export interface ApiResponseMeta {
  requestId: string;
  servedAt: string;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  meta: ApiResponseMeta;
}

export function buildApiResponse<T>(
  data: T,
  requestIdOverride?: string,
): ApiResponseEnvelope<T> {
  const ctx = getRequestContext();
  return {
    data,
    meta: {
      requestId: requestIdOverride ?? ctx?.requestId ?? 'req_unknown',
      servedAt: new Date().toISOString(),
    },
  };
}
