import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mqttMock = vi.hoisted(() => {
  const client = {
    connected: false,
    on: vi.fn(),
    endAsync: vi.fn(),
    publishAsync: vi.fn(),
    subscribe: vi.fn(),
  };
  const connect = vi.fn(() => client);
  return { client, connect };
});

vi.mock('mqtt', () => ({ connect: mqttMock.connect }));

import { validateServerEnv } from '../config/env.schema.js';
import { EnvService } from '../config/env.service.js';
import { MqttService } from './mqtt.service.js';

function createTestEnv(overrides: NodeJS.ProcessEnv = {}): EnvService {
  return new EnvService(
    validateServerEnv({
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
      REDIS_URL: 'redis://localhost:6379',
      MQTT_URL: 'mqtt://localhost:1883',
      ...overrides,
    }),
  );
}

describe('MqttService', () => {
  const client = mqttMock.client;

  beforeEach(() => {
    client.connected = false;
    client.endAsync.mockResolvedValue(undefined);
    client.publishAsync.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('connects to MQTT_URL with a unique server client id and optional credentials on init', () => {
    const service = new MqttService(
      createTestEnv({ MQTT_USERNAME: 'api', MQTT_PASSWORD: 'secret' }),
    );
    service.onModuleInit();

    expect(mqttMock.connect).toHaveBeenCalledWith(
      'mqtt://localhost:1883',
      expect.objectContaining({
        clientId: expect.stringMatching(/^gridaware-server-/),
        username: 'api',
        password: 'secret',
        reconnectPeriod: 5_000,
      }),
    );
  });

  it('reflects broker connection state in isHealthy', () => {
    const service = new MqttService(createTestEnv());
    expect(service.isHealthy()).toBe(false);

    service.onModuleInit();
    expect(service.isHealthy()).toBe(false);

    client.connected = true;
    expect(service.isHealthy()).toBe(true);
  });

  it('serializes object payloads as JSON with QoS 1 by default', async () => {
    const service = new MqttService(createTestEnv());
    service.onModuleInit();

    await service.publish('gridaware/test', { a: 1 });

    expect(client.publishAsync).toHaveBeenCalledWith(
      'gridaware/test',
      '{"a":1}',
      { qos: 1 },
    );
  });

  it('throws when publishing before init', async () => {
    const service = new MqttService(createTestEnv());
    await expect(service.publish('t', 'x')).rejects.toThrow(
      'MQTT client is not initialized',
    );
  });

  it('ends the client on destroy', async () => {
    const service = new MqttService(createTestEnv());
    service.onModuleInit();
    await service.onModuleDestroy();
    expect(client.endAsync).toHaveBeenCalledTimes(1);
  });

  it('subscribes registered filters once the client is created', () => {
    const service = new MqttService(createTestEnv());
    service.subscribe('a/+/c', vi.fn());
    expect(client.subscribe).not.toHaveBeenCalled();

    service.onModuleInit();
    expect(client.subscribe).toHaveBeenCalledWith(
      'a/+/c',
      { qos: 1 },
      expect.any(Function),
    );

    service.subscribe('x/#', vi.fn(), { qos: 0 });
    expect(client.subscribe).toHaveBeenLastCalledWith(
      'x/#',
      { qos: 0 },
      expect.any(Function),
    );
  });

  it('dispatches incoming messages to matching handlers only', async () => {
    const service = new MqttService(createTestEnv());
    const matching = vi.fn();
    const other = vi.fn();
    service.subscribe('$share/g/a/+/c', matching);
    service.subscribe('z/#', other);
    service.onModuleInit();

    const onMessage = client.on.mock.calls.find(
      ([event]) => event === 'message',
    )?.[1] as (topic: string, payload: Buffer) => void;
    onMessage('a/b/c', Buffer.from('hi'));
    await new Promise((r) => setImmediate(r));

    expect(matching).toHaveBeenCalledWith('a/b/c', Buffer.from('hi'));
    expect(other).not.toHaveBeenCalled();
  });
});
