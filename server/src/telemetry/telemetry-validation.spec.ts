import { describe, expect, it } from 'vitest';
import type { DeviceTopic } from './telemetry-topic.js';
import {
  canonicalJson,
  contentHash,
  validateDeviceStatus,
  validateTelemetry,
} from './telemetry-validation.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const DEVICE = 'f5b3aa39-3403-40ad-9caf-852e1b719177';
const NOW = new Date('2026-11-26T10:30:00.000Z');

const telemetryTopic: DeviceTopic = {
  organizationId: ORG,
  siteId: SITE,
  deviceId: DEVICE,
  channel: 'telemetry',
};
const statusTopic: DeviceTopic = { ...telemetryTopic, channel: 'status' };

// Example from mqtt-topic-message-contracts.md §5
function envelope(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: '1.0',
    eventId: '01936f10-9a7d-7e21-9e25-4a4cb9b90a01',
    deviceId: DEVICE,
    observedAt: '2026-11-26T10:30:00.000Z',
    simulationRunId: 'bc681e35-7e8e-4861-9ef0-9f4eec4189e9',
    metrics: [
      {
        sensorId: '987b4268-eeb5-4421-a4bb-0beeb891b2a1',
        metricCode: 'temperature',
        value: 86.5,
        unit: 'Cel',
        observedAt: '2026-11-26T10:30:00.000Z',
        sourceQuality: 'GOOD',
      },
      {
        sensorId: '4f36548e-8af1-46b7-b6e6-c1e2c94dbe95',
        metricCode: 'vibration_velocity',
        value: 4.2,
        unit: 'mm/s',
        sourceQuality: 'GOOD',
      },
    ],
    ...overrides,
  };
}

const buf = (value: unknown) =>
  Buffer.from(typeof value === 'string' ? value : JSON.stringify(value));

describe('validateTelemetry', () => {
  it('accepts the contract example envelope', () => {
    const result = validateTelemetry(telemetryTopic, buf(envelope()), NOW);
    expect(result.ok).toBe(true);
  });

  it('rejects payloads over 64 KiB', () => {
    const result = validateTelemetry(
      telemetryTopic,
      Buffer.alloc(64 * 1024 + 1, 32),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, reason: 'PAYLOAD_TOO_LARGE' });
  });

  it('rejects invalid JSON', () => {
    const result = validateTelemetry(telemetryTopic, buf('{nope'), NOW);
    expect(result).toMatchObject({ ok: false, reason: 'INVALID_JSON' });
  });

  it.each([
    ['unsupported schemaVersion', { schemaVersion: '2.0' }],
    ['empty metrics', { metrics: [] }],
    ['unknown property', { extra: true }],
    ['timestamp without offset', { observedAt: '2026-11-26T10:30:00' }],
    ['non-uuid eventId', { eventId: 'abc' }],
    [
      'bad metricCode',
      {
        metrics: [
          {
            sensorId: '987b4268-eeb5-4421-a4bb-0beeb891b2a1',
            metricCode: 'Temperature',
            value: 1,
            unit: 'Cel',
          },
        ],
      },
    ],
    [
      'non-numeric value',
      {
        metrics: [
          {
            sensorId: '987b4268-eeb5-4421-a4bb-0beeb891b2a1',
            metricCode: 'temperature',
            value: '86',
            unit: 'Cel',
          },
        ],
      },
    ],
  ])('rejects %s as SCHEMA_VIOLATION', (_, overrides) => {
    const result = validateTelemetry(
      telemetryTopic,
      buf(envelope(overrides)),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, reason: 'SCHEMA_VIOLATION' });
  });

  it('rejects NaN/Infinity (not representable in JSON numbers)', () => {
    const raw = JSON.stringify(envelope()).replace('86.5', 'Infinity');
    const result = validateTelemetry(telemetryTopic, buf(raw), NOW);
    expect(result.ok).toBe(false);
  });

  it('rejects payload deviceId that differs from the topic', () => {
    const result = validateTelemetry(
      telemetryTopic,
      buf(envelope({ deviceId: '99999999-9999-4999-8999-999999999999' })),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, reason: 'DEVICE_MISMATCH' });
  });

  it('accepts deviceId case differences', () => {
    const result = validateTelemetry(
      telemetryTopic,
      buf(envelope({ deviceId: DEVICE.toUpperCase() })),
      NOW,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects timestamps more than 5 minutes in the future', () => {
    const result = validateTelemetry(
      telemetryTopic,
      buf(envelope({ observedAt: '2026-11-26T10:35:01.000Z' })),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, reason: 'FUTURE_TIMESTAMP' });
  });

  it('accepts late (past) data', () => {
    const result = validateTelemetry(
      telemetryTopic,
      buf(envelope({ observedAt: '2026-11-20T00:00:00.000Z' })),
      NOW,
    );
    expect(result.ok).toBe(true);
  });

  it('rejects two samples for the same sensor in one envelope', () => {
    const base = envelope();
    const result = validateTelemetry(
      telemetryTopic,
      buf({ ...base, metrics: [base.metrics[0], base.metrics[0]] }),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, reason: 'DUPLICATE_SENSOR' });
  });
});

describe('validateDeviceStatus', () => {
  const status = {
    schemaVersion: '1.0',
    deviceId: DEVICE,
    status: 'ONLINE',
    observedAt: '2026-11-26T10:30:00.000Z',
    sequence: 1842,
  };

  it('accepts the contract example status', () => {
    expect(validateDeviceStatus(statusTopic, buf(status), NOW).ok).toBe(true);
  });

  it('rejects unknown states and negative sequences', () => {
    expect(
      validateDeviceStatus(statusTopic, buf({ ...status, status: 'ON' }), NOW),
    ).toMatchObject({ ok: false, reason: 'SCHEMA_VIOLATION' });
    expect(
      validateDeviceStatus(statusTopic, buf({ ...status, sequence: -1 }), NOW),
    ).toMatchObject({ ok: false, reason: 'SCHEMA_VIOLATION' });
  });

  it('rejects device mismatch', () => {
    const result = validateDeviceStatus(
      statusTopic,
      buf({ ...status, deviceId: '99999999-9999-4999-8999-999999999999' }),
      NOW,
    );
    expect(result).toMatchObject({ ok: false, reason: 'DEVICE_MISMATCH' });
  });
});

describe('contentHash', () => {
  it('is independent of key order', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(
      '{"a":[{"c":3,"d":2}],"b":1}',
    );
    expect(contentHash({ a: 1, b: 2 })).toBe(contentHash({ b: 2, a: 1 }));
  });

  it('changes when content changes', () => {
    expect(contentHash({ a: 1 })).not.toBe(contentHash({ a: 2 }));
  });
});
