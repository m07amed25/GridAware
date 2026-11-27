import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthorizationService } from '../authorization.service.js';
import type { OrganizationAuthorizationContext } from '../authorization.types.js';
import {
  type AssignableWorkOrderRecord,
  TechnicianScopePolicy,
} from './technician-scope.policy.js';

export type WorkOrderStatusValue =
  | 'DRAFT'
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface WorkOrderPolicyRecord extends AssignableWorkOrderRecord {
  readonly status: WorkOrderStatusValue;
}

const MUTABLE_WORK_ORDER_STATUSES = new Set<WorkOrderStatusValue>([
  'DRAFT',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
]);

const COMPLETABLE_WORK_ORDER_STATUSES = new Set<WorkOrderStatusValue>([
  'ASSIGNED',
  'IN_PROGRESS',
  'BLOCKED',
]);

@Injectable()
export class WorkOrderPolicy {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly technicianScope: TechnicianScopePolicy,
  ) {}

  assertCanRead(
    context: OrganizationAuthorizationContext,
    workOrder: WorkOrderPolicyRecord | null | undefined,
  ): WorkOrderPolicyRecord {
    const canReadAll = this.authorization.hasPermission(
      context,
      'work-orders:read',
    );
    const canReadAssigned = this.authorization.hasPermission(
      context,
      'work-orders:read-assigned',
    );

    if (!canReadAll && !canReadAssigned) {
      throw AppException.forbidden('Insufficient permissions to read work order.');
    }

    return this.technicianScope.assertAssignedWorkOrder(context, workOrder);
  }

  assertCanAssign(
    context: OrganizationAuthorizationContext,
    workOrder: WorkOrderPolicyRecord | null | undefined,
    assigneeOrganizationId: string | null | undefined,
  ): WorkOrderPolicyRecord {
    if (!this.authorization.hasPermission(context, 'work-orders:assign')) {
      throw AppException.forbidden(
        'Insufficient permissions to assign work orders.',
      );
    }
    if (
      !workOrder ||
      workOrder.organizationId !== context.organizationId ||
      assigneeOrganizationId !== context.organizationId
    ) {
      throw AppException.notFound();
    }
    if (!MUTABLE_WORK_ORDER_STATUSES.has(workOrder.status)) {
      throw AppException.stateTransitionNotAllowed(
        `Work order in status ${workOrder.status} cannot be assigned.`,
      );
    }
    return workOrder;
  }

  assertCanUpdate(
    context: OrganizationAuthorizationContext,
    workOrder: WorkOrderPolicyRecord | null | undefined,
    updatePayload: Record<string, unknown>,
  ): WorkOrderPolicyRecord {
    const canUpdateAll = this.authorization.hasPermission(
      context,
      'work-orders:update',
    );
    const canUpdateAssigned = this.authorization.hasPermission(
      context,
      'work-orders:update-assigned',
    );

    if (!canUpdateAll && !canUpdateAssigned) {
      throw AppException.forbidden(
        'Insufficient permissions to update work order.',
      );
    }

    const verified = this.technicianScope.assertAssignedWorkOrder(
      context,
      workOrder,
    );
    this.technicianScope.assertTechnicianEditableWorkOrderFields(
      context,
      updatePayload,
    );

    if (!MUTABLE_WORK_ORDER_STATUSES.has(verified.status)) {
      throw AppException.stateTransitionNotAllowed(
        `Work order in status ${verified.status} cannot be updated.`,
      );
    }

    return verified;
  }

  assertCanComplete(
    context: OrganizationAuthorizationContext,
    workOrder: WorkOrderPolicyRecord | null | undefined,
  ): WorkOrderPolicyRecord {
    const canCompleteAll = this.authorization.hasPermission(
      context,
      'work-orders:complete',
    );
    const canCompleteAssigned = this.authorization.hasPermission(
      context,
      'work-orders:complete-assigned',
    );

    if (!canCompleteAll && !canCompleteAssigned) {
      throw AppException.forbidden(
        'Insufficient permissions to complete work order.',
      );
    }

    const verified = this.technicianScope.assertAssignedWorkOrder(
      context,
      workOrder,
    );

    if (!COMPLETABLE_WORK_ORDER_STATUSES.has(verified.status)) {
      throw AppException.stateTransitionNotAllowed(
        `Work order in status ${verified.status} cannot be completed.`,
      );
    }

    return verified;
  }

  /**
   * Builds the atomic conditional WHERE clause for write-time completion so
   * TOCTOU races (e.g., concurrent reassignment away from a Technician or
   * status change) fail deterministically with 0 affected rows.
   */
  buildConditionalCompleteWhere(
    context: OrganizationAuthorizationContext,
    workOrderId: string,
  ): {
    id: string;
    organizationId: string;
    status: { in: WorkOrderStatusValue[] };
    assignedToUserId?: string;
  } {
    return {
      id: workOrderId,
      organizationId: context.organizationId,
      status: { in: [...COMPLETABLE_WORK_ORDER_STATUSES] },
      ...(this.technicianScope.isTechnician(context)
        ? { assignedToUserId: context.userId }
        : {}),
    };
  }
}
