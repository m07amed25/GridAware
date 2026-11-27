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

  static invalidCredentials(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.INVALID_CREDENTIALS,
      detail,
    });
  }

  static sessionExpired(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.SESSION_EXPIRED,
      detail,
    });
  }

  static accountNotActive(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.ACCOUNT_NOT_ACTIVE,
      detail,
    });
  }

  static emailUnavailable(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.EMAIL_UNAVAILABLE,
      detail,
    });
  }

  static invalidToken(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.INVALID_TOKEN,
      detail,
    });
  }

  static csrfInvalid(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.CSRF_INVALID,
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

  static siteNotFound(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.SITE_NOT_FOUND,
      detail,
    });
  }

  static buildingNotFound(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.BUILDING_NOT_FOUND,
      detail,
    });
  }

  static siteCodeAlreadyExists(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.SITE_CODE_ALREADY_EXISTS,
      detail,
    });
  }

  static buildingCodeAlreadyExists(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.BUILDING_CODE_ALREADY_EXISTS,
      detail,
    });
  }

  static siteArchived(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.SITE_ARCHIVED,
      detail,
    });
  }

  static siteInactive(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.SITE_INACTIVE,
      detail,
    });
  }

  static siteHasActiveBuildings(
    activeBuildingCount?: number,
    detail?: string,
  ): AppException {
    const resolvedDetail =
      detail ??
      (typeof activeBuildingCount === 'number'
        ? `Cannot archive site while ${activeBuildingCount} non-archived ${activeBuildingCount === 1 ? 'building remains' : 'buildings remain'}. Archive all buildings first.`
        : undefined);
    return new AppException({
      code: ErrorCode.SITE_HAS_ACTIVE_BUILDINGS,
      detail: resolvedDetail,
    });
  }

  static invalidLocationState(detail?: string): AppException {
    return new AppException({
      code: ErrorCode.INVALID_LOCATION_STATE,
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
