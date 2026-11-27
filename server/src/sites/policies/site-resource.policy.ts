import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../authorization/authorization.service.js';
import type { OrganizationAuthorizationContext } from '../../authorization/authorization.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { LocationStatus } from '../../generated/prisma/enums.js';

export interface SitePolicyRecord {
  readonly organizationId: string;
  readonly status: LocationStatus;
  readonly archivedAt: Date | null;
}

@Injectable()
export class SiteResourcePolicy {
  constructor(private readonly authorizationService: AuthorizationService) {}

  assertSameTenant<T extends { readonly organizationId: string }>(
    context: OrganizationAuthorizationContext,
    site: T | null | undefined,
  ): T {
    if (!site || site.organizationId !== context.organizationId) {
      throw AppException.siteNotFound();
    }
    return site;
  }

  assertCanViewArchived(context: OrganizationAuthorizationContext): void {
    if (!this.authorizationService.hasPermission(context, 'sites:archive')) {
      throw AppException.forbidden(
        'Viewing archived sites requires sites:archive permission.',
      );
    }
  }

  assertVisible<T extends SitePolicyRecord>(
    context: OrganizationAuthorizationContext,
    site: T | null | undefined,
    includeArchived: boolean,
  ): T {
    const owned = this.assertSameTenant(context, site);
    if (owned.archivedAt !== null && !includeArchived) {
      throw AppException.siteNotFound();
    }
    return owned;
  }

  assertMutable(site: Pick<SitePolicyRecord, 'archivedAt'>): void {
    if (site.archivedAt !== null) {
      throw AppException.invalidLocationState(
        'Archived sites cannot be modified. Restore the site first.',
      );
    }
  }

  assertCanActivate(site: Pick<SitePolicyRecord, 'status' | 'archivedAt'>): void {
    this.assertMutable(site);
    if (site.status === LocationStatus.ACTIVE) {
      throw AppException.invalidLocationState('Site is already active.');
    }
  }

  assertCanDeactivate(
    site: Pick<SitePolicyRecord, 'status' | 'archivedAt'>,
  ): void {
    this.assertMutable(site);
    if (site.status === LocationStatus.INACTIVE) {
      throw AppException.invalidLocationState('Site is already inactive.');
    }
  }

  assertCanArchive(
    site: Pick<SitePolicyRecord, 'archivedAt'>,
    nonArchivedBuildingCount: number,
  ): void {
    if (site.archivedAt !== null) {
      throw AppException.invalidLocationState('Site is already archived.');
    }
    if (nonArchivedBuildingCount > 0) {
      throw AppException.siteHasActiveBuildings(nonArchivedBuildingCount);
    }
  }

  assertCanRestore(site: Pick<SitePolicyRecord, 'archivedAt'>): void {
    if (site.archivedAt === null) {
      throw AppException.invalidLocationState('Site is not archived.');
    }
  }
}
