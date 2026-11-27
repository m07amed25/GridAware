import { z } from 'zod';
import {
  LOCATION_SORT_DIRECTIONS,
  LOCATION_SORT_FIELDS,
} from '../../common/pagination/location-cursor.js';
import {
  LocationCodeSchema,
  LocationDescriptionSchema,
  LocationFloorCountSchema,
  LocationGrossAreaSchema,
  LocationNameSchema,
} from '../../common/validation/location-validation.js';
import { BuildingType, LocationStatus } from '../../generated/prisma/enums.js';
import {
  BooleanQueryParamSchema,
  LimitQueryParamSchema,
} from '../../sites/dto/sites.schemas.js';

export const CreateBuildingSchema = z
  .object({
    code: LocationCodeSchema,
    name: LocationNameSchema,
    type: z.nativeEnum(BuildingType),
    description: LocationDescriptionSchema.optional(),
    floorCount: LocationFloorCountSchema.optional(),
    grossAreaSqM: LocationGrossAreaSchema.optional(),
  })
  .strict();

export type CreateBuildingInput = z.infer<typeof CreateBuildingSchema>;

export const UpdateBuildingSchema = z
  .object({
    name: LocationNameSchema.optional(),
    type: z.nativeEnum(BuildingType).optional(),
    description: LocationDescriptionSchema.optional(),
    floorCount: LocationFloorCountSchema.optional(),
    grossAreaSqM: LocationGrossAreaSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length >= 1, {
    message: 'At least one editable field must be provided',
  });

export type UpdateBuildingInput = z.infer<typeof UpdateBuildingSchema>;

export const ListBuildingsQuerySchema = z
  .object({
    cursor: z.string().min(1).max(512).optional(),
    limit: LimitQueryParamSchema.default(20),
    q: z
      .string()
      .max(120)
      .transform((value) => {
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : undefined;
      })
      .optional(),
    status: z.nativeEnum(LocationStatus).optional(),
    sort: z.enum(LOCATION_SORT_FIELDS).default('createdAt'),
    direction: z.enum(LOCATION_SORT_DIRECTIONS).default('desc'),
    includeArchived: BooleanQueryParamSchema.default(false),
  })
  .strict();

export type ListBuildingsQueryInput = z.infer<typeof ListBuildingsQuerySchema>;

export const BuildingDetailQuerySchema = z
  .object({
    includeArchived: BooleanQueryParamSchema.default(false),
  })
  .strict();

export type BuildingDetailQueryInput = z.infer<
  typeof BuildingDetailQuerySchema
>;
