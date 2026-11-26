import { describe, expect, it } from 'vitest';
import {
  deviceStatusSchema,
  telemetryEnvelopeSchema,
} from '../telemetry/telemetry.schemas.js';
import {
  GeneratorSimulator,
  SIMULATION_SCENARIOS,
} from './generator-simulator.js';

describe('GeneratorSimulator', () => {
  const fixedNow = new Date('2026-11-26T12:00:00.000Z');
  const fixedRunId = 'bc681e35-7e8e-4861-9ef0-9f4eec4189e9';
  const fixedEventId = '01936f10-9a7d-7e21-9e25-4a4cb9b90a01';

  it('produces identical envelopes for the same seed and scenario', () => {
    const a = new GeneratorSimulator({
      scenario: 'normal',
      seed: 123,
      identity: { simulationRunId: fixedRunId },
    });
    const b = new GeneratorSimulator({
      scenario: 'normal',
      seed: 123,
      identity: { simulationRunId: fixedRunId },
    });

    expect(a.nextEnvelope(fixedNow, fixedEventId)).toEqual(
      b.nextEnvelope(fixedNow, fixedEventId),
    );
  });

  it.each(SIMULATION_SCENARIOS)(
    'emits contract-valid telemetry for scenario %s',
    (scenario) => {
      const sim = new GeneratorSimulator({ scenario, seed: 7 });
      const envelope = sim.nextEnvelope(fixedNow);
      expect(telemetryEnvelopeSchema.safeParse(envelope).success).toBe(true);
      expect(envelope.metrics).toHaveLength(5);
    },
  );

  it('ramps temperature during overheating scenario', () => {
    const sim = new GeneratorSimulator({ scenario: 'overheating', seed: 1 });
    const first = sim.nextEnvelope(fixedNow);
    for (let i = 0; i < 15; i++) {
      sim.nextEnvelope(fixedNow);
    }
    const later = sim.nextEnvelope(fixedNow);

    const temp = (e: typeof first) =>
      e.metrics.find((m) => m.metricCode === 'temperature')!.value;
    expect(temp(later)).toBeGreaterThan(temp(first) + 15);
  });

  it('emits contract-valid device status messages with increasing sequence', () => {
    const sim = new GeneratorSimulator();
    const online = sim.nextStatus('ONLINE', fixedNow);
    const offline = sim.nextStatus('OFFLINE', fixedNow);

    expect(deviceStatusSchema.safeParse(online).success).toBe(true);
    expect(deviceStatusSchema.safeParse(offline).success).toBe(true);
    expect(offline.sequence).toBe((online.sequence ?? 0) + 1);
  });
});
