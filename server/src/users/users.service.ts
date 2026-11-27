import { Injectable, Optional } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  Prisma,
  SessionRevokeReason,
  type User,
  UserStatus,
} from '../generated/prisma/client.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { UsersRepository } from './users.repository.js';

export interface SafeUserProfile {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly sessionsService?: SessionsService,
    @Optional() private readonly auditLogs?: AuditLogsService,
  ) {}

  normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findById(id);
  }

  async findByNormalizedEmail(normalizedEmail: string): Promise<User | null> {
    return this.usersRepo.findByNormalizedEmail(normalizedEmail);
  }

  async activateVerifiedUser(
    userId: string,
    now: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const user = await this.usersRepo.findById(userId, tx);
    if (!user || user.status !== UserStatus.PENDING_VERIFICATION) {
      return 0;
    }
    await this.usersRepo.updateStatus(
      userId,
      UserStatus.ACTIVE,
      { emailVerifiedAt: now },
      tx,
    );
    return 1;
  }

  async updatePasswordHash(
    userId: string,
    passwordHash: string,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    return this.usersRepo.updatePasswordHash(userId, passwordHash, tx);
  }

  async updateAccountStatus(
    userId: string,
    nextStatus: UserStatus,
  ): Promise<User> {
    const run = async (tx?: Prisma.TransactionClient) => {
      const updated = await this.usersRepo.updateStatus(
        userId,
        nextStatus,
        {},
        tx,
      );

      if (
        (nextStatus === UserStatus.SUSPENDED ||
          nextStatus === UserStatus.DEACTIVATED) &&
        this.sessionsService
      ) {
        await this.sessionsService.revokeAllForUser(
          userId,
          SessionRevokeReason.ACCOUNT_STATE_CHANGE,
          tx,
        );
      }

      if (this.auditLogs) {
        await this.auditLogs.record(
          {
            action: 'AUTH_USER_STATUS_CHANGED',
            entityType: 'User',
            entityId: userId,
            actorUserId: userId,
            metadata: { status: nextStatus },
          },
          tx,
        );
      }

      return updated;
    };

    if (this.prisma) {
      return this.prisma.$transaction((tx) => run(tx));
    }
    return run();
  }

  async createPendingUser(
    input: {
      email: string;
      displayName: string;
      passwordHash: string;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    const trimmedEmail = input.email.trim();
    const normalizedEmail = this.normalizeEmail(trimmedEmail);
    const displayName = input.displayName.trim();

    try {
      return await this.usersRepo.create(
        {
          email: trimmedEmail,
          normalizedEmail,
          displayName,
          passwordHash: input.passwordHash,
          status: UserStatus.PENDING_VERIFICATION,
        },
        tx,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw AppException.emailUnavailable();
      }
      throw error;
    }
  }

  toSafeProfile(user: User): SafeUserProfile {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      emailVerifiedAt: user.emailVerifiedAt
        ? user.emailVerifiedAt.toISOString()
        : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
