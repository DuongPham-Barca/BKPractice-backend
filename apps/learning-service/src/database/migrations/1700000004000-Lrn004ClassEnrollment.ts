import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Lrn004ClassEnrollment1700000004000 implements MigrationInterface {
  name = 'Lrn004ClassEnrollment1700000004000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo enum trạng thái lớp
    await queryRunner.query(`CREATE TYPE "classes_status_enum" AS ENUM ('ACTIVE', 'ARCHIVED')`);

    // Thêm cột trạng thái và mốc thời gian vào classes
    await queryRunner.query(
      `ALTER TABLE "classes" ADD COLUMN "status" "classes_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
    await queryRunner.query(
      `ALTER TABLE "classes" ADD COLUMN "created_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "classes" ADD COLUMN "updated_at" timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "classes" ADD COLUMN "archived_at" timestamptz`);

    // Ràng buộc: ARCHIVED <=> archived_at không null
    await queryRunner.query(
      `ALTER TABLE "classes" ADD CONSTRAINT "classes_status_archived_at_check" CHECK ((status = 'ARCHIVED') = (archived_at IS NOT NULL))`,
    );

    // Đổi khoá ngoại course_id từ CASCADE sang RESTRICT (FR-019)
    await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "classes_course_id_fkey"`);
    await queryRunner.query(
      `ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT`,
    );

    // Index
    await queryRunner.query(
      `CREATE INDEX "IDX_classes_lecturer_id_created_at" ON "classes" ("lecturer_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_enrollments_student_id_enrolled_at" ON "enrollments" ("student_id", "enrolled_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Bỏ index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_enrollments_student_id_enrolled_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_classes_lecturer_id_created_at"`);

    // Khôi phục khoá ngoại về CASCADE
    await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "classes_course_id_fkey"`);
    await queryRunner.query(
      `ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE`,
    );

    // Bỏ CHECK và các cột mới
    await queryRunner.query(
      `ALTER TABLE "classes" DROP CONSTRAINT "classes_status_archived_at_check"`,
    );
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "archived_at"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "updated_at"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "created_at"`);
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "status"`);

    // Bỏ enum
    await queryRunner.query(`DROP TYPE "classes_status_enum"`);
  }
}
