import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { POLICY_VERSION } from '../authorization/authorization.constants.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { ROLE_PERMISSION_LISTS } from '../authorization/permission-map.js';
import { AppException } from '../common/exceptions/app.exception.js';
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
} from '../generated/prisma/enums.js';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from './dto/organizations.schemas.js';
import {
  type AccessibleOrganizationSummary,
  type OrganizationProfileRow,
  OrganizationsRepository,
} from './organizations.repository.js';

export interface OrganizationProfile {
  organizationId: string;
  name: string;
  slug: string;
  status: OrganizationStatus;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleMatrixEntry {
  role: MembershipRole;
  label: string;
  summary: string;
  permissions: readonly string[];
}

export interface RolesMatrixResponse {
  policyVersion: string;
  roles: RoleMatrixEntry[];
}

const ROLE_METADATA: Readonly<
  Record<MembershipRole, { label: string; summary: string }>
> = {
  [MembershipRole.OWNER]: {
    label: 'Owner',
    summary:
      'Full tenant administration, member and role management, audit log access, and complete operational authority.',
  },
  [MembershipRole.FACILITY_MANAGER]: {
    label: 'Facility Manager',
    summary:
      'Manages sites, buildings, assets, sensors, thresholds, incidents, work orders, maintenance schedules, simulator runs, and exports.',
  },
  [MembershipRole.ENGINEER]: {
    label: 'Engineer',
    summary:
      'Investigates telemetry and anomalies, configures assets/sensors/thresholds, manages incidents through resolution, creates/updates/completes work orders, and runs demo simulator scenarios.',
  },
  [MembershipRole.TECHNICIAN]: {
    label: 'Technician',
    summary:
      'Executes assigned work orders, records maintenance findings, and views operational equipment/incidents linked strictly to assigned work.',
  },
  [MembershipRole.VIEWER]: {
    label: 'Viewer',
    summary:
      'Strictly read-only visibility across permitted organization dashboards, telemetry, incidents, work orders, and analytics.',
  },
};

function slugifyOrganizationName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base.length >= 2 ? base : `org-${randomBytes(3).toString('hex')}`;
}

function toProfile(row: OrganizationProfileRow): OrganizationProfile {
  return {
    organizationId: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    timezone: row.timezone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly repository: OrganizationsRepository,
    private readonly auditLogs: AuditLogsService,
  ) {}

  listAccessibleForUser(
    userId: string,
  ): Promise<AccessibleOrganizationSummary[]> {
    return this.repository.findAccessibleByUserId(userId);
  }

  async createOrganization(
    actorUserId: string,
    input: CreateOrganizationInput,
  ): Promise<AccessibleOrganizationSummary> {
    const timezone = input.timezone ?? 'UTC';
    let slug = input.slug ?? slugifyOrganizationName(input.name);

    return this.repository.runInTransaction(async (tx) => {
      const existing = await this.repository.findBySlug(slug, tx);
      if (existing) {
        if (input.slug) {
          throw AppException.resourceConflict(
            `An organization with slug "${slug}" already exists.`,
          );
        }
        slug = `${slug.slice(0, 72)}-${randomBytes(3).toString('hex')}`;
      }

      const created = await this.repository.createWithOwner(
        {
          name: input.name,
          slug,
          timezone,
          ownerUserId: actorUserId,
        },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'ORGANIZATION_CREATED',
          entityType: 'Organization',
          entityId: created.organization.id,
          organizationId: created.organization.id,
          actorUserId,
          actorMembershipId: created.membershipId,
          metadata: {
            slug: created.organization.slug,
            timezone: created.organization.timezone,
          },
        },
        tx,
      );

      return {
        organizationId: created.organization.id,
        name: created.organization.name,
        slug: created.organization.slug,
        timezone: created.organization.timezone,
        membershipId: created.membershipId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
      };
    });
  }

  async getOrganizationProfile(
    context: OrganizationAuthorizationContext,
  ): Promise<OrganizationProfile> {
    const org = await this.repository.findById(context.organizationId);
    if (!org) {
      throw AppException.notFound();
    }
    return toProfile(org);
  }

  async updateOrganization(
    context: OrganizationAuthorizationContext,
    input: UpdateOrganizationInput,
  ): Promise<OrganizationProfile> {
    return this.repository.runInTransaction(async (tx) => {
      const updated = await this.repository.updateById(
        context.organizationId,
        {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'ORGANIZATION_UPDATED',
          entityType: 'Organization',
          entityId: updated.id,
          organizationId: updated.id,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            updatedFields: Object.keys(input),
            timezone: updated.timezone,
          },
        },
        tx,
      );

      return toProfile(updated);
    });
  }

  async archiveOrganization(
    context: OrganizationAuthorizationContext,
  ): Promise<OrganizationProfile> {
    return this.repository.runInTransaction(async (tx) => {
      const archived = await this.repository.updateById(
        context.organizationId,
        { status: OrganizationStatus.ARCHIVED },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'ORGANIZATION_ARCHIVED',
          entityType: 'Organization',
          entityId: archived.id,
          organizationId: archived.id,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            previousStatus: OrganizationStatus.ACTIVE,
            newStatus: OrganizationStatus.ARCHIVED,
          },
        },
        tx,
      );

      return toProfile(archived);
    });
  }

  getRolesMatrix(): RolesMatrixResponse {
    const order: MembershipRole[] = [
      MembershipRole.OWNER,
      MembershipRole.FACILITY_MANAGER,
      MembershipRole.ENGINEER,
      MembershipRole.TECHNICIAN,
      MembershipRole.VIEWER,
    ];

    return {
      policyVersion: POLICY_VERSION,
      roles: order.map((role) => ({
        role,
        label: ROLE_METADATA[role].label,
        summary: ROLE_METADATA[role].summary,
        permissions: ROLE_PERMISSION_LISTS[role],
      })),
    };
  }
}
