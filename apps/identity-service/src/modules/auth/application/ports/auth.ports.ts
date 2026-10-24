import type { BkRefreshClaims } from '@app/contracts';

import type { AuthAccount, LocalAuthAccount, MicrosoftIdentity } from '@/modules/auth/domain';

export interface AuthAccountRepository {
  findByStudentId(studentId: string): Promise<LocalAuthAccount | null>;
  findById(userId: string): Promise<AuthAccount | null>;
}

export interface ExternalIdentityRepository {
  resolveOrLink(identity: MicrosoftIdentity): Promise<AuthAccount | null>;
}

export interface RefreshRecord {
  tokenId: string;
  familyId: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RefreshSessionRepository {
  create(record: RefreshRecord): Promise<void>;
  rotate(current: BkRefreshClaims, rawToken: string, replacement: RefreshRecord): Promise<boolean>;
  revokeFamily(current: BkRefreshClaims, rawToken: string): Promise<void>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(hash: string, password: string): Promise<boolean>;
  verifyDummy(password: string): Promise<void>;
}

export interface BkTokenService {
  signAccess(account: AuthAccount, permissions: string[]): Promise<string>;
  signRefresh(
    userId: string,
    tokenId: string,
    familyId: string,
  ): Promise<{ token: string; expiresAt: Date }>;
  verifyRefresh(token: string): Promise<BkRefreshClaims>;
  verifyAccess(token: string): Promise<string>;
}

export interface OAuthTransaction {
  nonce: string;
  verifier: string;
}

export interface MicrosoftIdentityProvider {
  getAuthorizationUrl(state: string, nonce: string, challenge: string): Promise<string>;
  exchangeCode(code: string, transaction: OAuthTransaction): Promise<MicrosoftIdentity>;
}

export interface AuthFlowStore {
  putTransaction(state: string, transaction: OAuthTransaction): Promise<void>;
  takeTransaction(state: string): Promise<OAuthTransaction | null>;
  createLoginCode(userId: string): Promise<string>;
  takeLoginCode(code: string): Promise<string | null>;
}
