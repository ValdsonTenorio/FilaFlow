import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationRole, QueueStatus } from '@prisma/client';
import { AuthenticatedSession } from '../auth/auth.types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CreateQueueDto } from './dto/create-queue.dto';

@Injectable()
export class QueuesService {
  constructor(private readonly prisma: PrismaService) {}

  list(session: AuthenticatedSession): Promise<
    Array<{
      id: string;
      name: string;
      publicSlug: string;
      status: QueueStatus;
      createdAt: Date;
    }>
  > {
    return this.prisma.queue.findMany({
      where: { organizationId: session.organizationId },
      select: {
        id: true,
        name: true,
        publicSlug: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getById(
    session: AuthenticatedSession,
    id: string,
  ): Promise<{
    id: string;
    name: string;
    publicSlug: string;
    status: QueueStatus;
  }> {
    const queue = await this.prisma.queue.findFirst({
      where: { id, organizationId: session.organizationId },
      select: { id: true, name: true, publicSlug: true, status: true },
    });
    if (!queue) throw new NotFoundException('Fila não encontrada.');
    return queue;
  }

  async create(
    session: AuthenticatedSession,
    dto: CreateQueueDto,
  ): Promise<{
    id: string;
    name: string;
    publicSlug: string;
    status: QueueStatus;
  }> {
    const publicSlug = dto.publicSlug.trim().toLowerCase();
    try {
      return await this.prisma.queue.create({
        data: {
          organizationId: session.organizationId,
          name: dto.name.trim(),
          publicSlug,
        },
        select: { id: true, name: true, publicSlug: true, status: true },
      });
    } catch (error: unknown) {
      if (this.isUniqueConstraint(error))
        throw new ConflictException('Este link público já está em uso.');
      throw error;
    }
  }

  async publicStatus(
    slug: string,
  ): Promise<{ name: string; status: QueueStatus; waiting: number }> {
    const queue = await this.prisma.queue.findUnique({
      where: { publicSlug: slug.toLowerCase() },
      select: {
        name: true,
        status: true,
        _count: { select: { entries: { where: { status: 'WAITING' } } } },
      },
    });
    if (!queue) throw new NotFoundException('Fila pública não encontrada.');
    return {
      name: queue.name,
      status: queue.status,
      waiting: queue._count.entries,
    };
  }

  canManage(role: OrganizationRole): boolean {
    return role === OrganizationRole.OWNER || role === OrganizationRole.MANAGER;
  }

  private isUniqueConstraint(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }
}
