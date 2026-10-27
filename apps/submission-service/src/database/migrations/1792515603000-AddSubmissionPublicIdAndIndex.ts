import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubmissionPublicIdAndIndex1792515603000 implements MigrationInterface {
  name = 'AddSubmissionPublicIdAndIndex1792515603000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD COLUMN "public_id" uuid DEFAULT gen_random_uuid()`,
    );
    await queryRunner.query(
      `UPDATE "submissions" SET "public_id" = gen_random_uuid() WHERE "public_id" IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE "submissions" ALTER COLUMN "public_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "submissions" ADD CONSTRAINT "UQ_submissions_public_id" UNIQUE ("public_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_submissions_owner_created" ON "submissions" ("user_id", "created_at" DESC, "public_id" DESC)`,
    );
  }

  // public_id stays: IDs already returned by the API must keep resolving after a rollback.
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_submissions_owner_created"`);
  }
}
