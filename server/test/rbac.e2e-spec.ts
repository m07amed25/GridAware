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
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
} from '../src/generated/prisma/enums.js';
import { AppLogger } from '../src/logging/app-logger.service.js';
import { MAILER_PORT } from '../src/mail/mailer.port.js';
import { MqttService } from '../src/mqtt/mqtt.service.js';
import { RedisService } from '../src/redis/redis.service.js';

interface MemOrganization {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

interface MemMembership {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  suspendedAt: Date | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function createRbacInMemoryPrisma() {
  const users = new Map<string, any>();
  const sessions = new Map<string, any>();
  const organizations = new Map<string, MemOrganization>();
  const memberships = new Map<string, MemMembership>();
  const auditLogs: any[] = [];

  // Per-organization async mutex simulating PostgreSQL `SELECT ... FOR UPDATE`
  const orgLocks = new Map<string, Promise<void>>();

  async function withOrgLock<T>(
    orgId: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const previous = orgLocks.get(orgId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((resolve) => {
      release = resolve;
    });
    orgLocks.set(orgId, previous.then(() => next));
    await previous;
    try {
      return await fn();
    } finally {
      release();
    }
  }

  function hydrateMembership(m: MemMembership) {
    return {
      ...m,
      organization: organizations.get(m.organizationId),
      user: users.get(m.userId),
    };
  }

  const client: any = {
    isHealthy: vi.fn().mockResolvedValue(true),
    $transaction: async (fn: (tx: any) => Promise<any>) => {
      let lockedOrgId: string | null = null;
      let releaseLock: (() => void) | null = null;

      const tx: any = {
        ...client,
        $queryRaw: async (_strings: TemplateStringsArray, orgId: string) => {
          lockedOrgId = orgId;
          const previous = orgLocks.get(orgId) ?? Promise.resolve();
          const current = new Promise<void>((resolve) => {
            releaseLock = resolve;
          });
          orgLocks.set(orgId, previous.then(() => current));
          await previous;
          // Yield a microtask so concurrent transactions truly contend on the lock.
          await Promise.resolve();
          return [{ id: orgId }];
        },
      };

      try {
        return await fn(tx);
      } finally {
        if (lockedOrgId && releaseLock) {
          (releaseLock as () => void)();
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
        const row: MemOrganization = {
          id: data.id ?? randomUUID(),
          name: data.name,
          slug: data.slug,
          status: data.status ?? OrganizationStatus.ACTIVE,
          timezone: data.timezone ?? 'UTC',
          createdAt: now,
          updatedAt: now,
        };
        organizations.set(row.id, row);
        const createdMemberships: MemMembership[] = [];
        if (data.memberships?.create) {
          const m = data.memberships.create;
          const memRow: MemMembership = {
            id: randomUUID(),
            organizationId: row.id,
            userId: m.userId,
            role: m.role,
            status: m.status ?? MembershipStatus.ACTIVE,
            suspendedAt: null,
            removedAt: null,
            createdAt: now,
            updatedAt: now,
          };
          memberships.set(memRow.id, memRow);
          createdMemberships.push(memRow);
        }
        return { ...row, memberships: createdMemberships };
      },
      findUnique: async ({ where }: any) => {
        if (where.id) return organizations.get(where.id) ?? null;
        if (where.slug) {
          return (
            [...organizations.values()].find((o) => o.slug === where.slug) ??
            null
          );
        }
        return null;
      },
      update: async ({ where, data }: any) => {
        const existing = organizations.get(where.id);
        if (!existing) throw new Error('Org not found');
        const updated = { ...existing, ...data, updatedAt: new Date() };
        organizations.set(where.id, updated);
        return updated;
      },
    },
    membership: {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: MemMembership = {
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
      findMany: async ({ where, take, cursor, skip }: any) => {
        let rows = [...memberships.values()].filter((m) => {
          if (where?.organizationId && m.organizationId !== where.organizationId) {
            return false;
          }
          if (where?.userId && m.userId !== where.userId) return false;
          if (where?.status && m.status !== where.status) return false;
          if (where?.role && m.role !== where.role) return false;
          if (where?.organization?.status) {
            const org = organizations.get(m.organizationId);
            if (!org || org.status !== where.organization.status) return false;
          }
          return true;
        });

        rows.sort(
          (a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime() ||
            a.id.localeCompare(b.id),
        );

        if (cursor?.id) {
          const idx = rows.findIndex((r) => r.id === cursor.id);
          rows = idx === -1 ? [] : rows.slice(idx + (skip ?? 0));
        }
        if (typeof take === 'number') {
          rows = rows.slice(0, take);
        }
        return rows.map(hydrateMembership);
      },
      count: async ({ where }: any) =>
        [...memberships.values()].filter((m) => {
          if (where.organizationId && m.organizationId !== where.organizationId) {
            return false;
          }
          if (where.role && m.role !== where.role) return false;
          if (where.status && m.status !== where.status) return false;
          return true;
        }).length,
      update: async ({ where, data }: any) => {
        const id = where.organizationId_id?.id ?? where.id;
        const orgId = where.organizationId_id?.organizationId;
        const existing = memberships.get(id);
        if (!existing || (orgId && existing.organizationId !== orgId)) {
          throw new Error('Record not found');
        }
        const updated: MemMembership = {
          ...existing,
          ...data,
          updatedAt: new Date(),
        };
        memberships.set(id, updated);
        return hydrateMembership(updated);
      },
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
      auditLogs,
      withOrgLock,
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

describe('Phase 5.3 RBAC & Permission Management (E2E)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createRbacInMemoryPrisma>;

  beforeEach(async () => {
    prisma = createRbacInMemoryPrisma();
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

  it('enforces 5-role access-context matrix, OWNER-only member administration, and strict 404 cross-tenant isolation', async () => {
    const orgA = await prisma.organization.create({
      data: { name: 'Alpha Plant', slug: 'alpha-plant' },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Beta Towers', slug: 'beta-towers' },
    });
    const suspendedOrg = await prisma.organization.create({
      data: {
        name: 'Suspended Org',
        slug: 'suspended-org',
        status: OrganizationStatus.SUSPENDED,
      },
    });

    const owner = await registerActiveUserAndLogin('owner@grid.test', 'Org Owner');
    const fm = await registerActiveUserAndLogin('fm@grid.test', 'Facility Mgr');
    const engineer = await registerActiveUserAndLogin('eng@grid.test', 'Maint Eng');
    const tech = await registerActiveUserAndLogin('tech@grid.test', 'Field Tech');
    const viewer = await registerActiveUserAndLogin('viewer@grid.test', 'Read Viewer');

    await prisma.membership.create({
      data: { organizationId: orgA.id, userId: owner.userId, role: MembershipRole.OWNER },
    });
    const fmMem = await prisma.membership.create({
      data: { organizationId: orgA.id, userId: fm.userId, role: MembershipRole.FACILITY_MANAGER },
    });
    await prisma.membership.create({
      data: { organizationId: orgA.id, userId: engineer.userId, role: MembershipRole.ENGINEER },
    });
    await prisma.membership.create({
      data: { organizationId: orgA.id, userId: tech.userId, role: MembershipRole.TECHNICIAN },
    });
    const viewerMem = await prisma.membership.create({
      data: { organizationId: orgA.id, userId: viewer.userId, role: MembershipRole.VIEWER },
    });

    // Multi-org user: Owner in Org A is Viewer in Org B
    await prisma.membership.create({
      data: { organizationId: orgB.id, userId: owner.userId, role: MembershipRole.VIEWER },
    });
    const orgBMember = await prisma.membership.create({
      data: { organizationId: orgB.id, userId: viewer.userId, role: MembershipRole.OWNER },
    });
    await prisma.membership.create({
      data: { organizationId: suspendedOrg.id, userId: owner.userId, role: MembershipRole.OWNER },
    });

    // 1. Unauthenticated caller -> 401
    const unauth = await request(app.getHttpServer()).get(
      `/api/v1/organizations/${orgA.id}/access-context`,
    );
    expect(unauth.status).toBe(401);

    // 2. GET /organizations & GET /me return ONLY active memberships in active orgs
    const orgsRes = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Cookie', owner.header);
    expect(orgsRes.status).toBe(200);
    expect(
      orgsRes.body.data
        .map((o: any) => String(o.organizationId))
        .sort((a: string, b: string) => a.localeCompare(b)),
    ).toEqual([orgA.id, orgB.id].sort((a, b) => a.localeCompare(b)));

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Cookie', owner.header);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.memberships).toHaveLength(2);

    // 3. Suspended org -> strict concealed 404
    const suspRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${suspendedOrg.id}/access-context`)
      .set('Cookie', owner.header);
    expect(suspRes.status).toBe(404);
    expect(suspRes.body.code).toBe(ErrorCode.RESOURCE_NOT_FOUND);

    // 4. Unjoined org -> strict concealed 404
    const unjoinedRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.id}/access-context`)
      .set('Cookie', fm.header);
    expect(unjoinedRes.status).toBe(404);

    // 5. Same user has OWNER in Org A (members:read allowed) and VIEWER in Org B (members:read 403)
    const ownerOrgAMembers = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/members`)
      .set('Cookie', owner.header);
    expect(ownerOrgAMembers.status).toBe(200);
    expect(ownerOrgAMembers.body.data).toHaveLength(5);

    const ownerOrgBMembers = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgB.id}/members`)
      .set('Cookie', owner.header);
    expect(ownerOrgBMembers.status).toBe(403);
    expect(ownerOrgBMembers.body.code).toBe(ErrorCode.FORBIDDEN);

    // 6. All 4 non-owner roles in Org A receive 403 on GET /members, 200 on access-context
    for (const actor of [
      { ...fm, role: MembershipRole.FACILITY_MANAGER },
      { ...engineer, role: MembershipRole.ENGINEER },
      { ...tech, role: MembershipRole.TECHNICIAN },
      { ...viewer, role: MembershipRole.VIEWER },
    ]) {
      const ctxRes = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgA.id}/access-context`)
        .set('Cookie', actor.header);
      expect(ctxRes.status).toBe(200);
      expect(ctxRes.body.data.role).toBe(actor.role);
      expect(ctxRes.body.data.policyVersion).toBe('1');

      const membersDenied = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${orgA.id}/members`)
        .set('Cookie', actor.header);
      expect(membersDenied.status).toBe(403);
    }

    // 7. Cross-tenant membership ID probe under Org A -> concealed 404
    const crossTenantProbe = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/members/${orgBMember.id}`)
      .set('Cookie', owner.header);
    expect(crossTenantProbe.status).toBe(404);

    // 8. Immediate role downgrade takes effect without logout
    const downgrade = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgA.id}/members/${fmMem.id}/role`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf)
      .send({ role: MembershipRole.VIEWER });
    expect(downgrade.status).toBe(200);
    expect(downgrade.body.data.role).toBe(MembershipRole.VIEWER);

    const fmAfterDowngrade = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/access-context`)
      .set('Cookie', fm.header);
    expect(fmAfterDowngrade.status).toBe(200);
    expect(fmAfterDowngrade.body.data.role).toBe(MembershipRole.VIEWER);
    expect(fmAfterDowngrade.body.data.permissions).not.toContain('sites:create');

    // 9. Body spoofing rejected by strict schema
    const spoofAttempt = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgA.id}/members/${viewerMem.id}/role`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf)
      .send({
        role: MembershipRole.ENGINEER,
        organizationId: orgB.id,
      });
    expect(spoofAttempt.status).toBe(400);

    // 10. Suspension immediately blocks next request with concealed 404
    const suspendRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${orgA.id}/members/${viewerMem.id}/suspend`)
      .set('Cookie', owner.header)
      .set('X-CSRF-Token', owner.csrf);
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.status).toBe(MembershipStatus.SUSPENDED);

    const suspendedViewerCtx = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgA.id}/access-context`)
      .set('Cookie', viewer.header);
    expect(suspendedViewerCtx.status).toBe(404);

    // Audit log captured role change, suspension, and denials with zero secrets
    const actions = prisma._store.auditLogs.map((a: any) => a.action);
    expect(actions).toContain('AUTHZ_DENIED');
    expect(actions).toContain('MEMBERSHIP_ROLE_CHANGED');
    expect(actions).toContain('MEMBERSHIP_SUSPENDED');
    const serializedAudits = JSON.stringify(prisma._store.auditLogs);
    expect(serializedAudits).not.toContain('Correct Horse Battery Staple');
    expect(serializedAudits).not.toContain(owner.csrf);
  });

  it('prevents concurrent last-owner removal and executes atomic ownership transfer safely', async () => {
    const org = await prisma.organization.create({
      data: { name: 'Gamma Power', slug: 'gamma-power' },
    });

    const owner1 = await registerActiveUserAndLogin('owner1@grid.test', 'Owner One');
    const owner2 = await registerActiveUserAndLogin('owner2@grid.test', 'Owner Two');
    const engineer = await registerActiveUserAndLogin('eng2@grid.test', 'Target Eng');

    const owner1Mem = await prisma.membership.create({
      data: { organizationId: org.id, userId: owner1.userId, role: MembershipRole.OWNER },
    });
    const owner2Mem = await prisma.membership.create({
      data: { organizationId: org.id, userId: owner2.userId, role: MembershipRole.OWNER },
    });
    const engMem = await prisma.membership.create({
      data: { organizationId: org.id, userId: engineer.userId, role: MembershipRole.ENGINEER },
    });

    // Generic role update cannot grant OWNER (400 validation) or demote OWNER (409)
    const grantOwner = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.id}/members/${engMem.id}/role`)
      .set('Cookie', owner1.header)
      .set('X-CSRF-Token', owner1.csrf)
      .send({ role: MembershipRole.OWNER });
    expect(grantOwner.status).toBe(400);

    const demoteOwner = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${org.id}/members/${owner2Mem.id}/role`)
      .set('Cookie', owner1.header)
      .set('X-CSRF-Token', owner1.csrf)
      .send({ role: MembershipRole.VIEWER });
    expect(demoteOwner.status).toBe(409);

    // Concurrent removal of the last two active owners by an active owner:
    // PostgreSQL FOR UPDATE lock serializes them so exactly one succeeds (200)
    // and the second is rejected with 409 RESOURCE_CONFLICT (last-owner guard).
    const [res1, res2] = await Promise.all([
      request(app.getHttpServer())
        .delete(`/api/v1/organizations/${org.id}/members/${owner2Mem.id}`)
        .set('Cookie', owner1.header)
        .set('X-CSRF-Token', owner1.csrf),
      request(app.getHttpServer())
        .delete(`/api/v1/organizations/${org.id}/members/${owner1Mem.id}`)
        .set('Cookie', owner1.header)
        .set('X-CSRF-Token', owner1.csrf),
    ]);

    const statuses = [res1.status, res2.status].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);

    const remainingActiveOwners = await prisma.membership.count({
      where: {
        organizationId: org.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });
    expect(remainingActiveOwners).toBe(1);

    // Surviving owner executes atomic ownership transfer to Engineer
    const survivingOwner = res1.status === 200 ? owner1 : owner2;
    const transfer = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.id}/ownership-transfer`)
      .set('Cookie', survivingOwner.header)
      .set('X-CSRF-Token', survivingOwner.csrf)
      .send({
        targetMembershipId: engMem.id,
        confirmTransfer: true,
        previousOwnerNextRole: MembershipRole.FACILITY_MANAGER,
      });

    expect(transfer.status).toBe(200);
    expect(transfer.body.data.newOwnerMembership.role).toBe(MembershipRole.OWNER);
    expect(transfer.body.data.previousOwnerMembership.role).toBe(
      MembershipRole.FACILITY_MANAGER,
    );

    // Previous owner immediately loses members:read authority on next request
    const formerOwnerMembers = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.id}/members`)
      .set('Cookie', survivingOwner.header);
    expect(formerOwnerMembers.status).toBe(403);

    // New owner immediately gains members:read authority
    const newOwnerMembers = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.id}/members`)
      .set('Cookie', engineer.header);
    expect(newOwnerMembers.status).toBe(200);
  });

  it('creates an organization via POST /organizations, updates settings, and serves roles-matrix', async () => {
    const founder = await registerActiveUserAndLogin(
      'founder@grid.test',
      'Founder User',
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Cookie', founder.header)
      .set('X-CSRF-Token', founder.csrf)
      .send({
        name: 'Mohamed Reda Test',
        slug: 'mohamed-reda-test',
        timezone: 'Africa/Cairo',
      });

    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe(MembershipRole.OWNER);
    expect(created.body.data.slug).toBe('mohamed-reda-test');
    const orgId = created.body.data.organizationId as string;

    const updated = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${orgId}`)
      .set('Cookie', founder.header)
      .set('X-CSRF-Token', founder.csrf)
      .send({ name: 'Mohamed Reda Updated', timezone: 'UTC' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.name).toBe('Mohamed Reda Updated');

    const matrix = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${orgId}/roles-matrix`)
      .set('Cookie', founder.header);
    expect(matrix.status).toBe(200);
    expect(matrix.body.data.roles).toHaveLength(5);
  });
});
