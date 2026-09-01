import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (
      request.header('x-internal-service-secret') !==
      this.config.getOrThrow('INTERNAL_SERVICE_SECRET')
    ) {
      throw new UnauthorizedException('Invalid internal service credential');
    }
    return true;
  }
}
