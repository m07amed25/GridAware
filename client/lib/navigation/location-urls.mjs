/**
 * Canonical slug/code URL builders and path canonicalization helpers
 * for GridAware organization, site, and building routes.
 */

/**
 * Normalizes a site/building code or slug for use as a lowercase URL path segment.
 * @param {string} value
 * @returns {string}
 */
export function toUrlCode(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * @param {string} orgSlug
 * @returns {string}
 */
export function orgOverviewPath(orgSlug) {
  return `/app/organizations/${encodeURIComponent(toUrlCode(orgSlug))}`;
}

/**
 * @param {string} orgSlug
 * @returns {string}
 */
export function orgSitesPath(orgSlug) {
  return `${orgOverviewPath(orgSlug)}/sites`;
}

/**
 * @param {string} orgSlug
 * @param {string} siteCode
 * @param {{ includeArchived?: boolean; hash?: string }} [options]
 * @returns {string}
 */
export function siteDetailPath(orgSlug, siteCode, options) {
  const base = `${orgSitesPath(orgSlug)}/${encodeURIComponent(toUrlCode(siteCode))}`;
  const qs = options?.includeArchived ? "?includeArchived=true" : "";
  const rawHash = options?.hash?.trim() ?? "";
  const hash = rawHash
    ? rawHash.startsWith("#")
      ? rawHash
      : `#${rawHash}`
    : "";
  return `${base}${qs}${hash}`;
}

/**
 * @param {string} orgSlug
 * @param {string} siteCode
 * @param {string} buildingCode
 * @param {{ includeArchived?: boolean }} [options]
 * @returns {string}
 */
export function buildingDetailPath(orgSlug, siteCode, buildingCode, options) {
  const base = `${orgSitesPath(orgSlug)}/${encodeURIComponent(toUrlCode(siteCode))}/buildings/${encodeURIComponent(toUrlCode(buildingCode))}`;
  const qs = options?.includeArchived ? "?includeArchived=true" : "";
  return `${base}${qs}`;
}

/**
 * Replaces the organization segment in `/app/organizations/<segment>(/...)` with
 * the canonical lowercase slug when they differ; returns null if already canonical
 * or if the path is not an organization route.
 * @param {string} pathname
 * @param {string} canonicalOrgSlug
 * @returns {string | null}
 */
export function replaceOrgSegmentInPath(pathname, canonicalOrgSlug) {
  if (typeof pathname !== "string" || typeof canonicalOrgSlug !== "string") {
    return null;
  }
  const canonical = toUrlCode(canonicalOrgSlug);
  if (!canonical) {
    return null;
  }
  const match = pathname.match(/^\/app\/organizations\/([^/]+)(.*)$/);
  if (!match || !match[1]) {
    return null;
  }
  let currentSegment = match[1];
  try {
    currentSegment = decodeURIComponent(currentSegment);
  } catch {
    // Keep raw segment if malformed percent-encoding.
  }
  if (currentSegment === canonical) {
    return null;
  }
  const rest = match[2] ?? "";
  return `/app/organizations/${encodeURIComponent(canonical)}${rest}`;
}

/**
 * Appends query string (`?a=b`) and hash (`#section`) to a pathname.
 * @param {string} pathname
 * @param {string} [search]
 * @param {string} [hash]
 * @returns {string}
 */
export function appendSearchAndHash(pathname, search = "", hash = "") {
  const normalizedSearch = search
    ? search.startsWith("?")
      ? search
      : `?${search}`
    : "";
  const normalizedHash = hash
    ? hash.startsWith("#")
      ? hash
      : `#${hash}`
    : "";
  return `${pathname}${normalizedSearch}${normalizedHash}`;
}

/**
 * Returns true when pathname targets a nested site or building detail route
 * whose panel owns single-hop full canonical URL replacement.
 * @param {string} pathname
 * @returns {boolean}
 */
export function isLocationDetailRoute(pathname) {
  if (typeof pathname !== "string") {
    return false;
  }
  return /^\/app\/organizations\/[^/]+\/sites\/[^/]+(?:\/buildings\/[^/]+)?\/?$/.test(
    pathname,
  );
}

/**
 * Returns true when a route ref matches either the entity's canonical UUID
 * or its case-insensitive code.
 * @param {string} ref
 * @param {string} id
 * @param {string} code
 * @returns {boolean}
 */
export function matchesEntityRef(ref, id, code) {
  if (typeof ref !== "string" || ref.length === 0) {
    return false;
  }
  return ref === id || toUrlCode(ref) === toUrlCode(code);
}
