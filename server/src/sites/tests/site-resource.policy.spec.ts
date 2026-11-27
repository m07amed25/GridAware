import { describe, expect, it } from 'vitest';
import { AuthorizationService } from '../../authorization/authorization.service.js';
import type { OrganizationAuthorizationContext } from '../../authorization/authorization.types.js';
import { AppException } from '../../common/exceptions/app.exception.js';
import { ErrorCode } from '../../common/exceptions/error-codes.js';
import {
  LocationStatus,
  MembershipRole,
} from '../../generated/prisma/enums.js';
import { SiteResourcePolicy } from '../policies/site-resource.policy.js';

function makeContext(
  role: MembershipRole,
  organizationId = '11111111-1111-4111-8111-111111111111',
): OrganizationAuthorizationContext {
  return {
    userId: '22222222-2222-4222-8222-222222222222',
    organizationId,
    membershipId: '33333333-3333-4333-8333-333333333333',
    role,
    policyVersion: '1',
  };
}

describe('SiteResourcePolicy', () => {
  const policy = new SiteResourcePolicy(new AuthorizationService());

  it('returns the site when it belongs to the active organization', () => {
    const ctx = makeContext(MembershipRole.OWNER);
    const site = {
      id: '44444444-4444-4444-8444-444444444444',
      organizationId: ctx.organizationId,
      status: LocationStatus.ACTIVE,
      archivedAt: null,
    };

    expect(policy.assertSameTenant(ctx, site)).toBe(site);
  });

  it('throws non-disclosing SITE_NOT_FOUND when site is null or belongs to another tenant', () => {
    const ctx = makeContext(MembershipRole.OWNER);
    const foreignSite = {
      id: '44444444-4444-4444-8444-444444444444',
      organizationId: '99999999-9999-4999-8999-999999999999',
      status: LocationStatus.ACTIVE,
      archivedAt: null,
    };

    for (const candidate of [null, undefined, foreignSite]) {
      try {
        policy.assertSameTenant(ctx, candidate);
        expect.fail('Expected AppException');
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).code).toBe(ErrorCode.SITE_NOT_FOUND);
        expect((err as AppException).getStatus()).toBe(404);
      }
    }
  });

  it('allows archive visibility only for roles with sites:archive permission', () => {
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
        expect.fail(`Expected forbidden for ${role}`);
      } catch (err) {
        expect(err).toBeInstanceOf(AppException);
        expect((err as AppException).code).toBe(ErrorCode.FORBIDDEN);
        expect((err as AppException).getStatus()).toBe(403);
      }
    }
  });

  it('rejects mutations on archived sites with INVALID_LOCATION_STATE', () => {
    const archivedSite = {
      status: LocationStatus.ACTIVE,
      archivedAt: new Date('2026-11-27T00:00:00.000Z'),
    };

    try {
      policy.assertMutable(archivedSite);
      expect.fail('Expected AppException');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(ErrorCode.INVALID_LOCATION_STATE);
      expect((err as AppException).getStatus()).toBe(409);
    }
  });

  it('enforces site archive blocker when non-archived buildings remain', () => {
    const activeSite = {
      status: LocationStatus.ACTIVE,
      archivedAt: null,
    };

    expect(() => policy.assertCanArchive(activeSite, 0)).not.toThrow();

    try {
      policy.assertCanArchive(activeSite, 2);
      expect.fail('Expected SITE_HAS_ACTIVE_BUILDINGS');
    } catch (err) {
      expect(err).toBeInstanceOf(AppException);
      expect((err as AppException).code).toBe(
        ErrorCode.SITE_HAS_ACTIVE_BUILDINGS,
      );
      expect((err as AppException).getStatus()).toBe(409);
    }
  });
});
