import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Removes the classroom workflows retired by LRN-008. Applying this migration deletes their data. */
export class Lrn008SelfStudy1700000010000 implements MigrationInterface {
  name = 'Lrn008SelfStudy1700000010000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "assignment_problems"');
    await queryRunner.query('DROP TABLE "assignments"');
    await queryRunner.query('DROP TABLE "enrollments"');
    await queryRunner.query('DROP TABLE "classes"');
    await queryRunner.query('DROP TYPE "classes_status_enum"');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // The schema can be restored, but rows removed by up() cannot be recovered.
    await queryRunner.query(`CREATE TYPE "classes_status_enum" AS ENUM ('ACTIVE', 'ARCHIVED')`);
    await queryRunner.query(`
      CREATE TABLE "classes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "course_id" uuid NOT NULL,
        "join_code" varchar(32) NOT NULL UNIQUE,
        "name" varchar(120) NOT NULL,
        "lecturer_id" uuid NOT NULL,
        "status" "classes_status_enum" NOT NULL DEFAULT 'ACTIVE',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        "archived_at" timestamptz,
        CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT,
        CONSTRAINT "classes_status_archived_at_check" CHECK ((status = 'ARCHIVED') = (archived_at IS NOT NULL))
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_classes_lecturer_id_created_at" ON "classes" ("lecturer_id", "created_at")',
    );
    await queryRunner.query(`
      CREATE TABLE "enrollments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "class_id" uuid NOT NULL REFERENCES "classes"("id") ON DELETE CASCADE,
        "student_id" uuid NOT NULL,
        "enrolled_at" timestamptz NOT NULL DEFAULT now(),
        UNIQUE ("class_id", "student_id")
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "IDX_enrollments_student_id_enrolled_at" ON "enrollments" ("student_id", "enrolled_at")',
    );
    await queryRunner.query(`
      CREATE TABLE "assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(200) NOT NULL,
        "course_id" uuid REFERENCES "courses"("id") ON DELETE SET NULL,
        "class_id" uuid REFERENCES "classes"("id") ON DELETE CASCADE,
        "lecturer_id" uuid NOT NULL,
        "starts_at" timestamptz,
        "deadline_at" timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "assignment_problems" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "assignment_id" uuid NOT NULL REFERENCES "assignments"("id") ON DELETE CASCADE,
        "problem_id" uuid NOT NULL REFERENCES "problems"("id") ON DELETE CASCADE,
        "max_score" integer NOT NULL DEFAULT 100,
        "display_order" integer NOT NULL DEFAULT 0,
        UNIQUE ("assignment_id", "problem_id")
      )
    `);
  }
}
