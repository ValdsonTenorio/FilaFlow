import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { OrganizationRole, QueueStatus } from '@prisma/client';
import { Observable } from 'rxjs';
import { AuthenticatedSession } from '../auth/auth.types';
import { CurrentSession } from '../auth/decorators/current-session.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { CreateQueueDto } from './dto/create-queue.dto';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';
import { QueuesService } from './queues.service';
import { QueueAttendanceService } from './queue-attendance.service';
import { QueueEvent, QueueEventsService } from './queue-events.service';

@Controller('queues')
export class QueuesController {
  constructor(
    private readonly queuesService: QueuesService,
    private readonly attendanceService: QueueAttendanceService,
    private readonly queueEvents: QueueEventsService,
  ) {}

  @Get('public/:slug')
  publicStatus(
    @Param('slug') slug: string,
  ): Promise<{ name: string; status: QueueStatus; waiting: number }> {
    return this.queuesService.publicStatus(slug);
  }

  @Post('public/:slug/entries')
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  enterPublicQueue(
    @Param('slug') slug: string,
    @Body() dto: CreateQueueEntryDto,
  ): Promise<{ queueName: string; firstName: string; position: number }> {
    return this.queuesService.enterPublicQueue(slug, dto);
  }

  @Get('public/:slug/panel')
  publicPanel(@Param('slug') slug: string): Promise<{
    name: string;
    current: string | null;
    next: string[];
    updatedAt: Date;
  }> {
    return this.queuesService.publicDashboard(slug);
  }

  @Sse('public/:slug/events')
  publicEvents(@Param('slug') slug: string): Promise<Observable<QueueEvent>> {
    return this.queuesService.publicEvents(slug);
  }

  @Get('public/entries/:token')
  customerStatus(@Param('token') token: string): Promise<{
    queueName: string;
    status: string;
    position: number | null;
    ahead: number;
  }> {
    return this.queuesService.customerStatus(token);
  }

  @Sse('public/entries/:token/events')
  customerEvents(
    @Param('token') token: string,
  ): Promise<Observable<QueueEvent>> {
    return this.queuesService.customerEvents(token);
  }

  @Get()
  @UseGuards(SessionAuthGuard)
  list(@CurrentSession() session: AuthenticatedSession): Promise<
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

  @Post(':id/attendance/next')
  @HttpCode(204)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.MANAGER,
    OrganizationRole.ATTENDANT,
  )
  @UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
  async callNext(
    @CurrentSession() session: AuthenticatedSession,
    @Param('id') id: string,
  ): Promise<void> {
    await this.attendanceService.callNext(session, id);
  }

  @Post(':id/entries/:entryId/:action')
  @HttpCode(204)
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.MANAGER,
    OrganizationRole.ATTENDANT,
  )
  @UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
  async transition(
    @CurrentSession() session: AuthenticatedSession,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Param('action') action: 'start' | 'complete' | 'no-show' | 'cancel',
  ): Promise<void> {
    const actions = {
      start: 'START',
      complete: 'COMPLETE',
      'no-show': 'NO_SHOW',
      cancel: 'CANCEL',
    } as const;
    const transition = actions[action];
    if (!transition)
      throw new NotFoundException('Ação de atendimento não encontrada.');
    await this.attendanceService.transition(session, id, entryId, transition);
  }

  @Sse(':id/events')
  @UseGuards(SessionAuthGuard)
  async staffEvents(
    @CurrentSession() session: AuthenticatedSession,
    @Param('id') id: string,
  ): Promise<Observable<QueueEvent>> {
    await this.queuesService.getById(session, id);
    return this.queueEvents.stream(id);
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

  @Patch(':id')
  @Roles(OrganizationRole.OWNER, OrganizationRole.MANAGER)
  @UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
  update(
    @CurrentSession() session: AuthenticatedSession,
    @Param('id') id: string,
    @Body() dto: UpdateQueueDto,
  ): Promise<{
    id: string;
    name: string;
    publicSlug: string;
    status: QueueStatus;
  }> {
    return this.queuesService.update(session, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @Roles(OrganizationRole.OWNER, OrganizationRole.MANAGER)
  @UseGuards(SessionAuthGuard, RolesGuard, CsrfGuard)
  async remove(
    @CurrentSession() session: AuthenticatedSession,
    @Param('id') id: string,
  ): Promise<void> {
    await this.queuesService.remove(session, id);
  }
}
