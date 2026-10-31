import { randomUUID } from 'node:crypto';

import type { BkRefreshClaims } from '@app/contracts';
import { DataSource } from 'typeorm';

import { AddUserSoftDeletion1700000000007 } from '@/database/migrations/1700000000007-AddUserSoftDeletion';
import type { PasswordHasher } from '@/modules/auth/application';
import { TypeormAuthAccountRepository } from '@/modules/auth/infrastructure/persistence/account.repository';
import { TypeormExternalIdentityRepository } from '@/modules/auth/infrastructure/persistence/external-identity.repository';
import { TypeormRefreshSessionRepository } from '@/modules/auth/infrastructure/persistence/refresh-session.repository';
import { identityEntities } from '@/modules/identity.entities';
import { TypeormProfileAccountContext, TypeormProfileRepository } from '@/modules/profiles/infrastructure/persistence';
import { TypeormUserManagementRepository } from '@/modules/users/infrastructure/persistence';
import { User } from '@/modules/users/infrastructure/persistence';

const databaseUrl = process.env.USER_MANAGEMENT_TEST_DATABASE_URL;
const testDatabase = databaseUrl ? new URL(databaseUrl) : null;
const isolated = testDatabase?.hostname === '127.0.0.1' &&
  testDatabase.port === '55432' && testDatabase.pathname === '/bkpractice_user_management_test_v06';

