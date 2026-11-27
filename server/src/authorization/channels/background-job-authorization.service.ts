import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthorizationService } from '../authorization.service.js';
import {
  ALL_PERMISSIONS,
  type OrganizationAuthorizationContext,
  type Permission,
} from '../authorization.types.js';

export const SYSTEM_JOB_CAPABILITIES = [
  'TELEMETRY_EVALUATE',
  'INCIDENT_POLICY_EVALUATE',
  'NOTIFICATION_DISPATCH',
  'EXPORT_GENERATE',
  'ANALYTICS_AGGREGATE',
] as const;

export type SystemJobCapability = (typeof SYSTEM_JOB_CAPABILITIES)[number];

export const JobProvenanceSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    organizationId: z.uuid(),
    actorType: z.enum(['USER', 'DEVICE', 'SYSTEM']),
    actorUserId: z.uuid().optional(),
    actorMembershipId: z.uuid().optional(),
    actorDeviceId: z.uuid().optional(),
    serviceCapability: z.enum(SYSTEM_JOB_CAPABILITIES).optional(),
    requiredPermission: z.enum(ALL_PERMISSIONS).optional(),
    aggregateType: z.string().min(1).max(60),
    aggregateId: z.string().min(1).max(128),
    correlationId: z.string().min(1).max(128),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (
      value.actorType === 'USER' &&
      (!value.actorUserId || !value.actorMembershipId)
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'USER jobs require actorUserId and actorMembershipId.',
      });
    }
    if (value.actorType === 'DEVICE' && !value.actorDeviceId) {
      ctx.addIssue({
        code: 'custom',
        message: 'DEVICE jobs require actorDeviceId.',
      });
    }
    if (value.actorType === 'SYSTEM' && !value.serviceCapability) {
      ctx.addIssue({
        code: 'custom',
        message: 'SYSTEM jobs require an allowlisted serviceCapability.',
      });
    }
  });

export type JobProvenance = z.infer<typeof JobProvenanceSchema>;

export interface WorkerAggregateRecord {
  readonly id: string;
  readonly organizationId: string;
}

@Injectable()
export class BackgroundJobAuthorizationService {
  constructor(private readonly authorization: AuthorizationService) {}

  /**
   * Producer-side enforcement: authorizes the initiating human caller BEFORE
   * enqueueing a job and constructs a validated, trustworthy provenance payload.
   */
  authorizeAndBuildUserJobProvenance(
    context: OrganizationAuthorizationContext,
    requiredPermission: Permission,
    target: {
      aggregateType: string;
      aggregateId: string;
      correlationId: string;
    },
  ): JobProvenance {
    if (!this.authorization.hasPermission(context, requiredPermission)) {
      throw AppException.forbidden(
        `Insufficient permissions to enqueue ${target.aggregateType} job.`,
      );
    }

    return JobProvenanceSchema.parse({
      schemaVersion: '1.0',
      organizationId: context.organizationId,
      actorType: 'USER',
      actorUserId: context.userId,
      actorMembershipId: context.membershipId,
      requiredPermission,
      aggregateType: target.aggregateType,
      aggregateId: target.aggregateId,
      correlationId: target.correlationId,
    });
  }

  buildSystemJobProvenance(input: {
    organizationId: string;
    serviceCapability: SystemJobCapability;
    aggregateType: string;
    aggregateId: string;
    correlationId: string;
  }): JobProvenance {
    return JobProvenanceSchema.parse({
      schemaVersion: '1.0',
      actorType: 'SYSTEM',
      ...input,
    });
  }

  /**
   * Worker-side enforcement: validates the job provenance schema, confirms
   * the loaded aggregate belongs to provenance.organizationId, and—for SYSTEM
   * jobs—verifies the capability is explicitly allowed for the worker handler.
   */
  validateWorkerExecution<T extends WorkerAggregateRecord>(
    rawProvenance: unknown,
    loadedAggregate: T | null | undefined,
    expectedSystemCapability?: SystemJobCapability,
  ): { provenance: JobProvenance; aggregate: T } {
    const parsed = JobProvenanceSchema.safeParse(rawProvenance);
    if (!parsed.success) {
      throw AppException.forbidden('Invalid background job provenance.');
    }

    const provenance = parsed.data;

    if (
      !loadedAggregate ||
      loadedAggregate.organizationId !== provenance.organizationId ||
      loadedAggregate.id !== provenance.aggregateId
    ) {
      throw AppException.notFound();
    }

    if (
      provenance.actorType === 'SYSTEM' &&
      expectedSystemCapability &&
      provenance.serviceCapability !== expectedSystemCapability
    ) {
      throw AppException.forbidden(
        'System worker job lacks the required service capability.',
      );
    }

    return { provenance, aggregate: loadedAggregate };
  }
}
