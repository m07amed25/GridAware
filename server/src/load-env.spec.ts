import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvIfPresent } from './load-env.js';

describe('loadEnvIfPresent', () => {
  const originalPort = process.env.PORT;
  const originalCors = process.env.CORS_ORIGIN;

  afterEach(() => {
    if (originalPort === undefined) delete process.env.PORT;
    else process.env.PORT = originalPort;
    if (originalCors === undefined) delete process.env.CORS_ORIGIN;
    else process.env.CORS_ORIGIN = originalCors;
  });

  it('loads variables from an existing .env file', () => {
    delete process.env.PORT;
    delete process.env.CORS_ORIGIN;
    const dir = mkdtempSync(join(tmpdir(), 'gridware-env-'));
    const envPath = join(dir, '.env');
    writeFileSync(envPath, 'PORT=4123\nCORS_ORIGIN=http://localhost:4000\n');

    try {
      loadEnvIfPresent(envPath);
      expect(process.env.PORT).toBe('4123');
      expect(process.env.CORS_ORIGIN).toBe('http://localhost:4000');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not throw when the .env file does not exist', () => {
    expect(() =>
      loadEnvIfPresent(join(tmpdir(), 'nonexistent-gridware-12345.env')),
    ).not.toThrow();
  });
});
