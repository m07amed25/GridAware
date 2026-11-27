export function toUrlCode(value: string): string;

export function orgOverviewPath(orgSlug: string): string;

export function orgSitesPath(orgSlug: string): string;

export function siteDetailPath(
  orgSlug: string,
  siteCode: string,
  options?: { includeArchived?: boolean; hash?: string },
): string;

export function buildingDetailPath(
  orgSlug: string,
  siteCode: string,
  buildingCode: string,
  options?: { includeArchived?: boolean },
): string;

export function replaceOrgSegmentInPath(
  pathname: string,
  canonicalOrgSlug: string,
): string | null;

export function appendSearchAndHash(
  pathname: string,
  search?: string,
  hash?: string,
): string;

export function isLocationDetailRoute(pathname: string): boolean;

export function matchesEntityRef(
  ref: string,
  id: string,
  code: string,
): boolean;
