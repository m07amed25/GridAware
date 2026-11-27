import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BuildingType, LocationStatus } from '../../generated/prisma/enums.js';

export class BuildingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  siteId!: string;

  @ApiProperty({ example: 'PROD-HALL-01' })
  code!: string;

  @ApiProperty({ example: 'Production Hall 1' })
  name!: string;

  @ApiProperty({ enum: BuildingType })
  type!: BuildingType;

  @ApiPropertyOptional({ type: String, nullable: true })
  description!: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, example: 2 })
  floorCount!: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '4200.00' })
  grossAreaSqM!: string | null;

  @ApiProperty({ enum: LocationStatus })
  status!: LocationStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  archivedAt!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}

export class CreateBuildingSwaggerDto {
  @ApiProperty({ example: 'PROD-HALL-01', minLength: 2, maxLength: 32 })
  code!: string;

  @ApiProperty({ example: 'Production Hall 1', minLength: 2, maxLength: 120 })
  name!: string;

  @ApiProperty({ enum: BuildingType })
  type!: BuildingType;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  description?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 200 })
  floorCount?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: '4200.00',
    description: 'Positive decimal string up to 2 decimal places',
  })
  grossAreaSqM?: string | null;
}

export class UpdateBuildingSwaggerDto {
  @ApiPropertyOptional({ minLength: 2, maxLength: 120 })
  name?: string;

  @ApiPropertyOptional({ enum: BuildingType })
  type?: BuildingType;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 2000 })
  description?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true, minimum: 1, maximum: 200 })
  floorCount?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: '4200.00' })
  grossAreaSqM?: string | null;
}

export class ListBuildingsQuerySwaggerDto {
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
