import { describe, expect, it, vi } from 'vitest';
import type { AuditLogsService } from '../../audit-logs/audit-logs.service.js';
import { AuthorizationService } from '../../authorization/authorization.service.js';
import type { OrganizationAuthorizationContext } from '../../authorization/authorization.types.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { LocationMetricsService } from '../../common/observability/location-metrics.service.js';
import {
  BuildingType,
  LocationStatus,
  MembershipRole,
  SiteType,
} from '../../generated/prisma/enums.js';
import type { AppLogger } from '../../logging/app-logger.service.js';
import type { SiteRecord, SitesRepository } from '../../sites/sites.repository.js';
import type {
  BuildingRecord,
  BuildingsRepository,
} from '../buildings.repository.js';
import { BuildingsService } from '../buildings.service.js';
import { BuildingResourcePolicy } from '../policies/building-resource.policy.js';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '44444444-4444-4444-8444-444444444444';
const BUILDING_ID = '55555555-5555-4555-8555-555555555555';

function makeContext(
  role: MembershipRole = MembershipRole.OWNER,
  organizationId = ORG_ID,
): OrganizationAuthorizationContext {
  return {
    userId: '22222222-2222-4222-8222-222222222222',
    organizationId,
    membershipId: '33333333-3333-4333-8333-333333333333',
    role,
    policyVersion: '1',
  };
}

function makeSiteRecord(overrides: Partial<SiteRecord> = {}): SiteRecord {
  return {
    id: SITE_ID,
    organizationId: ORG_ID,
    code: 'CAI-PLANT-01',
    name: 'Cairo Manufacturing Plant',
    type: SiteType.FACTORY,
    description: null,
    addressLine1: null,
    addressLine2: null,
    city: 'Cairo',
    region: null,
    postalCode: null,
    countryCode: 'EG',
    latitude: null,
    longitude: null,
    timeZone: 'Africa/Cairo',
    status: LocationStatus.ACTIVE,
    archivedAt: null,
    createdAt: new Date('2026-11-27T10:00:00.000Z'),
    updatedAt: new Date('2026-11-27T10:00:00.000Z'),
    _count: { buildings: 1 },
    ...overrides,
  };
}

function makeBuildingRecord(
  overrides: Partial<BuildingRecord> = {},
): BuildingRecord {
  return {
    id: BUILDING_ID,
    organizationId: ORG_ID,
    siteId: SITE_ID,
    code: 'PROD-HALL-01',
    name: 'Production Hall 1',
    type: BuildingType.PRODUCTION,
    description: 'Primary assembly line hall',
    floorCount: 2,
    grossAreaSqM: { toString: () => '4200' } as never,
    status: LocationStatus.ACTIVE,
    archivedAt: null,
    createdAt: new Date('2026-11-27T10:05:00.000Z'),
    updatedAt: new Date('2026-11-27T10:05:00.000Z'),
    ...overrides,
  };
}

