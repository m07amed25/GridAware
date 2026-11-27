const LOCATION_CODE_PATTERN =
  /^[A-Z0-9](?:[A-Z0-9]|-(?=[A-Z0-9])){0,30}[A-Z0-9]$/;
const SINGLE_LINE_CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const ISO_ALPHA2_PATTERN = /^[A-Z]{2}$/;
const GROSS_AREA_PATTERN = /^(?:0|[1-9][0-9]{0,9})(?:\.[0-9]{1,2})?$/;

let supportedTimeZones = null;

function getSupportedTimeZones() {
  if (!supportedTimeZones) {
    const set = new Set(["UTC"]);
    if (typeof Intl.supportedValuesOf === "function") {
      for (const tz of Intl.supportedValuesOf("timeZone")) {
        set.add(tz);
      }
    }
    supportedTimeZones = set;
  }
  return supportedTimeZones;
}

export function isValidClientTimeZone(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (/^[+-]/.test(trimmed) || /^(?:UTC|GMT)[+-]/i.test(trimmed)) {
    return false;
  }
  if (!getSupportedTimeZones().has(trimmed)) {
    return false;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

export function formatLocationCodePreview(raw) {
  if (typeof raw !== "string") return "";
  return raw.trim().toUpperCase();
}

export function formatGrossAreaDisplay(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return "Not specified";
  }
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    return `${value} m²`;
  }
  return `${parsed.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} m²`;
}

export function formatSiteLocalTime(timeZone, date = new Date()) {
  const safeZone = isValidClientTimeZone(timeZone) ? timeZone : "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: safeZone,
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

export function parseArchiveBlockedBuildingCount(detail) {
  if (typeof detail !== "string") return null;
  const match = detail.match(/\b(\d+)\s+non-archived\s+building/i);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * @param {{
 *   mode: "create" | "edit";
 *   code?: string;
 *   name: string;
 *   type: string;
 *   timeZone: string;
 *   countryCode?: string;
 *   latitude?: string;
 *   longitude?: string;
 * }} input
 * @returns {Record<string, string>}
 */
export function validateSiteFormInput(input) {
  /** @type {Record<string, string>} */
  const errors = {};

  if (input.mode === "create") {
    const code = formatLocationCodePreview(input.code ?? "");
    if (!LOCATION_CODE_PATTERN.test(code)) {
      errors.code =
        "Use 2–32 uppercase letters, numbers, and single internal hyphens (no spaces).";
    }
  }

  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    errors.name = "Name must be between 2 and 120 characters.";
  } else if (SINGLE_LINE_CONTROL_CHARS.test(name)) {
    errors.name = "Name must not contain control characters.";
  }

  if (!input.type) {
    errors.type = "Select a site type.";
  }

  const tz = (input.timeZone ?? "").trim();
  if (!isValidClientTimeZone(tz)) {
    errors.timeZone =
      "Enter a valid IANA time zone (for example, Africa/Cairo or UTC).";
  }

  const country = (input.countryCode ?? "").trim().toUpperCase();
  if (country.length > 0 && !ISO_ALPHA2_PATTERN.test(country)) {
    errors.countryCode = "Use a 2-letter ISO country code (for example, EG).";
  }

  const latStr = String(input.latitude ?? "").trim();
  const lngStr = String(input.longitude ?? "").trim();
  const hasLat = latStr.length > 0;
  const hasLng = lngStr.length > 0;

  if (hasLat !== hasLng) {
    const targetField = hasLat ? "longitude" : "latitude";
    errors[targetField] =
      "Provide both latitude and longitude together, or leave both blank.";
  } else if (hasLat && hasLng) {
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      errors.latitude = "Latitude must be between -90 and 90.";
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      errors.longitude = "Longitude must be between -180 and 180.";
    }
  }

  return errors;
}

/**
 * @param {{
 *   mode: "create" | "edit";
 *   code?: string;
 *   name: string;
 *   type: string;
 *   floorCount?: string;
 *   grossAreaSqM?: string;
 * }} input
 * @returns {Record<string, string>}
 */
export function validateBuildingFormInput(input) {
  /** @type {Record<string, string>} */
  const errors = {};

  if (input.mode === "create") {
    const code = formatLocationCodePreview(input.code ?? "");
    if (!LOCATION_CODE_PATTERN.test(code)) {
      errors.code =
        "Use 2–32 uppercase letters, numbers, and single internal hyphens (no spaces).";
    }
  }

  const name = (input.name ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    errors.name = "Name must be between 2 and 120 characters.";
  } else if (SINGLE_LINE_CONTROL_CHARS.test(name)) {
    errors.name = "Name must not contain control characters.";
  }

  if (!input.type) {
    errors.type = "Select a building type.";
  }

  const floorStr = String(input.floorCount ?? "").trim();
  if (floorStr.length > 0) {
    if (!/^\d+$/.test(floorStr)) {
      errors.floorCount = "Floor count must be a whole number from 1 to 200.";
    } else {
      const floors = Number.parseInt(floorStr, 10);
      if (floors < 1 || floors > 200) {
        errors.floorCount = "Floor count must be between 1 and 200.";
      }
    }
  }

  const areaStr = String(input.grossAreaSqM ?? "").trim();
  if (areaStr.length > 0) {
    if (!GROSS_AREA_PATTERN.test(areaStr) || Number.parseFloat(areaStr) <= 0) {
      errors.grossAreaSqM =
        "Enter a positive area with up to 2 decimal places (for example, 4200.00).";
    }
  }

  return errors;
}
