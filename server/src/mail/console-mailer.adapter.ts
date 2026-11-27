import { Injectable, Logger } from '@nestjs/common';
import type {
  MailerPort,
  OrganizationInvitationEmailPayload,
  PasswordResetEmailPayload,
  VerificationEmailPayload,
} from './mailer.port.js';

/**
 * Development and test-only mailer adapter.
 * Blocked in production by serverEnvSchema startup validation.
 */
@Injectable()
export class ConsoleMailerAdapter implements MailerPort {
  private readonly logger = new Logger(ConsoleMailerAdapter.name);

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    this.logger.log(
      `[DEV MAIL] Verification email to=${payload.to} url=${payload.verificationUrl} (expires in ${payload.expiresInHours}h)`,
    );
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    this.logger.log(
      `[DEV MAIL] Password reset email to=${payload.to} url=${payload.resetUrl} (expires in ${payload.expiresInMinutes}m)`,
    );
  }

  async sendOrganizationInvitationEmail(
    payload: OrganizationInvitationEmailPayload,
  ): Promise<void> {
    this.logger.log(
      `[DEV MAIL] Organization invitation to=${payload.to} org="${payload.organizationName}" role=${payload.role} url=${payload.acceptUrl} (expires in ${payload.expiresInDays}d)`,
    );
  }
}
