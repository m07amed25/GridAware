import { createHash } from 'node:crypto';
import type { z } from 'zod';
import type { DeviceTopic } from './telemetry-topic.js';
import {
  deviceStatusSchema,
  telemetryEnvelopeSchema,
  type DeviceStatusMessage,
  type TelemetryEnvelope,
} from './telemetry.schemas.js';

/** Starting limits from mqtt-topic-message-contracts.md §10 (not measured capacity). */
export const INGESTION_LIMITS = {
  maxPayloadBytes: 64 * 1024,
  maxFutureSkewMs: 5 * 60 * 1000,
};

export type IngestionLimits = typeof INGESTION_LIMITS;

export type RejectReason =
  | 'PAYLOAD_TOO_LARGE'
  | 'INVALID_JSON'
  | 'SCHEMA_VIOLATION'
  | 'DEVICE_MISMATCH'
  | 'FUTURE_TIMESTAMP'
  | 'DUPLICATE_SENSOR';

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: RejectReason; detail: string };

function reject<T>(reason: RejectReason, detail: string): ValidationResult<T> {
  return { ok: false, reason, detail };
}

function decode<S extends z.ZodType>(
  payload: Buffer,
  schema: S,
  limits: IngestionLimits,
): ValidationResult<z.infer<S>> {
  if (payload.byteLength > limits.maxPayloadBytes) {
    return reject(
      'PAYLOAD_TOO_LARGE',
      `${payload.byteLength} bytes exceeds ${limits.maxPayloadBytes}`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(payload.toString('utf8'));
  } catch {
    return reject('INVALID_JSON', 'payload is not valid JSON');
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return reject(
      'SCHEMA_VIOLATION',
      `${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
  }
  return { ok: true, value: parsed.data };
}

function checkDevice(topic: DeviceTopic, deviceId: string): string | null {
  return deviceId.toLowerCase() === topic.deviceId
    ? null
    : `payload deviceId ${deviceId} does not match topic deviceId ${topic.deviceId}`;
}

function isTooFarInFuture(
  timestamp: string,
  now: Date,
  limits: IngestionLimits,
): boolean {
  return Date.parse(timestamp) - now.getTime() > limits.maxFutureSkewMs;
}

export function validateTelemetry(
  topic: DeviceTopic,
  payload: Buffer,
  now: Date,
  limits: IngestionLimits = INGESTION_LIMITS,
): ValidationResult<TelemetryEnvelope> {
  const decoded = decode(payload, telemetryEnvelopeSchema, limits);
  if (!decoded.ok) {
    return decoded;
  }
  const envelope = decoded.value;

  const mismatch = checkDevice(topic, envelope.deviceId);
  if (mismatch) {
    return reject('DEVICE_MISMATCH', mismatch);
  }

  const timestamps = [
    envelope.observedAt,
    ...envelope.metrics.flatMap((m) => (m.observedAt ? [m.observedAt] : [])),
  ];
  const future = timestamps.find((t) => isTooFarInFuture(t, now, limits));
  if (future) {
    return reject('FUTURE_TIMESTAMP', `observedAt ${future} is too far ahead`);
  }

  // MVP permits at most one sample per Sensor per envelope (§6).
  const seen = new Set<string>();
  for (const metric of envelope.metrics) {
    const sensorId = metric.sensorId.toLowerCase();
    if (seen.has(sensorId)) {
      return reject('DUPLICATE_SENSOR', `sensor ${sensorId} appears twice`);
    }
    seen.add(sensorId);
  }

  return { ok: true, value: envelope };
}

export function validateDeviceStatus(
  topic: DeviceTopic,
  payload: Buffer,
  now: Date,
  limits: IngestionLimits = INGESTION_LIMITS,
): ValidationResult<DeviceStatusMessage> {
  const decoded = decode(payload, deviceStatusSchema, limits);
  if (!decoded.ok) {
    return decoded;
  }
  const status = decoded.value;

  const mismatch = checkDevice(topic, status.deviceId);
  if (mismatch) {
    return reject('DEVICE_MISMATCH', mismatch);
  }
  if (isTooFarInFuture(status.observedAt, now, limits)) {
    return reject(
      'FUTURE_TIMESTAMP',
      `observedAt ${status.observedAt} is too far ahead`,
    );
  }
  return { ok: true, value: status };
}

/** Deterministic JSON (sorted keys) used for idempotency content hashing. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function contentHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
