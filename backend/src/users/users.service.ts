import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<{ id: string; email: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
}
