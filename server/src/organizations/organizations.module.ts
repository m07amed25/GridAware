import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import {
  OrganizationDetailController,
  OrganizationsController,
} from './organizations.controller.js';
import { OrganizationsRepository } from './organizations.repository.js';
import { OrganizationsService } from './organizations.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditLogsModule],
  controllers: [OrganizationsController, OrganizationDetailController],
  providers: [OrganizationsRepository, OrganizationsService],
  exports: [OrganizationsService, OrganizationsRepository],
})
export class OrganizationsModule {}
