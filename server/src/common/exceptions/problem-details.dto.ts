import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ErrorCode,
  type FieldError,
  type ProblemDetails,
} from './error-codes.js';

export class FieldErrorDto implements FieldError {
  @ApiPropertyOptional({
    description: 'Field or dependency name associated with the error',
    example: 'database',
  })
  field?: string;

  @ApiProperty({
    description: 'Machine-readable field or dependency error code',
    example: ErrorCode.DEPENDENCY_UNAVAILABLE,
  })
  code!: string;

  @ApiProperty({
    description: 'Human-readable explanation of the field issue',
    example: 'The database dependency is unavailable.',
  })
  message!: string;
}

export class ProblemDetailsDto implements ProblemDetails {
  @ApiProperty({
    description: 'Problem type URI identifying the error category',
    example: 'https://gridaware.example/problems/dependency-unavailable',
  })
  type!: string;

  @ApiProperty({
    description: 'Short human-readable summary of the problem type',
    example: 'Service dependency unavailable',
  })
  title!: string;

  @ApiProperty({
    description: 'HTTP status code generated for this occurrence',
    example: 503,
  })
  status!: number;

  @ApiProperty({
    description: 'Stable application error code',
    enum: Object.values(ErrorCode),
    example: ErrorCode.DEPENDENCY_UNAVAILABLE,
  })
  code!: ErrorCode;

  @ApiProperty({
    description: 'Human-readable explanation specific to this occurrence',
    example: 'One or more required dependencies are unavailable.',
  })
  detail!: string;

  @ApiProperty({
    description: 'Request path where the problem occurred',
    example: '/api/v1/health/ready',
  })
  instance!: string;

  @ApiProperty({
    description: 'Trace identifier correlated with server logs',
    example: 'req_0192b1d4c8e27a00b3f9d1e0a4c28f10',
  })
  requestId!: string;

  @ApiPropertyOptional({
    description: 'Optional field-level or dependency-level error breakdown',
    type: () => [FieldErrorDto],
  })
  errors?: FieldErrorDto[];
}
