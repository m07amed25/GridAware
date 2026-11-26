import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { MqttService } from '../mqtt/mqtt.service.js';
import type { RedisService } from '../redis/redis.service.js';
import { HealthController } from './health.controller.js';

function createController(redisUp: boolean, mqttUp: boolean) {
  const redis = { isHealthy: vi.fn().mockResolvedValue(redisUp) };
  const mqtt = { isHealthy: vi.fn().mockReturnValue(mqttUp) };
  return new HealthController(
    redis as unknown as RedisService,
    mqtt as unknown as MqttService,
  );
}

describe('HealthController', () => {
  it('returns ok when Redis and MQTT are up', async () => {
    const report = await createController(true, true).getReadiness();
    expect(report.status).toBe('ok');
    expect(report.checks).toEqual({ redis: 'up', mqtt: 'up' });
  });

  it.each([
    [false, true, { redis: 'down', mqtt: 'up' }],
    [true, false, { redis: 'up', mqtt: 'down' }],
  ])(
    'throws 503 with details when a dependency is down (redis=%s, mqtt=%s)',
    async (redisUp, mqttUp, checks) => {
      const promise = createController(redisUp, mqttUp).getReadiness();
      await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
      await promise.catch((error: ServiceUnavailableException) => {
        expect(error.getResponse()).toMatchObject({
          status: 'degraded',
          checks,
        });
      });
    },
  );
});
