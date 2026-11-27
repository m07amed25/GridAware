export const COMMON_TIME_ZONES: readonly string[];

export interface TimeZoneOption {
  value: string;
  offset: string;
  region: string;
  isLocal: boolean;
  keywords: string[];
}

export interface TimeZoneCatalog {
  recommended: TimeZoneOption[];
  all: TimeZoneOption[];
}

export function getTimeZoneOffsetLabel(timeZone: string, date?: Date): string;

export function getTimeZoneSearchKeywords(
  timeZone: string,
  offsetLabel: string,
): string[];

export function getTimeZoneCatalog(options?: {
  date?: Date;
  detectedTimeZone?: string | null;
  selectedTimeZone?: string | null;
}): TimeZoneCatalog;
