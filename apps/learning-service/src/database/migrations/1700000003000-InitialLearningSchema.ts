import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialLearningSchema1700000003000 implements MigrationInterface {
  name = 'InitialLearningSchema1700000003000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(
      `CREATE TYPE "problems_difficulty_enum" AS ENUM ('EASY','MEDIUM','HARD')`,
    );
    await queryRunner.query(
      `CREATE TYPE "problems_publish_status_enum" AS ENUM ('DRAFT','PUBLISHED','ARCHIVED')`,
    );
    await queryRunner.query(`CREATE TYPE "progress_status_enum" AS ENUM ('ATTEMPTED','SOLVED')`);
    await queryRunner.query(
      `CREATE TABLE "topics" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(80) NOT NULL UNIQUE)`,
    );
    await queryRunner.query(
      `CREATE TABLE "tags" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" varchar(80) NOT NULL UNIQUE)`,
    );
    await queryRunner.query(
      `CREATE TABLE "problems" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(200) NOT NULL, "slug" varchar(220) NOT NULL UNIQUE, "description" text NOT NULL, "problem_type" varchar(20) NOT NULL, "difficulty" "problems_difficulty_enum" NOT NULL, "input_specification" text, "output_specification" text, "examples" jsonb NOT NULL DEFAULT '[]'::jsonb, "constraints" text, "time_limit_ms" integer NOT NULL DEFAULT 1000, "memory_limit_mb" integer NOT NULL DEFAULT 256, "publish_status" "problems_publish_status_enum" NOT NULL DEFAULT 'DRAFT', "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "test_cases" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE, "input" text NOT NULL DEFAULT '', "expected_output" text NOT NULL, "is_hidden" boolean NOT NULL DEFAULT true, "score" integer NOT NULL DEFAULT 1, "display_order" integer NOT NULL DEFAULT 0)`,
    );
    await queryRunner.query(
      `CREATE TABLE "starter_codes" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE, "language" varchar(20) NOT NULL, "source_code" text NOT NULL, "hidden_harness" text)`,
    );
    await queryRunner.query(
      `CREATE TABLE "problem_languages" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE, "language" varchar(20) NOT NULL, "enabled" boolean NOT NULL DEFAULT true, UNIQUE ("problem_id","language"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "problem_topics" ("problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE, "topic_id" uuid NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE, PRIMARY KEY ("problem_id","topic_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "problem_tags" ("problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE, "tag_id" uuid NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE, PRIMARY KEY ("problem_id","tag_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "courses" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(200) NOT NULL, "slug" varchar(220) NOT NULL UNIQUE, "description" text, "created_by" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "chapters" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE, "title" varchar(200) NOT NULL, "display_order" integer NOT NULL DEFAULT 0)`,
    );
    await queryRunner.query(
      `CREATE TABLE "classes" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE, "join_code" varchar(32) NOT NULL UNIQUE, "name" varchar(120) NOT NULL, "lecturer_id" uuid NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE "enrollments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE, "student_id" uuid NOT NULL, "enrolled_at" timestamptz NOT NULL DEFAULT now(), UNIQUE ("class_id","student_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "assignments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "title" varchar(200) NOT NULL, "course_id" uuid REFERENCES "courses"("id") ON DELETE SET NULL, "class_id" uuid REFERENCES "classes"("id") ON DELETE CASCADE, "lecturer_id" uuid NOT NULL, "starts_at" timestamptz, "deadline_at" timestamptz)`,
    );
    await queryRunner.query(
      `CREATE TABLE "assignment_problems" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "assignment_id" uuid NOT NULL REFERENCES "assignments"("id") ON DELETE CASCADE, "problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE, "max_score" integer NOT NULL DEFAULT 100, "display_order" integer NOT NULL DEFAULT 0, UNIQUE ("assignment_id","problem_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "progress" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL, "problem_id" uuid NOT NULL, "status" "progress_status_enum" NOT NULL, "best_score" integer NOT NULL DEFAULT 0, "solved_at" timestamptz, "last_event_id" uuid, "updated_at" timestamptz NOT NULL DEFAULT now(), UNIQUE ("user_id","problem_id"))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'progress',
      'assignment_problems',
      'assignments',
      'enrollments',
      'classes',
      'chapters',
      'courses',
      'problem_tags',
      'problem_topics',
      'problem_languages',
      'starter_codes',
      'test_cases',
      'problems',
      'tags',
      'topics',
    ]) {
      await queryRunner.query(`DROP TABLE "${table}"`);
    }
    await queryRunner.query(`DROP TYPE "progress_status_enum"`);
    await queryRunner.query(`DROP TYPE "problems_publish_status_enum"`);
    await queryRunner.query(`DROP TYPE "problems_difficulty_enum"`);
  }
}
