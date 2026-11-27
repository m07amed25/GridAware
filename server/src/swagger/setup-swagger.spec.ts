import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppController } from '../app.controller.js';
import { AppService } from '../app.service.js';
import { HealthController } from '../health/health.controller.js';
import { HealthService } from '../health/health.service.js';
import {
  buildSwaggerConfig,
  createSwaggerDocument,
  setupSwagger,
  SWAGGER_JSON_PATH,
  SWAGGER_UI_PATH,
  SWAGGER_YAML_PATH,
} from './setup-swagger.js';

describe('setupSwagger', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController, HealthController],
      providers: [
        AppService,
        {
          provide: HealthService,
          useValue: {
            getLiveness: vi.fn().mockReturnValue({
              status: 'ok',
              service: 'gridaware-server',
              timestamp: '2026-11-26T22:00:00.000Z',
              uptimeSeconds: 10,
            }),
            checkReadiness: vi.fn().mockResolvedValue({
              status: 'ok',
              service: 'gridaware-server',
              checks: {
                database: { status: 'up', latencyMs: 2 },
                redis: { status: 'up', latencyMs: 1 },
                mqtt: { status: 'up', latencyMs: 0 },
              },
              timestamp: '2026-11-26T22:00:00.000Z',
            }),
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('configures OpenAPI 3.1.0 metadata, tags, and JWT bearer authentication', () => {
    const config = buildSwaggerConfig();

    expect(config.openapi).toBe('3.1.0');
    expect(config.info).toMatchObject({
      title: 'GridAware API',
      version: '1.0.0',
    });
    expect(config.components?.securitySchemes?.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(config.tags?.map((tag) => tag.name)).toEqual(
      expect.arrayContaining(['Health', 'System']),
    );
  });

  it('generates an OpenAPI 3.1.0 document covering global-prefixed routes and response DTO schemas', () => {
    const doc = createSwaggerDocument(app);

    expect(doc.openapi).toBe('3.1.0');
    expect(doc.paths['/api/v1']?.get?.tags).toContain('System');
    expect(doc.paths['/api/v1/health']?.get?.tags).toContain('Health');
    expect(doc.paths['/api/v1/health/live']?.get?.tags).toContain('Health');
    expect(doc.paths['/api/v1/health/ready']?.get?.tags).toContain('Health');
    expect(doc.paths['/api/v1/health/ready']?.get?.responses?.['200']).toBeDefined();
    expect(doc.paths['/api/v1/health/ready']?.get?.responses?.['503']).toBeDefined();

    expect(doc.components?.schemas?.LivenessReportDto).toBeDefined();
    expect(doc.components?.schemas?.ReadinessReportDto).toBeDefined();
    expect(doc.components?.schemas?.ProblemDetailsDto).toBeDefined();
  });

  it('registers /api/docs, /api/docs-json, and /api/docs-yaml on the HTTP adapter', () => {
    const adapter = app.getHttpAdapter();
    const getSpy = vi.spyOn(adapter, 'get');

    setupSwagger(app);

    const registeredPaths = getSpy.mock.calls.map(([path]) => path);
    expect(registeredPaths).toEqual(
      expect.arrayContaining([
        `/${SWAGGER_UI_PATH}`,
        `/${SWAGGER_JSON_PATH}`,
        `/${SWAGGER_YAML_PATH}`,
      ]),
    );
  });
});
