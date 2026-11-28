import { z } from 'zod';
import { DeviceStatus, DeviceType } from '../../generated/prisma/enums.js';

const FORBIDDEN_METADATA_KEYS = /secret|password|token|privateKey|credential/i;

const SafeMetadataSchema = z
  .record(
    z.string().max(64),
    z.union([z.string().max(256), z.number().finite(), z.boolean(), z.null()]),
  )
  .refine(
    (obj) =>
      Object.keys(obj).length <= 20 &&
      Object.keys(obj).every((k) => !FORBIDDEN_METADATA_KEYS.test(k)),
    { message: 'Metadata must have at most 20 keys and must not contain credential fields' },
  );

export const DeviceKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(100)
  .regex(/^[a-z0-9][a-z0-9._-]*$/, 'deviceKey must be a lowercase slug');

export const CreateDeviceSchema = z.object({
  deviceKey: DeviceKeySchema,
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  deviceType: z.nativeEnum(DeviceType).default(DeviceType.SIMULATOR),
  siteId: z.string().uuid().optional().nullable(),
  assetId: z.string().uuid().optional().nullable(),
  serialNumber: z.string().trim().max(120).optional().nullable(),
  manufacturer: z.string().trim().max(120).optional().nullable(),
  model: z.string().trim().max(120).optional().nullable(),
  firmwareVersion: z.string().trim().max(80).optional().nullable(),
  metadata: SafeMetadataSchema.optional().nullable(),
});

export type CreateDeviceInput = z.infer<typeof CreateDeviceSchema>;

export const UpdateDeviceSchema = z
  .object({
    deviceKey: DeviceKeySchema.optional(),
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    siteId: z.string().uuid().optional().nullable(),
    assetId: z.string().uuid().optional().nullable(),
    serialNumber: z.string().trim().max(120).optional().nullable(),
    manufacturer: z.string().trim().max(120).optional().nullable(),
    model: z.string().trim().max(120).optional().nullable(),
    firmwareVersion: z.string().trim().max(80).optional().nullable(),
    metadata: SafeMetadataSchema.optional().nullable(),
  })
  .strict();

export type UpdateDeviceInput = z.infer<typeof UpdateDeviceSchema>;

export const ListDevicesQuerySchema = z.object({
  status: z.nativeEnum(DeviceStatus).optional(),
  deviceType: z.nativeEnum(DeviceType).optional(),
  siteId: z.string().uuid().optional(),
  assetId: z.string().uuid().optional(),
  lastSeenFrom: z.coerce.date().optional(),
  lastSeenTo: z.coerce.date().optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z
    .enum(['createdAt', 'updatedAt', 'name', 'deviceKey', 'lastSeenAt', 'status'])
    .default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type ListDevicesQueryInput = z.infer<typeof ListDevicesQuerySchema>;
