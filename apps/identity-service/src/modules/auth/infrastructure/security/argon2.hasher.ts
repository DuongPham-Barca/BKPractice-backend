import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import type { PasswordHasher } from '@/modules/auth/application/ports';

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  private readonly dummyHash = argon2.hash('account-that-does-not-exist');

  hash(password: string): Promise<string> {
    return argon2.hash(password);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }

  async verifyDummy(password: string): Promise<void> {
    await argon2.verify(await this.dummyHash, password);
  }
}
