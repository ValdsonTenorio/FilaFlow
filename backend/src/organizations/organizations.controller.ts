import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthenticatedSession } from '../auth/auth.types';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
@UseGuards(SessionAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get('current')
  current(
    @CurrentSession() session: AuthenticatedSession,
  ): Promise<{ id: string; name: string; slug: string; role: string }> {
    return this.organizationsService.current(session);
  }
}
