import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSubmissionSchema1700000001000 implements MigrationInterface {
  name = 'InitialSubmissionSchema1700000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE TYPE "submissions_kind_enum" AS ENUM ('RUN','SUBMIT')`);
    await queryRunner.query(
      `CREATE TYPE "submissions_status_enum" AS ENUM ('PENDING','QUEUED','RUNNING','ACCEPTED','WRONG_ANSWER','COMPILE_ERROR','RUNTIME_ERROR','TIME_LIMIT_EXCEEDED','MEMORY_LIMIT_EXCEEDED','INTERNAL_ERROR')`,
    );
    await queryRunner.query(
      `CREATE TABLE "submissions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "problem_id" uuid, "kind" "submissions_kind_enum" NOT NULL, "language" varchar(20) NOT NULL, "source_code" text NOT NULL, "status" "submissions_status_enum" NOT NULL DEFAULT 'PENDING', "score" integer NOT NULL DEFAULT 0, "passed_tests" integer, "total_tests" integer, "runtime_ms" integer, "memory_kb" integer, "accepted_event_id" uuid, "progress_event_published_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_submissions_user_id" ON "submissions" ("user_id")`);
    await queryRunner.query(
      `CREATE INDEX "IDX_submissions_problem_id" ON "submissions" ("problem_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "submission_results" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "submission_id" uuid NOT NULL UNIQUE REFERENCES "submissions"("id") ON DELETE CASCADE, "stdout" text, "stderr" text, "compile_output" text, "error" jsonb, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "submission_results"`);
    await queryRunner.query(`DROP TABLE "submissions"`);
    await queryRunner.query(`DROP TYPE "submissions_status_enum"`);
    await queryRunner.query(`DROP TYPE "submissions_kind_enum"`);
  }
}
