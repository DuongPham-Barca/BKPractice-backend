import {
  AUTH_COOKIE_NAMES,
  AUTH_COOKIE_REQUEST_ROUTES,
  AUTH_COOKIE_RESPONSE_ROUTES,
} from '@gateway/application/auth/auth-constants';
import { HttpService } from '@nestjs/axios';
import { BadGatewayException, BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AxiosRequestConfig } from 'axios';
import type { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

import {
  communityPrefixes,
  identityPrefixes,
  learningPrefixes,
  learningRoutes,
  responseHeaders,
  submissionPrefixes,
} from '@/application/proxy/gateway-proxy.constants';

interface RouteTarget {
  prefixes: string[];
  baseUrl: string;
  routes?: ReadonlyArray<readonly [string, RegExp]>;
}

@Injectable()
export class GatewayProxyService {
  private readonly logger = new Logger(GatewayProxyService.name);
  private readonly targets: RouteTarget[];
  private readonly mobileRedirect: URL | null;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.targets = [
      {
        prefixes: identityPrefixes,
        baseUrl: config.getOrThrow<string>('IDENTITY_SERVICE_URL'),
      },
      {
        prefixes: learningPrefixes,
        routes: learningRoutes,
        baseUrl: config.getOrThrow<string>('LEARNING_SERVICE_URL'),
      },
      {
        prefixes: submissionPrefixes,
        baseUrl: config.getOrThrow<string>('SUBMISSION_SERVICE_URL'),
      },
      {
        prefixes: communityPrefixes,
        baseUrl: config.getOrThrow<string>('COMMUNITY_SERVICE_URL'),
      },
    ];
    const mobileRedirect = config.get<string>('AUTH_MOBILE_LOGIN_REDIRECT_URL');
    this.mobileRedirect = mobileRedirect ? new URL(mobileRedirect) : null;
  }

  async forward(request: Request, response: Response): Promise<void> {
    const rawPath = request.originalUrl.split('?')[0] ?? '';
    const learning = learningPrefixes.some(
      (prefix) => request.path.startsWith(prefix) || rawPath.startsWith(prefix),
    );
    if (learning) this.rejectUnsafeLearningPath(request.path, rawPath);
    const target = this.targets.find((candidate) =>
      candidate.routes
        ? candidate.routes.some(
            ([method, path]) => method === request.method && path.test(request.path),
          )
        : candidate.prefixes.some((prefix) => request.path.startsWith(prefix)),
    );
    if (!target) throw new BadGatewayException('No upstream route is configured');

    const headers = { ...request.headers };
    for (const header of Object.keys(headers)) {
      if (header.startsWith('x-internal-')) delete headers[header];
    }
    delete headers.host;
    delete headers['content-length'];
    if (!AUTH_COOKIE_REQUEST_ROUTES.has(`${request.method} ${request.path}`)) delete headers.cookie;

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
        : !learning && ['GET', 'HEAD'].includes(request.method)
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
        AUTH_COOKIE_RESPONSE_ROUTES.has(`${request.method} ${request.path}`) &&
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
          !this.isAllowedOAuthRedirect(redirect) ||
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
      if (learning)
        this.logger.log({ requestId: request.headers['x-request-id'], status: upstream.status });
      response.status(upstream.status).send(upstream.data);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Upstream service is unavailable');
    }
  }

  private rejectUnsafeLearningPath(path: string, rawPath: string): void {
    if (path !== rawPath) throw new BadRequestException('Unsafe request path');
    let decoded = path;
    for (;;) {
      if (
        [...decoded].some(
          (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
        ) ||
        decoded.includes('\\') ||
        /(?:^|\/)\.{1,2}(?:\/|$)|[?#]|%2f|%5c/i.test(decoded)
      ) {
        throw new BadRequestException('Unsafe request path');
      }
      let next: string;
      try {
        next = decodeURIComponent(decoded);
      } catch {
        throw new BadRequestException('Unsafe request path');
      }
      if (next === decoded) return;
      decoded = next;
    }
  }

  private isAllowedOAuthRedirect(redirect: URL): boolean {
    if (['http:', 'https:'].includes(redirect.protocol)) return true;
    if (!this.mobileRedirect) return false;
    return (
      redirect.protocol === this.mobileRedirect.protocol &&
      redirect.host === this.mobileRedirect.host &&
      redirect.pathname === this.mobileRedirect.pathname
    );
  }

  private validAuthCookies(cookies: unknown): cookies is string[] {
    if (
      !Array.isArray(cookies) ||
      cookies.length !== 3 ||
      !cookies.every((cookie) => typeof cookie === 'string')
    )
      return false;
    const expected: Map<string, { path: string; httpOnly: boolean }> = new Map([
      [AUTH_COOKIE_NAMES.access, { path: '/', httpOnly: true }],
      [AUTH_COOKIE_NAMES.refresh, { path: '/api/auth', httpOnly: true }],
      [AUTH_COOKIE_NAMES.csrf, { path: '/', httpOnly: false }],
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
