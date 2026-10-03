import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { AuthenticatedSession } from '../auth/auth.types';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(SessionAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  me(@CurrentSession() session: AuthenticatedSession): Promise<{ id: string; email: string }> {
    return this.usersService.me(session.userId);
  }
}
