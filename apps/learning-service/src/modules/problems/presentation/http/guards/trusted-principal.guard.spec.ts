import { UnauthorizedError } from '@learning/modules/problems/application/errors/unauthorized.error';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { TrustedPrincipalGuard } from './trusted-principal.guard';

const USER_ID = '00000000-0000-4000-8000-000000000031';

describe('TrustedPrincipalGuard', () => {
  const guard = new TrustedPrincipalGuard();

  it('allows a request carrying a valid trusted user id', () => {
    expect(guard.canActivate(contextWith(['x-auth-user-id', USER_ID]))).toBe(true);
  });

  it('rejects a request without a valid trusted user id', () => {
    expect(() => guard.canActivate(contextWith([]))).toThrow(UnauthorizedError);
    expect(() => guard.canActivate(contextWith(['x-auth-user-id', 'not-a-uuid']))).toThrow(
      UnauthorizedError,
    );
  });
});

function contextWith(rawHeaders: string[]): ExecutionContext {
  const request = { rawHeaders } as unknown as Request;

  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}
