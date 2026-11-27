import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { UUID_PATTERN } from '../authorization/authorization.constants.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import type { PaginationMeta } from '../common/envelopes/api-response.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { LocationMetricsService } from '../common/observability/location-metrics.service.js';
import {
  LOCATION_CODE_PATTERN,
  normalizeLocationCode,
  validateCoordinatePair,
} from '../common/validation/location-validation.js';
import type { Prisma } from '../generated/prisma/client.js';
import { LocationStatus } from '../generated/prisma/enums.js';
import { AppLogger } from '../logging/app-logger.service.js';
import type {
  CreateSiteInput,
  ListSitesQueryInput,
  UpdateSiteInput,
} from './dto/sites.schemas.js';
import { type SiteDto, toSiteDto } from './mappers/site.mapper.js';
import { SiteResourcePolicy } from './policies/site-resource.policy.js';
import {
  type SiteRecord,
  SitesRepository,
  type UpdateSitePersistenceData,
} from './sites.repository.js';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function buildChangedFieldsMetadata(
  before: SiteRecord,
  input: UpdateSiteInput,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const beforeFields: Record<string, unknown> = {};
  const afterFields: Record<string, unknown> = {};

  for (const key of Object.keys(input) as (keyof UpdateSiteInput)[]) {
    if (input[key] !== undefined) {
      beforeFields[key] = before[key];
      afterFields[key] = input[key];
    }
  }

  return { before: beforeFields, after: afterFields };
}

@Injectable()
export class SitesService {
  constructor(
    private readonly sitesRepository: SitesRepository,
    private readonly sitePolicy: SiteResourcePolicy,
    private readonly auditLogs: AuditLogsService,
    private readonly metrics: LocationMetricsService,
    private readonly logger: AppLogger,
  ) {}

  private async assertArchiveViewAllowed(
    context: OrganizationAuthorizationContext,
    resourcePath: string,
  ): Promise<void> {
    try {
      this.sitePolicy.assertCanViewArchived(context);
    } catch (error) {
      await this.auditLogs.record({
        action: 'AUTHZ_DENIED',
        entityType: 'SITE',
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        metadata: {
          requiredPermission: 'sites:archive',
          role: context.role,
          reason: 'includeArchived_denied',
          resourcePath,
        },
      });
      throw error;
    }
  }

