import { Controller, Get } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { AuthorizationService } from './authorization.service.js';
import type { OrganizationAuthorizationContext } from './authorization.types.js';
import { AllowActiveMember } from './decorators/allow-active-member.decorator.js';
import { OrgContext } from './decorators/org-context.decorator.js';
import { OrgProtected } from './decorators/org-protected.decorator.js';
import { AccessContextDataDto } from './dto/authorization-swagger.dto.js';

@ApiTags('authorization')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId')
@OrgProtected()
export class AuthorizationController {
  constructor(private readonly authorizationService: AuthorizationService) {}

  @Get('access-context')
  @AllowActiveMember()
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiOperation({
    summary:
      'Return current authenticated user role and effective permissions in the active organization',
  })
  @ApiOkResponse({ type: AccessContextDataDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiNotFoundResponse({
    description: 'Organization not found or caller has no active membership',
  })
  getAccessContext(@OrgContext() context: OrganizationAuthorizationContext) {
    return buildApiResponse(
      this.authorizationService.buildAccessContext(context),
    );
  }
}
