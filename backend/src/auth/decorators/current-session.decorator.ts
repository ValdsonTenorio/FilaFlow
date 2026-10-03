import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedSession } from '../auth.types';

export const CurrentSession = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthenticatedSession => {
    return context
      .switchToHttp()
      .getRequest<Request & { session: AuthenticatedSession }>().session;
  },
);
