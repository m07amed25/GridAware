import type { RequestWithActor } from '../auth/decorators/current-user.decorator.js';
import type { MembershipRole } from '../generated/prisma/enums.js';

export const ALL_PERMISSIONS = [
  // Organization & administration (10)
  'organization:read',
  'organization:update',
  'organization:archive',
  'members:read',
  'members:invite',
  'members:revoke-invitation',
  'members:update-role',
  'members:suspend',
  'members:remove',
  'audit-logs:read',
  // Infrastructure (20)
  'sites:read',
  'sites:create',
  'sites:update',
  'sites:archive',
  'buildings:read',
  'buildings:create',
  'buildings:update',
  'buildings:archive',
  'assets:read',
  'assets:create',
  'assets:update',
  'assets:archive',
  'sensors:read',
  'sensors:create',
  'sensors:update',
  'sensors:disable',
  'sensors:maintenance',
  'sensors:archive',
  'thresholds:read',
  'thresholds:manage',
  'devices:read',
  'devices:create',
  'devices:update',
  'devices:activate',
  'devices:suspend',
  'devices:revoke',
  'devices:rotate-credentials',
  'device-credentials:provision',
  'devices:manage',
  // Monitoring & intelligence (9)
  'telemetry:read',
  'telemetry:export',
  'monitoring:read',
  'anomalies:read',
  'anomalies:acknowledge',
  'predictions:read',
  'risk-assessments:read',
  'simulator:read',
  'simulator:control',
  // Incidents & maintenance (18)
  'incidents:read',
  'incidents:create',
  'incidents:assign',
  'incidents:investigate',
  'incidents:resolve',
  'incidents:close',
  'incidents:add-related-note',
  'work-orders:read',
  'work-orders:read-assigned',
  'work-orders:create',
  'work-orders:assign',
  'work-orders:update',
  'work-orders:update-assigned',
  'work-orders:complete',
  'work-orders:complete-assigned',
  'maintenance:read',
  'maintenance:manage',
  'maintenance-records:create',
  // Analytics & notifications (4)
  'analytics:read',
  'analytics:export',
  'notifications:read',
  'notifications:manage-preferences',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export interface OrganizationAuthorizationContext {
  readonly userId: string;
  readonly organizationId: string;
  readonly organizationSlug?: string;
  readonly membershipId: string;
  readonly role: MembershipRole;
  readonly policyVersion: string;
}

export interface AccessContextPayload {
  readonly organizationId: string;
  readonly organizationSlug: string;
  readonly membershipId: string;
  readonly role: MembershipRole;
  readonly permissions: readonly Permission[];
  readonly policyVersion: string;
}

export type RequestWithOrganizationContext = RequestWithActor & {
  organizationContext?: OrganizationAuthorizationContext;
};
