import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const contractsDir = resolve(import.meta.dirname, '../../../docs/contracts');
const authContractsPath = resolve(
  import.meta.dirname,
  '../../../specs/001-auth-identity-management/contracts/auth-openapi.yaml',
);
const schemasDir = resolve(contractsDir, 'schemas');
const addFormats = addFormatsModule as unknown as (ajv: Ajv2020) => Ajv2020;

interface RefEntry {
  ref: string;
  location: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectRefs(
  node: unknown,
  location = '$',
  acc: RefEntry[] = [],
): RefEntry[] {
  if (Array.isArray(node)) {
    node.forEach((item, index) =>
      collectRefs(item, `${location}[${index}]`, acc),
    );
    return acc;
  }
  if (!isRecord(node)) {
    return acc;
  }
  if (typeof node['$ref'] === 'string') {
    acc.push({ ref: node['$ref'], location });
  }
  for (const [key, value] of Object.entries(node)) {
    collectRefs(value, `${location}.${key}`, acc);
  }
  return acc;
}

function resolveJsonPointer(root: unknown, pointer: string): unknown {
  if (pointer === '' || pointer === '#') {
    return root;
  }
  if (!pointer.startsWith('#/')) {
    throw new Error(`Unsupported JSON pointer "${pointer}"`);
  }
  const segments = pointer
    .slice(2)
    .split('/')
    .map((segment) => segment.replaceAll('~1', '/').replaceAll('~0', '~'));

  let current: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      current = Number.isInteger(index) ? current[index] : undefined;
    } else if (isRecord(current)) {
      current = current[segment];
    } else {
      return undefined;
    }
  }
  return current;
}

function loadDocument(filePath: string): unknown {
  const raw = readFileSync(filePath, 'utf8');
  const ext = extname(filePath).toLowerCase();
  if (ext === '.json') {
    return JSON.parse(raw) as unknown;
  }
  return parse(raw, { uniqueKeys: true, strict: true }) as unknown;
}

function assertAllRefsResolve(rootDoc: unknown, baseFilePath: string): void {
  const refs = collectRefs(rootDoc);
  expect(refs.length).toBeGreaterThan(0);

  for (const { ref, location } of refs) {
    if (ref.startsWith('#')) {
      const resolved = resolveJsonPointer(rootDoc, ref);
      expect(
        resolved,
        `Unresolved internal $ref "${ref}" at ${location}`,
      ).toBeDefined();
      continue;
    }

    const hashIndex = ref.indexOf('#');
    const filePart = hashIndex === -1 ? ref : ref.slice(0, hashIndex);
    const pointerPart = hashIndex === -1 ? '' : ref.slice(hashIndex);
    const targetPath = resolve(dirname(baseFilePath), filePart);

    expect(
      existsSync(targetPath),
      `Missing external $ref file "${filePart}" referenced at ${location}`,
    ).toBe(true);

    const externalDoc = loadDocument(targetPath);
    if (pointerPart) {
      const resolved = resolveJsonPointer(externalDoc, pointerPart);
      expect(
        resolved,
        `Unresolved external pointer "${ref}" at ${location}`,
      ).toBeDefined();
    }
  }
}

