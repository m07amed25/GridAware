import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';

/**
 * Shared Redis connection (cache, rate limiting, and later BullMQ queues).
 *
 * Connection is established in the background so the API can boot while
 * Redis is still starting; ioredis reconnects automatically. Use
 * `isHealthy()` (exposed via GET /api/v1/health/ready) to check readiness.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('REDIS_URL environment variable is required');
    }

    this.client = new Redis(url, {
      lazyConnect: true,
      connectionName: 'gridaware-server',
    });
    this.client.on('ready', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (error: Error) =>
      this.logger.warn(`Redis connection error: ${error.message}`),
    );
  }

  onModuleInit(): void {
    // Errors are reported via the 'error' listener; ioredis keeps retrying.
    this.client.connect().catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'end') {
      return;
    }
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }

  async isHealthy(): Promise<boolean> {
    if (this.client.status !== 'ready') {
      return false;
    }
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}