function createHarness() {
  const fakeTx = {} as never;
  const buildingsRepo = {
    runInTransaction: vi.fn(
      async <T>(fn: (tx: never) => Promise<T>): Promise<T> => fn(fakeTx),
    ),
    findManyInSite: vi.fn(),
    findByIdInSite: vi.fn(),
    findByCodeInSite: vi.fn(),
    createInSite: vi.fn(),
    updateInSite: vi.fn(),
  } as unknown as BuildingsRepository;

  const sitesRepo = {
    lockSiteForUpdate: vi.fn().mockResolvedValue(undefined),
    findByIdInOrganization: vi.fn().mockResolvedValue(makeSiteRecord()),
    findByCodeInOrganization: vi.fn().mockResolvedValue(makeSiteRecord()),
  } as unknown as SitesRepository;

  const auditLogs = {
    record: vi.fn().mockResolvedValue(undefined),
  } as unknown as AuditLogsService;

  const logger = {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLogger;

  const metrics = new LocationMetricsService();
  const policy = new BuildingResourcePolicy(new AuthorizationService());
  const service = new BuildingsService(
    buildingsRepo,
    sitesRepo,
    policy,
    auditLogs,
    metrics,
    logger,
  );

  return { service, buildingsRepo, sitesRepo, auditLogs, metrics, fakeTx };
}

describe('BuildingsService (US2 CRUD)', () => {
  it('creates a building under an ACTIVE site with FOR UPDATE lock, fixed 2-decimal area string, and BUILDING_CREATED audit', async () => {
    const { service, buildingsRepo, sitesRepo, auditLogs, metrics, fakeTx } =
      createHarness();
    vi.mocked(buildingsRepo.createInSite).mockResolvedValue(
      makeBuildingRecord(),
    );

    const dto = await service.create(makeContext(), SITE_ID, {
      code: 'PROD-HALL-01',
      name: 'Production Hall 1',
      type: BuildingType.PRODUCTION,
      floorCount: 2,
      grossAreaSqM: '4200.00',
    });

    expect(sitesRepo.lockSiteForUpdate).toHaveBeenCalledWith(
      fakeTx,
      ORG_ID,
      SITE_ID,
    );
    expect(dto.grossAreaSqM).toBe('4200.00');
    expect(dto.siteId).toBe(SITE_ID);
    expect(dto.organizationId).toBe(ORG_ID);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_CREATED',
        entityType: 'BUILDING',
        entityId: BUILDING_ID,
        organizationId: ORG_ID,
      }),
      fakeTx,
    );
    expect(metrics.getSnapshot().gridaware_buildings_created_total).toBe(1);
  });

  it('rejects building creation under archived or INACTIVE parent sites', async () => {
    const { service, sitesRepo, buildingsRepo, auditLogs } = createHarness();

    vi.mocked(sitesRepo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt: new Date() }),
    );
    await expect(
      service.create(makeContext(), SITE_ID, {
        code: 'B-01',
        name: 'Building 1',
        type: BuildingType.OFFICE,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.SITE_ARCHIVED });

    vi.mocked(sitesRepo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ status: LocationStatus.INACTIVE }),
    );
    await expect(
      service.create(makeContext(), SITE_ID, {
        code: 'B-01',
        name: 'Building 1',
        type: BuildingType.OFFICE,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.SITE_INACTIVE });

    expect(buildingsRepo.createInSite).not.toHaveBeenCalled();
    expect(auditLogs.record).not.toHaveBeenCalled();
  });

  it('maps Prisma P2002 duplicate building code to 409 BUILDING_CODE_ALREADY_EXISTS', async () => {
    const { service, buildingsRepo, auditLogs } = createHarness();
    vi.mocked(buildingsRepo.createInSite).mockRejectedValue({
      code: 'P2002',
    });

    await expect(
      service.create(makeContext(), SITE_ID, {
        code: 'PROD-HALL-01',
        name: 'Duplicate Hall',
        type: BuildingType.PRODUCTION,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.BUILDING_CODE_ALREADY_EXISTS });
    expect(auditLogs.record).not.toHaveBeenCalled();
  });

  it('returns concealed 404 BUILDING_NOT_FOUND when building is missing or under wrong site', async () => {
    const { service, buildingsRepo } = createHarness();
    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValue(null);

    await expect(
      service.findOne(makeContext(MembershipRole.VIEWER), SITE_ID, BUILDING_ID, false),
    ).rejects.toMatchObject({ code: ErrorCode.BUILDING_NOT_FOUND });
  });

  it('updates editable building metadata and writes BUILDING_UPDATED atomically', async () => {
    const { service, buildingsRepo, auditLogs, fakeTx } = createHarness();
    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValue(
      makeBuildingRecord(),
    );
    vi.mocked(buildingsRepo.updateInSite).mockResolvedValue(
      makeBuildingRecord({ name: 'Production Hall 1A', floorCount: 3 }),
    );

    const dto = await service.update(
      makeContext(MembershipRole.FACILITY_MANAGER),
      SITE_ID,
      BUILDING_ID,
      { name: 'Production Hall 1A', floorCount: 3 },
    );

    expect(dto.name).toBe('Production Hall 1A');
    expect(dto.floorCount).toBe(3);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_UPDATED',
        entityType: 'BUILDING',
        entityId: BUILDING_ID,
      }),
      fakeTx,
    );
  });
});

