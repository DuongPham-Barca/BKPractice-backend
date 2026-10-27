import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

import { InternalServiceGuard } from './internal-service.guard';

describe('InternalServiceGuard', () => {
  it('allows a request with the configured internal secret', () => {
    const guard = createGuard('expected-secret');

    expect(guard.canActivate(contextWith(requestWith('expected-secret')))).toBe(true);
  });

  it('rejects a request with a missing or different secret', () => {
    const guard = createGuard('expected-secret');

    expect(() => guard.canActivate(contextWith(requestWith('other-secret')))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contextWith(requestWith(undefined)))).toThrow(
      UnauthorizedException,
    );
  });

  it('reads the secret from x-internal-service-secret exactly once', () => {
    const request = requestWith('expected-secret');
    const guard = createGuard('expected-secret');

    guard.canActivate(contextWith(request));

    expect(request.header).toHaveBeenCalledWith('x-internal-service-secret');
  });
});

function createGuard(configuredSecret: string): InternalServiceGuard {
  const config = { getOrThrow: jest.fn().mockReturnValue(configuredSecret) };

  return new InternalServiceGuard(config as unknown as ConfigService);
}

function requestWith(headerValue: string | undefined) {
  return { header: jest.fn().mockReturnValue(headerValue) };
}

function contextWith(request: ReturnType<typeof requestWith>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request as unknown as Request }),
  } as unknown as ExecutionContext;
}
