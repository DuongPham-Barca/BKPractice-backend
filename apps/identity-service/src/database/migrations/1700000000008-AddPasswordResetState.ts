import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPasswordResetState1700000000008 implements MigrationInterface {
  name = 'AddPasswordResetState1700000000008';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE password_reset_challenges (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      otp_hash varchar(64),
      expires_at timestamptz NOT NULL,
      resend_at timestamptz NOT NULL,
      failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5)
    )`);
    await runner.query(
      'CREATE INDEX "IDX_password_reset_challenges_expires_at" ON password_reset_challenges (expires_at)',
    );
    await runner.query(`CREATE TABLE password_reset_grants (
      token_hash varchar(64) PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL
    )`);
    await runner.query(
      'CREATE INDEX "IDX_password_reset_grants_user_id" ON password_reset_grants (user_id)',
    );
    await runner.query(
      'CREATE INDEX "IDX_password_reset_grants_expires_at" ON password_reset_grants (expires_at)',
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP TABLE password_reset_grants');
    await runner.query('DROP TABLE password_reset_challenges');
  }
}
