import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentMicrosoftAuthentication1700000000001 implements MigrationInterface {
  name = 'AddStudentMicrosoftAuthentication1700000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = (await queryRunner.query(
      `SELECT LOWER(BTRIM(email)) FROM users GROUP BY LOWER(BTRIM(email)) HAVING COUNT(*) > 1 LIMIT 1`,
    )) as unknown;
    if (Array.isArray(duplicates) && duplicates.length) {
      throw new Error(
        'Identity migration requires unique school email values ignoring case and surrounding whitespace',
      );
    }
    await queryRunner.query(`ALTER TABLE users ADD COLUMN student_id varchar(64)`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_student_id" ON users (student_id) WHERE student_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_users_email_ci" ON users (LOWER(BTRIM(email)))`,
    );
    await queryRunner.query(`CREATE TABLE external_identities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider varchar(32) NOT NULL CHECK (provider = 'MICROSOFT'),
      provider_tenant_id varchar(64) NOT NULL,
      provider_subject_id varchar(128) NOT NULL,
      provider_username_at_link varchar(320) NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT "UQ_external_identity_subject" UNIQUE (provider, provider_tenant_id, provider_subject_id),
      CONSTRAINT "UQ_external_identity_user_provider" UNIQUE (user_id, provider)
    )`);
    await queryRunner.query(
      `CREATE INDEX "IDX_external_identities_user_id" ON external_identities (user_id)`,
    );
    await queryRunner.query(`ALTER TABLE refresh_tokens ADD COLUMN family_id uuid`);
    await queryRunner.query(`ALTER TABLE refresh_tokens ADD COLUMN replaced_by_token_id uuid`);
    await queryRunner.query(`UPDATE refresh_tokens SET family_id = gen_random_uuid()`);
    await queryRunner.query(`ALTER TABLE refresh_tokens ALTER COLUMN family_id SET NOT NULL`);
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_family_id" ON refresh_tokens (family_id)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_family_id"`);
    await queryRunner.query(`ALTER TABLE refresh_tokens DROP COLUMN replaced_by_token_id`);
    await queryRunner.query(`ALTER TABLE refresh_tokens DROP COLUMN family_id`);
    await queryRunner.query(`DROP INDEX "IDX_external_identities_user_id"`);
    await queryRunner.query(`DROP TABLE external_identities`);
    await queryRunner.query(`DROP INDEX "UQ_users_email_ci"`);
    await queryRunner.query(`DROP INDEX "UQ_users_student_id"`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN student_id`);
  }
}
