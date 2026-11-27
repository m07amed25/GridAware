import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { MembershipRole } from '../../generated/prisma/enums.js';
import type { OrganizationAuthorizationContext } from '../authorization.types.js';

export interface AssignableWorkOrderRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly assignedToUserId: string | null;
}

export const TECHNICIAN_EDITABLE_WORK_ORDER_FIELDS = new Set<string>([
  'status',
  'inspectionFindings',
  'maintenanceNotes',
  'partsUsed',
  'completionSummary',
  'completionEvidence',
  'blockedReason',
]);

@Injectable()
export class TechnicianScopePolicy {
  isTechnician(context: OrganizationAuthorizationContext): boolean {
    return context.role === MembershipRole.TECHNICIAN;
  }

  /**
   * Builds a database query predicate for work-order listing:
   * - Technicians receive an assignment filter inside the query itself.
   * - All other roles with `work-orders:read` query the full active tenant.
   */
  workOrderListWhere<T extends Record<string, unknown>>(
    context: OrganizationAuthorizationContext,
    extra: T = {} as T,
  ): T & { organizationId: string; assignedToUserId?: string } {
    return {
      ...extra,
      organizationId: context.organizationId,
      ...(this.isTechnician(context)
        ? { assignedToUserId: context.userId }
        : {}),
    };
  }

  /**
   * Builds a query predicate for non-work-order operational resources
   * (Assets, Sensors, Telemetry, Anomalies, Predictions, Risk Assessments,
   * Incidents, Maintenance History) under Spec FR-012 Option A:
   * Technicians only see records linked to work orders assigned to them.
   */
  relatedResourceScopeFilter(
    context: OrganizationAuthorizationContext,
    workOrderRelationField = 'workOrders',
  ): Record<string, unknown> {
    if (!this.isTechnician(context)) {
      return { organizationId: context.organizationId };
    }
    return {
      organizationId: context.organizationId,
      [workOrderRelationField]: {
        some: {
          organizationId: context.organizationId,
          assignedToUserId: context.userId,
        },
      },
    };
  }

  /**
   * Verifies that a Technician can access a specific work order. Non-matching
   * tenant or assignee returns concealed 404 RESOURCE_NOT_FOUND.
   */
  assertAssignedWorkOrder<T extends AssignableWorkOrderRecord>(
    context: OrganizationAuthorizationContext,
    workOrder: T | null | undefined,
  ): T {
    if (!workOrder || workOrder.organizationId !== context.organizationId) {
      throw AppException.notFound();
    }
    if (
      this.isTechnician(context) &&
      workOrder.assignedToUserId !== context.userId
    ) {
      throw AppException.notFound();
    }
    return workOrder;
  }

  /**
   * Enforces Spec FR-012 Option A at record level: a Technician may read a
   * non-work-order operational record (or add notes to a linked incident) only
   * when it is linked to at least one work order assigned to that Technician.
   */
  assertRelatedResourceAccess(
    context: OrganizationAuthorizationContext,
    recordOrganizationId: string,
    linkedAssignedWorkOrderCount: number,
  ): void {
    if (recordOrganizationId !== context.organizationId) {
      throw AppException.notFound();
    }
    if (this.isTechnician(context) && linkedAssignedWorkOrderCount <= 0) {
      throw AppException.notFound();
    }
  }

  /**
   * Prevents Technicians from mutating protected ownership/assignment fields
   * such as assignedToUserId, organizationId, assetId, or incidentId.
   */
  assertTechnicianEditableWorkOrderFields(
    context: OrganizationAuthorizationContext,
    updatePayload: Record<string, unknown>,
  ): void {
    if (!this.isTechnician(context)) {
      return;
    }
    const forbiddenFields = Object.keys(updatePayload).filter(
      (field) =>
        updatePayload[field] !== undefined &&
        !TECHNICIAN_EDITABLE_WORK_ORDER_FIELDS.has(field),
    );
    if (forbiddenFields.length > 0) {
      throw AppException.forbidden(
        `Technicians cannot modify restricted work-order fields: ${forbiddenFields.join(', ')}.`,
      );
    }
  }
}
