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
  formatGrossAreaSqM,
  normalizeLocationCode,
} from '../common/validation/location-validation.js';
import type { Prisma } from '../generated/prisma/client.js';
import { LocationStatus } from '../generated/prisma/enums.js';
import { AppLogger } from '../logging/app-logger.service.js';
import { type SiteRecord, SitesRepository } from '../sites/sites.repository.js';
import {
  type BuildingRecord,
  BuildingsRepository,
  type UpdateBuildingPersistenceData,
} from './buildings.repository.js';
import type {
  CreateBuildingInput,
  ListBuildingsQueryInput,
  UpdateBuildingInput,
} from './dto/buildings.schemas.js';
import { type BuildingDto, toBuildingDto } from './mappers/building.mapper.js';
import { BuildingResourcePolicy } from './policies/building-resource.policy.js';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2002'
  );
}

function buildChangedFieldsMetadata(
  before: BuildingRecord,
  input: UpdateBuildingInput,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const beforeFields: Record<string, unknown> = {};
  const afterFields: Record<string, unknown> = {};

  for (const key of Object.keys(input) as (keyof UpdateBuildingInput)[]) {
    if (input[key] !== undefined) {
      beforeFields[key] =
        key === 'grossAreaSqM'
          ? formatGrossAreaSqM(before.grossAreaSqM)
          : before[key];
      afterFields[key] = input[key];
    }
  }

  return { before: beforeFields, after: afterFields };
}

@Injectable()
export class BuildingsService {
  constructor(
    private readonly buildingsRepository: BuildingsRepository,
    private readonly sitesRepository: SitesRepository,
    private readonly buildingPolicy: BuildingResourcePolicy,
    private readonly auditLogs: AuditLogsService,
    private readonly metrics: LocationMetricsService,
    private readonly logger: AppLogger,
  ) {}

  private async assertArchiveViewAllowed(
    context: OrganizationAuthorizationContext,
    resourcePath: string,
  ): Promise<void> {
    try {
      this.buildingPolicy.assertCanViewArchived(context);
    } catch (error) {
      await this.auditLogs.record({
        action: 'AUTHZ_DENIED',
        entityType: 'BUILDING',
        organizationId: context.organizationId,
        actorUserId: context.userId,
        actorMembershipId: context.membershipId,
        metadata: {
          requiredPermission: 'buildings:archive',
          role: context.role,
          reason: 'includeArchived_denied',
          resourcePath,
        },
      });
      throw error;
    }
  }

