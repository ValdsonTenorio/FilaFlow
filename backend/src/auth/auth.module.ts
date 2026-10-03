import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionAuthGuard, RolesGuard, CsrfGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard, CsrfGuard],
})
export class AuthModule {}
