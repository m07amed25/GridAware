import { HttpStatus } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import type { EnvService } from '../../config/env.service.js';
import { MembershipRole } from '../../generated/prisma/enums.js';
import { AuthorizationService } from '../authorization.service.js';
import type { OrganizationAuthorizationContext } from '../authorization.types.js';
import { ExportPolicy } from '../policies/export.policy.js';
import { IncidentPolicy } from '../policies/incident.policy.js';
import { ResourceTenantPolicy } from '../policies/resource-tenant.policy.js';
import { SimulatorPolicy } from '../policies/simulator.policy.js';
import { TechnicianScopePolicy } from '../policies/technician-scope.policy.js';
import { WorkOrderPolicy } from '../policies/work-order.policy.js';

const ORG_A = '11111111-1111-4111-8111-111111111111';
const ORG_B = '22222222-2222-4222-8222-222222222222';
const TECH_1 = 'aaaa1111-1111-4111-8111-111111111111';
const TECH_2 = 'aaaa2222-2222-4222-8222-222222222222';

function makeContext(
  role: MembershipRole,
  organizationId = ORG_A,
  userId = TECH_1,
): OrganizationAuthorizationContext {
  return {
    userId,
    organizationId,
    membershipId: 'mem-1',
    role,
    policyVersion: '1',
  };
}