  private async resolveParentSite(
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

  private async resolveSiteId(
    organizationId: string,
    siteRef: string,
    tx?: Prisma.TransactionClient,
  ): Promise<string | null> {
    const trimmed = siteRef.trim();
    if (UUID_PATTERN.test(trimmed)) {
      return trimmed;
    }
    const code = normalizeLocationCode(trimmed);
    if (!LOCATION_CODE_PATTERN.test(code)) {
      return null;
    }
    const found =
      tx !== undefined
        ? await this.sitesRepository.findByCodeInOrganization(
            organizationId,
            code,
            tx,
          )
        : await this.sitesRepository.findByCodeInOrganization(
            organizationId,
            code,
          );
    return found?.id ?? null;
  }

  private async resolveBuildingInSite(
    organizationId: string,
    siteId: string,
    buildingRef: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BuildingRecord | null> {
    const trimmed = buildingRef.trim();
    if (UUID_PATTERN.test(trimmed)) {
      return tx !== undefined
        ? this.buildingsRepository.findByIdInSite(
            organizationId,
            siteId,
            trimmed,
            tx,
          )
        : this.buildingsRepository.findByIdInSite(
            organizationId,
            siteId,
            trimmed,
          );
    }
    const code = normalizeLocationCode(trimmed);
    if (!LOCATION_CODE_PATTERN.test(code)) {
      return null;
    }
    return tx !== undefined
      ? this.buildingsRepository.findByCodeInSite(
          organizationId,
          siteId,
          code,
          tx,
        )
      : this.buildingsRepository.findByCodeInSite(organizationId, siteId, code);
  }

  async list(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    query: ListBuildingsQueryInput,
  ): Promise<{ items: BuildingDto[]; pagination: PaginationMeta }> {
    const startMs = Date.now();
    try {
      if (query.includeArchived) {
        await this.assertArchiveViewAllowed(context, 'buildings:list');
      }

      const parentSite = await this.resolveParentSite(
        context.organizationId,
        siteRef,
      );
      const ownedSite = this.buildingPolicy.assertParentSiteExists(
        context,
        parentSite,
      );
      if (ownedSite.archivedAt !== null && !query.includeArchived) {
        throw AppException.siteNotFound();
      }

      const result = await this.buildingsRepository.findManyInSite({
        organizationId: context.organizationId,
        siteId: ownedSite.id,
        limit: query.limit,
        cursor: query.cursor,
        q: query.q,
        status: query.status,
        sort: query.sort,
        direction: query.direction,
        includeArchived: query.includeArchived,
      });

      this.metrics.recordApiRequest('listBuildings', 200, Date.now() - startMs);
      return {
        items: result.items.map(toBuildingDto),
        pagination: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          limit: query.limit,
        },
      };
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      this.metrics.recordApiRequest(
        'listBuildings',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async create(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    input: CreateBuildingInput,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      const created = await this.buildingsRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteId(
            context.organizationId,
            siteRef,
            tx,
          );
          if (!siteId) {
            throw AppException.siteNotFound();
          }

          await this.sitesRepository.lockSiteForUpdate(
            tx,
            context.organizationId,
            siteId,
          );

          const parentSite = await this.sitesRepository.findByIdInOrganization(
            context.organizationId,
            siteId,
            tx,
          );
          this.buildingPolicy.assertParentSiteAcceptsBuilding(
            context,
            parentSite,
          );

          const building = await this.buildingsRepository.createInSite(
            context.organizationId,
            siteId,
            {
              code: input.code,
              name: input.name,
              type: input.type,
              description: input.description ?? null,
              floorCount: input.floorCount ?? null,
              grossAreaSqM: input.grossAreaSqM ?? null,
            },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'BUILDING_CREATED',
              entityType: 'BUILDING',
              entityId: building.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                siteId,
                code: building.code,
                name: building.name,
                type: building.type,
                floorCount: building.floorCount,
                grossAreaSqM: formatGrossAreaSqM(building.grossAreaSqM),
                status: building.status,
              },
            },
            tx,
          );

          return building;
        },
      );

      this.metrics.recordBuildingCreated();
      this.metrics.recordApiRequest(
        'createBuilding',
        201,
        Date.now() - startMs,
      );
      this.logger.log('Building created', BuildingsService.name, {
        organizationId: context.organizationId,
        siteId: created.siteId,
        buildingId: created.id,
        code: created.code,
      });

      return toBuildingDto(created);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        this.metrics.recordConflict('building', 'duplicate_code');
        this.metrics.recordMutation('building', 'create', 'conflict');
        this.metrics.recordApiRequest(
          'createBuilding',
          409,
          Date.now() - startMs,
        );
        throw AppException.buildingCodeAlreadyExists(
          `A building with code "${input.code}" already exists in this site.`,
        );
      }

