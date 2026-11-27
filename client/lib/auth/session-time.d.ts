export interface SessionTimeDisplay {
  lastActiveRelative: string;
  lastActiveExact: string;
  idleExpiresExact: string;
  absoluteExpiresExact: string;
}

export function formatRelativeRecency(iso: string, nowMs?: number): string;
export function formatExactTimestamp(
  iso: string,
  options?: { locale?: string; timeZone?: string },
): string;
export function formatSessionTimes(
  session: {
    lastUsedAt: string;
    idleExpiresAt: string;
    absoluteExpiresAt: string;
  },
  options?: { nowMs?: number; locale?: string; timeZone?: string },
): SessionTimeDisplay;
