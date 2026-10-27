import 'reflect-metadata';

import { DataSource, type EntityManager } from 'typeorm';

import { readSeedAdminConfig, seedAdmin } from '@/database/seed-admin';
import { RoleName, rbacPermissionCatalog } from '@/modules/rbac/domain';

const safeSeedFailures = new Map([
  ['Missing database configuration', 'Missing IDENTITY_DATABASE_URL.'],
  ['Invalid SEED_ADMIN_LOGIN_ID', 'Missing or invalid SEED_ADMIN_LOGIN_ID.'],
  ['Invalid SEED_ADMIN_EMAIL', 'Missing or invalid SEED_ADMIN_EMAIL.'],
  ['Invalid SEED_ADMIN_PASSWORD', 'Missing or invalid SEED_ADMIN_PASSWORD.'],
  [
    'Bootstrap administrator conflicts with an existing account',
    'Bootstrap Admin login or email conflicts with an existing account.',
  ],
  [
    'Bootstrap administrator role requires remediation',
    'Bootstrap Admin roles differ from the approved ADMIN-only state.',
  ],
  [
    'RBAC seed requires remediation of an existing mapping that conflicts with approved policy',
    'Existing RBAC permission mappings conflict with the approved catalog.',
  ],
]);

export function describeSeedFailure(error: unknown): string {
  if (error instanceof Error) {
    const known = safeSeedFailures.get(error.message);
    if (known) return known;
  }
  const detail: unknown =
    typeof error === 'object' && error !== null && 'driverError' in error
      ? error.driverError
      : error;
  const code =
    typeof detail === 'object' && detail !== null && 'code' in detail ? detail.code : undefined;
  const message =
    typeof detail === 'object' && detail !== null && 'message' in detail
      ? detail.message
      : undefined;
  if (code === '42P01') {
    const table =
      typeof message === 'string'
        ? /^relation "(?:public\.)?(roles|permissions|users|user_roles|role_permissions)" does not exist$/.exec(
            message,
          )?.[1]
        : undefined;
    return table
      ? `Identity table ${table} is missing. Run pnpm migration:run:identity first.`
      : 'Identity is missing a required table. Run pnpm migration:run:identity first.';
  }
  if (code === '42703')
    return typeof message === 'string' && /column "is_system_account" does not exist/.test(message)
      ? 'Identity column users.is_system_account is missing. Run pnpm migration:run:identity first.'
      : 'Identity is missing a required column. Run pnpm migration:run:identity first.';
  if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === '28P01' || code === '3D000')
    return 'Cannot connect to the Identity database. Check IDENTITY_DATABASE_URL and PostgreSQL.';
  return 'RBAC seed failed. Check database migrations, configuration and existing RBAC data.';
}

export async function seedRbac(manager: EntityManager): Promise<void> {
  await manager.query("SELECT pg_advisory_xact_lock(hashtextextended('identity:rbac-seed', 0))");
  for (const name of Object.values(RoleName))
    await manager.query('INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [
      name,
    ]);
  const rolesByCode = new Map<string, RoleName[]>();
  for (const { code, role } of rbacPermissionCatalog) {
    const roles = rolesByCode.get(code) ?? [];
    roles.push(role);
    rolesByCode.set(code, roles);
  }
  for (const [code, roles] of rolesByCode) {
    const forbidden: unknown = await manager.query(
      `SELECT r.id FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = $1 AND NOT (r.name::text = ANY($2::text[])) LIMIT 1`,
      [code, roles],
    );
    if (Array.isArray(forbidden) && forbidden.length)
      throw new Error(
        'RBAC seed requires remediation of an existing mapping that conflicts with approved policy',
      );
    await manager.query(
      'INSERT INTO permissions (code) VALUES ($1) ON CONFLICT (code) DO NOTHING',
      [code],
    );
    for (const role of roles)
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
      const admin = readSeedAdminConfig(process.env);
      await database.initialize();
      await database.transaction(async (manager) => {
        await seedRbac(manager);
        await seedAdmin(manager, admin);
      });
      process.stdout.write('RBAC catalog and bootstrap administrator seeded successfully.\n');
    } catch (error) {
      process.stderr.write(`${describeSeedFailure(error)} No seed changes committed.\n`);
      process.exitCode = 1;
    } finally {
      if (database.isInitialized) await database.destroy();
    }
  })();
}
