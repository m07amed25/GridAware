import { describe, expect, it } from 'vitest';
import { AuthorizationService } from '../../authorization/authorization.service.js';
import type { OrganizationAuthorizationContext } from '../../authorization/authorization.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import {
  LocationStatus,
  MembershipRole,
} from '../../generated/prisma/enums.js';
import { BuildingResourcePolicy } from '../policies/building-resource.policy.js';

const ORG_ID = '11111111-1111-4111-8111-111111111111';
const SITE_ID = '44444444-4444-4444-8444-444444444444';

function makeContext(
  role: MembershipRole = MembershipRole.OWNER,
  organizationId = ORG_ID,
): OrganizationAuthorizationContext {
  return {
    userId: '22222222-2222-4222-8222-222222222222',
    organizationId,
    membershipId: '33333333-3333-4333-8333-333333333333',
    role,
    policyVersion: '1',
  };
}

describe('BuildingResourcePolicy', () => {
  const policy = new BuildingResourcePolicy(new AuthorizationService());

  it('requires parent site to belong to org, be non-archived, and be ACTIVE for creation/restore (FR-010)', () => {
    const ctx = makeContext();

    expect(() =>
      policy.assertParentSiteAcceptsBuilding(ctx, {
        organizationId: ORG_ID,
        status: LocationStatus.ACTIVE,
        archivedAt: null,
      }),
    ).not.toThrow();

    expect(() =>
      policy.assertParentSiteAcceptsBuilding(ctx, null),
    ).toThrow(AppException);

    try {
      policy.assertParentSiteAcceptsBuilding(ctx, {
        organizationId: ORG_ID,
        status: LocationStatus.ACTIVE,
        archivedAt: new Date(),
      });
      expect.fail('Expected SITE_ARCHIVED');
    } catch (err) {
      expect((err as AppException).code).toBe(ErrorCode.SITE_ARCHIVED);
      expect((err as AppException).getStatus()).toBe(409);
    }

    try {
      policy.assertParentSiteAcceptsBuilding(ctx, {
        organizationId: ORG_ID,
        status: LocationStatus.INACTIVE,
        archivedAt: null,
      });
      expect.fail('Expected SITE_INACTIVE');
    } catch (err) {
      expect((err as AppException).code).toBe(ErrorCode.SITE_INACTIVE);
      expect((err as AppException).getStatus()).toBe(409);
    }
  });

  it('conceals cross-site and cross-tenant buildings as 404 BUILDING_NOT_FOUND', () => {
    const ctx = makeContext();
    const wrongSite = {
      organizationId: ORG_ID,
      siteId: '99999999-9999-4999-8999-999999999999',
      status: LocationStatus.ACTIVE,
      archivedAt: null,
    };
    const wrongOrg = {
      organizationId: '99999999-9999-4999-8999-999999999999',
      siteId: SITE_ID,
      status: LocationStatus.ACTIVE,
      archivedAt: null,
    };

    for (const candidate of [null, wrongSite, wrongOrg]) {
      try {
        policy.assertSameTenantAndSite(ctx, SITE_ID, candidate);
        expect.fail('Expected BUILDING_NOT_FOUND');
      } catch (err) {
        expect((err as AppException).code).toBe(ErrorCode.BUILDING_NOT_FOUND);
        expect((err as AppException).getStatus()).toBe(404);
      }
    }
  });

  it('restricts archived building views strictly to roles with buildings:archive permission', () => {
    expect(() =>
      policy.assertCanViewArchived(makeContext(MembershipRole.OWNER)),
    ).not.toThrow();
    expect(() =>
      policy.assertCanViewArchived(
        makeContext(MembershipRole.FACILITY_MANAGER),
      ),
    ).not.toThrow();

    for (const role of [
      MembershipRole.ENGINEER,
      MembershipRole.TECHNICIAN,
      MembershipRole.VIEWER,
    ]) {
      try {
        policy.assertCanViewArchived(makeContext(role));
        expect.fail(`Expected FORBIDDEN for ${role}`);
      } catch (err) {
        expect((err as AppException).code).toBe(ErrorCode.FORBIDDEN);
        expect((err as AppException).getStatus()).toBe(403);
      }
    }
  });

  it('rejects mutating an archived building with 409 INVALID_LOCATION_STATE', () => {
    try {
      policy.assertMutable({ archivedAt: new Date() });
      expect.fail('Expected INVALID_LOCATION_STATE');
    } catch (err) {
      expect((err as AppException).code).toBe(ErrorCode.INVALID_LOCATION_STATE);
      expect((err as AppException).getStatus()).toBe(409);
    }
  });
});
