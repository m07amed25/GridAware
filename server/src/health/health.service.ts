import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../config/env.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { SERVICE_NAME } from '../logging/app-logger.service.js';
import { MqttService } from '../mqtt/mqtt.service.js';
import { RedisService } from '../redis/redis.service.js';

export type DependencyStatus = 'up' | 'down';
export type DependencyName = 'database' | 'redis' | 'mqtt';

export interface DependencyCheckResult {
  status: DependencyStatus;
  latencyMs: number;
}

export interface LivenessReport {
  status: 'ok';
  service: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  service: string;
  checks: Record<DependencyName, DependencyCheckResult>;
  timestamp: string;
}

class CheckTimeoutError extends Error {
  constructor() {
    super('Health check timed out');
    this.name = 'CheckTimeoutError';
  }
}

/**
 * Evaluates in-process liveness and bounded, sanitized dependency readiness
 * checks (PostgreSQL, Redis, MQTT) aligned with NFR-OBS-005.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mqtt: MqttService,
    private readonly env: EnvService,
  ) {}

  getLiveness(): LivenessReport {
    return {
      status: 'ok',
      service: SERVICE_NAME,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }

  async checkReadiness(): Promise<ReadinessReport> {
    const timeoutMs = this.env.healthCheckTimeoutMs;
    const [database, redis, mqtt] = await Promise.all([
      this.runCheck('database', () => this.prisma.isHealthy(), timeoutMs),
      this.runCheck('redis', () => this.redis.isHealthy(), timeoutMs),
      this.runCheck(
        'mqtt',
        () => Promise.resolve(this.mqtt.isHealthy()),
        timeoutMs,
      ),
    ]);

    const allHealthy =
      database.status === 'up' &&
      redis.status === 'up' &&
      mqtt.status === 'up';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      checks: { database, redis, mqtt },
      timestamp: new Date().toISOString(),
    };
  }

  private async runCheck(
    name: DependencyName,
    check: () => Promise<boolean>,
    timeoutMs: number,
  ): Promise<DependencyCheckResult> {
    const startedNs = process.hrtime.bigint();
    let timer: NodeJS.Timeout | undefined;

    try {
      const healthy = await Promise.race<boolean>([
        Promise.resolve().then(check),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new CheckTimeoutError()), timeoutMs);
        }),
      ]);

      const latencyMs =
        Math.round(Number(process.hrtime.bigint() - startedNs) / 10_000) / 100;
      if (!healthy) {
        this.logger.warn(`Readiness check reported ${name} down`, {
          dependency: name,
          latencyMs,
        });
      }
      return { status: healthy ? 'up' : 'down', latencyMs };
    } catch (error) {
      const latencyMs =
        Math.round(Number(process.hrtime.bigint() - startedNs) / 10_000) / 100;
      const reason = error instanceof CheckTimeoutError ? 'timeout' : 'error';
      this.logger.warn(`Readiness check for ${name} failed (${reason})`, {
        dependency: name,
        reason,
        latencyMs,
      });
      return { status: 'down', latencyMs };
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
