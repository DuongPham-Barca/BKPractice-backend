import { randomUUID } from 'node:crypto';

import { DataSource } from 'typeorm';

import { AddProfileValidationConstraints1700000000002 } from '@/database/migrations/1700000000002-AddProfileValidationConstraints';
import { InitializeImportedProfiles1700000000006 } from '@/database/migrations/1700000000006-InitializeImportedProfiles';
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

  it('searches existing active public Profiles with literal wildcards and stable pages', async () => {
    const repository = new TypeormProfileRepository(database);
    const suffix = randomUUID().slice(0, 8);
    const ids: string[] = [];
    const createProfile = async (name: string): Promise<string> => {
      const id = await createUser();
      ids.push(id);
      await repository.loadOrCreate(id, name);
      return id;
    };
    try {
      const first = await createProfile(`Ánh-${suffix}`);
      const second = await createProfile(`Ánh-${suffix}`);
      const third = await createProfile(`ánh-${suffix} B`);
      const locked = await createProfile(`Ánh-${suffix} locked`);
      const pending = await createProfile(`Ánh-${suffix} pending`);
      const system = await createProfile(`Ánh-${suffix} system`);
      const missing = await createUser();
      ids.push(missing);
      await database.query('UPDATE users SET status = $2 WHERE id = $1', [locked, 'LOCKED']);
      await database.query('UPDATE users SET status = $2 WHERE id = $1', [pending, 'PENDING']);
      await database.query('UPDATE users SET is_system_account = true WHERE id = $1', [system]);
      await database.query('UPDATE profiles SET bio = $2 WHERE user_id = $1', [first, 'private bio']);

      const expected = [first, second].sort();
      expect(await repository.searchByDisplayName(`áNh-${suffix}`, 1, 2)).toEqual({
        items: expected.map((userId) => ({ userId, displayName: `Ánh-${suffix}`, avatarReference: null })),
        hasMore: true,
      });
      expect(await repository.searchByDisplayName(`áNh-${suffix}`, 2, 2)).toEqual({
        items: [{ userId: third, displayName: `ánh-${suffix} B`, avatarReference: null }],
        hasMore: false,
      });
      expect((await repository.searchByDisplayName(`anh-${suffix}`, 1, 20)).items).toEqual([]);

      const literal = await createProfile(`Nhóm_%${suffix}`);
      await createProfile(`Nhómxx${suffix}`);
      expect(await repository.searchByDisplayName(`_%${suffix}`, 1, 20)).toEqual({
        items: [{ userId: literal, displayName: `Nhóm_%${suffix}`, avatarReference: null }],
        hasMore: false,
      });
    } finally {
      await database.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
    }
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

  it('backfills missing Profiles from existing User names without replacing customized Profiles', async () => {
    const migration = new InitializeImportedProfiles1700000000006();
    const runner = database.createQueryRunner();
    await runner.startTransaction();
    try {
      await migration.down(runner);
      const missingId = randomUUID();
      const customizedId = randomUUID();
      await runner.query(
        'INSERT INTO users (id, email, password_hash, official_name) VALUES ($1, $2, $3, $4), ($5, $6, $7, $8)',
        [
          missingId,
          `profile-${missingId}@example.test`,
          'test-hash',
          '  Tên ban đầu  ',
          customizedId,
          `profile-${customizedId}@example.test`,
          'test-hash',
          'Tên gốc',
        ],
      );
      await runner.query('INSERT INTO profiles (user_id, display_name) VALUES ($1, $2)', [
        customizedId,
        'Tên đã sửa',
      ]);
      await migration.up(runner);
      const profiles = await runner.manager.query<Array<{ user_id: string; display_name: string }>>(
        'SELECT user_id, display_name FROM profiles WHERE user_id IN ($1, $2) ORDER BY user_id',
        [missingId, customizedId],
      );
      expect(profiles).toHaveLength(2);
      expect(profiles.find((profile) => profile.user_id === missingId)?.display_name).toBe(
        'Tên ban đầu',
      );
      expect(profiles.find((profile) => profile.user_id === customizedId)?.display_name).toBe(
        'Tên đã sửa',
      );
      expect(
        await runner.query('SELECT display_name FROM users WHERE id = $1', [missingId]),
      ).toMatchObject([{ display_name: '  Tên ban đầu  ' }]);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
