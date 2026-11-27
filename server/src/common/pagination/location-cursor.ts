import { UUID_PATTERN } from '../../authorization/authorization.constants.js';
import { AppException } from '../exceptions/app.exception.js';

export const LOCATION_SORT_FIELDS = ['createdAt', 'name', 'code'] as const;
export type LocationSortField = (typeof LOCATION_SORT_FIELDS)[number];

export const LOCATION_SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type LocationSortDirection = (typeof LOCATION_SORT_DIRECTIONS)[number];

export interface LocationCursorPayload {
  readonly v: 1;
  readonly id: string;
  readonly sort: LocationSortField;
  readonly direction: LocationSortDirection;
}

export interface LocationCursorAnchorRow {
  readonly id: string;
  readonly createdAt: Date;
  readonly name: string;
  readonly code: string;
}

export function encodeLocationCursor(input: {
  id: string;
  sort: LocationSortField;
  direction: LocationSortDirection;
}): string {
  const payload: LocationCursorPayload = {
    v: 1,
    id: input.id,
    sort: input.sort,
    direction: input.direction,
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function invalidCursorException(): AppException {
  return AppException.validation(
    [
      {
        field: 'cursor',
        code: 'invalid_cursor',
        message: 'Invalid pagination cursor',
      },
    ],
    'Invalid pagination cursor',
  );
}

export function decodeLocationCursor(
  raw: string,
  expectedSort: LocationSortField,
  expectedDirection: LocationSortDirection,
): LocationCursorPayload {
  if (!raw || raw.length > 512) {
    throw invalidCursorException();
  }
  let parsed: unknown;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    parsed = JSON.parse(json) as unknown;
  } catch {
    throw invalidCursorException();
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw invalidCursorException();
  }

  const record = parsed as Record<string, unknown>;
  if (
    record['v'] !== 1 ||
    typeof record['id'] !== 'string' ||
    !UUID_PATTERN.test(record['id']) ||
    record['sort'] !== expectedSort ||
    record['direction'] !== expectedDirection
  ) {
    throw invalidCursorException();
  }

  return {
    v: 1,
    id: record['id'],
    sort: expectedSort,
    direction: expectedDirection,
  };
}

export function buildKeysetCursorWhere(
  anchor: LocationCursorAnchorRow,
  sort: LocationSortField,
  direction: LocationSortDirection,
): Record<string, unknown> {
  const op = direction === 'asc' ? 'gt' : 'lt';
  const sortValue = anchor[sort];

  return {
    OR: [
      { [sort]: { [op]: sortValue } },
      { [sort]: sortValue, id: { [op]: anchor.id } },
    ],
  };
}
