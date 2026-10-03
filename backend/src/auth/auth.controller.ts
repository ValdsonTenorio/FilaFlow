import {
  Body,
  Controller,
  HttpCode,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { Environment } from '../config/env.schema';
import { CurrentSession } from './decorators/current-session.decorator';
import { AuthService } from './auth.service';
import { AuthenticatedSession } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { CsrfGuard } from './guards/csrf.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ userId: string; organizationId: string }> {
    const { token, session } = await this.authService.register(dto);
    this.setSessionCookies(response, token);
    return { userId: session.userId, organizationId: session.organizationId };
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ userId: string; organizationId: string }> {
    const { token, session } = await this.authService.login(dto);
    this.setSessionCookies(response, token);
    return { userId: session.userId, organizationId: session.organizationId };
  }

  @Post('session/refresh')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async refresh(
    @CurrentSession() session: AuthenticatedSession,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const rotated = await this.authService.rotateSession(session.sessionId);
    this.setSessionCookies(response, rotated.token);
  }

  @Post('logout')
  @HttpCode(204)
  @UseGuards(SessionAuthGuard, CsrfGuard)
  async logout(
    @CurrentSession() session: AuthenticatedSession,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.revokeSession(session.sessionId);
    response.clearCookie('ff_session', this.cookieOptions());
    response.clearCookie('ff_csrf', {
      ...this.cookieOptions(),
      httpOnly: false,
    });
  }

  private setSessionCookies(response: Response, token: string): void {
    const options = this.cookieOptions();
    response.cookie('ff_session', token, { ...options, httpOnly: true });
    response.cookie('ff_csrf', crypto.randomBytes(32).toString('base64url'), {
      ...options,
      httpOnly: false,
    });
  }

  private cookieOptions(): {
    secure: boolean;
    sameSite: 'strict';
    maxAge: number;
    path: string;
  } {
    return {
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      sameSite: 'strict',
      maxAge: this.authService.getSessionTtlMilliseconds(),
      path: '/',
    };
  }
}
