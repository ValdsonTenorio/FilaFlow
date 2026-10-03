import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AuthenticatedSession } from '../auth.types';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { session?: AuthenticatedSession }>();
    const token = request.cookies?.ff_session;
    if (typeof token !== 'string')
      throw new UnauthorizedException('Sessão inválida ou expirada.');

    const session = await this.authService.validateSession(token);
    if (!session)
      throw new UnauthorizedException('Sessão inválida ou expirada.');

    request.session = session;
    return true;
  }
}