  async list(
    context: OrganizationAuthorizationContext,
    query: ListSitesQueryInput,
  ): Promise<{ items: SiteDto[]; pagination: PaginationMeta }> {
    const startMs = Date.now();
    try {
      if (query.includeArchived) {
        await this.assertArchiveViewAllowed(context, 'sites:list');
      }

      const result = await this.sitesRepository.findManyInOrganization({
        organizationId: context.organizationId,
        limit: query.limit,
        cursor: query.cursor,
        q: query.q,
        status: query.status,
        sort: query.sort,
        direction: query.direction,
        includeArchived: query.includeArchived,
      });

      this.metrics.recordApiRequest('listSites', 200, Date.now() - startMs);
      return {
        items: result.items.map(toSiteDto),
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          limit: query.limit,
        },
      };
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      this.metrics.recordApiRequest('listSites', status, Date.now() - startMs);
      throw error;
    }
  }

  async create(
    context: OrganizationAuthorizationContext,
    input: CreateSiteInput,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      const created = await this.sitesRepository.runInTransaction(async (tx) => {
        const site = await this.sitesRepository.createInOrganization(
          context.organizationId,
          {
            code: input.code,
            name: input.name,
            type: input.type,
            description: input.description ?? null,
            addressLine1: input.addressLine1 ?? null,
            addressLine2: input.addressLine2 ?? null,
            city: input.city ?? null,
            region: input.region ?? null,
            postalCode: input.postalCode ?? null,
            countryCode: input.countryCode ?? null,
            latitude: input.latitude ?? null,
            longitude: input.longitude ?? null,
            timeZone: input.timeZone,
          },
          tx,
        );

        await this.auditLogs.record(
          {
            action: 'SITE_CREATED',
            entityType: 'SITE',
            entityId: site.id,
            organizationId: context.organizationId,
            actorUserId: context.userId,
            actorMembershipId: context.membershipId,
            metadata: {
              code: site.code,
              name: site.name,
              type: site.type,
              timeZone: site.timeZone,
              status: site.status,
            },
          },
          tx,
        );

        return site;
      });

      this.metrics.recordSiteCreated();
      this.metrics.recordApiRequest('createSite', 201, Date.now() - startMs);
      this.logger.log('Site created', SitesService.name, {
        organizationId: context.organizationId,
        siteId: created.id,
        code: created.code,
      });

      return toSiteDto(created);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        this.metrics.recordConflict('site', 'duplicate_code');
        this.metrics.recordMutation('site', 'create', 'conflict');
        this.metrics.recordApiRequest('createSite', 409, Date.now() - startMs);
        throw AppException.siteCodeAlreadyExists(
          `A site with code "${input.code}" already exists in this organization.`,
        );
      }

      const status = error instanceof AppException ? error.getStatus() : 500;
      this.metrics.recordMutation('site', 'create', 'error');
      this.metrics.recordApiRequest('createSite', status, Date.now() - startMs);
      throw error;
    }
  }

  private async resolveSiteInOrganization(
    organizationId: string,
    siteRef: string,
    tx?: Prisma.TransactionClient,
  ): Promise<SiteRecord | null> {
    const trimmed = siteRef.trim();
    if (UUID_PATTERN.test(trimmed)) {
      return tx !== undefined
        ? this.sitesRepository.findByIdInOrganization(organizationId, trimmed, tx)
        : this.sitesRepository.findByIdInOrganization(organizationId, trimmed);
    }
    const code = normalizeLocationCode(trimmed);
    if (!LOCATION_CODE_PATTERN.test(code)) {
      return null;
    }
    return tx !== undefined
      ? this.sitesRepository.findByCodeInOrganization(organizationId, code, tx)
      : this.sitesRepository.findByCodeInOrganization(organizationId, code);
  }

  private async resolveSiteIdForLock(
    organizationId: string,
    siteRef: string,
    tx: Prisma.TransactionClient,
  ): Promise<string> {
    const trimmed = siteRef.trim();
    if (UUID_PATTERN.test(trimmed)) {
      return trimmed;
    }
    const code = normalizeLocationCode(trimmed);
    if (!LOCATION_CODE_PATTERN.test(code)) {
      throw AppException.siteNotFound();
    }
    const found = await this.sitesRepository.findByCodeInOrganization(
      organizationId,
      code,
      tx,
    );
    if (!found) {
      throw AppException.siteNotFound();
    }
    return found.id;
  }

  async findOne(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    includeArchived = false,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      if (includeArchived) {
        await this.assertArchiveViewAllowed(context, 'sites:detail');
      }

      const site = await this.resolveSiteInOrganization(
        context.organizationId,
        siteRef,
      );
      const visible = this.sitePolicy.assertVisible(
        context,
        site,
        includeArchived,
      );

      this.metrics.recordApiRequest('getSite', 200, Date.now() - startMs);
      return toSiteDto(visible);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      this.metrics.recordApiRequest('getSite', status, Date.now() - startMs);
      throw error;
    }
  }

  async update(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    input: UpdateSiteInput,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      const updated = await this.sitesRepository.runInTransaction(async (tx) => {
        const existing = await this.resolveSiteInOrganization(
          context.organizationId,
          siteRef,
          tx,
        );
        const owned = this.sitePolicy.assertSameTenant(context, existing);
        this.sitePolicy.assertMutable(owned);

        const nextLatitude =
          input.latitude !== undefined ? input.latitude : owned.latitude;
        const nextLongitude =
          input.longitude !== undefined ? input.longitude : owned.longitude;
        const coordIssues = validateCoordinatePair(nextLatitude, nextLongitude);
        if (coordIssues.length > 0) {
          throw AppException.validation(
            coordIssues.map((issue) => ({
              field: issue.field,
              code: 'invalid_coordinates',
              message: issue.message,
            })),
          );
        }

        const data: UpdateSitePersistenceData = {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.addressLine1 !== undefined
            ? { addressLine1: input.addressLine1 }
            : {}),
          ...(input.addressLine2 !== undefined
            ? { addressLine2: input.addressLine2 }
            : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.region !== undefined ? { region: input.region } : {}),
          ...(input.postalCode !== undefined
            ? { postalCode: input.postalCode }
            : {}),
          ...(input.countryCode !== undefined
            ? { countryCode: input.countryCode }
            : {}),
          ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
          ...(input.longitude !== undefined
            ? { longitude: input.longitude }
            : {}),
          ...(input.timeZone !== undefined ? { timeZone: input.timeZone } : {}),
        };

        const saved = await this.sitesRepository.updateInOrganization(
          context.organizationId,
          owned.id,
          data,
          tx,
        );

        await this.auditLogs.record(
          {
            action: 'SITE_UPDATED',
            entityType: 'SITE',
            entityId: saved.id,
            organizationId: context.organizationId,
            actorUserId: context.userId,
            actorMembershipId: context.membershipId,
            metadata: buildChangedFieldsMetadata(owned, input),
          },
          tx,
        );

        return saved;
      });

      this.metrics.recordMutation('site', 'update', 'success');
      this.metrics.recordApiRequest('updateSite', 200, Date.now() - startMs);
      this.logger.log('Site updated', SitesService.name, {
        organizationId: context.organizationId,
        siteId: updated.id,
      });

      return toSiteDto(updated);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('site', 'invalid_location_state');
        this.metrics.recordMutation('site', 'update', 'conflict');
      } else {
        this.metrics.recordMutation('site', 'update', 'error');
      }
      this.metrics.recordApiRequest('updateSite', status, Date.now() - startMs);
      throw error;
    }
  }

  async activate(
    context: OrganizationAuthorizationContext,
    siteRef: string,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      const updated = await this.sitesRepository.runInTransaction(async (tx) => {
        const existing = await this.resolveSiteInOrganization(
          context.organizationId,
          siteRef,
          tx,
        );
        const owned = this.sitePolicy.assertSameTenant(context, existing);
        this.sitePolicy.assertCanActivate(owned);

        const saved = await this.sitesRepository.updateInOrganization(
          context.organizationId,
          owned.id,
          { status: LocationStatus.ACTIVE },
          tx,
        );

        await this.auditLogs.record(
          {
            action: 'SITE_ACTIVATED',
            entityType: 'SITE',
            entityId: saved.id,
            organizationId: context.organizationId,
            actorUserId: context.userId,
            actorMembershipId: context.membershipId,
            metadata: {
              previousStatus: owned.status,
              newStatus: saved.status,
            },
          },
          tx,
        );

        return saved;
      });

      this.metrics.recordMutation('site', 'activate', 'success');
      this.metrics.recordApiRequest('activateSite', 200, Date.now() - startMs);
      this.logger.log('Site activated', SitesService.name, {
        organizationId: context.organizationId,
        siteId: updated.id,
      });

      return toSiteDto(updated);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('site', 'invalid_location_state');
        this.metrics.recordMutation('site', 'activate', 'conflict');
      } else {
        this.metrics.recordMutation('site', 'activate', 'error');
      }
      this.metrics.recordApiRequest(
        'activateSite',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async deactivate(
    context: OrganizationAuthorizationContext,
    siteRef: string,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      const updated = await this.sitesRepository.runInTransaction(async (tx) => {
        const existing = await this.resolveSiteInOrganization(
          context.organizationId,
          siteRef,
          tx,
        );
        const owned = this.sitePolicy.assertSameTenant(context, existing);
        this.sitePolicy.assertCanDeactivate(owned);

        const saved = await this.sitesRepository.updateInOrganization(
          context.organizationId,
          owned.id,
          { status: LocationStatus.INACTIVE },
          tx,
        );

        await this.auditLogs.record(
          {
            action: 'SITE_DEACTIVATED',
            entityType: 'SITE',
            entityId: saved.id,
            organizationId: context.organizationId,
            actorUserId: context.userId,
            actorMembershipId: context.membershipId,
            metadata: {
              previousStatus: owned.status,
              newStatus: saved.status,
            },
          },
          tx,
        );

        return saved;
      });

      this.metrics.recordMutation('site', 'deactivate', 'success');
      this.metrics.recordApiRequest(
        'deactivateSite',
        200,
        Date.now() - startMs,
      );
      this.logger.log('Site deactivated', SitesService.name, {
        organizationId: context.organizationId,
        siteId: updated.id,
      });

      return toSiteDto(updated);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('site', 'invalid_location_state');
        this.metrics.recordMutation('site', 'deactivate', 'conflict');
      } else {
        this.metrics.recordMutation('site', 'deactivate', 'error');
      }
      this.metrics.recordApiRequest(
        'deactivateSite',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async archive(
    context: OrganizationAuthorizationContext,
    siteRef: string,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      const archived = await this.sitesRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteIdForLock(
            context.organizationId,
            siteRef,
            tx,
          );

          await this.sitesRepository.lockSiteForUpdate(
            tx,
            context.organizationId,
            siteId,
          );

          const existing = await this.sitesRepository.findByIdInOrganization(
            context.organizationId,
            siteId,
            tx,
          );
          const owned = this.sitePolicy.assertSameTenant(context, existing);
          const nonArchivedBuildingCount =
            await this.sitesRepository.countNonArchivedBuildings(
              context.organizationId,
              owned.id,
              tx,
            );
          this.sitePolicy.assertCanArchive(owned, nonArchivedBuildingCount);

          const archivedAt = new Date();
          const saved = await this.sitesRepository.updateInOrganization(
            context.organizationId,
            owned.id,
            { archivedAt },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'SITE_ARCHIVED',
              entityType: 'SITE',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                code: saved.code,
                archivedAt: saved.archivedAt?.toISOString() ?? null,
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('site', 'archive', 'success');
      this.metrics.recordApiRequest('archiveSite', 200, Date.now() - startMs);
      this.logger.log('Site archived', SitesService.name, {
        organizationId: context.organizationId,
        siteId: archived.id,
      });

      return toSiteDto(archived);
    } catch (error) {
      if (error instanceof AppException) {
        if (error.code === ErrorCode.SITE_HAS_ACTIVE_BUILDINGS) {
          this.metrics.recordConflict('site', 'site_has_active_buildings');
          this.metrics.recordMutation('site', 'archive', 'conflict');
        } else if (error.code === ErrorCode.INVALID_LOCATION_STATE) {
          this.metrics.recordConflict('site', 'invalid_location_state');
          this.metrics.recordMutation('site', 'archive', 'conflict');
        } else {
          this.metrics.recordMutation('site', 'archive', 'error');
        }
        this.metrics.recordApiRequest(
          'archiveSite',
          error.getStatus(),
          Date.now() - startMs,
        );
      } else {
        this.metrics.recordMutation('site', 'archive', 'error');
        this.metrics.recordApiRequest('archiveSite', 500, Date.now() - startMs);
      }
      throw error;
    }
  }

  async restore(
    context: OrganizationAuthorizationContext,
    siteRef: string,
  ): Promise<SiteDto> {
    const startMs = Date.now();
    try {
      const restored = await this.sitesRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteIdForLock(
            context.organizationId,
            siteRef,
            tx,
          );

          await this.sitesRepository.lockSiteForUpdate(
            tx,
            context.organizationId,
            siteId,
          );

          const existing = await this.sitesRepository.findByIdInOrganization(
            context.organizationId,
            siteId,
            tx,
          );
          const owned = this.sitePolicy.assertSameTenant(context, existing);
          this.sitePolicy.assertCanRestore(owned);

          const saved = await this.sitesRepository.updateInOrganization(
            context.organizationId,
            owned.id,
            { archivedAt: null },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'SITE_RESTORED',
              entityType: 'SITE',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                code: saved.code,
                restoredStatus: saved.status,
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('site', 'restore', 'success');
      this.metrics.recordApiRequest('restoreSite', 200, Date.now() - startMs);
      this.logger.log('Site restored', SitesService.name, {
        organizationId: context.organizationId,
        siteId: restored.id,
      });

      return toSiteDto(restored);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('site', 'invalid_location_state');
        this.metrics.recordMutation('site', 'restore', 'conflict');
      } else {
        this.metrics.recordMutation('site', 'restore', 'error');
      }
      this.metrics.recordApiRequest(
        'restoreSite',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }
}
