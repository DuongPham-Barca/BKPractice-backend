import type { BkRefreshClaims } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, MoreThan } from 'typeorm';
import type { EntityManager } from 'typeorm';

import type {
  RefreshRecord,
  RefreshSessionRepository,
  PasswordHasher,
  SessionMetadata,
} from '@/modules/auth/application/ports';
import { AuthFailure } from '@/modules/auth/domain';
import { AuthSession } from '@/modules/auth/infrastructure/persistence/auth-session.entity';
import { RefreshToken } from '@/modules/auth/infrastructure/persistence/refresh-token.entity';
import { AccountStatus, User } from '@/modules/users/infrastructure/persistence';

@Injectable()
export class TypeormRefreshSessionRepository implements RefreshSessionRepository {
  constructor(
    private readonly dataSource: DataSource,
    private readonly hasher: PasswordHasher,
  ) {}

  async create(
    record: RefreshRecord,
    metadata: SessionMetadata = { clientType: 'web' },
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .setLock('pessimistic_read')
        .where('user.id = :userId AND user.deletedAt IS NULL', { userId: record.userId })
        .getOne();
      if (!user || user.status !== AccountStatus.Active)
        throw new AuthFailure('invalid_credentials');
      if (record.expectedPasswordHash && user.passwordHash !== record.expectedPasswordHash)
        throw new AuthFailure('invalid_credentials');
      await manager.insert(AuthSession, {
        id: record.familyId,
        userId: record.userId,
        refreshTokenHash: record.tokenHash,
        clientType: metadata.clientType,
        device: metadata.device?.slice(0, 255) ?? null,
        userAgent: metadata.userAgent?.slice(0, 512) ?? null,
        ip: metadata.ip?.slice(0, 64) ?? null,
        lastUsedAt: null,
        expiresAt: record.expiresAt,
        revokedAt: null,
      });
      await manager.insert(RefreshToken, {
        tokenId: record.tokenId,
        familyId: record.familyId,
        replacedByTokenId: null,
        userId: record.userId,
        tokenHash: record.tokenHash,
        expiresAt: record.expiresAt,
        revokedAt: null,
      });
    });
  }

  async rotate(
    current: BkRefreshClaims,
    rawToken: string,
    replacement: RefreshRecord,
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.getRepository(User).createQueryBuilder('user')
        .setLock('pessimistic_read')
        .where('user.id = :userId AND user.deletedAt IS NULL', { userId: current.sub })
        .getOne();
      if (!user || user.status !== AccountStatus.Active) return false;
      const session = await manager
        .createQueryBuilder(AuthSession, 'session')
        .setLock('pessimistic_write')
        .where('session.id = :sid AND session.userId = :userId', {
          sid: current.fid,
          userId: current.sub,
        })
        .getOne();
      if (!session || session.revokedAt || session.expiresAt.getTime() <= Date.now()) return false;
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
        await this.revokeLockedFamily(manager, session);
        return false;
      }
      if (stored.expiresAt.getTime() <= Date.now()) return false;
      if (!(await this.hasher.verify(session.refreshTokenHash, rawToken))) return false;
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
      session.refreshTokenHash = replacement.tokenHash;
      session.lastUsedAt = new Date();
      session.expiresAt = replacement.expiresAt;
      await manager.save(session);
      return true;
    });
  }

  async revokeFamily(current: BkRefreshClaims, rawToken: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const session = await manager
        .createQueryBuilder(AuthSession, 'session')
        .setLock('pessimistic_write')
        .where('session.id = :sid AND session.userId = :userId', {
          sid: current.fid,
          userId: current.sub,
        })
        .getOne();
      if (!session || session.revokedAt) return;
      const stored = await manager
        .createQueryBuilder(RefreshToken, 'token')
        .setLock('pessimistic_write')
        .where(
          'token.tokenId = :tokenId AND token.userId = :userId AND token.familyId = :familyId',
          { tokenId: current.jti, userId: current.sub, familyId: current.fid },
        )
        .getOne();
      if (!stored || !(await this.hasher.verify(stored.tokenHash, rawToken))) return;
      await this.revokeLockedFamily(manager, session);
    });
  }

  async revokeBySid(userId: string, sid: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const session = await manager
        .createQueryBuilder(AuthSession, 'session')
        .setLock('pessimistic_write')
        .where('session.id = :sid AND session.userId = :userId', { sid, userId })
        .getOne();
      if (session && !session.revokedAt) await this.revokeLockedFamily(manager, session);
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const now = new Date();
      await manager
        .createQueryBuilder()
        .update(AuthSession)
        .set({ revokedAt: now })
        .where('user_id = :userId AND revoked_at IS NULL', { userId })
        .execute();
      await manager
        .createQueryBuilder()
        .update(RefreshToken)
        .set({ revokedAt: now })
        .where('user_id = :userId AND revoked_at IS NULL', { userId })
        .execute();
    });
  }

  async isActive(userId: string, sid: string): Promise<boolean> {
    const result = await this.dataSource
      .getRepository(AuthSession)
      .update(
        { id: sid, userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
        { lastUsedAt: new Date() },
      );
    return (result.affected ?? 0) > 0;
  }

  private async revokeLockedFamily(manager: EntityManager, session: AuthSession): Promise<void> {
    const now = new Date();
    session.revokedAt = now;
    await manager.save(session);
    await manager
      .createQueryBuilder()
      .update(RefreshToken)
      .set({ revokedAt: now })
      .where('family_id = :familyId AND revoked_at IS NULL', { familyId: session.id })
      .execute();
  }
}
