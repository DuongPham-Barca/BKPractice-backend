import { readTrustedPrincipal } from '@learning/modules/problems/presentation/http/decorators/trusted-principal.decorator';
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class TrustedPrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    readTrustedPrincipal(context.switchToHttp().getRequest<Request>());
    return true;
  }
}
