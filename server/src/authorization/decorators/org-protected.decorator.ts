import { applyDecorators, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard.js';
import { CsrfGuard } from '../../auth/guards/csrf.guard.js';
import { OrganizationContextGuard } from '../guards/organization-context.guard.js';
import { PermissionsGuard } from '../guards/permissions.guard.js';

/**
 * Enforces GridAware's mandatory 4-stage organization authorization pipeline
 * in deterministic execution order:
 * 1. AccessTokenGuard (global user + active session)
 * 2. CsrfGuard (double-submit CSRF + origin check on mutating requests)
 * 3. OrganizationContextGuard (server-verified active membership & active org)
 * 4. PermissionsGuard (fail-closed Reflector permission evaluation)
 */
export const OrgProtected = () =>
  applyDecorators(
    UseGuards(
      AccessTokenGuard,
      CsrfGuard,
      OrganizationContextGuard,
      PermissionsGuard,
    ),
  );
