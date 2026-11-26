export type DeviceChannel = 'telemetry' | 'status' | 'events';

export interface DeviceTopic {
  organizationId: string;
  siteId: string;
  deviceId: string;
  channel: DeviceChannel;
}

const UUID = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const DEVICE_TOPIC = new RegExp(
  `^gridaware/v1/orgs/(${UUID})/sites/(${UUID})/devices/(${UUID})/(telemetry|status|events)$`,
);

/** Shared subscription group so multiple API instances split the load. */
export const INGEST_SHARE_GROUP = 'gridaware-ingest';

export const TELEMETRY_SUBSCRIPTION = `$share/${INGEST_SHARE_GROUP}/gridaware/v1/orgs/+/sites/+/devices/+/telemetry`;
export const STATUS_SUBSCRIPTION = `$share/${INGEST_SHARE_GROUP}/gridaware/v1/orgs/+/sites/+/devices/+/status`;

/** Parse a canonical device topic; IDs are normalized to lowercase. */
export function parseDeviceTopic(topic: string): DeviceTopic | null {
  const match = DEVICE_TOPIC.exec(topic);
  if (!match) {
    return null;
  }
  const [, organizationId, siteId, deviceId, channel] = match;
  return {
    organizationId: organizationId.toLowerCase(),
    siteId: siteId.toLowerCase(),
    deviceId: deviceId.toLowerCase(),
    channel: channel as DeviceChannel,
  };
}

export function buildDeviceTopic(topic: DeviceTopic): string {
  return `gridaware/v1/orgs/${topic.organizationId}/sites/${topic.siteId}/devices/${topic.deviceId}/${topic.channel}`;
}
