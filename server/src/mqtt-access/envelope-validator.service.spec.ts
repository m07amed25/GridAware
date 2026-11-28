import { describe, expect, it, vi } from 'vitest';
import { CredentialHasher } from '../device-credentials/credential-hasher.js';
import { EnvelopeValidatorService } from './envelope-validator.service.js';
import { MqttAuthorizationService } from './mqtt-authorization.service.js';

describe('MqttAuthorizationService', () => {
  const svc = new MqttAuthorizationService();

  it('authorizes only the device own versioned topics', () => {
    const ns = svc.buildDeviceTopicNamespace('org-1', 'gateway-gen-001');
    expect(ns.telemetry).toBe(
      'gridaware/v1/orgs/org-1/devices/gateway-gen-001/telemetry',
    );
    expect(
      svc.isTopicAuthorizedForDevice('org-1', 'gateway-gen-001', ns.telemetry),
    ).toBe(true);
    expect(
      svc.isTopicAuthorizedForDevice(
        'org-1',
        'gateway-gen-001',
        'gridaware/v1/orgs/org-1/devices/gateway-gen-002/telemetry',
      ),
    ).toBe(false);
    expect(
      svc.isTopicAuthorizedForDevice(
        'org-1',
        'gateway-gen-001',
        'gridaware/v1/orgs/org-2/devices/gateway-gen-001/telemetry',
      ),
    ).toBe(false);
  });
});

describe('CredentialHasher', () => {
  const hasher = new CredentialHasher();

  it('generates high-entropy secrets and verifies argon2 hashes', async () => {
    const secret = hasher.generateSecret();
    expect(secret.length).toBeGreaterThanOrEqual(32);
    const hashed = await hasher.hashSecret(secret);
    expect(hashed).not.toContain(secret);
    expect(await hasher.verifySecret(hashed, secret)).toBe(true);
    expect(await hasher.verifySecret(hashed, 'wrong-secret')).toBe(false);
  });
});

describe('EnvelopeValidatorService', () => {
  const mockPrisma = {
    device: { findFirst: vi.fn() },
    deviceSensorAssignment: { findMany: vi.fn() },
  };
  const validator = new EnvelopeValidatorService(mockPrisma as never);

  it('rejects oversized payloads', () => {
    const big = 'x'.repeat(65 * 1024);
    expect(validator.validateRawSize(big)).toEqual({
      valid: false,
      reason: 'PAYLOAD_TOO_LARGE',
    });
  });

  it('rejects timestamps outside 5-minute skew window', () => {
    const now = new Date('2026-11-27T12:00:00.000Z');
    expect(
      validator.validateTimestampSkew('2026-11-27T12:10:00.000Z', now),
    ).toEqual({
      valid: false,
      reason: 'TIMESTAMP_SKEW_EXCEEDED',
    });
    expect(
      validator.validateTimestampSkew('2026-11-27T11:59:00.000Z', now),
    ).toEqual({ valid: true });
  });

  it('rejects mismatched deviceKey in telemetry envelope', async () => {
    const payload = JSON.stringify({
      schemaVersion: '1.0',
      eventId: 'evt_01JDCZ6V4A7XQ0M2H7K9P3B1TW',
      deviceKey: 'other-device',
      sentAt: '2026-11-27T12:00:00.000Z',
      readings: [
        {
          sensorKey: 'gen-001-temp',
          metricKey: 'temperature',
          value: 85.2,
          unit: 'Cel',
          quality: 'GOOD',
        },
      ],
    });
    const res = await validator.validateTelemetryEnvelope(
      'org-1',
      'gateway-gen-001',
      payload,
      new Date('2026-11-27T12:00:00.000Z'),
    );
    expect(res).toEqual({ valid: false, reason: 'DEVICE_KEY_MISMATCH' });
  });
});
