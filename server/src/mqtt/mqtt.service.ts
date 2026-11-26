import { randomUUID } from 'node:crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  connect,
  type IClientPublishOptions,
  type IClientSubscribeOptions,
  type MqttClient,
} from 'mqtt';
import { EnvService } from '../config/env.service.js';
import { topicMatches } from './topic-match.js';

export type MqttMessageHandler = (
  topic: string,
  payload: Buffer,
) => void | Promise<void>;

interface Subscription {
  filter: string;
  handler: MqttMessageHandler;
  options: IClientSubscribeOptions;
}

/**
 * Shared MQTT connection to the broker (Mosquitto locally).
 *
 * Topic and payload contracts: docs/contracts/asyncapi.yaml and
 * docs/architecture/phase-3.3/mqtt-topic-message-contracts.md.
 *
 * The client connects in the background and reconnects automatically;
 * subscriptions are restored on reconnect. Use `isHealthy()` (exposed via
 * GET /api/v1/health/ready) to check readiness.
 */
@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private readonly subscriptions: Subscription[] = [];
  private mqttClient?: MqttClient;

  constructor(private readonly env: EnvService) {}

  get client(): MqttClient {
    if (!this.mqttClient) {
      throw new Error('MQTT client is not initialized');
    }
    return this.mqttClient;
  }

  onModuleInit(): void {
    const client = connect(this.env.mqttUrl, {
      clientId: `gridaware-server-${randomUUID().slice(0, 8)}`,
      username: this.env.mqttUsername,
      password: this.env.mqttPassword,
      protocolVersion: 5,
      clean: true,
      connectTimeout: 10_000,
      reconnectPeriod: 5_000,
    });
    client.on('connect', () => this.logger.log('Connected to MQTT broker'));
    client.on('reconnect', () =>
      this.logger.debug('Reconnecting to MQTT broker'),
    );
    client.on('error', (error: Error) =>
      this.logger.warn(`MQTT connection error: ${error.message}`),
    );
    client.on('message', (topic: string, payload: Buffer) =>
      this.dispatch(topic, payload),
    );
    this.mqttClient = client;

    for (const subscription of this.subscriptions) {
      this.sendSubscribe(subscription);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.mqttClient?.endAsync();
  }

  isHealthy(): boolean {
    return this.mqttClient?.connected ?? false;
  }

  /**
   * Register a handler for a topic filter (wildcards and `$share/` allowed).
   * Safe to call before the client connects.
   */
  subscribe(
    filter: string,
    handler: MqttMessageHandler,
    options: IClientSubscribeOptions = { qos: 1 },
  ): void {
    const subscription = { filter, handler, options };
    this.subscriptions.push(subscription);
    if (this.mqttClient) {
      this.sendSubscribe(subscription);
    }
  }

  async publish(
    topic: string,
    payload: string | Buffer | object,
    options: IClientPublishOptions = { qos: 1 },
  ): Promise<void> {
    const message =
      typeof payload === 'string' || Buffer.isBuffer(payload)
        ? payload
        : JSON.stringify(payload);
    await this.client.publishAsync(topic, message, options);
  }

  private sendSubscribe({ filter, options }: Subscription): void {
    this.client.subscribe(filter, options, (error) => {
      if (error) {
        this.logger.warn(`MQTT subscribe failed for ${filter}: ${error.message}`);
      } else {
        this.logger.log(`Subscribed to ${filter}`);
      }
    });
  }

  private dispatch(topic: string, payload: Buffer): void {
    for (const { filter, handler } of this.subscriptions) {
      if (!topicMatches(filter, topic)) {
        continue;
      }
      Promise.resolve()
        .then(() => handler(topic, payload))
        .catch((error: unknown) =>
          this.logger.error(
            `MQTT handler for ${filter} failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    }
  }
}
