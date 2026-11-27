import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { getRequestContext } from '../logging/request-context.js';

export type AuditAction =
  | 'AUTH_REGISTER_SUCCESS'
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILED'
  | 'AUTH_SESSION_REFRESHED'
  | 'AUTH_SESSION_REVOKED'
  | 'AUTH_SESSION_LOGOUT_ALL'
  | 'AUTH_SESSION_EVICTED'
  | 'AUTH_SESSION_REUSE_DETECTED'
  | 'AUTH_EMAIL_VERIFIED'
  | 'AUTH_EMAIL_VERIFICATION_RESENT'
  | 'AUTH_PASSWORD_RESET_REQUESTED'
  | 'AUTH_PASSWORD_RESET_COMPLETED'
  | 'AUTH_USER_STATUS_CHANGED'
  | 'AUTHZ_DENIED'
  | 'MEMBERSHIP_ROLE_CHANGED'
  | 'MEMBERSHIP_SUSPENDED'
  | 'MEMBERSHIP_REACTIVATED'
  | 'MEMBERSHIP_REMOVED'
  | 'INVITATION_CREATED'
  | 'INVITATION_REVOKED'
  | 'INVITATION_ACCEPTED'
  | 'ORGANIZATION_CREATED'
  | 'ORGANIZATION_UPDATED'
  | 'ORGANIZATION_ARCHIVED'
  | 'OWNERSHIP_TRANSFER_INITIATED'
  | 'OWNERSHIP_TRANSFER_COMPLETED'
  | 'SITE_CREATED'
  | 'SITE_UPDATED'
  | 'SITE_ACTIVATED'
  | 'SITE_DEACTIVATED'
  | 'SITE_ARCHIVED'
  | 'SITE_RESTORED'
  | 'BUILDING_CREATED'
  | 'BUILDING_UPDATED'
  | 'BUILDING_ACTIVATED'
  | 'BUILDING_DEACTIVATED'
  | 'BUILDING_ARCHIVED'
  | 'BUILDING_RESTORED'
  | 'EXPORT_REQUESTED'
  | 'EXPORT_COMPLETED'
  | 'EXPORT_FAILED'
  | 'SIMULATOR_CONTROL_EXECUTED';

export interface RecordAuditEventInput {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  actorMembershipId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY_PATTERN =
  /password|secret|token|cookie|authorization|csrf|hash|credential|rawbody/i;

function sanitizeValue(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        continue;
      }
      out[key] = sanitizeValue(val);
    }
    return out;
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return null;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    input: RecordAuditEventInput,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const ctx = getRequestContext();
    const client = tx ?? this.prisma;
    const sanitizedMetadata = input.metadata
      ? (sanitizeValue(input.metadata) as Prisma.InputJsonValue)
      : undefined;

    await client.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        actorMembershipId: input.actorMembershipId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        requestId: ctx?.requestId ?? null,
        correlationId: ctx?.correlationId ?? null,
        ...(sanitizedMetadata !== undefined
          ? { metadata: sanitizedMetadata }
          : {}),
      },
    });
  }
}
