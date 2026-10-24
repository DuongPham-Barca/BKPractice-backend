import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { AuthAccount } from '@/modules/auth/domain';
import { AuthFailure } from '@/modules/auth/domain';
import { JwtBkTokenService } from '@/modules/auth/infrastructure/security';

const account: AuthAccount = {
  userId: 'user-1',
  studentId: '2210001',
  email: 'student@school.edu',
  status: 'ACTIVE',
  roles: ['STUDENT'],
};

describe('JwtBkTokenService', () => {
  const jwt = new JwtService();
  const config = new ConfigService({
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'r'.repeat(32),
    JWT_ACCESS_TTL: '15m',
    JWT_REFRESH_TTL: '7d',
  });
  const tokens = new JwtBkTokenService(jwt, config);

  it('signs only the approved access claims and keeps permissions out of refresh', async () => {
    const access = await tokens.signAccess(account, ['problem:create']);
    const refresh = await tokens.signRefresh(account.userId, 'token-1', 'family-1');
    expect(Object.keys(jwt.decode<Record<string, unknown>>(access)).sort()).toEqual([
      'exp',
      'iat',
      'permissions',
      'roles',
      'sub',
      'type',
    ]);
    expect(jwt.decode<Record<string, unknown>>(access).permissions).toEqual(['problem:create']);
    expect(Object.keys(jwt.decode<Record<string, unknown>>(refresh.token)).sort()).toEqual([
      'exp',
      'fid',
      'iat',
      'jti',
      'sub',
      'type',
    ]);
    expect(await tokens.verifyAccess(access)).toBe('user-1');
    expect((await tokens.verifyRefresh(refresh.token)).fid).toBe('family-1');
    await expect(tokens.verifyAccess(refresh.token)).rejects.toBeInstanceOf(AuthFailure);
    await expect(tokens.verifyRefresh(access)).rejects.toBeInstanceOf(AuthFailure);
  });
});
