import { formatGrossAreaSqM } from '../../common/validation/location-validation.js';
import type { BuildingType, LocationStatus } from '../../generated/prisma/enums.js';
import type { BuildingRecord } from '../buildings.repository.js';

export interface BuildingDto {
  readonly id: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly code: string;
  readonly name: string;
  readonly type: BuildingType;
  readonly description: string | null;
  readonly floorCount: number | null;
  readonly grossAreaSqM: string | null;
  readonly status: LocationStatus;
  readonly archivedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function toBuildingDto(record: BuildingRecord): BuildingDto {
  return {
    id: record.id,
    organizationId: record.organizationId,
    siteId: record.siteId,
    code: record.code,
    name: record.name,
    type: record.type,
    description: record.description,
    floorCount: record.floorCount,
    grossAreaSqM: formatGrossAreaSqM(record.grossAreaSqM),
    status: record.status,
    archivedAt: record.archivedAt ? record.archivedAt.toISOString() : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
