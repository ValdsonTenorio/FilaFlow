import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedSession } from '../auth/auth.types';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async current(session: AuthenticatedSession): Promise<{ id: string; name: string; slug: string; role: string }> {
    const organization = await this.prisma.organization.findUnique({ where: { id: session.organizationId }, select: { id: true, name: true, slug: true } });
    if (!organization) throw new NotFoundException('Organização não encontrada.');
    return { ...organization, role: session.role };
  }
}
