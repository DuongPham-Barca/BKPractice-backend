import { createHash, randomBytes } from 'node:crypto';

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AuthFlowStore, LoginCodeGrant, OAuthTransaction } from '@/modules/auth/application/ports';
import { AuthFailure } from '@/modules/auth/domain';

@Injectable()
export class RedisAuthFlowStore implements AuthFlowStore, OnModuleDestroy {
  private readonly redis: Redis;

  constructor(config: ConfigService) {
    this.redis = new Redis(config.getOrThrow<string>('REDIS_URL'), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.redis.on('error', () => undefined);
  }

  async putTransaction(state: string, transaction: OAuthTransaction): Promise<void> {
    await this.run(() =>
      this.redis.set(`auth:oauth:${state}`, JSON.stringify(transaction), 'EX', 300),
    );
  }

  async takeTransaction(state: string): Promise<OAuthTransaction | null> {
    const value = await this.run(() => this.redis.getdel(`auth:oauth:${state}`));
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'nonce' in parsed &&
        'verifier' in parsed &&
        typeof parsed.nonce === 'string' &&
        typeof parsed.verifier === 'string' &&
        'clientType' in parsed &&
        (parsed.clientType === 'web' || parsed.clientType === 'mobile')
      ) {
        return {
          nonce: parsed.nonce,
          verifier: parsed.verifier,
          clientType: parsed.clientType,
          mobileChallenge: 'mobileChallenge' in parsed && typeof parsed.mobileChallenge === 'string' ? parsed.mobileChallenge : undefined,
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  async createLoginCode(grant: LoginCodeGrant): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.run(() => this.redis.set(this.loginCodeKey(code), JSON.stringify(grant), 'EX', 60));
    return code;
  }

  async takeLoginCode(code: string): Promise<LoginCodeGrant | null> {
    const value = await this.run(() => this.redis.getdel(this.loginCodeKey(code)));
    if (!value) return null;
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === 'object' && parsed !== null && 'userId' in parsed &&
          'clientType' in parsed && typeof parsed.userId === 'string' &&
          (parsed.clientType === 'web' || parsed.clientType === 'mobile')) {
        return { userId: parsed.userId, clientType: parsed.clientType,
          mobileChallenge: 'mobileChallenge' in parsed && typeof parsed.mobileChallenge === 'string'
            ? parsed.mobileChallenge : undefined };
      }
    } catch {
      return null;
    }
    return null;
  }

  async onModuleDestroy(): Promise<void> {
    this.redis.disconnect();
  }

  private loginCodeKey(code: string): string {
    return `auth:login-code:${createHash('sha256').update(code).digest('hex')}`;
  }

  private async run<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      throw new AuthFailure('dependency_unavailable');
    }
  }
}
