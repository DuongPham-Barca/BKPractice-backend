import type { Request } from 'express';

import type { BkTokenService, RefreshSessionRepository } from '@/modules/auth/application/ports';
import { AuthFailure } from '@/modules/auth/domain';
import { SessionStatusController } from '@/modules/auth/presentation/session-status.controller';

describe('SessionStatusController', () => {
  const tokens = { verifyAccessClaims: jest.fn().mockResolvedValue({ sub: 'user-1', sid: 'sid-1' }) };
  const sessions = { isActive: jest.fn().mockResolvedValue(true) };
  const controller = new SessionStatusController(
    tokens as unknown as BkTokenService,
    sessions as unknown as RefreshSessionRepository,
  );
  const request = (authorization?: string) => ({
    header: (name: string) => name === 'authorization' ? authorization : undefined,
  }) as Request;

  it('accepts an active session and denies a revoked one', async () => {
    await expect(controller.check(request('Bearer access'))).resolves.toBeUndefined();
    expect(sessions.isActive).toHaveBeenCalledWith('user-1', 'sid-1');
    sessions.isActive.mockResolvedValueOnce(false);
    await expect(controller.check(request('Bearer access'))).rejects.toEqual(new AuthFailure('invalid_token'));
    await expect(controller.check(request())).rejects.toEqual(new AuthFailure('invalid_token'));
  });
});
