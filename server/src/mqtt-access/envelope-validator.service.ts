import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../database/prisma.service.js';
import {
  AssignmentStatus,
  DeviceStatus,
  SensorStatus,
} from '../generated/prisma/enums.js';

const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

export const TelemetryEnvelopeSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    eventId: z
      .string()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
    deviceKey: z
      .string()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9][a-z0-9._-]*$/),
    sentAt: z.string().datetime({ offset: true }),
    sequence: z.number().int().min(0).optional(),
    readings: z
      .array(
        z
          .object({
            sensorKey: z
              .string()
              .min(3)
              .max(120)
              .regex(/^[a-z0-9][a-z0-9._-]*$/),
            metricKey: z
              .string()
              .min(2)
              .max(80)
              .regex(/^[a-z][a-z0-9_]*$/),
            value: z.number().finite(),
            unit: z.string().min(1).max(20),
            quality: z.enum(['GOOD', 'UNCERTAIN', 'BAD']),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const DeviceStatusEnvelopeSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    eventId: z.string().min(16).max(128),
    deviceKey: z.string().min(3).max(100),
    sentAt: z.string().datetime({ offset: true }),
    status: z.enum(['ONLINE', 'OFFLINE', 'DEGRADED']),
    firmwareVersion: z.string().max(80).optional(),
    reportedUptimeSeconds: z.number().int().min(0).optional(),
    details: z
      .record(
        z.string(),
        z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
      )
      .refine((d) => Object.keys(d).length <= 20, 'Too many detail properties')
      .optional(),
  })
  .strict();

export interface EnvelopeValidationResult {
  readonly valid: boolean;
  readonly reason?: string;
}

@Injectable()
export class EnvelopeValidatorService {
  constructor(private readonly prisma: PrismaService) {}

  validateRawSize(rawPayload: string | Buffer): EnvelopeValidationResult {
    const byteLength =
      typeof rawPayload === 'string'
        ? Buffer.byteLength(rawPayload, 'utf8')
        : rawPayload.byteLength;
    if (byteLength > MAX_PAYLOAD_BYTES) {
      return { valid: false, reason: 'PAYLOAD_TOO_LARGE' };
    }
    return { valid: true };
  }

  validateTimestampSkew(
    sentAtIso: string,
    now: Date = new Date(),
  ): EnvelopeValidationResult {
    const parsed = new Date(sentAtIso);
    if (Number.isNaN(parsed.getTime())) {
      return { valid: false, reason: 'INVALID_TIMESTAMP' };
    }
    if (Math.abs(now.getTime() - parsed.getTime()) > MAX_CLOCK_SKEW_MS) {
      return { valid: false, reason: 'TIMESTAMP_SKEW_EXCEEDED' };
    }
    return { valid: true };
  }

  async validateTelemetryEnvelope(
    authenticatedOrganizationId: string,
    authenticatedDeviceKey: string,
    rawPayload: string | Buffer,
    now: Date = new Date(),
  ): Promise<EnvelopeValidationResult> {
    const sizeCheck = this.validateRawSize(rawPayload);
    if (!sizeCheck.valid) return sizeCheck;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawPayload.toString('utf8'));
    } catch {
      return { valid: false, reason: 'MALFORMED_JSON' };
    }

    const parsed = TelemetryEnvelopeSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { valid: false, reason: 'SCHEMA_VALIDATION_FAILED' };
    }

    const envelope = parsed.data;
    if (envelope.deviceKey !== authenticatedDeviceKey) {
      return { valid: false, reason: 'DEVICE_KEY_MISMATCH' };
    }

    const skewCheck = this.validateTimestampSkew(envelope.sentAt, now);
    if (!skewCheck.valid) return skewCheck;

    const device = await this.prisma.device.findFirst({
      where: {
        organizationId: authenticatedOrganizationId,
        deviceKey: authenticatedDeviceKey,
      },
      select: { id: true, status: true },
    });

    if (!device || device.status !== DeviceStatus.ACTIVE) {
      return { valid: false, reason: 'DEVICE_NOT_ACTIVE' };
    }

    const sensorKeys = [...new Set(envelope.readings.map((r) => r.sensorKey))];
    const assignments = await this.prisma.deviceSensorAssignment.findMany({
      where: {
        organizationId: authenticatedOrganizationId,
        deviceId: device.id,
        status: AssignmentStatus.ACTIVE,
        sensor: { sensorKey: { in: sensorKeys } },
      },
      include: {
        sensor: {
          include: {
            metrics: { include: { metricDefinition: true } },
          },
        },
      },
    });

    const assignmentBySensorKey = new Map(
      assignments.map((a) => [a.sensor.sensorKey, a]),
    );

    for (const reading of envelope.readings) {
      const assignment = assignmentBySensorKey.get(reading.sensorKey);
      if (!assignment) {
        return { valid: false, reason: `SENSOR_NOT_ASSIGNED:${reading.sensorKey}` };
      }
      if (assignment.sensor.status !== SensorStatus.ACTIVE) {
        return { valid: false, reason: `SENSOR_NOT_ACTIVE:${reading.sensorKey}` };
      }
      const metric = assignment.sensor.metrics.find(
        (m) => m.metricKey === reading.metricKey,
      );
      if (!metric) {
        return { valid: false, reason: `METRIC_NOT_CONFIGURED:${reading.metricKey}` };
      }
      if (!metric.metricDefinition.supportedUnits.includes(reading.unit)) {
        return { valid: false, reason: `UNSUPPORTED_UNIT:${reading.unit}` };
      }
    }

    return { valid: true };
  }

  async validateStatusEnvelope(
    authenticatedOrganizationId: string,
    authenticatedDeviceKey: string,
    rawPayload: string | Buffer,
    now: Date = new Date(),
  ): Promise<EnvelopeValidationResult> {
    const sizeCheck = this.validateRawSize(rawPayload);
    if (!sizeCheck.valid) return sizeCheck;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawPayload.toString('utf8'));
    } catch {
      return { valid: false, reason: 'MALFORMED_JSON' };
    }

    const parsed = DeviceStatusEnvelopeSchema.safeParse(parsedJson);
    if (!parsed.success) {
      return { valid: false, reason: 'SCHEMA_VALIDATION_FAILED' };
    }

    if (parsed.data.deviceKey !== authenticatedDeviceKey) {
      return { valid: false, reason: 'DEVICE_KEY_MISMATCH' };
    }

    const skewCheck = this.validateTimestampSkew(parsed.data.sentAt, now);
    if (!skewCheck.valid) return skewCheck;

    const device = await this.prisma.device.findFirst({
      where: {
        organizationId: authenticatedOrganizationId,
        deviceKey: authenticatedDeviceKey,
      },
      select: { id: true, status: true },
    });

    if (!device || device.status !== DeviceStatus.ACTIVE) {
      return { valid: false, reason: 'DEVICE_NOT_ACTIVE' };
    }

    return { valid: true };
  }
}
