import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ExceptionsModule } from './common/exceptions/exceptions.module.js';
import { EnvModule } from './config/env.module.js';
import { EnvService } from './config/env.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { MqttModule } from './mqtt/mqtt.module.js';
import { RedisModule } from './redis/redis.module.js';
import { TelemetryModule } from './telemetry/telemetry.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    EnvModule,
    LoggingModule,
    ExceptionsModule,
    PrismaModule,
    RedisModule,
    MqttModule,
    TelemetryModule,
    HealthModule,
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    ObserveModule.forRootAsync({
      inject: [EnvService],
      useFactory: (env: EnvService) => ({
        appKey: env.observeAppKey,
        appSecret: env.observeAppSecret,
        ...(env.observeEndpoint ? { endpoint: env.observeEndpoint } : {}),
        serviceId: 'server',
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
