import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterRequestSwaggerDto {
  @ApiProperty({ example: 'alex@example.com', maxLength: 254 })
  email!: string;

  @ApiProperty({
    example: 'correct-horse-battery-staple',
    minLength: 12,
    maxLength: 128,
  })
  password!: string;

  @ApiProperty({ example: 'Alex Morgan', minLength: 2, maxLength: 120 })
  displayName!: string;
}

export class LoginRequestSwaggerDto {
  @ApiProperty({ example: 'alex@example.com', maxLength: 254 })
  email!: string;

  @ApiProperty({ example: 'correct-horse-battery-staple' })
  password!: string;
}

export class SafeUserProfileSwaggerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'alex@example.com' })
  email!: string;

  @ApiProperty({ example: 'Alex Morgan' })
  displayName!: string;

  @ApiProperty({
    enum: ['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'],
  })
  status!: string;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  emailVerifiedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class AuthSessionSummarySwaggerDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  userAgent!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  lastUsedAt!: string;

  @ApiProperty({ format: 'date-time' })
  idleExpiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  absoluteExpiresAt!: string;

  @ApiProperty()
  isCurrent!: boolean;
}

export class EmailOnlyRequestSwaggerDto {
  @ApiProperty({ example: 'alex@example.com', maxLength: 254 })
  email!: string;
}

export class TokenConfirmRequestSwaggerDto {
  @ApiProperty({ example: 'base64url-token' })
  token!: string;
}

export class ResetPasswordConfirmRequestSwaggerDto {
  @ApiProperty({ example: 'base64url-token' })
  token!: string;

  @ApiProperty({
    example: 'new-correct-horse-battery-staple',
    minLength: 12,
    maxLength: 128,
  })
  newPassword!: string;
}
