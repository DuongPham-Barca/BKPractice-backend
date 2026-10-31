import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import type { EffectivePermissionReader } from '@/modules/rbac/application';
import { collectEffectivePermissions } from '@/modules/rbac/domain';

@Injectable()
export class TypeormEffectivePermissionReader implements EffectivePermissionReader {
  constructor(private readonly dataSource: DataSource) {}

  async readForUser(userId: string): Promise<string[]> {
    const rows: { code: string }[] = await this.dataSource.query(
      `SELECT p.code FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = $1`,
      [userId],
    );
    return collectEffectivePermissions(rows.map((row) => row.code));
  }
}
