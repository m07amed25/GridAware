import { describe, expect, it } from 'vitest';
import { PasswordHasherService } from './password-hasher.service.js';

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService();

  it('hashes and verifies a valid passphrase with Argon2id', async () => {
    const encoded = await service.hash('correct-horse-battery-staple');
    expect(encoded.startsWith('$argon2id$')).toBe(true);
    expect(await service.verify(encoded, 'correct-horse-battery-staple')).toBe(
      true,
    );
    expect(await service.verify(encoded, 'wrong-passphrase-12345')).toBe(false);
  });

  it('supports long passphrases up to 128+ characters without silent truncation', async () => {
    const base = 'a'.repeat(120);
    const p1 = `${base}12345678`;
    const p2 = `${base}12345679`;
    const encoded = await service.hash(p1);
    expect(await service.verify(encoded, p1)).toBe(true);
    expect(await service.verify(encoded, p2)).toBe(false);
  });

  it('executes dummy verification and always returns false', async () => {
    expect(await service.verifyDummy('any-password-input')).toBe(false);
  });
});
