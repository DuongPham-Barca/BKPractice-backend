import { randomUUID } from 'node:crypto';

import type {
  BkTokenService,
  PasswordHasher,
  RefreshRecord,
  RefreshSessionRepository,
} from '@/modules/auth/application/ports';
import type { AuthAccount } from '@/modules/auth/domain';
import type { EffectivePermissionReader } from '@/modules/rbac/application/effective-permission-reader';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export class AuthTokenIssuer {
  constructor(
    private readonly tokens: BkTokenService,
    private readonly hasher: PasswordHasher,
    private readonly sessions: RefreshSessionRepository,
    private readonly permissions: EffectivePermissionReader,
  ) {}

  async prepare(
    account: AuthAccount,
    familyId: string,
  ): Promise<{ pair: TokenPair; record: RefreshRecord }> {
    const permissions = await this.permissions.readForUser(account.userId);
    const tokenId = randomUUID();
    const [accessToken, refresh] = await Promise.all([
      this.tokens.signAccess(account, permissions),
      this.tokens.signRefresh(account.userId, tokenId, familyId),
    ]);
    return {
      pair: { accessToken, refreshToken: refresh.token },
      record: {
        tokenId,
        familyId,
        userId: account.userId,
        tokenHash: await this.hasher.hash(refresh.token),
        expiresAt: refresh.expiresAt,
      },
    };
  }

  async issueNewFamily(account: AuthAccount): Promise<TokenPair> {
    const prepared = await this.prepare(account, randomUUID());
    await this.sessions.create(prepared.record);
    return prepared.pair;
  }
}
