import type { BkRefreshClaims } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type {
  RefreshRecord,
  RefreshSessionRepository,
  PasswordHasher,
} from '@/modules/auth/application/ports';
import { RefreshToken } from '@/modules/users/entities/refresh-token.entity';

@Injectable()
export class TypeormRefreshSessionRepository implements RefreshSessionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(record: RefreshRecord): Promise<void> {
    await this.dataSource.getRepository(RefreshToken).insert({
      tokenId: record.tokenId,
      familyId: record.familyId,
      replacedByTokenId: null,
      userId: record.userId,
      tokenHash: record.tokenHash,
      expiresAt: record.expiresAt,
      revokedAt: null,
    });
  }

  async rotate(
    current: BkRefreshClaims,
    rawToken: string,
    replacement: RefreshRecord,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const stored = await manager
        .createQueryBuilder(RefreshToken, 'token')
        .setLock('pessimistic_write')
        .where(
          'token.tokenId = :tokenId AND token.userId = :userId AND token.familyId = :familyId',
          {
            tokenId: current.jti,
            userId: current.sub,
            familyId: current.fid,
          },
        )
        .getOne();
      if (!stored || !(await this.hasher.verify(stored.tokenHash, rawToken))) return false;
      if (stored.revokedAt) {
        await manager
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: new Date() })
          .where('family_id = :familyId AND revoked_at IS NULL', { familyId: current.fid })
          .execute();
        return false;
      }
      if (stored.expiresAt.getTime() <= Date.now()) return false;
      stored.revokedAt = new Date();
      stored.replacedByTokenId = replacement.tokenId;
      await manager.save(stored);
      await manager.insert(RefreshToken, {
        tokenId: replacement.tokenId,
        familyId: replacement.familyId,
        replacedByTokenId: null,
        userId: replacement.userId,
        tokenHash: replacement.tokenHash,
        expiresAt: replacement.expiresAt,
        revokedAt: null,
      });
      return true;
    });
  }

  async revokeFamily(current: BkRefreshClaims, rawToken: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const stored = await manager
        .createQueryBuilder(RefreshToken, 'token')
        .setLock('pessimistic_write')
        .where(
          'token.tokenId = :tokenId AND token.userId = :userId AND token.familyId = :familyId',
          { tokenId: current.jti, userId: current.sub, familyId: current.fid },
        )
        .getOne();
      if (!stored || !(await this.hasher.verify(stored.tokenHash, rawToken))) return;
      await manager
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: new Date() })
        .where('family_id = :familyId AND revoked_at IS NULL', { familyId: current.fid })
        .execute();
    });
  }
}
