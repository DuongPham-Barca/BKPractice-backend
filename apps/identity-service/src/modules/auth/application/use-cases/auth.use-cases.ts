import { createHash, randomBytes } from 'node:crypto';

import type { AuthTokenIssuer, TokenPair } from '@/modules/auth/application';
import type {
  AuthAccountRepository,
  AuthFlowStore,
  BkTokenService,
  ExternalIdentityRepository,
  MicrosoftIdentityProvider,
  PasswordHasher,
  RefreshSessionRepository,
} from '@/modules/auth/application/ports';
import { AuthFailure, requireActiveAccount } from '@/modules/auth/domain';

export class LoginWithStudentId {
  constructor(
    private readonly accounts: AuthAccountRepository,
    private readonly hasher: PasswordHasher,
    private readonly issuer: AuthTokenIssuer,
  ) {}

  async execute(studentId: string, password: string): Promise<{ userId: string } & TokenPair> {
    const account = await this.accounts.findByStudentId(studentId.trim());
    if (!account) {
      await this.hasher.verifyDummy(password);
      throw new AuthFailure('invalid_credentials');
    }
    if (!(await this.hasher.verify(account.passwordHash, password))) {
      throw new AuthFailure('invalid_credentials');
    }
    requireActiveAccount(account);
    return { userId: account.userId, ...(await this.issuer.issueNewFamily(account)) };
  }
}

export class StartMicrosoftLogin {
  constructor(
    private readonly provider: MicrosoftIdentityProvider,
    private readonly flows: AuthFlowStore,
  ) {}

  async execute(): Promise<string> {
    const state = randomBytes(32).toString('base64url');
    const nonce = randomBytes(32).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const url = await this.provider.getAuthorizationUrl(state, nonce, challenge);
    await this.flows.putTransaction(state, { nonce, verifier });
    return url;
  }
}

export class CompleteMicrosoftLogin {
  constructor(
    private readonly provider: MicrosoftIdentityProvider,
    private readonly flows: AuthFlowStore,
    private readonly identities: ExternalIdentityRepository,
    private readonly loginRedirectUrl: string,
  ) {}

  async execute(input: { code?: string; state?: string; error?: string }): Promise<string> {
    if (input.error || !input.code || !input.state) throw new AuthFailure('invalid_credentials');
    const transaction = await this.flows.takeTransaction(input.state);
    if (!transaction) throw new AuthFailure('invalid_credentials');
    const identity = await this.provider.exchangeCode(input.code, transaction);
    const account = await this.identities.resolveOrLink(identity);
    requireActiveAccount(account);
    const loginCode = await this.flows.createLoginCode(account.userId);
    const url = new URL(this.loginRedirectUrl);
    url.searchParams.set('loginCode', loginCode);
    return url.toString();
  }
}

export class ExchangeMicrosoftLoginCode {
  constructor(
    private readonly flows: AuthFlowStore,
    private readonly accounts: AuthAccountRepository,
    private readonly issuer: AuthTokenIssuer,
  ) {}

  async execute(loginCode: string): Promise<{ userId: string } & TokenPair> {
    const userId = await this.flows.takeLoginCode(loginCode);
    if (!userId) throw new AuthFailure('invalid_token');
    const account = await this.accounts.findById(userId);
    requireActiveAccount(account);
    return { userId, ...(await this.issuer.issueNewFamily(account)) };
  }
}

export class RefreshSession {
  constructor(
    private readonly tokens: BkTokenService,
    private readonly accounts: AuthAccountRepository,
    private readonly sessions: RefreshSessionRepository,
    private readonly issuer: AuthTokenIssuer,
  ) {}

  async execute(rawToken: string): Promise<TokenPair> {
    const current = await this.tokens.verifyRefresh(rawToken);
    const account = await this.accounts.findById(current.sub);
    requireActiveAccount(account);
    const prepared = await this.issuer.prepare(account, current.fid);
    if (!(await this.sessions.rotate(current, rawToken, prepared.record))) {
      throw new AuthFailure('invalid_token');
    }
    return prepared.pair;
  }
}

export class LogoutCurrentSession {
  constructor(
    private readonly tokens: BkTokenService,
    private readonly sessions: RefreshSessionRepository,
  ) {}

  async execute(userId: string, rawToken: string): Promise<void> {
    try {
      const current = await this.tokens.verifyRefresh(rawToken);
      if (current.sub === userId) await this.sessions.revokeFamily(current, rawToken);
    } catch (error) {
      if (!(error instanceof AuthFailure)) throw error;
    }
  }
}

export class GetCurrentAuthenticatedUser {
  constructor(private readonly accounts: AuthAccountRepository) {}

  async execute(
    userId: string,
  ): Promise<{ userId: string; studentId: string | null; roles: string[]; status: string }> {
    const account = await this.accounts.findById(userId);
    if (!account) throw new AuthFailure('invalid_token');
    return {
      userId: account.userId,
      studentId: account.studentId,
      roles: account.roles,
      status: account.status,
    };
  }
}
