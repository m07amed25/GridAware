import { Injectable } from '@nestjs/common';

export interface DeviceTopicNamespace {
  readonly telemetry: string;
  readonly status: string;
  readonly availability: string;
  readonly publishTopics: readonly string[];
}

@Injectable()
export class MqttAuthorizationService {
  buildDeviceUsername(organizationId: string, deviceKey: string): string {
    return `${organizationId}:${deviceKey}`;
  }

  buildDeviceTopicNamespace(
    organizationId: string,
    deviceKey: string,
  ): DeviceTopicNamespace {
    const base = `gridaware/v1/orgs/${organizationId}/devices/${deviceKey}`;
    const telemetry = `${base}/telemetry`;
    const status = `${base}/status`;
    const availability = `${base}/availability`;
    return {
      telemetry,
      status,
      availability,
      publishTopics: [telemetry, status, availability],
    };
  }

  isTopicAuthorizedForDevice(
    organizationId: string,
    deviceKey: string,
    topic: string,
  ): boolean {
    const ns = this.buildDeviceTopicNamespace(organizationId, deviceKey);
    return ns.publishTopics.includes(topic);
  }
}
