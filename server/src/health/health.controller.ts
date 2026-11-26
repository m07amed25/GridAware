import { Controller, Get } from '@nestjs/common';
import { AppException } from '../common/exceptions/app.exception.js';
import { ErrorCode } from '../common/exceptions/error-codes.js';
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
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  getHealth(): LivenessReport {
    return this.health.getLiveness();
  }

  @Get('live')
  getLiveness(): LivenessReport {
    return this.health.getLiveness();
  }

  @Get('ready')
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
