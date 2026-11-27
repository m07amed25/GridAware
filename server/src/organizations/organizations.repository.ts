import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
} from '../generated/prisma/enums.js';

export interface AccessibleOrganizationSummary {
  organizationId: string;
  name: string;
  slug: string;
  timezone: string;
  membershipId: string;
  role: MembershipRole;
  status: MembershipStatus;
}

export interface OrganizationProfileRow {
  id: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  async findAccessibleByUserId(
    userId: string,
  ): Promise<AccessibleOrganizationSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        organization: {
          status: OrganizationStatus.ACTIVE,
        },
      },
      select: {
        id: true,
        organizationId: true,
        role: true,
        status: true,
        organization: {
          select: {
            name: true,
            slug: true,
            timezone: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return memberships.map((membership) => ({
      organizationId: membership.organizationId,
      name: membership.organization.name,
      slug: membership.organization.slug,
      timezone: membership.organization.timezone,
      membershipId: membership.id,
      role: membership.role,
      status: membership.status,
    }));
  }

  findById(
    organizationId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<OrganizationProfileRow | null> {
    const client = tx ?? this.prisma;
    return client.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  findBySlug(
    slug: string,
    tx?: Prisma.TransactionClient,
  ): Promise<{ id: string } | null> {
    const client = tx ?? this.prisma;
    return client.organization.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  createWithOwner(
    input: {
      name: string;
      slug: string;
      timezone: string;
      ownerUserId: string;
    },
    tx: Prisma.TransactionClient,
  ): Promise<{
    organization: OrganizationProfileRow;
    membershipId: string;
  }> {
    return tx.organization
      .create({
        data: {
          name: input.name,
          slug: input.slug,
          timezone: input.timezone,
          status: OrganizationStatus.ACTIVE,
          memberships: {
            create: {
              userId: input.ownerUserId,
              role: MembershipRole.OWNER,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          timezone: true,
          createdAt: true,
          updatedAt: true,
          memberships: {
            where: { userId: input.ownerUserId },
            select: { id: true },
            take: 1,
          },
        },
      })
      .then((created) => ({
        organization: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          status: created.status,
          timezone: created.timezone,
          createdAt: created.createdAt,
          updatedAt: created.updatedAt,
        },
        membershipId: created.memberships[0].id,
      }));
  }

  updateById(
    organizationId: string,
    data: { name?: string; timezone?: string; status?: OrganizationStatus },
    tx: Prisma.TransactionClient,
  ): Promise<OrganizationProfileRow> {
    return tx.organization.update({
      where: { id: organizationId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        timezone: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
