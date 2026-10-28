import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSoftDeletion1700000000007 implements MigrationInterface {
  name = 'AddUserSoftDeletion1700000000007';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query('ALTER TABLE users ADD COLUMN deleted_at timestamptz NULL');
  }

  async down(runner: QueryRunner): Promise<void> {
    const deleted: unknown = await runner.query('SELECT 1 FROM users WHERE deleted_at IS NOT NULL LIMIT 1');
    if (Array.isArray(deleted) && deleted.length)
      throw new Error('User soft-deletion rollback requires remediation of deleted accounts');
    await runner.query('ALTER TABLE users DROP COLUMN deleted_at');
  }
}
