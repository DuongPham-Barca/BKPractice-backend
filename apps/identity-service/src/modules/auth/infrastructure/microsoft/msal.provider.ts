import { createPublicKey, verify } from 'node:crypto';

import { ConfidentialClientApplication } from '@azure/msal-node';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { MicrosoftIdentityProvider, OAuthTransaction } from '@/modules/auth/application/ports';
import type { MicrosoftIdentity } from '@/modules/auth/domain';
import { AuthFailure } from '@/modules/auth/domain';

interface MicrosoftClaims {
  aud?: unknown;
  iss?: unknown;
  tid?: unknown;
  oid?: unknown;
  preferred_username?: unknown;
  nonce?: unknown;
  exp?: unknown;
  nbf?: unknown;
  ver?: unknown;
}

@Injectable()
export class MsalMicrosoftIdentityProvider implements MicrosoftIdentityProvider {
  private readonly tenantId: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(config: ConfigService) {
    this.tenantId = config.getOrThrow<string>('MICROSOFT_TENANT_ID');
    this.clientId = config.getOrThrow<string>('MICROSOFT_CLIENT_ID');
    this.clientSecret = config.getOrThrow<string>('MICROSOFT_CLIENT_SECRET');
    this.redirectUri = config.getOrThrow<string>('MICROSOFT_REDIRECT_URI');
  }

  async getAuthorizationUrl(state: string, nonce: string, challenge: string): Promise<string> {
    try {
      return await this.createClient().getAuthCodeUrl({
        scopes: ['openid', 'profile', 'email'],
        redirectUri: this.redirectUri,
        state,
        nonce,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
      });
    } catch {
      throw new AuthFailure('dependency_unavailable');
    }
  }

  async exchangeCode(code: string, transaction: OAuthTransaction): Promise<MicrosoftIdentity> {
    let idToken: string;
    try {
      const result = await this.createClient().acquireTokenByCode({
        code,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: this.redirectUri,
        codeVerifier: transaction.verifier,
        nonce: transaction.nonce,
      });
      idToken = result.idToken;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'errorCode' in error
          ? error.errorCode
          : undefined;
      if (
        code === 'network_error' ||
        code === 'endpoints_resolution_error' ||
        code === 'request_timeout'
      ) {
        throw new AuthFailure('dependency_unavailable');
      }
      throw new AuthFailure('invalid_credentials');
    }
    return this.verifyIdToken(idToken, transaction.nonce);
  }

  private createClient(): ConfidentialClientApplication {
    return new ConfidentialClientApplication({
      auth: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
      },
      system: { loggerOptions: { piiLoggingEnabled: false, loggerCallback: () => undefined } },
    });
  }

  private async verifyIdToken(token: string, nonce: string): Promise<MicrosoftIdentity> {
    try {
      const [header, body, signature] = token.split('.');
      if (!header || !body || !signature) throw new Error('Invalid token');
      const tokenHeader: unknown = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
      const claims: MicrosoftClaims = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as MicrosoftClaims;
      if (
        typeof tokenHeader !== 'object' ||
        tokenHeader === null ||
        !('kid' in tokenHeader) ||
        typeof tokenHeader.kid !== 'string' ||
        !('alg' in tokenHeader) ||
        tokenHeader.alg !== 'RS256'
      ) {
        throw new Error('Invalid token header');
      }
      let keysResponse: Response;
      try {
        keysResponse = await fetch(
          `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`,
        );
      } catch {
        throw new AuthFailure('dependency_unavailable');
      }
      if (!keysResponse.ok) throw new AuthFailure('dependency_unavailable');
      const keySet: unknown = await keysResponse.json();
      if (
        typeof keySet !== 'object' ||
        keySet === null ||
        !('keys' in keySet) ||
        !Array.isArray(keySet.keys)
      ) {
        throw new Error('Invalid key set');
      }
      const key: unknown = keySet.keys.find(
        (item: unknown) =>
          typeof item === 'object' &&
          item !== null &&
          'kid' in item &&
          item.kid === tokenHeader.kid,
      );
      if (
        typeof key !== 'object' ||
        key === null ||
        !('kty' in key) ||
        key.kty !== 'RSA' ||
        !('n' in key) ||
        typeof key.n !== 'string' ||
        !('e' in key) ||
        typeof key.e !== 'string'
      ) {
        throw new Error('Unknown signing key');
      }
      const verified = verify(
        'RSA-SHA256',
        Buffer.from(`${header}.${body}`),
        createPublicKey({ key: { kty: 'RSA', n: key.n, e: key.e }, format: 'jwk' }),
        Buffer.from(signature, 'base64url'),
      );
      if (
        !verified ||
        claims.aud !== this.clientId ||
        claims.iss !== `https://login.microsoftonline.com/${this.tenantId}/v2.0` ||
        claims.tid !== this.tenantId ||
        claims.nonce !== nonce ||
        claims.ver !== '2.0' ||
        typeof claims.exp !== 'number' ||
        claims.exp <= Math.floor(Date.now() / 1000) ||
        (typeof claims.nbf === 'number' && claims.nbf > Math.floor(Date.now() / 1000)) ||
        typeof claims.oid !== 'string' ||
        !claims.oid ||
        typeof claims.preferred_username !== 'string' ||
        !claims.preferred_username.trim()
      ) {
        throw new Error('Invalid identity claims');
      }
      return {
        tenantId: claims.tid,
        objectId: claims.oid,
        username: claims.preferred_username.trim().toLowerCase(),
      };
    } catch (error) {
      if (error instanceof AuthFailure) throw error;
      throw new AuthFailure('invalid_credentials');
    }
  }
}
