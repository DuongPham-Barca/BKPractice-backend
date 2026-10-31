import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { requireAccountImport } from '@/modules/auth/domain';
import { IdentityAccessAuthenticator } from '@/modules/auth/presentation/identity-access.authenticator';
import type { AuthorizationPrincipal } from '@/modules/rbac/domain';

export interface AccountImportRequest extends Request {
  principal: AuthorizationPrincipal;
}

@Injectable()
export class AccountImportGuard implements CanActivate {
  constructor(private readonly access: IdentityAccessAuthenticator) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AccountImportRequest>();
    const claims = await this.access.verify(request);
    request.principal = {
      userId: claims.sub,
      roles: claims.roles,
      permissions: claims.permissions,
    };
    requireAccountImport(request.principal);
    return true;
  }
}
