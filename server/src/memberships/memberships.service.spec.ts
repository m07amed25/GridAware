import { describe, expect, it, vi } from 'vitest';
import type { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import type { WsAuthorizationService } from '../authorization/channels/ws-authorization.service.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import {
  MembershipRole,
  MembershipStatus,
} from '../generated/prisma/enums.js';
import type {
  MembershipsRepository,
  MemberWithUserRow,
} from './memberships.repository.js';
import { MembershipsService } from './memberships.service.js';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const OWNER_USER = 'aaaa1111-1111-4111-8111-111111111111';
const OWNER_MEM = 'bbbb1111-1111-4111-8111-111111111111';
const TARGET_USER = 'aaaa2222-2222-4222-8222-222222222222';
const TARGET_MEM = 'bbbb2222-2222-4222-8222-222222222222';

const ownerContext: OrganizationAuthorizationContext = {
  userId: OWNER_USER,
  organizationId: ORG_A,
  membershipId: OWNER_MEM,
  role: MembershipRole.OWNER,
  policyVersion: '1',
};

function makeMemberRow(
  overrides: Partial<MemberWithUserRow> = {},
): MemberWithUserRow {
  return {
    id: TARGET_MEM,
    organizationId: ORG_A,
    userId: TARGET_USER,
    role: MembershipRole.VIEWER,
    status: MembershipStatus.ACTIVE,
    suspendedAt: null,
    removedAt: null,
    createdAt: new Date('2026-11-27T10:00:00.000Z'),
    updatedAt: new Date('2026-11-27T10:00:00.000Z'),
    user: { email: 'member@example.com', displayName: 'Test Member' },
    ...overrides,
  };
}

