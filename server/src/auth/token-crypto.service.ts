import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { EnvService } from '../config/env.service.js';
import type { UserStatus } from '../generated/prisma/enums.js';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  email: string;
  status: UserStatus;
}

export interface ParsedSessionToken {
  sessionId: string;
  secret: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class TokenCryptoService {
  private readonly secretKey: Uint8Array;

  constructor(private readonly env: EnvService) {
    this.secretKey = new TextEncoder().encode(env.authAccessTokenSecret);
  }

  generateRandomToken(): string {
    return randomBytes(32).toString('base64url');
  }

  sha256Hex(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  formatSessionToken(sessionId: string, secret: string): string {
    return `${sessionId}.${secret}`;
  }

  parseSessionToken(raw: string | undefined): ParsedSessionToken | null {
    if (!raw || typeof raw !== 'string') {
      return null;
    }
    const dotIndex = raw.indexOf('.');
    if (dotIndex <= 0 || dotIndex === raw.length - 1) {
      return null;
    }
    const sessionId = raw.slice(0, dotIndex);
    const secret = raw.slice(dotIndex + 1);
    if (!UUID_PATTERN.test(sessionId) || secret.length < 16 || secret.includes('.')) {
      return null;
    }
    return { sessionId, secret };
  }

  async signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return new SignJWT({
      sid: payload.sid,
      email: payload.email,
      status: payload.status,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(payload.sub)
      .setIssuer(this.env.authIssuer)
      .setAudience(this.env.authAudience)
      .setIssuedAt()
      .setExpirationTime(this.env.authAccessTokenTtl)
      .sign(this.secretKey);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    const { payload } = await jwtVerify(token, this.secretKey, {
      algorithms: ['HS256'],
      issuer: this.env.authIssuer,
      audience: this.env.authAudience,
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload['sid'] !== 'string' ||
      typeof payload['email'] !== 'string' ||
      typeof payload['status'] !== 'string'
    ) {
      throw new Error('Malformed access token claims');
    }

    return {
      sub: payload.sub,
      sid: payload['sid'],
      email: payload['email'],
      status: payload['status'] as UserStatus,
    };
  }
}
