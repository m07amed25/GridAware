import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RedisService } from '../redis/redis.service.js';
import {
  EVENT_CLAIM_TTL_SECONDS,
  TelemetryStoreService,
} from './telemetry-store.service.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const SITE = '22222222-2222-4222-8222-222222222222';
const DEVICE = 'f5b3aa39-3403-40ad-9caf-852e1b719177';
const EVENT = '01936f10-9a7d-7e21-9e25-4a4cb9b90a01';
const NOW = new Date('2026-11-26T10:30:00.000Z');

describe('TelemetryStoreService', () => {
  let redisClient: {
    call: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    eval: ReturnType<typeof vi.fn>;
    hvals: ReturnType<typeof vi.fn>;
  };
  let store: TelemetryStoreService;

  beforeEach(() => {
    redisClient = {
      call: vi.fn(),
      del: vi.fn().mockResolvedValue(1),
      eval: vi.fn().mockResolvedValue(1),
      hvals: vi.fn().mockResolvedValue([]),
    };
    store = new TelemetryStoreService({
      client: redisClient,
    } as unknown as RedisService);
  });

  it('classifies claimEvent as new, duplicate, or conflict', async () => {
    redisClient.call.mockResolvedValueOnce(null);
    await expect(store.claimEvent(ORG, DEVICE, EVENT, 'hash-a')).resolves.toBe(
      'new',
    );
    expect(redisClient.call).toHaveBeenCalledWith(
      'SET',
      TelemetryStoreService.eventKey(ORG, DEVICE, EVENT),
      'hash-a',
      'EX',
      String(EVENT_CLAIM_TTL_SECONDS),
      'NX',
      'GET',
    );

    redisClient.call.mockResolvedValueOnce('hash-a');
    await expect(store.claimEvent(ORG, DEVICE, EVENT, 'hash-a')).resolves.toBe(
      'duplicate',
    );

    redisClient.call.mockResolvedValueOnce('hash-a');
    await expect(store.claimEvent(ORG, DEVICE, EVENT, 'hash-b')).resolves.toBe(
      'conflict',
    );
  });

  it('releases an event claim by key', async () => {
    await store.releaseEvent(ORG, DEVICE, EVENT);
    expect(redisClient.del).toHaveBeenCalledWith(
      TelemetryStoreService.eventKey(ORG, DEVICE, EVENT),
    );
  });

  it('writes latest sensor readings via atomic Lua eval and parses hvals', async () => {
    const envelope = {
      schemaVersion: '1.0' as const,
      eventId: EVENT,
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

    const updated = await store.recordLatest(ORG, SITE, envelope, NOW);
    expect(updated).toBe(1);
    const [valuesKey, tsKey] = TelemetryStoreService.latestKeys(ORG, SITE);
    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.any(String),
      2,
      valuesKey,
      tsKey,
      '987b4268-eeb5-4421-a4bb-0beeb891b2a1',
      String(Date.parse(envelope.observedAt)),
      expect.stringContaining('"metricCode":"temperature"'),
    );

    const payloadArg = redisClient.eval.mock.calls[0][6] as string;
    redisClient.hvals.mockResolvedValueOnce([payloadArg]);
    const readings = await store.getLatest(ORG, SITE);
    expect(readings).toHaveLength(1);
    expect(readings[0]).toMatchObject({
      metricCode: 'temperature',
      value: 86.5,
      unit: 'Cel',
    });
  });

  it('returns whether device status update was newer', async () => {
    const msg = {
      schemaVersion: '1.0' as const,
      deviceId: DEVICE,
      status: 'ONLINE' as const,
      observedAt: '2026-11-26T10:30:00.000Z',
      sequence: 2,
    };

    redisClient.eval.mockResolvedValueOnce(1);
    await expect(store.recordStatus(ORG, msg, NOW)).resolves.toBe(true);

    redisClient.eval.mockResolvedValueOnce(0);
    await expect(store.recordStatus(ORG, msg, NOW)).resolves.toBe(false);
  });
});
