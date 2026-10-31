import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { RoleName } from '@/modules/rbac/domain';
import type { UserManagementRepository } from '@/modules/users/application';
import { UserManagementFailure, type UserAdminProjection } from '@/modules/users/domain';
import { User } from '@/modules/users/infrastructure/persistence/user.entity';

function toProjection(user: User): UserAdminProjection {
  return {
    userId: user.id,
    studentId: user.studentId,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    roles: user.roles.map((role) => role.name).sort(),
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
  };
}

@Injectable()
export class TypeormUserManagementRepository implements UserManagementRepository {
  constructor(private readonly database: DataSource) {}

  async list(page: number, limit: number, includeDeleted: boolean): Promise<{
    items: UserAdminProjection[];
    hasMore: boolean;
  }> {
    const query = this.database.getRepository(User).createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'role')
      .orderBy('user.createdAt', 'DESC')
      .addOrderBy('user.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit + 1);
    if (!includeDeleted) query.andWhere('user.deletedAt IS NULL');
    const users = await query.getMany();
    return { items: users.slice(0, limit).map(toProjection), hasMore: users.length > limit };
  }

  async find(userId: string): Promise<UserAdminProjection | null> {
    const user = await this.database.getRepository(User).findOne({ where: { id: userId } });
    return user ? toProjection(user) : null;
  }

  async softDelete(userId: string): Promise<void> {
    await this.database.transaction(async (manager) => {
      const locked = await manager.getRepository(User).createQueryBuilder('user')
        .setLock('pessimistic_write')
        .where('user.id = :userId', { userId })
        .getOne();
      if (!locked) throw new UserManagementFailure('not_found');
      const user = await manager.getRepository(User).findOne({ where: { id: userId } });
      if (!user) throw new UserManagementFailure('not_found');
      if (user.isSystemAccount || user.roles.some((role) => role.name === RoleName.Admin))
        throw new UserManagementFailure('forbidden');
      if (user.deletedAt) return;
      const deletedAt = new Date();
      await manager.getRepository(User).update(userId, { deletedAt });
      await manager.query(
        'UPDATE sessions SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL',
        [userId, deletedAt],
      );
      await manager.query(
        'UPDATE refresh_tokens SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL',
        [userId, deletedAt],
      );
    });
  }
}
