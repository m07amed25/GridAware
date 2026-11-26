import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { ErrorCode } from './../src/common/exceptions/error-codes.js';
import { PrismaService } from './../src/database/prisma.service.js';
import { AppLogger } from './../src/logging/app-logger.service.js';
import { MqttService } from './../src/mqtt/mqtt.service.js';
import { RedisService } from './../src/redis/redis.service.js';

describe('App HTTP foundation (e2e)', () => {
  let app: INestApplication<App>;
  let prismaHealthy: ReturnType<typeof vi.fn>;
  let redisHealthy: ReturnType<typeof vi.fn>;
  let mqttHealthy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    prismaHealthy = vi.fn().mockResolvedValue(true);
    redisHealthy = vi.fn().mockResolvedValue(true);
    mqttHealthy = vi.fn().mockReturnValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        isHealthy: prismaHealthy,
      })
      .overrideProvider(RedisService)
      .useValue({
        isHealthy: redisHealthy,
        client: {},
      })
      .overrideProvider(MqttService)
      .useValue({
        isHealthy: mqttHealthy,
        subscribe: vi.fn(),
        publish: vi.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(AppLogger));
    app.setGlobalPrefix('api/v1');
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1 (GET) returns greeting with trace headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1')
      .set('X-Request-Id', 'req_e2e_trace_01')
      .expect(200);

    expect(response.text).toBe('Hello World!');
    expect(response.headers['x-request-id']).toBe('req_e2e_trace_01');
    expect(response.headers['x-correlation-id']).toMatch(/^cor_[0-9a-f]{32}$/);
  });

  it('/api/v1/health and /api/v1/health/live (GET) return ok status with CORS and trace headers', async () => {
    for (const path of ['/api/v1/health', '/api/v1/health/live']) {
      const response = await request(app.getHttpServer())
        .get(path)
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(response.headers['x-request-id']).toMatch(/^req_[0-9a-f]{32}$/);
      expect(response.body).toMatchObject({
        status: 'ok',
        service: 'gridaware-server',
      });
      expect(typeof response.body.timestamp).toBe('string');
      expect(typeof response.body.uptimeSeconds).toBe('number');
    }
  });

  it('/api/v1/health/ready (GET) returns 200 when all dependencies are up', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'gridaware-server',
      checks: {
        database: { status: 'up' },
        redis: { status: 'up' },
        mqtt: { status: 'up' },
      },
    });
  });

  it('/api/v1/health/ready (GET) returns 503 Problem envelope when a dependency is down', async () => {
    prismaHealthy.mockResolvedValue(false);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .set('X-Request-Id', 'req_ready_503')
      .expect(503);

    expect(response.headers['x-request-id']).toBe('req_ready_503');
    expect(response.body).toEqual({
      type: 'https://gridaware.example/problems/dependency-unavailable',
      title: 'Service dependency unavailable',
      status: 503,
      code: ErrorCode.DEPENDENCY_UNAVAILABLE,
      detail: 'One or more required dependencies are unavailable.',
      instance: '/api/v1/health/ready',
      requestId: 'req_ready_503',
      errors: [
        {
          field: 'database',
          code: ErrorCode.DEPENDENCY_UNAVAILABLE,
          message: 'The database dependency is unavailable.',
        },
      ],
    });
  });

  it('returns standard RFC 7807 Problem envelope for unmatched routes and sanitizes invalid trace headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .set('X-Request-Id', 'invalid value/with spaces!')
      .expect(404);

    const requestId = response.headers['x-request-id'];
    expect(requestId).toMatch(/^req_[0-9a-f]{32}$/);
    expect(response.body).toMatchObject({
      type: 'https://gridaware.example/problems/resource-not-found',
      title: 'Resource not found',
      status: 404,
      code: ErrorCode.RESOURCE_NOT_FOUND,
      instance: '/api/v1/does-not-exist',
      requestId,
    });
  });
});
