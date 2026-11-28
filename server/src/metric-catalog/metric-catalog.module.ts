import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { MetricCatalogController } from './metric-catalog.controller.js';
import { MetricCatalogService } from './metric-catalog.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [MetricCatalogController],
  providers: [MetricCatalogService],
  exports: [MetricCatalogService],
})
export class MetricCatalogModule {}
