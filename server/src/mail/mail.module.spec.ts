import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { EnvModule } from '../config/env.module.js';
import { ConsoleMailerAdapter } from './console-mailer.adapter.js';
import { HttpMailerAdapter } from './http-mailer.adapter.js';
import { MailModule } from './mail.module.js';
import { MAILER_PORT, type MailerPort } from './mailer.port.js';

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
});
