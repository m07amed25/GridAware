import { describe, expect, it, vi } from 'vitest';
import type { AuditLogsService } from '../../audit-logs/audit-logs.service.js';
import { AuthorizationService } from '../../authorization/authorization.service.js';
import type { OrganizationAuthorizationContext } from '../../authorization/authorization.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import { LocationMetricsService } from '../../common/observability/location-metrics.service.js';
import {
  LocationStatus,
  MembershipRole,
  SiteType,
} from '../../generated/prisma/enums.js';
import type { AppLogger } from '../../logging/app-logger.service.js';
import { SiteResourcePolicy } from '../policies/site-resource.policy.js';
import type { SiteRecord, SitesRepository } from '../sites.repository.js';
import { SitesService } from '../sites.service.js';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '44444444-4444-4444-8444-444444444444';

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
    latitude: 30.0444,
    longitude: 31.2357,
    timeZone: 'Africa/Cairo',
    status: LocationStatus.ACTIVE,
    archivedAt: null,
    createdAt: new Date('2026-11-27T10:00:00.000Z'),
    updatedAt: new Date('2026-11-27T10:00:00.000Z'),
    _count: { buildings: 2 },
    ...overrides,
  };
}

function createHarness() {
  const fakeTx = {} as never;
  const repo = {
    runInTransaction: vi.fn(
      async <T>(fn: (tx: never) => Promise<T>): Promise<T> => fn(fakeTx),
    ),
    lockSiteForUpdate: vi.fn().mockResolvedValue(undefined),
    findManyInOrganization: vi.fn(),
    findByIdInOrganization: vi.fn(),
    findByCodeInOrganization: vi.fn(),
    createInOrganization: vi.fn(),
    updateInOrganization: vi.fn(),
    countNonArchivedBuildings: vi.fn().mockResolvedValue(0),
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
  const policy = new SiteResourcePolicy(new AuthorizationService());
  const service = new SitesService(repo, policy, auditLogs, metrics, logger);

  return { service, repo, auditLogs, metrics, logger, fakeTx };
}

describe('SitesService (US1 CRUD)', () => {
  it('creates a site scoped to active organization and writes SITE_CREATED atomically', async () => {
    const { service, repo, auditLogs, metrics, fakeTx } = createHarness();
    const created = makeSiteRecord({ _count: { buildings: 0 } });
    vi.mocked(repo.createInOrganization).mockResolvedValue(created);

    const dto = await service.create(makeContext(MembershipRole.OWNER), {
      code: 'CAI-PLANT-01',
      name: 'Cairo Manufacturing Plant',
      type: SiteType.FACTORY,
      city: 'Cairo',
      countryCode: 'EG',
      latitude: 30.0444,
      longitude: 31.2357,
      timeZone: 'Africa/Cairo',
    });

    expect(dto.id).toBe(SITE_ID);
    expect(dto.organizationId).toBe(ORG_ID);
    expect(dto.code).toBe('CAI-PLANT-01');
    expect(dto.buildingCount).toBe(0);
    expect(repo.createInOrganization).toHaveBeenCalledWith(
      ORG_ID,
      expect.objectContaining({ code: 'CAI-PLANT-01' }),
      fakeTx,
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SITE_CREATED',
        entityType: 'SITE',
        entityId: SITE_ID,
        organizationId: ORG_ID,
      }),
      fakeTx,
    );
    expect(metrics.getSnapshot().gridaware_sites_created_total).toBe(1);
  });

  it('maps Prisma P2002 duplicate code constraint to 409 SITE_CODE_ALREADY_EXISTS', async () => {
    const { service, repo, auditLogs, metrics } = createHarness();
    vi.mocked(repo.createInOrganization).mockRejectedValue({
      code: 'P2002',
      meta: { target: ['organizationId', 'code'] },
    });

    await expect(
      service.create(makeContext(), {
        code: 'CAI-PLANT-01',
        name: 'Duplicate',
        type: SiteType.FACTORY,
        timeZone: 'UTC',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.SITE_CODE_ALREADY_EXISTS,
    });

    expect(auditLogs.record).not.toHaveBeenCalled();
    expect(
      metrics.getSnapshot().gridaware_location_conflicts_total[
        'site|duplicate_code'
      ],
    ).toBe(1);
  });

  it('lists sites with non-archived buildingCount and cursor pagination metadata', async () => {
    const { service, repo } = createHarness();
    const row = makeSiteRecord({ _count: { buildings: 3 } });
    vi.mocked(repo.findManyInOrganization).mockResolvedValue({
      items: [row],
      nextCursor: 'cursor_1',
      hasMore: true,
    });

    const result = await service.list(makeContext(MembershipRole.VIEWER), {
      limit: 20,
      sort: 'createdAt',
      direction: 'desc',
      includeArchived: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].buildingCount).toBe(3);
    expect(result.pagination).toEqual({
      nextCursor: 'cursor_1',
      hasMore: true,
      limit: 20,
    });
  });

  it('returns concealed SITE_NOT_FOUND for invalid UUID or missing site', async () => {
    const { service, repo } = createHarness();
    vi.mocked(repo.findByIdInOrganization).mockResolvedValue(null);

    await expect(
      service.findOne(makeContext(MembershipRole.VIEWER), 'not-a-uuid', false),
    ).rejects.toMatchObject({
      code: ErrorCode.SITE_NOT_FOUND,
    });

    await expect(
      service.findOne(makeContext(MembershipRole.VIEWER), SITE_ID, false),
    ).rejects.toMatchObject({
      code: ErrorCode.SITE_NOT_FOUND,
    });
  });

  it('updates editable fields, preserves coordinate pair rule against existing record, and audits SITE_UPDATED', async () => {
    const { service, repo, auditLogs, fakeTx } = createHarness();
    const existing = makeSiteRecord({ latitude: 30.0, longitude: 31.0 });
    const updated = makeSiteRecord({
      name: 'Cairo Plant North',
      latitude: 30.0,
      longitude: 31.0,
    });
    vi.mocked(repo.findByIdInOrganization).mockResolvedValue(existing);
    vi.mocked(repo.updateInOrganization).mockResolvedValue(updated);

    const dto = await service.update(
      makeContext(MembershipRole.FACILITY_MANAGER),
      SITE_ID,
      { name: 'Cairo Plant North' },
    );

    expect(dto.name).toBe('Cairo Plant North');
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SITE_UPDATED',
        entityType: 'SITE',
        entityId: SITE_ID,
      }),
      fakeTx,
    );
  });

  it('rejects partial coordinate clearing on update when resulting pair is mismatched', async () => {
    const { service, repo, auditLogs } = createHarness();
    vi.mocked(repo.findByIdInOrganization).mockResolvedValue(
      makeSiteRecord({ latitude: 30.0, longitude: 31.0 }),
    );

    try {
      await service.update(makeContext(), SITE_ID, { latitude: null });
      expect.fail('Expected VALIDATION_ERROR');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(ErrorCode.VALIDATION_ERROR);
    }

    expect(repo.updateInOrganization).not.toHaveBeenCalled();
    expect(auditLogs.record).not.toHaveBeenCalled();
  });
});

