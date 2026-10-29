import { createHash, randomUUID } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

import { AddPasswordResetState1700000000008 } from '@/database/migrations/1700000000008-AddPasswordResetState';
import { PasswordResetFailure } from '@/modules/auth/domain';
import { TypeormPasswordResetRepository } from '@/modules/auth/infrastructure/persistence';
import { Argon2PasswordHasher } from '@/modules/auth/infrastructure/security';
import { identityEntities } from '@/modules/identity.entities';

const testUrl = process.env.PASSWORD_RESET_TEST_DATABASE_URL;
const isolated = testUrl && new URL(testUrl).pathname.endsWith('_password_reset_test');

(isolated ? describe : describe.skip)('Password reset PostgreSQL integration', () => {
  let database: DataSource;
  let repository: TypeormPasswordResetRepository;
  const ids: string[] = [];
  const hasher = new Argon2PasswordHasher();

  beforeAll(async () => {
    database = new DataSource({
      type: 'postgres',
      url: testUrl,
      entities: identityEntities,
      migrations: ['apps/identity-service/src/database/migrations/*{.ts,.js}'],
      synchronize: false,
    });
    await database.initialize();
    await database.runMigrations();
    repository = new TypeormPasswordResetRepository(
      database,
      hasher,
      new ConfigService({ JWT_REFRESH_SECRET: 'r'.repeat(32) }),
    );
  });

  afterAll(async () => {
    if (database?.isInitialized) {
      await database.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [ids]);
      await database.destroy();
    }
  });

  async function createStudent() {
    const userId = randomUUID();
    const email = `student-${userId}@example.test`;
    ids.push(userId);
    await database.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [
      userId,
      email,
      await hasher.hash('old-password'),
    ]);
    await database.query(
      'INSERT INTO user_roles (user_id, role_id) SELECT $1, id FROM roles WHERE name = $2',
      [userId, 'STUDENT'],
    );
    return { userId, email };
  }

  it('migrates challenge and grant tables and can revert inside a test transaction', async () => {
    await repository.assertAvailable();
    const runner = database.createQueryRunner();
    await runner.startTransaction();
    try {
      const migration = new AddPasswordResetState1700000000008();
      await migration.down(runner);
      const missing: unknown = await runner.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_challenges'",
      );
      expect(missing).toHaveLength(0);
      await migration.up(runner);
      const restored: unknown = await runner.query(
        "SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_challenges'",
      );
      expect(restored).toHaveLength(1);
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('enforces resend delay and five wrong attempts, then issues a single-use grant', async () => {
    const { userId, email } = await createStudent();
    expect(await repository.issueOtp(userId, email.toUpperCase(), '123456')).toBe(true);
    expect(await repository.issueOtp(userId, email, '654321')).toBe(false);
    const rows: { otp_hash: string }[] = await database.query(
      'SELECT otp_hash FROM password_reset_challenges WHERE user_id = $1',
      [userId],
    );
    expect(rows.at(0)?.otp_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rows.at(0)?.otp_hash).not.toBe('123456');
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(await repository.verifyOtp(userId, email, '000000', randomUUID())).toBeNull();
    }
    expect(await repository.verifyOtp(userId, email, '123456', randomUUID())).toBeNull();
    await database.query(
      "UPDATE password_reset_challenges SET resend_at = now() - interval '1 second' WHERE user_id = $1",
      [userId],
    );
    expect(await repository.issueOtp(userId, email, '654321')).toBe(true);
    expect(await repository.verifyOtp(userId, email, '123456', randomUUID())).toBeNull();
    const token = randomUUID();
    expect(await repository.verifyOtp(userId, email, '654321', token)).toBe(userId);
    expect(await repository.verifyOtp(userId, email, '654321', randomUUID())).toBeNull();
    const grants: { token_hash: string }[] = await database.query(
      'SELECT token_hash FROM password_reset_grants WHERE user_id = $1',
      [userId],
    );
    expect(grants).toEqual([{ token_hash: createHash('sha256').update(token).digest('hex') }]);
  });

  it('serializes first send and concurrent verify for one User', async () => {
    const { userId, email } = await createStudent();
    const issued = await Promise.all([
      repository.issueOtp(userId, email, '123456'),
      repository.issueOtp(userId, email, '654321'),
    ]);
    expect([...issued].sort()).toEqual([false, true]);
    const otp = issued[0] ? '123456' : '654321';
    const verified = await Promise.all([
      repository.verifyOtp(userId, email, otp, randomUUID()),
      repository.verifyOtp(userId, email, otp, randomUUID()),
    ]);
    expect(verified.filter((result) => result === userId)).toHaveLength(1);
    expect(verified.filter((result) => result === null)).toHaveLength(1);
    const grants: unknown[] = await database.query(
      'SELECT 1 FROM password_reset_grants WHERE user_id = $1',
      [userId],
    );
    expect(grants).toHaveLength(1);
  });

  it('rejects an expired OTP and an expired grant even before cleanup', async () => {
    const { userId, email } = await createStudent();
    await repository.issueOtp(userId, email, '123456');
    await database.query(
      "UPDATE password_reset_challenges SET expires_at = now() - interval '1 second' WHERE user_id = $1",
      [userId],
    );
    expect(await repository.verifyOtp(userId, email, '123456', randomUUID())).toBeNull();
    const token = randomUUID();
    await database.query(
      "INSERT INTO password_reset_grants (token_hash, user_id, expires_at) VALUES ($1, $2, now() - interval '1 second')",
      [createHash('sha256').update(token).digest('hex'), userId],
    );
    expect(await repository.resetPasswordWithGrant(token, 'new-password')).toBe(false);
  });

  it('lets one concurrent reset change the hash and revoke sessions once', async () => {
    const { userId, email } = await createStudent();
    const token = randomUUID();
    const sessionId = randomUUID();
    await database.query(
      "INSERT INTO sessions (id, user_id, refresh_token_hash, client_type, expires_at) VALUES ($1, $2, 'hash', 'web', now() + interval '1 day')",
      [sessionId, userId],
    );
    await database.query(
      "INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at, family_id) VALUES ($1, $2, 'hash', now() + interval '1 day', $3)",
      [randomUUID(), userId, sessionId],
    );
    expect(await repository.issueOtp(userId, email, '123456')).toBe(true);
    expect(await repository.verifyOtp(userId, email, '123456', token)).toBe(userId);
    const results = await Promise.all([
      repository.resetPasswordWithGrant(token, 'new-password'),
      repository.resetPasswordWithGrant(token, 'new-password'),
    ]);
    expect(results.sort()).toEqual([false, true]);
    const rows: { password_hash: string }[] = await database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    );
    expect(await hasher.verify(rows.at(0)?.password_hash ?? '', 'new-password')).toBe(true);
    const sessions: { revoked_at: Date | null }[] = await database.query(
      'SELECT revoked_at FROM sessions WHERE id = $1',
      [sessionId],
    );
    const refresh: { revoked_at: Date | null }[] = await database.query(
      'SELECT revoked_at FROM refresh_tokens WHERE family_id = $1',
      [sessionId],
    );
    expect(sessions.at(0)?.revoked_at).toBeInstanceOf(Date);
    expect(refresh.at(0)?.revoked_at).toBeInstanceOf(Date);
    expect(await repository.resetPasswordWithGrant(token, 'another-password')).toBe(false);
  });

  it('keeps the grant and old password when hashing fails', async () => {
    const { userId } = await createStudent();
    const token = randomUUID();
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await database.query(
      "INSERT INTO password_reset_grants (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '5 minutes')",
      [tokenHash, userId],
    );
    const failing = new TypeormPasswordResetRepository(
      database,
      {
        hash: async () => {
          throw new Error('hash failed');
        },
        verify: async () => false,
        verifyDummy: async () => undefined,
      },
      new ConfigService({ JWT_REFRESH_SECRET: 'r'.repeat(32) }),
    );
    await expect(failing.resetPasswordWithGrant(token, 'new-password')).rejects.toEqual(
      new PasswordResetFailure('dependency_unavailable'),
    );
    const grants: unknown[] = await database.query(
      'SELECT 1 FROM password_reset_grants WHERE token_hash = $1',
      [tokenHash],
    );
    expect(grants).toHaveLength(1);
    const rows: { password_hash: string }[] = await database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    );
    expect(await hasher.verify(rows.at(0)?.password_hash ?? '', 'old-password')).toBe(true);
  });
});
