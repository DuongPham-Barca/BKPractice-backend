import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Lrn007RecommendationIndexes1700000006000 implements MigrationInterface {
  name = 'Lrn007RecommendationIndexes1700000006000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_problem_topics_topic_id" ON "problem_topics" ("topic_id")`,
    );
    await queryRunner.query(`CREATE INDEX "IDX_problem_tags_tag_id" ON "problem_tags" ("tag_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_tags_tag_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_topics_topic_id"`);
  }
}
