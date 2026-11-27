import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SitesModule } from '../sites/sites.module.js';
import { BuildingsController } from './buildings.controller.js';
import { BuildingsRepository } from './buildings.repository.js';
import { BuildingsService } from './buildings.service.js';
import { BuildingResourcePolicy } from './policies/building-resource.policy.js';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditLogsModule, SitesModule],
  controllers: [BuildingsController],
  providers: [BuildingsRepository, BuildingResourcePolicy, BuildingsService],
  exports: [BuildingsRepository, BuildingResourcePolicy, BuildingsService],
})
export class BuildingsModule {}
