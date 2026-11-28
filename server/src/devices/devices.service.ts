import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { DeviceCredentialsService } from '../device-credentials/device-credentials.service.js';
import { DeviceProvisioningService } from '../device-provisioning/device-provisioning.service.js';
import { DeviceStatus } from '../generated/prisma/enums.js';
import { MqttAuthorizationService } from '../mqtt-access/mqtt-authorization.service.js';
import { DevicesRepository } from './devices.repository.js';
import type {
  CreateDeviceInput,
  ListDevicesQueryInput,
  UpdateDeviceInput,
} from './dto/devices.schemas.js';
import { evaluateFreshness } from './freshness.evaluator.js';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repository: DevicesRepository,
    private readonly credentialsService: DeviceCredentialsService,
    private readonly provisioningService: DeviceProvisioningService,
    private readonly mqttAuth: MqttAuthorizationService,
  ) {}

  async list(
    context: OrganizationAuthorizationContext,
    query: ListDevicesQueryInput,
  ) {
    const { items, total } = await this.repository.findMany(
      context.organizationId,
      query,
    );

    return {
      items: items.map((device) => ({
        ...device,
        connectionState: evaluateFreshness({
          lastObservedAt: device.lastSeenAt,
          lastDisconnectedAt: device.lastDisconnectedAt,
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

  async findOne(context: OrganizationAuthorizationContext, deviceId: string) {
    const device = await this.repository.findById(
      context.organizationId,
      deviceId,
    );
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const topicNamespace = this.mqttAuth.buildDeviceTopicNamespace(
      context.organizationId,
      device.deviceKey,
    );

    return {
      ...device,
      connectionState: evaluateFreshness({
        lastObservedAt: device.lastSeenAt,
        lastDisconnectedAt: device.lastDisconnectedAt,
      }),
      mqtt: {
        publishTopics: topicNamespace.publishTopics,
      },
    };
  }

  async create(
    context: OrganizationAuthorizationContext,
    input: CreateDeviceInput,
  ) {
    await this.validateLocationReferences(
      context.organizationId,
      input.siteId ?? null,
      input.assetId ?? null,
    );

    const duplicate = await this.prisma.device.findFirst({
      where: {
        organizationId: context.organizationId,
        deviceKey: input.deviceKey,
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new ConflictException(
        'Device key already exists in this organization',
      );
    }

    const created = await this.prisma.device.create({
      data: {
        organizationId: context.organizationId,
        siteId: input.siteId ?? null,
        assetId: input.assetId ?? null,
        deviceKey: input.deviceKey,
        name: input.name,
        description: input.description ?? null,
        deviceType: input.deviceType,
        status: DeviceStatus.PENDING,
        serialNumber: input.serialNumber ?? null,
        manufacturer: input.manufacturer ?? null,
        model: input.model ?? null,
        firmwareVersion: input.firmwareVersion ?? null,
        metadata: input.metadata ?? undefined,
        createdById: context.userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action: 'DEVICE_REGISTERED',
        entityType: 'DEVICE',
        entityId: created.id,
        metadata: {
          deviceKey: created.deviceKey,
          deviceType: created.deviceType,
        },
      },
    });

    return created;
  }

  async update(
    context: OrganizationAuthorizationContext,
    deviceId: string,
    input: UpdateDeviceInput,
  ) {
    const device = await this.repository.findById(
      context.organizationId,
      deviceId,
    );
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (
      device.status === DeviceStatus.REVOKED ||
      device.status === DeviceStatus.RETIRED
    ) {
      throw new ConflictException(
        `Cannot update a ${device.status} device`,
      );
    }

    if (
      input.deviceKey &&
      input.deviceKey !== device.deviceKey &&
      device.status !== DeviceStatus.PENDING
    ) {
      throw new BadRequestException(
        'deviceKey is immutable after device activation',
      );
    }

    const nextSiteId =
      input.siteId !== undefined ? input.siteId : device.siteId;
    const nextAssetId =
      input.assetId !== undefined ? input.assetId : device.assetId;
    await this.validateLocationReferences(
      context.organizationId,
      nextSiteId,
      nextAssetId,
    );

    return this.prisma.device.update({
      where: { id: device.id },
      data: {
        ...(input.deviceKey !== undefined ? { deviceKey: input.deviceKey } : {}),
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.siteId !== undefined ? { siteId: input.siteId } : {}),
        ...(input.assetId !== undefined ? { assetId: input.assetId } : {}),
        ...(input.serialNumber !== undefined ? { serialNumber: input.serialNumber } : {}),
        ...(input.manufacturer !== undefined ? { manufacturer: input.manufacturer } : {}),
        ...(input.model !== undefined ? { model: input.model } : {}),
        ...(input.firmwareVersion !== undefined
          ? { firmwareVersion: input.firmwareVersion }
          : {}),
        ...(input.metadata !== undefined
          ? { metadata: input.metadata ?? undefined }
          : {}),
      },
    });
  }

  async suspend(context: OrganizationAuthorizationContext, deviceId: string) {
    const device = await this.requireDevice(context.organizationId, deviceId);
    if (device.status !== DeviceStatus.ACTIVE) {
      throw new ConflictException(
        `Only ACTIVE devices can be suspended (current status: ${device.status})`,
      );
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.SUSPENDED },
    });

    await this.provisioningService.syncBrokerAccessForStatus(
      context.organizationId,
      device.deviceKey,
      false,
    );

    await this.recordAudit(context, 'DEVICE_SUSPENDED', device.id, {
      deviceKey: device.deviceKey,
    });
    return updated;
  }

  async reactivate(
    context: OrganizationAuthorizationContext,
    deviceId: string,
  ) {
    const device = await this.requireDevice(context.organizationId, deviceId);
    if (device.status !== DeviceStatus.SUSPENDED) {
      throw new ConflictException(
        `Only SUSPENDED devices can be reactivated (current status: ${device.status})`,
      );
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.ACTIVE },
    });

    await this.provisioningService.syncBrokerAccessForStatus(
      context.organizationId,
      device.deviceKey,
      true,
    );

    await this.recordAudit(context, 'DEVICE_REACTIVATED', device.id, {
      deviceKey: device.deviceKey,
    });
    return updated;
  }

  async revoke(context: OrganizationAuthorizationContext, deviceId: string) {
    const device = await this.requireDevice(context.organizationId, deviceId);
    if (
      device.status !== DeviceStatus.ACTIVE &&
      device.status !== DeviceStatus.SUSPENDED
    ) {
      throw new ConflictException(
        `Cannot revoke a ${device.status} device`,
      );
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.REVOKED, revokedAt: new Date() },
    });

    await this.credentialsService.revokeAllForDevice(
      context.organizationId,
      device.id,
    );
    await this.provisioningService.syncBrokerAccessForStatus(
      context.organizationId,
      device.deviceKey,
      false,
    );

    await this.recordAudit(context, 'DEVICE_REVOKED', device.id, {
      deviceKey: device.deviceKey,
    });
    return updated;
  }

  async retire(context: OrganizationAuthorizationContext, deviceId: string) {
    const device = await this.requireDevice(context.organizationId, deviceId);
    if (
      device.status !== DeviceStatus.ACTIVE &&
      device.status !== DeviceStatus.SUSPENDED
    ) {
      throw new ConflictException(
        `Cannot retire a ${device.status} device`,
      );
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.RETIRED },
    });

    await this.credentialsService.revokeAllForDevice(
      context.organizationId,
      device.id,
    );
    await this.provisioningService.syncBrokerAccessForStatus(
      context.organizationId,
      device.deviceKey,
      false,
    );

    await this.recordAudit(context, 'DEVICE_RETIRED', device.id, {
      deviceKey: device.deviceKey,
    });
    return updated;
  }

  async listAuditLogs(
    context: OrganizationAuthorizationContext,
    deviceId: string,
  ) {
    await this.requireDevice(context.organizationId, deviceId);
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: context.organizationId,
        entityType: 'DEVICE',
        entityId: deviceId,
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    });
  }

  private async requireDevice(organizationId: string, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    return device;
  }

  private async validateLocationReferences(
    organizationId: string,
    siteId: string | null,
    assetId: string | null,
  ) {
    if (siteId) {
      const site = await this.prisma.site.findFirst({
        where: { id: siteId, organizationId },
        select: { id: true },
      });
      if (!site) {
        throw new NotFoundException('Site not found');
      }
    }

    if (assetId) {
      const asset = await this.prisma.asset.findFirst({
        where: { id: assetId, organizationId },
        select: { id: true, siteId: true },
      });
      if (!asset) {
        throw new NotFoundException('Asset not found');
      }
      if (siteId && asset.siteId !== siteId) {
        throw new BadRequestException(
          'Asset does not belong to the specified site',
        );
      }
    }
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
        entityType: 'DEVICE',
        entityId,
        metadata,
      },
    });
  }
}
