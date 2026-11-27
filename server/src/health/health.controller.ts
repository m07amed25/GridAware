import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppException } from '../common/exceptions/app.exception.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
import { ProblemDetailsDto } from '../common/exceptions/problem-details.dto.js';
import { LivenessReportDto, ReadinessReportDto } from './health.dto.js';
import {
  HealthService,
  type LivenessReport,
  type ReadinessReport,
} from './health.service.js';

/**
 * Operational health probes (docs/contracts/openapi.yaml & NFR-OBS-005):
 * - GET /api/v1/health      -> liveness alias (Docker HEALTHCHECK & client helper)
 * - GET /api/v1/health/live -> process liveness (never depends on external I/O)
 * - GET /api/v1/health/ready -> dependency readiness (PostgreSQL, Redis, MQTT)
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Service liveness check (alias)',
    description:
      'Returns process liveness without querying external dependencies.',
  })
  @ApiOkResponse({
    description: 'Process is alive',
    type: LivenessReportDto,
  })
  getHealth(): LivenessReport {
    return this.health.getLiveness();
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Returns process liveness without querying external dependencies.',
  })
  @ApiOkResponse({
    description: 'Process is alive',
    type: LivenessReportDto,
  })
  getLiveness(): LivenessReport {
    return this.health.getLiveness();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Checks connectivity to PostgreSQL, Redis, and the MQTT broker within the configured timeout.',
  })
  @ApiOkResponse({
    description: 'All required dependencies are reachable',
    type: ReadinessReportDto,
  })
  @ApiServiceUnavailableResponse({
    description: 'One or more required dependencies are unavailable',
    type: ProblemDetailsDto,
  })
  async getReadiness(): Promise<ReadinessReport> {
    const report = await this.health.checkReadiness();
    if (report.status !== 'ok') {
      const errors = Object.entries(report.checks)
        .filter(([, result]) => result.status !== 'up')
        .map(([dependency]) => ({
          field: dependency,
          code: ErrorCode.DEPENDENCY_UNAVAILABLE,
          message: `The ${dependency} dependency is unavailable.`,
        }));

      throw AppException.dependencyUnavailable(
        'One or more required dependencies are unavailable.',
        errors,
      );
    }

    return report;
  }
}
