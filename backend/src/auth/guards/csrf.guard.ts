import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieToken = request.cookies?.ff_csrf;
    const headerToken = request.header('x-csrf-token');
    if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
      throw new ForbiddenException('Validação CSRF inválida.');
    }

    const valid =
      cookieToken.length === headerToken.length &&
      crypto.timingSafeEqual(
        Buffer.from(cookieToken),
        Buffer.from(headerToken),
      );
    if (!valid) throw new ForbiddenException('Validação CSRF inválida.');
    return true;
  }
}
