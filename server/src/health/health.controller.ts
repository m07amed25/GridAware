import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service.js';
import { RedisService } from '../redis/redis.service.js';

type DependencyStatus = 'up' | 'down';

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  checks: { redis: DependencyStatus; mqtt: DependencyStatus };
  timestamp: string;
}

/**
 * Readiness probe for local infrastructure dependencies.
 * Liveness stays at GET /api/v1/health (AppController) so container
 * healthchecks do not flap when Redis or the broker restarts.
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly mqtt: MqttService,
  ) {}

  @Get('ready')
  async getReadiness(): Promise<ReadinessReport> {
    const redisUp = await this.redis.isHealthy();
    const mqttUp = this.mqtt.isHealthy();

    const report: ReadinessReport = {
      status: redisUp && mqttUp ? 'ok' : 'degraded',
      checks: {
        redis: redisUp ? 'up' : 'down',
        mqtt: mqttUp ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };

    if (report.status !== 'ok') {
      throw new ServiceUnavailableException(report);
    }
    return report;
  }
}
