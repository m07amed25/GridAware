import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../config/env.service.js';
import type {
  MailerPort,
  OrganizationInvitationEmailPayload,
  PasswordResetEmailPayload,
  VerificationEmailPayload,
} from './mailer.port.js';
import {
  renderOrganizationInvitationEmail,
  renderPasswordResetEmail,
  renderVerificationEmail,
} from './templates/render-templates.js';

@Injectable()
export class HttpMailerAdapter implements MailerPort {
  private readonly logger = new Logger(HttpMailerAdapter.name);

  constructor(private readonly env: EnvService) {}

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    const rendered = await renderVerificationEmail(payload);
    await this.sendEmail({
      to: payload.to,
      ...rendered,
    });
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    const rendered = await renderPasswordResetEmail(payload);
    await this.sendEmail({
      to: payload.to,
      ...rendered,
    });
  }

  async sendOrganizationInvitationEmail(
    payload: OrganizationInvitationEmailPayload,
  ): Promise<void> {
    const rendered = await renderOrganizationInvitationEmail(payload);
    await this.sendEmail({
      to: payload.to,
      ...rendered,
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
