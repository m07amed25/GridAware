import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../auth/dto/zod-validation.pipe.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { OrgContext } from '../authorization/decorators/org-context.decorator.js';
import { OrgProtected } from '../authorization/decorators/org-protected.decorator.js';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import {
  AssetsService,
  CreateAssetSchema,
  ListAssetsQuerySchema,
  type CreateAssetInput,
  type ListAssetsQueryInput,
} from './assets.service.js';

@ApiTags('assets')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/assets')
@OrgProtected()
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Get()
  @RequirePermissions('assets:read')
  async list(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Query(new ZodValidationPipe(ListAssetsQuerySchema))
    query: ListAssetsQueryInput,
  ) {
    const result = await this.assetsService.list(context, query);
    return buildApiResponse(result);
  }

  @Post()
  @RequirePermissions('assets:create')
  async create(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(CreateAssetSchema)) body: CreateAssetInput,
  ) {
    const asset = await this.assetsService.create(context, body);
    return buildApiResponse(asset);
  }

  @Get(':assetId')
  @RequirePermissions('assets:read')
  async findOne(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('assetId') assetId: string,
  ) {
    const asset = await this.assetsService.findOne(context, assetId);
    return buildApiResponse(asset);
  }
}
