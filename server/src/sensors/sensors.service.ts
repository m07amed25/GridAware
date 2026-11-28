import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { evaluateFreshness } from '../devices/freshness.evaluator.js';
import {
  AssignmentStatus,
  DeviceStatus,
  SensorStatus,
} from '../generated/prisma/enums.js';
import { MetricCatalogService } from '../metric-catalog/metric-catalog.service.js';
import type {
  CreateSensorInput,
  ListSensorsQueryInput,
  ReplaceSensorMetricsInput,
  UpdateSensorInput,
} from './dto/sensors.schemas.js';
import { SensorsRepository } from './sensors.repository.js';

@Injectable()
export class SensorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: SensorsRepository,
    private readonly metricCatalog: MetricCatalogService,
  ) {}

  async list(
    context: OrganizationAuthorizationContext,
    query: ListSensorsQueryInput,
  ) {
    const { items, total } = await this.repository.findMany(
      context.organizationId,
      query,
    );

    return {
      items: items.map((sensor) => ({
        ...sensor,
        freshnessState: evaluateFreshness({
          lastObservedAt: sensor.lastReadingAt,
          expectedReportingIntervalSeconds:
            sensor.expectedReportingIntervalSeconds,
          isMaintenance: sensor.status === SensorStatus.MAINTENANCE,
        }),
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async findOne(context: OrganizationAuthorizationContext, sensorId: string) {
    const sensor = await this.repository.findById(
      context.organizationId,
      sensorId,
    );
    if (!sensor) {
      throw new NotFoundException('Sensor not found');
    }

    return {
      ...sensor,
      freshnessState: evaluateFreshness({
        lastObservedAt: sensor.lastReadingAt,
        expectedReportingIntervalSeconds:
          sensor.expectedReportingIntervalSeconds,
        isMaintenance: sensor.status === SensorStatus.MAINTENANCE,
      }),
    };
  }

  async create(
    context: OrganizationAuthorizationContext,
    input: CreateSensorInput,
  ) {
    const asset = await this.prisma.asset.findFirst({
      where: { id: input.assetId, organizationId: context.organizationId },
      select: { id: true },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const duplicate = await this.prisma.sensor.findFirst({
      where: {
        organizationId: context.organizationId,
        sensorKey: input.sensorKey,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'Sensor key already exists in this organization',
      );
    }

    const created = await this.prisma.sensor.create({
      data: {
        organizationId: context.organizationId,
        assetId: input.assetId,
        sensorKey: input.sensorKey,
        name: input.name,
        description: input.description ?? null,
        sensorType: input.sensorType,
        status: SensorStatus.PLANNED,
        installationLocation: input.installationLocation ?? null,
        manufacturer: input.manufacturer ?? null,
        model: input.model ?? null,
        serialNumber: input.serialNumber ?? null,
        samplingIntervalSeconds: input.samplingIntervalSeconds ?? null,
        expectedReportingIntervalSeconds:
          input.expectedReportingIntervalSeconds ?? null,
        createdById: context.userId,
      },
    });

    await this.recordAudit(context, 'SENSOR_REGISTERED', created.id, {
      sensorKey: created.sensorKey,
      assetId: created.assetId,
    });
    return created;
  }

  async update(
    context: OrganizationAuthorizationContext,
    sensorId: string,
    input: UpdateSensorInput,
  ) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (sensor.status === SensorStatus.RETIRED) {
      throw new ConflictException('Retired sensors cannot be modified');
    }
    if (
      input.sensorKey &&
      input.sensorKey !== sensor.sensorKey &&
      sensor.status !== SensorStatus.PLANNED
    ) {
      throw new BadRequestException(
        'sensorKey is immutable after sensor activation',
      );
    }

    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: {
        ...(input.sensorKey !== undefined ? { sensorKey: input.sensorKey } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.sensorType !== undefined ? { sensorType: input.sensorType } : {}),
        ...(input.installationLocation !== undefined
          ? { installationLocation: input.installationLocation }
          : {}),
        ...(input.manufacturer !== undefined
          ? { manufacturer: input.manufacturer }
          : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.serialNumber !== undefined
          ? { serialNumber: input.serialNumber }
          : {}),
        ...(input.samplingIntervalSeconds !== undefined
          ? { samplingIntervalSeconds: input.samplingIntervalSeconds }
          : {}),
        ...(input.expectedReportingIntervalSeconds !== undefined
          ? {
              expectedReportingIntervalSeconds:
                input.expectedReportingIntervalSeconds,
            }
          : {}),
      },
    });

    await this.recordAudit(context, 'SENSOR_UPDATED', sensor.id, {
      sensorKey: updated.sensorKey,
    });
    return updated;
  }

  async activate(context: OrganizationAuthorizationContext, sensorId: string) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (sensor.status !== SensorStatus.PLANNED) {
      throw new ConflictException(
        `Only PLANNED sensors can be activated (current status: ${sensor.status})`,
      );
    }

    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: { status: SensorStatus.ACTIVE },
    });
    await this.recordAudit(context, 'SENSOR_ACTIVATED', sensor.id, {
      sensorKey: sensor.sensorKey,
    });
    return updated;
  }

  async startMaintenance(
    context: OrganizationAuthorizationContext,
    sensorId: string,
  ) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (sensor.status !== SensorStatus.ACTIVE) {
      throw new ConflictException(
        `Only ACTIVE sensors can enter maintenance (current status: ${sensor.status})`,
      );
    }

    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: { status: SensorStatus.MAINTENANCE },
    });
    await this.recordAudit(context, 'SENSOR_MAINTENANCE_STARTED', sensor.id, {
      sensorKey: sensor.sensorKey,
    });
    return updated;
  }

  async disable(context: OrganizationAuthorizationContext, sensorId: string) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (sensor.status !== SensorStatus.ACTIVE) {
      throw new ConflictException(
        `Only ACTIVE sensors can be disabled (current status: ${sensor.status})`,
      );
    }

    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: { status: SensorStatus.DISABLED },
    });
    await this.recordAudit(context, 'SENSOR_DISABLED', sensor.id, {
      sensorKey: sensor.sensorKey,
    });
    return updated;
  }

  async enable(context: OrganizationAuthorizationContext, sensorId: string) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (
      sensor.status !== SensorStatus.DISABLED &&
      sensor.status !== SensorStatus.MAINTENANCE
    ) {
      throw new ConflictException(
        `Only DISABLED or MAINTENANCE sensors can be enabled (current status: ${sensor.status})`,
      );
    }

    const action =
      sensor.status === SensorStatus.MAINTENANCE
        ? 'SENSOR_MAINTENANCE_COMPLETED'
        : 'SENSOR_ACTIVATED';

    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: { status: SensorStatus.ACTIVE },
    });
    await this.recordAudit(context, action, sensor.id, {
      sensorKey: sensor.sensorKey,
    });
    return updated;
  }

  async retire(context: OrganizationAuthorizationContext, sensorId: string) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (sensor.status === SensorStatus.RETIRED) {
      throw new ConflictException('Sensor is already retired');
    }

    const updated = await this.prisma.sensor.update({
      where: { id: sensor.id },
      data: { status: SensorStatus.RETIRED },
    });
    await this.recordAudit(context, 'SENSOR_RETIRED', sensor.id, {
      sensorKey: sensor.sensorKey,
    });
    return updated;
  }

  async listMetrics(
    context: OrganizationAuthorizationContext,
    sensorId: string,
  ) {
    await this.requireSensor(context.organizationId, sensorId);
    return this.prisma.sensorMetric.findMany({
      where: { organizationId: context.organizationId, sensorId },
      include: { metricDefinition: true },
    });
  }

  async replaceMetrics(
    context: OrganizationAuthorizationContext,
    sensorId: string,
    input: ReplaceSensorMetricsInput,
  ) {
    const sensor = await this.requireSensor(context.organizationId, sensorId);
    if (sensor.status === SensorStatus.RETIRED) {
      throw new ConflictException('Cannot modify metrics of a retired sensor');
    }

    for (const metric of input.metrics) {
      await this.metricCatalog.validateMetricAndUnit(
        metric.metricKey,
        metric.unit,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.sensorMetric.deleteMany({
        where: { organizationId: context.organizationId, sensorId: sensor.id },
      });
      await tx.sensorMetric.createMany({
        data: input.metrics.map((m) => ({
          organizationId: context.organizationId,
          sensorId: sensor.id,
          metricKey: m.metricKey,
          unit: m.unit,
          precision: m.precision ?? null,
          minPlausibleValue: m.minPlausibleValue ?? null,
          maxPlausibleValue: m.maxPlausibleValue ?? null,
          isPrimary: m.isPrimary,
        })),
      });
      return tx.sensorMetric.findMany({
        where: { organizationId: context.organizationId, sensorId: sensor.id },
        include: { metricDefinition: true },
      });
    });

    await this.recordAudit(context, 'SENSOR_UPDATED', sensor.id, {
      sensorKey: sensor.sensorKey,
      metricsCount: String(result.length),
    });
    return result;
  }

  async listByDevice(
    context: OrganizationAuthorizationContext,
    deviceId: string,
  ) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId: context.organizationId },
      select: { id: true },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.prisma.deviceSensorAssignment.findMany({
      where: {
        organizationId: context.organizationId,
        deviceId,
        status: AssignmentStatus.ACTIVE,
      },
      include: {
        sensor: {
          include: {
            asset: { select: { id: true, name: true, assetCode: true } },
            metrics: true,
          },
        },
      },
    });
  }

  async assignToDevice(
    context: OrganizationAuthorizationContext,
    deviceId: string,
    sensorId: string,
  ) {
    const [device, sensor] = await Promise.all([
      this.prisma.device.findFirst({
        where: { id: deviceId, organizationId: context.organizationId },
        select: { id: true, deviceKey: true, status: true },
      }),
      this.prisma.sensor.findFirst({
        where: { id: sensorId, organizationId: context.organizationId },
        select: { id: true, sensorKey: true, status: true },
      }),
    ]);

    if (!device) throw new NotFoundException('Device not found');
    if (!sensor) throw new NotFoundException('Sensor not found');
    if (
      device.status === DeviceStatus.REVOKED ||
      device.status === DeviceStatus.RETIRED
    ) {
      throw new ConflictException(
        `Cannot assign sensors to a ${device.status} device`,
      );
    }

    const existingActive = await this.prisma.deviceSensorAssignment.findFirst({
      where: {
        organizationId: context.organizationId,
        sensorId: sensor.id,
        status: AssignmentStatus.ACTIVE,
      },
      select: { id: true, deviceId: true },
    });
    if (existingActive) {
      throw new ConflictException(
        'Sensor is already actively assigned to a device; unassign it first',
      );
    }

    const assignment = await this.prisma.deviceSensorAssignment.create({
      data: {
        organizationId: context.organizationId,
        deviceId: device.id,
        sensorId: sensor.id,
        status: AssignmentStatus.ACTIVE,
        assignedById: context.userId,
      },
    });

    await this.recordAudit(context, 'DEVICE_SENSOR_ASSIGNED', sensor.id, {
      deviceId: device.id,
      deviceKey: device.deviceKey,
      sensorKey: sensor.sensorKey,
    });
    return assignment;
  }

  async unassignFromDevice(
    context: OrganizationAuthorizationContext,
    deviceId: string,
    sensorId: string,
  ) {
    const existing = await this.prisma.deviceSensorAssignment.findFirst({
      where: {
        organizationId: context.organizationId,
        deviceId,
        sensorId,
        status: AssignmentStatus.ACTIVE,
      },
    });
    if (!existing) {
      throw new NotFoundException('Active device-sensor assignment not found');
    }

    const updated = await this.prisma.deviceSensorAssignment.update({
      where: { id: existing.id },
      data: {
        status: AssignmentStatus.REVOKED,
        unassignedAt: new Date(),
      },
    });

    await this.recordAudit(context, 'DEVICE_SENSOR_UNASSIGNED', sensorId, {
      deviceId,
      sensorId,
    });
    return updated;
  }

  async listAuditLogs(
    context: OrganizationAuthorizationContext,
    sensorId: string,
  ) {
    await this.requireSensor(context.organizationId, sensorId);
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: context.organizationId,
        entityType: 'SENSOR',
        entityId: sensorId,
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }

  private async requireSensor(organizationId: string, sensorId: string) {
    const sensor = await this.prisma.sensor.findFirst({
      where: { id: sensorId, organizationId },
    });
    if (!sensor) {
      throw new NotFoundException('Sensor not found');
    }
    return sensor;
  }

  private async recordAudit(
    context: OrganizationAuthorizationContext,
    action: string,
    entityId: string,
    metadata: Record<string, string>,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action,
        entityType: 'SENSOR',
        entityId,
        metadata,
      },
    });
  }
}
