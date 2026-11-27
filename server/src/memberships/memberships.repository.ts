import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  MembershipRole,
  MembershipStatus,
} from '../generated/prisma/enums.js';

export interface MemberWithUserRow {
  id: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
  suspendedAt: Date | null;
  removedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    email: string;
    displayName: string;
  };
}

export interface ListMembersFilter {
  organizationId: string;
  status?: MembershipStatus;
  role?: MembershipRole;
  limit: number;
  cursor?: string;
}

const MEMBER_SELECT = {
  id: true,
  organizationId: true,
  userId: true,
  role: true,
  status: true,
  suspendedAt: true,
  removedAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: {
      email: true,
      displayName: true,
    },
  },
} as const;

@Injectable()
export class MembershipsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  /**
   * Acquires a row-level lock on the parent Organization inside the active
   * transaction to serialize concurrent owner-sensitive mutations per tenant
   * without blocking other organizations.
   */
  async lockOrganizationForUpdate(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<void> {
    if (typeof tx.$queryRaw === 'function') {
      await tx.$queryRaw`SELECT id FROM organizations WHERE id = ${organizationId}::uuid FOR UPDATE`;
    }
  }

  async findManyInOrganization(
    filter: ListMembersFilter,
  ): Promise<{ items: MemberWithUserRow[]; nextCursor: string | null; hasMore: boolean }> {
    const rows = await this.prisma.membership.findMany({
      where: {
        organizationId: filter.organizationId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.role ? { role: filter.role } : {}),
      },
      select: MEMBER_SELECT,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: filter.limit + 1,
      ...(filter.cursor
        ? {
            cursor: { id: filter.cursor },
            skip: 1,
          }
        : {}),
    });

    const hasMore = rows.length > filter.limit;
    const items = hasMore ? rows.slice(0, filter.limit) : rows;
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor, hasMore };
  }

  findByIdInOrganization(
    organizationId: string,
    membershipId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<MemberWithUserRow | null> {
    const client = tx ?? this.prisma;
    return client.membership.findFirst({
      where: {
        id: membershipId,
        organizationId,
      },
      select: MEMBER_SELECT,
    });
  }

  countActiveOwners(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.membership.count({
      where: {
        organizationId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      },
    });
  }

  updateRole(
    organizationId: string,
    membershipId: string,
    role: MembershipRole,
    tx: Prisma.TransactionClient,
  ): Promise<MemberWithUserRow> {
    return tx.membership.update({
      where: {
        organizationId_id: {
          organizationId,
          id: membershipId,
        },
      },
      data: { role },
      select: MEMBER_SELECT,
    });
  }

  updateStatus(
    organizationId: string,
    membershipId: string,
    data: {
      status: MembershipStatus;
      suspendedAt?: Date | null;
      removedAt?: Date | null;
    },
    tx: Prisma.TransactionClient,
  ): Promise<MemberWithUserRow> {
    return tx.membership.update({
      where: {
        organizationId_id: {
          organizationId,
          id: membershipId,
        },
      },
      data,
      select: MEMBER_SELECT,
    });
  }
}
