import { isAllowedBrowserOrigin, readCookie, verifyCsrfToken } from '@app/common';
import { BK_ACCESS_COOKIE_NAME, BK_CSRF_COOKIE_NAME, BK_REFRESH_COOKIE_NAME } from '@app/contracts';
import { ForbiddenException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';

import { GatewaySessionVerifier } from './gateway-session-verifier';

interface AccessTokenPayload {
  sub: string;
  sid: string;
  jti: string;
  roles: string[];
  permissions?: string[];
  type: 'access';
}

const publicRoutes = new Set([
  'POST /api/auth/login',
  'GET /api/auth/microsoft',
  'GET /api/auth/microsoft/callback',
  'POST /api/auth/microsoft/exchange',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'GET /api/auth/csrf',
]);
const originCheckedRoutes = new Set([
  'POST /api/auth/login',
  'POST /api/auth/microsoft/exchange',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
]);
const authCookieRoutes = new Set(['POST /api/auth/refresh', 'POST /api/auth/logout', 'GET /api/auth/csrf']);
const publicProfileRoute =
  /^\/api\/users\/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\/profile$/;
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class GatewayAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sessions: GatewaySessionVerifier,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    const accessCookie = this.readTokenCookie(request, BK_ACCESS_COOKIE_NAME);
    const refreshCookie = this.readTokenCookie(request, BK_REFRESH_COOKIE_NAME);
    const csrfCookie = this.readTokenCookie(request, BK_CSRF_COOKIE_NAME);
    delete request.headers.cookie;
    delete request.headers['x-auth-user-id'];
    delete request.headers['x-auth-roles'];
    delete request.headers['x-auth-permissions'];
    delete request.headers['x-client-ip'];
    if (request.ip) request.headers['x-client-ip'] = request.ip;

    if (!request.path.startsWith('/api/')) {
      next();
      return;
    }

    const route = `${request.method} ${request.path}`;
    if (authCookieRoutes.has(route)) {
      request.headers.cookie = [
        refreshCookie && `${BK_REFRESH_COOKIE_NAME}=${refreshCookie}`,
        csrfCookie && `${BK_CSRF_COOKIE_NAME}=${csrfCookie}`,
        accessCookie && `${BK_ACCESS_COOKIE_NAME}=${accessCookie}`,
      ].filter(Boolean).join('; ');
    }

    if (originCheckedRoutes.has(route)) {
      if (request.header('x-client-type') !== 'mobile') this.requireAllowedOrigin(request);
      next();
      return;
    }

    if (publicRoutes.has(route)) {
      next();
      return;
    }

    const authorization = request.header('authorization');
    const publicProfile = request.method === 'GET' && publicProfileRoute.test(request.path);
    if (authorization === undefined && !accessCookie && publicProfile) {
      next();
      return;
    }
    const fromCookie = authorization === undefined;
    if (authorization !== undefined && !/^Bearer [^\s]+$/.test(authorization))
      throw new UnauthorizedException('A valid Bearer access token is required');
    const token = fromCookie ? accessCookie : authorization?.slice(7);
    if (!token) throw new UnauthorizedException('A valid access token is required');

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (
        payload.type !== 'access' ||
        !payload.sub ||
        !payload.sid ||
        !payload.jti ||
        !Array.isArray(payload.roles) ||
        !payload.roles.every((role) => typeof role === 'string')
      ) {
        throw new Error('Invalid access token');
      }
      if (!(await this.sessions.isActive(token))) throw new Error('Revoked session');
      if (fromCookie && unsafeMethods.has(request.method)) {
        this.requireAllowedOrigin(request);
        if (!verifyCsrfToken(payload.sid, csrfCookie, request.header('x-csrf-token'),
          this.config.getOrThrow<string>('JWT_ACCESS_SECRET')))
          throw new ForbiddenException('Invalid CSRF token');
      }
      request.headers.authorization = `Bearer ${token}`;
      request.headers['x-auth-user-id'] = payload.sub;
      request.headers['x-auth-roles'] = payload.roles.join(',');
      request.headers['x-auth-permissions'] =
        Array.isArray(payload.permissions) &&
        payload.permissions.every((permission) => typeof permission === 'string')
          ? payload.permissions.join(',')
          : '';
      next();
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof ServiceUnavailableException) throw error;
      if (publicProfile && fromCookie) {
        next();
        return;
      }
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }

  private requireAllowedOrigin(request: Request): void {
    if (
      !isAllowedBrowserOrigin(
        request.header('origin'),
        request.header('referer'),
        this.config.getOrThrow<string>('CORS_ORIGINS'),
      )
    ) {
      throw new ForbiddenException('Untrusted request origin');
    }
  }

  private readTokenCookie(request: Request, name: string): string | null {
    const value = readCookie(request.header('cookie'), name);
    return value && /^[A-Za-z0-9._-]+$/.test(value) ? value : null;
  }
}
