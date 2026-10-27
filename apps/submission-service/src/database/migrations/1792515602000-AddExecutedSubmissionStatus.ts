import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExecutedSubmissionStatus1792515602000 implements MigrationInterface {
  name = 'AddExecutedSubmissionStatus1792515602000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "submissions_status_enum" ADD VALUE IF NOT EXISTS 'EXECUTED'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "submissions" WHERE "status" = 'EXECUTED') THEN
          RAISE EXCEPTION 'Cannot remove EXECUTED from submissions_status_enum while EXECUTED rows exist';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "submissions_status_enum" RENAME TO "submissions_status_enum_with_executed"`,
    );
    await queryRunner.query(
      `CREATE TYPE "submissions_status_enum" AS ENUM ('PENDING','QUEUED','RUNNING','ACCEPTED','WRONG_ANSWER','COMPILE_ERROR','RUNTIME_ERROR','TIME_LIMIT_EXCEEDED','MEMORY_LIMIT_EXCEEDED','INTERNAL_ERROR')`,
    );
    await queryRunner.query(`
      ALTER TABLE "submissions"
      ALTER COLUMN "status" TYPE "submissions_status_enum"
      USING "status"::text::"submissions_status_enum"
    `);
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "status" SET DEFAULT 'PENDING'`,
    );
    await queryRunner.query(`DROP TYPE "submissions_status_enum_with_executed"`);
  }
}
