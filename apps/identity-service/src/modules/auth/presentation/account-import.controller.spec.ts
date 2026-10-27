import { issueCsrfToken } from '@app/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import {
  BK_TOKEN_SERVICE,
  ImportAccounts,
  REFRESH_SESSION_REPOSITORY,
} from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import { AccountImportController } from '@/modules/auth/presentation/account-import.controller';
import { AccountImportGuard } from '@/modules/auth/presentation/account-import.guard';
import { IdentityAccessAuthenticator } from '@/modules/auth/presentation/identity-access.authenticator';

describe('Identity account import without Gateway', () => {
  let app: INestApplication;
  let baseUrl: string;
  const imports = { execute: jest.fn().mockResolvedValue({ totalRows: 1, created: 1 }) };
  const tokens = {
    verifyAccessClaims: jest.fn(async (token: string) => {
      if (token === 'invalid') throw new AuthFailure('invalid_token');
      return {
        sub: 'admin-1',
        sid: 'session-1',
        roles: token === 'student' ? ['STUDENT'] : ['ADMIN'],
        permissions: token === 'no-permission' ? [] : ['user:import'],
      };
    }),
  };
  const sessions = { isActive: jest.fn().mockResolvedValue(true) };

  function upload(headers: Record<string, string> = {}): Promise<Response> {
    const body = new FormData();
    body.set('file', new Blob(['workbook']), 'accounts.xlsx');
    return fetch(`${baseUrl}/api/auth/accounts/import`, { method: 'POST', headers, body });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AccountImportController],
      providers: [
        AccountImportGuard,
        IdentityAccessAuthenticator,
        { provide: ImportAccounts, useValue: imports },
        { provide: BK_TOKEN_SERVICE, useValue: tokens },
        { provide: REFRESH_SESSION_REPOSITORY, useValue: sessions },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            CORS_ORIGINS: 'http://localhost:3006',
            JWT_ACCESS_SECRET: 'a'.repeat(32),
          }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('requires an active access session before accepting multipart directly', async () => {
    expect((await upload()).status).toBe(401);
    expect((await upload({ authorization: 'Bearer invalid' })).status).toBe(401);

    sessions.isActive.mockResolvedValueOnce(false);
    expect((await upload({ authorization: 'Bearer admin' })).status).toBe(401);

    const accepted = await upload({ authorization: 'Bearer admin' });
    expect(accepted.status).toBe(201);
    expect(await accepted.json()).toEqual({ totalRows: 1, created: 1 });
    expect(imports.execute).toHaveBeenCalledWith(
      { userId: 'admin-1', roles: ['ADMIN'], permissions: ['user:import'] },
      Buffer.from('workbook'),
    );
  });

  it('accepts a web cookie with trusted Origin and CSRF, without Gateway', async () => {
    const csrf = issueCsrfToken('session-1', 'a'.repeat(32));
    const cookie = `__Host-bk_access=admin; __Host-bk_csrf=${csrf}`;
    expect((await upload({ cookie, origin: 'http://localhost:3006' })).status).toBe(403);
    expect((await upload({ cookie, 'x-csrf-token': csrf })).status).toBe(403);
    expect(
      (await upload({ cookie, origin: 'http://localhost:3006', 'x-csrf-token': csrf })).status,
    ).toBe(201);
  });

  it('returns 403 for a valid token without both ADMIN and user:import', async () => {
    expect((await upload({ authorization: 'Bearer no-permission' })).status).toBe(403);
    expect((await upload({ authorization: 'Bearer student' })).status).toBe(403);
  });
});
