import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Đưa schema Course về đúng plan LRN-003 (mục "Thay đổi cơ sở dữ liệu"): enum trạng thái, CHECK độ dài,
 * FK kép Chapter–Problem, FK `problem_id` RESTRICT, UNIQUE (course_id, problem_id) và các index.
 * Là migration mới (không sửa 1700000008000 đã chạy trên các môi trường dev).
 */
export class Lrn003CourseConstraints1700000009000 implements MigrationInterface {
  name = 'Lrn003CourseConstraints1700000009000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "courses_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'ON_HOLD')`,
    );
    await queryRunner.query(`ALTER TABLE "courses" RENAME COLUMN "publish_status" TO "status"`);
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "status" TYPE "courses_status_enum" USING "status"::"courses_status_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
    await queryRunner.query(
      `ALTER TABLE "courses" ADD CONSTRAINT "CHK_courses_description_length" CHECK ("description" IS NULL OR char_length("description") <= 20000)`,
    );

    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "CHK_chapters_description_length" CHECK ("description" IS NULL OR char_length("description") <= 5000)`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapters" ADD CONSTRAINT "UQ_chapters_id_course" UNIQUE ("id", "course_id")`,
    );

    await queryRunner.query(`ALTER TABLE "chapter_problems" ADD COLUMN "course_id" uuid`);
    await queryRunner.query(
      `UPDATE "chapter_problems" cp SET "course_id" = c."course_id" FROM "chapters" c WHERE c."id" = cp."chapter_id"`,
    );
    await queryRunner.query(`ALTER TABLE "chapter_problems" ALTER COLUMN "course_id" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" DROP CONSTRAINT "chapter_problems_chapter_id_fkey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" ADD CONSTRAINT "FK_chapter_problems_chapter_course" FOREIGN KEY ("chapter_id", "course_id") REFERENCES "chapters"("id", "course_id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" ADD CONSTRAINT "FK_chapter_problems_problem" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE RESTRICT`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" ADD CONSTRAINT "UQ_chapter_problems_course_problem" UNIQUE ("course_id", "problem_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_chapter_problems_problem" ON "chapter_problems" ("problem_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_courses_created_by" ON "courses" ("created_by") WHERE "deleted_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_courses_created_by"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_chapter_problems_problem"`);
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" DROP CONSTRAINT "UQ_chapter_problems_course_problem"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" DROP CONSTRAINT "FK_chapter_problems_problem"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" DROP CONSTRAINT "FK_chapter_problems_chapter_course"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chapter_problems" ADD CONSTRAINT "chapter_problems_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(`ALTER TABLE "chapter_problems" DROP COLUMN "course_id"`);

    await queryRunner.query(`ALTER TABLE "chapters" DROP CONSTRAINT "UQ_chapters_id_course"`);
    await queryRunner.query(
      `ALTER TABLE "chapters" DROP CONSTRAINT "CHK_chapters_description_length"`,
    );

    await queryRunner.query(
      `ALTER TABLE "courses" DROP CONSTRAINT "CHK_courses_description_length"`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "status" DROP DEFAULT`);
    await queryRunner.query(
      `ALTER TABLE "courses" ALTER COLUMN "status" TYPE varchar(20) USING "status"::text`,
    );
    await queryRunner.query(`ALTER TABLE "courses" ALTER COLUMN "status" SET DEFAULT 'DRAFT'`);
    await queryRunner.query(`ALTER TABLE "courses" RENAME COLUMN "status" TO "publish_status"`);
    await queryRunner.query(`DROP TYPE "courses_status_enum"`);
  }
}
