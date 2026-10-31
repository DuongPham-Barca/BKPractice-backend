import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Lrn003CourseManagement1700000008000 implements MigrationInterface {
  name = 'Lrn003CourseManagement1700000008000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN "publish_status" varchar(20) NOT NULL DEFAULT 'DRAFT'`,
    );
    await queryRunner.query(
      `ALTER TABLE "courses" ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ADD COLUMN "deleted_at" timestamptz NULL`);
    await queryRunner.query(`ALTER TABLE "chapters" ADD COLUMN "description" text NULL`);

    await queryRunner.query(`
      CREATE TABLE "chapter_problems" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "chapter_id" uuid NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
        "problem_id" uuid NOT NULL,
        "display_order" integer NOT NULL DEFAULT 0
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "IDX_chapter_problems_chapter_display" ON "chapter_problems" ("chapter_id", "display_order")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_courses_published_created" ON "courses" ("publish_status", "created_at" DESC) WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chapters_course_display" ON "chapters" ("course_id", "display_order")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chapters_course_display"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_published_created"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chapter_problems_chapter_display"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chapter_problems"`);
    await queryRunner.query(`ALTER TABLE "chapters" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "deleted_at"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "updated_at"`);
    await queryRunner.query(`ALTER TABLE "courses" DROP COLUMN IF EXISTS "publish_status"`);
  }
}
