import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CredentialHasher {
  generateSecret(): string {
    return randomBytes(32).toString('base64url');
  }

  async hashSecret(plaintext: string): Promise<string> {
    return hash(plaintext);
  }

  async verifySecret(secretHash: string, plaintext: string): Promise<boolean> {
    return verify(secretHash, plaintext);
  }
}
