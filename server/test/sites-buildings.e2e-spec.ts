import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { type App } from 'supertest/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { ErrorCode } from '../src/common/exceptions/error-codes.js';
import { PrismaService } from '../src/database/prisma.service.js';
import {
  BuildingType,
  LocationStatus,
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  SiteType,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import { AppLogger } from '../src/logging/app-logger.service.js';
import { MAILER_PORT } from '../src/mail/mailer.port.js';
import { MqttService } from '../src/mqtt/mqtt.service.js';
import { RedisService } from '../src/redis/redis.service.js';

interface MemSite {
  id: string;
  organizationId: string;
  code: string;
  name: string;
  type: SiteType;
  description: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  timeZone: string;
  status: LocationStatus;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MemBuilding {
  id: string;
  organizationId: string;
  siteId: string;
  code: string;
  name: string;
  type: BuildingType;
  description: string | null;
  floorCount: number | null;
  grossAreaSqM: string | null;
  status: LocationStatus;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  return String(a).localeCompare(String(b));
}

function matchesWhereClause(row: Record<string, any>, where: any): boolean {
  if (!where) return true;
  if (Array.isArray(where.AND)) {
    if (!where.AND.every((sub: any) => matchesWhereClause(row, sub))) {
      return false;
    }
  }
  if (Array.isArray(where.OR)) {
    if (!where.OR.some((sub: any) => matchesWhereClause(row, sub))) {
      return false;
    }
  }

  for (const [key, condition] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR') continue;
    const val = row[key];
    if (condition === null) {
      if (val !== null) return false;
      continue;
    }
    if (
      typeof condition === 'object' &&
      condition !== null &&
      !(condition instanceof Date)
    ) {
      const condObj = condition as Record<string, any>;
      if ('contains' in condObj) {
        const hay = String(val ?? '');
        const needle = String(condObj.contains ?? '');
        const matched =
          condObj.mode === 'insensitive'
            ? hay.toLowerCase().includes(needle.toLowerCase())
            : hay.includes(needle);
        if (!matched) return false;
      }
      if ('gt' in condObj && compareValues(val, condObj.gt) <= 0) return false;
      if ('lt' in condObj && compareValues(val, condObj.lt) >= 0) return false;
      continue;
    }
    if (condition instanceof Date && val instanceof Date) {
      if (val.getTime() !== condition.getTime()) return false;
      continue;
    }
    if (val !== condition) return false;
  }

  return true;
}

function createLocationsInMemoryPrisma() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const organizations = new Map<string, any>();
  const memberships = new Map<string, any>();
  const sites = new Map<string, MemSite>();
  const buildings = new Map<string, MemBuilding>();
  const auditLogs: any[] = [];
  let seq = 0;

  // Per-site async mutex simulating PostgreSQL `SELECT id FROM sites ... FOR UPDATE`
  const siteLocks = new Map<string, Promise<void>>();

  function hydrateMembership(m: any) {
    return {
      ...m,
      organization: organizations.get(m.organizationId),
      user: users.get(m.userId),
    };
  }

  function hydrateSite(site: MemSite) {
    const nonArchivedBuildings = [...buildings.values()].filter(
      (b) =>
        b.organizationId === site.organizationId &&
        b.siteId === site.id &&
        b.archivedAt === null,
    ).length;
    return {
      ...site,
      _count: { buildings: nonArchivedBuildings },
    };
  }

  function hydrateBuilding(building: MemBuilding) {
    return {
      ...building,
      grossAreaSqM:
        building.grossAreaSqM !== null
          ? { toString: () => building.grossAreaSqM as string }
          : null,
    };
  }

  const client: any = {
    isHealthy: vi.fn().mockResolvedValue(true),
    $transaction: async (fn: (tx: any) => Promise<any>) => {
      const releases: (() => void)[] = [];
      const txAuditBuffer: any[] = [];

      const tx: any = {
        ...client,
        auditLog: {
          create: async ({ data }: any) => {
            const row = { id: randomUUID(), occurredAt: new Date(), ...data };
            txAuditBuffer.push(row);
            return row;
          },
        },
        $queryRaw: async (_strings: TemplateStringsArray, ...values: any[]) => {
          const lockKey = values.map(String).join(':');
          const previous = siteLocks.get(lockKey) ?? Promise.resolve();
          let release!: () => void;
          const next = new Promise<void>((resolve) => {
            release = resolve;
          });
          siteLocks.set(lockKey, previous.then(() => next));
          releases.push(release);
          await previous;
          await Promise.resolve();
          return [{ id: values[0] }];
        },
      };

      try {
        const result = await fn(tx);
        auditLogs.push(...txAuditBuffer);
        return result;
      } finally {
        for (const release of releases) {
          release();
        }
      }
    },
    user: {
      findUnique: async ({ where }: any) => {
        if (where.id) return users.get(where.id) ?? null;
        if (where.normalizedEmail) {
          return (
            [...users.values()].find(
              (u) => u.normalizedEmail === where.normalizedEmail,
            ) ?? null
          );
        }
        return null;
      },
      create: async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: randomUUID(),
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        users.set(row.id, row);
        return row;
      },
    },
    authSession: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: randomUUID(),
          revokedAt: null,
          revokedReason: null,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        sessions.set(row.id, row);
        return row;
      },
      findUnique: async ({ where, include }: any) => {
        const s = sessions.get(where.id) ?? null;
        if (!s) return null;
        return include?.user ? { ...s, user: users.get(s.userId) } : s;
      },
      findMany: async ({ where }: any) =>
        [...sessions.values()].filter(
          (s) =>
            s.userId === where.userId &&
            (where.revokedAt === undefined || s.revokedAt === where.revokedAt),
        ),
      updateMany: async () => ({ count: 0 }),
    },
    organization: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: data.id ?? randomUUID(),
          name: data.name,
          slug: data.slug,
          status: data.status ?? OrganizationStatus.ACTIVE,
          timezone: data.timezone ?? 'UTC',
          createdAt: now,
          updatedAt: now,
        };
        organizations.set(row.id, row);
        return row;
      },
      findUnique: async ({ where }: any) =>
        where.id ? (organizations.get(where.id) ?? null) : null,
    },
    membership: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row = {
          id: data.id ?? randomUUID(),
          organizationId: data.organizationId,
          userId: data.userId,
          role: data.role,
          status: data.status ?? MembershipStatus.ACTIVE,
          suspendedAt: null,
          removedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        memberships.set(row.id, row);
        return hydrateMembership(row);
      },
      findFirst: async ({ where }: any) => {
        const match = [...memberships.values()].find((m) => {
          if (where.id && m.id !== where.id) return false;
          if (where.organizationId && m.organizationId !== where.organizationId) {
            return false;
          }
          if (where.userId && m.userId !== where.userId) return false;
          if (where.status && m.status !== where.status) return false;
          if (where.organization?.status) {
            const org = organizations.get(m.organizationId);
            if (!org || org.status !== where.organization.status) return false;
          }
          return true;
        });
        return match ? hydrateMembership(match) : null;
      },
    },
    site: {
      create: async ({ data }: any) => {
        const duplicate = [...sites.values()].find(
          (s) =>
            s.organizationId === data.organizationId && s.code === data.code,
        );
        if (duplicate) {
          throw { code: 'P2002', meta: { target: ['organizationId', 'code'] } };
        }
        const now = new Date(Date.now() + ++seq * 10);
        const row: MemSite = {
          id: randomUUID(),
          organizationId: data.organizationId,
          code: data.code,
          name: data.name,
          type: data.type,
          description: data.description ?? null,
          addressLine1: data.addressLine1 ?? null,
          addressLine2: data.addressLine2 ?? null,
          city: data.city ?? null,
          region: data.region ?? null,
          postalCode: data.postalCode ?? null,
          countryCode: data.countryCode ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          timeZone: data.timeZone ?? 'UTC',
          status: data.status ?? LocationStatus.ACTIVE,
          archivedAt: data.archivedAt ?? null,
          createdAt: now,
          updatedAt: now,
        };
        sites.set(row.id, row);
        return hydrateSite(row);
      },
      findFirst: async ({ where }: any) => {
        const match = [...sites.values()].find((s) =>
          matchesWhereClause(s, where),
        );
        return match ? hydrateSite(match) : null;
      },
      findMany: async ({ where, orderBy, take }: any) => {
        let rows = [...sites.values()].filter((s) =>
          matchesWhereClause(s, where),
        );
        if (Array.isArray(orderBy)) {
          rows.sort((a: any, b: any) => {
            for (const clause of orderBy) {
              const [field, dir] = Object.entries(clause)[0];
              const cmp = compareValues(a[field], b[field]);
              if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
            }
            return 0;
          });
        }
        if (typeof take === 'number') {
          rows = rows.slice(0, take);
        }
        return rows.map(hydrateSite);
      },
      update: async ({ where, data }: any) => {
        const id = where.id_organizationId?.id ?? where.id;
        const orgId = where.id_organizationId?.organizationId;
        const existing = sites.get(id);
        if (!existing || (orgId && existing.organizationId !== orgId)) {
          throw new Error('Site not found');
        }
        const updated: MemSite = {
          ...existing,
          ...data,
          updatedAt: new Date(Date.now() + ++seq * 10),
        };
        sites.set(id, updated);
        return hydrateSite(updated);
      },
    },
    building: {
      create: async ({ data }: any) => {
        const parentSite = sites.get(data.siteId);
        if (!parentSite || parentSite.organizationId !== data.organizationId) {
          throw { code: 'P2003' };
        }
        const duplicate = [...buildings.values()].find(
          (b) => b.siteId === data.siteId && b.code === data.code,
        );
        if (duplicate) {
          throw { code: 'P2002', meta: { target: ['siteId', 'code'] } };
        }
        const now = new Date(Date.now() + ++seq * 10);
        const row: MemBuilding = {
          id: randomUUID(),
          organizationId: data.organizationId,
          siteId: data.siteId,
          code: data.code,
          name: data.name,
          type: data.type,
          description: data.description ?? null,
          floorCount: data.floorCount ?? null,
          grossAreaSqM: data.grossAreaSqM ?? null,
          status: data.status ?? LocationStatus.ACTIVE,
          archivedAt: data.archivedAt ?? null,
          createdAt: now,
          updatedAt: now,
        };
        buildings.set(row.id, row);
        return hydrateBuilding(row);
      },
      findFirst: async ({ where }: any) => {
        const match = [...buildings.values()].find((b) =>
          matchesWhereClause(b, where),
        );
        return match ? hydrateBuilding(match) : null;
      },
      findMany: async ({ where, orderBy, take }: any) => {
        let rows = [...buildings.values()].filter((b) =>
          matchesWhereClause(b, where),
        );
        if (Array.isArray(orderBy)) {
          rows.sort((a: any, b: any) => {
            for (const clause of orderBy) {
              const [field, dir] = Object.entries(clause)[0];
              const cmp = compareValues(a[field], b[field]);
              if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
            }
            return 0;
          });
        }
        if (typeof take === 'number') {
          rows = rows.slice(0, take);
        }
        return rows.map(hydrateBuilding);
      },
      update: async ({ where, data }: any) => {
        const id = where.id_siteId_organizationId?.id ?? where.id;
        const siteId = where.id_siteId_organizationId?.siteId;
        const orgId = where.id_siteId_organizationId?.organizationId;
        const existing = buildings.get(id);
        if (
          !existing ||
          (siteId && existing.siteId !== siteId) ||
          (orgId && existing.organizationId !== orgId)
        ) {
          throw new Error('Building not found');
        }
        const updated: MemBuilding = {
          ...existing,
          ...data,
          updatedAt: new Date(Date.now() + ++seq * 10),
        };
        buildings.set(id, updated);
        return hydrateBuilding(updated);
      },
      count: async ({ where }: any) =>
        [...buildings.values()].filter((b) => matchesWhereClause(b, where))
          .length,
    },
    auditLog: {
      create: async ({ data }: any) => {
        const row = { id: randomUUID(), occurredAt: new Date(), ...data };
        auditLogs.push(row);
        return row;
      },
    },
    emailVerificationToken: {
      create: vi.fn().mockResolvedValue({ id: randomUUID() }),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    _store: {
      users,
      sessions,
      organizations,
      memberships,
      sites,
      buildings,
      auditLogs,
    },
  };

  return client;
}

