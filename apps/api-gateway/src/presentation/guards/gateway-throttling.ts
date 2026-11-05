import type { ExecutionContext } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { ThrottlerOptions } from '@nestjs/throttler';
import type { Request } from 'express';

export function createGatewayThrottlers(config: ConfigService): ThrottlerOptions[] {
  const ttl = config.getOrThrow<number>('AUTH_RATE_LIMIT_TTL_MS');
  const key = (context: ExecutionContext, tracker: string, name: string) => {
    const request = context.switchToHttp().getRequest<Request>();
    return `${name}:${request.method}:${request.path}:${tracker}`;
  };
  return [
    { name: 'default', ttl: 60_000, limit: 120, generateKey: key },
    {
      name: 'password',
      ttl,
      limit: config.getOrThrow<number>('AUTH_PASSWORD_LOGIN_RATE_LIMIT'),
      skipIf: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<Request>();
        return request.method !== 'POST' || request.path !== '/api/auth/login';
      },
      generateKey: key,
    },
    {
      name: 'oauth',
      ttl,
      limit: config.getOrThrow<number>('AUTH_OAUTH_RATE_LIMIT'),
      skipIf: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<Request>();
        return !(
          request.path.startsWith('/api/auth/microsoft') ||
          (request.method === 'POST' && request.path === '/api/auth/refresh')
        );
      },
      generateKey: key,
    },
    {
      name: 'password-reset',
      ttl,
      limit: config.getOrThrow<number>('AUTH_PASSWORD_LOGIN_RATE_LIMIT'),
      skipIf: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest<Request>();
        return request.method !== 'POST' || ![
          '/api/auth/password/send-otp',
          '/api/auth/password/verify-otp',
          '/api/auth/password/reset',
        ].includes(request.path);
      },
      generateKey: key,
    },
  ];
}
