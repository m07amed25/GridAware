import { Global, Module } from '@nestjs/common';
import { LocationMetricsService } from './location-metrics.service.js';

@Global()
@Module({
  providers: [LocationMetricsService],
  exports: [LocationMetricsService],
})
export class ObservabilityModule {}
