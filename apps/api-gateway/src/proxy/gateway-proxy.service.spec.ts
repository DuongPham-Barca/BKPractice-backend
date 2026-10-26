import type { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { of } from 'rxjs';

import { GatewayProxyService } from './gateway-proxy.service';

describe('GatewayProxyService', () => {
  const request = {
    method: 'GET',
    path: '/api/auth/microsoft',
    originalUrl: '/api/auth/microsoft',
    headers: { host: 'localhost' },
  } as unknown as Request;
  const headers: Record<string, string> = {};
  const response = {
    setHeader: jest.fn((key: string, value: string) => {
      headers[key] = value;
    }),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;
  const config = new ConfigService({
    IDENTITY_SERVICE_URL: 'http://localhost:3001',
    LEARNING_SERVICE_URL: 'http://localhost:3002',
    SUBMISSION_SERVICE_URL: 'http://localhost:3003',
    COMMUNITY_SERVICE_URL: 'http://localhost:3005',
  });

  beforeEach(() => {
    Object.keys(headers).forEach((key) => delete headers[key]);
    jest.clearAllMocks();
  });

  it.each(['GET', 'POST', 'DELETE'])(
    'forwards %s role management to Identity and preserves Authorization',
    async (method) => {
      const path = `/api/roles/users/user-1${method === 'DELETE' ? '/LECTURER' : ''}`;
      const upstream = {
        request: jest
          .fn()
          .mockReturnValue(
            of({ status: 200, headers: {}, data: { userId: 'user-1', roles: ['LECTURER'] } }),
          ),
      };
      await new GatewayProxyService(upstream as unknown as HttpService, config).forward(
        {
          method,
          path,
          originalUrl: path,
          headers: { authorization: 'Bearer test-access', 'x-auth-user-id': 'admin' },
          body: method === 'POST' ? { role: 'LECTURER' } : undefined,
        } as unknown as Request,
        response,
      );
      expect(upstream.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method,
          url: `http://localhost:3001${path}`,
          headers: {
            authorization: 'Bearer test-access',
            'x-auth-user-id': 'admin',
          },
        }),
      );
    },
  );

  it('forwards a safe OAuth Location without forwarding set-cookie', async () => {
    const http = {
      request: jest.fn().mockReturnValue(
        of({
          status: 302,
          headers: {
            location: 'https://login.microsoftonline.com/tenant/oauth?state=abc',
            'set-cookie': 'session=secret',
          },
          data: '',
        }),
      ),
    } as unknown as HttpService;
    await new GatewayProxyService(http, config).forward(request, response);
    expect(headers.location).toBe('https://login.microsoftonline.com/tenant/oauth?state=abc');
    expect(headers['set-cookie']).toBeUndefined();
    expect(response.status).toHaveBeenCalledWith(302);
  });

  it('rejects an OAuth redirect containing bearer tokens', async () => {
    const http = {
      request: jest.fn().mockReturnValue(
        of({
          status: 302,
          headers: { location: 'https://app.example/callback?access_token=secret' },
          data: '',
        }),
      ),
    } as unknown as HttpService;
    await expect(
      new GatewayProxyService(http, config).forward(request, response),
    ).rejects.toThrow();
  });

  it('forwards only the approved auth cookies on a successful web login', async () => {
    const cookies = [
      '__Host-bk_access=access; Path=/; HttpOnly; Secure; SameSite=Lax',
      '__Secure-bk_refresh=refresh; Path=/api/auth; HttpOnly; Secure; SameSite=Lax',
      '__Host-bk_csrf=csrf; Path=/; Secure; SameSite=Lax',
    ];
    const upstream = {
      request: jest.fn().mockReturnValue(
        of({
          status: 200,
          headers: { 'set-cookie': cookies },
          data: { userId: 'user-1' },
        }),
      ),
    };
    await new GatewayProxyService(upstream as unknown as HttpService, config).forward(
      {
        method: 'POST',
        path: '/api/auth/login',
        originalUrl: '/api/auth/login',
        headers: { cookie: 'other=secret', origin: 'https://app.example' },
        body: { studentId: '2210001', password: 'password' },
      } as unknown as Request,
      response,
    );
    expect(headers['set-cookie']).toEqual(cookies);
    expect(upstream.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { origin: 'https://app.example' },
      }),
    );
  });

  it('forwards the cleared auth cookies after logout through Gateway', async () => {
    const cookies = [
      '__Host-bk_access=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
      '__Secure-bk_refresh=; Path=/api/auth; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax',
      '__Host-bk_csrf=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Lax',
    ];
    const upstream = {
      request: jest
        .fn()
        .mockReturnValue(of({ status: 204, headers: { 'set-cookie': cookies }, data: '' })),
    };
    await new GatewayProxyService(upstream as unknown as HttpService, config).forward(
      {
        method: 'POST',
        path: '/api/auth/logout',
        originalUrl: '/api/auth/logout',
        headers: { authorization: 'Bearer verified-access', 'x-auth-user-id': 'user-1' },
        body: { refreshToken: 'refresh' },
      } as unknown as Request,
      response,
    );
    expect(headers['set-cookie']).toEqual(cookies);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(upstream.request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: { authorization: 'Bearer verified-access', 'x-auth-user-id': 'user-1' },
      }),
    );
  });

  it('rejects a successful auth response that exposes an access token or sets another cookie', async () => {
    const authRequest = {
      method: 'POST',
      path: '/api/auth/login',
      originalUrl: '/api/auth/login',
      headers: {},
      body: {},
    } as unknown as Request;
    for (const upstreamResponse of [
      {
        status: 200,
        headers: {
          'set-cookie': ['__Host-bk_access=access; Path=/; HttpOnly; Secure; SameSite=Lax'],
        },
        data: { accessToken: 'access' },
      },
      {
        status: 200,
        headers: { 'set-cookie': ['session=secret; Path=/; HttpOnly; Secure; SameSite=Lax'] },
        data: {},
      },
    ]) {
      const http = { request: jest.fn().mockReturnValue(of(upstreamResponse)) };
      await expect(
        new GatewayProxyService(http as unknown as HttpService, config).forward(
          authRequest,
          response,
        ),
      ).rejects.toThrow();
    }
  });

  it('returns mobile tokens in JSON without forwarding cookies', async () => {
    const data = { userId: 'user-1', accessToken: 'access', refreshToken: 'refresh' };
    const upstream = { request: jest.fn().mockReturnValue(of({ status: 200, headers: {}, data })) };
    await new GatewayProxyService(upstream as unknown as HttpService, config).forward({
      method: 'POST', path: '/api/auth/login', originalUrl: '/api/auth/login',
      headers: { 'x-client-type': 'mobile' }, body: { studentId: '2210001', password: 'password' },
    } as unknown as Request, response);
    expect(headers['set-cookie']).toBeUndefined();
    expect(response.send).toHaveBeenCalledWith(data);
  });
});
