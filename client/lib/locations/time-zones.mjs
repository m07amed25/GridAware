import { isValidClientTimeZone } from "./validation.mjs";

export const COMMON_TIME_ZONES = Object.freeze([
  "UTC",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Riyadh",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
]);

/**
 * Format the current UTC offset for a valid IANA time zone (e.g. "UTC+02:00").
 *
 * @param {string} timeZone
 * @param {Date} [date]
 * @returns {string}
 */
export function getTimeZoneOffsetLabel(timeZone, date = new Date()) {
  if (typeof timeZone !== "string") {
    return "UTC+00:00";
  }
  const trimmed = timeZone.trim();
  if (!trimmed || trimmed === "UTC") {
    return "UTC+00:00";
  }
  if (/^[+-]/.test(trimmed) || /^(?:UTC|GMT)[+-]/i.test(trimmed)) {
    return "UTC+00:00";
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: trimmed,
      timeZoneName: "longOffset",
    }).formatToParts(date);
    const raw = parts.find((part) => part.type === "timeZoneName")?.value ?? "";
    if (!raw || raw === "GMT" || raw === "UTC") {
      return "UTC+00:00";
    }
    const normalized = raw.replace(/^GMT/i, "UTC").replace("−", "-");
    return /^UTC[+-]\d{2}:\d{2}$/.test(normalized) ? normalized : "UTC+00:00";
  } catch {
    return "UTC+00:00";
  }
}

/**
 * Build search keywords so users can find a time zone by IANA ID, city name,
 * region, or UTC offset (e.g. "cairo", "new york", "+02:00", "utc+2").
 *
 * @param {string} timeZone
 * @param {string} offsetLabel
 * @returns {string[]}
 */
export function getTimeZoneSearchKeywords(timeZone, offsetLabel) {
  const spaced = timeZone.replaceAll("/", " ").replaceAll("_", " ");
  const city = timeZone.includes("/")
    ? timeZone.slice(timeZone.lastIndexOf("/") + 1).replaceAll("_", " ")
    : timeZone;
  const bareOffset = offsetLabel.replace(/^UTC/, "");
  const compactOffset = bareOffset.replace(/^([+-])0(\d):00$/, "$1$2");

  const keywords = new Set([
    timeZone,
    spaced,
    city,
    offsetLabel,
    bareOffset,
    `UTC${compactOffset}`,
    `GMT${bareOffset}`,
  ]);

  return Array.from(keywords).filter(Boolean);
}

/**
 * @param {string} timeZone
 * @param {Date} date
 * @param {boolean} isLocal
 */
function buildTimeZoneOption(timeZone, date, isLocal) {
  const offset = getTimeZoneOffsetLabel(timeZone, date);
  const slashIndex = timeZone.indexOf("/");
  const region = slashIndex === -1 ? "Universal" : timeZone.slice(0, slashIndex);
  return {
    value: timeZone,
    offset,
    region,
    isLocal,
    keywords: getTimeZoneSearchKeywords(timeZone, offset),
  };
}

/**
 * Return all supported IANA time zones split into deduplicated `recommended`
 * (browser local + common operational zones) and `all` (remaining supported zones).
 *
 * @param {{
 *   date?: Date;
 *   detectedTimeZone?: string | null;
 *   selectedTimeZone?: string | null;
 * }} [options]
 */
export function getTimeZoneCatalog(options = {}) {
  const date = options.date ?? new Date();
  const detected =
    typeof options.detectedTimeZone === "string" &&
    isValidClientTimeZone(options.detectedTimeZone)
      ? options.detectedTimeZone.trim()
      : null;
  const selected =
    typeof options.selectedTimeZone === "string" &&
    options.selectedTimeZone.trim().length > 0
      ? options.selectedTimeZone.trim()
      : null;

  const seen = new Set();
  const recommended = [];

  if (detected && !seen.has(detected)) {
    seen.add(detected);
    recommended.push(buildTimeZoneOption(detected, date, true));
  }

  for (const tz of COMMON_TIME_ZONES) {
    if (!seen.has(tz) && isValidClientTimeZone(tz)) {
      seen.add(tz);
      recommended.push(buildTimeZoneOption(tz, date, tz === detected));
    }
  }

  const allRaw = new Set(["UTC"]);
  if (typeof Intl.supportedValuesOf === "function") {
    for (const tz of Intl.supportedValuesOf("timeZone")) {
      allRaw.add(tz);
    }
  }
  if (selected && isValidClientTimeZone(selected)) {
    allRaw.add(selected);
  }

  const all = Array.from(allRaw)
    .filter((tz) => !seen.has(tz))
    .sort((a, b) => a.localeCompare(b))
    .map((tz) => buildTimeZoneOption(tz, date, tz === detected));

  return { recommended, all };
}
