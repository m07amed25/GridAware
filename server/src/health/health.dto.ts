import { ApiProperty } from '@nestjs/swagger';
import type {
  DependencyCheckResult,
  DependencyName,
  DependencyStatus,
  LivenessReport,
  ReadinessReport,
} from './health.service.js';

export class DependencyCheckResultDto implements DependencyCheckResult {
  @ApiProperty({
    description: 'Health state of the dependency',
    enum: ['up', 'down'],
    example: 'up',
  })
  status!: DependencyStatus;

  @ApiProperty({
    description: 'Probe latency in milliseconds',
    example: 3.42,
  })
  latencyMs!: number;
}

export class DependencyChecksDto
  implements Record<DependencyName, DependencyCheckResult>
{
  @ApiProperty({ type: () => DependencyCheckResultDto })
  database!: DependencyCheckResultDto;

  @ApiProperty({ type: () => DependencyCheckResultDto })
  redis!: DependencyCheckResultDto;

  @ApiProperty({ type: () => DependencyCheckResultDto })
  mqtt!: DependencyCheckResultDto;
}

export class LivenessReportDto implements LivenessReport {
  @ApiProperty({
    description: 'Process liveness state',
    enum: ['ok'],
    example: 'ok',
  })
  status!: 'ok';

  @ApiProperty({
    description: 'Service identifier',
    example: 'gridaware-server',
  })
  service!: string;

  @ApiProperty({
    description: 'ISO-8601 UTC timestamp of the probe evaluation',
    format: 'date-time',
    example: '2026-11-26T22:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Process uptime in whole seconds',
    example: 128,
  })
  uptimeSeconds!: number;
}

export class ReadinessReportDto implements ReadinessReport {
  @ApiProperty({
    description: 'Aggregate readiness state across required dependencies',
    enum: ['ok', 'degraded'],
    example: 'ok',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({
    description: 'Service identifier',
    example: 'gridaware-server',
  })
  service!: string;

  @ApiProperty({
    description: 'Per-dependency readiness probe results',
    type: () => DependencyChecksDto,
  })
  checks!: DependencyChecksDto;

  @ApiProperty({
    description: 'ISO-8601 UTC timestamp of the probe evaluation',
    format: 'date-time',
    example: '2026-11-26T22:00:00.000Z',
  })
  timestamp!: string;
}
