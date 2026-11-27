import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  type ArgumentsHost,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { attachRequestContext } from '../../logging/request-context.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';

function createHttpHost(
  overrides: {
    method?: string;
    originalUrl?: string;
    headers?: Record<string, string>;
    requestId?: string;
    correlationId?: string;
  } = {},
) {
  const responseHeaders = new Map<string, string>();
  let statusCode = 200;
  let body: unknown;

  const request = {
    method: overrides.method ?? 'POST',
    originalUrl: overrides.originalUrl ?? '/api/v1/assets?secret=hidden',
    url: overrides.originalUrl ?? '/api/v1/assets?secret=hidden',
    headers: overrides.headers ?? {},
  } as unknown as Request;

  if (overrides.requestId) {
    attachRequestContext(request, {
      requestId: overrides.requestId,
      correlationId: overrides.correlationId ?? 'cor_1',
    });
  }

  const response = {
    setHeader: vi.fn((name: string, value: string) => {
      responseHeaders.set(name.toLowerCase(), value);
    }),
    status: vi.fn((code: number) => {
      statusCode = code;
      return response;
    }),
    json: vi.fn((payload: unknown) => {
      body = payload;
      return response;
    }),
  } as unknown as Response;

  const host = {
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return {
    host,
    responseHeaders,
    getStatus: () => statusCode,
    getBody: () => body as Record<string, unknown>,
  };
}

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats AppException into the standard Problem Details envelope', () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const filter = new AllExceptionsFilter();
    const http = createHttpHost({ requestId: 'req_01JCV8Z0Q7K1' });

    filter.catch(
      AppException.validation(
        [
          {
            field: 'criticality',
            code: 'INVALID_ENUM_VALUE',
            message: 'Unsupported criticality value.',
          },
        ],
        'One or more request fields are invalid.',
      ),
      http.host,
    );

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(http.getStatus()).toBe(400);
    expect(http.responseHeaders.get('x-request-id')).toBe('req_01JCV8Z0Q7K1');
    expect(http.responseHeaders.get('content-type')).toBe(
      'application/json; charset=utf-8',
    );
    expect(http.getBody()).toEqual({
      type: 'https://gridaware.example/problems/validation-error',
      title: 'Request validation failed',
      status: 400,
      code: ErrorCode.VALIDATION_ERROR,
      detail: 'One or more request fields are invalid.',
      instance: '/api/v1/assets',
      requestId: 'req_01JCV8Z0Q7K1',
      errors: [
        {
          field: 'criticality',
          code: 'INVALID_ENUM_VALUE',
          message: 'Unsupported criticality value.',
        },
      ],
    });
  });

  it('maps Nest HttpException validation arrays and 404 responses cleanly', () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const filter = new AllExceptionsFilter();

    const validationHttp = createHttpHost({ requestId: 'req_val' });
    filter.catch(
      new BadRequestException(['code: Required', 'criticality: Invalid enum']),
      validationHttp.host,
    );
    expect(validationHttp.getStatus()).toBe(400);
    expect(validationHttp.getBody()).toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      errors: [
        { field: 'code', code: 'INVALID_VALUE', message: 'Required' },
        { field: 'criticality', code: 'INVALID_VALUE', message: 'Invalid enum' },
      ],
    });

    const notFoundHttp = createHttpHost({ requestId: 'req_404' });
    filter.catch(new NotFoundException('Asset not found'), notFoundHttp.host);
    expect(notFoundHttp.getStatus()).toBe(404);
    expect(notFoundHttp.getBody()).toMatchObject({
      code: ErrorCode.RESOURCE_NOT_FOUND,
      detail: 'Asset not found',
    });
  });

  it('maps Phase 5.1 auth AppException factories to RFC 7807 ProblemDetails', () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const filter = new AllExceptionsFilter();
    const cases = [
      { ex: AppException.invalidCredentials(), status: 401, code: ErrorCode.INVALID_CREDENTIALS },
      { ex: AppException.sessionExpired(), status: 401, code: ErrorCode.SESSION_EXPIRED },
      { ex: AppException.accountNotActive(), status: 403, code: ErrorCode.ACCOUNT_NOT_ACTIVE },
      { ex: AppException.emailUnavailable(), status: 409, code: ErrorCode.EMAIL_UNAVAILABLE },
      { ex: AppException.invalidToken(), status: 400, code: ErrorCode.INVALID_TOKEN },
      { ex: AppException.csrfInvalid(), status: 403, code: ErrorCode.CSRF_INVALID },
    ];

    for (const item of cases) {
      const http = createHttpHost({ requestId: 'req_auth' });
      filter.catch(item.ex, http.host);
      expect(http.getStatus()).toBe(item.status);
      expect(http.getBody()).toMatchObject({
        code: item.code,
        status: item.status,
      });
    }
  });

  it('redacts internal details and stack traces for 5xx and unexpected errors', () => {
    const errorSpy = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const filter = new AllExceptionsFilter();

    const rawErrorHttp = createHttpHost({ requestId: 'req_500' });
    filter.catch(
      new Error(
        'FATAL: password authentication failed for postgresql://admin:supersecret@db.internal:5432/prod',
      ),
      rawErrorHttp.host,
    );

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(rawErrorHttp.getStatus()).toBe(500);
    const body = rawErrorHttp.getBody();
    expect(body).toEqual({
      type: 'https://gridaware.example/problems/internal-error',
      title: 'Internal server error',
      status: 500,
      code: ErrorCode.INTERNAL_ERROR,
      detail: 'An unexpected internal error occurred.',
      instance: '/api/v1/assets',
      requestId: 'req_500',
    });
    expect(JSON.stringify(body)).not.toContain('supersecret');
    expect(JSON.stringify(body)).not.toContain('db.internal');
    expect(body).not.toHaveProperty('stack');

    const nest500Http = createHttpHost({ requestId: 'req_nest_500' });
    filter.catch(
      new InternalServerErrorException('SELECT * FROM secret_table failed'),
      nest500Http.host,
    );
    expect(nest500Http.getStatus()).toBe(500);
    expect(nest500Http.getBody().detail).toBe(
      'An unexpected internal error occurred.',
    );
  });

  it('maps Prisma known errors and malformed JSON without exposing database internals', () => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const filter = new AllExceptionsFilter();

    const uniqueHttp = createHttpHost({ requestId: 'req_p2002' });
    filter.catch(
      Object.assign(new Error('Unique constraint failed on email'), {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        clientVersion: '7.10.1',
      }),
      uniqueHttp.host,
    );
    expect(uniqueHttp.getStatus()).toBe(409);
    expect(uniqueHttp.getBody()).toMatchObject({
      code: ErrorCode.RESOURCE_CONFLICT,
      detail: 'A resource with the same unique value already exists.',
    });

    const dbDownHttp = createHttpHost({ requestId: 'req_p1001' });
    filter.catch(
      Object.assign(new Error('Cannot reach database server at ep-secret.neon.tech'), {
        name: 'PrismaClientInitializationError',
        code: 'P1001',
        clientVersion: '7.10.1',
      }),
      dbDownHttp.host,
    );
    expect(dbDownHttp.getStatus()).toBe(503);
    expect(dbDownHttp.getBody()).toMatchObject({
      code: ErrorCode.DEPENDENCY_UNAVAILABLE,
    });
    expect(JSON.stringify(dbDownHttp.getBody())).not.toContain('ep-secret');

    const badJsonHttp = createHttpHost({ requestId: 'req_json' });
    filter.catch(
      Object.assign(new SyntaxError('Unexpected token } in JSON'), {
        status: 400,
      }),
      badJsonHttp.host,
    );
    expect(badJsonHttp.getStatus()).toBe(400);
    expect(badJsonHttp.getBody()).toMatchObject({
      code: ErrorCode.VALIDATION_ERROR,
      detail: 'Malformed JSON request body.',
    });
  });
});
