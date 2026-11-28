import { z } from 'zod';
import { SensorStatus } from '../../generated/prisma/enums.js';

export const SensorKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'sensorKey must be a lowercase slug');

export const CreateSensorSchema = z.object({
  assetId: z.string().uuid(),
  sensorKey: SensorKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  sensorType: z.string().trim().min(2).max(80),
  installationLocation: z.string().trim().max(160).optional().nullable(),
  manufacturer: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  serialNumber: z.string().trim().max(120).optional().nullable(),
  samplingIntervalSeconds: z.number().int().min(1).max(86400).optional().nullable(),
  expectedReportingIntervalSeconds: z
    .number()
    .int()
    .min(1)
    .max(86400)
    .optional()
    .nullable(),
});

export type CreateSensorInput = z.infer<typeof CreateSensorSchema>;

export const UpdateSensorSchema = z
  .object({
    sensorKey: SensorKeySchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    sensorType: z.string().trim().min(2).max(80).optional(),
    installationLocation: z.string().trim().max(160).optional().nullable(),
    manufacturer: z.string().trim().max(120).optional().nullable(),
    model: z.string().trim().max(120).optional().nullable(),
    serialNumber: z.string().trim().max(120).optional().nullable(),
    samplingIntervalSeconds: z
      .number()
      .int()
      .min(1)
      .max(86400)
      .optional()
      .nullable(),
    expectedReportingIntervalSeconds: z
      .number()
      .int()
      .min(1)
      .max(86400)
      .optional()
      .nullable(),
  })
  .strict();

export type UpdateSensorInput = z.infer<typeof UpdateSensorSchema>;

export const SensorMetricItemSchema = z
  .object({
    metricKey: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[a-z][a-z0-9_]*$/),
    unit: z.string().trim().min(1).max(20),
    precision: z.number().int().min(0).max(6).optional().nullable(),
    minPlausibleValue: z.number().finite().optional().nullable(),
    maxPlausibleValue: z.number().finite().optional().nullable(),
    isPrimary: z.boolean().default(true),
  })
  .refine(
    (item) =>
      item.minPlausibleValue == null ||
      item.maxPlausibleValue == null ||
      item.minPlausibleValue < item.maxPlausibleValue,
    { message: 'minPlausibleValue must be strictly less than maxPlausibleValue' },
  );

export const ReplaceSensorMetricsSchema = z.object({
  metrics: z.array(SensorMetricItemSchema).min(1).max(10),
});

export type ReplaceSensorMetricsInput = z.infer<
  typeof ReplaceSensorMetricsSchema
>;

export const ListSensorsQuerySchema = z.object({
  assetId: z.string().uuid().optional(),
  deviceId: z.string().uuid().optional(),
  status: z.nativeEnum(SensorStatus).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z
    .enum(['createdAt', 'updatedAt', 'name', 'sensorKey', 'lastReadingAt', 'status'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListSensorsQueryInput = z.infer<typeof ListSensorsQuerySchema>;
