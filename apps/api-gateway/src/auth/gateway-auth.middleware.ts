import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { NextFunction, Request, Response } from 'express';

interface AccessTokenPayload {
  sub: string;
  roles: string[];
  type: 'access';
}

const publicProfileRoute = /^\/api\/users\/[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}\/profile$/;

const publicRoutes = new Set([
  'POST /api/auth/register',
  'POST /api/auth/login',
  'POST /api/auth/refresh',
]);

@Injectable()
export class GatewayAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async use(request: Request, _response: Response, next: NextFunction): Promise<void> {
    delete request.headers['x-auth-user-id'];
    delete request.headers['x-auth-roles'];

    if (
      !request.path.startsWith('/api/') ||
      publicRoutes.has(`${request.method} ${request.path}`) ||
      (request.method === 'GET' && publicProfileRoute.test(request.path))
    ) {
      next();
      return;
    }

    const authorization = request.header('authorization');
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('A valid Bearer access token is required');
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(authorization.slice(7), {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (payload.type !== 'access' || !payload.sub) throw new Error('Invalid token type');
      request.headers['x-auth-user-id'] = payload.sub;
      request.headers['x-auth-roles'] = payload.roles.join(',');
      next();
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }
}
