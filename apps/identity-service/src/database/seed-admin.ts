import * as argon2 from 'argon2';
import type { EntityManager } from 'typeorm';

interface SeedAdminConfig {
  loginId: string;
  email: string;
  password: string;
}

export function readSeedAdminConfig(environment: NodeJS.ProcessEnv): SeedAdminConfig {
  const loginId = environment.SEED_ADMIN_LOGIN_ID?.trim();
  const email = environment.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = environment.SEED_ADMIN_PASSWORD;
  if (!loginId || loginId.length > 64 || /\s/.test(loginId))
    throw new Error('Invalid SEED_ADMIN_LOGIN_ID');
  if (!email || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error('Invalid SEED_ADMIN_EMAIL');
  if (!password || password.length > 128) throw new Error('Invalid SEED_ADMIN_PASSWORD');
  return { loginId, email, password };
}

export async function seedAdmin(manager: EntityManager, config: SeedAdminConfig): Promise<void> {
  const existing: {
    id: string;
    student_id: string | null;
    email: string;
    is_system_account: boolean;
  }[] = await manager.query(
    `SELECT id, student_id, email, is_system_account FROM users
       WHERE is_system_account = true OR student_id = $1 OR LOWER(BTRIM(email)) = $2 FOR UPDATE`,
    [config.loginId, config.email],
  );
  if (existing.length) {
    const account = existing[0];
    if (
      existing.length !== 1 ||
      !account?.is_system_account ||
      account.student_id !== config.loginId ||
      account.email.trim().toLowerCase() !== config.email
    )
      throw new Error('Bootstrap administrator conflicts with an existing account');
    const roles: { name: string }[] = await manager.query(
      `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = $1`,
      [account.id],
    );
    if (roles.length !== 1 || roles[0]!.name !== 'ADMIN')
      throw new Error('Bootstrap administrator role requires remediation');
    return;
  }

  const created: { id: string }[] = await manager.query(
    `INSERT INTO users (student_id, email, password_hash, status, is_system_account)
     VALUES ($1, $2, $3, 'ACTIVE', true) RETURNING id`,
    [config.loginId, config.email, await argon2.hash(config.password)],
  );
  if (created.length !== 1) throw new Error('Bootstrap administrator creation failed');
  const assigned: { role_id: string }[] = await manager.query(
    `INSERT INTO user_roles (user_id, role_id)
     SELECT $1, id FROM roles WHERE name = 'ADMIN' RETURNING role_id`,
    [created[0]!.id],
  );
  if (assigned.length !== 1) throw new Error('Missing administrator role');
}
