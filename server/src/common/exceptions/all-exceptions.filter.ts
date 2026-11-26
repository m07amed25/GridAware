import {
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  getHttpRequestContext,
  REQUEST_ID_HEADER,
  resolveTraceId,
} from '../../logging/request-context.js';
import { AppException } from './app.exception.js';
import {
  buildProblemType,
  ERROR_CATALOG,
  ErrorCode,
  mapHttpStatusToErrorCode,
  type FieldError,
  type ProblemDetails,
} from './error-codes.js';

interface NormalizedError {
  status: number;
  code: ErrorCode;
  title: string;
  detail: string;
  errors?: FieldError[];
}

interface PrismaErrorLike {
  name?: string;
  code: string;
  clientVersion?: string;
}

const PRISMA_UNAVAILABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPrismaKnownError(value: unknown): value is PrismaErrorLike {
  if (!isRecord(value) || typeof value.code !== 'string') {
    return false;
  }
  if (!/^P\d{4}$/.test(value.code)) {
    return false;
  }
  return (
    typeof value.clientVersion === 'string' ||
    (typeof value.name === 'string' && value.name.includes('Prisma'))
  );
}

function isBodyParserJsonError(value: unknown): boolean {
  return (
    value instanceof SyntaxError &&
    isRecord(value) &&
    value.status === HttpStatus.BAD_REQUEST
  );
}

