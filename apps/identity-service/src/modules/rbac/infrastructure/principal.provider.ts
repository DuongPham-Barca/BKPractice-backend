import type { BkTokenService } from '@/modules/auth/application';
import { AuthFailure } from '@/modules/auth/domain';
import type { AuthorizationPrincipalProvider } from '@/modules/rbac/application';
import { isRoleName, type AuthorizationPrincipal } from '@/modules/rbac/domain';

export class BkAuthorizationPrincipalProvider implements AuthorizationPrincipalProvider {
  constructor(private readonly tokens: Pick<BkTokenService, 'verifyAccessClaims'>) {}

  async verifyAccess(token: string): Promise<AuthorizationPrincipal> {
    const claims = await this.tokens.verifyAccessClaims(token);
    if (!claims.roles.every(isRoleName)) throw new AuthFailure('invalid_token');
    return { userId: claims.sub, roles: claims.roles, permissions: claims.permissions };
  }
}
