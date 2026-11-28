import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AssignmentStatus } from '../generated/prisma/enums.js';
import type { ListSensorsQueryInput } from './dto/sensors.schemas.js';

@Injectable()
export class SensorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(organizationId: string, query: ListSensorsQueryInput) {
    const where = {
      organizationId,
      ...(query.assetId ? { assetId: query.assetId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.deviceId
        ? {
            assignments: {
              some: {
                deviceId: query.deviceId,
                status: AssignmentStatus.ACTIVE,
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' as const } },
              { sensorKey: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.sensor.findMany({
        where,
        include: {
          asset: { select: { id: true, name: true, assetCode: true } },
          metrics: { include: { metricDefinition: true } },
          assignments: {
            where: { status: AssignmentStatus.ACTIVE },
            include: {
              device: { select: { id: true, name: true, deviceKey: true } },
            },
          },
        },
        orderBy: { [query.sort]: query.order },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.sensor.count({ where }),
    ]);

    return { items, total };
  }

  async findById(organizationId: string, sensorId: string) {
    return this.prisma.sensor.findFirst({
      where: { id: sensorId, organizationId },
      include: {
        asset: { select: { id: true, name: true, assetCode: true } },
        metrics: { include: { metricDefinition: true } },
        assignments: {
          where: { status: AssignmentStatus.ACTIVE },
          include: {
            device: { select: { id: true, name: true, deviceKey: true } },
          },
        },
      },
    });
  }
}
