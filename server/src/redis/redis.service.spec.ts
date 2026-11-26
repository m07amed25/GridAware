import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const redisMock = vi.hoisted(() => {
  const instance = {
    status: 'wait' as string,
    on: vi.fn(),
    connect: vi.fn(),
    quit: vi.fn(),
    disconnect: vi.fn(),
    ping: vi.fn(),
  };
  const Redis = vi.fn(function () {
    return instance;
  });
  return { instance, Redis };
});

vi.mock('ioredis', () => ({ Redis: redisMock.Redis }));

import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { RedisService } from './redis.service.js';

function createTestEnv(redisUrl = 'redis://localhost:6379'): EnvService {
  return new EnvService(
    validateServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
      REDIS_URL: redisUrl,
      MQTT_URL: 'mqtt://localhost:1883',
    }),
  );
}

describe('RedisService', () => {
  const client = redisMock.instance;

  beforeEach(() => {
    client.status = 'wait';
    client.connect.mockResolvedValue(undefined);
    client.quit.mockResolvedValue('OK');
    client.ping.mockResolvedValue('PONG');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates a lazy client from REDIS_URL and connects on init', () => {
    const service = new RedisService(createTestEnv());
    service.onModuleInit();

    expect(redisMock.Redis).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({ lazyConnect: true }),
    );
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('does not throw on init when the initial connection fails', async () => {
    client.connect.mockRejectedValue(new Error('ECONNREFUSED'));
    const service = new RedisService(createTestEnv());

    expect(() => service.onModuleInit()).not.toThrow();
    await Promise.resolve();
  });

  it('reports unhealthy without pinging when not ready', async () => {
    const service = new RedisService(createTestEnv());
    await expect(service.isHealthy()).resolves.toBe(false);
    expect(client.ping).not.toHaveBeenCalled();
  });

  it('reports healthy when ready and PING returns PONG', async () => {
    client.status = 'ready';
    const service = new RedisService(createTestEnv());
    await expect(service.isHealthy()).resolves.toBe(true);
  });

  it('reports unhealthy when PING fails', async () => {
    client.status = 'ready';
    client.ping.mockRejectedValue(new Error('timeout'));
    const service = new RedisService(createTestEnv());
    await expect(service.isHealthy()).resolves.toBe(false);
  });

  it('quits on destroy, falling back to disconnect on error', async () => {
    const service = new RedisService(createTestEnv());
    await service.onModuleDestroy();
    expect(client.quit).toHaveBeenCalledTimes(1);

    client.quit.mockRejectedValue(new Error('closed'));
    await service.onModuleDestroy();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});
