import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSystemAccount1700000000005 implements MigrationInterface {
  name = 'AddSystemAccount1700000000005';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      'ALTER TABLE users ADD COLUMN is_system_account boolean NOT NULL DEFAULT false',
    );
    await runner.query(
      'CREATE UNIQUE INDEX "UQ_users_system_account" ON users (is_system_account) WHERE is_system_account = true',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX "UQ_users_system_account"');
    await runner.query('ALTER TABLE users DROP COLUMN is_system_account');
  }
}
