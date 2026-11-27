import { SetMetadata } from '@nestjs/common';
import { REQUIRED_PERMISSIONS_KEY } from '../authorization.constants.js';
import type { Permission } from '../authorization.types.js';

/**
 * Declares required permissions for an organization-scoped route using strict
 * AND semantics (all listed permissions must be held by the caller's role).
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
