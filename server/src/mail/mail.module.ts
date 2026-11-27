import { Module } from '@nestjs/common';
import { EnvService } from '../config/env.service.js';
import { ConsoleMailerAdapter } from './console-mailer.adapter.js';
import { HttpMailerAdapter } from './http-mailer.adapter.js';
import { MAILER_PORT } from './mailer.port.js';

@Module({
  providers: [
    ConsoleMailerAdapter,
    HttpMailerAdapter,
    {
      provide: MAILER_PORT,
      inject: [EnvService, ConsoleMailerAdapter, HttpMailerAdapter],
      useFactory: (
        env: EnvService,
        consoleAdapter: ConsoleMailerAdapter,
        httpAdapter: HttpMailerAdapter,
      ) => (env.mailProvider === 'console' ? consoleAdapter : httpAdapter),
    },
  ],
  exports: [MAILER_PORT],
})
export class MailModule {}
