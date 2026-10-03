import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { OrganizationRole, QueueStatus } from '@prisma/client';
import { AuthenticatedSession } from '../auth/auth.types';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateQueueDto } from './dto/create-queue.dto';
import { QueuesService } from './queues.service';

@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Get('public/:slug')
  publicStatus(
    @Param('slug') slug: string,
  ): Promise<{ name: string; status: QueueStatus; waiting: number }> {
    return this.queuesService.publicStatus(slug);
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  list(
    @CurrentSession() session: AuthenticatedSession,
  ): Promise<
    Array<{
      id: string;
      name: string;
      publicSlug: string;
      status: QueueStatus;
      createdAt: Date;
    }>
  > {
    return this.queuesService.list(session);
  }

  @Get(':id')
  @UseGuards(SessionAuthGuard)
  getById(
    @CurrentSession() session: AuthenticatedSession,
    @Param('id') id: string,
  ): Promise<{
    id: string;
    name: string;
    publicSlug: string;
    status: QueueStatus;
  }> {
    return this.queuesService.getById(session, id);
  }

  @Post()
  @Roles(OrganizationRole.OWNER, OrganizationRole.MANAGER)
  @UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
  create(
    @CurrentSession() session: AuthenticatedSession,
    @Body() dto: CreateQueueDto,
  ): Promise<{
    id: string;
    name: string;
    publicSlug: string;
    status: QueueStatus;
  }> {
    return this.queuesService.create(session, dto);
  }
}
