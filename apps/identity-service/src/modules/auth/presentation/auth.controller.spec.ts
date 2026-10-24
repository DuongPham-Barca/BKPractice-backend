import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import {
  BK_TOKEN_SERVICE,
  CompleteMicrosoftLogin,
  ExchangeMicrosoftLoginCode,
  GetCurrentAuthenticatedUser,
  LoginWithStudentId,
  LogoutCurrentSession,
  RefreshSession,
  StartMicrosoftLogin,
} from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import { AuthController } from '@/modules/auth/presentation';

describe('Identity authentication HTTP contract', () => {
  let app: INestApplication;
  let baseUrl: string;
  const login = {
    execute: jest
      .fn()
      .mockResolvedValue({ userId: 'user-1', accessToken: 'access', refreshToken: 'refresh' }),
  };
  const start = {
    execute: jest.fn().mockResolvedValue('https://login.microsoftonline.com/tenant/oauth'),
  };
  const complete = {
    execute: jest.fn().mockResolvedValue('https://app.example/auth/callback?loginCode=once'),
  };
  const exchange = {
    execute: jest
      .fn()
      .mockResolvedValue({ userId: 'user-1', accessToken: 'access', refreshToken: 'refresh' }),
  };
  const refresh = {
    execute: jest.fn().mockResolvedValue({ accessToken: 'next', refreshToken: 'next-refresh' }),
  };
  const logout = { execute: jest.fn().mockResolvedValue(undefined) };
  const current = {
    execute: jest.fn().mockResolvedValue({
      userId: 'user-1',
      studentId: '2210001',
      roles: ['STUDENT'],
      status: 'ACTIVE',
    }),
  };
  const tokens = { verifyAccess: jest.fn().mockResolvedValue('user-1') };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: LoginWithStudentId, useValue: login },
        { provide: StartMicrosoftLogin, useValue: start },
        { provide: CompleteMicrosoftLogin, useValue: complete },
        { provide: ExchangeMicrosoftLoginCode, useValue: exchange },
        { provide: RefreshSession, useValue: refresh },
        { provide: LogoutCurrentSession, useValue: logout },
        { provide: GetCurrentAuthenticatedUser, useValue: current },
        { provide: BK_TOKEN_SERVICE, useValue: tokens },
        { provide: ConfigService, useValue: new ConfigService({ JWT_ACCESS_TTL: '15m' }) },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects public registration and extra login fields', async () => {
    const register = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    expect(register.status).toBe(404);
    const invalid = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: '2210001', password: '123456', roles: ['ADMIN'] }),
    });
    expect(invalid.status).toBe(400);
    expect(login.execute).not.toHaveBeenCalled();
  });

  it('exposes the seven approved operations with guarded logout and me', async () => {
    const post = (path: string, body: unknown, authorization?: string) =>
      fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(authorization ? { authorization } : {}),
        },
        body: JSON.stringify(body),
      });
    const loginResponse = await post('/api/auth/login', {
      studentId: '2210001',
      password: '123456',
    });
    expect(loginResponse.status).toBe(200);
    expect(await loginResponse.json()).toEqual({ userId: 'user-1', refreshToken: 'refresh' });
    expect(loginResponse.headers.get('set-cookie')).toMatch(/^__Host-bk_access=access;/);
    expect(loginResponse.headers.get('set-cookie')).toContain('HttpOnly');
    expect(loginResponse.headers.get('set-cookie')).toContain('Secure');
    expect(loginResponse.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(loginResponse.headers.get('set-cookie')).toContain('Path=/');
    expect(loginResponse.headers.get('set-cookie')).toContain('Max-Age=900');
    expect(loginResponse.headers.get('set-cookie')).not.toContain('Domain=');
    expect((await fetch(`${baseUrl}/api/auth/microsoft`, { redirect: 'manual' })).status).toBe(302);
    expect(
      (
        await fetch(`${baseUrl}/api/auth/microsoft/callback?code=code&state=state`, {
          redirect: 'manual',
        })
      ).status,
    ).toBe(302);
    const exchangeResponse = await post('/api/auth/microsoft/exchange', { loginCode: 'once' });
    expect(exchangeResponse.status).toBe(200);
    expect(await exchangeResponse.json()).toEqual({ userId: 'user-1', refreshToken: 'refresh' });
    expect(exchangeResponse.headers.get('set-cookie')).toMatch(/^__Host-bk_access=access;/);
    const refreshResponse = await post('/api/auth/refresh', { refreshToken: 'refresh' });
    expect(refreshResponse.status).toBe(200);
    expect(await refreshResponse.json()).toEqual({ refreshToken: 'next-refresh' });
    expect(refreshResponse.headers.get('set-cookie')).toMatch(/^__Host-bk_access=next;/);
    expect((await post('/api/auth/logout', { refreshToken: 'refresh' })).status).toBe(401);
    const logoutResponse = await post(
      '/api/auth/logout',
      { refreshToken: 'refresh' },
      'Bearer valid',
    );
    expect(logoutResponse.status).toBe(204);
    expect(logoutResponse.headers.get('set-cookie')).toContain('__Host-bk_access=;');
    expect(logoutResponse.headers.get('set-cookie')).toContain('Path=/');
    expect(logoutResponse.headers.get('set-cookie')).toContain('HttpOnly');
    expect(logoutResponse.headers.get('set-cookie')).toContain('Secure');
    expect(logoutResponse.headers.get('set-cookie')).toContain('SameSite=Lax');
    expect(logout.execute).toHaveBeenCalledWith('user-1', 'refresh');
    expect((await fetch(`${baseUrl}/api/auth/me`)).status).toBe(401);
    const me = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { authorization: 'Bearer valid' },
    });
    expect(me.status).toBe(200);
    expect(await me.json()).toEqual({
      userId: 'user-1',
      studentId: '2210001',
      roles: ['STUDENT'],
      status: 'ACTIVE',
    });
  });

  it('maps authentication failures to one public 401', async () => {
    login.execute.mockRejectedValueOnce(new AuthFailure('invalid_credentials'));
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentId: '2210001', password: 'wrong' }),
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ statusCode: 401, message: 'Authentication failed' });
  });

  it('accepts Microsoft callback metadata without trusting or passing it to the use case', async () => {
    complete.execute.mockClear();
    const response = await fetch(
      `${baseUrl}/api/auth/microsoft/callback?code=code&state=state&client_info=info&session_state=session&clientdata=data`,
      { redirect: 'manual' },
    );
    expect(response.status).toBe(302);
    expect(complete.execute).toHaveBeenCalledWith({
      code: 'code',
      state: 'state',
      error: undefined,
    });

    const invalid = await fetch(
      `${baseUrl}/api/auth/microsoft/callback?code=code&state=state&roles=ADMIN`,
      { redirect: 'manual' },
    );
    expect(invalid.status).toBe(400);
    expect(complete.execute).toHaveBeenCalledTimes(1);
  });

  it('documents the seven auth operations and the Microsoft exchange window', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().addBearerAuth().build(),
    );
    expect(Object.keys(document.paths).sort()).toEqual(
      [
        '/api/auth/login',
        '/api/auth/microsoft',
        '/api/auth/microsoft/callback',
        '/api/auth/microsoft/exchange',
        '/api/auth/refresh',
        '/api/auth/logout',
        '/api/auth/me',
      ].sort(),
    );
    expect(document.paths['/api/auth/microsoft/exchange']?.post?.summary).toContain('60 seconds');
    expect(document.paths['/api/auth/logout']?.post?.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/api/auth/me']?.get?.security).toEqual([{ bearer: [] }]);
  });
});
