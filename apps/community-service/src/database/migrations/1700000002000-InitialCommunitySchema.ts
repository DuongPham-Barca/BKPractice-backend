import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCommunitySchema1700000002000 implements MigrationInterface {
  name = 'InitialCommunitySchema1700000002000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE TYPE "posts_scope_enum" AS ENUM ('GLOBAL','PROBLEM','COURSE')`);
    await queryRunner.query(`CREATE TYPE "reactions_type_enum" AS ENUM ('LIKE')`);
    await queryRunner.query(
      `CREATE TYPE "reports_status_enum" AS ENUM ('OPEN','REVIEWED','DISMISSED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "posts" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "author_id" uuid NOT NULL, "scope" "posts_scope_enum" NOT NULL, "content" text NOT NULL, "problem_id" uuid, "course_id" uuid, "is_pinned" boolean NOT NULL DEFAULT false, "is_hidden" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_posts_author_id" ON "posts" ("author_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_posts_problem_id" ON "posts" ("problem_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_posts_course_id" ON "posts" ("course_id")`);
    await queryRunner.query(
      `CREATE TABLE "comments" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE, "author_id" uuid NOT NULL, "parent_comment_id" uuid REFERENCES "comments"("id") ON DELETE CASCADE, "content" text NOT NULL, "is_hidden" boolean NOT NULL DEFAULT false, "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "reactions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE, "user_id" uuid NOT NULL, "type" "reactions_type_enum" NOT NULL DEFAULT 'LIKE', "created_at" timestamptz NOT NULL DEFAULT now(), UNIQUE ("post_id","user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "bookmarks" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE, "user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(), UNIQUE ("post_id","user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "reports" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE, "reporter_id" uuid NOT NULL, "reason" varchar(500) NOT NULL, "status" "reports_status_enum" NOT NULL DEFAULT 'OPEN', "reviewed_by" uuid, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reports"`);
    await queryRunner.query(`DROP TABLE "bookmarks"`);
    await queryRunner.query(`DROP TABLE "reactions"`);
    await queryRunner.query(`DROP TABLE "comments"`);
    await queryRunner.query(`DROP TABLE "posts"`);
    await queryRunner.query(`DROP TYPE "reports_status_enum"`);
    await queryRunner.query(`DROP TYPE "reactions_type_enum"`);
    await queryRunner.query(`DROP TYPE "posts_scope_enum"`);
  }
}
