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
} from '@/modules/auth/application/ports';
import {
  CompleteMicrosoftLogin,
  ExchangeMicrosoftLoginCode,
  GetCurrentAuthenticatedUser,
  LoginWithStudentId,
  LogoutCurrentSession,
  RefreshSession,
  StartMicrosoftLogin,
} from '@/modules/auth/application/use-cases';
import { AuthFailure } from '@/modules/auth/domain';
import type { AuthAccount } from '@/modules/auth/domain';

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
    findByStudentId: jest.fn().mockResolvedValue({ ...account, passwordHash: 'hash' }),
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
  };
}

function createIssuer(): AuthTokenIssuer {
  return new AuthTokenIssuer(createTokens(), createHasher(), createSessions(), {
    readForUser: jest.fn().mockResolvedValue([]),
  });
}

describe('Authentication use cases', () => {
  it('trims the student ID, keeps the password intact, and creates a new family', async () => {
    const accounts = createAccounts();
    const hasher = createHasher();
    const issuer = createIssuer();
    const result = await new LoginWithStudentId(accounts, hasher, issuer).execute(
      ' 2210001 ',
      ' pass word ',
    );
    expect(accounts.findByStudentId).toHaveBeenCalledWith('2210001');
    expect(hasher.verify).toHaveBeenCalledWith('hash', ' pass word ');
    expect(result).toEqual({ userId: 'user-1', ...pair });
  });

  it('uses the same public failure for missing student IDs and wrong passwords', async () => {
    const accounts = createAccounts();
    const hasher = createHasher();
    const issuer = createIssuer();
    const issue = jest.spyOn(issuer, 'issueNewFamily');
    jest.mocked(accounts.findByStudentId).mockResolvedValueOnce(null);
    const login = new LoginWithStudentId(accounts, hasher, issuer);
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
        .mocked(accounts.findByStudentId)
        .mockResolvedValue({ ...account, status, passwordHash: 'hash' });
      const issuer = createIssuer();
      const issue = jest.spyOn(issuer, 'issueNewFamily');
      await expect(
        new LoginWithStudentId(accounts, createHasher(), issuer).execute('2210001', '123456'),
      ).rejects.toBeInstanceOf(AuthFailure);
      expect(issue).not.toHaveBeenCalled();
    },
  );

  it('issues access with the current effective permissions', async () => {
    const tokens = createTokens();
    const permissions = { readForUser: jest.fn().mockResolvedValue(['problem:create']) };
    const issuer = new AuthTokenIssuer(tokens, createHasher(), createSessions(), permissions);
    await issuer.issueNewFamily(account);
    expect(tokens.signAccess).toHaveBeenCalledWith(account, ['problem:create']);
  });

  it('consumes Microsoft state and login code only once', async () => {
    const transactions = new Map<string, { nonce: string; verifier: string }>();
    const loginCodes = new Map<string, string>();
    const flows: AuthFlowStore = {
      putTransaction: async (state, transaction) => {
        transactions.set(state, transaction);
      },
      takeTransaction: async (state) => {
        const value = transactions.get(state) ?? null;
        transactions.delete(state);
        return value;
      },
      createLoginCode: async (userId) => {
        loginCodes.set('once', userId);
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

  it('does not revoke a different user’s session on logout', async () => {
    const sessions = createSessions();
    await new LogoutCurrentSession(createTokens(), sessions).execute('other-user', 'refresh');
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
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
