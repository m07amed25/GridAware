import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { DeviceCredentialsService } from '../device-credentials/device-credentials.service.js';
import { DeviceStatus } from '../generated/prisma/enums.js';
import { MqttAuthorizationService } from '../mqtt-access/mqtt-authorization.service.js';
import { MosquittoFileAdapter } from './mosquitto-file.adapter.js';

@Injectable()
export class DeviceProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly credentialsService: DeviceCredentialsService,
    private readonly mqttAuth: MqttAuthorizationService,
    private readonly brokerAdapter: MosquittoFileAdapter,
  ) {}

  async provision(context: OrganizationAuthorizationContext, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId: context.organizationId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (
      device.status === DeviceStatus.REVOKED ||
      device.status === DeviceStatus.RETIRED
    ) {
      throw new ConflictException(
        `Cannot provision credentials for a ${device.status} device`,
      );
    }

    const issued = await this.credentialsService.issueCredential({
      organizationId: context.organizationId,
      deviceId: device.id,
      createdById: context.userId,
    });

    const username = this.mqttAuth.buildDeviceUsername(
      context.organizationId,
      device.deviceKey,
    );
    const topicNamespace = this.mqttAuth.buildDeviceTopicNamespace(
      context.organizationId,
      device.deviceKey,
    );

    await this.brokerAdapter.syncDeviceAccess({
      username,
      plaintextPassword: issued.plaintextSecret,
      publishTopics: topicNamespace.publishTopics,
      enabled: device.status === DeviceStatus.ACTIVE,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action: 'DEVICE_CREDENTIAL_PROVISIONED',
        entityType: 'DEVICE',
        entityId: device.id,
        metadata: {
          deviceKey: device.deviceKey,
          credentialId: issued.credentialId,
          credentialVersion: issued.credentialVersion,
          credentialType: issued.credentialType,
        },
      },
    });

    return {
      deviceId: device.id,
      deviceKey: device.deviceKey,
      status: device.status,
      credential: {
        id: issued.credentialId,
        version: issued.credentialVersion,
        username,
        password: issued.plaintextSecret,
        expiresAt: issued.expiresAt,
      },
      mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
        publishTopics: topicNamespace.publishTopics,
      },
    };
  }

  async rotateCredentials(
    context: OrganizationAuthorizationContext,
    deviceId: string,
  ) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId: context.organizationId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (
      device.status === DeviceStatus.REVOKED ||
      device.status === DeviceStatus.RETIRED
    ) {
      throw new ConflictException(
        `Cannot rotate credentials for a ${device.status} device`,
      );
    }

    const issued = await this.credentialsService.issueCredential({
      organizationId: context.organizationId,
      deviceId: device.id,
      createdById: context.userId,
    });

    const username = this.mqttAuth.buildDeviceUsername(
      context.organizationId,
      device.deviceKey,
    );
    const topicNamespace = this.mqttAuth.buildDeviceTopicNamespace(
      context.organizationId,
      device.deviceKey,
    );

    await this.brokerAdapter.syncDeviceAccess({
      username,
      plaintextPassword: issued.plaintextSecret,
      publishTopics: topicNamespace.publishTopics,
      enabled: device.status === DeviceStatus.ACTIVE,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action: 'DEVICE_CREDENTIAL_ROTATED',
        entityType: 'DEVICE',
        entityId: device.id,
        metadata: {
          deviceKey: device.deviceKey,
          credentialId: issued.credentialId,
          credentialVersion: issued.credentialVersion,
        },
      },
    });

    return {
      deviceId: device.id,
      deviceKey: device.deviceKey,
      status: device.status,
      credential: {
        id: issued.credentialId,
        version: issued.credentialVersion,
        username,
        password: issued.plaintextSecret,
        expiresAt: issued.expiresAt,
      },
      mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://localhost:1883',
        publishTopics: topicNamespace.publishTopics,
      },
    };
  }

  async activate(context: OrganizationAuthorizationContext, deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, organizationId: context.organizationId },
    });
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    if (device.status !== DeviceStatus.PENDING) {
      throw new ConflictException(
        `Only PENDING devices can be activated (current status: ${device.status})`,
      );
    }

    const hasCred = await this.credentialsService.hasActiveCredential(
      context.organizationId,
      device.id,
    );
    if (!hasCred) {
      throw new BadRequestException(
        'Device must have an active provisioned credential before activation',
      );
    }

    const updated = await this.prisma.device.update({
      where: { id: device.id },
      data: { status: DeviceStatus.ACTIVE },
    });

    const username = this.mqttAuth.buildDeviceUsername(
      context.organizationId,
      device.deviceKey,
    );
    const topicNamespace = this.mqttAuth.buildDeviceTopicNamespace(
      context.organizationId,
      device.deviceKey,
    );
    await this.brokerAdapter.syncDeviceAccess({
      username,
      publishTopics: topicNamespace.publishTopics,
      enabled: true,
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        action: 'DEVICE_ACTIVATED',
        entityType: 'DEVICE',
        entityId: device.id,
        metadata: { deviceKey: device.deviceKey },
      },
    });

    return updated;
  }

  async syncBrokerAccessForStatus(
    organizationId: string,
    deviceKey: string,
    enabled: boolean,
  ) {
    const username = this.mqttAuth.buildDeviceUsername(
      organizationId,
      deviceKey,
    );
    if (!enabled) {
      await this.brokerAdapter.removeDeviceAccess(username);
      return;
    }
    const topicNamespace = this.mqttAuth.buildDeviceTopicNamespace(
      organizationId,
      deviceKey,
    );
    await this.brokerAdapter.syncDeviceAccess({
      username,
      publishTopics: topicNamespace.publishTopics,
      enabled: true,
    });
  }
}
