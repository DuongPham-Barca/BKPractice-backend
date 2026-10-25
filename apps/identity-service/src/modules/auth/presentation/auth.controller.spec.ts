import { issueCsrfToken } from '@app/common';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';

import { BK_TOKEN_SERVICE, REFRESH_SESSION_REPOSITORY, CompleteMicrosoftLogin,
  ExchangeMicrosoftLoginCode, GetCurrentAuthenticatedUser, LoginWithStudentId,
  LogoutAllSessions, LogoutCurrentSession, RefreshSession, StartMicrosoftLogin } from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import { AuthController } from '@/modules/auth/presentation';

describe('Identity authentication HTTP contract', () => {
  let app: INestApplication;
  let baseUrl: string;
  const pair = { userId: 'user-1', accessToken: 'access', refreshToken: 'refresh' };
  const login = { execute: jest.fn().mockResolvedValue(pair) };
  const start = { execute: jest.fn().mockResolvedValue('https://login.microsoftonline.com/tenant/oauth') };
  const complete = { execute: jest.fn().mockResolvedValue('https://app.example/auth/callback?loginCode=once') };
  const exchange = { execute: jest.fn().mockResolvedValue(pair) };
  const refresh = { execute: jest.fn().mockResolvedValue({
    userId: 'user-1', accessToken: 'next', refreshToken: 'next-refresh',
  }) };
  const logout = { execute: jest.fn().mockResolvedValue(undefined) };
  const logoutAll = { execute: jest.fn().mockResolvedValue(undefined) };
  const current = { execute: jest.fn().mockResolvedValue({
    userId: 'user-1', studentId: '2210001', roles: ['STUDENT'], status: 'ACTIVE',
  }) };
  const tokens = {
    verifyAccessClaims: jest.fn(async (value: string) => {
      if (value !== 'access' && value !== 'next' && value !== 'valid') throw new AuthFailure('invalid_token');
      return { sub: 'user-1', sid: 'session-1', jti: 'access-1', roles: ['STUDENT'],
        permissions: [], type: 'access' as const };
    }),
    verifyRefresh: jest.fn(async (value: string) => {
      if (value !== 'refresh' && value !== 'next-refresh') throw new AuthFailure('invalid_token');
      return { sub: 'user-1', fid: 'session-1', jti: 'refresh-1', type: 'refresh' as const, exp: 9999999999 };
    }),
  };
  const sessions = { isActive: jest.fn().mockResolvedValue(true) };
  const webHeaders = { 'content-type': 'application/json', origin: 'http://localhost:3006' };

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
        { provide: LogoutAllSessions, useValue: logoutAll },
        { provide: GetCurrentAuthenticatedUser, useValue: current },
        { provide: BK_TOKEN_SERVICE, useValue: tokens },
        { provide: REFRESH_SESSION_REPOSITORY, useValue: sessions },
        { provide: ConfigService, useValue: new ConfigService({
          JWT_ACCESS_TTL: '15m', JWT_REFRESH_TTL: '7d',
          JWT_ACCESS_SECRET: 'a'.repeat(32), CORS_ORIGINS: 'http://localhost:3006',
        }) },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      transform: true, whitelist: true, forbidNonWhitelisted: true,
    }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => { if (app) await app.close(); });

  it('delivers web tokens only as secure cookies and uses a signed CSRF value', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: webHeaders,
      body: JSON.stringify({ studentId: '2210001', password: '123456' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: 'user-1' });
    const setCookies = response.headers.get('set-cookie') ?? '';
    expect(setCookies).toContain('__Host-bk_access=access');
    expect(setCookies).toContain('__Secure-bk_refresh=refresh');
    expect(setCookies).toContain('Path=/api/auth');
    expect(setCookies).toContain('__Host-bk_csrf=');
    expect(setCookies).toContain('HttpOnly');
    expect(setCookies).toContain('Secure');
    expect(setCookies).toContain('SameSite=Lax');
    expect(setCookies).not.toContain('Domain=');
    const csrf = /__Host-bk_csrf=([^;]+)/.exec(setCookies)?.[1];
    expect(csrf).toBeDefined();
    const cookie = `__Secure-bk_refresh=refresh; __Host-bk_csrf=${csrf}; __Host-bk_access=access`;
    const readCsrf = await fetch(`${baseUrl}/api/auth/csrf`, { headers: { cookie } });
    expect(await readCsrf.json()).toEqual({ csrfToken: csrf });
    const denied = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST', headers: { ...webHeaders, cookie }, body: '{}',
    });
    expect(denied.status).toBe(403);
    const rotated = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST', headers: { ...webHeaders, cookie, 'x-csrf-token': csrf! }, body: '{}',
    });
    expect(rotated.status).toBe(200);
    expect(await rotated.json()).toEqual({ userId: 'user-1' });
    expect(rotated.headers.get('set-cookie')).toContain('__Secure-bk_refresh=next-refresh');
  });

  it('returns JSON tokens to mobile and no cookies', async () => {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-type': 'mobile' },
      body: JSON.stringify({ studentId: '2210001', password: '123456' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(pair);
    expect(response.headers.get('set-cookie')).toBeNull();
    const rotated = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-type': 'mobile' },
      body: JSON.stringify({ refreshToken: 'refresh' }),
    });
    expect(rotated.status).toBe(200);
    expect(await rotated.json()).toEqual({
      userId: 'user-1', accessToken: 'next', refreshToken: 'next-refresh',
    });
    expect(rotated.headers.get('set-cookie')).toBeNull();
  });

  it('keeps logout idempotent and requires authentication for logout-all', async () => {
    const empty = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: webHeaders, body: '{}',
    });
    expect(empty.status).toBe(204);
    expect(empty.headers.get('set-cookie')).toContain('__Secure-bk_refresh=;');
    const csrf = issueCsrfToken('session-1', 'a'.repeat(32));
    const webLogout = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { ...webHeaders,
        cookie: `__Secure-bk_refresh=refresh; __Host-bk_csrf=${csrf}`,
        'x-csrf-token': csrf }, body: '{}',
    });
    expect(webLogout.status).toBe(204);
    expect(logout.execute).toHaveBeenCalledWith({
      userId: undefined, sid: undefined, refreshToken: 'refresh',
    });
    const stale = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST', headers: { ...webHeaders, cookie: '__Host-bk_access=expired' }, body: '{}',
    });
    expect(stale.status).toBe(204);
    const mobile = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-client-type': 'mobile' },
      body: JSON.stringify({ refreshToken: 'invalid' }),
    });
    expect(mobile.status).toBe(204);
    expect(mobile.headers.get('set-cookie')).toBeNull();
    const allUnauthenticated = await fetch(`${baseUrl}/api/auth/logout-all`, {
      method: 'POST', headers: webHeaders, body: '{}',
    });
    expect(allUnauthenticated.status).toBe(401);
    const allWithoutCsrf = await fetch(`${baseUrl}/api/auth/logout-all`, {
      method: 'POST', headers: { ...webHeaders, cookie: '__Host-bk_access=access' }, body: '{}',
    });
    expect(allWithoutCsrf.status).toBe(403);
    const all = await fetch(`${baseUrl}/api/auth/logout-all`, {
      method: 'POST',
      headers: { authorization: 'Bearer valid', 'x-client-type': 'mobile' },
    });
    expect(all.status).toBe(204);
    expect(logoutAll.execute).toHaveBeenCalledWith('user-1');
  });

  it('keeps validation and Microsoft redirects safe', async () => {
    const invalid = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST', headers: webHeaders,
      body: JSON.stringify({ studentId: '2210001', password: '123456', roles: ['ADMIN'] }),
    });
    expect(invalid.status).toBe(400);
    expect((await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST', headers: webHeaders, body: '{}',
    })).status).toBe(404);
    expect((await fetch(`${baseUrl}/api/auth/microsoft`, { redirect: 'manual' })).status).toBe(302);
    const callback = await fetch(`${baseUrl}/api/auth/microsoft/callback?code=code&state=state&client_info=info`,
      { redirect: 'manual' });
    expect(callback.status).toBe(302);
    expect(callback.headers.get('location')).not.toMatch(/access_token|refresh_token/);
    expect(complete.execute).toHaveBeenCalledWith({ code: 'code', state: 'state', error: undefined });
  });

  it('documents all shared endpoints', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());
    expect(Object.keys(document.paths).sort()).toEqual([
      '/api/auth/login', '/api/auth/microsoft', '/api/auth/microsoft/callback',
      '/api/auth/microsoft/exchange', '/api/auth/refresh', '/api/auth/logout',
      '/api/auth/logout-all', '/api/auth/csrf', '/api/auth/me',
    ].sort());
  });
});
