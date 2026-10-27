import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import type { RbacRepository, TransactionRunner, UserRoles } from '@/modules/rbac/application';
import { isRoleName, type RoleName } from '@/modules/rbac/domain';

export class TypeormRbacRepository implements RbacRepository {
  constructor(private readonly manager: EntityManager) {}

  async findUserRoles(userId: string): Promise<UserRoles | null> {
    const rows = await this.manager.query<{ userId: string; roles: unknown[] }[]>(
      `SELECT u.id AS "userId",
         COALESCE(array_agg(r.name::text ORDER BY r.name::text)
           FILTER (WHERE r.name IS NOT NULL), ARRAY[]::text[]) AS roles
       FROM users u LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
       WHERE u.id = $1 AND u.is_system_account = false GROUP BY u.id`,
      [userId],
    );
    const row = rows[0];
    if (!row) return null;
    if (!row.roles.every(isRoleName)) throw new Error('Invalid stored role');
    return { userId: row.userId, roles: row.roles };
  }

  async assignRole(userId: string, role: RoleName): Promise<void> {
    await this.manager.query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = $2 ON CONFLICT DO NOTHING`,
      [userId, role],
    );
  }

  async revokeRole(userId: string, role: RoleName): Promise<void> {
    await this.manager.query(
      `DELETE FROM user_roles WHERE user_id = $1
       AND role_id = (SELECT id FROM roles WHERE name = $2)`,
      [userId, role],
    );
  }

  async lockAdminRole(): Promise<void> {
    const rows = await this.manager.query<{ id: string }[]>(
      `SELECT id FROM roles WHERE name = 'ADMIN' FOR UPDATE`,
    );
    if (!rows.length) throw new Error('Missing static administrator role');
  }

  async countAdmins(): Promise<number> {
    const rows = await this.manager.query<{ count: number }[]>(
      `SELECT count(*)::int AS count FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id WHERE r.name = 'ADMIN'`,
    );
    return rows[0]?.count ?? 0;
  }
}

@Injectable()
export class TypeormRbacTransactionRunner implements TransactionRunner {
  constructor(private readonly database: DataSource) {}

  run<T>(operation: (repository: RbacRepository) => Promise<T>): Promise<T> {
    return this.database.transaction((manager) => operation(new TypeormRbacRepository(manager)));
  }
}
