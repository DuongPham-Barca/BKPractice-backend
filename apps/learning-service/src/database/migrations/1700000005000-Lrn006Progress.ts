import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Lrn006Progress1700000005000 implements MigrationInterface {
  name = 'Lrn006Progress1700000005000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Pre-check: refuse to run if progress data violates CHECK constraints
    const invalidRows: unknown = await queryRunner.query(`
      SELECT id FROM "progress"
      WHERE "best_score" < 0
         OR ("status" = 'SOLVED' AND "solved_at" IS NULL)
    `);
    if (Array.isArray(invalidRows) && invalidRows.length > 0) {
      throw new Error(
        `Found ${invalidRows.length} progress row(s) with best_score < 0 or status='SOLVED' with solved_at IS NULL. Fix data before migration.`,
      );
    }

    // Tạo bảng biên nhận sự kiện
    await queryRunner.query(`
      CREATE TABLE "progress_event_receipts" (
        "event_id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "problem_id" uuid NOT NULL,
        "received_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Chép last_event_id đã áp dụng vào biên nhận để sự kiện cũ vẫn bị coi là trùng
    await queryRunner.query(`
      INSERT INTO "progress_event_receipts" ("event_id", "user_id", "problem_id", "received_at")
      SELECT "last_event_id", "user_id", "problem_id", "updated_at"
      FROM "progress"
      WHERE "last_event_id" IS NOT NULL
      ON CONFLICT ("event_id") DO NOTHING
    `);

    // Thêm CHECK constraints
    await queryRunner.query(
      `ALTER TABLE "progress" ADD CONSTRAINT "progress_best_score_non_negative_check" CHECK ("best_score" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "progress" ADD CONSTRAINT "progress_solved_requires_solved_at_check" CHECK (status <> 'SOLVED' OR "solved_at" IS NOT NULL)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Bỏ CHECK constraints
    await queryRunner.query(
      `ALTER TABLE "progress" DROP CONSTRAINT "progress_solved_requires_solved_at_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "progress" DROP CONSTRAINT "progress_best_score_non_negative_check"`,
    );

    // Bỏ bảng biên nhận
    await queryRunner.query(`DROP TABLE "progress_event_receipts"`);
  }
}
