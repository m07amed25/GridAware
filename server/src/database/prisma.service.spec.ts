import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from './prisma.service.js';

describe('PrismaService', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    vi.restoreAllMocks();
  });

  it('throws when DATABASE_URL is not configured', () => {
    delete process.env.DATABASE_URL;

    expect(() => new PrismaService()).toThrow(
      'DATABASE_URL environment variable is required',
    );
  });

  it('initializes with DATABASE_URL and delegates lifecycle hooks', async () => {
    process.env.DATABASE_URL =
      'postgresql://user:pass@ep-example-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require';

    const service = new PrismaService();
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
});
