import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AppException } from '../common/exceptions/app.exception.js';
import { EnvService } from '../config/env.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { SessionRevokeReason, UserStatus } from '../generated/prisma/enums.js';
import { MAILER_PORT, type MailerPort } from '../mail/mailer.port.js';
import { SessionsService } from '../sessions/sessions.service.js';
import { type SafeUserProfile, UsersService } from '../users/users.service.js';
import { EmailVerificationRepository } from './email-verification.repository.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { PasswordResetRepository } from './password-reset.repository.js';
import { TokenCryptoService } from './token-crypto.service.js';

const EMAIL_VERIFICATION_TTL_HOURS = 24;
const PASSWORD_RESET_TTL_MINUTES = 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly emailVerificationRepo: EmailVerificationRepository,
    private readonly passwordResetRepo: PasswordResetRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly auditLogs: AuditLogsService,
    @Inject(MAILER_PORT) private readonly mailer: MailerPort,
  ) {}

  async register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{ user: SafeUserProfile }> {
    const passwordHash = await this.passwordHasher.hash(input.password);
    const rawToken = this.tokenCrypto.generateRandomToken();
    const tokenHash = this.tokenCrypto.sha256Hex(rawToken);
    const expiresAt = new Date(
      Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
    );

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await this.usersService.createPendingUser(
        {
          email: input.email,
          displayName: input.displayName,
          passwordHash,
        },
        tx,
      );

      await this.emailVerificationRepo.issueForUser(
        {
          userId: created.id,
          tokenHash,
          expiresAt,
        },
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'AUTH_REGISTER_SUCCESS',
          entityType: 'User',
          entityId: created.id,
          actorUserId: created.id,
          metadata: { status: created.status },
        },
        tx,
      );

      return created;
    });

    const verificationUrl = `${this.env.appUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
    try {
      await this.mailer.sendVerificationEmail({
        to: user.email,
        displayName: user.displayName,
        verificationUrl,
        expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
      });
    } catch (err) {
      this.logger.warn(
        `Failed to dispatch verification email for userId=${user.id}: ${(err as Error).message}`,
      );
    }

    return { user: this.usersService.toSafeProfile(user) };
  }

  async login(input: {
    email: string;
    password: string;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<{
    user: SafeUserProfile;
    sessionId: string;
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  }> {
    const normalizedEmail = this.usersService.normalizeEmail(input.email);
    const user = await this.usersService.findByNormalizedEmail(normalizedEmail);

    if (!user) {
      await this.passwordHasher.verifyDummy(input.password);
      await this.auditLogs.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: null,
        actorUserId: null,
        metadata: { reason: 'INVALID_CREDENTIALS' },
      });
      throw AppException.invalidCredentials();
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      input.password,
    );

    if (!passwordMatches) {
      await this.auditLogs.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        actorUserId: user.id,
        metadata: { reason: 'INVALID_CREDENTIALS' },
      });
      throw AppException.invalidCredentials();
    }

    if (user.status !== UserStatus.ACTIVE) {
      await this.auditLogs.record({
        action: 'AUTH_LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
        actorUserId: user.id,
        metadata: { reason: 'ACCOUNT_NOT_ACTIVE', status: user.status },
      });
      const detail =
        user.status === UserStatus.PENDING_VERIFICATION
          ? 'Please verify your email address before signing in.'
          : 'This account is not active and cannot sign in.';
      throw AppException.accountNotActive(detail);
    }

    const { session, refreshToken } = await this.prisma.$transaction(
      async (tx) => {
        const created = await this.sessionsService.createSessionForLogin(
          {
            userId: user.id,
            userAgent: input.userAgent,
            ipAddress: input.ipAddress,
          },
          tx,
        );

        await this.auditLogs.record(
          {
            action: 'AUTH_LOGIN_SUCCESS',
            entityType: 'AuthSession',
            entityId: created.session.id,
            actorUserId: user.id,
          },
          tx,
        );

        return created;
      },
    );

    const accessToken = await this.tokenCrypto.signAccessToken({
      sub: user.id,
      sid: session.id,
      email: user.email,
      status: user.status,
    });
    const csrfToken = this.tokenCrypto.generateRandomToken();

    return {
      user: this.usersService.toSafeProfile(user),
      sessionId: session.id,
      accessToken,
      refreshToken,
      csrfToken,
    };
  }

  async logout(sessionId: string, userId: string): Promise<void> {
    await this.sessionsService.revokeSessionById(
      sessionId,
      userId,
      SessionRevokeReason.USER_LOGOUT,
    );
  }

  async refresh(rawRefreshToken: string | undefined): Promise<{
    user: SafeUserProfile;
    accessToken: string;
    refreshToken: string;
    csrfToken: string;
  }> {
    const rotated = await this.sessionsService.rotateSession(rawRefreshToken);
    const accessToken = await this.tokenCrypto.signAccessToken({
      sub: rotated.user.id,
      sid: rotated.session.id,
      email: rotated.user.email,
      status: rotated.user.status,
    });
    const csrfToken = this.tokenCrypto.generateRandomToken();

    return {
      user: this.usersService.toSafeProfile(rotated.user),
      accessToken,
      refreshToken: rotated.refreshToken,
      csrfToken,
    };
  }

  async logoutAll(userId: string): Promise<{ revokedCount: number }> {
    const revokedCount = await this.sessionsService.revokeAllForUser(
      userId,
      SessionRevokeReason.USER_LOGOUT_ALL,
    );
    return { revokedCount };
  }

  async listSessions(userId: string, currentSessionId: string) {
    const sessions = await this.sessionsService.listActiveSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent,
      createdAt: s.createdAt.toISOString(),
      lastUsedAt: s.lastUsedAt.toISOString(),
      idleExpiresAt: s.idleExpiresAt.toISOString(),
      absoluteExpiresAt: s.absoluteExpiresAt.toISOString(),
      isCurrent: s.id === currentSessionId,
    }));
  }

  async revokeSession(
    sessionId: string,
    userId: string,
  ): Promise<{ revoked: boolean }> {
    const revoked = await this.sessionsService.revokeSessionById(
      sessionId,
      userId,
      SessionRevokeReason.USER_SESSION_REVOKE,
    );
    if (!revoked) {
      throw AppException.notFound('Session not found.');
    }
    return { revoked: true };
  }

  async resendVerification(email: string): Promise<{ accepted: true }> {
    const normalizedEmail = this.usersService.normalizeEmail(email);
    const user = await this.usersService.findByNormalizedEmail(normalizedEmail);

    if (user && user.status === UserStatus.PENDING_VERIFICATION) {
      const rawToken = this.tokenCrypto.generateRandomToken();
      const tokenHash = this.tokenCrypto.sha256Hex(rawToken);
      const expiresAt = new Date(
        Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000,
      );

      await this.prisma.$transaction(async (tx) => {
        await this.emailVerificationRepo.issueForUser(
          {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
          tx,
        );
        await this.auditLogs.record(
          {
            action: 'AUTH_EMAIL_VERIFICATION_RESENT',
            entityType: 'EmailVerificationToken',
            entityId: user.id,
            actorUserId: user.id,
          },
          tx,
        );
      });

      const verificationUrl = `${this.env.appUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(rawToken)}`;
      try {
        await this.mailer.sendVerificationEmail({
          to: user.email,
          displayName: user.displayName,
          verificationUrl,
          expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to resend verification email for userId=${user.id}: ${(err as Error).message}`,
        );
      }
    }

    return { accepted: true };
  }

  async confirmEmailVerification(rawToken: string): Promise<{ verified: true }> {
    const tokenHash = this.tokenCrypto.sha256Hex(rawToken.trim());
    const now = new Date();

    const verified = await this.prisma.$transaction(async (tx) => {
      const consumed = await this.emailVerificationRepo.consumeValidToken(
        tokenHash,
        now,
        tx,
      );
      if (!consumed) {
        return false;
      }

      const activated = await this.usersService.activateVerifiedUser(
        consumed.userId,
        now,
        tx,
      );
      if (activated === 0) {
        return false;
      }

      await this.auditLogs.record(
        {
          action: 'AUTH_EMAIL_VERIFIED',
          entityType: 'User',
          entityId: consumed.userId,
          actorUserId: consumed.userId,
        },
        tx,
      );

      return true;
    });

    if (!verified) {
      throw AppException.invalidToken();
    }

    return { verified: true };
  }

  async requestPasswordReset(email: string): Promise<{ accepted: true }> {
    const normalizedEmail = this.usersService.normalizeEmail(email);
    const user = await this.usersService.findByNormalizedEmail(normalizedEmail);

    if (
      user &&
      (user.status === UserStatus.ACTIVE ||
        user.status === UserStatus.PENDING_VERIFICATION)
    ) {
      const rawToken = this.tokenCrypto.generateRandomToken();
      const tokenHash = this.tokenCrypto.sha256Hex(rawToken);
      const expiresAt = new Date(
        Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000,
      );

      await this.prisma.$transaction(async (tx) => {
        await this.passwordResetRepo.issueForUser(
          {
            userId: user.id,
            tokenHash,
            expiresAt,
          },
          tx,
        );
        await this.auditLogs.record(
          {
            action: 'AUTH_PASSWORD_RESET_REQUESTED',
            entityType: 'PasswordResetToken',
            entityId: user.id,
            actorUserId: user.id,
          },
          tx,
        );
      });

      const resetUrl = `${this.env.appUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(rawToken)}`;
      try {
        await this.mailer.sendPasswordResetEmail({
          to: user.email,
          displayName: user.displayName,
          resetUrl,
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });
      } catch (err) {
        this.logger.warn(
          `Failed to send password reset email for userId=${user.id}: ${(err as Error).message}`,
        );
      }
    }

    return { accepted: true };
  }

  async confirmPasswordReset(
    rawToken: string,
    newPassword: string,
  ): Promise<{ reset: true }> {
    const tokenHash = this.tokenCrypto.sha256Hex(rawToken.trim());
    const passwordHash = await this.passwordHasher.hash(newPassword);
    const now = new Date();

    const resetOk = await this.prisma.$transaction(async (tx) => {
      const consumed = await this.passwordResetRepo.consumeValidToken(
        tokenHash,
        now,
        tx,
      );
      if (!consumed) {
        return false;
      }

      await this.usersService.updatePasswordHash(
        consumed.userId,
        passwordHash,
        tx,
      );

      await this.sessionsService.revokeAllForUser(
        consumed.userId,
        SessionRevokeReason.PASSWORD_RESET,
        tx,
      );

      await this.auditLogs.record(
        {
          action: 'AUTH_PASSWORD_RESET_COMPLETED',
          entityType: 'User',
          entityId: consumed.userId,
          actorUserId: consumed.userId,
        },
        tx,
      );

      return true;
    });

    if (!resetOk) {
      throw AppException.invalidToken();
    }

    return { reset: true };
  }

  async getMe(userId: string): Promise<SafeUserProfile> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw AppException.unauthenticated();
    }
    return this.usersService.toSafeProfile(user);
  }
}
