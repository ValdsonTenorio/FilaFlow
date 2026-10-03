import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRole, Prisma, QueueStatus } from '@prisma/client';
import * as crypto from 'crypto';
import { AuthenticatedSession } from '../auth/auth.types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { CreateQueueEntryDto } from './dto/create-queue-entry.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';

type QueueSummary = {
  id: string;
  name: string;
  publicSlug: string;
  status: QueueStatus;
  createdAt: Date;
  waiting: number;
};

type QueueDetails = Omit<QueueSummary, 'createdAt' | 'waiting'> & {
  entries: Array<{
    id: string;
    displayName: string;
    position: number;
    createdAt: Date;
  }>;
};

@Injectable()
export class QueuesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(session: AuthenticatedSession): Promise<QueueSummary[]> {
    const queues = await this.prisma.queue.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        status: true,
        createdAt: true,
        _count: {
          select: { entries: { where: { status: 'WAITING' } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return queues.map(({ _count, ...queue }) => ({
      ...queue,
      waiting: _count.entries,
    }));
  }

  async getById(
    session: AuthenticatedSession,
    id: string,
  ): Promise<QueueDetails> {
    const queue = await this.prisma.queue.findFirst({
      where: { id, organizationId: session.organizationId },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        status: true,
        entries: {
          where: { status: 'WAITING' },
          select: {
            id: true,
            displayName: true,
            position: true,
            createdAt: true,
          },
          orderBy: { position: 'asc' },
          take: 100,
        },
      },
    });
    if (!queue) throw new NotFoundException('Fila não encontrada.');
    return queue;
  }

  async create(
    session: AuthenticatedSession,
    dto: CreateQueueDto,
  ): Promise<Omit<QueueSummary, 'createdAt' | 'waiting'>> {
    return this.prisma.queue.create({
      data: {
        organizationId: session.organizationId,
        name: dto.name.trim(),
        publicSlug: crypto.randomBytes(18).toString('base64url'),
      },
      select: { id: true, name: true, publicSlug: true, status: true },
    });
  }

  async update(
    session: AuthenticatedSession,
    id: string,
    dto: UpdateQueueDto,
  ): Promise<Omit<QueueSummary, 'createdAt' | 'waiting'>> {
    const updated = await this.prisma.queue.updateMany({
      where: { id, organizationId: session.organizationId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.status ? { status: dto.status } : {}),
      },
    });
    if (!updated.count) throw new NotFoundException('Fila não encontrada.');

    const queue = await this.getById(session, id);
    return {
      id: queue.id,
      name: queue.name,
      publicSlug: queue.publicSlug,
      status: queue.status,
    };
  }

  async remove(session: AuthenticatedSession, id: string): Promise<void> {
    const deleted = await this.prisma.queue.deleteMany({
      where: { id, organizationId: session.organizationId },
    });
    if (!deleted.count) throw new NotFoundException('Fila não encontrada.');
  }

  async publicStatus(
    slug: string,
  ): Promise<{ name: string; status: QueueStatus; waiting: number }> {
    const queue = await this.prisma.queue.findUnique({
      where: { publicSlug: slug },
      select: {
        name: true,
        status: true,
        _count: {
          select: { entries: { where: { status: 'WAITING' } } },
        },
      },
    });
    if (!queue || queue.status !== QueueStatus.OPEN) {
      throw new NotFoundException('Fila pública não encontrada.');
    }
    return {
      name: queue.name,
      status: queue.status,
      waiting: queue._count.entries,
    };
  }

  async enterPublicQueue(
    slug: string,
    dto: CreateQueueEntryDto,
  ): Promise<{ queueName: string; firstName: string; position: number }> {
    return this.withSerializationRetry(() =>
      this.prisma.$transaction(
        async (transaction) => {
          const queue = await transaction.queue.findUnique({
            where: { publicSlug: slug },
            select: {
              id: true,
              name: true,
              organizationId: true,
              status: true,
            },
          });
          if (!queue || queue.status !== QueueStatus.OPEN) {
            throw new NotFoundException('Fila pública não encontrada.');
          }

          await transaction.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${queue.id}))`;
          const lastEntry = await transaction.queueEntry.aggregate({
            where: { queueId: queue.id },
            _max: { position: true },
          });
          const position = (lastEntry._max.position ?? 0) + 1;
          await transaction.queueEntry.create({
            data: {
              queueId: queue.id,
              organizationId: queue.organizationId,
              displayName: dto.firstName,
              position,
            },
          });

          return { queueName: queue.name, firstName: dto.firstName, position };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }

  canManage(role: OrganizationRole): boolean {
    return role === OrganizationRole.OWNER || role === OrganizationRole.MANAGER;
  }

  private async withSerializationRetry<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await operation();
      } catch (error: unknown) {
        if (!this.isSerializationConflict(error) || attempt === 2) throw error;
      }
    }
    throw new ConflictException(
      'Não foi possível registrar sua entrada. Tente novamente.',
    );
  }

  private isSerializationConflict(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2034'
    );
  }
}
