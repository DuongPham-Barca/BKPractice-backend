import { createHash, randomBytes } from 'node:crypto';

import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import type { AuthFlowStore, OAuthTransaction } from '@/modules/auth/application/ports';
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
        typeof parsed.verifier === 'string'
      ) {
        return { nonce: parsed.nonce, verifier: parsed.verifier };
      }
    } catch {
      return null;
    }
    return null;
  }

  async createLoginCode(userId: string): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.run(() => this.redis.set(this.loginCodeKey(code), userId, 'EX', 60));
    return code;
  }

  takeLoginCode(code: string): Promise<string | null> {
    return this.run(() => this.redis.getdel(this.loginCodeKey(code)));
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
