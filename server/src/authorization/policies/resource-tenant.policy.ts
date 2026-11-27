import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import type { OrganizationAuthorizationContext } from '../authorization.types.js';

export interface TenantOwnedRecord {
  readonly organizationId: string;
}

@Injectable()
export class ResourceTenantPolicy {
  /**
   * Builds a tenant-scoped database query predicate so tenant filtering is
   * always enforced inside the persistence query itself.
   */
  tenantWhere<T extends Record<string, unknown>>(
    context: OrganizationAuthorizationContext,
    extra: T = {} as T,
  ): T & { organizationId: string } {
    return {
      ...extra,
      organizationId: context.organizationId,
    };
  }

  /**
   * Verifies that a loaded record exists and belongs to the verified active
   * organization. Always throws concealed 404 RESOURCE_NOT_FOUND on mismatch.
   */
  assertSameTenant<T extends TenantOwnedRecord>(
    context: OrganizationAuthorizationContext,
    record: T | null | undefined,
  ): T {
    if (!record || record.organizationId !== context.organizationId) {
      throw AppException.notFound();
    }
    return record;
  }

  /**
   * Validates that every referenced parent entity (Site, Building, Asset,
   * Device, Sensor, Incident, Assignee Membership) belongs to the verified
   * active organization before persisting a child record.
   */
  assertParentTenantConsistency(
    context: OrganizationAuthorizationContext,
    parents: readonly (TenantOwnedRecord | null | undefined)[],
  ): void {
    for (const parent of parents) {
      if (!parent || parent.organizationId !== context.organizationId) {
        throw AppException.notFound();
      }
    }
  }
}
