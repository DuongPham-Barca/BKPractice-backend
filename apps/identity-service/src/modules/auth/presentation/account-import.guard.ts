import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import {
  BK_TOKEN_SERVICE,
  REFRESH_SESSION_REPOSITORY,
  type BkTokenService,
  type RefreshSessionRepository,
} from '@/modules/auth/application';
import { AuthFailure, requireAccountImport } from '@/modules/auth/domain';
import { isRoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

export interface AccountImportRequest extends Request {
  principal: AuthorizationPrincipal;
}

@Injectable()
export class AccountImportGuard implements CanActivate {
  constructor(
    @Inject(BK_TOKEN_SERVICE) private readonly tokens: BkTokenService,
    @Inject(REFRESH_SESSION_REPOSITORY) private readonly sessions: RefreshSessionRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AccountImportRequest>();
    const authorization = request.header('authorization');
    if (!authorization || !/^Bearer [^\s]+$/.test(authorization))
      throw new AuthFailure('invalid_token');
    const claims = await this.tokens.verifyAccessClaims(authorization.slice(7));
    if (!claims.roles.every(isRoleName) || !(await this.sessions.isActive(claims.sub, claims.sid)))
      throw new AuthFailure('invalid_token');
    request.principal = {
      userId: claims.sub,
      roles: claims.roles,
      permissions: claims.permissions,
    };
    requireAccountImport(request.principal);
    return true;
  }
}