function extractCookies(setCookieHeader: string[] | string | undefined): {
  header: string;
  csrf: string;
} {
  const list = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : setCookieHeader
      ? [setCookieHeader]
      : [];
  const pairs: string[] = [];
  let csrf = '';
  for (const raw of list) {
    const first = raw.split(';')[0];
    pairs.push(first);
    if (first.startsWith('ga_csrf=')) {
      csrf = decodeURIComponent(first.slice('ga_csrf='.length));
    }
  }
  return { header: pairs.join('; '), csrf };
}

describe('Phase 5.4 Sites & Buildings Management (E2E)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createLocationsInMemoryPrisma>;

  beforeEach(async () => {
    prisma = createLocationsInMemoryPrisma();
    const redisMock = {
      isHealthy: vi.fn().mockResolvedValue(true),
      client: {
        status: 'ready',
        eval: vi.fn().mockResolvedValue([1, 1, 900]),
        publish: vi.fn().mockResolvedValue(1),
      },
    };
    const mailerMock = {
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    };
    const mqttMock = {
      isConnected: vi.fn().mockReturnValue(true),
      isHealthy: vi.fn().mockReturnValue(true),
      subscribe: vi.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(RedisService)
      .useValue(redisMock)
      .overrideProvider(MAILER_PORT)
      .useValue(mailerMock)
      .overrideProvider(MqttService)
      .useValue(mqttMock)
      .compile();

    app = moduleFixture.createNestApplication({ bufferLogs: true });
    app.useLogger(app.get(AppLogger));
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  async function registerActiveUserAndLogin(email: string, displayName: string) {
    const password = 'Correct Horse Battery Staple 42!';
    const csrfRes = await request(app.getHttpServer()).get('/api/v1/auth/csrf');
    expect(csrfRes.status).toBe(200);
    const bootstrapCookies = extractCookies(csrfRes.headers['set-cookie']);

    const reg = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .set('Cookie', bootstrapCookies.header)
      .set('X-CSRF-Token', bootstrapCookies.csrf)
      .send({ email, displayName, password });
    expect(reg.status).toBe(201);

    const userId = reg.body.data.user.id as string;
    const storedUser = prisma._store.users.get(userId);
    storedUser.status = UserStatus.ACTIVE;
    storedUser.emailVerifiedAt = new Date();

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Cookie', bootstrapCookies.header)
      .set('X-CSRF-Token', bootstrapCookies.csrf)
      .send({ email, password });
    expect(login.status).toBe(200);

    const cookies = extractCookies(login.headers['set-cookie']);
    return { userId, ...cookies };
  }

  it('executes complete Factory & Commercial Property workflows, lifecycle transitions, archive-blocker, and all 12 atomic audit events', async () => {
    const orgA = await prisma.organization.create({
      data: { name: 'Alpha Industries', slug: 'alpha-industries' },
    });
    const owner = await registerActiveUserAndLogin(
      'owner@alpha.test',
      'Alpha Owner',
    );
    const fm = await registerActiveUserAndLogin('fm@alpha.test', 'Alpha FM');
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: owner.userId,
        role: MembershipRole.OWNER,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: fm.userId,
        role: MembershipRole.FACILITY_MANAGER,
      },
    });

    // 1. Create Factory Site with lowercase code -> normalized to uppercase
    const createSiteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        code: '  cai-plant-01  ',
        name: 'Cairo Manufacturing Plant',
        type: SiteType.FACTORY,
        city: 'Cairo',
        countryCode: 'eg',
        latitude: 30.0444,
        longitude: 31.2357,
        timeZone: 'Africa/Cairo',
      });
    expect(createSiteRes.status).toBe(201);
    const site1 = createSiteRes.body.data;
    expect(site1.code).toBe('CAI-PLANT-01');
    expect(site1.countryCode).toBe('EG');
    expect(site1.status).toBe(LocationStatus.ACTIVE);
    expect(site1.buildingCount).toBe(0);

    // Duplicate site code in same org -> 409 SITE_CODE_ALREADY_EXISTS (no audit emitted)
    const auditBeforeDup = prisma._store.auditLogs.length;
    const dupSiteRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf)
      .send({
        code: 'CAI-PLANT-01',
        name: 'Duplicate Plant',
        type: SiteType.FACTORY,
      });
    expect(dupSiteRes.status).toBe(409);
    expect(dupSiteRes.body.code).toBe(ErrorCode.SITE_CODE_ALREADY_EXISTS);
    expect(prisma._store.auditLogs.length).toBe(auditBeforeDup);

    // Create second Commercial Property site
    const createSite2Res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf)
      .send({
        code: 'cai-park-02',
        name: 'Cairo Business Park',
        type: SiteType.COMMERCIAL_COMPLEX,
        timeZone: 'Africa/Cairo',
      });
    expect(createSite2Res.status).toBe(201);
    const site2 = createSite2Res.body.data;

    // 2. Add Buildings under Site 1 & reuse same building code under Site 2
    const createB1 = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings`)
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf)
      .send({
        code: 'prod-hall-01',
        name: 'Production Hall 1',
        type: BuildingType.PRODUCTION,
        floorCount: 2,
        grossAreaSqM: '4200.5',
      });
    expect(createB1.status).toBe(201);
    const b1 = createB1.body.data;
    expect(b1.code).toBe('PROD-HALL-01');
    expect(b1.grossAreaSqM).toBe('4200.50');

    // Same building code under different site in same org succeeds
    const createB2InSite2 = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site2.id}/buildings`)
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf)
      .send({
        code: 'prod-hall-01',
        name: 'Tower A',
        type: BuildingType.OFFICE,
      });
    expect(createB2InSite2.status).toBe(201);

    // Wrong-site building lookup returns concealed 404 BUILDING_NOT_FOUND
    const wrongSiteLookup = await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${createB2InSite2.body.data.id}`,
      )
      .set('Cookie', owner.header);
    expect(wrongSiteLookup.status).toBe(404);
    expect(wrongSiteLookup.body.code).toBe(ErrorCode.BUILDING_NOT_FOUND);

    // Parent site buildingCount reflects non-archived building
    const site1Detail = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/sites/${site1.id}`)
      .set('Cookie', owner.header);
    expect(site1Detail.status).toBe(200);
    expect(site1Detail.body.data.buildingCount).toBe(1);

    // 3. Update site & building metadata
    const updateSite = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgA.id}/sites/${site1.id}`)
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf)
      .send({ name: 'Cairo Manufacturing Plant Main' });
    expect(updateSite.status).toBe(200);
    expect(updateSite.body.data.name).toBe('Cairo Manufacturing Plant Main');

    const updateBuilding = await request(app.getHttpServer())
      .patch(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}`,
      )
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf)
      .send({ floorCount: 3, grossAreaSqM: '4500' });
    expect(updateBuilding.status).toBe(200);
    expect(updateBuilding.body.data.floorCount).toBe(3);
    expect(updateBuilding.body.data.grossAreaSqM).toBe('4500.00');

    // 4. Site deactivation leaves child buildings unchanged, blocks creating buildings (SITE_INACTIVE)
    const deactivateSite = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/deactivate`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(deactivateSite.status).toBe(200);
    expect(deactivateSite.body.data.status).toBe(LocationStatus.INACTIVE);

    const b1AfterSiteDeactivate = await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}`,
      )
      .set('Cookie', owner.header);
    expect(b1AfterSiteDeactivate.status).toBe(200);
    expect(b1AfterSiteDeactivate.body.data.status).toBe(LocationStatus.ACTIVE);

    const createUnderInactive = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        code: 'UTIL-01',
        name: 'Utilities Building',
        type: BuildingType.UTILITY,
      });
    expect(createUnderInactive.status).toBe(409);
    expect(createUnderInactive.body.code).toBe(ErrorCode.SITE_INACTIVE);

    // Activate site back to ACTIVE
    const activateSite = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/activate`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(activateSite.status).toBe(200);
    expect(activateSite.body.data.status).toBe(LocationStatus.ACTIVE);

    // Building deactivate & activate
    const deactivateB1 = await request(app.getHttpServer())
      .post(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}/deactivate`,
      )
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf);
    expect(deactivateB1.status).toBe(200);
    expect(deactivateB1.body.data.status).toBe(LocationStatus.INACTIVE);

    const activateB1 = await request(app.getHttpServer())
      .post(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}/activate`,
      )
      .set('Cookie', fm.header)
      .set('X-CSRF-Token', fm.csrf);
    expect(activateB1.status).toBe(200);
    expect(activateB1.body.data.status).toBe(LocationStatus.ACTIVE);

    // 5. Archiving site while building is non-archived -> 409 SITE_HAS_ACTIVE_BUILDINGS
    const blockedArchive = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/archive`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(blockedArchive.status).toBe(409);
    expect(blockedArchive.body.code).toBe(ErrorCode.SITE_HAS_ACTIVE_BUILDINGS);

    // Archive building first, then archive site
    const archiveB1 = await request(app.getHttpServer())
      .post(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}/archive`,
      )
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(archiveB1.status).toBe(200);
    expect(archiveB1.body.data.archivedAt).not.toBeNull();

    const archiveSite = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/archive`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(archiveSite.status).toBe(200);
    expect(archiveSite.body.data.archivedAt).not.toBeNull();

    // Archived site excluded from default list, visible with includeArchived=true
    const defaultList = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', owner.header);
    expect(defaultList.status).toBe(200);
    expect(defaultList.body.data.map((s: any) => s.id)).not.toContain(site1.id);

    const archivedList = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/sites?includeArchived=true`)
      .set('Cookie', owner.header);
    expect(archivedList.status).toBe(200);
    expect(archivedList.body.data.map((s: any) => s.id)).toContain(site1.id);

    // Archived site code remains reserved (cannot reuse)
    const reuseCodeRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        code: 'CAI-PLANT-01',
        name: 'Reused Code Attempt',
        type: SiteType.FACTORY,
      });
    expect(reuseCodeRes.status).toBe(409);
    expect(reuseCodeRes.body.code).toBe(ErrorCode.SITE_CODE_ALREADY_EXISTS);

    // Restoring building while parent site is archived -> 409 SITE_ARCHIVED
    const restoreB1WhileSiteArchived = await request(app.getHttpServer())
      .post(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}/restore`,
      )
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(restoreB1WhileSiteArchived.status).toBe(409);
    expect(restoreB1WhileSiteArchived.body.code).toBe(ErrorCode.SITE_ARCHIVED);

    // Restore site, then restore building
    const restoreSite = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${site1.id}/restore`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(restoreSite.status).toBe(200);
    expect(restoreSite.body.data.archivedAt).toBeNull();

    const restoreB1 = await request(app.getHttpServer())
      .post(
        `/api/v1/organizations/${orgA.id}/sites/${site1.id}/buildings/${b1.id}/restore`,
      )
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(restoreB1.status).toBe(200);
    expect(restoreB1.body.data.archivedAt).toBeNull();

    // Verify all 12 Phase 5.4 audit actions recorded cleanly without secrets
    const actions = new Set(
      prisma._store.auditLogs.map((a: any) => String(a.action)),
    );
    for (const expectedAction of [
      'SITE_CREATED',
      'SITE_UPDATED',
      'SITE_ACTIVATED',
      'SITE_DEACTIVATED',
      'SITE_ARCHIVED',
      'SITE_RESTORED',
      'BUILDING_CREATED',
      'BUILDING_UPDATED',
      'BUILDING_ACTIVATED',
      'BUILDING_DEACTIVATED',
      'BUILDING_ARCHIVED',
      'BUILDING_RESTORED',
    ]) {
      expect(actions.has(expectedAction), `Missing ${expectedAction}`).toBe(
        true,
      );
    }
    const serialized = JSON.stringify(prisma._store.auditLogs);
    expect(serialized).not.toContain('Correct Horse Battery Staple');
    expect(serialized).not.toContain(owner.csrf);
  });

  it('enforces 2-organization cross-tenant isolation, 5-role RBAC matrix, foreign cursor rejection, and suspended membership fail-closed', async () => {
    const orgA = await prisma.organization.create({
      data: { name: 'Org A', slug: 'org-a' },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Org B', slug: 'org-b' },
    });
    const suspendedOrg = await prisma.organization.create({
      data: {
        name: 'Suspended Org',
        slug: 'suspended-org',
        status: OrganizationStatus.SUSPENDED,
      },
    });

    const ownerA = await registerActiveUserAndLogin('ownerA@test.io', 'Owner A');
    const ownerB = await registerActiveUserAndLogin('ownerB@test.io', 'Owner B');
    const engineerA = await registerActiveUserAndLogin('engA@test.io', 'Eng A');
    const techA = await registerActiveUserAndLogin('techA@test.io', 'Tech A');
    const viewerA = await registerActiveUserAndLogin('viewA@test.io', 'View A');
    const suspendedUser = await registerActiveUserAndLogin(
      'suspA@test.io',
      'Suspended Member',
    );
    const outsider = await registerActiveUserAndLogin(
      'outsider@test.io',
      'Outsider',
    );

    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: ownerA.userId,
        role: MembershipRole.OWNER,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgB.id,
        userId: ownerB.userId,
        role: MembershipRole.OWNER,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: suspendedOrg.id,
        userId: ownerA.userId,
        role: MembershipRole.OWNER,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: engineerA.userId,
        role: MembershipRole.ENGINEER,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: techA.userId,
        role: MembershipRole.TECHNICIAN,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: viewerA.userId,
        role: MembershipRole.VIEWER,
      },
    });
    await prisma.membership.create({
      data: {
        organizationId: orgA.id,
        userId: suspendedUser.userId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.SUSPENDED,
      },
    });

    // Seed Org A and Org B with sites & buildings (same code allowed across orgs)
    const siteA = (
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgA.id}/sites`)
        .set('Cookie', ownerA.header)
        .set('X-CSRF-Token', ownerA.csrf)
        .send({ code: 'SHARED-01', name: 'Org A Site 1', type: SiteType.FACTORY })
    ).body.data;
    const siteB1 = (
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgB.id}/sites`)
        .set('Cookie', ownerB.header)
        .set('X-CSRF-Token', ownerB.csrf)
        .send({ code: 'SHARED-01', name: 'Org B Site 1', type: SiteType.FACTORY })
    ).body.data;
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgB.id}/sites`)
      .set('Cookie', ownerB.header)
      .set('X-CSRF-Token', ownerB.csrf)
      .send({ code: 'B-SITE-02', name: 'Org B Site 2', type: SiteType.CAMPUS });
    const buildingB = (
      await request(app.getHttpServer())
        .post(`/api/v1/organizations/${orgB.id}/sites/${siteB1.id}/buildings`)
        .set('Cookie', ownerB.header)
        .set('X-CSRF-Token', ownerB.csrf)
        .send({ code: 'BLD-01', name: 'Org B Hall', type: BuildingType.OFFICE })
    ).body.data;

    // 1. Unauthenticated -> 401
    expect(
      (
        await request(app.getHttpServer()).get(
          `/api/v1/organizations/${orgA.id}/sites`,
        )
      ).status,
    ).toBe(401);

    // 2. Non-member -> concealed 404
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/organizations/${orgA.id}/sites`)
          .set('Cookie', outsider.header)
      ).status,
    ).toBe(404);

    // 3. Suspended membership -> concealed 404
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/organizations/${orgA.id}/sites`)
          .set('Cookie', suspendedUser.header)
      ).status,
    ).toBe(404);

    // 4. Suspended org -> concealed 404
    expect(
      (
        await request(app.getHttpServer())
          .get(`/api/v1/organizations/${suspendedOrg.id}/sites`)
          .set('Cookie', ownerA.header)
      ).status,
    ).toBe(404);

    // 5. Cross-tenant site/building probes by Org A Owner using Org B IDs -> concealed 404
    const probeSiteB = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/sites/${siteB1.id}`)
      .set('Cookie', ownerA.header);
    expect(probeSiteB.status).toBe(404);
    expect(probeSiteB.body.code).toBe(ErrorCode.SITE_NOT_FOUND);

    const probeCreateBuildingUnderSiteB = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites/${siteB1.id}/buildings`)
      .set('Cookie', ownerA.header)
      .set('X-CSRF-Token', ownerA.csrf)
      .send({ code: 'X-01', name: 'Cross Tenant', type: BuildingType.OFFICE });
    expect(probeCreateBuildingUnderSiteB.status).toBe(404);
    expect(probeCreateBuildingUnderSiteB.body.code).toBe(
      ErrorCode.SITE_NOT_FOUND,
    );

    const probeBuildingB = await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${orgA.id}/sites/${siteA.id}/buildings/${buildingB.id}`,
      )
      .set('Cookie', ownerA.header);
    expect(probeBuildingB.status).toBe(404);
    expect(probeBuildingB.body.code).toBe(ErrorCode.BUILDING_NOT_FOUND);

    // 6. Cross-tenant pagination cursor rejected with 400 VALIDATION_ERROR
    const orgBPage1 = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.id}/sites?limit=1`)
      .set('Cookie', ownerB.header);
    expect(orgBPage1.status).toBe(200);
    const foreignCursor = orgBPage1.body.meta.pagination.nextCursor as string;
    expect(foreignCursor).toBeTruthy();

    const foreignCursorProbe = await request(app.getHttpServer())
      .get(
        `/api/v1/organizations/${orgA.id}/sites?limit=1&cursor=${encodeURIComponent(foreignCursor)}`,
      )
      .set('Cookie', ownerA.header);
    expect(foreignCursorProbe.status).toBe(400);
    expect(foreignCursorProbe.body.code).toBe(ErrorCode.VALIDATION_ERROR);

    // 7. Read-only roles (Engineer, Technician, Viewer): GET allowed, mutations & includeArchived=true denied (403)
    for (const actor of [engineerA, techA, viewerA]) {
      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/v1/organizations/${orgA.id}/sites`)
            .set('Cookie', actor.header)
        ).status,
      ).toBe(200);

      expect(
        (
          await request(app.getHttpServer())
            .get(`/api/v1/organizations/${orgA.id}/sites?includeArchived=true`)
            .set('Cookie', actor.header)
        ).status,
      ).toBe(403);

      expect(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/organizations/${orgA.id}/sites`)
            .set('Cookie', actor.header)
            .set('X-CSRF-Token', actor.csrf)
            .send({ code: 'DENY-01', name: 'Denied', type: SiteType.FACTORY })
        ).status,
      ).toBe(403);

      expect(
        (
          await request(app.getHttpServer())
            .post(`/api/v1/organizations/${orgA.id}/sites/${siteA.id}/archive`)
            .set('Cookie', actor.header)
            .set('X-CSRF-Token', actor.csrf)
        ).status,
      ).toBe(403);
    }

    // 8. Body spoofing / immutable code / partial coordinate pair rejected with 400
    const spoofOrgId = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', ownerA.header)
      .set('X-CSRF-Token', ownerA.csrf)
      .send({
        code: 'SPOOF-01',
        name: 'Spoof Site',
        type: SiteType.FACTORY,
        organizationId: orgB.id,
      });
    expect(spoofOrgId.status).toBe(400);

    const mutateImmutableCode = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgA.id}/sites/${siteA.id}`)
      .set('Cookie', ownerA.header)
      .set('X-CSRF-Token', ownerA.csrf)
      .send({ code: 'NEW-CODE' });
    expect(mutateImmutableCode.status).toBe(400);

    const partialCoords = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/sites`)
      .set('Cookie', ownerA.header)
      .set('X-CSRF-Token', ownerA.csrf)
      .send({
        code: 'COORD-01',
        name: 'Bad Coords',
        type: SiteType.FACTORY,
        latitude: 30.0,
      });
    expect(partialCoords.status).toBe(400);
  });

  it('serializes concurrent duplicate-code creation and concurrent archiveSite vs createBuilding safely', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Race Org', slug: 'race-org' },
    });
    const owner = await registerActiveUserAndLogin('race@test.io', 'Race Owner');
    await prisma.membership.create({
      data: {
        organizationId: org.id,
        userId: owner.userId,
        role: MembershipRole.OWNER,
      },
    });

    // Concurrent duplicate site codes
    const [s1, s2] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/sites`)
        .set('Cookie', owner.header)
        .set('X-CSRF-Token', owner.csrf)
        .send({ code: 'RACE-01', name: 'Race Site A', type: SiteType.FACTORY }),
      request(app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/sites`)
        .set('Cookie', owner.header)
        .set('X-CSRF-Token', owner.csrf)
        .send({ code: 'race-01', name: 'Race Site B', type: SiteType.FACTORY }),
    ]);
    expect([s1.status, s2.status].sort((a, b) => a - b)).toEqual([201, 409]);
    const createdSite = s1.status === 201 ? s1.body.data : s2.body.data;

    // Concurrent archiveSite vs createBuilding on the same empty site:
    // FOR UPDATE lock serializes them so we NEVER get both an archived site AND a non-archived building.
    const [archiveRes, createBldRes] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/sites/${createdSite.id}/archive`)
        .set('Cookie', owner.header)
        .set('X-CSRF-Token', owner.csrf),
      request(app.getHttpServer())
        .post(
          `/api/v1/organizations/${org.id}/sites/${createdSite.id}/buildings`,
        )
        .set('Cookie', owner.header)
        .set('X-CSRF-Token', owner.csrf)
        .send({
          code: 'RACE-BLD-01',
          name: 'Race Building',
          type: BuildingType.WAREHOUSE,
        }),
    ]);

    const finalSite = prisma._store.sites.get(createdSite.id)!;
    const nonArchivedBuildings = [...prisma._store.buildings.values()].filter(
      (b) => b.siteId === createdSite.id && b.archivedAt === null,
    );

    // Exactly one wins and the other gets 409 conflict
    const pair = [archiveRes.status, createBldRes.status].sort((a, b) => a - b);
    expect(pair === undefined).toBe(false);
    expect([
      [200, 409],
      [201, 409],
    ]).toContainEqual(pair);
    if (finalSite.archivedAt !== null) {
      expect(nonArchivedBuildings).toHaveLength(0);
    } else {
      expect(nonArchivedBuildings).toHaveLength(1);
    }
  });
});
