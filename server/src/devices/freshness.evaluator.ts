export type DerivedFreshnessState =
  | 'ONLINE'
  | 'STALE'
  | 'OFFLINE'
  | 'UNKNOWN'
  | 'MAINTENANCE';

export interface FreshnessInput {
  readonly lastObservedAt: Date | null;
  readonly lastDisconnectedAt?: Date | null;
  readonly expectedReportingIntervalSeconds?: number | null;
  readonly isMaintenance?: boolean;
  readonly now?: Date;
}

const DEFAULT_EXPECTED_INTERVAL_SECONDS = 60;
const STALE_MULTIPLIER = 2;
const OFFLINE_MULTIPLIER = 4;

/**
 * Pure domain evaluator for device/sensor freshness.
 * Never conflates connectivity with physical asset health (Constitution IV).
 */
export function evaluateFreshness(input: FreshnessInput): DerivedFreshnessState {
  if (input.isMaintenance) {
    return 'MAINTENANCE';
  }
  if (!input.lastObservedAt) {
    return 'UNKNOWN';
  }
  if (
    input.lastDisconnectedAt &&
    input.lastDisconnectedAt.getTime() >= input.lastObservedAt.getTime()
  ) {
    return 'OFFLINE';
  }

  const now = input.now ?? new Date();
  const elapsedSeconds = Math.max(
    0,
    (now.getTime() - input.lastObservedAt.getTime()) / 1000,
  );
  const interval =
    input.expectedReportingIntervalSeconds &&
    input.expectedReportingIntervalSeconds > 0
      ? input.expectedReportingIntervalSeconds
      : DEFAULT_EXPECTED_INTERVAL_SECONDS;

  if (elapsedSeconds <= interval * STALE_MULTIPLIER) {
    return 'ONLINE';
  }
  if (elapsedSeconds <= interval * OFFLINE_MULTIPLIER) {
    return 'STALE';
  }
  return 'OFFLINE';
}