      if (error instanceof AppException) {
        if (error.code === ErrorCode.SITE_ARCHIVED) {
          this.metrics.recordConflict('building', 'site_archived');
          this.metrics.recordMutation('building', 'create', 'conflict');
        } else if (error.code === ErrorCode.SITE_INACTIVE) {
          this.metrics.recordConflict('building', 'site_inactive');
          this.metrics.recordMutation('building', 'create', 'conflict');
        } else {
          this.metrics.recordMutation('building', 'create', 'error');
        }
        this.metrics.recordApiRequest(
          'createBuilding',
          error.getStatus(),
          Date.now() - startMs,
        );
      } else {
        this.metrics.recordMutation('building', 'create', 'error');
        this.metrics.recordApiRequest(
          'createBuilding',
          500,
          Date.now() - startMs,
        );
      }
      throw error;
    }
  }

  async findOne(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    buildingRef: string,
    includeArchived = false,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      if (includeArchived) {
        await this.assertArchiveViewAllowed(context, 'buildings:detail');
      }

      const siteId = await this.resolveSiteId(context.organizationId, siteRef);
      if (!siteId) {
        throw AppException.buildingNotFound();
      }

      const building = await this.resolveBuildingInSite(
        context.organizationId,
        siteId,
        buildingRef,
      );
      const visible = this.buildingPolicy.assertVisible(
        context,
        siteId,
        building,
        includeArchived,
      );

      this.metrics.recordApiRequest('getBuilding', 200, Date.now() - startMs);
      return toBuildingDto(visible);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      this.metrics.recordApiRequest(
        'getBuilding',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async update(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    buildingRef: string,
    input: UpdateBuildingInput,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      const updated = await this.buildingsRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteId(
            context.organizationId,
            siteRef,
            tx,
          );
          if (!siteId) {
            throw AppException.buildingNotFound();
          }

          const existing = await this.resolveBuildingInSite(
            context.organizationId,
            siteId,
            buildingRef,
            tx,
          );
          const owned = this.buildingPolicy.assertSameTenantAndSite(
            context,
            siteId,
            existing,
          );
          this.buildingPolicy.assertMutable(owned);

          const data: UpdateBuildingPersistenceData = {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.type !== undefined ? { type: input.type } : {}),
            ...(input.description !== undefined
              ? { description: input.description }
              : {}),
            ...(input.floorCount !== undefined
              ? { floorCount: input.floorCount }
              : {}),
            ...(input.grossAreaSqM !== undefined
              ? { grossAreaSqM: input.grossAreaSqM }
              : {}),
          };

          const saved = await this.buildingsRepository.updateInSite(
            context.organizationId,
            siteId,
            owned.id,
            data,
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'BUILDING_UPDATED',
              entityType: 'BUILDING',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                siteId,
                ...buildChangedFieldsMetadata(owned, input),
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('building', 'update', 'success');
      this.metrics.recordApiRequest(
        'updateBuilding',
        200,
        Date.now() - startMs,
      );
      this.logger.log('Building updated', BuildingsService.name, {
        organizationId: context.organizationId,
        siteId: updated.siteId,
        buildingId: updated.id,
      });

      return toBuildingDto(updated);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('building', 'invalid_location_state');
        this.metrics.recordMutation('building', 'update', 'conflict');
      } else {
        this.metrics.recordMutation('building', 'update', 'error');
      }
      this.metrics.recordApiRequest(
        'updateBuilding',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async activate(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    buildingRef: string,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      const updated = await this.buildingsRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteId(
            context.organizationId,
            siteRef,
            tx,
          );
          if (!siteId) {
            throw AppException.buildingNotFound();
          }

          const existing = await this.resolveBuildingInSite(
            context.organizationId,
            siteId,
            buildingRef,
            tx,
          );
          const owned = this.buildingPolicy.assertSameTenantAndSite(
            context,
            siteId,
            existing,
          );
          this.buildingPolicy.assertCanActivate(owned);

          const saved = await this.buildingsRepository.updateInSite(
            context.organizationId,
            siteId,
            owned.id,
            { status: LocationStatus.ACTIVE },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'BUILDING_ACTIVATED',
              entityType: 'BUILDING',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                siteId,
                previousStatus: owned.status,
                newStatus: saved.status,
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('building', 'activate', 'success');
      this.metrics.recordApiRequest(
        'activateBuilding',
        200,
        Date.now() - startMs,
      );
      this.logger.log('Building activated', BuildingsService.name, {
        organizationId: context.organizationId,
        siteId: updated.siteId,
        buildingId: updated.id,
      });

      return toBuildingDto(updated);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('building', 'invalid_location_state');
        this.metrics.recordMutation('building', 'activate', 'conflict');
      } else {
        this.metrics.recordMutation('building', 'activate', 'error');
      }
      this.metrics.recordApiRequest(
        'activateBuilding',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async deactivate(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    buildingRef: string,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      const updated = await this.buildingsRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteId(
            context.organizationId,
            siteRef,
            tx,
          );
          if (!siteId) {
            throw AppException.buildingNotFound();
          }

          const existing = await this.resolveBuildingInSite(
            context.organizationId,
            siteId,
            buildingRef,
            tx,
          );
          const owned = this.buildingPolicy.assertSameTenantAndSite(
            context,
            siteId,
            existing,
          );
          this.buildingPolicy.assertCanDeactivate(owned);

          const saved = await this.buildingsRepository.updateInSite(
            context.organizationId,
            siteId,
            owned.id,
            { status: LocationStatus.INACTIVE },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'BUILDING_DEACTIVATED',
              entityType: 'BUILDING',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                siteId,
                previousStatus: owned.status,
                newStatus: saved.status,
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('building', 'deactivate', 'success');
      this.metrics.recordApiRequest(
        'deactivateBuilding',
        200,
        Date.now() - startMs,
      );
      this.logger.log('Building deactivated', BuildingsService.name, {
        organizationId: context.organizationId,
        siteId: updated.siteId,
        buildingId: updated.id,
      });

      return toBuildingDto(updated);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('building', 'invalid_location_state');
        this.metrics.recordMutation('building', 'deactivate', 'conflict');
      } else {
        this.metrics.recordMutation('building', 'deactivate', 'error');
      }
      this.metrics.recordApiRequest(
        'deactivateBuilding',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async archive(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    buildingRef: string,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      const archived = await this.buildingsRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteId(
            context.organizationId,
            siteRef,
            tx,
          );
          if (!siteId) {
            throw AppException.buildingNotFound();
          }

          await this.sitesRepository.lockSiteForUpdate(
            tx,
            context.organizationId,
            siteId,
          );

          const existing = await this.resolveBuildingInSite(
            context.organizationId,
            siteId,
            buildingRef,
            tx,
          );
          const owned = this.buildingPolicy.assertSameTenantAndSite(
            context,
            siteId,
            existing,
          );
          this.buildingPolicy.assertCanArchive(owned);

          const archivedAt = new Date();
          const saved = await this.buildingsRepository.updateInSite(
            context.organizationId,
            siteId,
            owned.id,
            { archivedAt },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'BUILDING_ARCHIVED',
              entityType: 'BUILDING',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                siteId,
                code: saved.code,
                archivedAt: saved.archivedAt?.toISOString() ?? null,
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('building', 'archive', 'success');
      this.metrics.recordApiRequest(
        'archiveBuilding',
        200,
        Date.now() - startMs,
      );
      this.logger.log('Building archived', BuildingsService.name, {
        organizationId: context.organizationId,
        siteId: archived.siteId,
        buildingId: archived.id,
      });

      return toBuildingDto(archived);
    } catch (error) {
      const status = error instanceof AppException ? error.getStatus() : 500;
      if (status === 409) {
        this.metrics.recordConflict('building', 'invalid_location_state');
        this.metrics.recordMutation('building', 'archive', 'conflict');
      } else {
        this.metrics.recordMutation('building', 'archive', 'error');
      }
      this.metrics.recordApiRequest(
        'archiveBuilding',
        status,
        Date.now() - startMs,
      );
      throw error;
    }
  }

  async restore(
    context: OrganizationAuthorizationContext,
    siteRef: string,
    buildingRef: string,
  ): Promise<BuildingDto> {
    const startMs = Date.now();
    try {
      const restored = await this.buildingsRepository.runInTransaction(
        async (tx) => {
          const siteId = await this.resolveSiteId(
            context.organizationId,
            siteRef,
            tx,
          );
          if (!siteId) {
            throw AppException.buildingNotFound();
          }

          await this.sitesRepository.lockSiteForUpdate(
            tx,
            context.organizationId,
            siteId,
          );

          const existing = await this.resolveBuildingInSite(
            context.organizationId,
            siteId,
            buildingRef,
            tx,
          );
          const owned = this.buildingPolicy.assertSameTenantAndSite(
            context,
            siteId,
            existing,
          );
          this.buildingPolicy.assertCanRestore(owned);

          const parentSite = await this.sitesRepository.findByIdInOrganization(
            context.organizationId,
            siteId,
            tx,
          );
          this.buildingPolicy.assertParentSiteAcceptsBuilding(
            context,
            parentSite,
          );

          const saved = await this.buildingsRepository.updateInSite(
            context.organizationId,
            siteId,
            owned.id,
            { archivedAt: null },
            tx,
          );

          await this.auditLogs.record(
            {
              action: 'BUILDING_RESTORED',
              entityType: 'BUILDING',
              entityId: saved.id,
              organizationId: context.organizationId,
              actorUserId: context.userId,
              actorMembershipId: context.membershipId,
              metadata: {
                siteId,
                code: saved.code,
                restoredStatus: saved.status,
              },
            },
            tx,
          );

          return saved;
        },
      );

      this.metrics.recordMutation('building', 'restore', 'success');
      this.metrics.recordApiRequest(
        'restoreBuilding',
        200,
        Date.now() - startMs,
      );
      this.logger.log('Building restored', BuildingsService.name, {
        organizationId: context.organizationId,
        siteId: restored.siteId,
        buildingId: restored.id,
      });

      return toBuildingDto(restored);
    } catch (error) {
      if (error instanceof AppException) {
        if (error.code === ErrorCode.SITE_ARCHIVED) {
          this.metrics.recordConflict('building', 'site_archived');
          this.metrics.recordMutation('building', 'restore', 'conflict');
        } else if (error.code === ErrorCode.SITE_INACTIVE) {
          this.metrics.recordConflict('building', 'site_inactive');
          this.metrics.recordMutation('building', 'restore', 'conflict');
        } else if (error.code === ErrorCode.INVALID_LOCATION_STATE) {
          this.metrics.recordConflict('building', 'invalid_location_state');
          this.metrics.recordMutation('building', 'restore', 'conflict');
        } else {
          this.metrics.recordMutation('building', 'restore', 'error');
        }
        this.metrics.recordApiRequest(
          'restoreBuilding',
          error.getStatus(),
          Date.now() - startMs,
        );
      } else {
        this.metrics.recordMutation('building', 'restore', 'error');
        this.metrics.recordApiRequest(
          'restoreBuilding',
          500,
          Date.now() - startMs,
        );
      }
      throw error;
    }
  }
}
