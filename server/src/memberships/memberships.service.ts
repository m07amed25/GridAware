import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { WsAuthorizationService } from '../authorization/channels/ws-authorization.service.js';
import { AppException } from '../common/exceptions/app.exception.js';
import {
  MembershipRole,
  MembershipStatus,
} from '../generated/prisma/enums.js';
import type {
  AssignableNonOwnerRole,
  ListMembersQueryInput,
  TransferOwnershipInput,
  UpdateMemberRoleInput,
} from './dto/memberships.schemas.js';
import {
  MembershipsRepository,
  type MemberWithUserRow,
} from './memberships.repository.js';

export interface MemberSummary {
  membershipId: string;
  organizationId: string;
  userId: string;
  email: string;
  displayName: string;
  role: MembershipRole;
  status: MembershipStatus;
  suspendedAt: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnershipTransferResult {
  organizationId: string;
  newOwnerMembership: MemberSummary;
  previousOwnerMembership: MemberSummary;
}

function toMemberSummary(row: MemberWithUserRow): MemberSummary {
  return {
    membershipId: row.id,
    organizationId: row.organizationId,
    userId: row.userId,
    email: row.user.email,
    displayName: row.user.displayName,
    role: row.role,
    status: row.status,
    suspendedAt: row.suspendedAt ? row.suspendedAt.toISOString() : null,
    removedAt: row.removedAt ? row.removedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class MembershipsService {
  constructor(
    private readonly repository: MembershipsRepository,
    private readonly auditLogs: AuditLogsService,
    private readonly wsAuthorization: WsAuthorizationService,
  ) {}

  /**
   * Validates that an invited role is permitted for standard member invitations.
   * Ownership cannot be granted through invitations (Phase 5.3 §14.4).
   */
  assertInvitableRole(role: MembershipRole): asserts role is AssignableNonOwnerRole {
    if (role === MembershipRole.OWNER) {
      throw AppException.stateTransitionNotAllowed(
        'Cannot invite a user directly as OWNER. Use the dedicated ownership-transfer workflow.',
      );
    }
  }

  async listMembers(
    context: OrganizationAuthorizationContext,
    query: ListMembersQueryInput,
  ): Promise<{
    items: MemberSummary[];
    pagination: { nextCursor: string | null; hasMore: boolean; limit: number };
  }> {
    const result = await this.repository.findManyInOrganization({
      organizationId: context.organizationId,
      status: query.status,
      role: query.role,
      limit: query.limit,
      cursor: query.cursor,
    });

    return {
      items: result.items.map(toMemberSummary),
      pagination: {
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
        limit: query.limit,
      },
    };
  }

  async getMember(
    context: OrganizationAuthorizationContext,
    membershipId: string,
  ): Promise<MemberSummary> {
    const member = await this.repository.findByIdInOrganization(
      context.organizationId,
      membershipId,
    );
    if (!member) {
      throw AppException.notFound();
    }
    return toMemberSummary(member);
  }

  async updateMemberRole(
    context: OrganizationAuthorizationContext,
    membershipId: string,
    input: UpdateMemberRoleInput,
  ): Promise<MemberSummary> {
    if ((input.role as MembershipRole) === MembershipRole.OWNER) {
      throw AppException.stateTransitionNotAllowed(
        'Generic role updates cannot assign OWNER. Use the dedicated ownership-transfer workflow.',
      );
    }

    const updated = await this.repository.runInTransaction(async (tx) => {
      await this.repository.lockOrganizationForUpdate(
        tx,
        context.organizationId,
      );

      const target = await this.repository.findByIdInOrganization(
        context.organizationId,
        membershipId,
        tx,
      );
      if (!target) {
        throw AppException.notFound();
      }

      if (target.userId === context.userId) {
        throw AppException.forbidden(
          'You cannot change your own organization role.',
        );
      }

      if (target.status === MembershipStatus.REMOVED) {
        throw AppException.stateTransitionNotAllowed(
          'Cannot update the role of a removed membership.',
        );
      }

      if (target.role === MembershipRole.OWNER) {
        throw AppException.stateTransitionNotAllowed(
          'Cannot revoke OWNER through generic role updates. Use the dedicated ownership-transfer workflow.',
        );
      }

      const previousRole = target.role;
      const saved = await this.repository.updateRole(
        context.organizationId,
        target.id,
        input.role,
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'MEMBERSHIP_ROLE_CHANGED',
          entityType: 'Membership',
          entityId: saved.id,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            targetUserId: saved.userId,
            previousRole,
            newRole: saved.role,
          },
        },
        tx,
      );

      return saved;
    });

    await this.wsAuthorization.publishMembershipRevocation({
      organizationId: context.organizationId,
      userId: updated.userId,
      membershipId: updated.id,
      reason: 'ROLE_CHANGED',
    });

    return toMemberSummary(updated);
  }

  async suspendMember(
    context: OrganizationAuthorizationContext,
    membershipId: string,
  ): Promise<MemberSummary> {
    const updated = await this.repository.runInTransaction(async (tx) => {
      await this.repository.lockOrganizationForUpdate(
        tx,
        context.organizationId,
      );

      const target = await this.repository.findByIdInOrganization(
        context.organizationId,
        membershipId,
        tx,
      );
      if (!target) {
        throw AppException.notFound();
      }

      if (target.status !== MembershipStatus.ACTIVE) {
        throw AppException.stateTransitionNotAllowed(
          `Only ACTIVE memberships can be suspended (current status: ${target.status}).`,
        );
      }

      if (target.role === MembershipRole.OWNER) {
        const activeOwners = await this.repository.countActiveOwners(
          context.organizationId,
          tx,
        );
        if (activeOwners <= 1) {
          throw AppException.resourceConflict(
            'Cannot suspend the last active owner of an active organization.',
          );
        }
      }

      const saved = await this.repository.updateStatus(
        context.organizationId,
        target.id,
        {
          status: MembershipStatus.SUSPENDED,
          suspendedAt: new Date(),
        },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'MEMBERSHIP_SUSPENDED',
          entityType: 'Membership',
          entityId: saved.id,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            targetUserId: saved.userId,
            targetRole: saved.role,
          },
        },
        tx,
      );

      return saved;
    });

