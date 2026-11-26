import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import {
  deviceStatusSchema,
  telemetryEnvelopeSchema,
} from './telemetry.schemas.js';

/**
 * Contract drift guard: the zod validators must agree with the JSON Schemas
 * in docs/contracts/schemas (the source of truth) on every fixture.
 */
const schemasDir = resolve(
  import.meta.dirname,
  '../../../docs/contracts/schemas',
);
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;
const ajv = addFormats(new Ajv2020({ strict: false }));

function contract(file: string) {
  return ajv.compile(
    JSON.parse(readFileSync(resolve(schemasDir, file), 'utf8')) as object,
  );
}

const SENSOR = '987b4268-eeb5-4421-a4bb-0beeb891b2a1';
const DEVICE = 'f5b3aa39-3403-40ad-9caf-852e1b719177';
const metric = { sensorId: SENSOR, metricCode: 'temperature', value: 86.5, unit: 'Cel' };
const telemetry = {
  schemaVersion: '1.0',
  eventId: '01936f10-9a7d-7e21-9e25-4a4cb9b90a01',
  deviceId: DEVICE,
  observedAt: '2026-11-26T10:30:00.000Z',
  metrics: [metric],
};
const status = {
  schemaVersion: '1.0',
  deviceId: DEVICE,
  status: 'ONLINE',
  observedAt: '2026-11-26T10:30:00+02:00',
};

const telemetryFixtures: Record<string, unknown> = {
  minimal: telemetry,
  withOptional: {
    ...telemetry,
    simulationRunId: 'bc681e35-7e8e-4861-9ef0-9f4eec4189e9',
    metrics: [{ ...metric, observedAt: '2026-11-26T10:30:00Z', sourceQuality: 'BAD' }],
  },
  badVersion: { ...telemetry, schemaVersion: '1.1' },
  missingEventId: { ...telemetry, eventId: undefined },
  extraProp: { ...telemetry, foo: 1 },
  noMetrics: { ...telemetry, metrics: [] },
  tooManyMetrics: { ...telemetry, metrics: Array.from({ length: 65 }, () => metric) },
  metricExtraProp: { ...telemetry, metrics: [{ ...metric, x: 1 }] },
  metricCodeTooShort: { ...telemetry, metrics: [{ ...metric, metricCode: 't' }] },
  metricCodeUpper: { ...telemetry, metrics: [{ ...metric, metricCode: 'Temp' }] },
  emptyUnit: { ...telemetry, metrics: [{ ...metric, unit: '' }] },
  longUnit: { ...telemetry, metrics: [{ ...metric, unit: 'x'.repeat(25) }] },
  badQuality: { ...telemetry, metrics: [{ ...metric, sourceQuality: 'OK' }] },
  stringValue: { ...telemetry, metrics: [{ ...metric, value: '1' }] },
  badDate: { ...telemetry, observedAt: 'yesterday' },
  badUuid: { ...telemetry, deviceId: 'not-a-uuid' },
};

const statusFixtures: Record<string, unknown> = {
  minimal: status,
  withSequence: { ...status, sequence: 0 },
  allStates: { ...status, status: 'MAINTENANCE' },
  badState: { ...status, status: 'UP' },
  negativeSequence: { ...status, sequence: -1 },
  fractionalSequence: { ...status, sequence: 1.5 },
  extraProp: { ...status, battery: 90 },
  missingObservedAt: { ...status, observedAt: undefined },
};

function strip(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown;
}

function expectAgreement(
  validateContract: ReturnType<typeof contract>,
  schema: z.ZodType,
  fixtures: Record<string, unknown>,
) {
  for (const [name, fixture] of Object.entries(fixtures)) {
    const data = strip(fixture);
    const contractOk = validateContract(data);
    const zodOk = schema.safeParse(data).success;
    expect({ name, zodOk }).toEqual({ name, zodOk: contractOk });
  }
}

describe('telemetry schemas match docs/contracts', () => {
  it('telemetry envelope agrees with telemetry-envelope.schema.json', () => {
    expectAgreement(
      contract('telemetry-envelope.schema.json'),
      telemetryEnvelopeSchema,
      telemetryFixtures,
    );
  });

  it('device status agrees with device-status.schema.json', () => {
    expectAgreement(
      contract('device-status.schema.json'),
      deviceStatusSchema,
      statusFixtures,
    );
  });
});
