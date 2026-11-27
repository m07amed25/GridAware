import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationStatus, SiteType } from '../../generated/prisma/enums.js';

export class SiteResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ example: 'CAI-PLANT-01' })
  code!: string;

  @ApiProperty({ example: 'Cairo Manufacturing Plant' })
  name!: string;

  @ApiProperty({ enum: SiteType })
  type!: SiteType;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  addressLine1!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  addressLine2!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  city!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  region!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  postalCode!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'EG' })
  countryCode!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 30.0444 })
  latitude!: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 31.2357 })
  longitude!: number | null;

  @ApiProperty({ example: 'Africa/Cairo' })
  timeZone!: string;

  @ApiProperty({ enum: LocationStatus })
  status!: LocationStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ type: Number, example: 3 })
  buildingCount!: number;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class CreateSiteSwaggerDto {
  @ApiProperty({ example: 'CAI-PLANT-01', minLength: 2, maxLength: 32 })
  code!: string;

  @ApiProperty({ example: 'Cairo Manufacturing Plant', minLength: 2, maxLength: 120 })
  name!: string;

  @ApiProperty({ enum: SiteType })
  type!: SiteType;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  addressLine1?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  addressLine2?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  city?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  region?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 32 })
  postalCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'EG' })
  countryCode?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -90, maximum: 90 })
  latitude?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: -180, maximum: 180 })
  longitude?: number | null;

  @ApiPropertyOptional({ example: 'Africa/Cairo', default: 'UTC' })
  timeZone?: string;
}

export class UpdateSiteSwaggerDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  name?: string;

  @ApiPropertyOptional({ enum: SiteType })
  type?: SiteType;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  description?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  addressLine1?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  addressLine2?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  city?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 200 })
  region?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 32 })
  postalCode?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  countryCode?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  latitude?: number | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  longitude?: number | null;

  @ApiPropertyOptional({ example: 'Africa/Cairo' })
  timeZone?: string;
}

export class ListSitesQuerySwaggerDto {
  @ApiPropertyOptional()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  limit?: number;

  @ApiPropertyOptional({ maxLength: 120 })
  q?: string;

  @ApiPropertyOptional({ enum: LocationStatus })
  status?: LocationStatus;

  @ApiPropertyOptional({ enum: ['createdAt', 'name', 'code'], default: 'createdAt' })
  sort?: 'createdAt' | 'name' | 'code';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  direction?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: false })
  includeArchived?: boolean;
}
