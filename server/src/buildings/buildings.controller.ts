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
import { BuildingsService } from './buildings.service.js';
import {
  BuildingDetailQuerySchema,
  type BuildingDetailQueryInput,
  CreateBuildingSchema,
  type CreateBuildingInput,
  ListBuildingsQuerySchema,
  type ListBuildingsQueryInput,
  UpdateBuildingSchema,
  type UpdateBuildingInput,
} from './dto/buildings.schemas.js';
import {
  BuildingResponseDto,
  CreateBuildingSwaggerDto,
  ListBuildingsQuerySwaggerDto,
  UpdateBuildingSwaggerDto,
} from './dto/buildings-swagger.dto.js';

@ApiTags('buildings')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/sites/:siteId/buildings')
@OrgProtected()
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Get()
  @RequirePermissions('buildings:read')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiQuery({ type: ListBuildingsQuerySwaggerDto })
  @ApiOperation({
    summary:
      'List buildings under a verified site (requires buildings:read; includeArchived=true requires buildings:archive)',
  })
  @ApiOkResponse({ type: BuildingResponseDto, isArray: true })
  @ApiBadRequestResponse({ description: 'Invalid query parameters or cursor' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Site or organization not found' })
  async listBuildings(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Query(new ZodValidationPipe(ListBuildingsQuerySchema))
    query: ListBuildingsQueryInput,
  ) {
    const result = await this.buildingsService.list(context, siteId, query);
    return buildPaginatedApiResponse(result.items, result.pagination);
  }

  @Post()
  @RequirePermissions('buildings:create')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ type: CreateBuildingSwaggerDto })
  @ApiOperation({
    summary:
      'Create a building under an active non-archived site (requires buildings:create)',
  })
  @ApiCreatedResponse({ type: BuildingResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Parent site not found' })
  @ApiConflictResponse({
    description: 'Duplicate building code or inactive/archived parent site',
  })
  async createBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Body(new ZodValidationPipe(CreateBuildingSchema))
    body: CreateBuildingInput,
  ) {
    const created = await this.buildingsService.create(context, siteId, body);
    return buildApiResponse(created);
  }

  @Get(':buildingId')
  @RequirePermissions('buildings:read')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiParam({ name: 'buildingId', description: 'Building UUID or code' })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  @ApiOperation({
    summary:
      'Retrieve one building scoped by buildingId, siteId, and organizationId (requires buildings:read)',
  })
  @ApiOkResponse({ type: BuildingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Building not found' })
  async getBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Param('buildingId') buildingId: string,
    @Query(new ZodValidationPipe(BuildingDetailQuerySchema))
    query: BuildingDetailQueryInput,
  ) {
    const building = await this.buildingsService.findOne(
      context,
      siteId,
      buildingId,
      query.includeArchived,
    );
    return buildApiResponse(building);
  }

  @Patch(':buildingId')
  @RequirePermissions('buildings:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiParam({ name: 'buildingId', description: 'Building UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ type: UpdateBuildingSwaggerDto })
  @ApiOperation({
    summary:
      'Update editable metadata of a non-archived building (requires buildings:update)',
  })
  @ApiOkResponse({ type: BuildingResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or empty payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Building not found' })
  @ApiConflictResponse({ description: 'Building is archived' })
  async updateBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Param('buildingId') buildingId: string,
    @Body(new ZodValidationPipe(UpdateBuildingSchema))
    body: UpdateBuildingInput,
  ) {
    const updated = await this.buildingsService.update(
      context,
      siteId,
      buildingId,
      body,
    );
    return buildApiResponse(updated);
  }

  @Post(':buildingId/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('buildings:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiParam({ name: 'buildingId', description: 'Building UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Activate an inactive non-archived building (requires buildings:update)',
  })
  @ApiOkResponse({ type: BuildingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Building not found' })
  @ApiConflictResponse({ description: 'Building is already active or archived' })
  async activateBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Param('buildingId') buildingId: string,
  ) {
    const updated = await this.buildingsService.activate(
      context,
      siteId,
      buildingId,
    );
    return buildApiResponse(updated);
  }

  @Post(':buildingId/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('buildings:update')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiParam({ name: 'buildingId', description: 'Building UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Deactivate an active non-archived building (requires buildings:update)',
  })
  @ApiOkResponse({ type: BuildingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Building not found' })
  @ApiConflictResponse({
    description: 'Building is already inactive or archived',
  })
  async deactivateBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Param('buildingId') buildingId: string,
  ) {
    const updated = await this.buildingsService.deactivate(
      context,
      siteId,
      buildingId,
    );
    return buildApiResponse(updated);
  }

  @Post(':buildingId/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('buildings:archive')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiParam({ name: 'buildingId', description: 'Building UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary: 'Non-destructively archive a building (requires buildings:archive)',
  })
  @ApiOkResponse({ type: BuildingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Building not found' })
  @ApiConflictResponse({ description: 'Building is already archived' })
  async archiveBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Param('buildingId') buildingId: string,
  ) {
    const updated = await this.buildingsService.archive(
      context,
      siteId,
      buildingId,
    );
    return buildApiResponse(updated);
  }

  @Post(':buildingId/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('buildings:archive')
  @ApiParam({ name: 'organizationId', description: 'Organization UUID or slug' })
  @ApiParam({ name: 'siteId', description: 'Site UUID or code' })
  @ApiParam({ name: 'buildingId', description: 'Building UUID or code' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Restore an archived building when parent site is non-archived and ACTIVE (requires buildings:archive)',
  })
  @ApiOkResponse({ type: BuildingResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Building not found' })
  @ApiConflictResponse({
    description: 'Building is not archived or parent site is inactive/archived',
  })
  async restoreBuilding(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('siteId') siteId: string,
    @Param('buildingId') buildingId: string,
  ) {
    const updated = await this.buildingsService.restore(
      context,
      siteId,
      buildingId,
    );
    return buildApiResponse(updated);
  }
}
