import type { BkAccessClaims, BkRefreshClaims } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import type { BkTokenService } from '@/modules/auth/application/ports';
import type { AuthAccount } from '@/modules/auth/domain';
import { AuthFailure } from '@/modules/auth/domain';

type Ttl = `${number}${'s' | 'm' | 'h' | 'd'}`;

@Injectable()
export class JwtBkTokenService implements BkTokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  signAccess(account: AuthAccount, permissions: string[]): Promise<string> {
    return this.jwt.signAsync(
      {
        sub: account.userId,
        roles: account.roles,
        permissions,
        type: 'access',
      } satisfies BkAccessClaims,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_ACCESS_TTL') as Ttl,
      },
    );
  }

  async signRefresh(
    userId: string,
    tokenId: string,
    familyId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwt.signAsync(
      { sub: userId, jti: tokenId, fid: familyId, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.getOrThrow<string>('JWT_REFRESH_TTL') as Ttl,
      },
    );
    const payload = this.jwt.decode<{ exp: number }>(token);
    return { token, expiresAt: new Date(payload.exp * 1000) };
  }

  async verifyRefresh(token: string): Promise<BkRefreshClaims> {
    try {
      const payload = await this.jwt.verifyAsync<BkRefreshClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      if (
        payload.type !== 'refresh' ||
        !payload.sub ||
        !payload.jti ||
        !payload.fid ||
        !payload.exp
      ) {
        throw new Error('Invalid refresh claim');
      }
      return payload;
    } catch {
      throw new AuthFailure('invalid_token');
    }
  }

  async verifyAccess(token: string): Promise<string> {
    try {
      const payload = await this.jwt.verifyAsync<BkAccessClaims>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      if (
        payload.type !== 'access' ||
        !payload.sub ||
        !Array.isArray(payload.roles) ||
        !payload.roles.every((role) => typeof role === 'string') ||
        (payload.permissions !== undefined &&
          (!Array.isArray(payload.permissions) ||
            !payload.permissions.every((permission) => typeof permission === 'string')))
      ) {
        throw new Error('Invalid access claim');
      }
      return payload.sub;
    } catch {
      throw new AuthFailure('invalid_token');
    }
  }
}
