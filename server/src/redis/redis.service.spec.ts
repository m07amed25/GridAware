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

import { RedisService } from './redis.service.js';

describe('RedisService', () => {
  const originalUrl = process.env.REDIS_URL;
  const client = redisMock.instance;

  beforeEach(() => {
    process.env.REDIS_URL = 'redis://localhost:6379';
    client.status = 'wait';
    client.connect.mockResolvedValue(undefined);
    client.quit.mockResolvedValue('OK');
    client.ping.mockResolvedValue('PONG');
  });

  afterEach(() => {
    if (originalUrl === undefined) {
      delete process.env.REDIS_URL;
    } else {
      process.env.REDIS_URL = originalUrl;
    }
    vi.clearAllMocks();
  });

  it('throws when REDIS_URL is not configured', () => {
    delete process.env.REDIS_URL;
    expect(() => new RedisService()).toThrow(
      'REDIS_URL environment variable is required',
    );
  });

  it('creates a lazy client from REDIS_URL and connects on init', () => {
    const service = new RedisService();
    service.onModuleInit();

    expect(redisMock.Redis).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({ lazyConnect: true }),
    );
    expect(client.connect).toHaveBeenCalledTimes(1);
  });

  it('does not throw on init when the initial connection fails', async () => {
    client.connect.mockRejectedValue(new Error('ECONNREFUSED'));
    const service = new RedisService();

    expect(() => service.onModuleInit()).not.toThrow();
    await Promise.resolve();
  });

  it('reports unhealthy without pinging when not ready', async () => {
    const service = new RedisService();
    await expect(service.isHealthy()).resolves.toBe(false);
    expect(client.ping).not.toHaveBeenCalled();
  });

  it('reports healthy when ready and PING returns PONG', async () => {
    client.status = 'ready';
    const service = new RedisService();
    await expect(service.isHealthy()).resolves.toBe(true);
  });

  it('reports unhealthy when PING fails', async () => {
    client.status = 'ready';
    client.ping.mockRejectedValue(new Error('timeout'));
    const service = new RedisService();
    await expect(service.isHealthy()).resolves.toBe(false);
  });

  it('quits on destroy, falling back to disconnect on error', async () => {
    const service = new RedisService();
    await service.onModuleDestroy();
    expect(client.quit).toHaveBeenCalledTimes(1);

    client.quit.mockRejectedValue(new Error('closed'));
    await service.onModuleDestroy();
    expect(client.disconnect).toHaveBeenCalledTimes(1);
  });
});
