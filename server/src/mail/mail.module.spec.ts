import { Test } from '@nestjs/testing';
import nodemailer, { type Transporter } from 'nodemailer';
import { describe, expect, it, vi } from 'vitest';
import { EnvModule } from '../config/env.module.js';
import { ConsoleMailerAdapter } from './console-mailer.adapter.js';
import { HttpMailerAdapter } from './http-mailer.adapter.js';
import { MailModule } from './mail.module.js';
import { MAILER_PORT, type MailerPort } from './mailer.port.js';
import { SmtpMailerAdapter } from './smtp-mailer.adapter.js';
import {
  renderPasswordResetEmail,
  renderVerificationEmail,
} from './templates/render-templates.js';

describe('MailModule', () => {
  it('binds ConsoleMailerAdapter when MAIL_PROVIDER=console in dev/test', async () => {
    const mod = await Test.createTestingModule({
      imports: [
        EnvModule.forRoot({
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
            REDIS_URL: 'redis://localhost:6379',
            MQTT_URL: 'mqtt://localhost:1883',
            MAIL_PROVIDER: 'console',
          },
          loadEnvFile: false,
        }),
        MailModule,
      ],
    }).compile();

    const mailer = mod.get<MailerPort>(MAILER_PORT);
    expect(mailer).toBeInstanceOf(ConsoleMailerAdapter);
    await expect(
      mailer.sendVerificationEmail({
        to: 'alex@example.com',
        displayName: 'Alex',
        verificationUrl: 'http://localhost:3000/verify-email?token=abc',
        expiresInHours: 24,
      }),
    ).resolves.toBeUndefined();

    await mod.close();
  });

  it('binds HttpMailerAdapter when MAIL_PROVIDER=resend', async () => {
    const mod = await Test.createTestingModule({
      imports: [
        EnvModule.forRoot({
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
            REDIS_URL: 'redis://localhost:6379',
            MQTT_URL: 'mqtt://localhost:1883',
            MAIL_PROVIDER: 'resend',
            MAIL_API_KEY: 're_test_123',
          },
          loadEnvFile: false,
        }),
        MailModule,
      ],
    }).compile();

    const mailer = mod.get<MailerPort>(MAILER_PORT);
    expect(mailer).toBeInstanceOf(HttpMailerAdapter);

    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await mailer.sendPasswordResetEmail({
      to: 'alex@example.com',
      displayName: 'Alex',
      resetUrl: 'http://localhost:3000/reset-password?token=xyz',
      expiresInMinutes: 60,
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
    await mod.close();
  });

  it('binds SmtpMailerAdapter when MAIL_PROVIDER=smtp and sends React Email HTML + text via Nodemailer', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '<msg-1@gmail.com>' });
    const close = vi.fn();
    const createTransportSpy = vi
      .spyOn(nodemailer, 'createTransport')
      .mockReturnValue({
        sendMail,
        close,
      } as unknown as Transporter);

    const mod = await Test.createTestingModule({
      imports: [
        EnvModule.forRoot({
          env: {
            NODE_ENV: 'test',
            DATABASE_URL: 'postgresql://user:pass@localhost:5432/gridaware',
            REDIS_URL: 'redis://localhost:6379',
            MQTT_URL: 'mqtt://localhost:1883',
            MAIL_PROVIDER: 'smtp',
            MAIL_FROM: 'GridAware <sender@gmail.com>',
            MAIL_SMTP_HOST: 'smtp.gmail.com',
            MAIL_SMTP_PORT: '465',
            MAIL_SMTP_SECURE: 'true',
            MAIL_SMTP_USER: 'sender@gmail.com',
            MAIL_SMTP_PASS: 'app-pass-16-chars',
          },
          loadEnvFile: false,
        }),
        MailModule,
      ],
    }).compile();

    const mailer = mod.get<MailerPort>(MAILER_PORT);
    expect(mailer).toBeInstanceOf(SmtpMailerAdapter);

    await mailer.sendVerificationEmail({
      to: 'alex@example.com',
      displayName: 'Alex <Ops>',
      verificationUrl: 'http://localhost:3000/verify-email?token=tok123',
      expiresInHours: 24,
    });

    expect(createTransportSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'sender@gmail.com',
          pass: 'app-pass-16-chars',
        },
      }),
    );
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mailArgs = sendMail.mock.calls[0][0] as {
      from: string;
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(mailArgs.from).toBe('GridAware <sender@gmail.com>');
    expect(mailArgs.to).toBe('alex@example.com');
    expect(mailArgs.subject).toBe('Verify your GridAware account email');
    expect(mailArgs.html).toContain('http://localhost:3000/verify-email?token=tok123');
    expect(mailArgs.html).toContain('Alex &lt;Ops&gt;');
    expect(mailArgs.text).toContain('http://localhost:3000/verify-email?token=tok123');

    createTransportSpy.mockRestore();
    await mod.close();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('renders both verification and password reset React Email templates cleanly', async () => {
    const verify = await renderVerificationEmail({
      to: 'alex@example.com',
      displayName: 'Alex Morgan',
      verificationUrl: 'http://localhost:3000/verify-email?token=abc',
      expiresInHours: 24,
    });
    expect(verify.html).toContain('Verify email address');
    expect(verify.html).toContain('24 hours');
    expect(verify.text).toContain('Alex Morgan');

    const reset = await renderPasswordResetEmail({
      to: 'alex@example.com',
      displayName: 'Alex Morgan',
      resetUrl: 'http://localhost:3000/reset-password?token=xyz',
      expiresInMinutes: 60,
    });
    expect(reset.html).toContain('Choose a new passphrase');
    expect(reset.html).toContain('60 minutes');
    expect(reset.text).toContain('http://localhost:3000/reset-password?token=xyz');
  });
});
