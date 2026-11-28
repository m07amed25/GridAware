import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../auth/dto/zod-validation.pipe.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { OrgContext } from '../authorization/decorators/org-context.decorator.js';
import { OrgProtected } from '../authorization/decorators/org-protected.decorator.js';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import {
  CreateSensorSchema,
  ListSensorsQuerySchema,
  ReplaceSensorMetricsSchema,
  UpdateSensorSchema,
  type CreateSensorInput,
  type ListSensorsQueryInput,
  type ReplaceSensorMetricsInput,
  type UpdateSensorInput,
} from './dto/sensors.schemas.js';
import { SensorsService } from './sensors.service.js';

@ApiTags('sensors')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/sensors')
@OrgProtected()
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Get()
  @RequirePermissions('sensors:read')
  async list(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Query(new ZodValidationPipe(ListSensorsQuerySchema))
    query: ListSensorsQueryInput,
  ) {
    return buildApiResponse(await this.sensorsService.list(context, query));
  }

  @Post()
  @RequirePermissions('sensors:create')
  async create(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(CreateSensorSchema)) body: CreateSensorInput,
  ) {
    return buildApiResponse(await this.sensorsService.create(context, body));
  }

  @Get(':sensorId')
  @RequirePermissions('sensors:read')
  async findOne(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(await this.sensorsService.findOne(context, sensorId));
  }

  @Patch(':sensorId')
  @RequirePermissions('sensors:update')
  async update(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
    @Body(new ZodValidationPipe(UpdateSensorSchema)) body: UpdateSensorInput,
  ) {
    return buildApiResponse(
      await this.sensorsService.update(context, sensorId, body),
    );
  }

  @Post(':sensorId/activate')
  @RequirePermissions('sensors:update')
  @HttpCode(HttpStatus.OK)
  async activate(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.activate(context, sensorId),
    );
  }

  @Post(':sensorId/maintenance')
  @RequirePermissions('sensors:maintenance')
  @HttpCode(HttpStatus.OK)
  async startMaintenance(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.startMaintenance(context, sensorId),
    );
  }

  @Post(':sensorId/disable')
  @RequirePermissions('sensors:disable')
  @HttpCode(HttpStatus.OK)
  async disable(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(await this.sensorsService.disable(context, sensorId));
  }

  @Post(':sensorId/enable')
  @RequirePermissions('sensors:update')
  @HttpCode(HttpStatus.OK)
  async enable(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(await this.sensorsService.enable(context, sensorId));
  }

  @Post(':sensorId/retire')
  @RequirePermissions('sensors:update')
  @HttpCode(HttpStatus.OK)
  async retire(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(await this.sensorsService.retire(context, sensorId));
  }

  @Get(':sensorId/metrics')
  @RequirePermissions('sensors:read')
  async listMetrics(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.listMetrics(context, sensorId),
    );
  }

  @Put(':sensorId/metrics')
  @RequirePermissions('sensors:update')
  async replaceMetrics(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
    @Body(new ZodValidationPipe(ReplaceSensorMetricsSchema))
    body: ReplaceSensorMetricsInput,
  ) {
    return buildApiResponse(
      await this.sensorsService.replaceMetrics(context, sensorId, body),
    );
  }

  @Get(':sensorId/audit-logs')
  @RequirePermissions('audit-logs:read')
  async listAuditLogs(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.listAuditLogs(context, sensorId),
    );
  }
}
