import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AssetsModule } from './assets/assets.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AuthorizationModule } from './authorization/authorization.module.js';
import { BuildingsModule } from './buildings/buildings.module.js';
import { ExceptionsModule } from './common/exceptions/exceptions.module.js';
import { ObservabilityModule } from './common/observability/observability.module.js';
import { EnvModule } from './config/env.module.js';
import { EnvService } from './config/env.service.js';
import { PrismaModule } from './database/prisma.module.js';
import { DeviceCredentialsModule } from './device-credentials/device-credentials.module.js';
import { DeviceProvisioningModule } from './device-provisioning/device-provisioning.module.js';
import { DevicesModule } from './devices/devices.module.js';
import { HealthModule } from './health/health.module.js';
import { LoggingModule } from './logging/logging.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { MetricCatalogModule } from './metric-catalog/metric-catalog.module.js';
import { MqttModule } from './mqtt/mqtt.module.js';
import { MqttAccessModule } from './mqtt-access/mqtt-access.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { RedisModule } from './redis/redis.module.js';
import { SensorsModule } from './sensors/sensors.module.js';
import { SitesModule } from './sites/sites.module.js';
import { TelemetryModule } from './telemetry/telemetry.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    EnvModule,
    LoggingModule,
    ExceptionsModule,
    ObservabilityModule,
    PrismaModule,
    RedisModule,
    AuditLogsModule,
    AuthModule,
    AuthorizationModule,
    OrganizationsModule,
    MembershipsModule,
    SitesModule,
    BuildingsModule,
    AssetsModule,
    MetricCatalogModule,
    DeviceCredentialsModule,
    MqttAccessModule,
    DeviceProvisioningModule,
    SensorsModule,
    DevicesModule,
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