describe('BuildingsService (US3 Lifecycle & Archive Visibility)', () => {
  it('deactivates and reactivates a building and rejects redundant transitions', async () => {
    const { service, buildingsRepo, auditLogs, fakeTx } = createHarness();
    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ status: LocationStatus.ACTIVE }),
    );
    vi.mocked(buildingsRepo.updateInSite).mockResolvedValueOnce(
      makeBuildingRecord({ status: LocationStatus.INACTIVE }),
    );

    const deactivated = await service.deactivate(
      makeContext(),
      SITE_ID,
      BUILDING_ID,
    );
    expect(deactivated.status).toBe(LocationStatus.INACTIVE);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_DEACTIVATED',
        entityId: BUILDING_ID,
      }),
      fakeTx,
    );

    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ status: LocationStatus.INACTIVE }),
    );
    vi.mocked(buildingsRepo.updateInSite).mockResolvedValueOnce(
      makeBuildingRecord({ status: LocationStatus.ACTIVE }),
    );
    const activated = await service.activate(
      makeContext(),
      SITE_ID,
      BUILDING_ID,
    );
    expect(activated.status).toBe(LocationStatus.ACTIVE);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_ACTIVATED',
        entityId: BUILDING_ID,
      }),
      fakeTx,
    );

    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ status: LocationStatus.ACTIVE }),
    );
    await expect(
      service.activate(makeContext(), SITE_ID, BUILDING_ID),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_LOCATION_STATE });
  });

  it('archives a building and enforces ACTIVE non-archived parent site on restore under FOR UPDATE lock', async () => {
    const { service, buildingsRepo, sitesRepo, auditLogs, fakeTx } =
      createHarness();
    const archivedAt = new Date('2026-11-27T12:00:00.000Z');

    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt: null }),
    );
    vi.mocked(buildingsRepo.updateInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt }),
    );
    const archived = await service.archive(makeContext(), SITE_ID, BUILDING_ID);
    expect(archived.archivedAt).toBe(archivedAt.toISOString());
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_ARCHIVED',
        entityId: BUILDING_ID,
      }),
      fakeTx,
    );

    // Reject restore when parent site is archived
    vi.mocked(sitesRepo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt }),
    );
    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt }),
    );
    await expect(
      service.restore(makeContext(), SITE_ID, BUILDING_ID),
    ).rejects.toMatchObject({ code: ErrorCode.SITE_ARCHIVED });

    // Reject restore when parent site is INACTIVE
    vi.mocked(sitesRepo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ status: LocationStatus.INACTIVE, archivedAt: null }),
    );
    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt }),
    );
    await expect(
      service.restore(makeContext(), SITE_ID, BUILDING_ID),
    ).rejects.toMatchObject({ code: ErrorCode.SITE_INACTIVE });

    // Succeed restore when parent site is ACTIVE and non-archived
    vi.mocked(sitesRepo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ status: LocationStatus.ACTIVE, archivedAt: null }),
    );
    vi.mocked(buildingsRepo.findByIdInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt }),
    );
    vi.mocked(buildingsRepo.updateInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt: null }),
    );
    const restored = await service.restore(makeContext(), SITE_ID, BUILDING_ID);
    expect(restored.archivedAt).toBeNull();
    expect(sitesRepo.lockSiteForUpdate).toHaveBeenCalledWith(
      fakeTx,
      ORG_ID,
      SITE_ID,
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_RESTORED',
        entityId: BUILDING_ID,
      }),
      fakeTx,
    );
  });

  it('rejects includeArchived=true for Engineer/Technician/Viewer with 403 FORBIDDEN and AUTHZ_DENIED audit', async () => {
    const { service, auditLogs } = createHarness();
    for (const role of [
      MembershipRole.ENGINEER,
      MembershipRole.TECHNICIAN,
      MembershipRole.VIEWER,
    ]) {
      await expect(
        service.findOne(makeContext(role), SITE_ID, BUILDING_ID, true),
      ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
    }
    expect(auditLogs.record).toHaveBeenCalledTimes(3);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'AUTHZ_DENIED',
        entityType: 'BUILDING',
      }),
    );
  });
});

