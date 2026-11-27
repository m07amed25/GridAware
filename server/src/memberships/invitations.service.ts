import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { EnvService } from '../config/env.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  InvitationStatus,
  type MembershipRole,
  MembershipStatus,
  OrganizationStatus,
} from '../generated/prisma/enums.js';
import { MAILER_PORT, type MailerPort } from '../mail/mailer.port.js';
import { AssignableNonOwnerRoleSchema } from './dto/memberships.schemas.js';

export const CreateInvitationSchema = z
  .object({
    email: z.string().trim().min(3).max(254).email('Enter a valid email address.'),
    role: AssignableNonOwnerRoleSchema,
  })
  .strict();

export type CreateInvitationInput = z.infer<typeof CreateInvitationSchema>;

export const AcceptInvitationSchema = z
  .object({
    token: z.string().trim().min(16, 'Invitation token is required.').max(256),
  })
  .strict();

export type AcceptInvitationInput = z.infer<typeof AcceptInvitationSchema>;

export interface InvitationSummary {
  invitationId: string;
  organizationId: string;
  email: string;
  role: MembershipRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  devAcceptUrl?: string;
}

export interface InvitationPreview {
  organizationName: string;
  role: MembershipRole;
  invitedEmailMasked: string;
  status: InvitationStatus;
  expiresAt: string;
}

