import { generateKeyPairSync, sign } from 'node:crypto';

import { ConfidentialClientApplication } from '@azure/msal-node';
import { ConfigService } from '@nestjs/config';

import { AuthFailure } from '@/modules/auth/domain';
import { MsalMicrosoftIdentityProvider } from '@/modules/auth/infrastructure/microsoft';

describe('MsalMicrosoftIdentityProvider', () => {
  const tenantId = '11111111-1111-4111-8111-111111111111';
  const clientId = '22222222-2222-4222-8222-222222222222';
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  const config = new ConfigService({
    MICROSOFT_TENANT_ID: tenantId,
    MICROSOFT_CLIENT_ID: clientId,
    MICROSOFT_CLIENT_SECRET: 'test-only',
    MICROSOFT_REDIRECT_URI: 'http://localhost/callback',
  });
  const provider = new MsalMicrosoftIdentityProvider(config);
  const transaction = { nonce: 'expected-nonce', verifier: 'verifier' };
  const originalFetch = global.fetch;

  function signIdToken(overrides: Record<string, unknown> = {}): string {
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-key' })).toString(
      'base64url',
    );
    const claims = Buffer.from(
      JSON.stringify({
        aud: clientId,
        iss: `https://login.microsoftonline.com/${tenantId}/v2.0`,
        tid: tenantId,
        oid: 'object-1',
        preferred_username: ' STUDENT@SCHOOL.EDU ',
        nonce: transaction.nonce,
        ver: '2.0',
        exp: Math.floor(Date.now() / 1000) + 300,
        ...overrides,
      }),
    ).toString('base64url');
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), privateKey).toString(
      'base64url',
    );
    return `${header}.${claims}.${signature}`;
  }

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ keys: [{ ...jwk, kid: 'test-key' }] }),
    }) as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('uses the configured single-tenant redirect, state, nonce and PKCE challenge', async () => {
    const getUrl = jest
      .spyOn(ConfidentialClientApplication.prototype, 'getAuthCodeUrl')
      .mockResolvedValue('https://login.microsoftonline.com/tenant/oauth');
    await provider.getAuthorizationUrl('state', 'nonce', 'challenge');
    expect(getUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        scopes: ['openid', 'profile', 'email'],
        redirectUri: 'http://localhost/callback',
        state: 'state',
        nonce: 'nonce',
        codeChallenge: 'challenge',
        codeChallengeMethod: 'S256',
      }),
    );
  });

  it('accepts a signed ID token from the configured tenant and normalizes its username', async () => {
    jest
      .spyOn(ConfidentialClientApplication.prototype, 'acquireTokenByCode')
      .mockResolvedValue({ idToken: signIdToken() } as never);
    expect(await provider.exchangeCode('authorization-code', transaction)).toEqual({
      tenantId,
      objectId: 'object-1',
      username: 'student@school.edu',
    });
  });

  it.each([
    ['wrong tenant', { tid: 'another-tenant' }],
    ['wrong audience', { aud: 'another-client' }],
    ['wrong nonce', { nonce: 'another-nonce' }],
    ['expired', { exp: 1 }],
  ])('rejects a token with %s', async (_name, overrides) => {
    jest
      .spyOn(ConfidentialClientApplication.prototype, 'acquireTokenByCode')
      .mockResolvedValue({ idToken: signIdToken(overrides) } as never);
    await expect(provider.exchangeCode('authorization-code', transaction)).rejects.toBeInstanceOf(
      AuthFailure,
    );
  });

  it('rejects a changed signature', async () => {
    const valid = signIdToken();
    const modified = `${valid.slice(0, -2)}xx`;
    jest
      .spyOn(ConfidentialClientApplication.prototype, 'acquireTokenByCode')
      .mockResolvedValue({ idToken: modified } as never);
    await expect(provider.exchangeCode('authorization-code', transaction)).rejects.toBeInstanceOf(
      AuthFailure,
    );
  });
});
