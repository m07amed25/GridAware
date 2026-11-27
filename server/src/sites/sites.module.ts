import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { SiteResourcePolicy } from './policies/site-resource.policy.js';
import { SitesController } from './sites.controller.js';
import { SitesRepository } from './sites.repository.js';
import { SitesService } from './sites.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditLogsModule],
  controllers: [SitesController],
  providers: [SitesRepository, SiteResourcePolicy, SitesService],
  exports: [SitesRepository, SiteResourcePolicy, SitesService],
})
export class SitesModule {}
