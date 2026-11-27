import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import type {
  AuthSession,
  Prisma,
  SessionRevokeReason,
  User,
} from '../generated/prisma/client.js';

export type AuthSessionWithUser = AuthSession & { user: User };

@Injectable()
export class SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      userId: string;
      refreshTokenHash: string;
      userAgent: string | null;
      ipHash: string | null;
      lastUsedAt: Date;
      idleExpiresAt: Date;
      absoluteExpiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession> {
    return (tx ?? this.prisma).authSession.create({ data });
  }

  async findById(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession | null> {
    return (tx ?? this.prisma).authSession.findUnique({ where: { id } });
  }

  async findByIdWithUser(
    id: string,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSessionWithUser | null> {
    return (tx ?? this.prisma).authSession.findUnique({
      where: { id },
      include: { user: true },
    });
  }

  async findActiveByUserOrderedLru(
    userId: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthSession[]> {
    return (tx ?? this.prisma).authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        idleExpiresAt: { gt: now },
        absoluteExpiresAt: { gt: now },
      },
      orderBy: [{ lastUsedAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async rotateIfHashMatches(
    id: string,
    expectedHash: string,
    data: {
      refreshTokenHash: string;
      lastUsedAt: Date;
      idleExpiresAt: Date;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? this.prisma).authSession.updateMany({
      where: {
        id,
        refreshTokenHash: expectedHash,
        revokedAt: null,
      },
      data,
    });
    return result.count;
  }

  async revokeManyByIds(
    ids: string[],
    reason: SessionRevokeReason,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }
    const result = await (tx ?? this.prisma).authSession.updateMany({
      where: {
        id: { in: ids },
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revokedReason: reason,
      },
    });
    return result.count;
  }

  async revokeById(
    id: string,
    userId: string,
    reason: SessionRevokeReason,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? this.prisma).authSession.updateMany({
      where: {
        id,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revokedReason: reason,
      },
    });
    return result.count;
  }

  async revokeAllForUser(
    userId: string,
    reason: SessionRevokeReason,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const result = await (tx ?? this.prisma).authSession.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: now,
        revokedReason: reason,
      },
    });
    return result.count;
  }
}
