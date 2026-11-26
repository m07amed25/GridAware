import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppException } from './app.exception.js';
import { ErrorCode } from './error-codes.js';
import {
  createAppValidationPipe,
  mapStandardSchemaIssues,
} from './validation.pipe.js';

describe('createAppValidationPipe', () => {
  it('maps Standard Schema issues into structured FieldError objects', () => {
    expect(
      mapStandardSchemaIssues([
        { path: [{ key: 'site' }, { key: 'code' }], message: 'Required' },
        { path: ['limit'], message: 'Too big' },
        { message: 'Invalid payload' },
      ]),
    ).toEqual([
      { field: 'site.code', code: 'INVALID_VALUE', message: 'Required' },
      { field: 'limit', code: 'INVALID_VALUE', message: 'Too big' },
      { code: 'INVALID_VALUE', message: 'Invalid payload' },
    ]);
  });

  it('throws AppException.validation when Zod schema validation fails', async () => {
    const pipe = createAppValidationPipe();
    const schema = z.object({
      name: z.string().min(2),
      criticality: z.enum(['LOW', 'HIGH']),
    });

    await expect(
      pipe.transform(
        { name: 'A', criticality: 'UNKNOWN' },
        { type: 'body', schema } as never,
      ),
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(AppException);
      const appError = error as AppException;
      expect(appError.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(appError.getStatus()).toBe(400);
      expect(appError.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name', code: 'INVALID_VALUE' }),
          expect.objectContaining({
            field: 'criticality',
            code: 'INVALID_VALUE',
          }),
        ]),
      );
      return true;
    });
  });

  it('passes through valid values and parameters without a schema', async () => {
    const pipe = createAppValidationPipe();
    const schema = z.object({ count: z.coerce.number().int() });

    await expect(
      pipe.transform({ count: '42' }, { type: 'query', schema } as never),
    ).resolves.toEqual({ count: 42 });

    await expect(
      pipe.transform('raw', { type: 'param' } as never),
    ).resolves.toBe('raw');
  });
});
