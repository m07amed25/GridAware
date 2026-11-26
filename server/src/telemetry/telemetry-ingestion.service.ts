import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MqttService } from '../mqtt/mqtt.service.js';
import { TelemetryStoreService } from './telemetry-store.service.js';
import {
  STATUS_SUBSCRIPTION,
  TELEMETRY_SUBSCRIPTION,
  parseDeviceTopic,
} from './telemetry-topic.js';
import {
  contentHash,
  validateDeviceStatus,
  validateTelemetry,
  type RejectReason,
} from './telemetry-validation.js';

export type IngestOutcome =
  | { result: 'accepted'; eventId: string; readings: number }
  | { result: 'duplicate'; eventId: string }
  | { result: 'conflict'; eventId: string }
  | { result: 'rejected'; reason: RejectReason | 'INVALID_TOPIC'; detail: string };

export type StatusOutcome =
  | { result: 'accepted' }
  | { result: 'stale' }
  | { result: 'rejected'; reason: RejectReason | 'INVALID_TOPIC'; detail: string };

export interface IngestionStats {
  telemetry: { accepted: number; duplicate: number; conflict: number };
  status: { accepted: number; stale: number };
  rejected: Partial<Record<RejectReason | 'INVALID_TOPIC', number>>;
}

/**
 * MQTT ingestion boundary for device telemetry and status
 * (docs/architecture/phase-3.3/mqtt-topic-message-contracts.md).
 *
 * Pipeline: topic parse -> size/JSON/schema validation -> device and
 * timestamp checks -> idempotency claim -> latest-value cache.
 *
 * Not yet implemented (needs the Prisma data model / device registry):
 * device credential + Sensor ownership checks, unit conversion, quality
 * computation, and atomic TelemetryEvent/Reading/Outbox persistence.
 */
@Injectable()
export class TelemetryIngestionService implements OnModuleInit {
  private readonly logger = new Logger(TelemetryIngestionService.name);
  private readonly stats: IngestionStats = {
    telemetry: { accepted: 0, duplicate: 0, conflict: 0 },
    status: { accepted: 0, stale: 0 },
    rejected: {},
  };

  constructor(
    private readonly mqtt: MqttService,
    private readonly store: TelemetryStoreService,
  ) {}

  onModuleInit(): void {
    this.mqtt.subscribe(TELEMETRY_SUBSCRIPTION, async (topic, payload) => {
      await this.handleTelemetry(topic, payload);
    });
    this.mqtt.subscribe(STATUS_SUBSCRIPTION, async (topic, payload) => {
      await this.handleStatus(topic, payload);
    });
  }

  getStats(): IngestionStats {
    return structuredClone(this.stats);
  }

  async handleTelemetry(
    topic: string,
    payload: Buffer,
    now: Date = new Date(),
  ): Promise<IngestOutcome> {
    const parsedTopic = parseDeviceTopic(topic);
    if (!parsedTopic || parsedTopic.channel !== 'telemetry') {
      return this.rejected(topic, 'INVALID_TOPIC', 'not a telemetry topic');
    }

    const validation = validateTelemetry(parsedTopic, payload, now);
    if (!validation.ok) {
      return this.rejected(topic, validation.reason, validation.detail);
    }

    const envelope = validation.value;
    const { organizationId, siteId, deviceId } = parsedTopic;
    const eventId = envelope.eventId.toLowerCase();

    const claim = await this.store.claimEvent(
      organizationId,
      deviceId,
      eventId,
      contentHash(envelope),
    );
    if (claim === 'duplicate') {
      this.stats.telemetry.duplicate++;
      this.logger.debug(`Duplicate telemetry event ${eventId} ignored`);
      return { result: 'duplicate', eventId };
    }
    if (claim === 'conflict') {
      this.stats.telemetry.conflict++;
      this.logger.warn(
        `Telemetry event ${eventId} from device ${deviceId} reused with different content; quarantined`,
      );
      return { result: 'conflict', eventId };
    }

    try {
      await this.store.recordLatest(organizationId, siteId, envelope, now);
    } catch (error) {
      // Allow a QoS 1 redelivery to retry instead of being treated as duplicate.
      await this.store
        .releaseEvent(organizationId, deviceId, eventId)
        .catch(() => undefined);
      throw error;
    }

    this.stats.telemetry.accepted++;
    return {
      result: 'accepted',
      eventId,
      readings: envelope.metrics.length,
    };
  }

  async handleStatus(
    topic: string,
    payload: Buffer,
    now: Date = new Date(),
  ): Promise<StatusOutcome> {
    const parsedTopic = parseDeviceTopic(topic);
    if (!parsedTopic || parsedTopic.channel !== 'status') {
      return this.rejected(topic, 'INVALID_TOPIC', 'not a status topic');
    }

    const validation = validateDeviceStatus(parsedTopic, payload, now);
    if (!validation.ok) {
      return this.rejected(topic, validation.reason, validation.detail);
    }

    const stored = await this.store.recordStatus(
      parsedTopic.organizationId,
      validation.value,
      now,
    );
    if (!stored) {
      this.stats.status.stale++;
      return { result: 'stale' };
    }

    this.stats.status.accepted++;
    this.logger.log(
      `Device ${parsedTopic.deviceId} status ${validation.value.status}`,
    );
    return { result: 'accepted' };
  }

  private rejected(
    topic: string,
    reason: RejectReason | 'INVALID_TOPIC',
    detail: string,
  ): { result: 'rejected'; reason: RejectReason | 'INVALID_TOPIC'; detail: string } {
    this.stats.rejected[reason] = (this.stats.rejected[reason] ?? 0) + 1;
    this.logger.warn(`Rejected message on ${topic.slice(0, 200)}: ${reason} (${detail})`);
    return { result: 'rejected', reason, detail };
  }
}
