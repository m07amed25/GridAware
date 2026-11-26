import { setTimeout as sleep } from 'node:timers/promises';
import { connectAsync } from 'mqtt';
import { loadEnvIfPresent } from '../load-env.js';
import { buildDeviceTopic } from '../telemetry/telemetry-topic.js';
import {
  GeneratorSimulator,
  SIMULATION_SCENARIOS,
  type SimulationScenario,
} from './generator-simulator.js';

loadEnvIfPresent();

function readArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((arg) => arg.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

function parseScenario(raw: string | undefined): SimulationScenario {
  if (!raw) {
    return 'normal';
  }
  if ((SIMULATION_SCENARIOS as readonly string[]).includes(raw)) {
    return raw as SimulationScenario;
  }
  throw new Error(
    `Unknown scenario "${raw}". Expected one of: ${SIMULATION_SCENARIOS.join(', ')}`,
  );
}

function parseNonNegativeInt(
  raw: string | undefined,
  fallback: number,
  name: string,
): number {
  if (raw === undefined) {
    return fallback;
  }
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(
      `Invalid --${name}=${raw}; expected a non-negative integer`,
    );
  }
  return value;
}

async function main(): Promise<void> {
  const mqttUrl = process.env.MQTT_URL ?? 'mqtt://localhost:1883';
  const scenario = parseScenario(readArg('scenario'));
  const intervalMs = parseNonNegativeInt(readArg('interval'), 1000, 'interval');
  const count = parseNonNegativeInt(readArg('count'), 0, 'count');
  const seed = parseNonNegativeInt(readArg('seed'), 42, 'seed');

  const simulator = new GeneratorSimulator({ scenario, seed });
  const { organizationId, siteId, deviceId, simulationRunId } =
    simulator.identity;

  const telemetryTopic = buildDeviceTopic({
    organizationId,
    siteId,
    deviceId,
    channel: 'telemetry',
  });
  const statusTopic = buildDeviceTopic({
    organizationId,
    siteId,
    deviceId,
    channel: 'status',
  });

  const willPayload = JSON.stringify({
    schemaVersion: '1.0',
    deviceId,
    status: 'OFFLINE',
    observedAt: new Date().toISOString(),
  });

  const client = await connectAsync(mqttUrl, {
    clientId: `gridaware-sim-${simulationRunId.slice(0, 8)}`,
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    protocolVersion: 5,
    clean: true,
    will: {
      topic: statusTopic,
      payload: Buffer.from(willPayload),
      qos: 1,
      retain: true,
    },
  });

  let stopping = false;
  const requestStop = () => {
    stopping = true;
  };
  process.once('SIGINT', requestStop);
  process.once('SIGTERM', requestStop);

  console.log(
    `[simulator] Connected to ${mqttUrl} | scenario=${scenario} seed=${seed} run=${simulationRunId}`,
  );
  console.log(`[simulator] Publishing to ${telemetryTopic}`);

  await client.publishAsync(
    statusTopic,
    JSON.stringify(simulator.nextStatus('ONLINE')),
    { qos: 1, retain: true },
  );

  let sent = 0;
  try {
    while (!stopping && (count === 0 || sent < count)) {
      const envelope = simulator.nextEnvelope();
      await client.publishAsync(telemetryTopic, JSON.stringify(envelope), {
        qos: 1,
        retain: false,
      });
      sent++;

      const summary = envelope.metrics
        .map((m) => `${m.metricCode}=${m.value}${m.unit}`)
        .join(' ');
      console.log(`[simulator] #${sent} ${envelope.eventId} ${summary}`);

      if (!stopping && (count === 0 || sent < count) && intervalMs > 0) {
        await sleep(intervalMs);
      }
    }
  } finally {
    await client.publishAsync(
      statusTopic,
      JSON.stringify(simulator.nextStatus('OFFLINE')),
      { qos: 1, retain: true },
    );
    await client.endAsync();
    console.log(`[simulator] Stopped after ${sent} envelope(s).`);
  }
}

await main();
