/**
 * Formats an ISO timestamp into a concise relative recency label given a reference `nowMs`.
 * @param {string} iso
 * @param {number} [nowMs]
 */
export function formatRelativeRecency(iso, nowMs = Date.now()) {
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) {
    return iso;
  }
  const diffSeconds = Math.max(0, Math.floor((nowMs - ts) / 1000));
  if (diffSeconds < 60) {
    return "Just now";
  }
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  return formatExactTimestamp(iso);
}

/**
 * Formats an ISO timestamp with explicit timezone abbreviation.
 * @param {string} iso
 * @param {{ locale?: string; timeZone?: string }} [options]
 */
export function formatExactTimestamp(iso, options = {}) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  try {
    return new Intl.DateTimeFormat(options.locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: options.timeZone,
      timeZoneName: "short",
    }).format(date);
  } catch {
    return date.toISOString();
  }
}

/**
 * Builds the complete SessionTimeDisplay view model for an Active Session row.
 * @param {{ lastUsedAt: string; idleExpiresAt: string; absoluteExpiresAt: string }} session
 * @param {{ nowMs?: number; locale?: string; timeZone?: string }} [options]
 */
export function formatSessionTimes(session, options = {}) {
  const nowMs = options.nowMs ?? Date.now();
  return {
    lastActiveRelative: formatRelativeRecency(session.lastUsedAt, nowMs),
    lastActiveExact: formatExactTimestamp(session.lastUsedAt, options),
    idleExpiresExact: formatExactTimestamp(session.idleExpiresAt, options),
    absoluteExpiresExact: formatExactTimestamp(session.absoluteExpiresAt, options),
  };
}
