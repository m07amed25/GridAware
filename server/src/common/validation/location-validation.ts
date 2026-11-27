import { z } from 'zod';

/**
 * Control characters strictly disallowed in single-line text fields (0x00–0x1F, 0x7F).
 */
const SINGLE_LINE_CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * Control characters disallowed in multi-line descriptions (allows \n and \t).
 */
const MULTILINE_CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Canonical normalized location code pattern:
 * - 2–32 chars
 * - Uppercase ASCII alphanumeric and single internal hyphens only
 * - No leading, trailing, or consecutive hyphens
 */
export const LOCATION_CODE_PATTERN =
  /^[A-Z0-9](?:[A-Z0-9]|-(?=[A-Z0-9])){0,30}[A-Z0-9]$/;

export const ISO_ALPHA2_COUNTRY_PATTERN = /^[A-Z]{2}$/;

/**
 * Positive decimal up to 10 integer digits and up to 2 fractional digits (<= 9999999999.99).
 */
export const GROSS_AREA_INPUT_PATTERN =
  /^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/;

let cachedTimeZones: ReadonlySet<string> | null = null;

function getSupportedIanaTimeZones(): ReadonlySet<string> {
  if (!cachedTimeZones) {
    const supported = new Set<string>(['UTC']);
    if (typeof Intl.supportedValuesOf === 'function') {
      for (const tz of Intl.supportedValuesOf('timeZone')) {
        supported.add(tz);
      }
    }
    cachedTimeZones = supported;
  }
  return cachedTimeZones;
}

export function isValidIanaTimeZone(value: string): boolean {
  if (!value || value.length > 64 || value !== value.trim()) {
    return false;
  }
  if (/^[+-]/.test(value) || /^(?:UTC|GMT)[+-]/i.test(value)) {
    return false;
  }
  const supported = getSupportedIanaTimeZones();
  if (!supported.has(value)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function normalizeLocationCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export const LocationCodeSchema = z
  .string()
  .transform((value) => normalizeLocationCode(value))
  .refine((value) => LOCATION_CODE_PATTERN.test(value), {
    message:
      'Code must be 2–32 characters using uppercase letters, numbers, and single internal hyphens only',
  });

export const LocationNameSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => value.length >= 2 && value.length <= 120, {
    message: 'Name must be between 2 and 120 characters',
  })
  .refine((value) => !SINGLE_LINE_CONTROL_CHARS.test(value), {
    message: 'Name must not contain control characters',
  });

export const LocationDescriptionSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === null || value.length <= 2000, {
    message: 'Description must be at most 2,000 characters',
  })
  .refine((value) => value === null || !MULTILINE_CONTROL_CHARS.test(value), {
    message: 'Description must not contain control characters',
  });

export const LocationOptionalLineSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === null || value.length <= 200, {
    message: 'Field must be at most 200 characters',
  })
  .refine((value) => value === null || !SINGLE_LINE_CONTROL_CHARS.test(value), {
    message: 'Field must not contain control characters',
  });

export const LocationPostalCodeSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === null || value.length <= 32, {
    message: 'Postal code must be at most 32 characters',
  })
  .refine((value) => value === null || !SINGLE_LINE_CONTROL_CHARS.test(value), {
    message: 'Postal code must not contain control characters',
  });

export const LocationCountryCodeSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) return null;
    const trimmed = value.trim().toUpperCase();
    return trimmed.length === 0 ? null : trimmed;
  })
  .refine((value) => value === null || ISO_ALPHA2_COUNTRY_PATTERN.test(value), {
    message: 'Country code must be a valid 2-letter ISO 3166-1 alpha-2 code',
  });

export const LocationTimeZoneSchema = z
  .string()
  .transform((value) => value.trim())
  .refine((value) => isValidIanaTimeZone(value), {
    message: 'Time zone must be a valid canonical IANA time zone identifier',
  });

export const LocationLatitudeSchema = z
  .union([z.number(), z.null()])
  .refine(
    (value) =>
      value === null || (Number.isFinite(value) && value >= -90 && value <= 90),
    {
      message: 'Latitude must be a finite number between -90 and 90',
    },
  );

export const LocationLongitudeSchema = z
  .union([z.number(), z.null()])
  .refine(
    (value) =>
      value === null ||
      (Number.isFinite(value) && value >= -180 && value <= 180),
    {
      message: 'Longitude must be a finite number between -180 and 180',
    },
  );

export interface CoordinatePairIssue {
  readonly field: 'latitude' | 'longitude';
  readonly message: string;
}

export function validateCoordinatePair(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): CoordinatePairIssue[] {
  const issues: CoordinatePairIssue[] = [];
  const hasLat = latitude !== undefined && latitude !== null;
  const hasLng = longitude !== undefined && longitude !== null;

  if (hasLat !== hasLng) {
    issues.push({
      field: hasLat ? 'longitude' : 'latitude',
      message:
        'Latitude and longitude must both be provided together or both omitted/cleared',
    });
    return issues;
  }

  if (hasLat && hasLng) {
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      issues.push({
        field: 'latitude',
        message: 'Latitude must be a finite number between -90 and 90',
      });
    }
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      issues.push({
        field: 'longitude',
        message: 'Longitude must be a finite number between -180 and 180',
      });
    }
  }

  return issues;
}

export const LocationFloorCountSchema = z.union([
  z.null(),
  z
    .number()
    .int({ message: 'Floor count must be an integer' })
    .min(1, { message: 'Floor count must be at least 1' })
    .max(200, { message: 'Floor count must be at most 200' }),
]);

export function normalizeGrossAreaString(raw: string): string | null {
  const trimmed = raw.trim();
  if (!GROSS_AREA_INPUT_PATTERN.test(trimmed)) {
    return null;
  }
  const [intPart, fracPart = ''] = trimmed.split('.');
  const paddedFrac = (fracPart + '00').slice(0, 2);
  if (intPart === '0' && paddedFrac === '00') {
    return null;
  }
  return `${intPart}.${paddedFrac}`;
}

export const LocationGrossAreaSchema = z.union([
  z.null(),
  z
    .string()
    .transform((value, ctx) => {
      const normalized = normalizeGrossAreaString(value);
      if (normalized === null) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Gross area must be a positive decimal string with up to 2 decimal places (max 9999999999.99)',
        });
        return z.NEVER;
      }
      return normalized;
    }),
]);

export function formatGrossAreaSqM(
  value: string | { toString(): string } | null | undefined,
): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = typeof value === 'string' ? value : value.toString();
  const normalized = normalizeGrossAreaString(raw);
  return normalized ?? raw;
}
