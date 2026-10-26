import { BK_ACCESS_COOKIE_NAME, BK_CSRF_COOKIE_NAME, BK_REFRESH_COOKIE_NAME } from '@app/contracts';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

interface RouteTarget {
  prefixes: string[];
  baseUrl: string;
}

const responseHeaders = ['content-type', 'content-length', 'etag', 'last-modified'];
const cookieRoutes = new Set([
  'POST /api/auth/login',
  'POST /api/auth/microsoft/exchange',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'POST /api/auth/logout-all',
]);
const authCookieRequestRoutes = new Set([
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'GET /api/auth/csrf',
]);

@Injectable()
export class GatewayProxyService {
  private readonly targets: RouteTarget[];

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.targets = [
      {
        prefixes: ['/api/auth', '/api/users', '/api/profile', '/api/roles'],
        baseUrl: config.getOrThrow<string>('IDENTITY_SERVICE_URL'),
      },
      {
        prefixes: ['/api/problems', '/api/courses', '/api/assignments', '/api/classes'],
        baseUrl: config.getOrThrow<string>('LEARNING_SERVICE_URL'),
      },
      {
        prefixes: ['/api/submissions', '/api/run'],
        baseUrl: config.getOrThrow<string>('SUBMISSION_SERVICE_URL'),
      },
      {
        prefixes: ['/api/community'],
        baseUrl: config.getOrThrow<string>('COMMUNITY_SERVICE_URL'),
      },
    ];
  }

  async forward(request: Request, response: Response): Promise<void> {
    const target = this.targets.find((candidate) =>
      candidate.prefixes.some((prefix) => request.path.startsWith(prefix)),
    );
    if (!target) throw new BadGatewayException('No upstream route is configured');

    const headers = { ...request.headers };
    delete headers.host;
    delete headers['content-length'];
    if (!authCookieRequestRoutes.has(`${request.method} ${request.path}`)) delete headers.cookie;

    const accountImport = request.method === 'POST' && request.path === '/api/auth/accounts/import';
    const multipart =
      accountImport &&
      typeof headers['content-type'] === 'string' &&
      headers['content-type'].toLowerCase().startsWith('multipart/form-data;');

    const options: AxiosRequestConfig = {
      method: request.method,
      url: `${target.baseUrl}${request.originalUrl}`,
      headers,
      data: multipart
        ? request
        : ['GET', 'HEAD'].includes(request.method)
          ? undefined
          : (request.body as unknown),
      maxBodyLength: accountImport ? 5 * 1024 * 1024 + 64 * 1024 : undefined,
      maxRedirects: 0,
      timeout: accountImport ? 300_000 : 15_000,
      validateStatus: () => true,
    };

    try {
      const upstream = await firstValueFrom(this.http.request<unknown>(options));
      if (
        cookieRoutes.has(`${request.method} ${request.path}`) &&
        upstream.status >= 200 &&
        upstream.status < 300
      ) {
        const mobile = request.headers['x-client-type'] === 'mobile';
        if (
          !mobile &&
          upstream.data &&
          typeof upstream.data === 'object' &&
          ('accessToken' in upstream.data || 'refreshToken' in upstream.data)
        ) {
          throw new BadGatewayException('Invalid authentication response');
        }
        const rawCookies: unknown = upstream.headers['set-cookie'];
        const cookies = typeof rawCookies === 'string' ? [rawCookies] : rawCookies;
        if (mobile ? cookies !== undefined : !this.validAuthCookies(cookies)) {
          throw new BadGatewayException('Invalid authentication cookie');
        }
        if (!mobile) response.setHeader('set-cookie', cookies as string[]);
      }
      responseHeaders.forEach((header) => {
        const value = upstream.headers[header] as unknown;
        if (typeof value === 'string' || typeof value === 'number') {
          response.setHeader(header, String(value));
        }
      });
      if (
        upstream.status >= 300 &&
        upstream.status < 400 &&
        (request.path === '/api/auth/microsoft' || request.path === '/api/auth/microsoft/callback')
      ) {
        const location: unknown = upstream.headers.location;
        if (typeof location !== 'string')
          throw new BadGatewayException('Invalid authentication redirect');
        const redirect = new URL(location);
        if (
          !['http:', 'https:'].includes(redirect.protocol) ||
          redirect.username ||
          redirect.password ||
          ['access_token', 'refresh_token', 'id_token'].some(
            (key) => redirect.searchParams.has(key) || redirect.hash.includes(key),
          )
        ) {
          throw new BadGatewayException('Invalid authentication redirect');
        }
        response.setHeader('location', redirect.toString());
      }
      response.status(upstream.status).send(upstream.data);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Upstream service is unavailable');
    }
  }

  private validAuthCookies(cookies: unknown): cookies is string[] {
    if (
      !Array.isArray(cookies) ||
      cookies.length !== 3 ||
      !cookies.every((cookie) => typeof cookie === 'string')
    )
      return false;
    const expected = new Map([
      [BK_ACCESS_COOKIE_NAME, { path: '/', httpOnly: true }],
      [BK_REFRESH_COOKIE_NAME, { path: '/api/auth', httpOnly: true }],
      [BK_CSRF_COOKIE_NAME, { path: '/', httpOnly: false }],
    ]);
    for (const cookie of cookies) {
      const name = cookie.slice(0, cookie.indexOf('='));
      const rules = expected.get(name);
      if (
        !rules ||
        !cookie.startsWith(`${name}=`) ||
        !cookie.includes(`; Path=${rules.path};`) ||
        !/; Secure(?:;|$)/i.test(cookie) ||
        !/; SameSite=Lax(?:;|$)/i.test(cookie) ||
        /; Domain=/i.test(cookie) ||
        rules.httpOnly !== /; HttpOnly(?:;|$)/i.test(cookie)
      )
        return false;
      expected.delete(name);
    }
    return expected.size === 0;
  }
}
