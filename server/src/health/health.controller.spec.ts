import { describe, expect, it, vi } from 'vitest';
import { AppException } from '../common/exceptions/app.exception.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { HealthController } from './health.controller.js';
import type { HealthService, ReadinessReport } from './health.service.js';

function createController(readiness: ReadinessReport) {
  const health = {
    getLiveness: vi.fn().mockReturnValue({
      status: 'ok' as const,
      service: 'gridaware-server',
      timestamp: '2026-11-26T21:30:00.000Z',
      uptimeSeconds: 42,
    }),
    checkReadiness: vi.fn().mockResolvedValue(readiness),
  };

  return new HealthController(health as unknown as HealthService);
}

describe('HealthController', () => {
  it('exposes liveness on both /health and /health/live', () => {
    const controller = createController({
      status: 'ok',
      service: 'gridaware-server',
      checks: {
        database: { status: 'up', latencyMs: 5 },
        redis: { status: 'up', latencyMs: 1 },
        mqtt: { status: 'up', latencyMs: 0 },
      },
      timestamp: '2026-11-26T21:30:00.000Z',
    });

    expect(controller.getHealth()).toMatchObject({
      status: 'ok',
      service: 'gridaware-server',
    });
    expect(controller.getLiveness()).toMatchObject({
      status: 'ok',
      service: 'gridaware-server',
    });
  });

  it('returns readiness report when database, redis, and mqtt are up', async () => {
    const controller = createController({
      status: 'ok',
      service: 'gridaware-server',
      checks: {
        database: { status: 'up', latencyMs: 5 },
        redis: { status: 'up', latencyMs: 1 },
        mqtt: { status: 'up', latencyMs: 0 },
      },
      timestamp: '2026-11-26T21:30:00.000Z',
    });

    const report = await controller.getReadiness();
    expect(report.status).toBe('ok');
    expect(report.checks.database.status).toBe('up');
    expect(report.checks.redis.status).toBe('up');
    expect(report.checks.mqtt.status).toBe('up');
  });

  it('throws sanitized 503 AppException listing only down dependencies', async () => {
    const controller = createController({
      status: 'degraded',
      service: 'gridaware-server',
      checks: {
        database: { status: 'down', latencyMs: 100 },
        redis: { status: 'up', latencyMs: 1 },
        mqtt: { status: 'down', latencyMs: 0 },
      },
      timestamp: '2026-11-26T21:30:00.000Z',
    });

    const promise = controller.getReadiness();
    await expect(promise).rejects.toBeInstanceOf(AppException);
    await promise.catch((error: AppException) => {
      expect(error.getStatus()).toBe(503);
      expect(error.code).toBe(ErrorCode.DEPENDENCY_UNAVAILABLE);
      expect(error.errors).toEqual([
        {
          field: 'database',
          code: ErrorCode.DEPENDENCY_UNAVAILABLE,
          message: 'The database dependency is unavailable.',
        },
        {
          field: 'mqtt',
          code: ErrorCode.DEPENDENCY_UNAVAILABLE,
          message: 'The mqtt dependency is unavailable.',
        },
      ]);
    });
  });
});
