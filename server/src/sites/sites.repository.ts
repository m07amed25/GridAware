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
import type { LocationStatus, SiteType } from '../generated/prisma/enums.js';

export const SITE_SELECT = {
  id: true,
  organizationId: true,
  code: true,
  name: true,
  type: true,
  description: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  region: true,
  postalCode: true,
  countryCode: true,
  latitude: true,
  longitude: true,
  timeZone: true,
  status: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      buildings: {
        where: {
          archivedAt: null,
        },
      },
    },
  },
} as const;

export interface SiteRecord {
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
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly _count: {
    readonly buildings: number;
  };
}

export interface ListSitesFilter {
  readonly organizationId: string;
  readonly limit: number;
  readonly cursor?: string;
  readonly q?: string;
  readonly status?: LocationStatus;
  readonly sort: LocationSortField;
  readonly direction: LocationSortDirection;
  readonly includeArchived: boolean;
}

export interface CreateSitePersistenceData {
  readonly code: string;
  readonly name: string;
  readonly type: SiteType;
  readonly description?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly city?: string | null;
  readonly region?: string | null;
  readonly postalCode?: string | null;
  readonly countryCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly timeZone: string;
}

export interface UpdateSitePersistenceData {
  readonly name?: string;
  readonly type?: SiteType;
  readonly description?: string | null;
  readonly addressLine1?: string | null;
  readonly addressLine2?: string | null;
  readonly city?: string | null;
  readonly region?: string | null;
  readonly postalCode?: string | null;
  readonly countryCode?: string | null;
  readonly latitude?: number | null;
  readonly longitude?: number | null;
  readonly timeZone?: string;
  readonly status?: LocationStatus;
  readonly archivedAt?: Date | null;
}

@Injectable()
export class SitesRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Acquires a row-level lock on the target Site scoped by organizationId
   * to serialize concurrent archiveSite / createBuilding / restoreBuilding operations.
   */
  async lockSiteForUpdate(
    tx: Prisma.TransactionClient,
    organizationId: string,
    siteId: string,
  ): Promise<void> {
    if (typeof tx.$queryRaw === 'function') {
      await tx.$queryRaw`SELECT id FROM sites WHERE id = ${siteId}::uuid AND "organizationId" = ${organizationId}::uuid FOR UPDATE`;
    }
  }

  async findManyInOrganization(filter: ListSitesFilter): Promise<{
    items: SiteRecord[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    const andClauses: Prisma.SiteWhereInput[] = [
      { organizationId: filter.organizationId },
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

      const anchor = await this.prisma.site.findFirst({
        where: {
          id: decoded.id,
          organizationId: filter.organizationId,
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
        ) as Prisma.SiteWhereInput,
      );
    }

    const orderBy: Prisma.SiteOrderByWithRelationInput[] = [
      { [filter.sort]: filter.direction },
      { id: filter.direction },
    ];

    const rows = await this.prisma.site.findMany({
      where: { AND: andClauses },
      select: SITE_SELECT,
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

  findByIdInOrganization(
    organizationId: string,
    siteId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SiteRecord | null> {
    const client = tx ?? this.prisma;
    return client.site.findFirst({
      where: {
        id: siteId,
        organizationId,
      },
      select: SITE_SELECT,
    });
  }

  findByCodeInOrganization(
    organizationId: string,
    code: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SiteRecord | null> {
    const client = tx ?? this.prisma;
    return client.site.findUnique({
      where: {
        organizationId_code: {
          organizationId,
          code,
        },
      },
      select: SITE_SELECT,
    });
  }

  createInOrganization(
    organizationId: string,
    data: CreateSitePersistenceData,
    tx: Prisma.TransactionClient,
  ): Promise<SiteRecord> {
    return tx.site.create({
      data: {
        organizationId,
        code: data.code,
        name: data.name,
        type: data.type,
        description: data.description ?? null,
        addressLine1: data.addressLine1 ?? null,
        addressLine2: data.addressLine2 ?? null,
        city: data.city ?? null,
        region: data.region ?? null,
        postalCode: data.postalCode ?? null,
        countryCode: data.countryCode ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        timeZone: data.timeZone,
      },
      select: SITE_SELECT,
    });
  }

  updateInOrganization(
    organizationId: string,
    siteId: string,
    data: UpdateSitePersistenceData,
    tx: Prisma.TransactionClient,
  ): Promise<SiteRecord> {
    return tx.site.update({
      where: {
        id_organizationId: {
          id: siteId,
          organizationId,
        },
      },
      data,
      select: SITE_SELECT,
    });
  }

  countNonArchivedBuildings(
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
