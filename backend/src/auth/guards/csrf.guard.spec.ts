import { ForbiddenException } from '@nestjs/common';
import { CsrfGuard } from './csrf.guard';

describe('CsrfGuard', () => {
  const guard = new CsrfGuard();
  const contextFor = (cookie: string, header: string) => ({ switchToHttp: () => ({ getRequest: () => ({ cookies: { ff_csrf: cookie }, header: () => header }) }) }) as never;

  it('aceita tokens iguais', () => expect(guard.canActivate(contextFor('token-seguro', 'token-seguro'))).toBe(true));
  it('rejeita tokens diferentes', () => expect(() => guard.canActivate(contextFor('token-seguro', 'outro-token'))).toThrow(ForbiddenException));
});
