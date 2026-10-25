import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthSessions1700000000003 implements MigrationInterface {
  name = 'AddAuthSessions1700000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE sessions (
      id uuid PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      refresh_token_hash varchar(255) NOT NULL,
      client_type varchar(16) NOT NULL CHECK (client_type IN ('web', 'mobile')),
      device varchar(255),
      user_agent varchar(512),
      ip varchar(64),
      created_at timestamptz NOT NULL DEFAULT now(),
      last_used_at timestamptz,
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_user_id" ON sessions (user_id)`);
    await queryRunner.query(`INSERT INTO sessions
      (id, user_id, refresh_token_hash, client_type, created_at, last_used_at, expires_at, revoked_at)
      SELECT DISTINCT ON (family_id) family_id, user_id, token_hash, 'web', created_at,
        created_at, expires_at, revoked_at
      FROM refresh_tokens ORDER BY family_id, created_at DESC, id DESC`);
    await queryRunner.query(`ALTER TABLE refresh_tokens ADD CONSTRAINT "FK_refresh_tokens_session"
      FOREIGN KEY (family_id) REFERENCES sessions(id) ON DELETE CASCADE`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE refresh_tokens DROP CONSTRAINT "FK_refresh_tokens_session"`);
    await queryRunner.query(`DROP INDEX "IDX_sessions_user_id"`);
    await queryRunner.query(`DROP TABLE sessions`);
  }
}
