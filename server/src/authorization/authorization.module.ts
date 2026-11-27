import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthorizationController } from './authorization.controller.js';
import { AuthorizationService } from './authorization.service.js';
import { BackgroundJobAuthorizationService } from './channels/background-job-authorization.service.js';
import { DeviceIsolationGuardrail } from './channels/device-isolation.guardrail.js';
import { WsAuthorizationService } from './channels/ws-authorization.service.js';
import { OrganizationContextGuard } from './guards/organization-context.guard.js';
import { PermissionsGuard } from './guards/permissions.guard.js';
import { ExportPolicy } from './policies/export.policy.js';
import { IncidentPolicy } from './policies/incident.policy.js';
import { ResourceTenantPolicy } from './policies/resource-tenant.policy.js';
import { SimulatorPolicy } from './policies/simulator.policy.js';
import { TechnicianScopePolicy } from './policies/technician-scope.policy.js';
import { WorkOrderPolicy } from './policies/work-order.policy.js';

@Module({
  imports: [AuthModule, AuditLogsModule, UsersModule, SessionsModule],
  controllers: [AuthorizationController],
  providers: [
    AuthorizationService,
    OrganizationContextGuard,
    PermissionsGuard,
    ResourceTenantPolicy,
    TechnicianScopePolicy,
    WorkOrderPolicy,
    IncidentPolicy,
    SimulatorPolicy,
    ExportPolicy,
    WsAuthorizationService,
    BackgroundJobAuthorizationService,
    DeviceIsolationGuardrail,
  ],
  exports: [
    AuthorizationService,
    OrganizationContextGuard,
    PermissionsGuard,
    ResourceTenantPolicy,
    TechnicianScopePolicy,
    WorkOrderPolicy,
    IncidentPolicy,
    SimulatorPolicy,
    ExportPolicy,
    WsAuthorizationService,
    BackgroundJobAuthorizationService,
    DeviceIsolationGuardrail,
  ],
})
export class AuthorizationModule {}
