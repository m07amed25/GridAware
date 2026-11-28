import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { MetricCatalogModule } from '../metric-catalog/metric-catalog.module.js';
import { SensorsController } from './sensors.controller.js';
import { SensorsRepository } from './sensors.repository.js';
import { SensorsService } from './sensors.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule, MetricCatalogModule],
  controllers: [SensorsController],
  providers: [SensorsRepository, SensorsService],
  exports: [SensorsService],
})
export class SensorsModule {}
