import { getRequestContext } from '../../logging/request-context.js';

export interface ApiResponseMeta {
  requestId: string;
  servedAt: string;
}

export interface PaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

export interface PaginatedApiResponseMeta extends ApiResponseMeta {
  pagination: PaginationMeta;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  meta: ApiResponseMeta;
}

export interface PaginatedApiResponseEnvelope<T> {
  data: T[];
  meta: PaginatedApiResponseMeta;
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

export function buildPaginatedApiResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  requestIdOverride?: string,
): PaginatedApiResponseEnvelope<T> {
  const ctx = getRequestContext();
  return {
    data,
    meta: {
      requestId: requestIdOverride ?? ctx?.requestId ?? 'req_unknown',
      servedAt: new Date().toISOString(),
      pagination,
    },
  };
}
