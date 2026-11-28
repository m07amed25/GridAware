import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

@Injectable()
export class MetricCatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive() {
    return this.prisma.metricDefinition.findMany({
      where: { isActive: true },
      orderBy: { key: 'asc' },
    });
  }

  async validateMetricAndUnit(metricKey: string, unit: string) {
    const def = await this.prisma.metricDefinition.findUnique({
      where: { key: metricKey },
    });
    if (!def || !def.isActive) {
      throw new BadRequestException(`Unknown or inactive metric key: ${metricKey}`);
    }
    if (!def.supportedUnits.includes(unit)) {
      throw new BadRequestException(
        `Unit "${unit}" is not supported for metric "${metricKey}". Supported units: ${def.supportedUnits.join(', ')}`,
      );
    }
    return def;
  }
}
