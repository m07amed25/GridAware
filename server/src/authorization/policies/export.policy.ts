import { Injectable } from '@nestjs/common';
import { AppException } from '../../common/exceptions/app.exception.js';
import { AuthorizationService } from '../authorization.service.js';
import type {
  OrganizationAuthorizationContext,
  Permission,
} from '../authorization.types.js';
import { ResourceTenantPolicy } from './resource-tenant.policy.js';

export type ExportKind = 'TELEMETRY' | 'ANALYTICS';

export interface ExportArtifactRecord {
  readonly id: string;
  readonly organizationId: string;
  readonly kind: ExportKind;
  readonly expiresAt: Date;
}

const EXPORT_PERMISSION_BY_KIND: Readonly<Record<ExportKind, Permission>> = {
  TELEMETRY: 'telemetry:export',
  ANALYTICS: 'analytics:export',
};

@Injectable()
export class ExportPolicy {
  constructor(
    private readonly authorization: AuthorizationService,
    private readonly tenantPolicy: ResourceTenantPolicy,
  ) {}

  assertCanRequestExport(
    context: OrganizationAuthorizationContext,
    kind: ExportKind,
  ): void {
    const required = EXPORT_PERMISSION_BY_KIND[kind];
    if (!this.authorization.hasPermission(context, required)) {
      throw AppException.forbidden(
        `Insufficient permissions to export ${kind.toLowerCase()} data.`,
      );
    }
  }

  assertCanDownloadArtifact(
    context: OrganizationAuthorizationContext,
    artifact: ExportArtifactRecord | null | undefined,
    now: Date = new Date(),
  ): ExportArtifactRecord {
    const verified = this.tenantPolicy.assertSameTenant(context, artifact);
    this.assertCanRequestExport(context, verified.kind);

    if (verified.expiresAt.getTime() <= now.getTime()) {
      throw AppException.notFound('Export download link has expired.');
    }

    return verified;
  }
}
