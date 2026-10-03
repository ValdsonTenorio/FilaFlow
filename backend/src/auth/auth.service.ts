import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrganizationRole, Prisma } from '@prisma/client';
import argon2 from 'argon2';
import * as crypto from 'crypto';
import { Environment } from '../config/env.schema';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { AuthenticatedSession } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

const GENERIC_LOGIN_ERROR = 'E-mail ou senha inválidos.';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Environment, true>,
  ) {}

  async register(
    dto: RegisterDto,
  ): Promise<{ token: string; session: AuthenticatedSession }> {
    const email = this.normalizeEmail(dto.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser)
      throw new ConflictException('Não foi possível concluir o cadastro.');

    const passwordHash = await this.hashPassword(dto.password);
    const organizationSlug = await this.makeOrganizationSlug(
      dto.organizationName,
    );
    const created = await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: { email, passwordHash },
      });
      const organization = await transaction.organization.create({
        data: { name: dto.organizationName.trim(), slug: organizationSlug },
      });
      const membership = await transaction.organizationMember.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: OrganizationRole.OWNER,
        },
      });
      return { user, organization, membership };
    });

    const session = await this.createSession(
      created.user.id,
      created.organization.id,
      created.membership.id,
      created.membership.role,
    );
    return session;
  }

  async login(
    dto: LoginDto,
  ): Promise<{ token: string; session: AuthenticatedSession }> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      await this.controlledLoginDelay();
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
    });
    if (!membership) throw new UnauthorizedException(GENERIC_LOGIN_ERROR);

    return this.createSession(
      user.id,
      membership.organizationId,
      membership.id,
      membership.role,
    );
  }

  async validateSession(token: string): Promise<AuthenticatedSession | null> {
    const tokenHash = this.hashToken(token);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        membership: {
          select: { role: true, userId: true, organizationId: true },
        },
      },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.membership.userId !== session.userId ||
      session.membership.organizationId !== session.organizationId
    ) {
      if (session)
        await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastUsedAt: new Date() },
    });
    return {
      sessionId: session.id,
      userId: session.userId,
      organizationId: session.organizationId,
      membershipId: session.membershipId,
      role: session.membership.role,
    };
  }

  async rotateSession(
    currentSessionId: string,
  ): Promise<{ token: string; session: AuthenticatedSession }> {
    const current = await this.prisma.session.findUnique({
      include: { membership: true },
      where: { id: currentSessionId },
    });
    if (!current || current.expiresAt <= new Date())
      throw new UnauthorizedException('Sessão inválida ou expirada.');

    return this.prisma.$transaction(async (transaction) => {
      await transaction.session.delete({ where: { id: current.id } });
      return this.createSession(
        current.userId,
        current.organizationId,
        current.membershipId,
        current.membership.role,
        transaction,
      );
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } });
  }

  getSessionTtlMilliseconds(): number {
    return (
      this.config.get('SESSION_TTL_HOURS', { infer: true }) * 60 * 60 * 1000
    );
  }

  private async createSession(
    userId: string,
    organizationId: string,
    membershipId: string,
    role: OrganizationRole,
    prisma: PrismaService | Prisma.TransactionClient = this.prisma,
  ): Promise<{ token: string; session: AuthenticatedSession }> {
    const token = crypto.randomBytes(32).toString('base64url');
    const stored = await prisma.session.create({
      data: {
        tokenHash: this.hashToken(token),
        userId,
        organizationId,
        membershipId,
        expiresAt: new Date(Date.now() + this.getSessionTtlMilliseconds()),
      },
    });
    return {
      token,
      session: {
        sessionId: stored.id,
        userId,
        organizationId,
        membershipId,
        role,
      },
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async makeOrganizationSlug(name: string): Promise<string> {
    const base =
      name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60) || 'organizacao';
    const suffix = crypto.randomBytes(4).toString('hex');
    return `${base}-${suffix}`;
  }

  private async controlledLoginDelay(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
