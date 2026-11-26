import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service.js';
import type {
  DeviceStatusMessage,
  TelemetryEnvelope,
} from './telemetry.schemas.js';

export type ClaimResult = 'new' | 'duplicate' | 'conflict';

export interface LatestReading {
  organizationId: string;
  siteId: string;
  deviceId: string;
  sensorId: string;
  metricCode: string;
  value: number;
  unit: string;
  observedAt: string;
  sourceQuality?: string;
  eventId: string;
  simulationRunId?: string;
  receivedAt: string;
}

const KEY_PREFIX = 'gridaware';

/** How long event claims are kept for duplicate detection (QoS 1 redelivery window). */
export const EVENT_CLAIM_TTL_SECONDS = 24 * 60 * 60;

// KEYS: [values hash, observedAtMs hash]; ARGV: repeated (field, observedAtMs, json).
// Only overwrites a sensor's latest value when the new sample is not older.
const RECORD_LATEST_SCRIPT = `
local updated = 0
for i = 1, #ARGV, 3 do
  local current = redis.call('HGET', KEYS[2], ARGV[i])
  if (not current) or tonumber(ARGV[i + 1]) >= tonumber(current) then
    redis.call('HSET', KEYS[1], ARGV[i], ARGV[i + 2])
    redis.call('HSET', KEYS[2], ARGV[i], ARGV[i + 1])
    updated = updated + 1
  end
end
return updated
`;

// KEYS: [status hash]; ARGV: status, observedAt, observedAtMs, sequence, receivedAt.
// Orders updates by (observedAtMs, sequence) so stale/redelivered status is ignored.
const RECORD_STATUS_SCRIPT = `
local curTs = tonumber(redis.call('HGET', KEYS[1], 'observedAtMs') or '-1')
local curSeq = tonumber(redis.call('HGET', KEYS[1], 'sequence') or '-1') or -1
local newTs = tonumber(ARGV[3])
local newSeq = tonumber(ARGV[4]) or -1
if newTs < curTs or (newTs == curTs and newSeq <= curSeq) then
  return 0
end
redis.call('HSET', KEYS[1], 'status', ARGV[1], 'observedAt', ARGV[2],
  'observedAtMs', ARGV[3], 'sequence', ARGV[4], 'receivedAt', ARGV[5])
return 1
`;

/**
 * Redis-backed ingestion state: event de-duplication, latest value per
 * sensor, and last-known device status.
 *
 * NOTE: Redis de-duplication is a fast pre-filter only. Durable idempotency
 * (organizationId, deviceId, sourceEventId) must be enforced in PostgreSQL
 * once TelemetryEvent persistence is implemented (contract §6).
 */
@Injectable()
export class TelemetryStoreService {
  constructor(private readonly redis: RedisService) {}

  static eventKey(orgId: string, deviceId: string, eventId: string): string {
    return `${KEY_PREFIX}:ingest:event:${orgId}:${deviceId}:${eventId.toLowerCase()}`;
  }

  static latestKeys(orgId: string, siteId: string): [string, string] {
    const base = `${KEY_PREFIX}:telemetry:latest:${orgId}:${siteId}`;
    return [base, `${base}:ts`];
  }

  static statusKey(orgId: string, deviceId: string): string {
    return `${KEY_PREFIX}:device:status:${orgId}:${deviceId}`;
  }

  /** Atomically claim an event ID; detects duplicates and content conflicts. */
  async claimEvent(
    orgId: string,
    deviceId: string,
    eventId: string,
    hash: string,
  ): Promise<ClaimResult> {
    const previous = (await this.redis.client.call(
      'SET',
      TelemetryStoreService.eventKey(orgId, deviceId, eventId),
      hash,
      'EX',
      String(EVENT_CLAIM_TTL_SECONDS),
      'NX',
      'GET',
    )) as string | null;

    if (previous === null) {
      return 'new';
    }
    return previous === hash ? 'duplicate' : 'conflict';
  }

  /** Release a claim so a redelivered message can be retried after a failure. */
  async releaseEvent(
    orgId: string,
    deviceId: string,
    eventId: string,
  ): Promise<void> {
    await this.redis.client.del(
      TelemetryStoreService.eventKey(orgId, deviceId, eventId),
    );
  }

  async recordLatest(
    orgId: string,
    siteId: string,
    envelope: TelemetryEnvelope,
    receivedAt: Date,
  ): Promise<number> {
    const args: string[] = [];
    for (const metric of envelope.metrics) {
      const observedAt = metric.observedAt ?? envelope.observedAt;
      const reading: LatestReading = {
        organizationId: orgId,
        siteId,
        deviceId: envelope.deviceId.toLowerCase(),
        sensorId: metric.sensorId.toLowerCase(),
        metricCode: metric.metricCode,
        value: metric.value,
        unit: metric.unit,
        observedAt,
        sourceQuality: metric.sourceQuality,
        eventId: envelope.eventId.toLowerCase(),
        simulationRunId: envelope.simulationRunId?.toLowerCase(),
        receivedAt: receivedAt.toISOString(),
      };
      args.push(
        reading.sensorId,
        String(Date.parse(observedAt)),
        JSON.stringify(reading),
      );
    }

    const [valuesKey, tsKey] = TelemetryStoreService.latestKeys(orgId, siteId);
    return (await this.redis.client.eval(
      RECORD_LATEST_SCRIPT,
      2,
      valuesKey,
      tsKey,
      ...args,
    )) as number;
  }

  async getLatest(orgId: string, siteId: string): Promise<LatestReading[]> {
    const [valuesKey] = TelemetryStoreService.latestKeys(orgId, siteId);
    const values = await this.redis.client.hvals(valuesKey);
    return values.map((v) => JSON.parse(v) as LatestReading);
  }

  /** Returns true when the status was newer and stored, false when stale. */
  async recordStatus(
    orgId: string,
    status: DeviceStatusMessage,
    receivedAt: Date,
  ): Promise<boolean> {
    const updated = (await this.redis.client.eval(
      RECORD_STATUS_SCRIPT,
      1,
      TelemetryStoreService.statusKey(orgId, status.deviceId.toLowerCase()),
      status.status,
      status.observedAt,
      String(Date.parse(status.observedAt)),
      status.sequence === undefined ? '' : String(status.sequence),
      receivedAt.toISOString(),
    )) as number;
    return updated === 1;
  }
}
