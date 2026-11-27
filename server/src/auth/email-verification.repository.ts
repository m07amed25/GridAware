import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  EmailVerificationToken,
  Prisma,
} from '../generated/prisma/client.js';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issueForUser(
    input: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<EmailVerificationToken> {
    const client = tx ?? this.prisma;
    const now = new Date();

    await client.emailVerificationToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: now,
      },
    });

    return client.emailVerificationToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async findByTokenHash(
    tokenHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<EmailVerificationToken | null> {
    return (tx ?? this.prisma).emailVerificationToken.findUnique({
      where: { tokenHash },
    });
  }

  async markUsed(
    id: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? this.prisma).emailVerificationToken.updateMany({
      where: {
        id,
        usedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    return result.count;
  }

  async consumeValidToken(
    tokenHash: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<EmailVerificationToken | null> {
    const existing = await this.findByTokenHash(tokenHash, tx);
    if (
      !existing ||
      existing.usedAt !== null ||
      existing.invalidatedAt !== null ||
      existing.expiresAt <= now
    ) {
      return null;
    }
    const updated = await this.markUsed(existing.id, now, tx);
    if (updated === 0) {
      return null;
    }
    return { ...existing, usedAt: now };
  }
}