const INVITATION_TTL_DAYS = 7;

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(2, local.length - visible.length))}@${domain}`;
}

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly env: EnvService,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
  ) {}

  async listInvitations(
    context: OrganizationAuthorizationContext,
  ): Promise<InvitationSummary[]> {
    const rows = await this.prisma.organizationInvitation.findMany({
      where: { organizationId: context.organizationId },
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    const now = Date.now();
    return rows.map((row) => ({
      invitationId: row.id,
      organizationId: row.organizationId,
      email: row.email,
      role: row.role,
      status:
        row.status === InvitationStatus.PENDING && row.expiresAt.getTime() <= now
          ? InvitationStatus.EXPIRED
          : row.status,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
      acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
      revokedAt: row.revokedAt ? row.revokedAt.toISOString() : null,
    }));
  }

  async createInvitation(
    context: OrganizationAuthorizationContext,
    input: CreateInvitationInput,
  ): Promise<InvitationSummary> {
    const normalizedEmail = normalizeEmail(input.email);
    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(
      Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const { invitation, organizationName, inviterName } =
      await this.prisma.$transaction(async (tx) => {
        const org = await tx.organization.findUnique({
          where: { id: context.organizationId },
          select: { id: true, name: true, status: true },
        });
        if (!org || org.status !== OrganizationStatus.ACTIVE) {
          throw AppException.notFound();
        }

        const inviter = await tx.user.findUnique({
          where: { id: context.userId },
          select: { displayName: true },
        });

        const existingUser = await tx.user.findUnique({
          where: { normalizedEmail },
          select: { id: true },
        });
        if (existingUser) {
          const existingMembership = await tx.membership.findUnique({
            where: {
              organizationId_userId: {
                organizationId: context.organizationId,
                userId: existingUser.id,
              },
            },
            select: { status: true },
          });
          if (existingMembership?.status === MembershipStatus.ACTIVE) {
            throw AppException.resourceConflict(
              'This user is already an active member of this organization.',
            );
          }
        }

        // Revoke any earlier pending invitation for the same email in this org.
        await tx.organizationInvitation.updateMany({
          where: {
            organizationId: context.organizationId,
            normalizedEmail,
            status: InvitationStatus.PENDING,
          },
          data: {
            status: InvitationStatus.REVOKED,
            revokedAt: new Date(),
          },
        });

        const created = await tx.organizationInvitation.create({
          data: {
            organizationId: context.organizationId,
            email: input.email.trim(),
            normalizedEmail,
            role: input.role,
            tokenHash,
            status: InvitationStatus.PENDING,
            invitedByUserId: context.userId,
            expiresAt,
          },
        });

        await this.auditLogs.record(
          {
            action: 'INVITATION_CREATED',
            entityType: 'OrganizationInvitation',
            entityId: created.id,
            organizationId: context.organizationId,
            actorUserId: context.userId,
            actorMembershipId: context.membershipId,
            metadata: {
              role: created.role,
              expiresAt: created.expiresAt.toISOString(),
            },
          },
          tx,
        );

        return {
          invitation: created,
          organizationName: org.name,
          inviterName: inviter?.displayName ?? 'Organization Owner',
        };
      });

    const acceptUrl = `${this.env.appUrl.replace(/\/$/, '')}/invite/accept?token=${encodeURIComponent(rawToken)}`;

    if (typeof this.mailer.sendOrganizationInvitationEmail === 'function') {
      try {
        await this.mailer.sendOrganizationInvitationEmail({
          to: invitation.email,
          organizationName,
          inviterName,
          role: invitation.role,
          acceptUrl,
          expiresInDays: INVITATION_TTL_DAYS,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to dispatch invitation email for invitationId=${invitation.id}: ${(err as Error).message}`,
        );
      }
    }

    const exposeDevUrl =
      !this.env.isProduction && this.env.mailProvider === 'console';

    return {
      invitationId: invitation.id,
      organizationId: invitation.organizationId,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      acceptedAt: null,
      revokedAt: null,
      ...(exposeDevUrl ? { devAcceptUrl: acceptUrl } : {}),
    };
  }

  async revokeInvitation(
    context: OrganizationAuthorizationContext,
    invitationId: string,
  ): Promise<InvitationSummary> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.organizationInvitation.findFirst({
        where: {
          id: invitationId,
          organizationId: context.organizationId,
        },
      });
      if (!existing) {
        throw AppException.notFound();
      }
      if (existing.status !== InvitationStatus.PENDING) {
        throw AppException.stateTransitionNotAllowed(
          `Only PENDING invitations can be revoked (current status: ${existing.status}).`,
        );
      }

      const revoked = await tx.organizationInvitation.update({
        where: { id: existing.id },
        data: {
          status: InvitationStatus.REVOKED,
          revokedAt: new Date(),
        },
      });

      await this.auditLogs.record(
        {
          action: 'INVITATION_REVOKED',
          entityType: 'OrganizationInvitation',
          entityId: revoked.id,
          organizationId: context.organizationId,
          actorUserId: context.userId,
          actorMembershipId: context.membershipId,
          metadata: {
            role: revoked.role,
          },
        },
        tx,
      );

      return revoked;
    });

    return {
      invitationId: updated.id,
      organizationId: updated.organizationId,
      email: updated.email,
      role: updated.role,
      status: updated.status,
      expiresAt: updated.expiresAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      acceptedAt: updated.acceptedAt ? updated.acceptedAt.toISOString() : null,
      revokedAt: updated.revokedAt ? updated.revokedAt.toISOString() : null,
    };
  }

  async previewInvitation(rawToken: string): Promise<InvitationPreview> {
    if (!rawToken || rawToken.trim().length < 16) {
      throw AppException.invalidToken('Invitation link is invalid.');
    }

    const tokenHash = hashToken(rawToken.trim());
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      include: {
        organization: {
          select: { name: true, status: true },
        },
      },
    });

    if (!invitation || invitation.organization.status !== OrganizationStatus.ACTIVE) {
      throw AppException.invalidToken(
        'This invitation link is invalid, expired, or no longer available.',
      );
    }

    const effectiveStatus =
      invitation.status === InvitationStatus.PENDING &&
      invitation.expiresAt.getTime() <= Date.now()
        ? InvitationStatus.EXPIRED
        : invitation.status;

    return {
      organizationName: invitation.organization.name,
      role: invitation.role,
      invitedEmailMasked: maskEmail(invitation.email),
      status: effectiveStatus,
      expiresAt: invitation.expiresAt.toISOString(),
    };
  }

  async acceptInvitation(
    actorUserId: string,
    rawToken: string,
  ): Promise<{
    organizationId: string;
    organizationName: string;
    membershipId: string;
    role: MembershipRole;
  }> {
    const tokenHash = hashToken(rawToken.trim());

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: actorUserId },
        select: { id: true, normalizedEmail: true },
      });
      if (!user) {
        throw AppException.unauthenticated();
      }

      const invitation = await tx.organizationInvitation.findUnique({
        where: { tokenHash },
        include: {
          organization: {
            select: { id: true, name: true, status: true },
          },
        },
      });

      if (
        !invitation ||
        invitation.organization.status !== OrganizationStatus.ACTIVE
      ) {
        throw AppException.invalidToken(
          'This invitation link is invalid or no longer active.',
        );
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        throw AppException.invalidToken(
          `This invitation has already been ${invitation.status.toLowerCase()}.`,
        );
      }

      if (invitation.expiresAt.getTime() <= Date.now()) {
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED },
        });
        throw AppException.invalidToken('This invitation has expired.');
      }

      if (user.normalizedEmail !== invitation.normalizedEmail) {
        throw AppException.forbidden(
          'This invitation was issued for a different email address. Sign in with the invited account to accept it.',
        );
      }

      const existingMembership = await tx.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId: user.id,
          },
        },
      });

      let membership;
      if (existingMembership) {
        membership = await tx.membership.update({
          where: { id: existingMembership.id },
          data: {
            role: invitation.role,
            status: MembershipStatus.ACTIVE,
            suspendedAt: null,
            removedAt: null,
          },
        });
      } else {
        membership = await tx.membership.create({
          data: {
            organizationId: invitation.organizationId,
            userId: user.id,
            role: invitation.role,
            status: MembershipStatus.ACTIVE,
          },
        });
      }

      await tx.organizationInvitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedByUserId: user.id,
          acceptedAt: new Date(),
        },
      });

      await this.auditLogs.record(
        {
          action: 'INVITATION_ACCEPTED',
          entityType: 'OrganizationInvitation',
          entityId: invitation.id,
          organizationId: invitation.organizationId,
          actorUserId: user.id,
          actorMembershipId: membership.id,
          metadata: {
            role: membership.role,
          },
        },
        tx,
      );

      return {
        organizationId: invitation.organizationId,
        organizationName: invitation.organization.name,
        membershipId: membership.id,
        role: membership.role,
      };
    });
  }
}
