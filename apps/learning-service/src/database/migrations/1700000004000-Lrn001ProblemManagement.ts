import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Lrn001ProblemManagement1700000004000 implements MigrationInterface {
  name = 'Lrn001ProblemManagement1700000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "problems" ADD "type_config" jsonb NULL`);
    await queryRunner.query(`ALTER TABLE "problems" ADD "deleted_at" timestamptz NULL`);

    await queryRunner.query(`ALTER TABLE "problems" ALTER COLUMN "publish_status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "problems_publish_status_enum" RENAME TO "problems_publish_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "problems_publish_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'ON_HOLD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems"
        ALTER COLUMN "publish_status" TYPE "problems_publish_status_enum"
        USING (
          CASE
            WHEN "publish_status"::text = 'ARCHIVED' THEN 'ON_HOLD'
            ELSE "publish_status"::text
          END
        )::"problems_publish_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" ALTER COLUMN "publish_status" SET DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(`DROP TYPE "problems_publish_status_enum_old"`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM "problems"
          WHERE "problem_type" NOT IN ('STANDARD', 'FUNCTION', 'OOP')
        ) THEN
          RAISE EXCEPTION 'problems.problem_type contains unsupported values';
        END IF;

        IF EXISTS (
          SELECT 1 FROM "problems"
          WHERE "time_limit_ms" < 1 OR "time_limit_ms" > 10000
             OR "memory_limit_mb" < 1 OR "memory_limit_mb" > 1024
        ) THEN
          RAISE EXCEPTION 'problems execution limits are outside the allowed range';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM "starter_codes"
          GROUP BY "problem_id", "language"
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'duplicate starter_codes (problem_id, language); resolve before migration';
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `ALTER TABLE "problems"
        ADD CONSTRAINT "ck_problems_problem_type"
        CHECK ("problem_type" IN ('STANDARD', 'FUNCTION', 'OOP'))`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems"
        ADD CONSTRAINT "ck_problems_time_limit_ms"
        CHECK ("time_limit_ms" BETWEEN 1 AND 10000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems"
        ADD CONSTRAINT "ck_problems_memory_limit_mb"
        CHECK ("memory_limit_mb" BETWEEN 1 AND 1024)`,
    );
    await queryRunner.query(
      `ALTER TABLE "starter_codes"
        ADD CONSTRAINT "uq_starter_codes_problem_language"
        UNIQUE ("problem_id", "language")`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_problems_published_created"
        ON "problems" ("publish_status", "created_at" DESC)
        WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_problems_published_type"
        ON "problems" ("publish_status", "problem_type")
        WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_problems_published_difficulty"
        ON "problems" ("publish_status", "difficulty")
        WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_problems_created_by"
        ON "problems" ("created_by")
        WHERE "deleted_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_problems_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_problems_published_difficulty"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_problems_published_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_problems_published_created"`);

    await queryRunner.query(
      `ALTER TABLE "starter_codes"
        DROP CONSTRAINT IF EXISTS "uq_starter_codes_problem_language"`,
    );

    await queryRunner.query(
      `ALTER TABLE "problems" DROP CONSTRAINT IF EXISTS "ck_problems_memory_limit_mb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" DROP CONSTRAINT IF EXISTS "ck_problems_time_limit_ms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" DROP CONSTRAINT IF EXISTS "ck_problems_problem_type"`,
    );

    await queryRunner.query(`ALTER TABLE "problems" ALTER COLUMN "publish_status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TYPE "problems_publish_status_enum" RENAME TO "problems_publish_status_enum_new"`,
    );
    await queryRunner.query(
      `CREATE TYPE "problems_publish_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems"
        ALTER COLUMN "publish_status" TYPE "problems_publish_status_enum"
        USING (
          CASE
            WHEN "publish_status"::text = 'ON_HOLD' THEN 'ARCHIVED'
            ELSE "publish_status"::text
          END
        )::"problems_publish_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "problems" ALTER COLUMN "publish_status" SET DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(`DROP TYPE "problems_publish_status_enum_new"`);

    await queryRunner.query(`ALTER TABLE "problems" DROP COLUMN "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "problems" DROP COLUMN "type_config"`);
  }
}
