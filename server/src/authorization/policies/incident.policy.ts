import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthorizationService } from '../authorization.service.js';
import type { OrganizationAuthorizationContext } from '../authorization.types.js';
import { ResourceTenantPolicy } from './resource-tenant.policy.js';
import { TechnicianScopePolicy } from './technician-scope.policy.js';

export type IncidentStatusValue =
  | 'DETECTED'
  | 'OPEN'
  | 'TRIAGED'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'RESOLVED'
  | 'CLOSED';

export interface IncidentPolicyRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly status: IncidentStatusValue;
}

const INVESTIGABLE_STATUSES = new Set<IncidentStatusValue>([
  'DETECTED',
  'OPEN',
  'TRIAGED',
  'ASSIGNED',
  'INVESTIGATING',
]);

@Injectable()
export class IncidentPolicy {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly tenantPolicy: ResourceTenantPolicy,
    private readonly technicianScope: TechnicianScopePolicy,
  ) {}

  assertCanRead(
    context: OrganizationAuthorizationContext,
    incident: IncidentPolicyRecord | null | undefined,
    linkedAssignedWorkOrderCount = 0,
  ): IncidentPolicyRecord {
    if (!this.authorization.hasPermission(context, 'incidents:read')) {
      throw AppException.forbidden('Insufficient permissions to read incident.');
    }
    const verified = this.tenantPolicy.assertSameTenant(context, incident);
    this.technicianScope.assertRelatedResourceAccess(
      context,
      verified.organizationId,
      linkedAssignedWorkOrderCount,
    );
    return verified;
  }

  assertCanAddNote(
    context: OrganizationAuthorizationContext,
    incident: IncidentPolicyRecord | null | undefined,
    linkedAssignedWorkOrderCount = 0,
  ): IncidentPolicyRecord {
    const canInvestigate = this.authorization.hasPermission(
      context,
      'incidents:investigate',
    );
    const canAddRelatedNote = this.authorization.hasPermission(
      context,
      'incidents:add-related-note',
    );

    if (!canInvestigate && !canAddRelatedNote) {
      throw AppException.forbidden(
        'Insufficient permissions to add incident notes.',
      );
    }

    const verified = this.tenantPolicy.assertSameTenant(context, incident);
    if (!canInvestigate) {
      this.technicianScope.assertRelatedResourceAccess(
        context,
        verified.organizationId,
        linkedAssignedWorkOrderCount,
      );
    }

    if (verified.status === 'CLOSED') {
      throw AppException.stateTransitionNotAllowed(
        'Cannot add notes to a closed incident.',
      );
    }

    return verified;
  }

  assertCanAssign(
    context: OrganizationAuthorizationContext,
    incident: IncidentPolicyRecord | null | undefined,
    assigneeOrganizationId: string | null | undefined,
  ): IncidentPolicyRecord {
    if (!this.authorization.hasPermission(context, 'incidents:assign')) {
      throw AppException.forbidden(
        'Insufficient permissions to assign incidents.',
      );
    }
    const verified = this.tenantPolicy.assertSameTenant(context, incident);
    if (assigneeOrganizationId !== context.organizationId) {
      throw AppException.notFound();
    }
    if (verified.status === 'CLOSED') {
      throw AppException.stateTransitionNotAllowed(
        'Cannot assign a closed incident.',
      );
    }
    return verified;
  }

  assertCanResolve(
    context: OrganizationAuthorizationContext,
    incident: IncidentPolicyRecord | null | undefined,
  ): IncidentPolicyRecord {
    if (!this.authorization.hasPermission(context, 'incidents:resolve')) {
      throw AppException.forbidden(
        'Insufficient permissions to resolve incidents.',
      );
    }
    const verified = this.tenantPolicy.assertSameTenant(context, incident);
    if (!INVESTIGABLE_STATUSES.has(verified.status)) {
      throw AppException.stateTransitionNotAllowed(
        `Incident in status ${verified.status} cannot be resolved.`,
      );
    }
    return verified;
  }

  assertCanClose(
    context: OrganizationAuthorizationContext,
    incident: IncidentPolicyRecord | null | undefined,
  ): IncidentPolicyRecord {
    if (!this.authorization.hasPermission(context, 'incidents:close')) {
      throw AppException.forbidden(
        'Insufficient permissions to close incidents.',
      );
    }
    const verified = this.tenantPolicy.assertSameTenant(context, incident);
    if (verified.status !== 'RESOLVED') {
      throw AppException.stateTransitionNotAllowed(
        'Only resolved incidents can be closed.',
      );
    }
    return verified;
  }
}