describe('SitesService (US3 Lifecycle & Archive Visibility)', () => {
  it('deactivates an active site without altering child buildings and records SITE_DEACTIVATED', async () => {
    const { service, repo, auditLogs, fakeTx } = createHarness();
    vi.mocked(repo.findByIdInOrganization).mockResolvedValue(
      makeSiteRecord({ status: LocationStatus.ACTIVE }),
    );
    vi.mocked(repo.updateInOrganization).mockResolvedValue(
      makeSiteRecord({ status: LocationStatus.INACTIVE }),
    );

    const dto = await service.deactivate(makeContext(), SITE_ID);
    expect(dto.status).toBe(LocationStatus.INACTIVE);
    expect(repo.updateInOrganization).toHaveBeenCalledWith(
      ORG_ID,
      SITE_ID,
      { status: LocationStatus.INACTIVE },
      fakeTx,
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SITE_DEACTIVATED', entityId: SITE_ID }),
      fakeTx,
    );
  });

  it('activates an inactive site and rejects redundant activation with INVALID_LOCATION_STATE', async () => {
    const { service, repo, auditLogs, fakeTx } = createHarness();
    vi.mocked(repo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ status: LocationStatus.INACTIVE }),
    );
    vi.mocked(repo.updateInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ status: LocationStatus.ACTIVE }),
    );

    const dto = await service.activate(makeContext(), SITE_ID);
    expect(dto.status).toBe(LocationStatus.ACTIVE);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SITE_ACTIVATED', entityId: SITE_ID }),
      fakeTx,
    );

    vi.mocked(repo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ status: LocationStatus.ACTIVE }),
    );
    await expect(
      service.activate(makeContext(), SITE_ID),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_LOCATION_STATE });
  });

  it('blocks site archival under FOR UPDATE lock when non-archived buildings remain (SITE_HAS_ACTIVE_BUILDINGS)', async () => {
    const { service, repo, auditLogs, fakeTx } = createHarness();
    vi.mocked(repo.findByIdInOrganization).mockResolvedValue(makeSiteRecord());
    vi.mocked(repo.countNonArchivedBuildings).mockResolvedValue(2);

    await expect(service.archive(makeContext(), SITE_ID)).rejects.toMatchObject(
      { code: ErrorCode.SITE_HAS_ACTIVE_BUILDINGS },
    );
    expect(repo.lockSiteForUpdate).toHaveBeenCalledWith(
      fakeTx,
      ORG_ID,
      SITE_ID,
    );
    expect(repo.updateInOrganization).not.toHaveBeenCalled();
    expect(auditLogs.record).not.toHaveBeenCalled();
  });

  it('archives a site with 0 non-archived buildings and restores it cleanly', async () => {
    const { service, repo, auditLogs, fakeTx } = createHarness();
    const archivedAt = new Date('2026-11-27T12:00:00.000Z');
    vi.mocked(repo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt: null }),
    );
    vi.mocked(repo.countNonArchivedBuildings).mockResolvedValueOnce(0);
    vi.mocked(repo.updateInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt }),
    );

    const archived = await service.archive(makeContext(), SITE_ID);
    expect(archived.archivedAt).toBe(archivedAt.toISOString());
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SITE_ARCHIVED', entityId: SITE_ID }),
      fakeTx,
    );

    vi.mocked(repo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt }),
    );
    vi.mocked(repo.updateInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt: null }),
    );
    const restored = await service.restore(makeContext(), SITE_ID);
    expect(restored.archivedAt).toBeNull();
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SITE_RESTORED', entityId: SITE_ID }),
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
        service.list(makeContext(role), {
          limit: 20,
          sort: 'createdAt',
          direction: 'desc',
          includeArchived: true,
        }),
      ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });
    }
    expect(auditLogs.record).toHaveBeenCalledTimes(3);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'AUTHZ_DENIED', entityType: 'SITE' }),
    );
  });
});