describe('Service-Level Resource Policies', () => {
  const authorization = new AuthorizationService();
  const tenantPolicy = new ResourceTenantPolicy();
  const techScope = new TechnicianScopePolicy();
  const workOrderPolicy = new WorkOrderPolicy(authorization, techScope);
  const incidentPolicy = new IncidentPolicy(authorization, tenantPolicy, techScope);
  const exportPolicy = new ExportPolicy(authorization, tenantPolicy);

  describe('ResourceTenantPolicy', () => {
    it('rejects cross-tenant records and parent references with concealed 404', () => {
      const ownerA = makeContext(MembershipRole.OWNER, ORG_A);
      expect(tenantPolicy.tenantWhere(ownerA, { status: 'ACTIVE' })).toEqual({
        status: 'ACTIVE',
        organizationId: ORG_A,
      });

      expect(() =>
        tenantPolicy.assertSameTenant(ownerA, { organizationId: ORG_B }),
      ).toThrowError(AppException);

      try {
        tenantPolicy.assertParentTenantConsistency(ownerA, [
          { organizationId: ORG_A },
          { organizationId: ORG_B },
        ]);
        expect.unreachable('Expected cross-tenant parent check to throw');
      } catch (err) {
        expect((err as AppException).getStatus()).toBe(HttpStatus.NOT_FOUND);
        expect((err as AppException).code).toBe(ErrorCode.RESOURCE_NOT_FOUND);
      }
    });
  });

  describe('TechnicianScopePolicy & WorkOrderPolicy', () => {
    it('applies assignedToUserId filter in DB list query for TECHNICIAN only', () => {
      const tech = makeContext(MembershipRole.TECHNICIAN, ORG_A, TECH_1);
      const fm = makeContext(MembershipRole.FACILITY_MANAGER, ORG_A, TECH_1);

      expect(techScope.workOrderListWhere(tech, { status: 'ASSIGNED' })).toEqual({
        organizationId: ORG_A,
        assignedToUserId: TECH_1,
        status: 'ASSIGNED',
      });
      expect(techScope.workOrderListWhere(fm, { status: 'ASSIGNED' })).toEqual({
        organizationId: ORG_A,
        status: 'ASSIGNED',
      });
    });

    it('restricts TECHNICIAN read/update/complete to assigned work orders and blocks assignee/org mutations', () => {
      const tech = makeContext(MembershipRole.TECHNICIAN, ORG_A, TECH_1);
      const ownWo = {
        id: 'wo-1',
        organizationId: ORG_A,
        assignedToUserId: TECH_1,
        status: 'IN_PROGRESS' as const,
      };
      const otherWo = {
        id: 'wo-2',
        organizationId: ORG_A,
        assignedToUserId: TECH_2,
        status: 'IN_PROGRESS' as const,
      };

      expect(workOrderPolicy.assertCanRead(tech, ownWo)).toEqual(ownWo);
      expect(() => workOrderPolicy.assertCanRead(tech, otherWo)).toThrowError(
        AppException,
      );

      expect(
        workOrderPolicy.assertCanUpdate(tech, ownWo, {
          maintenanceNotes: 'Replaced coolant hose',
        }),
      ).toEqual(ownWo);

      expect(() =>
        workOrderPolicy.assertCanUpdate(tech, ownWo, {
          assignedToUserId: TECH_2,
        }),
      ).toThrowError(/restricted work-order fields/i);

      expect(() =>
        workOrderPolicy.assertCanUpdate(tech, ownWo, {
          organizationId: ORG_B,
        }),
      ).toThrowError(/restricted work-order fields/i);

      expect(workOrderPolicy.assertCanComplete(tech, ownWo)).toEqual(ownWo);
      expect(
        workOrderPolicy.buildConditionalCompleteWhere(tech, 'wo-1'),
      ).toMatchObject({
        id: 'wo-1',
        organizationId: ORG_A,
        assignedToUserId: TECH_1,
      });
    });

    it('enforces strict assignment-related scope for TECHNICIAN on non-work-order operational records (FR-012 Option A)', () => {
      const tech = makeContext(MembershipRole.TECHNICIAN, ORG_A, TECH_1);
      expect(() =>
        techScope.assertRelatedResourceAccess(tech, ORG_A, 1),
      ).not.toThrow();
      expect(() =>
        techScope.assertRelatedResourceAccess(tech, ORG_A, 0),
      ).toThrowError(AppException);
      expect(techScope.relatedResourceScopeFilter(tech)).toEqual({
        organizationId: ORG_A,
        workOrders: {
          some: {
            organizationId: ORG_A,
            assignedToUserId: TECH_1,
          },
        },
      });
    });

    it('denies VIEWER all work-order mutations and allows ENGINEER/FM completion', () => {
      const viewer = makeContext(MembershipRole.VIEWER, ORG_A);
      const engineer = makeContext(MembershipRole.ENGINEER, ORG_A);
      const wo = {
        id: 'wo-1',
        organizationId: ORG_A,
        assignedToUserId: TECH_1,
        status: 'IN_PROGRESS' as const,
      };

      expect(workOrderPolicy.assertCanRead(viewer, wo)).toEqual(wo);
      expect(() =>
        workOrderPolicy.assertCanUpdate(viewer, wo, { maintenanceNotes: 'x' }),
      ).toThrowError(AppException);
      expect(workOrderPolicy.assertCanComplete(engineer, wo)).toEqual(wo);
      expect(() => workOrderPolicy.assertCanAssign(engineer, wo, ORG_A)).toThrowError(
        AppException,
      );
    });
  });

  describe('IncidentPolicy', () => {
    it('allows ENGINEER to resolve but restricts close to FM/OWNER, and limits TECHNICIAN to notes on linked incidents', () => {
      const engineer = makeContext(MembershipRole.ENGINEER, ORG_A);
      const fm = makeContext(MembershipRole.FACILITY_MANAGER, ORG_A);
      const tech = makeContext(MembershipRole.TECHNICIAN, ORG_A, TECH_1);
      const viewer = makeContext(MembershipRole.VIEWER, ORG_A);

      const investigating = {
        id: 'inc-1',
        organizationId: ORG_A,
        status: 'INVESTIGATING' as const,
      };
      const resolved = {
        id: 'inc-1',
        organizationId: ORG_A,
        status: 'RESOLVED' as const,
      };

      expect(incidentPolicy.assertCanResolve(engineer, investigating)).toEqual(
        investigating,
      );
      expect(() => incidentPolicy.assertCanClose(engineer, resolved)).toThrowError(
        AppException,
      );
      expect(incidentPolicy.assertCanClose(fm, resolved)).toEqual(resolved);

      // Technician related note checks
      expect(incidentPolicy.assertCanAddNote(tech, investigating, 1)).toEqual(
        investigating,
      );
      expect(() =>
        incidentPolicy.assertCanAddNote(tech, investigating, 0),
      ).toThrowError(AppException);
      expect(() =>
        incidentPolicy.assertCanAddNote(viewer, investigating, 1),
      ).toThrowError(AppException);
    });
  });

  describe('SimulatorPolicy & ExportPolicy', () => {
    it('unconditionally blocks physical equipment actuation even for OWNER and gates ENGINEER simulator control to demo non-prod', () => {
      const prodEnv = {
        isProduction: true,
        simulatorDemoControlEnabled: true,
      } as unknown as EnvService;
      const demoEnv = {
        isProduction: false,
        simulatorDemoControlEnabled: true,
      } as unknown as EnvService;

      const prodSimPolicy = new SimulatorPolicy(
        authorization,
        tenantPolicy,
        prodEnv,
      );
      const demoSimPolicy = new SimulatorPolicy(
        authorization,
        tenantPolicy,
        demoEnv,
      );

      const owner = makeContext(MembershipRole.OWNER, ORG_A);
      const engineer = makeContext(MembershipRole.ENGINEER, ORG_A);

      expect(() =>
        demoSimPolicy.assertCanControl(owner, {
          organizationId: ORG_A,
          targetKind: 'PHYSICAL_EQUIPMENT',
          isDemoScenario: true,
        }),
      ).toThrowError(/prohibited/i);

      expect(() =>
        prodSimPolicy.assertCanControl(engineer, {
          organizationId: ORG_A,
          targetKind: 'SIMULATOR',
          isDemoScenario: true,
        }),
      ).toThrowError(/non-production demo/i);

      expect(
        demoSimPolicy.assertCanControl(engineer, {
          organizationId: ORG_A,
          targetKind: 'SIMULATOR',
          isDemoScenario: true,
        }),
      ).toBeTruthy();
    });

    it('enforces export permissions, tenant binding, and short-lived download expiry', () => {
      const fm = makeContext(MembershipRole.FACILITY_MANAGER, ORG_A);
      const engineer = makeContext(MembershipRole.ENGINEER, ORG_A);
      const now = new Date('2026-11-27T12:00:00.000Z');
      const validArtifact = {
        id: 'exp-1',
        organizationId: ORG_A,
        kind: 'TELEMETRY' as const,
        expiresAt: new Date('2026-11-27T12:10:00.000Z'),
      };
      const expiredArtifact = {
        ...validArtifact,
        expiresAt: new Date('2026-11-27T11:59:00.000Z'),
      };
      const otherOrgArtifact = {
        ...validArtifact,
        organizationId: ORG_B,
      };

      expect(exportPolicy.assertCanDownloadArtifact(fm, validArtifact, now)).toEqual(
        validArtifact,
      );
      expect(() =>
        exportPolicy.assertCanDownloadArtifact(engineer, validArtifact, now),
      ).toThrowError(AppException);
      expect(() =>
        exportPolicy.assertCanDownloadArtifact(fm, expiredArtifact, now),
      ).toThrowError(AppException);
      expect(() =>
        exportPolicy.assertCanDownloadArtifact(fm, otherOrgArtifact, now),
      ).toThrowError(AppException);
    });
  });
});
