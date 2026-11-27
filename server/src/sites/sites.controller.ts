import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../auth/dto/zod-validation.pipe.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { OrgContext } from '../authorization/decorators/org-context.decorator.js';
import { OrgProtected } from '../authorization/decorators/org-protected.decorator.js';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import {
  buildApiResponse,
  buildPaginatedApiResponse,
} from '../common/envelopes/api-response.js';
import {
  CreateSiteSchema,
  type CreateSiteInput,
  ListSitesQuerySchema,
  type ListSitesQueryInput,
  SiteDetailQuerySchema,
  type SiteDetailQueryInput,
  UpdateSiteSchema,
  type UpdateSiteInput,
} from './dto/sites.schemas.js';
import {
  CreateSiteSwaggerDto,
  ListSitesQuerySwaggerDto,
  SiteResponseDto,
  UpdateSiteSwaggerDto,
} from './dto/sites-swagger.dto.js';
import { SitesService } from './sites.service.js';

@ApiTags('sites')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/sites')
@OrgProtected()
export class SitesController {
  constructor(private readonly sitesService: SitesService) {}

  @Get()
  @RequirePermissions('sites:read')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiQuery({ type: ListSitesQuerySwaggerDto })
  @ApiOperation({
    summary:
      'List sites belonging to the active organization (requires sites:read; includeArchived=true requires sites:archive)',
  })
  @ApiOkResponse({ type: SiteResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid query parameters or cursor' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({
    description: 'Organization not found or caller has no active membership',
  })
  async listSites(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Query(new ZodValidationPipe(ListSitesQuerySchema))
    query: ListSitesQueryInput,
  ) {
    const result = await this.sitesService.list(context, query);
    return buildPaginatedApiResponse(result.items, result.pagination);
  }

  @Post()
  @RequirePermissions('sites:create')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ type: CreateSiteSwaggerDto })
  @ApiOperation({
    summary: 'Create a site under the active organization (requires sites:create)',
  })
  @ApiCreatedResponse({ type: SiteResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiConflictResponse({ description: 'Duplicate site code in organization' })
  async createSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(CreateSiteSchema))
    body: CreateSiteInput,
  ) {
    const created = await this.sitesService.create(context, body);
    return buildApiResponse(created);
  }

  @Get(':siteId')
  @RequirePermissions('sites:read')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOperation({
    summary:
      'Retrieve one site in the active organization (requires sites:read; includeArchived=true requires sites:archive)',
  })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  async getSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Query(new ZodValidationPipe(SiteDetailQuerySchema))
    query: SiteDetailQueryInput,
  ) {
    const site = await this.sitesService.findOne(
      context,
      siteId,
      query.includeArchived,
    );
    return buildApiResponse(site);
  }

  @Patch(':siteId')
  @RequirePermissions('sites:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ type: UpdateSiteSwaggerDto })
  @ApiOperation({
    summary:
      'Update editable metadata of a non-archived site (requires sites:update)',
  })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or empty payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiConflictResponse({ description: 'Site is archived' })
  async updateSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(UpdateSiteSchema))
    body: UpdateSiteInput,
  ) {
    const updated = await this.sitesService.update(context, siteId, body);
    return buildApiResponse(updated);
  }

  @Post(':siteId/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sites:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary: 'Activate an inactive non-archived site (requires sites:update)',
  })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiConflictResponse({ description: 'Site is already active or archived' })
  async activateSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
  ) {
    const updated = await this.sitesService.activate(context, siteId);
    return buildApiResponse(updated);
  }

  @Post(':siteId/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sites:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Deactivate an active non-archived site without altering child buildings (requires sites:update)',
  })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiConflictResponse({ description: 'Site is already inactive or archived' })
  async deactivateSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
  ) {
    const updated = await this.sitesService.deactivate(context, siteId);
    return buildApiResponse(updated);
  }

  @Post(':siteId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sites:archive')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Non-destructively archive a site when zero non-archived buildings remain (requires sites:archive)',
  })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiConflictResponse({
    description: 'Site has non-archived buildings or is already archived',
  })
  async archiveSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
  ) {
    const updated = await this.sitesService.archive(context, siteId);
    return buildApiResponse(updated);
  }

  @Post(':siteId/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('sites:archive')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Restore an archived site in an active organization (requires sites:archive)',
  })
  @ApiOkResponse({ type: SiteResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Site not found' })
  @ApiConflictResponse({ description: 'Site is not archived' })
  async restoreSite(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
  ) {
    const updated = await this.sitesService.restore(context, siteId);
    return buildApiResponse(updated);
  }
}
