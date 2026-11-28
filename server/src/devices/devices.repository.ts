import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { ListDevicesQueryInput } from './dto/devices.schemas.js';

@Injectable()
export class DevicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(organizationId: string, query: ListDevicesQueryInput) {
    const where = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.deviceType ? { deviceType: query.deviceType } : {}),
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.lastSeenFrom || query.lastSeenTo
        ? {
            lastSeenAt: {
              ...(query.lastSeenFrom ? { gte: query.lastSeenFrom } : {}),
              ...(query.lastSeenTo ? { lte: query.lastSeenTo } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { deviceKey: { contains: query.search, mode: 'insensitive' as const } },
              { serialNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.device.findMany({
        where,
        include: {
          site: { select: { id: true, name: true, code: true } },
          asset: { select: { id: true, name: true, assetCode: true } },
        },
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.device.count({ where }),
    ]);

    return { items, total };
  }

  async findById(organizationId: string, deviceId: string) {
    return this.prisma.device.findFirst({
      where: { id: deviceId, organizationId },
      include: {
        site: { select: { id: true, name: true, code: true } },
        asset: { select: { id: true, name: true, assetCode: true } },
      },
    });
  }
}
