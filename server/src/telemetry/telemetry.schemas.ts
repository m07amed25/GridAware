import { z } from 'zod';

/**
 * Runtime validators for MQTT payloads. These mirror the JSON Schemas in
 * docs/contracts/schemas/ (the source of truth); drift is caught by
 * telemetry.schemas.contract.spec.ts.
 */

// RFC 3339 date-time with mandatory offset (matches JSON Schema "date-time").
const dateTime = z.iso.datetime({ offset: true });
// Any 8-4-4-4-12 hex UUID (matches JSON Schema "uuid" format).
const uuid = z.guid();

export const telemetryMetricSchema = z.strictObject({
  sensorId: uuid,
  metricCode: z.string().regex(/^[a-z][a-z0-9_]{1,63}$/),
  value: z.number(),
  unit: z.string().min(1).max(24),
  observedAt: dateTime.optional(),
  sourceQuality: z.enum(['GOOD', 'UNCERTAIN', 'BAD']).optional(),
});

export const telemetryEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal('1.0'),
  eventId: uuid,
  deviceId: uuid,
  observedAt: dateTime,
  simulationRunId: uuid.optional(),
  metrics: z.array(telemetryMetricSchema).min(1).max(64),
});

export const deviceStatusSchema = z.strictObject({
  schemaVersion: z.literal('1.0'),
  deviceId: uuid,
  status: z.enum(['ONLINE', 'DEGRADED', 'OFFLINE', 'MAINTENANCE']),
  observedAt: dateTime,
  sequence: z.int().min(0).optional(),
});

export type TelemetryMetric = z.infer<typeof telemetryMetricSchema>;
export type TelemetryEnvelope = z.infer<typeof telemetryEnvelopeSchema>;
export type DeviceStatusMessage = z.infer<typeof deviceStatusSchema>;