    await this.wsAuthorization.publishMembershipRevocation({
      organizationId: context.organizationId,
      userId: updated.userId,
      membershipId: updated.id,
      reason: 'MEMBERSHIP_SUSPENDED',
    });

    return toMemberSummary(updated);
  }

  async reactivateMember(
    context: OrganizationAuthorizationContext,
    membershipId: string,
  ): Promise<MemberSummary> {
    const updated = await this.repository.runInTransaction(async (tx) => {
      await this.repository.lockOrganizationForUpdate(
        tx,
        context.organizationId,
      );

      const target = await this.repository.findByIdInOrganization(
        context.organizationId,
        membershipId,
        tx,
      );
      if (!target) {
        throw AppException.notFound();
      }

      if (target.status !== MembershipStatus.SUSPENDED) {
        throw AppException.stateTransitionNotAllowed(
          `Only SUSPENDED memberships can be reactivated (current status: ${target.status}).`,
        );
      }

      const saved = await this.repository.updateStatus(
        context.organizationId,
        target.id,
        {
          status: MembershipStatus.ACTIVE,
          suspendedAt: null,
        },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'MEMBERSHIP_REACTIVATED',
          entityType: 'Membership',
          entityId: saved.id,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            targetUserId: saved.userId,
            targetRole: saved.role,
          },
        },
        tx,
      );

      return saved;
    });

    return toMemberSummary(updated);
  }

  async removeMember(
    context: OrganizationAuthorizationContext,
    membershipId: string,
  ): Promise<MemberSummary> {
    const updated = await this.repository.runInTransaction(async (tx) => {
      await this.repository.lockOrganizationForUpdate(
        tx,
        context.organizationId,
      );

      const target = await this.repository.findByIdInOrganization(
        context.organizationId,
        membershipId,
        tx,
      );
      if (!target) {
        throw AppException.notFound();
      }

      if (target.status === MembershipStatus.REMOVED) {
        throw AppException.stateTransitionNotAllowed(
          'Membership has already been removed.',
        );
      }

      if (
        target.role === MembershipRole.OWNER &&
        target.status === MembershipStatus.ACTIVE
      ) {
        const activeOwners = await this.repository.countActiveOwners(
          context.organizationId,
          tx,
        );
        if (activeOwners <= 1) {
          throw AppException.resourceConflict(
            'Cannot remove the last active owner of an active organization.',
          );
        }
      }

      const saved = await this.repository.updateStatus(
        context.organizationId,
        target.id,
        {
          status: MembershipStatus.REMOVED,
          removedAt: new Date(),
        },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'MEMBERSHIP_REMOVED',
          entityType: 'Membership',
          entityId: saved.id,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            targetUserId: saved.userId,
            targetRole: saved.role,
          },
        },
        tx,
      );

      return saved;
    });

    await this.wsAuthorization.publishMembershipRevocation({
      organizationId: context.organizationId,
      userId: updated.userId,
      membershipId: updated.id,
      reason: 'MEMBERSHIP_REMOVED',
    });

    return toMemberSummary(updated);
  }

  async transferOwnership(
    context: OrganizationAuthorizationContext,
    input: TransferOwnershipInput,
  ): Promise<OwnershipTransferResult> {
    if (context.role !== MembershipRole.OWNER) {
      throw AppException.forbidden(
        'Only an active organization OWNER may transfer ownership.',
      );
    }

    const previousOwnerNextRole: AssignableNonOwnerRole =
      input.previousOwnerNextRole ?? MembershipRole.FACILITY_MANAGER;

    const result = await this.repository.runInTransaction(async (tx) => {
      await this.repository.lockOrganizationForUpdate(
        tx,
        context.organizationId,
      );

      const actorMembership = await this.repository.findByIdInOrganization(
        context.organizationId,
        context.membershipId,
        tx,
      );
      if (
        !actorMembership ||
        actorMembership.status !== MembershipStatus.ACTIVE ||
        actorMembership.role !== MembershipRole.OWNER
      ) {
        throw AppException.forbidden(
          'Only an active organization OWNER may transfer ownership.',
        );
      }

      const target = await this.repository.findByIdInOrganization(
        context.organizationId,
        input.targetMembershipId,
        tx,
      );
      if (!target) {
        throw AppException.notFound();
      }

      if (target.id === actorMembership.id || target.userId === context.userId) {
        throw AppException.stateTransitionNotAllowed(
          'Cannot transfer ownership to yourself.',
        );
      }

      if (target.status !== MembershipStatus.ACTIVE) {
        throw AppException.stateTransitionNotAllowed(
          'Ownership can only be transferred to an ACTIVE organization member.',
        );
      }

      if (target.role === MembershipRole.OWNER) {
        throw AppException.stateTransitionNotAllowed(
          'Target member is already an organization OWNER.',
        );
      }

      await this.auditLogs.record(
        {
          action: 'OWNERSHIP_TRANSFER_INITIATED',
          entityType: 'Organization',
          entityId: context.organizationId,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            targetMembershipId: target.id,
            targetUserId: target.userId,
            previousOwnerNextRole,
          },
        },
        tx,
      );

      // Promote target first inside the locked transaction so zero ownerless
      // intermediate state can ever exist.
      const newOwner = await this.repository.updateRole(
        context.organizationId,
        target.id,
        MembershipRole.OWNER,
        tx,
      );

      const previousOwner = await this.repository.updateRole(
        context.organizationId,
        actorMembership.id,
        previousOwnerNextRole,
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'OWNERSHIP_TRANSFER_COMPLETED',
          entityType: 'Organization',
          entityId: context.organizationId,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            newOwnerMembershipId: newOwner.id,
            newOwnerUserId: newOwner.userId,
            previousOwnerMembershipId: previousOwner.id,
            previousOwnerNextRole: previousOwner.role,
          },
        },
        tx,
      );

      return { newOwner, previousOwner };
    });

    await this.wsAuthorization.publishMembershipRevocation({
      organizationId: context.organizationId,
      userId: result.previousOwner.userId,
      membershipId: result.previousOwner.id,
      reason: 'ROLE_CHANGED',
    });

    return {
      organizationId: context.organizationId,
      newOwnerMembership: toMemberSummary(result.newOwner),
      previousOwnerMembership: toMemberSummary(result.previousOwner),
    };
  }
}
