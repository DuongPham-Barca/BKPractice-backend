import { createHash } from 'node:crypto';

import type { BkRefreshClaims } from '@app/contracts';

import { AuthTokenIssuer } from '@/modules/auth/application';
import type {
  AuthAccountRepository,
  AuthFlowStore,
  BkTokenService,
  ExternalIdentityRepository,
  MicrosoftIdentityProvider,
  PasswordHasher,
  RefreshSessionRepository,
  LoginCodeGrant,
} from '@/modules/auth/application/ports';
import {
  CompleteMicrosoftLogin,
  ExchangeMicrosoftLoginCode,
  GetCurrentAuthenticatedUser,
  LoginWithPassword,
  LogoutCurrentSession,
  RefreshSession,
  StartMicrosoftLogin,
} from '@/modules/auth/application/use-cases';
import { AuthFailure } from '@/modules/auth/domain';
import type { AuthAccount } from '@/modules/auth/domain';
import { MemoryAuthFlowStore } from '@/modules/auth/infrastructure/memory';

const account: AuthAccount = {
  userId: 'user-1',
  studentId: '2210001',
  email: 'student@school.edu',
  status: 'ACTIVE',
  roles: ['STUDENT'],
};
const pair = { accessToken: 'access', refreshToken: 'refresh' };
const refreshClaims: BkRefreshClaims = {
  sub: 'user-1',
  jti: 'token-1',
  fid: 'family-1',
  type: 'refresh',
  exp: 9999999999,
};

function createAccounts(): AuthAccountRepository {
  return {
    findByIdentifier: jest.fn().mockResolvedValue({ ...account, passwordHash: 'hash' }),
    findById: jest.fn().mockResolvedValue(account),
  };
}

function createHasher(): PasswordHasher {
  return {
    hash: jest.fn().mockResolvedValue('hash'),
    verify: jest.fn().mockResolvedValue(true),
    verifyDummy: jest.fn().mockResolvedValue(undefined),
  };
}

function createSessions(): RefreshSessionRepository {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    rotate: jest.fn().mockResolvedValue(true),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    revokeBySid: jest.fn().mockResolvedValue(undefined),
    revokeAll: jest.fn().mockResolvedValue(undefined),
    isActive: jest.fn().mockResolvedValue(true),
  };
}

function createTokens(): BkTokenService {
  return {
    signAccess: jest.fn().mockResolvedValue('access'),
    signRefresh: jest
      .fn()
      .mockResolvedValue({ token: 'refresh', expiresAt: new Date('2030-01-01') }),
    verifyRefresh: jest.fn().mockResolvedValue(refreshClaims),
    verifyAccess: jest.fn().mockResolvedValue('user-1'),
    verifyAccessClaims: jest.fn().mockResolvedValue({
      sub: 'user-1',
      sid: 'family-1',
      jti: 'access-1',
      roles: ['STUDENT'],
      permissions: [],
      type: 'access',
    }),
  };
}

function createIssuer(): AuthTokenIssuer {
  return new AuthTokenIssuer(createTokens(), createHasher(), createSessions(), {
    readForUser: jest.fn().mockResolvedValue([]),
  });
}

