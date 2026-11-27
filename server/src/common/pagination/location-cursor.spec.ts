import { describe, expect, it } from 'vitest';
import { AppException } from '../exceptions/app.exception.js';
import { ErrorCode } from '../exceptions/error-codes.js';
import {
  buildKeysetCursorWhere,
  decodeLocationCursor,
  encodeLocationCursor,
} from './location-cursor.js';

describe('location-cursor', () => {
  const sampleId = '11111111-1111-4111-8111-111111111111';

  it('round-trips a valid cursor with matching sort and direction', () => {
    const token = encodeLocationCursor({
      id: sampleId,
      sort: 'createdAt',
      direction: 'desc',
    });

    const decoded = decodeLocationCursor(token, 'createdAt', 'desc');
    expect(decoded).toEqual({
      v: 1,
      id: sampleId,
      sort: 'createdAt',
      direction: 'desc',
    });
  });

  it('rejects cursor when sort field does not match requested sort', () => {
    const token = encodeLocationCursor({
      id: sampleId,
      sort: 'name',
      direction: 'asc',
    });

    expect(() => decodeLocationCursor(token, 'code', 'asc')).toThrow(
      AppException,
    );
    try {
      decodeLocationCursor(token, 'code', 'asc');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it('rejects cursor when direction does not match requested direction', () => {
    const token = encodeLocationCursor({
      id: sampleId,
      sort: 'createdAt',
      direction: 'desc',
    });

    expect(() => decodeLocationCursor(token, 'createdAt', 'asc')).toThrow(
      AppException,
    );
  });

  it('rejects malformed, tampered, or non-UUID cursors with VALIDATION_ERROR', () => {
    expect(() =>
      decodeLocationCursor('not-valid-base64!!!', 'createdAt', 'desc'),
    ).toThrow(AppException);

    const badVersion = Buffer.from(
      JSON.stringify({ v: 2, id: sampleId, sort: 'createdAt', direction: 'desc' }),
    ).toString('base64url');
    expect(() =>
      decodeLocationCursor(badVersion, 'createdAt', 'desc'),
    ).toThrow(AppException);

    const badUuid = Buffer.from(
      JSON.stringify({ v: 1, id: 'not-a-uuid', sort: 'createdAt', direction: 'desc' }),
    ).toString('base64url');
    expect(() => decodeLocationCursor(badUuid, 'createdAt', 'desc')).toThrow(
      AppException,
    );
  });

  it('builds deterministic keyset WHERE clauses for asc and desc across all sort columns', () => {
    const cursorRow = {
      id: sampleId,
      createdAt: new Date('2026-11-27T10:00:00.000Z'),
      name: 'Cairo Plant',
      code: 'CAI-01',
    };

    expect(buildKeysetCursorWhere(cursorRow, 'createdAt', 'desc')).toEqual({
      OR: [
        { createdAt: { lt: cursorRow.createdAt } },
        { createdAt: cursorRow.createdAt, id: { lt: sampleId } },
      ],
    });

    expect(buildKeysetCursorWhere(cursorRow, 'name', 'asc')).toEqual({
      OR: [
        { name: { gt: 'Cairo Plant' } },
        { name: 'Cairo Plant', id: { gt: sampleId } },
      ],
    });

    expect(buildKeysetCursorWhere(cursorRow, 'code', 'desc')).toEqual({
      OR: [
        { code: { lt: 'CAI-01' } },
        { code: 'CAI-01', id: { lt: sampleId } },
      ],
    });
  });
});
