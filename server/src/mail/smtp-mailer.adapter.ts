import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { EnvService } from '../config/env.service.js';
import type {
  MailerPort,
  PasswordResetEmailPayload,
  VerificationEmailPayload,
} from './mailer.port.js';
import {
  renderPasswordResetEmail,
  renderVerificationEmail,
} from './templates/render-templates.js';

@Injectable()
export class SmtpMailerAdapter implements MailerPort, OnModuleDestroy {
  private readonly logger = new Logger(SmtpMailerAdapter.name);
  private transporter: Transporter | null = null;

  constructor(private readonly env: EnvService) {}

  async sendVerificationEmail(
    payload: VerificationEmailPayload,
  ): Promise<void> {
    const rendered = await renderVerificationEmail(payload);
    await this.sendMail({
      to: payload.to,
      ...rendered,
    });
  }

  async sendPasswordResetEmail(
    payload: PasswordResetEmailPayload,
  ): Promise<void> {
    const rendered = await renderPasswordResetEmail(payload);
    await this.sendMail({
      to: payload.to,
      ...rendered,
    });
  }

  async verifyConnection(): Promise<boolean> {
    return this.getTransporter().verify();
  }

  onModuleDestroy(): void {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = this.env.mailSmtpHost;
    const user = this.env.mailSmtpUser;
    const pass = this.env.mailSmtpPass;

    if (!host || !user || !pass) {
      throw new Error(
        'MAIL_SMTP_HOST, MAIL_SMTP_USER, and MAIL_SMTP_PASS are required for SmtpMailerAdapter',
      );
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.env.mailSmtpPort,
      secure: this.env.mailSmtpSecure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });

    return this.transporter;
  }

  private async sendMail(message: {
    to: string;
    subject: string;
    html: string;
    text: string;
  }): Promise<void> {
    const info = await this.getTransporter().sendMail({
      from: this.env.mailFrom,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    this.logger.log(
      `Transactional email dispatched via SMTP (messageId=${info.messageId ?? 'unknown'})`,
    );
  }
}
