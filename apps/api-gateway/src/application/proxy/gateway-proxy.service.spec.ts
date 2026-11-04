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
    AUTH_MOBILE_LOGIN_REDIRECT_URL: 'bkpracticemobile:///auth/callback',
  });

  beforeEach(() => {
    Object.keys(headers).forEach((key) => delete headers[key]);
    jest.clearAllMocks();
  });

  it('forwards profile search and its query string to Identity', async () => {
    const upstream = {
      request: jest.fn().mockReturnValue(of({ status: 200, headers: {}, data: { items: [] } })),
    };
    await new GatewayProxyService(upstream as unknown as HttpService, config).forward(
      {
        method: 'GET',
        path: '/api/profiles/search',
        originalUrl: '/api/profiles/search?q=Nguy%E1%BB%85n&page=2',
        headers: { authorization: 'Bearer verified-access', host: 'localhost' },
      } as unknown as Request,
      response,
    );
    expect(upstream.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3001/api/profiles/search?q=Nguy%E1%BB%85n&page=2',
        headers: { authorization: 'Bearer verified-access' },
      }),
    );
  });

  it('routes User administration to Identity without exposing client cookies', async () => {
    const upstream = {
      request: jest.fn().mockReturnValue(of({ status: 204, headers: {}, data: '' })),
    };
    const path = '/api/admin/users/00000000-0000-0000-0000-000000000001';
    await new GatewayProxyService(upstream as unknown as HttpService, config).forward(
      {
        method: 'DELETE',
        path,
        originalUrl: path,
        headers: { authorization: 'Bearer access', cookie: 'private=value' },
      } as unknown as Request,
      response,
    );
    expect(upstream.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `http://localhost:3001${path}`,
        headers: { authorization: 'Bearer access' },
      }),
    );
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

  it('allows only the configured mobile deep link for the OAuth callback', async () => {
    const callbackRequest = {
      method: 'GET',
      path: '/api/auth/microsoft/callback',
      originalUrl: '/api/auth/microsoft/callback?code=code&state=state',
      headers: { host: 'localhost' },
    } as unknown as Request;
    const mobileConfig = new ConfigService({
      IDENTITY_SERVICE_URL: 'http://localhost:3001',
      LEARNING_SERVICE_URL: 'http://localhost:3002',
      SUBMISSION_SERVICE_URL: 'http://localhost:3003',
      COMMUNITY_SERVICE_URL: 'http://localhost:3005',
      AUTH_MOBILE_LOGIN_REDIRECT_URL: 'bkpracticemobile://auth/callback',
    });
    const allowedHttp = {
      request: jest.fn().mockReturnValue(
        of({
          status: 302,
          headers: { location: 'bkpracticemobile://auth/callback?loginCode=once' },
          data: '',
        }),
      ),
    } as unknown as HttpService;
    await new GatewayProxyService(allowedHttp, mobileConfig).forward(callbackRequest, response);
    expect(headers.location).toBe('bkpracticemobile://auth/callback?loginCode=once');

    const otherScheme = {
      request: jest.fn().mockReturnValue(
        of({
          status: 302,
          headers: { location: 'otherscheme://auth/callback?loginCode=once' },
          data: '',
        }),
      ),
    } as unknown as HttpService;
    await expect(
      new GatewayProxyService(otherScheme, mobileConfig).forward(callbackRequest, response),
    ).rejects.toThrow();

    const mobileDisabled = {
      request: jest.fn().mockReturnValue(
        of({
          status: 302,
          headers: { location: 'bkpracticemobile://auth/callback?loginCode=once' },
          data: '',
        }),
      ),
    } as unknown as HttpService;
    await expect(
      new GatewayProxyService(mobileDisabled, config).forward(callbackRequest, response),
    ).rejects.toThrow();
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

  it('forwards the configured mobile deep link after the Microsoft callback', async () => {
    const location = 'bkpracticemobile:///auth/callback?loginCode=opaque';
    const http = {
      request: jest
        .fn()
        .mockReturnValue(of({ status: 302, headers: { location }, data: '' })),
    } as unknown as HttpService;
    await new GatewayProxyService(http, config).forward(
      {
        method: 'GET',
        path: '/api/auth/microsoft/callback',
        originalUrl: '/api/auth/microsoft/callback',
        headers: {},
      } as unknown as Request,
      response,
    );
    expect(headers.location).toBe(location);
    expect(response.status).toHaveBeenCalledWith(302);
  });

  it('rejects a mobile redirect outside the configured deep link', async () => {
    for (const location of [
      'bkpracticemobile://evil/auth/callback?loginCode=opaque',
      'bkpracticemobile:///auth/other?loginCode=opaque',
    ]) {
      const http = {
        request: jest
          .fn()
          .mockReturnValue(of({ status: 302, headers: { location }, data: '' })),
      } as unknown as HttpService;
      await expect(
        new GatewayProxyService(http, config).forward(
          {
            method: 'GET',
            path: '/api/auth/microsoft/callback',
            originalUrl: '/api/auth/microsoft/callback',
            headers: {},
          } as unknown as Request,
          response,
        ),
      ).rejects.toThrow();
    }
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
        body: { identifier: '2210001', password: 'password' },
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
    await new GatewayProxyService(upstream as unknown as HttpService, config).forward(
      {
        method: 'POST',
        path: '/api/auth/login',
        originalUrl: '/api/auth/login',
        headers: { 'x-client-type': 'mobile' },
        body: { identifier: '2210001', password: 'password' },
      } as unknown as Request,
      response,
    );
    expect(headers['set-cookie']).toBeUndefined();
    expect(response.send).toHaveBeenCalledWith(data);
  });
});
