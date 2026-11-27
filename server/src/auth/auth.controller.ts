import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { buildApiResponse } from '../common/envelopes/api-response.js';
import { AuthService } from './auth.service.js';
import { CookieService, REFRESH_COOKIE_NAME } from './cookie.service.js';
import { AuthRateLimit } from './decorators/auth-rate-limit.decorator.js';
import {
  type AuthenticatedActor,
  CurrentUser,
} from './decorators/current-user.decorator.js';
import { Public } from './decorators/public.decorator.js';
import {
  AuthSessionSummarySwaggerDto,
  EmailOnlyRequestSwaggerDto,
  LoginRequestSwaggerDto,
  RegisterRequestSwaggerDto,
  ResetPasswordConfirmRequestSwaggerDto,
  SafeUserProfileSwaggerDto,
  TokenConfirmRequestSwaggerDto,
} from './dto/auth-swagger.dto.js';
import {
  type EmailOnlyRequestDto,
  EmailOnlyRequestSchema,
  type LoginRequestDto,
  LoginRequestSchema,
  type RegisterRequestDto,
  RegisterRequestSchema,
  type ResetPasswordConfirmRequestDto,
  ResetPasswordConfirmRequestSchema,
  type SessionIdParamDto,
  SessionIdParamSchema,
  type TokenConfirmRequestDto,
  TokenConfirmRequestSchema,
} from './dto/auth.schemas.js';
import { ZodValidationPipe } from './dto/zod-validation.pipe.js';
import { AccessTokenGuard } from './guards/access-token.guard.js';
import { AuthRateLimitGuard } from './guards/auth-rate-limit.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { TokenCryptoService } from './token-crypto.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookieService: CookieService,
    private readonly tokenCrypto: TokenCryptoService,
  ) {}

  @Public()
  @Get('csrf')
  @ApiOperation({ summary: 'Issue or refresh double-submit CSRF cookie' })
  @ApiResponse({ status: 200, description: 'CSRF token issued' })
  getCsrf(@Res({ passthrough: true }) res: Response) {
    const csrfToken = this.tokenCrypto.generateRandomToken();
    this.cookieService.setCsrfCookie(res, csrfToken);
    return buildApiResponse({ csrfToken });
  }

  @Public()
  @AuthRateLimit('register')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new personal account' })
  @ApiBody({ type: RegisterRequestSwaggerDto })
  @ApiResponse({ status: 201, description: 'Account created (PENDING_VERIFICATION)' })
  @ApiResponse({ status: 409, description: 'Email unavailable' })
  async register(
    @Body(new ZodValidationPipe(RegisterRequestSchema)) body: RegisterRequestDto,
  ) {
    const result = await this.authService.register(body);
    return buildApiResponse(result);
  }

  @Public()
  @AuthRateLimit('login')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in with email and passphrase' })
  @ApiBody({ type: LoginRequestSwaggerDto })
  @ApiResponse({ status: 200, description: 'Authenticated with HttpOnly cookies' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account not active' })
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: LoginRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login({
      email: body.email,
      password: body.password,
      userAgent: req.get('user-agent'),
      ipAddress: req.ip,
    });

    this.cookieService.setAuthCookies(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      csrfToken: result.csrfToken,
    });

    return buildApiResponse({ user: result.user });
  }

  @UseGuards(CsrfGuard, AccessTokenGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('ga_access')
  @ApiOperation({ summary: 'Sign out of the current session' })
  @ApiResponse({ status: 200, description: 'Current session revoked' })
  async logout(
    @CurrentUser() actor: AuthenticatedActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(actor.sessionId, actor.userId);
    this.cookieService.clearAuthCookies(res);
    return buildApiResponse({ revoked: true });
  }

  @Public()
  @AuthRateLimit('refresh')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('ga_refresh')
  @ApiOperation({ summary: 'Rotate refresh cookie and issue new access cookie' })
  @ApiResponse({ status: 200, description: 'Session rotated' })
  @ApiResponse({ status: 401, description: 'Session expired or token reuse detected' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefresh = (req.cookies as Record<string, unknown> | undefined)?.[
      REFRESH_COOKIE_NAME
    ];
    try {
      const result = await this.authService.refresh(
        typeof rawRefresh === 'string' ? rawRefresh : undefined,
      );
      this.cookieService.setAuthCookies(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        csrfToken: result.csrfToken,
      });
      return buildApiResponse({ user: result.user });
    } catch (err) {
      this.cookieService.clearAuthCookies(res);
      throw err;
    }
  }

  @UseGuards(CsrfGuard, AccessTokenGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('ga_access')
  @ApiOperation({ summary: 'Revoke all active sessions for the current user' })
  @ApiResponse({ status: 200, description: 'All sessions revoked' })
  async logoutAll(
    @CurrentUser() actor: AuthenticatedActor,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(actor.userId);
    this.cookieService.clearAuthCookies(res);
    return buildApiResponse(result);
  }

  @UseGuards(AccessTokenGuard)
  @Get('sessions')
  @ApiCookieAuth('ga_access')
  @ApiOperation({ summary: 'List active sessions for the current user' })
  @ApiResponse({ status: 200, type: [AuthSessionSummarySwaggerDto] })
  async listSessions(@CurrentUser() actor: AuthenticatedActor) {
    const sessions = await this.authService.listSessions(
      actor.userId,
      actor.sessionId,
    );
    return buildApiResponse({ sessions });
  }

  @UseGuards(CsrfGuard, AccessTokenGuard)
  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('ga_access')
  @ApiParam({ name: 'sessionId', format: 'uuid' })
  @ApiOperation({ summary: 'Revoke a specific active session owned by the user' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async revokeSession(
    @CurrentUser() actor: AuthenticatedActor,
    @Param(new ZodValidationPipe(SessionIdParamSchema)) params: SessionIdParamDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.revokeSession(
      params.sessionId,
      actor.userId,
    );
    if (params.sessionId === actor.sessionId) {
      this.cookieService.clearAuthCookies(res);
    }
    return buildApiResponse(result);
  }

  @Public()
  @AuthRateLimit('verifyResend')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @Post('email-verification/resend')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Resend email verification link (non-enumerating)' })
  @ApiBody({ type: EmailOnlyRequestSwaggerDto })
  @ApiResponse({ status: 202, description: 'Accepted' })
  async resendVerification(
    @Body(new ZodValidationPipe(EmailOnlyRequestSchema))
    body: EmailOnlyRequestDto,
  ) {
    const result = await this.authService.resendVerification(body.email);
    return buildApiResponse(result);
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('email-verification/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm email ownership with single-use token' })
  @ApiBody({ type: TokenConfirmRequestSwaggerDto })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async confirmVerification(
    @Body(new ZodValidationPipe(TokenConfirmRequestSchema))
    body: TokenConfirmRequestDto,
  ) {
    const result = await this.authService.confirmEmailVerification(body.token);
    return buildApiResponse(result);
  }

  @Public()
  @AuthRateLimit('passwordResetRequest')
  @UseGuards(CsrfGuard, AuthRateLimitGuard)
  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request password reset link (non-enumerating)' })
  @ApiBody({ type: EmailOnlyRequestSwaggerDto })
  @ApiResponse({ status: 202, description: 'Accepted' })
  async requestPasswordReset(
    @Body(new ZodValidationPipe(EmailOnlyRequestSchema))
    body: EmailOnlyRequestDto,
  ) {
    const result = await this.authService.requestPasswordReset(body.email);
    return buildApiResponse(result);
  }

  @Public()
  @UseGuards(CsrfGuard)
  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Complete password reset and revoke all active sessions',
  })
  @ApiBody({ type: ResetPasswordConfirmRequestSwaggerDto })
  @ApiResponse({ status: 200, description: 'Passphrase updated' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async confirmPasswordReset(
    @Body(new ZodValidationPipe(ResetPasswordConfirmRequestSchema))
    body: ResetPasswordConfirmRequestDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.confirmPasswordReset(
      body.token,
      body.newPassword,
    );
    this.cookieService.clearAuthCookies(res);
    return buildApiResponse(result);
  }

  @UseGuards(AccessTokenGuard)
  @Get('me')
  @ApiCookieAuth('ga_access')
  @ApiOperation({ summary: 'Get authenticated user profile' })
  @ApiResponse({ status: 200, type: SafeUserProfileSwaggerDto })
  async getMe(@CurrentUser() actor: AuthenticatedActor) {
    const user = await this.authService.getMe(actor.userId);
    return buildApiResponse({ user });
  }
}
