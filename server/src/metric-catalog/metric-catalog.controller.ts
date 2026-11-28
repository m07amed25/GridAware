import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { OrgProtected } from '../authorization/decorators/org-protected.decorator.js';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator.js';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { MetricCatalogService } from './metric-catalog.service.js';

@ApiTags('metric-definitions')
@ApiCookieAuth('ga_access')
@Controller('organizations/:organizationId/metric-definitions')
@OrgProtected()
export class MetricCatalogController {
  constructor(private readonly metricCatalogService: MetricCatalogService) {}

  @Get()
  @RequirePermissions('sensors:read')
  async list() {
    const items = await this.metricCatalogService.listActive();
    return buildApiResponse(items);
  }
}
