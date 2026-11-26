import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MqttService } from '../mqtt/mqtt.service.js';
import { TelemetryIngestionService } from './telemetry-ingestion.service.js';
import type { TelemetryStoreService } from './telemetry-store.service.js';
import {
  STATUS_SUBSCRIPTION,
  TELEMETRY_SUBSCRIPTION,
} from './telemetry-topic.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const DEVICE = 'f5b3aa39-3403-40ad-9caf-852e1b719177';
const NOW = new Date('2026-11-26T10:30:00.000Z');
const base = `gridaware/v1/orgs/${ORG}/sites/${SITE}/devices/${DEVICE}`;

const envelope = {
  schemaVersion: '1.0',
  eventId: '01936f10-9a7d-7e21-9e25-4a4cb9b90a01',
  deviceId: DEVICE,
  observedAt: '2026-11-26T10:30:00.000Z',
  metrics: [
    {
      sensorId: '987b4268-eeb5-4421-a4bb-0beeb891b2a1',
      metricCode: 'temperature',
      value: 86.5,
      unit: 'Cel',
    },
  ],
};
const status = {
  schemaVersion: '1.0',
  deviceId: DEVICE,
  status: 'ONLINE',
  observedAt: '2026-11-26T10:30:00.000Z',
  sequence: 1,
};
const buf = (v: unknown) => Buffer.from(JSON.stringify(v));

describe('TelemetryIngestionService', () => {
  let store: {
    claimEvent: ReturnType<typeof vi.fn>;
    releaseEvent: ReturnType<typeof vi.fn>;
    recordLatest: ReturnType<typeof vi.fn>;
    recordStatus: ReturnType<typeof vi.fn>;
  };
  let mqtt: { subscribe: ReturnType<typeof vi.fn> };
  let service: TelemetryIngestionService;

  beforeEach(() => {
    store = {
      claimEvent: vi.fn().mockResolvedValue('new'),
      releaseEvent: vi.fn().mockResolvedValue(undefined),
      recordLatest: vi.fn().mockResolvedValue(1),
      recordStatus: vi.fn().mockResolvedValue(true),
    };
    mqtt = { subscribe: vi.fn() };
    service = new TelemetryIngestionService(
      mqtt as unknown as MqttService,
      store as unknown as TelemetryStoreService,
    );
  });

  it('subscribes to shared telemetry and status topics on init', () => {
    service.onModuleInit();
    expect(mqtt.subscribe).toHaveBeenCalledWith(
      TELEMETRY_SUBSCRIPTION,
      expect.any(Function),
    );
    expect(mqtt.subscribe).toHaveBeenCalledWith(
      STATUS_SUBSCRIPTION,
      expect.any(Function),
    );
    expect(TELEMETRY_SUBSCRIPTION).toMatch(/^\$share\/gridaware-ingest\//);
  });

  it('accepts valid telemetry, claims it, and records latest values', async () => {
    const outcome = await service.handleTelemetry(
      `${base}/telemetry`,
      buf(envelope),
      NOW,
    );

    expect(outcome).toEqual({
      result: 'accepted',
      eventId: envelope.eventId,
      readings: 1,
    });
    expect(store.claimEvent).toHaveBeenCalledWith(
      ORG,
      DEVICE,
      envelope.eventId,
      expect.stringMatching(/^[0-9a-f]{64}$/),
    );
    expect(store.recordLatest).toHaveBeenCalledWith(
      ORG,
      SITE,
      expect.objectContaining({ eventId: envelope.eventId }),
      NOW,
    );
    expect(service.getStats().telemetry.accepted).toBe(1);
  });

  it('ignores duplicates without writing', async () => {
    store.claimEvent.mockResolvedValue('duplicate');
    const outcome = await service.handleTelemetry(
      `${base}/telemetry`,
      buf(envelope),
      NOW,
    );
    expect(outcome.result).toBe('duplicate');
    expect(store.recordLatest).not.toHaveBeenCalled();
    expect(service.getStats().telemetry.duplicate).toBe(1);
  });

  it('quarantines same eventId with different content', async () => {
    store.claimEvent.mockResolvedValue('conflict');
    const outcome = await service.handleTelemetry(
      `${base}/telemetry`,
      buf(envelope),
      NOW,
    );
    expect(outcome.result).toBe('conflict');
    expect(store.recordLatest).not.toHaveBeenCalled();
  });

  it('releases the claim when storing fails so redelivery can retry', async () => {
    store.recordLatest.mockRejectedValue(new Error('redis down'));
    await expect(
      service.handleTelemetry(`${base}/telemetry`, buf(envelope), NOW),
    ).rejects.toThrow('redis down');
    expect(store.releaseEvent).toHaveBeenCalledWith(
      ORG,
      DEVICE,
      envelope.eventId,
    );
  });

  it('rejects invalid topics and invalid payloads without touching Redis', async () => {
    const badTopic = await service.handleTelemetry(
      'gridaware/v1/orgs/x/sites/y/devices/z/telemetry',
      buf(envelope),
      NOW,
    );
    const badPayload = await service.handleTelemetry(
      `${base}/telemetry`,
      buf({ ...envelope, metrics: [] }),
      NOW,
    );

    expect(badTopic).toMatchObject({ result: 'rejected', reason: 'INVALID_TOPIC' });
    expect(badPayload).toMatchObject({
      result: 'rejected',
      reason: 'SCHEMA_VIOLATION',
    });
    expect(store.claimEvent).not.toHaveBeenCalled();
    expect(service.getStats().rejected).toEqual({
      INVALID_TOPIC: 1,
      SCHEMA_VIOLATION: 1,
    });
  });

  it('records newer device status and reports stale ones', async () => {
    await expect(
      service.handleStatus(`${base}/status`, buf(status), NOW),
    ).resolves.toEqual({ result: 'accepted' });
    expect(store.recordStatus).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ status: 'ONLINE' }),
      NOW,
    );

    store.recordStatus.mockResolvedValue(false);
    await expect(
      service.handleStatus(`${base}/status`, buf(status), NOW),
    ).resolves.toEqual({ result: 'stale' });
  });

  it('rejects status published on a telemetry topic', async () => {
    const outcome = await service.handleStatus(
      `${base}/telemetry`,
      buf(status),
      NOW,
    );
    expect(outcome).toMatchObject({ result: 'rejected', reason: 'INVALID_TOPIC' });
  });
});
