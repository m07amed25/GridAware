export const POLICY_VERSION = '1' as const;

export const REQUIRED_PERMISSIONS_KEY = 'gridaware:required_permissions';

export const ALLOW_ACTIVE_MEMBER_KEY = 'gridaware:allow_active_member';

export const MEMBERSHIP_REVOKED_REDIS_CHANNEL =
  'gridaware:authz:membership-revoked';

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ORG_SLUG_PATTERN = /^(?=.{2,80}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
