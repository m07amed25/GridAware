import { describe, expect, it } from 'vitest';
import { buildDeviceTopic, parseDeviceTopic } from './telemetry-topic.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const DEVICE = 'F5B3AA39-3403-40AD-9CAF-852E1B719177';

describe('parseDeviceTopic', () => {
  it('parses canonical topics and lowercases IDs', () => {
    expect(
      parseDeviceTopic(
        `gridaware/v1/orgs/${ORG}/sites/${SITE}/devices/${DEVICE}/telemetry`,
      ),
    ).toEqual({
      organizationId: ORG,
      siteId: SITE,
      deviceId: DEVICE.toLowerCase(),
      channel: 'telemetry',
    });
  });

  it.each([
    `gridaware/v2/orgs/${ORG}/sites/${SITE}/devices/${DEVICE}/telemetry`,
    `gridaware/v1/orgs/${ORG}/sites/${SITE}/devices/not-a-uuid/telemetry`,
    `gridaware/v1/orgs/${ORG}/sites/${SITE}/devices/${DEVICE}/commands`,
    `gridaware/v1/orgs/${ORG}/sites/${SITE}/devices/${DEVICE}/telemetry/extra`,
  ])('rejects %s', (topic) => {
    expect(parseDeviceTopic(topic)).toBeNull();
  });

  it('round-trips with buildDeviceTopic', () => {
    const topic = buildDeviceTopic({
      organizationId: ORG,
      siteId: SITE,
      deviceId: DEVICE.toLowerCase(),
      channel: 'status',
    });
    expect(parseDeviceTopic(topic)?.channel).toBe('status');
  });
});