describe('Authentication use cases', () => {
  it('signs in the bootstrap Admin through its technical identifier', async () => {
    const accounts = createAccounts();
    const admin = { ...account, studentId: 'admin', roles: ['ADMIN'], passwordHash: 'hash' };
    jest.mocked(accounts.findByIdentifier).mockResolvedValueOnce(admin);
    const issuer = createIssuer();
    const issue = jest.spyOn(issuer, 'issueNewFamily');

    await expect(
      new LoginWithPassword(accounts, createHasher(), issuer).execute('admin', 'admin'),
    ).resolves.toEqual({ userId: 'user-1', ...pair });
    expect(issue).toHaveBeenCalledWith(admin, { clientType: 'web' }, 'hash');
  });

  it('rejects a wrong Admin password and a locked Admin before issuing tokens', async () => {
    const accounts = createAccounts();
    const hasher = createHasher();
    const issuer = createIssuer();
    const issue = jest.spyOn(issuer, 'issueNewFamily');
    const admin = { ...account, studentId: 'admin', roles: ['ADMIN'], passwordHash: 'hash' };
    jest.mocked(accounts.findByIdentifier).mockResolvedValue(admin);
    jest.mocked(hasher.verify).mockResolvedValueOnce(false);
    const login = new LoginWithPassword(accounts, hasher, issuer);

    await expect(login.execute('admin', 'wrong')).rejects.toEqual(
      new AuthFailure('invalid_credentials'),
    );
    jest.mocked(accounts.findByIdentifier).mockResolvedValueOnce({ ...admin, status: 'LOCKED' });
    await expect(login.execute('admin', 'admin')).rejects.toBeInstanceOf(AuthFailure);
    expect(issue).not.toHaveBeenCalled();
  });

  it('returns the bootstrap Admin in its own /auth/me response', async () => {
    const accounts = createAccounts();
    jest.mocked(accounts.findById).mockResolvedValueOnce({
      ...account,
      studentId: 'admin',
      roles: ['ADMIN'],
    });
    await expect(new GetCurrentAuthenticatedUser(accounts).execute('user-1')).resolves.toEqual({
      userId: 'user-1',
      studentId: 'admin',
      roles: ['ADMIN'],
      status: 'ACTIVE',
    });
  });

  it('trims the student ID, keeps the password intact, and creates a new family', async () => {
    const accounts = createAccounts();
    const hasher = createHasher();
    const issuer = createIssuer();
    const result = await new LoginWithPassword(accounts, hasher, issuer).execute(
      ' 2210001 ',
      ' pass word ',
    );
    expect(accounts.findByIdentifier).toHaveBeenCalledWith('2210001');
    expect(hasher.verify).toHaveBeenCalledWith('hash', ' pass word ');
    expect(result).toEqual({ userId: 'user-1', ...pair });
  });

  it('uses the same login flow for a school email', async () => {
    const accounts = createAccounts();
    await new LoginWithPassword(accounts, createHasher(), createIssuer()).execute(
      ' STUDENT@school.edu ',
      '123456',
    );
    expect(accounts.findByIdentifier).toHaveBeenCalledWith('STUDENT@school.edu');
  });

  it('uses the same public failure for missing student IDs and wrong passwords', async () => {
    const accounts = createAccounts();
    const hasher = createHasher();
    const issuer = createIssuer();
    const issue = jest.spyOn(issuer, 'issueNewFamily');
    jest.mocked(accounts.findByIdentifier).mockResolvedValueOnce(null);
    const login = new LoginWithPassword(accounts, hasher, issuer);
    await expect(login.execute('missing', 'wrong')).rejects.toEqual(
      new AuthFailure('invalid_credentials'),
    );
    expect(hasher.verifyDummy).toHaveBeenCalledWith('wrong');
    jest.mocked(hasher.verify).mockResolvedValueOnce(false);
    await expect(login.execute('2210001', 'wrong')).rejects.toEqual(
      new AuthFailure('invalid_credentials'),
    );
    expect(issue).not.toHaveBeenCalled();
  });

  it.each(['LOCKED', 'PENDING'] as const)(
    'does not issue tokens for a %s student',
    async (status) => {
      const accounts = createAccounts();
      jest
        .mocked(accounts.findByIdentifier)
        .mockResolvedValue({ ...account, status, passwordHash: 'hash' });
      const issuer = createIssuer();
      const issue = jest.spyOn(issuer, 'issueNewFamily');
      await expect(
        new LoginWithPassword(accounts, createHasher(), issuer).execute('2210001', '123456'),
      ).rejects.toBeInstanceOf(AuthFailure);
      expect(issue).not.toHaveBeenCalled();
    },
  );

  it('issues access with the current effective permissions', async () => {
    const tokens = createTokens();
    const permissions = { readForUser: jest.fn().mockResolvedValue(['problem:create']) };
    const issuer = new AuthTokenIssuer(tokens, createHasher(), createSessions(), permissions);
    await issuer.issueNewFamily(account);
    expect(tokens.signAccess).toHaveBeenCalledWith(account, ['problem:create'], expect.any(String));
  });

  it('consumes Microsoft state and login code only once', async () => {
    const transactions = new Map<string, { nonce: string; verifier: string }>();
    const loginCodes = new Map<string, LoginCodeGrant>();
    const flows: AuthFlowStore = {
      putTransaction: async (state, transaction) => {
        transactions.set(state, transaction);
      },
      takeTransaction: async (state) => {
        const value = transactions.get(state) ?? null;
        transactions.delete(state);
        return value;
      },
      createLoginCode: async (grant) => {
        loginCodes.set('once', grant);
        return 'once';
      },
      takeLoginCode: async (code) => {
        const value = loginCodes.get(code) ?? null;
        loginCodes.delete(code);
        return value;
      },
    };
    const provider: MicrosoftIdentityProvider = {
      getAuthorizationUrl: jest
        .fn()
        .mockResolvedValue('https://login.microsoftonline.com/tenant/oauth'),
      exchangeCode: jest.fn().mockResolvedValue({
        tenantId: 'tenant',
        objectId: 'object',
        username: 'student@school.edu',
      }),
    };
    const identities: ExternalIdentityRepository = {
      resolveOrLink: jest.fn().mockResolvedValue(account),
    };
    const start = new StartMicrosoftLogin(provider, flows);
    await start.execute();
    const state = [...transactions.keys()][0];
    expect(state).toBeDefined();
    expect(provider.getAuthorizationUrl).toHaveBeenCalledWith(
      state,
      expect.any(String),
      expect.any(String),
    );
    expect(transactions.get(state ?? '')?.nonce).toHaveLength(43);
    expect(transactions.get(state ?? '')?.verifier).toHaveLength(43);
    const complete = new CompleteMicrosoftLogin(
      provider,
      flows,
      identities,
      'https://app.example/auth/callback',
    );
    const redirect = await complete.execute({ code: 'code', state });
    expect(new URL(redirect).searchParams.get('loginCode')).toBe('once');
    await expect(complete.execute({ code: 'code', state })).rejects.toBeInstanceOf(AuthFailure);
    const exchange = new ExchangeMicrosoftLoginCode(flows, createAccounts(), createIssuer());
    expect((await exchange.execute('once')).userId).toBe('user-1');
    await expect(exchange.execute('once')).rejects.toBeInstanceOf(AuthFailure);
  });

  it('binds a mobile Microsoft handoff to the app PKCE verifier', async () => {
    const verifier = 'v'.repeat(64);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    const flows = new MemoryAuthFlowStore();
    const provider: MicrosoftIdentityProvider = {
      getAuthorizationUrl: jest.fn(async (state) => `https://login.example/oauth?state=${state}`),
      exchangeCode: jest
        .fn()
        .mockResolvedValue({ tenantId: 'tenant', objectId: 'object', username: account.email }),
    };
    const start = new StartMicrosoftLogin(provider, flows, 'https://mobile.example/auth/callback');
    const complete = new CompleteMicrosoftLogin(
      provider,
      flows,
      { resolveOrLink: jest.fn().mockResolvedValue(account) },
      'https://web.example/auth/callback',
      'https://mobile.example/auth/callback',
    );
    const exchange = new ExchangeMicrosoftLoginCode(flows, createAccounts(), createIssuer());
    const url = await start.execute('mobile', challenge);
    const redirect = await complete.execute({
      code: 'code',
      state: new URL(url).searchParams.get('state')!,
    });
    expect(new URL(redirect).origin).toBe('https://mobile.example');
    expect(redirect).not.toContain('accessToken');
    const code = new URL(redirect).searchParams.get('loginCode')!;
    await expect(
      exchange.execute(code, { clientType: 'mobile' }, 'wrong'.repeat(10)),
    ).rejects.toBeInstanceOf(AuthFailure);
    await expect(exchange.execute(code, { clientType: 'mobile' }, verifier)).rejects.toBeInstanceOf(
      AuthFailure,
    );
    const secondUrl = await start.execute('mobile', challenge);
    const secondRedirect = await complete.execute({
      code: 'code',
      state: new URL(secondUrl).searchParams.get('state')!,
    });
    const secondCode = new URL(secondRedirect).searchParams.get('loginCode')!;
    expect((await exchange.execute(secondCode, { clientType: 'mobile' }, verifier)).userId).toBe(
      account.userId,
    );
  });

  it('rejects an inactive account before rotating refresh', async () => {
    const accounts = createAccounts();
    jest.mocked(accounts.findById).mockResolvedValue({ ...account, status: 'LOCKED' });
    const sessions = createSessions();
    const refresh = new RefreshSession(createTokens(), accounts, sessions, createIssuer());
    await expect(refresh.execute('refresh')).rejects.toBeInstanceOf(AuthFailure);
    expect(sessions.rotate).not.toHaveBeenCalled();
  });

  it('rejects a refresh token when atomic rotation loses the race', async () => {
    const sessions = createSessions();
    jest.mocked(sessions.rotate).mockResolvedValue(false);
    await expect(
      new RefreshSession(createTokens(), createAccounts(), sessions, createIssuer()).execute(
        'refresh',
      ),
    ).rejects.toBeInstanceOf(AuthFailure);
  });

  it('revokes the refresh session even when access is absent or stale', async () => {
    const sessions = createSessions();
    await new LogoutCurrentSession(createTokens(), sessions).execute({
      userId: 'other-user',
      refreshToken: 'refresh',
    });
    expect(sessions.revokeFamily).toHaveBeenCalledWith(refreshClaims, 'refresh');
    expect(sessions.revokeBySid).not.toHaveBeenCalled();
  });

  it('returns only the four current-user fields', async () => {
    const result = await new GetCurrentAuthenticatedUser(createAccounts()).execute('user-1');
    expect(result).toEqual({
      userId: 'user-1',
      studentId: '2210001',
      roles: ['STUDENT'],
      status: 'ACTIVE',
    });
  });
});