describe('BuildingsService (Code Dual-Resolution)', () => {
  it('lists and creates buildings under a site addressed by lowercase code using canonical site UUID for lock and persistence', async () => {
    const { service, buildingsRepo, sitesRepo, auditLogs, fakeTx } =
      createHarness();
    vi.mocked(buildingsRepo.findManyInSite).mockResolvedValueOnce({
      items: [makeBuildingRecord()],
      nextCursor: null,
      hasMore: false,
    });

    const listRes = await service.list(makeContext(), 'cai-plant-01', {
      limit: 20,
      sort: 'createdAt',
      direction: 'desc',
      includeArchived: false,
    });
    expect(listRes.items).toHaveLength(1);
    expect(sitesRepo.findByCodeInOrganization).toHaveBeenCalledWith(
      ORG_ID,
      'CAI-PLANT-01',
    );
    expect(buildingsRepo.findManyInSite).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: ORG_ID, siteId: SITE_ID }),
    );

    vi.mocked(buildingsRepo.createInSite).mockResolvedValueOnce(
      makeBuildingRecord(),
    );
    const created = await service.create(makeContext(), 'cai-plant-01', {
      code: 'PROD-HALL-01',
      name: 'Production Hall 1',
      type: BuildingType.PRODUCTION,
    });
    expect(created.id).toBe(BUILDING_ID);
    expect(sitesRepo.lockSiteForUpdate).toHaveBeenCalledWith(
      fakeTx,
      ORG_ID,
      SITE_ID,
    );
    expect(buildingsRepo.createInSite).toHaveBeenCalledWith(
      ORG_ID,
      SITE_ID,
      expect.objectContaining({ code: 'PROD-HALL-01' }),
      fakeTx,
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'BUILDING_CREATED',
        entityId: BUILDING_ID,
        metadata: expect.objectContaining({ siteId: SITE_ID }),
      }),
      fakeTx,
    );
  });

  it('resolves findOne, update, activate, deactivate, archive, and restore by site code and building code (including archived)', async () => {
    const { service, buildingsRepo, sitesRepo, auditLogs, fakeTx } =
      createHarness();
    const archivedAt = new Date('2026-11-27T12:00:00.000Z');

    vi.mocked(buildingsRepo.findByCodeInSite).mockResolvedValueOnce(
      makeBuildingRecord({ archivedAt }),
    );
    const found = await service.findOne(
      makeContext(MembershipRole.OWNER),
      'CAI-PLANT-01',
      'prod-hall-01',
      true,
    );
    expect(found.id).toBe(BUILDING_ID);
    expect(buildingsRepo.findByCodeInSite).toHaveBeenCalledWith(
      ORG_ID,
      SITE_ID,
      'PROD-HALL-01',
    );

    vi.mocked(buildingsRepo.findByCodeInSite)
      .mockResolvedValueOnce(makeBuildingRecord({ archivedAt: null }))
      .mockResolvedValueOnce(makeBuildingRecord({ archivedAt }));
    vi.mocked(buildingsRepo.updateInSite)
      .mockResolvedValueOnce(makeBuildingRecord({ archivedAt }))
      .mockResolvedValueOnce(makeBuildingRecord({ archivedAt: null }));

    await service.archive(makeContext(), 'cai-plant-01', 'prod-hall-01');
    expect(sitesRepo.lockSiteForUpdate).toHaveBeenCalledWith(
      fakeTx,
      ORG_ID,
      SITE_ID,
    );
    expect(buildingsRepo.updateInSite).toHaveBeenCalledWith(
      ORG_ID,
      SITE_ID,
      BUILDING_ID,
      expect.objectContaining({ archivedAt: expect.any(Date) }),
      fakeTx,
    );

    await service.restore(makeContext(), 'cai-plant-01', 'prod-hall-01');
    expect(buildingsRepo.updateInSite).toHaveBeenLastCalledWith(
      ORG_ID,
      SITE_ID,
      BUILDING_ID,
      { archivedAt: null },
      fakeTx,
    );
    expect(auditLogs.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'BUILDING_RESTORED',
        entityId: BUILDING_ID,
        metadata: expect.objectContaining({ siteId: SITE_ID }),
      }),
      fakeTx,
    );
  });

  it('rejects malformed building code with 404 BUILDING_NOT_FOUND', async () => {
    const { service, buildingsRepo } = createHarness();
    await expect(
      service.findOne(makeContext(), 'cai-plant-01', 'bad!!code'),
    ).rejects.toMatchObject({ code: ErrorCode.BUILDING_NOT_FOUND });
    expect(buildingsRepo.findByIdInSite).not.toHaveBeenCalled();
    expect(buildingsRepo.findByCodeInSite).not.toHaveBeenCalled();
  });
});
