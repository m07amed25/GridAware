import { type PipeTransform, Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { AppException } from '../../common/exceptions/app.exception.js';
import { mapStandardSchemaIssues } from '../../common/exceptions/validation.pipe.js';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw AppException.validation(
        mapStandardSchemaIssues(result.error.issues),
      );
    }
    return result.data;
  }
}
