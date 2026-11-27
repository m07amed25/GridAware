import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthorizationModule } from '../authorization/authorization.module.js';
import { MailModule } from '../mail/mail.module.js';
import {
  InvitationAcceptanceController,
  OrganizationInvitationsController,
} from './invitations.controller.js';
import { InvitationsService } from './invitations.service.js';
import { MembershipsController } from './memberships.controller.js';
import { MembershipsRepository } from './memberships.repository.js';
import { MembershipsService } from './memberships.service.js';

@Module({
  imports: [AuthModule, AuthorizationModule, AuditLogsModule, MailModule],
  controllers: [
    MembershipsController,
    OrganizationInvitationsController,
    InvitationAcceptanceController,
  ],
  providers: [MembershipsRepository, MembershipsService, InvitationsService],
  exports: [MembershipsService, MembershipsRepository, InvitationsService],
})
export class MembershipsModule {}
