import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { AuthService } from './auth.service.js';
import {
  type AuthenticatedActor,
  CurrentUser,
} from './decorators/current-user.decorator.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';

@ApiTags('identity')
@Controller('me')
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AccessTokenGuard)
  @Get()
  @ApiCookieAuth('ga_access')
  @ApiOperation({ summary: 'Forward-compatible current user identity alias' })
  async getCurrentIdentity(@CurrentUser() actor: AuthenticatedActor) {
    const user = await this.authService.getMe(actor.userId);
    return buildApiResponse({
      ...user,
      memberships: [],
    });
  }
}