describe('docs/contracts machine-readable specifications', () => {
  it('validates all JSON Schema 2020-12 files in docs/contracts/schemas', () => {
    const files = readdirSync(schemasDir)
      .filter((file) => file.endsWith('.schema.json'))
      .sort();

    expect(files).toEqual([
      'anomaly-inference-request.schema.json',
      'anomaly-inference-response.schema.json',
      'device-status.schema.json',
      'telemetry-envelope.schema.json',
    ]);

    const ajv = addFormats(new Ajv2020({ strict: true, allErrors: true }));

    for (const file of files) {
      const schema = loadDocument(resolve(schemasDir, file));
      expect(isRecord(schema)).toBe(true);
      if (!isRecord(schema)) continue;

      expect(schema['$schema']).toBe(
        'https://json-schema.org/draft/2020-12/schema',
      );
      expect(typeof schema['$id']).toBe('string');
      expect(String(schema['$id'])).toMatch(/^https:\/\//);
      expect(typeof schema['title']).toBe('string');
      expect(String(schema['title']).trim().length).toBeGreaterThan(0);

      const validate = ajv.compile(schema);
      expect(typeof validate).toBe('function');
    }
  });

  it('validates docs/contracts/openapi.yaml structure, $refs, and component schemas', () => {
    const openapiPath = resolve(contractsDir, 'openapi.yaml');
    const doc = loadDocument(openapiPath);
    expect(isRecord(doc)).toBe(true);
    if (!isRecord(doc)) return;

    expect(String(doc['openapi'])).toMatch(/^3\.1\.\d+$/);
    expect(isRecord(doc['info'])).toBe(true);
    expect(isRecord(doc['paths'])).toBe(true);
    expect(
      Object.keys(doc['paths'] as Record<string, unknown>).length,
    ).toBeGreaterThan(0);

    assertAllRefsResolve(doc, openapiPath);

    const components = doc['components'];
    expect(isRecord(components)).toBe(true);
    if (!isRecord(components) || !isRecord(components['schemas'])) {
      throw new Error('Expected components.schemas in openapi.yaml');
    }

    const docUri = 'https://contracts.gridaware.internal/openapi.yaml';
    const ajv = addFormats(new Ajv2020({ strict: false, allErrors: true }));
    ajv.addSchema(doc, docUri);

    const schemaNames = Object.keys(components['schemas']);
    expect(schemaNames.length).toBeGreaterThan(0);
    for (const schemaName of schemaNames) {
      const validate = ajv.getSchema(`${docUri}#/components/schemas/${schemaName}`);
      expect(
        validate,
        `Failed to compile OpenAPI component schema "${schemaName}"`,
      ).toBeTypeOf('function');
    }
  });

  it('validates Phase 5.1 auth-openapi.yaml structure, $refs, and component schemas', () => {
    expect(existsSync(authContractsPath)).toBe(true);
    const doc = loadDocument(authContractsPath);
    expect(isRecord(doc)).toBe(true);
    if (!isRecord(doc)) return;

    expect(String(doc['openapi'])).toMatch(/^3\.1\./);
    assertAllRefsResolve(doc, authContractsPath);

    const components = doc['components'];
    expect(isRecord(components)).toBe(true);
    if (!isRecord(components) || !isRecord(components['schemas'])) {
      throw new Error('Expected components.schemas in auth-openapi.yaml');
    }

    const docUri = 'https://contracts.gridaware.internal/auth-openapi.yaml';
    const ajv = addFormats(new Ajv2020({ strict: false, allErrors: true }));
    ajv.addSchema(doc, docUri);

    for (const schemaName of Object.keys(components['schemas'])) {
      const validate = ajv.getSchema(
        `${docUri}#/components/schemas/${schemaName}`,
      );
      expect(
        validate,
        `Failed to compile auth-openapi component schema "${schemaName}"`,
      ).toBeTypeOf('function');
    }
  });

  it('validates docs/contracts/asyncapi.yaml structure, external $refs, and inline schemas', () => {
    const asyncapiPath = resolve(contractsDir, 'asyncapi.yaml');
    const doc = loadDocument(asyncapiPath);
    expect(isRecord(doc)).toBe(true);
    if (!isRecord(doc)) return;

    expect(String(doc['asyncapi'])).toMatch(/^2\.6\.\d+$/);
    expect(isRecord(doc['info'])).toBe(true);
    expect(isRecord(doc['channels'])).toBe(true);

    assertAllRefsResolve(doc, asyncapiPath);

    const ajv = addFormats(new Ajv2020({ strict: true, allErrors: true }));
    const channels = doc['channels'] as Record<string, unknown>;
    expect(Object.keys(channels).length).toBeGreaterThan(0);

    for (const [channelName, channelValue] of Object.entries(channels)) {
      if (!isRecord(channelValue)) continue;

      if (isRecord(channelValue['parameters'])) {
        for (const [paramName, paramDef] of Object.entries(
          channelValue['parameters'],
        )) {
          if (isRecord(paramDef) && isRecord(paramDef['schema'])) {
            expect(
              ajv.compile(paramDef['schema']),
              `Invalid parameter schema ${channelName}:${paramName}`,
            ).toBeTypeOf('function');
          }
        }
      }

      const publish = channelValue['publish'];
      if (isRecord(publish) && isRecord(publish['message'])) {
        const payload = publish['message']['payload'];
        if (isRecord(payload) && typeof payload['$ref'] !== 'string') {
          expect(
            ajv.compile(payload),
            `Invalid inline payload schema on channel ${channelName}`,
          ).toBeTypeOf('function');
        }
      }
    }
  });
});
