import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthRateLimitService } from './auth-rate-limit.service.js';
import { AuthService } from './auth.service.js';
import { CookieService } from './cookie.service.js';
import { EmailVerificationRepository } from './email-verification.repository.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { MeController } from './me.controller.js';
import { PasswordHasherService } from './password-hasher.service.js';
import { PasswordResetRepository } from './password-reset.repository.js';
import { TokenCryptoService } from './token-crypto.service.js';

@Module({
  imports: [UsersModule, SessionsModule, MailModule],
  controllers: [AuthController, MeController],
  providers: [
    AuthService,
    EmailVerificationRepository,
    PasswordResetRepository,
    PasswordHasherService,
    TokenCryptoService,
    CookieService,
    AuthRateLimitService,
    AccessTokenGuard,
    CsrfGuard,
    AuthRateLimitGuard,
  ],
  exports: [
    AuthService,
    TokenCryptoService,
    CookieService,
    AccessTokenGuard,
    CsrfGuard,
  ],
})
export class AuthModule {}
