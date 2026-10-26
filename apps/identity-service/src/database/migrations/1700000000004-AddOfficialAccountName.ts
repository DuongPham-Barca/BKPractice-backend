import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOfficialAccountName1700000000004 implements MigrationInterface {
  name = 'AddOfficialAccountName1700000000004';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users ADD COLUMN official_name varchar(100)');
    await runner.query(`ALTER TABLE users ADD CONSTRAINT "CHK_users_official_name"
      CHECK (official_name IS NULL OR LENGTH(BTRIM(official_name)) BETWEEN 1 AND 100)`);
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users DROP COLUMN official_name');
  }
}
