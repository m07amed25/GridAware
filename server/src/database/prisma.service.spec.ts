import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with EnvService databaseUrl and delegates lifecycle hooks', async () => {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL:
          'postgresql://user:pass@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
      }),
    );

    const service = new PrismaService(env);
    const connectSpy = vi
      .spyOn(service, '$connect')
      .mockResolvedValue(undefined);
    const disconnectSpy = vi
      .spyOn(service, '$disconnect')
      .mockResolvedValue(undefined);

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });

  it('reports health status without throwing when the database query fails', async () => {
    const env = new EnvService(
      validateServerEnv({
        DATABASE_URL:
          'postgresql://user:pass@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require',
        REDIS_URL: 'redis://localhost:6379',
        MQTT_URL: 'mqtt://localhost:1883',
      }),
    );

    const service = new PrismaService(env);
    vi.spyOn(service, '$queryRaw').mockResolvedValueOnce([{ '?column?': 1 }]);
    await expect(service.isHealthy()).resolves.toBe(true);

    vi.spyOn(service, '$queryRaw').mockRejectedValueOnce(
      new Error('connection refused'),
    );
    await expect(service.isHealthy()).resolves.toBe(false);
  });
});
