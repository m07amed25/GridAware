import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  type AuthenticatedActor,
  CurrentUser,
} from '../auth/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../auth/dto/zod-validation.pipe.js';
import { AccessTokenGuard } from '../auth/guards/access-token.guard.js';
import { CsrfGuard } from '../auth/guards/csrf.guard.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { OrgContext } from '../authorization/decorators/org-context.decorator.js';
import { OrgProtected } from '../authorization/decorators/org-protected.decorator.js';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { MembershipIdParamSchema } from './dto/memberships.schemas.js';
import {
  AcceptInvitationSchema,
  type AcceptInvitationInput,
  CreateInvitationSchema,
  type CreateInvitationInput,
  InvitationsService,
} from './invitations.service.js';

@ApiTags('invitations')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/invitations')
@OrgProtected()
export class OrganizationInvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get()
  @RequirePermissions('members:read')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiOperation({
    summary: 'List organization member invitations (requires members:read)',
  })
  @ApiOkResponse({ description: 'Organization invitations list' })
  async listInvitations(
    @OrgContext() context: OrganizationAuthorizationContext,
  ) {
    const list = await this.invitationsService.listInvitations(context);
    return buildApiResponse(list);
  }

  @Post()
  @RequirePermissions('members:invite')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Invite a user to join the organization with a permitted non-owner role (requires members:invite)',
  })
  @ApiCreatedResponse({ description: 'Invitation issued and email dispatched' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async createInvitation(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(CreateInvitationSchema))
    body: CreateInvitationInput,
  ) {
    const created = await this.invitationsService.createInvitation(
      context,
      body,
    );
    return buildApiResponse(created);
  }

  @Post(':invitationId/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('members:revoke-invitation')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'invitationId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Revoke a pending organization invitation (requires members:revoke-invitation)',
  })
  @ApiOkResponse({ description: 'Invitation revoked' })
  async revokeInvitation(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('invitationId', new ZodValidationPipe(MembershipIdParamSchema))
    invitationId: string,
  ) {
    const revoked = await this.invitationsService.revokeInvitation(
      context,
      invitationId,
    );
    return buildApiResponse(revoked);
  }
}

@ApiTags('invitations')
@Controller('invitations')
export class InvitationAcceptanceController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('preview')
  @ApiOperation({
    summary:
      'Preview organization name and proposed role for an invitation token without exposing tenant data',
  })
  @ApiOkResponse({ description: 'Safe invitation preview' })
  async preview(@Query('token') token: string) {
    const preview = await this.invitationsService.previewInvitation(token);
    return buildApiResponse(preview);
  }

  @UseGuards(AccessTokenGuard, CsrfGuard)
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('ga_access')
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Accept a pending organization invitation as the matching authenticated user',
  })
  @ApiOkResponse({ description: 'Invitation accepted and membership activated' })
  async accept(
    @CurrentUser() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(AcceptInvitationSchema))
    body: AcceptInvitationInput,
  ) {
    const accepted = await this.invitationsService.acceptInvitation(
      actor.userId,
      body.token,
    );
    return buildApiResponse(accepted);
  }
}
