import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ERROR_CATALOG,
  ErrorCode,
  type FieldError,
} from './error-codes.js';

export interface AppExceptionOptions {
  code: ErrorCode;
  detail?: string;
  status?: number;
  title?: string;
  errors?: FieldError[];
  cause?: unknown;
}

/**
 * Contract-compliant application exception mapped directly to the GridAware
 * RFC 7807 Problem envelope by AllExceptionsFilter.
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly title: string;
  readonly detail: string;
  readonly errors?: readonly FieldError[];

  constructor(options: AppExceptionOptions) {
    const entry = ERROR_CATALOG[options.code];
    const status = options.status ?? entry.status;
    const title = options.title ?? entry.title;
    const detail = options.detail ?? entry.defaultDetail;

    super(
      {
        code: options.code,
        title,
        detail,
        ...(options.errors?.length ? { errors: options.errors } : {}),
      },
      status,
      options.cause !== undefined ? { cause: options.cause } : undefined,
    );

    this.name = 'AppException';
    this.message = detail;
    this.code = options.code;
    this.title = title;
    this.detail = detail;
    this.errors = options.errors?.length ? [...options.errors] : undefined;
  }

  static validation(errors?: FieldError[], detail?: string): AppException {
    return new AppException({
      code: ErrorCode.VALIDATION_ERROR,
      detail,
      errors,
    });
  }

  static invalidTimeRange(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.INVALID_TIME_RANGE,
      detail,
    });
  }

  static unauthenticated(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.UNAUTHENTICATED,
      detail,
    });
  }

  static forbidden(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.FORBIDDEN,
      detail,
    });
  }

  static notFound(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.RESOURCE_NOT_FOUND,
      detail,
    });
  }

  static tenantScopeMismatch(
    detail?: string,
    status: HttpStatus.NOT_FOUND | HttpStatus.FORBIDDEN = HttpStatus.NOT_FOUND,
  ): AppException {
    return new AppException({
      code: ErrorCode.TENANT_SCOPE_MISMATCH,
      status,
      detail,
    });
  }

  static stateTransitionNotAllowed(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.STATE_TRANSITION_NOT_ALLOWED,
      detail,
    });
  }

  static idempotencyConflict(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.IDEMPOTENCY_CONFLICT,
      detail,
    });
  }

  static resourceConflict(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.RESOURCE_CONFLICT,
      detail,
    });
  }

  static preconditionFailed(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.PRECONDITION_FAILED,
      detail,
    });
  }

  static rateLimited(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.RATE_LIMITED,
      detail,
    });
  }

  static dependencyUnavailable(
    detail?: string,
    errors?: FieldError[],
  ): AppException {
    return new AppException({
      code: ErrorCode.DEPENDENCY_UNAVAILABLE,
      detail,
      errors,
    });
  }

  static internal(cause?: unknown): AppException {
    return new AppException({
      code: ErrorCode.INTERNAL_ERROR,
      cause,
    });
  }
}
