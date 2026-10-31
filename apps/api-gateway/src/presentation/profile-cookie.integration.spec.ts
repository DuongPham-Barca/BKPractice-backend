import { issueCsrfToken } from '@app/common';
import type { GatewaySessionService } from '@gateway/application/auth/gateway-session.service';
import { GatewayProxyService } from '@gateway/application/proxy/gateway-proxy.service';
import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AxiosRequestConfig } from 'axios';
import type { Request, Response } from 'express';
import { of } from 'rxjs';

import { GatewayAuthMiddleware } from './middleware/gateway-auth.middleware';

describe('Profile access through the browser cookie', () => {
  const config = new ConfigService({
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    CORS_ORIGINS: 'https://app.example',
    IDENTITY_SERVICE_URL: 'http://identity:3001',
    LEARNING_SERVICE_URL: 'http://learning:3002',
    SUBMISSION_SERVICE_URL: 'http://submission:3003',
    COMMUNITY_SERVICE_URL: 'http://community:3005',
  });
  const jwt = new JwtService();
  const sessions = { isActive: jest.fn().mockResolvedValue(true) } as unknown as GatewaySessionService;
  const middleware = new GatewayAuthMiddleware(jwt, config, sessions);
  const http = {
    request: jest.fn((_options: AxiosRequestConfig) => of({ status: 200, headers: {}, data: {} })),
  };
  const proxy = new GatewayProxyService(http as unknown as HttpService, config);
  const response = {
    setHeader: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;
  const next = jest.fn();
  const userPath = '/api/users/00000000-0000-0000-0000-000000000001/profile';

  function request(method: string, path: string, cookie?: string, origin?: string): Request {
    const headers: Record<string, string> = {};
    if (cookie) headers.cookie = cookie;
    if (origin) headers.origin = origin;
    return {
      method,
      path,
      originalUrl: path,
      headers,
      body: {},
      header: (name: string) => headers[name],
    } as unknown as Request;
  }

  beforeEach(() => jest.clearAllMocks());

  it('authenticates owner and Admin Profile requests without a client Authorization header', async () => {
    const routes: Array<[string, string, string]> = [
      ['STUDENT', 'GET', '/api/profile/me'],
      ['STUDENT', 'PATCH', '/api/profile/me'],
      ['STUDENT', 'POST', '/api/profile/me/avatar/upload-url'],
      ['ADMIN', 'GET', userPath],
      ['ADMIN', 'PATCH', userPath],
    ];
    for (const [role, method, path] of routes) {
      const token = await jwt.signAsync(
        { sub: 'user-1', sid: 'session-1', jti: 'access-1', roles: [role], type: 'access' },
        { secret: 'a'.repeat(32), expiresIn: '15m' },
      );
      const csrf = issueCsrfToken('session-1', 'a'.repeat(32));
      const incoming = request(
        method,
        path,
        `__Host-bk_access=${token}; __Host-bk_csrf=${csrf}`,
        method === 'GET' ? undefined : 'https://app.example',
      );
      if (method !== 'GET') incoming.headers['x-csrf-token'] = csrf;
      await middleware.use(incoming, response, next);
      expect(next).toHaveBeenCalled();
      expect(incoming.headers.cookie).toBeUndefined();
      expect(incoming.headers.authorization).toBe(`Bearer ${token}`);
      await proxy.forward(incoming, response);
      const forwarded = http.request.mock.lastCall?.[0];
      expect(forwarded?.url).toBe(`http://identity:3001${path}`);
      expect(forwarded?.headers).toMatchObject({
        authorization: `Bearer ${token}`,
        'x-auth-user-id': 'user-1',
        'x-auth-roles': role,
      });
      expect(forwarded?.headers).not.toHaveProperty('cookie');
    }
  });

  it('keeps public Profile GET open and rejects cookie writes from an untrusted origin', async () => {
    const publicRead = request('GET', userPath);
    await middleware.use(publicRead, response, next);
    expect(publicRead.headers.authorization).toBeUndefined();

    const token = await jwt.signAsync(
      { sub: 'user-1', sid: 'session-1', jti: 'access-1', roles: ['STUDENT'], type: 'access' },
      { secret: 'a'.repeat(32), expiresIn: '15m' },
    );
    const denied = request('PATCH', '/api/profile/me', `__Host-bk_access=${token}`);
    await expect(middleware.use(denied, response, next)).rejects.toThrow(
      'Untrusted request origin',
    );
  });
});
