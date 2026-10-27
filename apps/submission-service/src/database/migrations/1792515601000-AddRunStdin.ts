import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRunStdin1792515601000 implements MigrationInterface {
  name = 'AddRunStdin1792515601000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "submissions" ADD COLUMN "stdin" text NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "submissions" DROP COLUMN "stdin"`);
  }
}