describe('SitesService (Code Dual-Resolution)', () => {
  it('resolves findOne by lowercase or uppercase site code, including archived sites when allowed', async () => {
    const { service, repo } = createHarness();
    const activeSite = makeSiteRecord({ code: 'CAI-PLANT-01' });
    const archivedSite = makeSiteRecord({
      code: 'CAI-PLANT-01',
      archivedAt: new Date('2026-11-27T12:00:00.000Z'),
    });
    vi.mocked(repo.findByCodeInOrganization)
      .mockResolvedValueOnce(activeSite)
      .mockResolvedValueOnce(archivedSite);

    const dto = await service.findOne(makeContext(), 'cai-plant-01');
    expect(dto.id).toBe(SITE_ID);
    expect(repo.findByCodeInOrganization).toHaveBeenCalledWith(
      ORG_ID,
      'CAI-PLANT-01',
    );

    const archivedDto = await service.findOne(
      makeContext(MembershipRole.OWNER),
      'CAI-PLANT-01',
      true,
    );
    expect(archivedDto.archivedAt).toBe(archivedSite.archivedAt?.toISOString());
  });

  it('uses canonical site UUID for row lock, update, and audit logs when archiving and restoring by code', async () => {
    const { service, repo, auditLogs, fakeTx } = createHarness();
    const archivedAt = new Date('2026-11-27T12:00:00.000Z');
    vi.mocked(repo.findByCodeInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt: null }),
    );
    vi.mocked(repo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt: null }),
    );
    vi.mocked(repo.countNonArchivedBuildings).mockResolvedValueOnce(0);
    vi.mocked(repo.updateInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt }),
    );

    const archived = await service.archive(makeContext(), 'cai-plant-01');
    expect(archived.id).toBe(SITE_ID);
    expect(repo.lockSiteForUpdate).toHaveBeenCalledWith(fakeTx, ORG_ID, SITE_ID);
    expect(repo.countNonArchivedBuildings).toHaveBeenCalledWith(
      ORG_ID,
      SITE_ID,
      fakeTx,
    );
    expect(repo.updateInOrganization).toHaveBeenCalledWith(
      ORG_ID,
      SITE_ID,
      expect.objectContaining({ archivedAt: expect.any(Date) }),
      fakeTx,
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SITE_ARCHIVED', entityId: SITE_ID }),
      fakeTx,
    );

    vi.mocked(repo.findByCodeInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt }),
    );
    vi.mocked(repo.findByIdInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt }),
    );
    vi.mocked(repo.updateInOrganization).mockResolvedValueOnce(
      makeSiteRecord({ archivedAt: null }),
    );

    const restored = await service.restore(makeContext(), 'cai-plant-01');
    expect(restored.archivedAt).toBeNull();
    expect(repo.lockSiteForUpdate).toHaveBeenLastCalledWith(
      fakeTx,
      ORG_ID,
      SITE_ID,
    );
    expect(auditLogs.record).toHaveBeenLastCalledWith(
      expect.objectContaining({ action: 'SITE_RESTORED', entityId: SITE_ID }),
      fakeTx,
    );
  });

  it('updates, activates, and deactivates a site by code using canonical UUID in persistence', async () => {
    const { service, repo, fakeTx } = createHarness();
    vi.mocked(repo.findByCodeInOrganization)
      .mockResolvedValueOnce(makeSiteRecord({ status: LocationStatus.ACTIVE }))
      .mockResolvedValueOnce(makeSiteRecord({ status: LocationStatus.ACTIVE }))
      .mockResolvedValueOnce(makeSiteRecord({ status: LocationStatus.INACTIVE }));
    vi.mocked(repo.updateInOrganization)
      .mockResolvedValueOnce(makeSiteRecord({ name: 'Renamed Plant' }))
      .mockResolvedValueOnce(makeSiteRecord({ status: LocationStatus.INACTIVE }))
      .mockResolvedValueOnce(makeSiteRecord({ status: LocationStatus.ACTIVE }));

    await service.update(makeContext(), 'cai-plant-01', {
      name: 'Renamed Plant',
    });
    await service.deactivate(makeContext(), 'cai-plant-01');
    await service.activate(makeContext(), 'cai-plant-01');

    expect(repo.updateInOrganization).toHaveBeenNthCalledWith(
      1,
      ORG_ID,
      SITE_ID,
      { name: 'Renamed Plant' },
      fakeTx,
    );
    expect(repo.updateInOrganization).toHaveBeenNthCalledWith(
      2,
      ORG_ID,
      SITE_ID,
      { status: LocationStatus.INACTIVE },
      fakeTx,
    );
    expect(repo.updateInOrganization).toHaveBeenNthCalledWith(
      3,
      ORG_ID,
      SITE_ID,
      { status: LocationStatus.ACTIVE },
      fakeTx,
    );
  });

  it('rejects malformed site reference with 404 SITE_NOT_FOUND without querying repository', async () => {
    const { service, repo } = createHarness();
    await expect(service.findOne(makeContext(), 'bad!!ref')).rejects.toMatchObject({
      code: ErrorCode.SITE_NOT_FOUND,
    });
    expect(repo.findByIdInOrganization).not.toHaveBeenCalled();
    expect(repo.findByCodeInOrganization).not.toHaveBeenCalled();
  });
});
