import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, QueueEntryStatus, QueueStatus } from '@prisma/client';
import { AuthenticatedSession } from '../auth/auth.types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { QueueEventsService } from './queue-events.service';

@Injectable()
export class QueueAttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: QueueEventsService,
  ) {}

  async callNext(
    session: AuthenticatedSession,
    queueId: string,
  ): Promise<void> {
    await this.transition(session, queueId, undefined, 'NEXT');
  }

  async transition(
    session: AuthenticatedSession,
    queueId: string,
    entryId: string | undefined,
    action: 'START' | 'COMPLETE' | 'NO_SHOW' | 'CANCEL' | 'NEXT',
  ): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const queue = await transaction.queue.findFirst({
          where: { id: queueId, organizationId: session.organizationId },
          select: { id: true, status: true },
        });
        if (!queue) throw new NotFoundException('Fila não encontrada.');
        if (queue.status !== QueueStatus.OPEN)
          throw new ConflictException('A fila não está ativa.');
        await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${queue.id}))`;
        const current = await transaction.queueEntry.findFirst({
          where: {
            queueId,
            status: {
              in: [QueueEntryStatus.CALLED, QueueEntryStatus.IN_SERVICE],
            },
          },
          select: { id: true, status: true },
        });
        if (action === 'NEXT') {
          if (current)
            throw new ConflictException(
              'Já existe um cliente em atendimento nesta fila.',
            );
          const next = await transaction.queueEntry.findFirst({
            where: { queueId, status: QueueEntryStatus.WAITING },
            orderBy: { position: 'asc' },
            select: { id: true },
          });
          if (!next) throw new ConflictException('Não há clientes aguardando.');
          await transaction.queueEntry.update({
            where: { id: next.id },
            data: {
              status: QueueEntryStatus.IN_SERVICE,
              calledAt: new Date(),
              startedAt: new Date(),
              position: 0,
            },
          });
        } else {
          if (!entryId)
            throw new NotFoundException('Atendimento não encontrado.');
          const entry = await transaction.queueEntry.findFirst({
            where: {
              id: entryId,
              queueId,
              organizationId: session.organizationId,
            },
            select: { id: true, status: true },
          });
          if (!entry)
            throw new NotFoundException('Atendimento não encontrado.');
          await transaction.queueEntry.update({
            where: { id: entry.id },
            data: this.transitionData(action, entry.status),
          });
        }
        await transaction.$executeRaw`WITH ordered AS (SELECT id, row_number() OVER (ORDER BY "createdAt", id)::int AS new_position FROM "QueueEntry" WHERE "queueId" = ${queueId} AND status = 'WAITING') UPDATE "QueueEntry" entry SET position = ordered.new_position FROM ordered WHERE entry.id = ordered.id`;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    this.events.emitQueueUpdated(queueId);
  }

  private transitionData(
    action: 'START' | 'COMPLETE' | 'NO_SHOW' | 'CANCEL',
    status: QueueEntryStatus,
  ): Prisma.QueueEntryUpdateInput {
    if (action === 'START' && status === QueueEntryStatus.CALLED)
      return { status: QueueEntryStatus.IN_SERVICE, startedAt: new Date() };
    if (action === 'COMPLETE' && status === QueueEntryStatus.IN_SERVICE)
      return {
        status: QueueEntryStatus.COMPLETED,
        completedAt: new Date(),
        position: 0,
      };
    if (action === 'NO_SHOW' && status === QueueEntryStatus.IN_SERVICE)
      return {
        status: QueueEntryStatus.NO_SHOW,
        noShowAt: new Date(),
        position: 0,
      };
    if (
      action === 'CANCEL' &&
      (status === QueueEntryStatus.WAITING ||
        status === QueueEntryStatus.CALLED ||
        status === QueueEntryStatus.IN_SERVICE)
    )
      return {
        status: QueueEntryStatus.CANCELLED,
        cancelledAt: new Date(),
        position: 0,
      };
    throw new ConflictException('Transição de atendimento inválida.');
  }
}
