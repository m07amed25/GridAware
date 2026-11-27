import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
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
import {
  ArchiveOrganizationSchema,
  type ArchiveOrganizationInput,
  CreateOrganizationSchema,
  type CreateOrganizationInput,
  UpdateOrganizationSchema,
  type UpdateOrganizationInput,
} from './dto/organizations.schemas.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('organizations')
@ApiCookieAuth('ga_access')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @UseGuards(AccessTokenGuard)
  @Get()
  @ApiOperation({
    summary:
      'List active organizations in which the authenticated user holds an active membership',
  })
  @ApiOkResponse({ description: 'Accessible organizations list' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async listAccessible(@CurrentUser() actor: AuthenticatedActor) {
    const organizations =
      await this.organizationsService.listAccessibleForUser(actor.userId);
    return buildApiResponse(organizations);
  }

  @UseGuards(AccessTokenGuard, CsrfGuard)
  @Post()
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Create a new organization and atomically assign the creator as initial OWNER',
  })
  @ApiCreatedResponse({ description: 'Organization created with initial OWNER membership' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  async createOrganization(
    @CurrentUser() actor: AuthenticatedActor,
    @Body(new ZodValidationPipe(CreateOrganizationSchema))
    body: CreateOrganizationInput,
  ) {
    const created = await this.organizationsService.createOrganization(
      actor.userId,
      body,
    );
    return buildApiResponse(created);
  }
}

@ApiTags('organizations')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId')
@OrgProtected()
export class OrganizationDetailController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @RequirePermissions('organization:read')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiOperation({
    summary: 'Get organization profile and settings (requires organization:read)',
  })
  @ApiOkResponse({ description: 'Organization profile' })
  @ApiNotFoundResponse({ description: 'Organization not found or inaccessible' })
  async getProfile(@OrgContext() context: OrganizationAuthorizationContext) {
    const profile =
      await this.organizationsService.getOrganizationProfile(context);
    return buildApiResponse(profile);
  }

  @Patch()
  @RequirePermissions('organization:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary: 'Update organization name or timezone (requires organization:update — OWNER only)',
  })
  @ApiOkResponse({ description: 'Organization updated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Organization not found or inaccessible' })
  async updateProfile(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema))
    body: UpdateOrganizationInput,
  ) {
    const updated = await this.organizationsService.updateOrganization(
      context,
      body,
    );
    return buildApiResponse(updated);
  }

  @Post('archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('organization:archive')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary: 'Archive the active organization (requires organization:archive — OWNER only)',
  })
  @ApiOkResponse({ description: 'Organization archived' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  async archiveOrganization(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(ArchiveOrganizationSchema))
    _body: ArchiveOrganizationInput,
  ) {
    const archived =
      await this.organizationsService.archiveOrganization(context);
    return buildApiResponse(archived);
  }

  @Get('roles-matrix')
  @RequirePermissions('members:read')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiOperation({
    summary:
      'Return the authoritative 5-role permission matrix for administration reference (requires members:read)',
  })
  @ApiOkResponse({ description: 'Authoritative 5-role permission matrix' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  getRolesMatrix() {
    return buildApiResponse(this.organizationsService.getRolesMatrix());
  }
}
