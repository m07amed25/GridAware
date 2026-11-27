import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../config/env.service.js';
import type {
  MailerPort,
  PasswordResetEmailPayload,
  VerificationEmailPayload,
} from './mailer.port.js';

@Injectable()
export class HttpMailerAdapter implements MailerPort {
  private readonly logger = new Logger(HttpMailerAdapter.name);

  constructor(private readonly env: EnvService) {}

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    await this.sendEmail({
      to: payload.to,
      subject: 'Verify your GridAware account email',
      html: `<p>Hello ${escapeHtml(payload.displayName)},</p><p>Verify your GridAware email address within ${payload.expiresInHours} hours:</p><p><a href="${escapeHtml(payload.verificationUrl)}">Verify email</a></p>`,
      text: `Hello ${payload.displayName}, verify your GridAware email within ${payload.expiresInHours} hours: ${payload.verificationUrl}`,
    });
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    await this.sendEmail({
      to: payload.to,
      subject: 'Reset your GridAware passphrase',
      html: `<p>Hello ${escapeHtml(payload.displayName)},</p><p>Reset your GridAware passphrase within ${payload.expiresInMinutes} minutes:</p><p><a href="${escapeHtml(payload.resetUrl)}">Reset passphrase</a></p>`,
      text: `Hello ${payload.displayName}, reset your GridAware passphrase within ${payload.expiresInMinutes} minutes: ${payload.resetUrl}`,
    });
  }

  private async sendEmail(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const endpoint = this.env.mailApiUrl ?? 'https://api.resend.com/emails';
    const apiKey = this.env.mailApiKey;
    if (!apiKey) {
      throw new Error('MAIL_API_KEY is required for HttpMailerAdapter');
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: this.env.mailFrom,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      this.logger.warn(
        `Transactional mail provider returned HTTP ${response.status}`,
      );
      throw new Error(`Mail provider failed with status ${response.status}`);
    }
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
