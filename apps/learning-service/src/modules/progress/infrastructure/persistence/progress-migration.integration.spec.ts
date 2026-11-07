import { randomUUID } from 'node:crypto';

import { Lrn006Progress1700000005000 } from '@learning/database/migrations/1700000005000-Lrn006Progress';
import { DataSource } from 'typeorm';

import {
  assertTestDatabase,
  learningDataSourceOptions,
  TEST_DATABASE_URL,
} from '@/modules/courses/testing';

assertTestDatabase();
const describeIntegration = TEST_DATABASE_URL ? describe : describe.skip;

describeIntegration('LRN-006 migration (isolated PostgreSQL transaction)', () => {
  let dataSource: DataSource;
  beforeAll(async () => {
    dataSource = new DataSource(learningDataSourceOptions());
    await dataSource.initialize();
    await dataSource.runMigrations();
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('checks legacy data, copies last event receipts and preserves progress across down/up', async () => {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    const migration = new Lrn006Progress1700000005000();
    const userId = randomUUID();
    const eventId = randomUUID();
    try {
      await migration.down(queryRunner);
      await queryRunner.query(
        `INSERT INTO progress (user_id, problem_id, status, best_score) VALUES ($1, $2, 'ATTEMPTED', -1)`,
        [userId, randomUUID()],
      );
      await expect(migration.up(queryRunner)).rejects.toThrow('Fix data before migration');
      await queryRunner.query('DELETE FROM progress WHERE user_id = $1', [userId]);
      await queryRunner.query(
        `INSERT INTO progress (user_id, problem_id, status, best_score, solved_at, last_event_id) VALUES ($1, $2, 'SOLVED', 90, '2026-01-01T00:00:00Z', $3)`,
        [userId, randomUUID(), eventId],
      );
      const before: unknown = await queryRunner.query('SELECT * FROM progress WHERE user_id = $1', [
        userId,
      ]);
      await migration.up(queryRunner);
      const receipts: unknown = await queryRunner.query(
        'SELECT event_id, user_id FROM progress_event_receipts WHERE event_id = $1',
        [eventId],
      );
      expect(receipts).toEqual([{ event_id: eventId, user_id: userId }]);
      for (const values of ["'ATTEMPTED', -1, NULL", "'SOLVED', 0, NULL"]) {
        await queryRunner.query('SAVEPOINT invalid_progress');
        await expect(
          queryRunner.query(
            `INSERT INTO progress (user_id, problem_id, status, best_score, solved_at) VALUES ($1, $2, ${values})`,
            [userId, randomUUID()],
          ),
        ).rejects.toThrow();
        await queryRunner.query('ROLLBACK TO SAVEPOINT invalid_progress');
      }
      await migration.down(queryRunner);
      expect(
        await queryRunner.query('SELECT * FROM progress WHERE user_id = $1', [userId]),
      ).toEqual(before);
      expect(
        await queryRunner.query("SELECT to_regclass('progress_event_receipts') AS receipt_table"),
      ).toEqual([{ receipt_table: null }]);
      await migration.up(queryRunner);
      expect(
        await queryRunner.query('SELECT * FROM progress WHERE user_id = $1', [userId]),
      ).toEqual(before);
    } finally {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
    }
  });
});
