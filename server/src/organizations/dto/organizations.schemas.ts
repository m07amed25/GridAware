import { z } from 'zod';
import { UUID_PATTERN } from '../../authorization/authorization.constants.js';

function isValidIanaTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const SlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, 'Slug must be at least 2 characters.')
  .max(80, 'Slug must not exceed 80 characters.')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug must contain lowercase letters, numbers, and single hyphens only.',
  )
  .refine(
    (value) => !UUID_PATTERN.test(value),
    'Slug cannot use a UUID format.',
  );

export const TimezoneSchema = z
  .string()
  .trim()
  .min(2, 'Timezone is required.')
  .max(64, 'Timezone must not exceed 64 characters.')
  .refine(isValidIanaTimezone, 'Timezone must be a valid IANA identifier (e.g. UTC, Africa/Cairo).');

export const CreateOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Organization name must be at least 2 characters.')
      .max(120, 'Organization name must not exceed 120 characters.'),
    slug: SlugSchema.optional(),
    timezone: TimezoneSchema.optional(),
  })
  .strict();

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Organization name must be at least 2 characters.')
      .max(120, 'Organization name must not exceed 120 characters.')
      .optional(),
    timezone: TimezoneSchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.name !== undefined || data.timezone !== undefined,
    'Provide at least one field (name or timezone) to update.',
  );

export type UpdateOrganizationInput = z.infer<typeof UpdateOrganizationSchema>;

export const ArchiveOrganizationSchema = z
  .object({
    confirmArchive: z.literal(true, {
      error: () => 'Explicit confirmation (confirmArchive: true) is required.',
    }),
  })
  .strict();

export type ArchiveOrganizationInput = z.infer<typeof ArchiveOrganizationSchema>;
