import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import type { PrismaService } from '../database/prisma.service.js';
import type { MqttService } from '../mqtt/mqtt.service.js';
import type { RedisService } from '../redis/redis.service.js';
import { HealthService } from './health.service.js';

function createService(options: {
  database?: () => Promise<boolean>;
  redis?: () => Promise<boolean>;
  mqtt?: () => boolean;
  timeoutMs?: number;
}) {
  const prisma = {
    isHealthy: vi.fn(options.database ?? (async () => true)),
  };
  const redis = {
    isHealthy: vi.fn(options.redis ?? (async () => true)),
  };
  const mqtt = {
    isHealthy: vi.fn(options.mqtt ?? (() => true)),
  };
  const env = new EnvService(
    validateServerEnv({
      DATABASE_URL:
        'postgresql://user:pass@ep-example.aws.neon.tech/neondb?sslmode=require',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      HEALTH_CHECK_TIMEOUT_MS: String(options.timeoutMs ?? 200),
    }),
  );

  return new HealthService(
    prisma as unknown as PrismaService,
    redis as unknown as RedisService,
    mqtt as unknown as MqttService,
    env,
  );
}

describe('HealthService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns liveness report without touching external dependencies', () => {
    const service = createService({});
    const report = service.getLiveness();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('gridaware-server');
    expect(Number.isNaN(Date.parse(report.timestamp))).toBe(false);
    expect(report.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it('returns ok readiness when database, redis, and mqtt are all healthy', async () => {
    const service = createService({});
    const report = await service.checkReadiness();

    expect(report.status).toBe('ok');
    expect(report.service).toBe('gridaware-server');
    expect(report.checks.database.status).toBe('up');
    expect(report.checks.redis.status).toBe('up');
    expect(report.checks.mqtt.status).toBe('up');
    expect(report.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('marks hanging or throwing dependency checks as down without leaking errors', async () => {
    const warnSpy = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    const service = createService({
      timeoutMs: 100,
      database: () =>
        new Promise<boolean>(() => {
          // Intentionally never resolves to verify timeout handling.
        }),
      redis: async () => {
        throw new Error('redis://:topsecret@internal:6379 connection refused');
      },
      mqtt: () => true,
    });

    const report = await service.checkReadiness();

    expect(report.status).toBe('degraded');
    expect(report.checks.database.status).toBe('down');
    expect(report.checks.redis.status).toBe('down');
    expect(report.checks.mqtt.status).toBe('up');
    expect(warnSpy).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(report)).not.toContain('topsecret');
  });
});
