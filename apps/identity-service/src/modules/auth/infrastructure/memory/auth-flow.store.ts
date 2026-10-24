import { createHash, randomBytes } from 'node:crypto';

import type { AuthFlowStore, OAuthTransaction } from '@/modules/auth/application/ports';

interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryAuthFlowStore implements AuthFlowStore {
  private readonly transactions = new Map<string, Entry<OAuthTransaction>>();
  private readonly loginCodes = new Map<string, Entry<string>>();

  async putTransaction(state: string, transaction: OAuthTransaction): Promise<void> {
    this.put(this.transactions, state, transaction, 300_000);
  }

  async takeTransaction(state: string): Promise<OAuthTransaction | null> {
    return this.take(this.transactions, state);
  }

  async createLoginCode(userId: string): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    this.put(this.loginCodes, this.hash(code), userId, 60_000);
    return code;
  }

  async takeLoginCode(code: string): Promise<string | null> {
    return this.take(this.loginCodes, this.hash(code));
  }

  private hash(code: string): string {
    return createHash('sha256').update(code).digest('hex');
  }

  private put<T>(entries: Map<string, Entry<T>>, key: string, value: T, ttlMs: number): void {
    const entry = { value, expiresAt: Date.now() + ttlMs };
    entries.set(key, entry);
    setTimeout(() => {
      if (entries.get(key) === entry) entries.delete(key);
    }, ttlMs).unref();
  }

  private take<T>(entries: Map<string, Entry<T>>, key: string): T | null {
    const entry = entries.get(key);
    entries.delete(key);
    return entry && entry.expiresAt > Date.now() ? entry.value : null;
  }
}