(isolated ? describe : describe.skip)('User management PostgreSQL integration', () => {
  let database: DataSource;
  const ids: string[] = [];

  beforeAll(async () => {
    database = new DataSource({
      type: 'postgres', url: databaseUrl, entities: identityEntities,
      migrations: ['apps/identity-service/src/database/migrations/*{.ts,.js}'], synchronize: false,
    });
    await database.initialize();
    await database.runMigrations();
  });

  afterAll(async () => {
    if (database?.isInitialized) {
      await database.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
      await database.destroy();
    }
  });

  async function createUser(name: string): Promise<string> {
    const userId = randomUUID();
    ids.push(userId);
    await database.query('INSERT INTO users (id, email, password_hash, display_name) VALUES ($1, $2, $3, $4)',
      [userId, `user-${userId}@example.test`, 'test-hash', name]);
    await database.query('INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)', [userId, name]);
    return userId;
  }

  it('adds and reverts the deletion marker without changing User rows', async () => {
    const migration = new AddUserSoftDeletion1700000000007();
    const runner = database.createQueryRunner();
    await runner.startTransaction();
    try {
      await migration.down(runner);
      expect(await runner.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at'")).toHaveLength(0);
      await migration.up(runner);
      expect(await runner.query("SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'deleted_at'")).toHaveLength(1);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('keeps deleted data and uniqueness, hides public/auth lookup, and revokes sessions', async () => {
    const userId = await createUser('Dũng Dương');
    await database.query('UPDATE users SET student_id = $2 WHERE id = $1', [userId, 'student-' + userId]);
    const users = new TypeormUserManagementRepository(database);
    const accounts = new TypeormAuthAccountRepository(database.getRepository(User));
    const profiles = new TypeormProfileRepository(database);
    const context = new TypeormProfileAccountContext(database);
    const hasher: PasswordHasher = {
      hash: async () => 'hash', verify: async () => true, verifyDummy: async () => undefined,
    };
    const sessions = new TypeormRefreshSessionRepository(database, hasher);
    const sid = randomUUID();
    const tokenId = randomUUID();
    const record = { userId, familyId: sid, tokenId, tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000) };
    await sessions.create(record);
    expect(await sessions.isActive(userId, sid)).toBe(true);
    await users.softDelete(userId);
    await users.softDelete(userId);
    const detail = await users.find(userId);
    expect(detail?.deletedAt).toBeInstanceOf(Date);
    expect(detail?.roles).toEqual([]);
    expect((await users.list(1, 50, false)).items.some((item) => item.userId === userId)).toBe(false);
    expect((await users.list(1, 50, true)).items.some((item) => item.userId === userId)).toBe(true);
    expect(await accounts.findById(userId)).toBeNull();
    expect(await accounts.findByIdentifier(`user-${userId}@example.test`)).toBeNull();
    expect(await new TypeormExternalIdentityRepository(database).resolveOrLink({
      tenantId: randomUUID(), objectId: randomUUID(), username: `user-${userId}@example.test`,
    })).toBeNull();
    expect(await context.findAccount(userId)).toBeNull();
    expect((await profiles.searchByDisplayName('Dũng', 1, 20)).items.some((item) => item.userId === userId)).toBe(false);
    expect(await sessions.isActive(userId, sid)).toBe(false);
    await expect(sessions.create({ ...record, familyId: randomUUID(), tokenId: randomUUID() })).rejects.toThrow();
    const claims = { sub: userId, fid: sid, jti: tokenId } as BkRefreshClaims;
    expect(await sessions.rotate(claims, 'raw', { ...record, tokenId: randomUUID() })).toBe(false);
    await expect(database.query('INSERT INTO users (email, password_hash) VALUES ($1, $2)',
      [`user-${userId}@example.test`, 'test-hash'])).rejects.toThrow();
    await expect(database.query('INSERT INTO users (email, password_hash, student_id) VALUES ($1, $2, $3)',
      [`other-${randomUUID()}@example.test`, 'test-hash', 'student-' + userId])).rejects.toThrow();
    expect(await database.query('SELECT id FROM profiles WHERE user_id = $1', [userId])).toHaveLength(1);
  });

  it('returns stable pages with only the approved projection', async () => {
    const older = await createUser('Older');
    const newer = await createUser('Newer');
    await database.query('UPDATE users SET created_at = $2 WHERE id = $1', [older, '2026-01-01']);
    await database.query('UPDATE users SET created_at = $2 WHERE id = $1', [newer, '2026-01-02']);
    const users = new TypeormUserManagementRepository(database);
    expect((await users.list(1, 1, false)).items.map((item) => item.userId)).toEqual([newer]);
    expect((await users.list(2, 1, false)).items.map((item) => item.userId)).toEqual([older]);
    expect((await users.list(1, 1, false)).hasMore).toBe(true);
    expect(Object.keys((await users.find(newer)) ?? {})).toEqual([
      'userId', 'studentId', 'email', 'displayName', 'status', 'roles', 'createdAt', 'deletedAt',
    ]);
  });

  it('serializes session creation with deletion so no session remains active', async () => {
    const userId = await createUser('Concurrent');
    const sessions = new TypeormRefreshSessionRepository(database, {
      hash: async () => 'hash', verify: async () => true, verifyDummy: async () => undefined,
    });
    const users = new TypeormUserManagementRepository(database);
    const sid = randomUUID();
    const [deletion] = await Promise.allSettled([
      users.softDelete(userId),
      sessions.create({ userId, familyId: sid, tokenId: randomUUID(), tokenHash: 'hash', expiresAt: new Date(Date.now() + 60_000) }),
    ]);
    expect(deletion.status).toBe('fulfilled');
    expect(await sessions.isActive(userId, sid)).toBe(false);
  });

  it('protects ADMIN and system accounts from deletion', async () => {
    const adminId = await createUser('Admin');
    const systemId = await createUser('System');
    await database.query('INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = $2', [adminId, 'ADMIN']);
    await database.query('UPDATE users SET is_system_account = true WHERE id = $1', [systemId]);
    const users = new TypeormUserManagementRepository(database);
    await expect(users.softDelete(adminId)).rejects.toThrow('forbidden');
    await expect(users.softDelete(systemId)).rejects.toThrow('forbidden');
    expect((await users.find(adminId))?.deletedAt).toBeNull();
    expect((await users.find(systemId))?.deletedAt).toBeNull();
  });
});
