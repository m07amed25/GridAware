import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import {
  type DeviceTopic,
  parseDeviceTopic,
} from '../../telemetry/telemetry-topic.js';

export interface ProvisionedDeviceCredential {
  readonly credentialType: 'DEVICE_MQTT';
  readonly deviceId: string;
  readonly organizationId: string;
  readonly siteId: string;
  readonly active: boolean;
}

export interface HumanActorPrincipal {
  readonly credentialType: 'HUMAN_SESSION';
  readonly userId: string;
  readonly organizationId: string;
  readonly role: string;
}

export type TelemetryPublisherPrincipal =
  | ProvisionedDeviceCredential
  | HumanActorPrincipal;

/**
 * Enforces strict separation between human organization RBAC and MQTT device
 * credentials (Spec FR-020, Constitution Principle I).
 * - A human OWNER role NEVER grants device MQTT publishing authority.
 * - A device MQTT credential NEVER grants human application RBAC context.
 */
@Injectable()
export class DeviceIsolationGuardrail {
  assertDeviceMayPublishToTopic(
    principal: TelemetryPublisherPrincipal | null | undefined,
    topic: string,
  ): DeviceTopic {
    if (!principal || principal.credentialType !== 'DEVICE_MQTT') {
      throw AppException.forbidden(
        'Human user roles cannot publish to device telemetry topics; provisioned device credentials are required.',
      );
    }

    if (!principal.active) {
      throw AppException.forbidden('Device credential is inactive or revoked.');
    }

    const parsed = parseDeviceTopic(topic);
    if (!parsed) {
      throw AppException.forbidden('Invalid or unauthorized MQTT topic.');
    }

    if (
      parsed.organizationId !== principal.organizationId.toLowerCase() ||
      parsed.siteId !== principal.siteId.toLowerCase() ||
      parsed.deviceId !== principal.deviceId.toLowerCase()
    ) {
      throw AppException.forbidden(
        'Device credential is not authorized for the target organization, site, or device topic.',
      );
    }

    return parsed;
  }

  assertNotDeviceCredentialForHumanContext(
    principal: TelemetryPublisherPrincipal | null | undefined,
  ): void {
    if (!principal || principal.credentialType !== 'HUMAN_SESSION') {
      throw AppException.unauthenticated(
        'Device credentials cannot access human organization RBAC operations.',
      );
    }
  }
}
