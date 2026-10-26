import 'reflect-metadata';

import { DataSource, type EntityManager } from 'typeorm';

import { RoleName } from '@/modules/rbac/domain';

export const rbacSeedCatalog = [
  ...['problem', 'course'].flatMap((resource) =>
    ['create', 'read-managed', 'update', 'publish', 'hold', 'republish', 'delete', 'restore'].map(
      (action) => ({ code: `${resource}:${action}`, role: RoleName.Lecturer }),
    ),
  ),
  ...['create', 'read-managed', 'update', 'archive', 'restore', 'manage-members'].map((action) => ({
    code: `class:${action}`,
    role: RoleName.Lecturer,
  })),
  ...['create', 'read-managed', 'update', 'publish', 'delete', 'restore'].map((action) => ({
    code: `assignment:${action}`,
    role: RoleName.Lecturer,
  })),
  { code: 'community:moderate', role: RoleName.Admin },
  { code: 'user:import', role: RoleName.Admin },
];

export async function seedRbac(manager: EntityManager): Promise<void> {
  // Serialize seed commands without changing account or token state.
  await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('identity:rbac-seed', 0))");
  for (const name of Object.values(RoleName))
    await manager.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [
      name,
    ]);
  for (const { code, role } of rbacSeedCatalog) {
    const forbidden: unknown = await manager.query(
      `SELECT r.id FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = $1 AND r.name <> $2 LIMIT 1`,
      [code, role],
    );
    if (Array.isArray(forbidden) && forbidden.length)
      throw new Error(
        'RBAC seed requires remediation of an existing mapping that conflicts with approved policy',
      );
    await manager.query(
      'INSERT INTO permissions (code) VALUES ($1) ON CONFLICT (code) DO NOTHING',
      [code],
    );
    await manager.query(
      `INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
      WHERE r.name = $1 AND p.code = $2 ON CONFLICT DO NOTHING`,
      [role, code],
    );
  }
}

if (require.main === module) {
  const database = new DataSource({
    type: 'postgres',
    url: process.env.IDENTITY_DATABASE_URL,
    synchronize: false,
  });
  void (async () => {
    try {
      if (!process.env.IDENTITY_DATABASE_URL) throw new Error('Missing database configuration');
      await database.initialize();
      await database.transaction(seedRbac);
      process.stdout.write('RBAC catalog seeded successfully. No user accounts were created.\n');
    } catch {
      process.stderr.write(
        'RBAC seed failed; verify database migrations and approved mappings. No changes committed.\n',
      );
      process.exitCode = 1;
    } finally {
      if (database.isInitialized) await database.destroy();
    }
  })();
}
