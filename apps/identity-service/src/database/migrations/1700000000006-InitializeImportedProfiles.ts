import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitializeImportedProfiles1700000000006 implements MigrationInterface {
  name = 'InitializeImportedProfiles1700000000006';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users RENAME COLUMN official_name TO display_name');
    await runner.query(
      'ALTER TABLE users RENAME CONSTRAINT "CHK_users_official_name" TO "CHK_users_display_name"',
    );
    await runner.query(`
      WITH candidates AS (
        SELECT id, BTRIM(display_name, ' ' || CHR(9) || CHR(10) || CHR(11) || CHR(12) || CHR(13)) AS name
        FROM users
        WHERE is_system_account = false AND display_name IS NOT NULL
      )
      INSERT INTO profiles (user_id, display_name, avatar_url, bio)
      SELECT id, name, NULL, NULL FROM candidates
      WHERE LENGTH(name) BETWEEN 1 AND 100
      ON CONFLICT (user_id) DO NOTHING
    `);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE users RENAME CONSTRAINT "CHK_users_display_name" TO "CHK_users_official_name"',
    );
    await runner.query('ALTER TABLE users RENAME COLUMN display_name TO official_name');
  }
}
