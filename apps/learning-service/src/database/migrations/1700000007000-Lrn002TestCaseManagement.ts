import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Lrn002TestCaseManagement1700000007000 implements MigrationInterface {
  name = 'Lrn002TestCaseManagement1700000007000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "test_cases"
        ADD CONSTRAINT "ck_test_cases_score_nonnegative"
        CHECK ("score" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_cases"
        ADD CONSTRAINT "ck_test_cases_display_order_nonnegative"
        CHECK ("display_order" >= 0)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_test_cases_problem_display_order"
        ON "test_cases" ("problem_id", "display_order")`,
    );

    await queryRunner.query(`
      CREATE TABLE "problem_harnesses" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE,
        "language" varchar(20) NOT NULL,
        "source" text NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_problem_harnesses_problem_language" UNIQUE ("problem_id", "language")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "problem_harnesses" ("problem_id", "language", "source")
      SELECT "problem_id", "language", "hidden_harness"
      FROM "starter_codes"
      WHERE "hidden_harness" IS NOT NULL
        AND btrim("hidden_harness") <> ''
    `);

    await queryRunner.query(`ALTER TABLE "starter_codes" DROP COLUMN "hidden_harness"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "starter_codes" ADD "hidden_harness" text NULL`);

    await queryRunner.query(`
      UPDATE "starter_codes" AS "starter"
      SET "hidden_harness" = "harness"."source"
      FROM "problem_harnesses" AS "harness"
      WHERE "harness"."problem_id" = "starter"."problem_id"
        AND "harness"."language" = "starter"."language"
    `);

    await queryRunner.query(`DROP TABLE "problem_harnesses"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_test_cases_problem_display_order"`);
    await queryRunner.query(
      `ALTER TABLE "test_cases"
        DROP CONSTRAINT IF EXISTS "ck_test_cases_display_order_nonnegative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_cases"
        DROP CONSTRAINT IF EXISTS "ck_test_cases_score_nonnegative"`,
    );
  }
}
