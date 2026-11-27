import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
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
  ListMembersQuerySchema,
  type ListMembersQueryInput,
  MembershipIdParamSchema,
  TransferOwnershipSchema,
  type TransferOwnershipInput,
  UpdateMemberRoleSchema,
  type UpdateMemberRoleInput,
} from './dto/memberships.schemas.js';
import {
  MemberSummaryDto,
  OwnershipTransferDataDto,
  TransferOwnershipDto,
  UpdateMemberRoleDto,
} from './dto/memberships-swagger.dto.js';
import { MembershipsService } from './memberships.service.js';

@ApiTags('memberships')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId')
@OrgProtected()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('members')
  @RequirePermissions('members:read')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiOperation({
    summary: 'List paginated organization members (requires members:read)',
  })
  @ApiOkResponse({ type: MemberSummaryDto, isArray: true })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid session' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({
    description: 'Organization not found or caller has no active membership',
  })
  async listMembers(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Query(new ZodValidationPipe(ListMembersQuerySchema))
    query: ListMembersQueryInput,
  ) {
    const result = await this.membershipsService.listMembers(context, query);
    return buildPaginatedApiResponse(result.items, result.pagination);
  }

  @Get('members/:membershipId')
  @RequirePermissions('members:read')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiOperation({
    summary: 'Get tenant-scoped organization member detail (requires members:read)',
  })
  @ApiOkResponse({ type: MemberSummaryDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions' })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  async getMember(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('membershipId', new ZodValidationPipe(MembershipIdParamSchema))
    membershipId: string,
  ) {
    const member = await this.membershipsService.getMember(
      context,
      membershipId,
    );
    return buildApiResponse(member);
  }

  @Patch('members/:membershipId/role')
  @RequirePermissions('members:update-role')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ type: UpdateMemberRoleDto })
  @ApiOperation({
    summary:
      'Update a non-owner member role to another non-owner role (requires members:update-role)',
  })
  @ApiOkResponse({ type: MemberSummaryDto })
  @ApiForbiddenResponse({
    description: 'Insufficient permissions, CSRF failure, or self-role change',
  })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  @ApiConflictResponse({ description: 'Invalid role transition' })
  async updateRole(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('membershipId', new ZodValidationPipe(MembershipIdParamSchema))
    membershipId: string,
    @Body(new ZodValidationPipe(UpdateMemberRoleSchema))
    body: UpdateMemberRoleInput,
  ) {
    const updated = await this.membershipsService.updateMemberRole(
      context,
      membershipId,
      body,
    );
    return buildApiResponse(updated);
  }

  @Post('members/:membershipId/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('members:suspend')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Suspend an active membership (requires members:suspend; protects last active OWNER)',
  })
  @ApiOkResponse({ type: MemberSummaryDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  @ApiConflictResponse({
    description: 'Last active owner protection or invalid state transition',
  })
  async suspendMember(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('membershipId', new ZodValidationPipe(MembershipIdParamSchema))
    membershipId: string,
  ) {
    const updated = await this.membershipsService.suspendMember(
      context,
      membershipId,
    );
    return buildApiResponse(updated);
  }

  @Post('members/:membershipId/reactivate')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('members:suspend')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary: 'Reactivate a suspended membership (requires members:suspend)',
  })
  @ApiOkResponse({ type: MemberSummaryDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  @ApiConflictResponse({ description: 'Invalid state transition' })
  async reactivateMember(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('membershipId', new ZodValidationPipe(MembershipIdParamSchema))
    membershipId: string,
  ) {
    const updated = await this.membershipsService.reactivateMember(
      context,
      membershipId,
    );
    return buildApiResponse(updated);
  }

  @Delete('members/:membershipId')
  @RequirePermissions('members:remove')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiOperation({
    summary:
      'Soft-remove an eligible membership (requires members:remove; protects last active OWNER)',
  })
  @ApiOkResponse({ type: MemberSummaryDto })
  @ApiForbiddenResponse({ description: 'Insufficient permissions or CSRF failure' })
  @ApiNotFoundResponse({ description: 'Organization or member not found' })
  @ApiConflictResponse({
    description: 'Last active owner protection or already removed',
  })
  async removeMember(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('membershipId', new ZodValidationPipe(MembershipIdParamSchema))
    membershipId: string,
  ) {
    const updated = await this.membershipsService.removeMember(
      context,
      membershipId,
    );
    return buildApiResponse(updated);
  }

  @Post('ownership-transfer')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('members:update-role', 'organization:update')
  @ApiParam({ name: 'organizationId', format: 'uuid' })
  @ApiHeader({ name: 'X-CSRF-Token', required: true })
  @ApiBody({ type: TransferOwnershipDto })
  @ApiOperation({
    summary:
      'Atomically transfer organization ownership to an active member (OWNER only)',
  })
  @ApiOkResponse({ type: OwnershipTransferDataDto })
  @ApiForbiddenResponse({ description: 'Only active OWNER may transfer ownership' })
  @ApiNotFoundResponse({ description: 'Organization or target member not found' })
  @ApiConflictResponse({ description: 'Target member is not eligible for transfer' })
  async transferOwnership(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(TransferOwnershipSchema))
    body: TransferOwnershipInput,
  ) {
    const result = await this.membershipsService.transferOwnership(
      context,
      body,
    );
    return buildApiResponse(result);
  }
}
