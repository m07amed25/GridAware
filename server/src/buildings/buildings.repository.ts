import { Injectable } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception.js';
import {
  buildKeysetCursorWhere,
  decodeLocationCursor,
  encodeLocationCursor,
  type LocationSortDirection,
  type LocationSortField,
} from '../common/pagination/location-cursor.js';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { BuildingType, LocationStatus } from '../generated/prisma/enums.js';

export const BUILDING_SELECT = {
  id: true,
  organizationId: true,
  siteId: true,
  code: true,
  name: true,
  type: true,
  description: true,
  floorCount: true,
  grossAreaSqM: true,
  status: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export interface BuildingRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly code: string;
  readonly name: string;
  readonly type: BuildingType;
  readonly description: string | null;
  readonly floorCount: number | null;
  readonly grossAreaSqM: Prisma.Decimal | null;
  readonly status: LocationStatus;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ListBuildingsFilter {
  readonly organizationId: string;
  readonly siteId: string;
  readonly limit: number;
  readonly cursor?: string;
  readonly q?: string;
  readonly status?: LocationStatus;
  readonly sort: LocationSortField;
  readonly direction: LocationSortDirection;
  readonly includeArchived: boolean;
}

export interface CreateBuildingPersistenceData {
  readonly code: string;
  readonly name: string;
  readonly type: BuildingType;
  readonly description?: string | null;
  readonly floorCount?: number | null;
  readonly grossAreaSqM?: string | null;
}

export interface UpdateBuildingPersistenceData {
  readonly name?: string;
  readonly type?: BuildingType;
  readonly description?: string | null;
  readonly floorCount?: number | null;
  readonly grossAreaSqM?: string | null;
  readonly status?: LocationStatus;
  readonly archivedAt?: Date | null;
}

@Injectable()
export class BuildingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  async findManyInSite(filter: ListBuildingsFilter): Promise<{
    items: BuildingRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const andClauses: Prisma.BuildingWhereInput[] = [
      { organizationId: filter.organizationId },
      { siteId: filter.siteId },
    ];

    if (!filter.includeArchived) {
      andClauses.push({ archivedAt: null });
    }
    if (filter.status) {
      andClauses.push({ status: filter.status });
    }
    if (filter.q) {
      andClauses.push({
        OR: [
          { code: { contains: filter.q, mode: 'insensitive' } },
          { name: { contains: filter.q, mode: 'insensitive' } },
        ],
      });
    }

    if (filter.cursor) {
      const decoded = decodeLocationCursor(
        filter.cursor,
        filter.sort,
        filter.direction,
      );

      const anchor = await this.prisma.building.findFirst({
        where: {
          id: decoded.id,
          organizationId: filter.organizationId,
          siteId: filter.siteId,
          ...(!filter.includeArchived ? { archivedAt: null } : {}),
        },
        select: {
          id: true,
          createdAt: true,
          name: true,
          code: true,
        },
      });

      if (!anchor) {
        throw AppException.validation(
          [
            {
              field: 'cursor',
              code: 'invalid_cursor',
              message: 'Invalid pagination cursor',
            },
          ],
          'Invalid pagination cursor',
        );
      }

      andClauses.push(
        buildKeysetCursorWhere(
          anchor,
          filter.sort,
          filter.direction,
        ) as Prisma.BuildingWhereInput,
      );
    }

    const orderBy: Prisma.BuildingOrderByWithRelationInput[] = [
      { [filter.sort]: filter.direction },
      { id: filter.direction },
    ];

    const rows = await this.prisma.building.findMany({
      where: { AND: andClauses },
      select: BUILDING_SELECT,
      orderBy,
      take: filter.limit + 1,
    });

    const hasMore = rows.length > filter.limit;
    const items = hasMore ? rows.slice(0, filter.limit) : rows;
    const nextCursor =
      hasMore && items.length > 0
        ? encodeLocationCursor({
            id: items[items.length - 1].id,
            sort: filter.sort,
            direction: filter.direction,
          })
        : null;

    return { items, nextCursor, hasMore };
  }

  findByIdInSite(
    organizationId: string,
    siteId: string,
    buildingId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BuildingRecord | null> {
    const client = tx ?? this.prisma;
    return client.building.findFirst({
      where: {
        id: buildingId,
        siteId,
        organizationId,
      },
      select: BUILDING_SELECT,
    });
  }

  findByCodeInSite(
    organizationId: string,
    siteId: string,
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BuildingRecord | null> {
    const client = tx ?? this.prisma;
    return client.building.findFirst({
      where: {
        code,
        siteId,
        organizationId,
      },
      select: BUILDING_SELECT,
    });
  }

  createInSite(
    organizationId: string,
    siteId: string,
    data: CreateBuildingPersistenceData,
    tx: Prisma.TransactionClient,
  ): Promise<BuildingRecord> {
    return tx.building.create({
      data: {
        organizationId,
        siteId,
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        floorCount: data.floorCount ?? null,
        grossAreaSqM: data.grossAreaSqM ?? null,
      },
      select: BUILDING_SELECT,
    });
  }

  updateInSite(
    organizationId: string,
    siteId: string,
    buildingId: string,
    data: UpdateBuildingPersistenceData,
    tx: Prisma.TransactionClient,
  ): Promise<BuildingRecord> {
    return tx.building.update({
      where: {
        id_siteId_organizationId: {
          id: buildingId,
          siteId,
          organizationId,
        },
      },
      data,
      select: BUILDING_SELECT,
    });
  }

  countNonArchivedInSite(
    organizationId: string,
    siteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.building.count({
      where: {
        organizationId,
        siteId,
        archivedAt: null,
      },
    });
  }
}
