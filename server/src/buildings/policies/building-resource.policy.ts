import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../authorization/authorization.service.js';
import type { OrganizationAuthorizationContext } from '../../authorization/authorization.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { LocationStatus } from '../../generated/prisma/enums.js';

export interface ParentSitePolicyRecord {
  readonly organizationId: string;
  readonly status: LocationStatus;
  readonly archivedAt: Date | null;
}

export interface BuildingPolicyRecord {
  readonly organizationId: string;
  readonly siteId: string;
  readonly status: LocationStatus;
  readonly archivedAt: Date | null;
}

@Injectable()
export class BuildingResourcePolicy {
  constructor(private readonly authorizationService: AuthorizationService) {}

  assertParentSiteExists<T extends { readonly organizationId: string }>(
    context: OrganizationAuthorizationContext,
    site: T | null | undefined,
  ): T {
    if (!site || site.organizationId !== context.organizationId) {
      throw AppException.siteNotFound();
    }
    return site;
  }

  /**
   * Enforces FR-010 (Option A): parent site must exist in caller's organization,
   * be non-archived, and have operational status ACTIVE before creating or
   * restoring a building.
   */
  assertParentSiteAcceptsBuilding<T extends ParentSitePolicyRecord>(
    context: OrganizationAuthorizationContext,
    site: T | null | undefined,
  ): T {
    const owned = this.assertParentSiteExists(context, site);
    if (owned.archivedAt !== null) {
      throw AppException.siteArchived();
    }
    if (owned.status !== LocationStatus.ACTIVE) {
      throw AppException.siteInactive();
    }
    return owned;
  }

  assertSameTenantAndSite<
    T extends { readonly organizationId: string; readonly siteId: string },
  >(
    context: OrganizationAuthorizationContext,
    siteId: string,
    building: T | null | undefined,
  ): T {
    if (
      !building ||
      building.organizationId !== context.organizationId ||
      building.siteId !== siteId
    ) {
      throw AppException.buildingNotFound();
    }
    return building;
  }

  assertCanViewArchived(context: OrganizationAuthorizationContext): void {
    if (
      !this.authorizationService.hasPermission(context, 'buildings:archive')
    ) {
      throw AppException.forbidden(
        'Viewing archived buildings requires buildings:archive permission.',
      );
    }
  }

  assertVisible<T extends BuildingPolicyRecord>(
    context: OrganizationAuthorizationContext,
    siteId: string,
    building: T | null | undefined,
    includeArchived: boolean,
  ): T {
    const owned = this.assertSameTenantAndSite(context, siteId, building);
    if (owned.archivedAt !== null && !includeArchived) {
      throw AppException.buildingNotFound();
    }
    return owned;
  }

  assertMutable(building: Pick<BuildingPolicyRecord, 'archivedAt'>): void {
    if (building.archivedAt !== null) {
      throw AppException.invalidLocationState(
        'Archived buildings cannot be modified. Restore the building first.',
      );
    }
  }

  assertCanActivate(
    building: Pick<BuildingPolicyRecord, 'status' | 'archivedAt'>,
  ): void {
    this.assertMutable(building);
    if (building.status === LocationStatus.ACTIVE) {
      throw AppException.invalidLocationState('Building is already active.');
    }
  }

  assertCanDeactivate(
    building: Pick<BuildingPolicyRecord, 'status' | 'archivedAt'>,
  ): void {
    this.assertMutable(building);
    if (building.status === LocationStatus.INACTIVE) {
      throw AppException.invalidLocationState('Building is already inactive.');
    }
  }

  assertCanArchive(building: Pick<BuildingPolicyRecord, 'archivedAt'>): void {
    if (building.archivedAt !== null) {
      throw AppException.invalidLocationState('Building is already archived.');
    }
  }

  assertCanRestore(building: Pick<BuildingPolicyRecord, 'archivedAt'>): void {
    if (building.archivedAt === null) {
      throw AppException.invalidLocationState('Building is not archived.');
    }
  }
}
