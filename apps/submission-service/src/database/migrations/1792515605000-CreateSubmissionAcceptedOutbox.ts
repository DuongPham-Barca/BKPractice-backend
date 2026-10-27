import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubmissionAcceptedOutbox1792515605000 implements MigrationInterface {
  name = 'CreateSubmissionAcceptedOutbox1792515605000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "submission_accepted_outbox" (
        "event_id" uuid NOT NULL,
        "submission_id" uuid NOT NULL,
        "payload" jsonb NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "published_at" timestamptz NULL,
        CONSTRAINT "PK_submission_accepted_outbox" PRIMARY KEY ("event_id"),
        CONSTRAINT "UQ_submission_accepted_outbox_submission" UNIQUE ("submission_id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_submission_accepted_outbox_pending"
      ON "submission_accepted_outbox" ("created_at")
      WHERE "published_at" IS NULL
    `);
    // Accepted submissions whose event the old consumer never confirmed must not be lost.
    await queryRunner.query(`
      INSERT INTO "submission_accepted_outbox" ("event_id", "submission_id", "payload")
      SELECT "accepted_event_id", "id", jsonb_build_object(
        'eventId', "accepted_event_id",
        'occurredAt', to_char("updated_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'submissionId', "id",
        'userId', "user_id",
        'problemId', "problem_id",
        'score', 100
      )
      FROM "submissions"
      WHERE "kind" = 'SUBMIT'
        AND "status" = 'ACCEPTED'
        AND "problem_id" IS NOT NULL
        AND "accepted_event_id" IS NOT NULL
        AND "progress_event_published_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM "submission_accepted_outbox" WHERE "published_at" IS NULL) THEN
          RAISE EXCEPTION 'Cannot drop submission_accepted_outbox while undelivered events exist';
        END IF;
      END
      $$
    `);
    await queryRunner.query(`DROP TABLE "submission_accepted_outbox"`);
  }
}
