import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { EnvelopeValidatorService } from './envelope-validator.service.js';

@Injectable()
export class MqttDeviceStatusHandler {
  private readonly logger = new Logger(MqttDeviceStatusHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly validator: EnvelopeValidatorService,
  ) {}

  async handleAuthenticatedMessage(params: {
    organizationId: string;
    deviceKey: string;
    channel: 'telemetry' | 'status' | 'availability';
    payload: string | Buffer;
  }): Promise<{ accepted: boolean; reason?: string }> {
    const now = new Date();
    if (params.channel === 'availability') {
      const text = params.payload.toString('utf8').trim().toUpperCase();
      await this.prisma.device.updateMany({
        where: {
          organizationId: params.organizationId,
          deviceKey: params.deviceKey,
        },
        data:
          text === 'OFFLINE'
            ? { lastDisconnectedAt: now }
            : { lastConnectedAt: now, lastSeenAt: now },
      });
      return { accepted: true };
    }

    const result =
      params.channel === 'telemetry'
        ? await this.validator.validateTelemetryEnvelope(
            params.organizationId,
            params.deviceKey,
            params.payload,
            now,
          )
        : await this.validator.validateStatusEnvelope(
            params.organizationId,
            params.deviceKey,
            params.payload,
            now,
          );

    if (!result.valid) {
      this.logger.warn(
        `Rejected ${params.channel} envelope for device=${params.deviceKey} reason=${result.reason}`,
      );
      return { accepted: false, reason: result.reason };
    }

    await this.prisma.device.updateMany({
      where: {
        organizationId: params.organizationId,
        deviceKey: params.deviceKey,
      },
      data: { lastSeenAt: now },
    });

    return { accepted: true };
  }
}
