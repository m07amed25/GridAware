export function isValidClientTimeZone(value: string): boolean;
export function formatLocationCodePreview(raw: string): string;
export function formatGrossAreaDisplay(value: string | null | undefined): string;
export function formatSiteLocalTime(timeZone: string, date?: Date): string;
export function parseArchiveBlockedBuildingCount(
  detail: string | null | undefined,
): number | null;

export interface SiteFormValidationInput {
  mode: "create" | "edit";
  code?: string;
  name: string;
  type: string;
  timeZone: string;
  countryCode?: string;
  latitude?: string;
  longitude?: string;
}

export interface BuildingFormValidationInput {
  mode: "create" | "edit";
  code?: string;
  name: string;
  type: string;
  floorCount?: string;
  grossAreaSqM?: string;
}

export function validateSiteFormInput(
  input: SiteFormValidationInput,
): Record<string, string>;

export function validateBuildingFormInput(
  input: BuildingFormValidationInput,
): Record<string, string>;
