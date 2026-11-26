import { randomUUID } from 'node:crypto';
import type {
  DeviceStatusMessage,
  TelemetryEnvelope,
  TelemetryMetric,
} from '../telemetry/telemetry.schemas.js';

export type SimulationScenario =
  | 'normal'
  | 'overheating'
  | 'vibration'
  | 'cooling_degradation'
  | 'electrical_instability';

export const SIMULATION_SCENARIOS: readonly SimulationScenario[] = [
  'normal',
  'overheating',
  'vibration',
  'cooling_degradation',
  'electrical_instability',
] as const;

export interface GeneratorIdentity {
  organizationId: string;
  siteId: string;
  deviceId: string;
  simulationRunId: string;
  sensors: {
    temperature: string;
    vibrationVelocity: string;
    voltage: string;
    frequency: string;
    loadPct: string;
  };
}

/** Deterministic local-dev UUIDs for the first vertical slice (Generator-01). */
export const DEFAULT_GENERATOR_IDENTITY: Omit<
  GeneratorIdentity,
  'simulationRunId'
> = {
  organizationId: '11111111-1111-4111-8111-111111111111',
  siteId: '22222222-2222-4222-8222-222222222222',
  deviceId: 'f5b3aa39-3403-40ad-9caf-852e1b719177',
  sensors: {
    temperature: '987b4268-eeb5-4421-a4bb-0beeb891b2a1',
    vibrationVelocity: '4f36548e-8af1-46b7-b6e6-c1e2c94dbe95',
    voltage: '7d2c6f10-3c45-4c8b-9f18-2a7e5c91a301',
    frequency: '3a8f1b24-6d71-4e92-8c53-91b4e2f6c802',
    loadPct: '5c1e9a47-8b23-4f10-a7d4-63e8b1c5d903',
  },
};

export interface SimulatorOptions {
  scenario?: SimulationScenario;
  seed?: number;
  identity?: Partial<GeneratorIdentity>;
}

/** Deterministic Mulberry32 PRNG for repeatable simulation runs. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Deterministic synthetic generator telemetry producer.
 *
 * Publishes data-plane envelopes matching docs/contracts/schemas/
 * (never writes directly to the database or emits control commands).
 */
export class GeneratorSimulator {
  readonly scenario: SimulationScenario;
  readonly seed: number;
  readonly identity: GeneratorIdentity;
  private readonly rand: () => number;
  private tick = 0;
  private statusSequence = 0;

  constructor(options: SimulatorOptions = {}) {
    this.scenario = options.scenario ?? 'normal';
    this.seed = options.seed ?? 42;
    this.rand = mulberry32(this.seed);
    this.identity = {
      ...DEFAULT_GENERATOR_IDENTITY,
      ...options.identity,
      simulationRunId: options.identity?.simulationRunId ?? randomUUID(),
      sensors: {
        ...DEFAULT_GENERATOR_IDENTITY.sensors,
        ...options.identity?.sensors,
      },
    };
  }

  private jitter(amplitude: number): number {
    return (this.rand() * 2 - 1) * amplitude;
  }

  nextEnvelope(
    now: Date = new Date(),
    eventId: string = randomUUID(),
  ): TelemetryEnvelope {
    const step = this.tick++;
    const observedAt = now.toISOString();

    let temperature = 78 + this.jitter(1.2);
    let vibration = 2.4 + this.jitter(0.25);
    let voltage = 400 + this.jitter(2.0);
    let frequency = 50 + this.jitter(0.08);
    let loadPct = 68 + this.jitter(2.5);

    switch (this.scenario) {
      case 'normal':
        break;
      case 'overheating':
        temperature += Math.min(step * 1.4, 38);
        break;
      case 'vibration':
        vibration += Math.min(step * 0.6, 9.5) + Math.abs(this.jitter(0.8));
        break;
      case 'cooling_degradation':
        temperature += Math.min(step * 0.9, 28);
        loadPct = Math.max(40, loadPct - Math.min(step * 0.4, 15));
        break;
      case 'electrical_instability':
        voltage += this.jitter(28);
        frequency += this.jitter(1.4);
        break;
    }

    const { sensors } = this.identity;
    const metrics: TelemetryMetric[] = [
      {
        sensorId: sensors.temperature,
        metricCode: 'temperature',
        value: round(temperature),
        unit: 'Cel',
        observedAt,
        sourceQuality: 'GOOD',
      },
      {
        sensorId: sensors.vibrationVelocity,
        metricCode: 'vibration_velocity',
        value: round(Math.max(0, vibration)),
        unit: 'mm/s',
        observedAt,
        sourceQuality: 'GOOD',
      },
      {
        sensorId: sensors.voltage,
        metricCode: 'voltage',
        value: round(Math.max(0, voltage)),
        unit: 'V',
        observedAt,
        sourceQuality: 'GOOD',
      },
      {
        sensorId: sensors.frequency,
        metricCode: 'frequency',
        value: round(Math.max(0, frequency)),
        unit: 'Hz',
        observedAt,
        sourceQuality: 'GOOD',
      },
      {
        sensorId: sensors.loadPct,
        metricCode: 'load_pct',
        value: round(Math.min(100, Math.max(0, loadPct))),
        unit: '%',
        observedAt,
        sourceQuality: 'GOOD',
      },
    ];

    return {
      schemaVersion: '1.0',
      eventId,
      deviceId: this.identity.deviceId,
      observedAt,
      simulationRunId: this.identity.simulationRunId,
      metrics,
    };
  }

  nextStatus(
    status: DeviceStatusMessage['status'],
    now: Date = new Date(),
  ): DeviceStatusMessage {
    return {
      schemaVersion: '1.0',
      deviceId: this.identity.deviceId,
      status,
      observedAt: now.toISOString(),
      sequence: ++this.statusSequence,
    };
  }
}
