import { z } from 'zod';
import {
  LOCATION_SORT_DIRECTIONS,
  LOCATION_SORT_FIELDS,
} from '../../common/pagination/location-cursor.js';
import {
  LocationCodeSchema,
  LocationCountryCodeSchema,
  LocationDescriptionSchema,
  LocationLatitudeSchema,
  LocationLongitudeSchema,
  LocationNameSchema,
  LocationOptionalLineSchema,
  LocationPostalCodeSchema,
  LocationTimeZoneSchema,
  validateCoordinatePair,
} from '../../common/validation/location-validation.js';
import { LocationStatus, SiteType } from '../../generated/prisma/enums.js';

export const BooleanQueryParamSchema = z
  .union([z.boolean(), z.enum(['true', 'false'])])
  .transform((value) => value === true || value === 'true');

export const LimitQueryParamSchema = z
  .union([z.number(), z.string()])
  .transform((value, ctx) => {
    const parsed =
      typeof value === 'number'
        ? value
        : /^\d+$/.test(value.trim())
          ? Number.parseInt(value.trim(), 10)
          : Number.NaN;
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      ctx.addIssue({
        code: 'custom',
        message: 'Limit must be an integer between 1 and 100',
      });
      return z.NEVER;
    }
    return parsed;
  });

export const CreateSiteSchema = z
  .object({
    code: LocationCodeSchema,
    name: LocationNameSchema,
    type: z.nativeEnum(SiteType),
    description: LocationDescriptionSchema.optional(),
    addressLine1: LocationOptionalLineSchema.optional(),
    addressLine2: LocationOptionalLineSchema.optional(),
    city: LocationOptionalLineSchema.optional(),
    region: LocationOptionalLineSchema.optional(),
    postalCode: LocationPostalCodeSchema.optional(),
    countryCode: LocationCountryCodeSchema.optional(),
    latitude: LocationLatitudeSchema.optional(),
    longitude: LocationLongitudeSchema.optional(),
    timeZone: LocationTimeZoneSchema.default('UTC'),
  })
  .strict()
  .superRefine((data, ctx) => {
    const coordIssues = validateCoordinatePair(data.latitude, data.longitude);
    for (const issue of coordIssues) {
      ctx.addIssue({
        code: 'custom',
        path: [issue.field],
        message: issue.message,
      });
    }
  });

export type CreateSiteInput = z.infer<typeof CreateSiteSchema>;

export const UpdateSiteSchema = z
  .object({
    name: LocationNameSchema.optional(),
    type: z.nativeEnum(SiteType).optional(),
    description: LocationDescriptionSchema.optional(),
    addressLine1: LocationOptionalLineSchema.optional(),
    addressLine2: LocationOptionalLineSchema.optional(),
    city: LocationOptionalLineSchema.optional(),
    region: LocationOptionalLineSchema.optional(),
    postalCode: LocationPostalCodeSchema.optional(),
    countryCode: LocationCountryCodeSchema.optional(),
    latitude: LocationLatitudeSchema.optional(),
    longitude: LocationLongitudeSchema.optional(),
    timeZone: LocationTimeZoneSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length >= 1, {
    message: 'At least one editable field must be provided',
  });

export type UpdateSiteInput = z.infer<typeof UpdateSiteSchema>;

export const ListSitesQuerySchema = z
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

export type ListSitesQueryInput = z.infer<typeof ListSitesQuerySchema>;

export const SiteDetailQuerySchema = z
  .object({
    includeArchived: BooleanQueryParamSchema.default(false),
  })
  .strict();

export type SiteDetailQueryInput = z.infer<typeof SiteDetailQuerySchema>;
