import type { LocationStatus, SiteType } from '../../generated/prisma/enums.js';
import type { SiteRecord } from '../sites.repository.js';

export interface SiteDto {
  readonly id: string;
  readonly organizationId: string;
  readonly code: string;
  readonly name: string;
  readonly type: SiteType;
  readonly description: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly region: string | null;
  readonly postalCode: string | null;
  readonly countryCode: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly timeZone: string;
  readonly status: LocationStatus;
  readonly archivedAt: string | null;
  readonly buildingCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toSiteDto(record: SiteRecord): SiteDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    code: record.code,
    name: record.name,
    type: record.type,
    description: record.description,
    addressLine1: record.addressLine1,
    addressLine2: record.addressLine2,
    city: record.city,
    region: record.region,
    postalCode: record.postalCode,
    countryCode: record.countryCode,
    latitude: record.latitude,
    longitude: record.longitude,
    timeZone: record.timeZone,
    status: record.status,
    archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
    buildingCount: record._count.buildings,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