describe('MembershipsService', () => {
  function setup() {
    const mocks = {
      runInTransaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({}),
      ),
      lockOrganizationForUpdate: vi.fn().mockResolvedValue(undefined),
      findByIdInOrganization: vi.fn(),
      countActiveOwners: vi.fn().mockResolvedValue(1),
      updateRole: vi.fn(),
      updateStatus: vi.fn(),
      findManyInOrganization: vi.fn(),
      auditRecord: vi.fn().mockResolvedValue(undefined),
      publishMembershipRevocation: vi.fn().mockResolvedValue(undefined),
    };

    const repository = {
      runInTransaction: mocks.runInTransaction,
      lockOrganizationForUpdate: mocks.lockOrganizationForUpdate,
      findByIdInOrganization: mocks.findByIdInOrganization,
      countActiveOwners: mocks.countActiveOwners,
      updateRole: mocks.updateRole,
      updateStatus: mocks.updateStatus,
      findManyInOrganization: mocks.findManyInOrganization,
    } as unknown as MembershipsRepository;

    const auditLogs = {
      record: mocks.auditRecord,
    } as unknown as AuditLogsService;

    const wsAuth = {
      publishMembershipRevocation: mocks.publishMembershipRevocation,
    } as unknown as WsAuthorizationService;

    return {
      service: new MembershipsService(repository, auditLogs, wsAuth),
      mocks,
    };
  }

  it('rejects inviting a user as OWNER', () => {
    const { service } = setup();
    expect(() => service.assertInvitableRole(MembershipRole.OWNER)).toThrowError(
      AppException,
    );
    expect(() =>
      service.assertInvitableRole(MembershipRole.ENGINEER),
    ).not.toThrow();
  });

  it('prevents self-role modification and generic OWNER grant/revoke', async () => {
    const { service, mocks } = setup();
    mocks.findByIdInOrganization.mockResolvedValueOnce(
      makeMemberRow({
        id: OWNER_MEM,
        userId: OWNER_USER,
        role: MembershipRole.OWNER,
      }),
    );

    await expect(
      service.updateMemberRole(ownerContext, OWNER_MEM, {
        role: MembershipRole.ENGINEER,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.FORBIDDEN });

    mocks.findByIdInOrganization.mockResolvedValueOnce(
      makeMemberRow({ role: MembershipRole.OWNER }),
    );
    await expect(
      service.updateMemberRole(ownerContext, TARGET_MEM, {
        role: MembershipRole.FACILITY_MANAGER,
      }),
    ).rejects.toMatchObject({ code: ErrorCode.STATE_TRANSITION_NOT_ALLOWED });
  });

  it('updates a non-owner role atomically, writes audit event, and notifies WS revocation', async () => {
    const { service, mocks } = setup();
    const target = makeMemberRow({ role: MembershipRole.VIEWER });
    const updated = makeMemberRow({ role: MembershipRole.ENGINEER });
    mocks.findByIdInOrganization.mockResolvedValue(target);
    mocks.updateRole.mockResolvedValue(updated);

    const res = await service.updateMemberRole(ownerContext, TARGET_MEM, {
      role: MembershipRole.ENGINEER,
    });

    expect(res.role).toBe(MembershipRole.ENGINEER);
    expect(mocks.lockOrganizationForUpdate).toHaveBeenCalledWith(
      expect.anything(),
      ORG_A,
    );
    expect(mocks.auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'MEMBERSHIP_ROLE_CHANGED',
        organizationId: ORG_A,
        actorMembershipId: OWNER_MEM,
        metadata: expect.objectContaining({
          previousRole: MembershipRole.VIEWER,
          newRole: MembershipRole.ENGINEER,
        }),
      }),
      expect.anything(),
    );
    expect(mocks.publishMembershipRevocation).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: ORG_A,
        userId: TARGET_USER,
        reason: 'ROLE_CHANGED',
      }),
    );
  });

  it('protects the last active OWNER against suspension and removal with 409 RESOURCE_CONFLICT', async () => {
    const { service, mocks } = setup();
    const soleOwner = makeMemberRow({
      id: OWNER_MEM,
      userId: OWNER_USER,
      role: MembershipRole.OWNER,
      status: MembershipStatus.ACTIVE,
    });
    mocks.findByIdInOrganization.mockResolvedValue(soleOwner);
    mocks.countActiveOwners.mockResolvedValue(1);

    await expect(
      service.suspendMember(ownerContext, OWNER_MEM),
    ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_CONFLICT });

    await expect(
      service.removeMember(ownerContext, OWNER_MEM),
    ).rejects.toMatchObject({ code: ErrorCode.RESOURCE_CONFLICT });
  });

  it('transfers ownership atomically without an ownerless intermediate state', async () => {
    const { service, mocks } = setup();
    const actorRow = makeMemberRow({
      id: OWNER_MEM,
      userId: OWNER_USER,
      role: MembershipRole.OWNER,
    });
    const targetRow = makeMemberRow({
      id: TARGET_MEM,
      userId: TARGET_USER,
      role: MembershipRole.ENGINEER,
    });

    mocks.findByIdInOrganization
      .mockResolvedValueOnce(actorRow)
      .mockResolvedValueOnce(targetRow);
    mocks.updateRole
      .mockResolvedValueOnce({ ...targetRow, role: MembershipRole.OWNER })
      .mockResolvedValueOnce({
        ...actorRow,
        role: MembershipRole.FACILITY_MANAGER,
      });

    const result = await service.transferOwnership(ownerContext, {
      targetMembershipId: TARGET_MEM,
      confirmTransfer: true,
      previousOwnerNextRole: MembershipRole.FACILITY_MANAGER,
    });

    expect(result.newOwnerMembership.role).toBe(MembershipRole.OWNER);
    expect(result.previousOwnerMembership.role).toBe(
      MembershipRole.FACILITY_MANAGER,
    );
    expect(mocks.auditRecord).toHaveBeenCalledTimes(2);
    expect(mocks.auditRecord).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ action: 'OWNERSHIP_TRANSFER_INITIATED' }),
      expect.anything(),
    );
    expect(mocks.auditRecord).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ action: 'OWNERSHIP_TRANSFER_COMPLETED' }),
      expect.anything(),
    );
  });
});
