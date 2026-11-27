import { SetMetadata } from '@nestjs/common';
import { ALLOW_ACTIVE_MEMBER_KEY } from '../authorization.constants.js';

/**
 * Explicitly permits any active member of an active organization without an
 * additional role permission check. Reserved strictly for self-introspection
 * routes such as GET /organizations/:organizationId/access-context.
 */
export const AllowActiveMember = () =>
  SetMetadata(ALLOW_ACTIVE_MEMBER_KEY, true);
