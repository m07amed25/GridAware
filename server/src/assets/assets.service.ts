import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { AssetStatus } from '../generated/prisma/enums.js';
import { z } from 'zod';

export const CreateAssetSchema = z.object({
  siteId: z.string().uuid(),
  buildingId: z.string().uuid().optional().nullable(),
  assetCode: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),
  name: z.string().trim().min(1).max(120),
  assetType: z.string().trim().min(2).max(60),
  status: z.nativeEnum(AssetStatus).optional(),
});

export type CreateAssetInput = z.infer<typeof CreateAssetSchema>;

export const ListAssetsQuerySchema = z.object({
  siteId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type ListAssetsQueryInput = z.infer<typeof ListAssetsQuerySchema>;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(context: OrganizationAuthorizationContext, query: ListAssetsQueryInput) {
    const where = {
      organizationId: context.organizationId,
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.buildingId ? { buildingId: query.buildingId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { assetCode: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.asset.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async findOne(context: OrganizationAuthorizationContext, assetId: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, organizationId: context.organizationId },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  async create(context: OrganizationAuthorizationContext, input: CreateAssetInput) {
    const site = await this.prisma.site.findFirst({
      where: { id: input.siteId, organizationId: context.organizationId },
      select: { id: true },
    });
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    if (input.buildingId) {
      const building = await this.prisma.building.findFirst({
        where: {
          id: input.buildingId,
          siteId: input.siteId,
          organizationId: context.organizationId,
        },
        select: { id: true },
      });
      if (!building) {
        throw new NotFoundException('Building not found in the specified site');
      }
    }

    const existing = await this.prisma.asset.findFirst({
      where: {
        organizationId: context.organizationId,
        assetCode: input.assetCode,
      },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Asset code already exists in this organization');
    }

    return this.prisma.asset.create({
      data: {
        organizationId: context.organizationId,
        siteId: input.siteId,
        buildingId: input.buildingId ?? null,
        assetCode: input.assetCode,
        name: input.name,
        assetType: input.assetType,
        status: input.status ?? AssetStatus.ACTIVE,
      },
    });
  }
}
