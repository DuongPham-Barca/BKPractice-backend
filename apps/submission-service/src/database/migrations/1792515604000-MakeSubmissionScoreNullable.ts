import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSubmissionScoreNullable1792515604000 implements MigrationInterface {
  name = 'MakeSubmissionScoreNullable1792515604000';

  // Existing 0 scores stay 0: they cannot be told apart from a real Judge score of 0.
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "score" DROP NOT NULL, ALTER COLUMN "score" DROP DEFAULT`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "submissions" SET "score" = 0 WHERE "score" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "submissions" ALTER COLUMN "score" SET DEFAULT 0, ALTER COLUMN "score" SET NOT NULL`,
    );
  }
}
