import { Module } from '@nestjs/common';
import { TokenCryptoService } from '../auth/token-crypto.service.js';
import { SessionsRepository } from './sessions.repository.js';
import { SessionsService } from './sessions.service.js';

@Module({
  providers: [SessionsRepository, SessionsService, TokenCryptoService],
  exports: [SessionsRepository, SessionsService],
})
export class SessionsModule {}
