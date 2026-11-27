import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { EnvModule } from './env.module.js';
import { EnvValidationError } from './env.schema.js';
import { EnvService } from './env.service.js';

describe('EnvModule', () => {
  it('provides validated typed EnvService through Nest DI', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        EnvModule.forRoot({
          env: {
            NODE_ENV: 'test',
            PORT: '4000',
            CORS_ORIGIN: 'http://localhost:3000/',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
            REDIS_URL: 'redis://localhost:6379',
            MQTT_URL: 'mqtt://localhost:1883',
          },
          loadEnvFile: false,
        }),
      ],
    }).compile();

    const env = moduleRef.get(EnvService);
    expect(env.nodeEnv).toBe('test');
    expect(env.isTest).toBe(true);
    expect(env.isProduction).toBe(false);
    expect(env.port).toBe(4000);
    expect(env.corsOrigin).toBe('http://localhost:3000');
    expect(env.swaggerEnabled).toBe(true);
    expect(env.databaseUrl).toBe(
      'postgresql://user:pass@localhost:5432/gridaware',
    );
    expect(env.redisUrl).toBe('redis://localhost:6379');
    expect(env.mqttUrl).toBe('mqtt://localhost:1883');
    expect(env.get('PORT')).toBe(4000);

    await moduleRef.close();
  });

  it('fails fast during module compilation when env is invalid', async () => {
    await expect(
      Test.createTestingModule({
        imports: [
          EnvModule.forRoot({
            env: { PORT: 'invalid' },
            loadEnvFile: false,
          }),
        ],
      }).compile(),
    ).rejects.toThrow(EnvValidationError);
  });
});
