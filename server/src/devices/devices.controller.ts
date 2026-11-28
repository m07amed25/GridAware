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
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../auth/dto/zod-validation.pipe.js';
import type { OrganizationAuthorizationContext } from '../authorization/authorization.types.js';
import { OrgContext } from '../authorization/decorators/org-context.decorator.js';
import { OrgProtected } from '../authorization/decorators/org-protected.decorator.js';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { DeviceCredentialsService } from '../device-credentials/device-credentials.service.js';
import { DeviceProvisioningService } from '../device-provisioning/device-provisioning.service.js';
import { SensorsService } from '../sensors/sensors.service.js';
import { DevicesService } from './devices.service.js';
import {
  CreateDeviceSchema,
  ListDevicesQuerySchema,
  UpdateDeviceSchema,
  type CreateDeviceInput,
  type ListDevicesQueryInput,
  type UpdateDeviceInput,
} from './dto/devices.schemas.js';

@ApiTags('devices')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/devices')
@OrgProtected()
export class DevicesController {
  constructor(
    private readonly devicesService: DevicesService,
    private readonly provisioningService: DeviceProvisioningService,
    private readonly credentialsService: DeviceCredentialsService,
    private readonly sensorsService: SensorsService,
  ) {}

  @Get()
  @RequirePermissions('devices:read')
  async list(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Query(new ZodValidationPipe(ListDevicesQuerySchema))
    query: ListDevicesQueryInput,
  ) {
    return buildApiResponse(await this.devicesService.list(context, query));
  }

  @Post()
  @RequirePermissions('devices:create')
  async create(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Body(new ZodValidationPipe(CreateDeviceSchema)) body: CreateDeviceInput,
  ) {
    return buildApiResponse(await this.devicesService.create(context, body));
  }

  @Get(':deviceId')
  @RequirePermissions('devices:read')
  async findOne(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(await this.devicesService.findOne(context, deviceId));
  }

  @Patch(':deviceId')
  @RequirePermissions('devices:update')
  async update(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
    @Body(new ZodValidationPipe(UpdateDeviceSchema)) body: UpdateDeviceInput,
  ) {
    return buildApiResponse(
      await this.devicesService.update(context, deviceId, body),
    );
  }

  @Post(':deviceId/provision')
  @RequirePermissions('device-credentials:provision')
  @HttpCode(HttpStatus.OK)
  async provision(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(
      await this.provisioningService.provision(context, deviceId),
    );
  }

  @Post(':deviceId/activate')
  @RequirePermissions('devices:activate')
  @HttpCode(HttpStatus.OK)
  async activate(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(
      await this.provisioningService.activate(context, deviceId),
    );
  }

  @Post(':deviceId/suspend')
  @RequirePermissions('devices:suspend')
  @HttpCode(HttpStatus.OK)
  async suspend(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(await this.devicesService.suspend(context, deviceId));
  }

  @Post(':deviceId/reactivate')
  @RequirePermissions('devices:activate')
  @HttpCode(HttpStatus.OK)
  async reactivate(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(
      await this.devicesService.reactivate(context, deviceId),
    );
  }

  @Post(':deviceId/rotate-credentials')
  @RequirePermissions('devices:rotate-credentials')
  @HttpCode(HttpStatus.OK)
  async rotateCredentials(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(
      await this.provisioningService.rotateCredentials(context, deviceId),
    );
  }

  @Post(':deviceId/revoke')
  @RequirePermissions('devices:revoke')
  @HttpCode(HttpStatus.OK)
  async revoke(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(await this.devicesService.revoke(context, deviceId));
  }

  @Post(':deviceId/retire')
  @RequirePermissions('devices:update')
  @HttpCode(HttpStatus.OK)
  async retire(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(await this.devicesService.retire(context, deviceId));
  }

  @Get(':deviceId/credentials')
  @RequirePermissions('devices:read')
  async listCredentials(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    await this.devicesService.findOne(context, deviceId);
    return buildApiResponse(
      await this.credentialsService.listMetadata(
        context.organizationId,
        deviceId,
      ),
    );
  }

  @Get(':deviceId/sensors')
  @RequirePermissions('devices:read')
  async listAssignedSensors(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.listByDevice(context, deviceId),
    );
  }

  @Post(':deviceId/sensors/:sensorId')
  @RequirePermissions('sensors:update')
  @HttpCode(HttpStatus.OK)
  async assignSensor(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.assignToDevice(context, deviceId, sensorId),
    );
  }

  @Delete(':deviceId/sensors/:sensorId')
  @RequirePermissions('sensors:update')
  async unassignSensor(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
    @Param('sensorId') sensorId: string,
  ) {
    return buildApiResponse(
      await this.sensorsService.unassignFromDevice(context, deviceId, sensorId),
    );
  }

  @Get(':deviceId/audit-logs')
  @RequirePermissions('audit-logs:read')
  async listAuditLogs(
    @OrgContext() context: OrganizationAuthorizationContext,
    @Param('deviceId') deviceId: string,
  ) {
    return buildApiResponse(
      await this.devicesService.listAuditLogs(context, deviceId),
    );
  }
}
