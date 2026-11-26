import { StandardSchemaValidationPipe } from '@nestjs/common';
import { AppException } from './app.exception.js';
import type { FieldError } from './error-codes.js';

interface StandardSchemaPathSegment {
  readonly key: PropertyKey;
}

interface StandardSchemaIssueLike {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | StandardSchemaPathSegment>;
}

function formatIssuePath(
  path: StandardSchemaIssueLike['path'],
): string | undefined {
  if (!path || path.length === 0) {
    return undefined;
  }
  return path
    .map((segment) =>
      typeof segment === 'object' && segment !== null && 'key' in segment
        ? String(segment.key)
        : String(segment),
    )
    .join('.');
}

export function mapStandardSchemaIssues(
  issues: ReadonlyArray<StandardSchemaIssueLike>,
): FieldError[] {
  return issues.map((issue) => {
    const field = formatIssuePath(issue.path);
    return {
      ...(field ? { field } : {}),
      code: 'INVALID_VALUE',
      message: issue.message,
    };
  });
}

export function createAppValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    transform: true,
    exceptionFactory: (issues) =>
      AppException.validation(mapStandardSchemaIssues(issues)),
  });
}
