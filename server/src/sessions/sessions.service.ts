import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { TokenCryptoService } from '../auth/token-crypto.service.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { EnvService } from '../config/env.service.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  type AuthSession,
  type Prisma,
  SessionRevokeReason,
  type User,
  UserStatus,
} from '../generated/prisma/client.js';
import { SessionsRepository } from './sessions.repository.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class SessionsService {
  constructor(
    private readonly env: EnvService,
    private readonly sessionsRepo: SessionsRepository,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly auditLogs: AuditLogsService,
    private readonly prisma: PrismaService,
  ) {}

  async createSessionForLogin(
    input: {
      userId: string;
      userAgent?: string;
      ipAddress?: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<{ session: AuthSession; refreshToken: string }> {
    const run = async (client: Prisma.TransactionClient) => {
      const now = new Date();
      const active = await this.sessionsRepo.findActiveByUserOrderedLru(
        input.userId,
        now,
        client,
      );

      const maxSessions = this.env.authMaxActiveSessions;
      if (active.length >= maxSessions) {
        const evictCount = active.length - maxSessions + 1;
        const toEvict = active.slice(0, evictCount).map((s) => s.id);
        await this.sessionsRepo.revokeManyByIds(
          toEvict,
          SessionRevokeReason.MAX_SESSIONS_EVICTED,
          now,
          client,
        );
        for (const evictedId of toEvict) {
          await this.auditLogs.record(
            {
              action: 'AUTH_SESSION_EVICTED',
              entityType: 'AuthSession',
              entityId: evictedId,
              actorUserId: input.userId,
              metadata: { reason: SessionRevokeReason.MAX_SESSIONS_EVICTED },
            },
            client,
          );
        }
      }

      const secret = this.tokenCrypto.generateRandomToken();
      const refreshTokenHash = this.tokenCrypto.sha256Hex(secret);
      const idleExpiresAt = new Date(
        now.getTime() + this.env.authSessionIdleTtlDays * MS_PER_DAY,
      );
      const absoluteExpiresAt = new Date(
        now.getTime() + this.env.authSessionAbsoluteTtlDays * MS_PER_DAY,
      );

      const session = await this.sessionsRepo.create(
        {
          userId: input.userId,
          refreshTokenHash,
          userAgent: input.userAgent ? input.userAgent.slice(0, 512) : null,
          ipHash: input.ipAddress
            ? this.tokenCrypto.sha256Hex(input.ipAddress)
            : null,
          lastUsedAt: now,
          idleExpiresAt,
          absoluteExpiresAt,
        },
        client,
      );

      return {
        session,
        refreshToken: this.tokenCrypto.formatSessionToken(session.id, secret),
      };
    };

    if (tx) {
      return run(tx);
    }
    return this.prisma.$transaction(run);
  }

  async rotateSession(
    rawRefreshToken: string | undefined,
  ): Promise<{ session: AuthSession; user: User; refreshToken: string }> {
    const parsed = this.tokenCrypto.parseSessionToken(rawRefreshToken);
    if (!parsed) {
      throw AppException.sessionExpired();
    }

    const incomingHash = this.tokenCrypto.sha256Hex(parsed.secret);
    const now = new Date();

    const outcome = await this.prisma.$transaction(async (tx) => {
      const existing = await this.sessionsRepo.findByIdWithUser(
        parsed.sessionId,
        tx,
      );
      if (!existing) {
        return { kind: 'expired' as const };
      }
      if (existing.user.status !== UserStatus.ACTIVE) {
        return { kind: 'not_active' as const };
      }
      if (
        existing.revokedAt !== null ||
        now >= existing.idleExpiresAt ||
        now >= existing.absoluteExpiresAt
      ) {
        return { kind: 'expired' as const };
      }

      if (existing.refreshTokenHash !== incomingHash) {
        await this.sessionsRepo.revokeManyByIds(
          [existing.id],
          SessionRevokeReason.TOKEN_REUSE,
          now,
          tx,
        );
        await this.auditLogs.record(
          {
            action: 'AUTH_SESSION_REUSE_DETECTED',
            entityType: 'AuthSession',
            entityId: existing.id,
            actorUserId: existing.userId,
            metadata: { reason: SessionRevokeReason.TOKEN_REUSE },
          },
          tx,
        );
        return { kind: 'reuse' as const };
      }

      const nextSecret = this.tokenCrypto.generateRandomToken();
      const nextHash = this.tokenCrypto.sha256Hex(nextSecret);
      const nextIdleCandidate = new Date(
        now.getTime() + this.env.authSessionIdleTtlDays * MS_PER_DAY,
      );
      const nextIdleExpiresAt =
        nextIdleCandidate <= existing.absoluteExpiresAt
          ? nextIdleCandidate
          : existing.absoluteExpiresAt;

      const updated = await this.sessionsRepo.rotateIfHashMatches(
        existing.id,
        incomingHash,
        {
          refreshTokenHash: nextHash,
          lastUsedAt: now,
          idleExpiresAt: nextIdleExpiresAt,
        },
        tx,
      );

      if (updated === 0) {
        await this.sessionsRepo.revokeManyByIds(
          [existing.id],
          SessionRevokeReason.TOKEN_REUSE,
          now,
          tx,
        );
        await this.auditLogs.record(
          {
            action: 'AUTH_SESSION_REUSE_DETECTED',
            entityType: 'AuthSession',
            entityId: existing.id,
            actorUserId: existing.userId,
            metadata: { reason: SessionRevokeReason.TOKEN_REUSE },
          },
          tx,
        );
        return { kind: 'reuse' as const };
      }

      await this.auditLogs.record(
        {
          action: 'AUTH_SESSION_REFRESHED',
          entityType: 'AuthSession',
          entityId: existing.id,
          actorUserId: existing.userId,
        },
        tx,
      );

      return {
        kind: 'rotated' as const,
        session: {
          ...existing,
          refreshTokenHash: nextHash,
          lastUsedAt: now,
          idleExpiresAt: nextIdleExpiresAt,
        },
        user: existing.user,
        refreshToken: this.tokenCrypto.formatSessionToken(
          existing.id,
          nextSecret,
        ),
      };
    });

    if (outcome.kind === 'not_active') {
      throw AppException.accountNotActive();
    }
    if (outcome.kind === 'expired' || outcome.kind === 'reuse') {
      throw AppException.sessionExpired();
    }

    return {
      session: outcome.session,
      user: outcome.user,
      refreshToken: outcome.refreshToken,
    };
  }

  async listActiveSessions(userId: string): Promise<AuthSession[]> {
    return this.sessionsRepo.findActiveByUserOrderedLru(userId, new Date());
  }

  async findActiveById(sessionId: string): Promise<AuthSession | null> {
    const session = await this.sessionsRepo.findById(sessionId);
    if (!session || session.revokedAt !== null) {
      return null;
    }
    const now = new Date();
    if (now >= session.idleExpiresAt || now >= session.absoluteExpiresAt) {
      return null;
    }
    return session;
  }

  async revokeSessionById(
    sessionId: string,
    userId: string,
    reason: SessionRevokeReason,
  ): Promise<boolean> {
    const count = await this.sessionsRepo.revokeById(
      sessionId,
      userId,
      reason,
      new Date(),
    );
    if (count > 0) {
      await this.auditLogs.record({
        action: 'AUTH_SESSION_REVOKED',
        entityType: 'AuthSession',
        entityId: sessionId,
        actorUserId: userId,
        metadata: { reason },
      });
    }
    return count > 0;
  }

  async revokeAllForUser(
    userId: string,
    reason: SessionRevokeReason,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const count = await this.sessionsRepo.revokeAllForUser(
      userId,
      reason,
      new Date(),
      tx,
    );
    if (count > 0) {
      await this.auditLogs.record(
        {
          action: 'AUTH_SESSION_LOGOUT_ALL',
          entityType: 'User',
          entityId: userId,
          actorUserId: userId,
          metadata: { reason, revokedCount: count },
        },
        tx,
      );
    }
    return count;
  }
}
