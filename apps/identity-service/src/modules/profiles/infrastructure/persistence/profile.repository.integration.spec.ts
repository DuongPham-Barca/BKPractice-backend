import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

import { AddProfileValidationConstraints1700000000002 } from '@/database/migrations/1700000000002-AddProfileValidationConstraints';
import { identityEntities } from '@/modules/identity.entities';
import { TypeormProfileRepository } from '@/modules/profiles/infrastructure/persistence/profile.repository';

const databaseUrl = process.env.PROFILE_TEST_DATABASE_URL;
const testDatabase = databaseUrl ? new URL(databaseUrl) : null;
const isolated =
  testDatabase?.hostname === '127.0.0.1' &&
  testDatabase.port === '55432' &&
  testDatabase.pathname === '/bkpractice_profile_test_v05';

(isolated ? describe : describe.skip)('Profile PostgreSQL integration', () => {
  let database: DataSource;

  beforeAll(async () => {
    database = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: identityEntities,
      migrations: ['apps/identity-service/src/database/migrations/*{.ts,.js}'],
      synchronize: false,
    });
    await database.initialize();
    await database.runMigrations();
  });

  afterAll(async () => {
    if (database?.isInitialized) await database.destroy();
  });

  async function createUser(): Promise<string> {
    const rows = await database.query<Array<{ id: string }>>(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id',
      [`profile-${randomUUID()}@example.test`, 'test-hash'],
    );
    if (!rows[0]) throw new Error('Test user was not created');
    return rows[0].id;
  }

  it('creates one Profile for concurrent first reads and preserves omitted fields', async () => {
    const userId = await createUser();
    const repository = new TypeormProfileRepository(database);
    const [first, second] = await Promise.all([
      repository.loadOrCreate(userId, 'Nguyễn An'),
      repository.loadOrCreate(userId, 'Nguyễn An'),
    ]);
    expect(first.profileId).toBe(second.profileId);
    expect(first.displayName).toBe('Nguyễn An');
    expect(
      await database.query('SELECT id FROM profiles WHERE user_id = $1', [userId]),
    ).toHaveLength(1);

    const updated = await repository.update(userId, null, { bio: 'Tiếng Việt' }, true);
    expect(updated.profile).toMatchObject({ displayName: 'Nguyễn An', bio: 'Tiếng Việt' });
    expect(updated.replacedAvatar).toBeNull();
    expect((await repository.loadOrCreate(userId, null)).profileId).toBe(first.profileId);
    expect((await repository.update(userId, null, { bio: null }, false)).profile.bio).toBeNull();
    await database.query('DELETE FROM users WHERE id = $1', [userId]);
    expect(await repository.find(userId)).toBeNull();
  });

  it('reverts and reapplies checks without rewriting invalid legacy avatars', async () => {
    const userId = await createUser();
    const repository = new TypeormProfileRepository(database);
    const profile = await repository.loadOrCreate(userId, 'Tên hợp lệ');
    const migration = new AddProfileValidationConstraints1700000000002();
    const runner = database.createQueryRunner();
    try {
      await migration.down(runner);
      await database.query('UPDATE profiles SET avatar_url = $1 WHERE id = $2', [
        'https://unapproved.example/avatar.png',
        profile.profileId,
      ]);
      await expect(migration.up(runner)).rejects.toThrow('remediation');
      expect(
        await database.query(
          "SELECT conname FROM pg_constraint WHERE conname = 'CHK_profiles_bio_length'",
        ),
      ).toHaveLength(0);
      await database.query('UPDATE profiles SET avatar_url = NULL WHERE id = $1', [
        profile.profileId,
      ]);
      await migration.up(runner);
      expect(
        await database.query(
          "SELECT conname FROM pg_constraint WHERE conname IN ('CHK_profiles_display_name', 'CHK_profiles_bio_length')",
        ),
      ).toHaveLength(2);
      await expect(
        database.query('UPDATE profiles SET bio = $1 WHERE id = $2', [
          'x'.repeat(1001),
          profile.profileId,
        ]),
      ).rejects.toThrow();
      expect((await repository.find(userId))?.bio).toBeNull();
    } finally {
      await runner.release();
    }
  });
});
