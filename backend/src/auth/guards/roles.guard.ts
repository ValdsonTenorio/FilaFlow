import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationRole } from '@prisma/client';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedSession } from '../auth.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<OrganizationRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles) return true;

    const session = context.switchToHttp().getRequest<Request & { session: AuthenticatedSession }>().session;
    if (!session || !roles.includes(session.role)) throw new ForbiddenException('Permissão insuficiente.');
    return true;
  }
}
