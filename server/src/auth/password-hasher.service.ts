import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

/**
 * OWASP-aligned Argon2id password hasher with constant-time dummy verification
 * so unknown-email and wrong-password login paths share indistinguishable latency.
 */
@Injectable()
export class PasswordHasherService {
  private static readonly ARGON2_OPTIONS = {
    algorithm: 2, // Algorithm.Argon2id (numeric literal for isolatedModules)
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  } as const;

  // Precomputed Argon2id hash with identical OWASP parameters for dummy verification.
  private static readonly DUMMY_HASH =
    '$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRmb3JkdW1teQ$q4x8F7Y4g7Q5Y1j6V3R2Q1N0M9L8K7J6H5G4F3E2D1C';

  private dummyHashPromise: Promise<string> | null = null;

  async hash(password: string): Promise<string> {
    return hash(password, PasswordHasherService.ARGON2_OPTIONS);
  }

  async verify(encodedHash: string, password: string): Promise<boolean> {
    try {
      return await verify(encodedHash, password);
    } catch {
      return false;
    }
  }

  async verifyDummy(password: string): Promise<boolean> {
    const dummy = await this.getDummyHash();
    await this.verify(dummy, password);
    return false;
  }

  private getDummyHash(): Promise<string> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = this.hash(
        'gridaware-dummy-passphrase-constant-time-check',
      ).catch(() => PasswordHasherService.DUMMY_HASH);
    }
    return this.dummyHashPromise;
  }
}