function extractSafeInstance(request: Request): string {
  const raw = request.originalUrl || request.url || '/';
  const [pathname] = raw.split(/[?#]/, 1);
  return pathname || '/';
}

function parseFieldErrorsFromMessages(messages: readonly unknown[]): FieldError[] {
  const fieldErrors: FieldError[] = [];
  for (const item of messages) {
    if (typeof item === 'string') {
      const colonIndex = item.indexOf(': ');
      if (colonIndex > 0) {
        const candidateField = item.slice(0, colonIndex);
        if (/^[A-Za-z0-9_.[\]-]+$/.test(candidateField)) {
          fieldErrors.push({
            field: candidateField,
            code: 'INVALID_VALUE',
            message: item.slice(colonIndex + 2),
          });
          continue;
        }
      }
      fieldErrors.push({ code: 'INVALID_VALUE', message: item });
    } else if (
      isRecord(item) &&
      typeof item.message === 'string'
    ) {
      fieldErrors.push({
        ...(typeof item.field === 'string' ? { field: item.field } : {}),
        code: typeof item.code === 'string' ? item.code : 'INVALID_VALUE',
        message: item.message,
      });
    }
  }
  return fieldErrors;
}

function normalizeHttpException(exception: HttpException): NormalizedError {
  const status = exception.getStatus();
  const code = mapHttpStatusToErrorCode(status);
  const catalogEntry = ERROR_CATALOG[code];
  const response = exception.getResponse();

  // Never leak raw 5xx internal exception messages to clients.
  if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return {
      status,
      code,
      title: catalogEntry.title,
      detail: catalogEntry.defaultDetail,
    };
  }

  let detail = catalogEntry.defaultDetail;
  let errors: FieldError[] | undefined;

  if (typeof response === 'string' && response.trim().length > 0) {
    detail = response;
  } else if (isRecord(response)) {
    if (Array.isArray(response.errors)) {
      const parsed = parseFieldErrorsFromMessages(response.errors);
      if (parsed.length > 0) {
        errors = parsed;
      }
    }

    if (Array.isArray(response.message)) {
      const parsed = parseFieldErrorsFromMessages(response.message);
      if (parsed.length > 0) {
        errors = parsed;
      }
    } else if (
      typeof response.detail === 'string' &&
      response.detail.trim().length > 0
    ) {
      detail = response.detail;
    } else if (
      typeof response.message === 'string' &&
      response.message.trim().length > 0
    ) {
      detail = response.message;
    }
  }

  return {
    status,
    code,
    title: catalogEntry.title,
    detail,
    ...(errors ? { errors } : {}),
  };
}

function normalizeException(exception: unknown): NormalizedError {
  if (exception instanceof AppException) {
    return {
      status: exception.getStatus(),
      code: exception.code,
      title: exception.title,
      detail: exception.detail,
      ...(exception.errors?.length ? { errors: [...exception.errors] } : {}),
    };
  }

  if (exception instanceof HttpException) {
    return normalizeHttpException(exception);
  }

  if (isPrismaKnownError(exception)) {
    if (exception.code === 'P2002') {
      const entry = ERROR_CATALOG[ErrorCode.RESOURCE_CONFLICT];
      return {
        status: entry.status,
        code: ErrorCode.RESOURCE_CONFLICT,
        title: entry.title,
        detail: 'A resource with the same unique value already exists.',
      };
    }
    if (exception.code === 'P2025') {
      const entry = ERROR_CATALOG[ErrorCode.RESOURCE_NOT_FOUND];
      return {
        status: entry.status,
        code: ErrorCode.RESOURCE_NOT_FOUND,
        title: entry.title,
        detail: entry.defaultDetail,
      };
    }
    if (PRISMA_UNAVAILABLE_CODES.has(exception.code)) {
      const entry = ERROR_CATALOG[ErrorCode.DEPENDENCY_UNAVAILABLE];
      return {
        status: entry.status,
        code: ErrorCode.DEPENDENCY_UNAVAILABLE,
        title: entry.title,
        detail: entry.defaultDetail,
      };
    }
  }

  if (isBodyParserJsonError(exception)) {
    const entry = ERROR_CATALOG[ErrorCode.VALIDATION_ERROR];
    return {
      status: entry.status,
      code: ErrorCode.VALIDATION_ERROR,
      title: entry.title,
      detail: 'Malformed JSON request body.',
    };
  }

  const internal = ERROR_CATALOG[ErrorCode.INTERNAL_ERROR];
  return {
    status: internal.status,
    code: ErrorCode.INTERNAL_ERROR,
    title: internal.title,
    detail: internal.defaultDetail,
  };
}

/**
 * Global HTTP exception filter producing sanitized RFC 7807 Problem envelopes
 * matching docs/architecture/phase-3.3/request-response-error-standards.md and
 * docs/contracts/openapi.yaml (#/components/schemas/Problem).
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestContext = getHttpRequestContext(request);
    const requestId =
      requestContext?.requestId ??
      resolveTraceId(request.headers[REQUEST_ID_HEADER], 'req');
    const instance = extractSafeInstance(request);
    const normalized = normalizeException(exception);

    const problem: ProblemDetails = {
      type: buildProblemType(normalized.code),
      title: normalized.title,
      status: normalized.status,
      code: normalized.code,
      detail: normalized.detail,
      instance,
      requestId,
      ...(normalized.errors?.length ? { errors: normalized.errors } : {}),
    };

    const logMeta = {
      status: normalized.status,
      code: normalized.code,
      method: request.method,
      path: instance,
      requestId,
      ...(requestContext?.correlationId
        ? { correlationId: requestContext.correlationId }
        : {}),
    };

    if (normalized.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      if (exception instanceof AppException && normalized.code !== ErrorCode.INTERNAL_ERROR) {
        this.logger.error(
          `${request.method} ${instance} failed with ${normalized.code}: ${exception.detail}`,
          logMeta,
        );
      } else if (exception instanceof Error) {
        this.logger.error(
          `${request.method} ${instance} failed with ${normalized.code}: ${exception.message}`,
          logMeta,
          exception.stack,
        );
      } else {
        this.logger.error(
          `${request.method} ${instance} failed with ${normalized.code}`,
          { ...logMeta, thrownValue: String(exception) },
        );
      }
    } else {
      this.logger.warn(
        `${request.method} ${instance} rejected with ${normalized.code}`,
        logMeta,
      );
    }

    response.setHeader('X-Request-Id', requestId);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.status(normalized.status).json(problem);
  }
}
