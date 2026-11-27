import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  PasswordResetToken,
  Prisma,
} from '../generated/prisma/client.js';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async issueForUser(
    input: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<PasswordResetToken> {
    const client = tx ?? this.prisma;
    const now = new Date();

    await client.passwordResetToken.updateMany({
      where: {
        userId: input.userId,
        usedAt: null,
        invalidatedAt: null,
      },
      data: {
        invalidatedAt: now,
      },
    });

    return client.passwordResetToken.create({
      data: {
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
      },
    });
  }

  async consumeValidToken(
    tokenHash: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<PasswordResetToken | null> {
    const client = tx ?? this.prisma;
    const existing = await client.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (
      !existing ||
      existing.usedAt !== null ||
      existing.invalidatedAt !== null ||
      existing.expiresAt <= now
    ) {
      return null;
    }

    const updated = await client.passwordResetToken.updateMany({
      where: {
        id: existing.id,
        usedAt: null,
        invalidatedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (updated.count === 0) {
      return null;
    }

    return { ...existing, usedAt: now };
  }
}
