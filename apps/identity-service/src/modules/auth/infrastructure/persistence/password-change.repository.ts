import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { PasswordChangeRepository } from '@/modules/auth/application/ports';
import { AuthFailure } from '@/modules/auth/domain';
import { AuthSession } from '@/modules/auth/infrastructure/persistence/auth-session.entity';
import { RefreshToken } from '@/modules/auth/infrastructure/persistence/refresh-token.entity';
import { AccountStatus, User } from '@/modules/users/infrastructure/persistence';

@Injectable()
export class TypeormPasswordChangeRepository implements PasswordChangeRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findPasswordHash(userId: string): Promise<string | null> {
    try {
      const user = await this.dataSource
        .getRepository(User)
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.id = :userId AND user.deletedAt IS NULL', { userId })
        .getOne();
      return user?.passwordHash ?? null;
    } catch {
      throw new AuthFailure('dependency_unavailable');
    }
  }

  async changePasswordAndRevokeOtherSessions(
    userId: string,
    currentSessionId: string,
    expectedPasswordHash: string,
    newPasswordHash: string,
  ): Promise<boolean> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager
          .getRepository(User)
          .createQueryBuilder('user')
          .addSelect('user.passwordHash')
          .setLock('pessimistic_write')
          .where('user.id = :userId AND user.deletedAt IS NULL', { userId })
          .getOne();
        if (
          !user ||
          user.status !== AccountStatus.Active ||
          user.passwordHash !== expectedPasswordHash
        )
          return false;

        const now = new Date();
        const session = await manager
          .getRepository(AuthSession)
          .createQueryBuilder('session')
          .setLock('pessimistic_write')
          .where(
            'session.id = :sessionId AND session.userId = :userId AND session.revokedAt IS NULL AND session.expiresAt > :now',
            { sessionId: currentSessionId, userId, now },
          )
          .getOne();
        if (!session) return false;

        await manager.getRepository(User).update(userId, { passwordHash: newPasswordHash });
        await manager
          .createQueryBuilder()
          .update(AuthSession)
          .set({ revokedAt: now })
          .where('user_id = :userId AND id <> :sessionId AND revoked_at IS NULL', {
            userId,
            sessionId: currentSessionId,
          })
          .execute();
        await manager
          .createQueryBuilder()
          .update(RefreshToken)
          .set({ revokedAt: now })
          .where('user_id = :userId AND family_id <> :sessionId AND revoked_at IS NULL', {
            userId,
            sessionId: currentSessionId,
          })
          .execute();
        return true;
      });
    } catch {
      throw new AuthFailure('dependency_unavailable');
    }
  }
}
