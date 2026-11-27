import { Module } from '@nestjs/common';
import { EnvService } from '../config/env.service.js';
import { ConsoleMailerAdapter } from './console-mailer.adapter.js';
import { HttpMailerAdapter } from './http-mailer.adapter.js';
import { MAILER_PORT } from './mailer.port.js';
import { SmtpMailerAdapter } from './smtp-mailer.adapter.js';

@Module({
  providers: [
    ConsoleMailerAdapter,
    HttpMailerAdapter,
    SmtpMailerAdapter,
    {
      provide: MAILER_PORT,
      inject: [
        EnvService,
        ConsoleMailerAdapter,
        HttpMailerAdapter,
        SmtpMailerAdapter,
      ],
      useFactory: (
        env: EnvService,
        consoleAdapter: ConsoleMailerAdapter,
        httpAdapter: HttpMailerAdapter,
        smtpAdapter: SmtpMailerAdapter,
      ) => {
        if (env.mailProvider === 'console') {
          return consoleAdapter;
        }
        if (env.mailProvider === 'smtp') {
          return smtpAdapter;
        }
        return httpAdapter;
      },
    },
  ],
  exports: [MAILER_PORT],
})
export class MailModule {}
