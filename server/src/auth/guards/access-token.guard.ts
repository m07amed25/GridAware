import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppException } from '../../common/exceptions/app.exception.js';
import { UserStatus } from '../../generated/prisma/enums.js';
import { SessionsService } from '../../sessions/sessions.service.js';
import { UsersService } from '../../users/users.service.js';
import { ACCESS_COOKIE_NAME } from '../cookie.service.js';
import type { RequestWithActor } from '../decorators/current-user.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { TokenCryptoService } from '../token-crypto.service.js';

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenCrypto: TokenCryptoService,
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = context.switchToHttp().getRequest<RequestWithActor>();
    const rawToken = (req.cookies as Record<string, unknown> | undefined)?.[
      ACCESS_COOKIE_NAME
    ];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw AppException.unauthenticated();
    }

    let payload;
    try {
      payload = await this.tokenCrypto.verifyAccessToken(rawToken);
    } catch {
      throw AppException.unauthenticated();
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw AppException.unauthenticated();
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw AppException.accountNotActive(
        'Your account is not active. Please contact support or verify your email.',
      );
    }

    const session = await this.sessionsService.findActiveById(payload.sid);
    if (!session || session.userId !== user.id) {
      throw AppException.unauthenticated();
    }

    req.user = {
      userId: user.id,
      sessionId: session.id,
      email: user.email,
      status: user.status,
    };

    return true;
  }
}
