import { HttpStatus } from '@nestjs/common';

export const PROBLEM_TYPE_BASE = 'https://gridaware.example/problems';

/**
 * Initial error code catalog from docs/architecture/phase-3.3/request-response-error-standards.md.
 */
export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_TIME_RANGE: 'INVALID_TIME_RANGE',
  INVALID_TOKEN: 'INVALID_TOKEN',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  FORBIDDEN: 'FORBIDDEN',
  ACCOUNT_NOT_ACTIVE: 'ACCOUNT_NOT_ACTIVE',
  CSRF_INVALID: 'CSRF_INVALID',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  TENANT_SCOPE_MISMATCH: 'TENANT_SCOPE_MISMATCH',
  STATE_TRANSITION_NOT_ALLOWED: 'STATE_TRANSITION_NOT_ALLOWED',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  EMAIL_UNAVAILABLE: 'EMAIL_UNAVAILABLE',
  PRECONDITION_FAILED: 'PRECONDITION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

export interface FieldError {
  field?: string;
  code: string;
  message: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  instance: string;
  requestId: string;
  errors?: FieldError[];
}

interface ErrorCatalogEntry {
  readonly status: number;
  readonly slug: string;
  readonly title: string;
  readonly defaultDetail: string;
}

export const ERROR_CATALOG: Readonly<Record<ErrorCode, ErrorCatalogEntry>> = {
  [ErrorCode.VALIDATION_ERROR]: {
    status: HttpStatus.BAD_REQUEST,
    slug: 'validation-error',
    title: 'Request validation failed',
    defaultDetail: 'One or more request fields are invalid.',
  },
  [ErrorCode.INVALID_TIME_RANGE]: {
    status: HttpStatus.BAD_REQUEST,
    slug: 'invalid-time-range',
    title: 'Invalid time range',
    defaultDetail: 'The requested time range is invalid or exceeds allowed bounds.',
  },
  [ErrorCode.INVALID_TOKEN]: {
    status: HttpStatus.BAD_REQUEST,
    slug: 'invalid-token',
    title: 'Invalid or expired token',
    defaultDetail: 'The provided verification or recovery token is invalid, expired, or has already been used.',
  },
  [ErrorCode.UNAUTHENTICATED]: {
    status: HttpStatus.UNAUTHORIZED,
    slug: 'unauthenticated',
    title: 'Authentication required',
    defaultDetail: 'Valid authentication credentials are required.',
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    slug: 'invalid-credentials',
    title: 'Invalid credentials',
    defaultDetail: 'The provided email or passphrase is incorrect.',
  },
  [ErrorCode.SESSION_EXPIRED]: {
    status: HttpStatus.UNAUTHORIZED,
    slug: 'session-expired',
    title: 'Session expired',
    defaultDetail: 'Your session has expired or been revoked. Please sign in again.',
  },
  [ErrorCode.FORBIDDEN]: {
    status: HttpStatus.FORBIDDEN,
    slug: 'forbidden',
    title: 'Access denied',
    defaultDetail: 'You do not have permission to perform this action.',
  },
  [ErrorCode.ACCOUNT_NOT_ACTIVE]: {
    status: HttpStatus.FORBIDDEN,
    slug: 'account-not-active',
    title: 'Account not active',
    defaultDetail: 'This account is not active and cannot be used to sign in.',
  },
  [ErrorCode.CSRF_INVALID]: {
    status: HttpStatus.FORBIDDEN,
    slug: 'csrf-invalid',
    title: 'CSRF validation failed',
    defaultDetail: 'Missing or invalid CSRF token or request origin.',
  },
  [ErrorCode.RESOURCE_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    slug: 'resource-not-found',
    title: 'Resource not found',
    defaultDetail: 'The requested resource was not found.',
  },
  [ErrorCode.TENANT_SCOPE_MISMATCH]: {
    status: HttpStatus.NOT_FOUND,
    slug: 'tenant-scope-mismatch',
    title: 'Resource not found',
    defaultDetail: 'The requested resource was not found.',
  },
  [ErrorCode.STATE_TRANSITION_NOT_ALLOWED]: {
    status: HttpStatus.CONFLICT,
    slug: 'state-transition-not-allowed',
    title: 'State transition not allowed',
    defaultDetail: 'The current resource state does not permit this command.',
  },
  [ErrorCode.IDEMPOTENCY_CONFLICT]: {
    status: HttpStatus.CONFLICT,
    slug: 'idempotency-conflict',
    title: 'Idempotency conflict',
    defaultDetail: 'This Idempotency-Key was already used with different request input.',
  },
  [ErrorCode.RESOURCE_CONFLICT]: {
    status: HttpStatus.CONFLICT,
    slug: 'resource-conflict',
    title: 'Resource conflict',
    defaultDetail: 'The request conflicts with the current state of the resource.',
  },
  [ErrorCode.EMAIL_UNAVAILABLE]: {
    status: HttpStatus.CONFLICT,
    slug: 'email-unavailable',
    title: 'Email unavailable',
    defaultDetail: 'An account with this email address already exists.',
  },
  [ErrorCode.PRECONDITION_FAILED]: {
    status: HttpStatus.PRECONDITION_FAILED,
    slug: 'precondition-failed',
    title: 'Precondition failed',
    defaultDetail: 'The expected resource version does not match the current version.',
  },
  [ErrorCode.RATE_LIMITED]: {
    status: HttpStatus.TOO_MANY_REQUESTS,
    slug: 'rate-limited',
    title: 'Too many requests',
    defaultDetail: 'Request quota exceeded. Please retry later.',
  },
  [ErrorCode.DEPENDENCY_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    slug: 'dependency-unavailable',
    title: 'Service dependency unavailable',
    defaultDetail: 'A required service dependency is currently unavailable.',
  },
  [ErrorCode.INTERNAL_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    slug: 'internal-error',
    title: 'Internal server error',
    defaultDetail: 'An unexpected internal error occurred.',
  },
};

export function buildProblemType(code: ErrorCode): string {
  return `${PROBLEM_TYPE_BASE}/${ERROR_CATALOG[code].slug}`;
}

export function mapHttpStatusToErrorCode(status: number): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return ErrorCode.VALIDATION_ERROR;
    case HttpStatus.UNAUTHORIZED:
      return ErrorCode.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ErrorCode.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ErrorCode.RESOURCE_NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ErrorCode.RESOURCE_CONFLICT;
    case HttpStatus.PRECONDITION_FAILED:
      return ErrorCode.PRECONDITION_FAILED;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ErrorCode.RATE_LIMITED;
    case HttpStatus.SERVICE_UNAVAILABLE:
    case HttpStatus.BAD_GATEWAY:
    case HttpStatus.GATEWAY_TIMEOUT:
      return ErrorCode.DEPENDENCY_UNAVAILABLE;
    default:
      return status >= 500
        ? ErrorCode.INTERNAL_ERROR
        : ErrorCode.VALIDATION_ERROR;
  }
}
