import { Module } from '@nestjs/common';
import { TelemetryIngestionService } from './telemetry-ingestion.service.js';
import { TelemetryStoreService } from './telemetry-store.service.js';

@Module({
  providers: [TelemetryStoreService, TelemetryIngestionService],
  exports: [TelemetryStoreService, TelemetryIngestionService],
})
export class TelemetryModule {}
