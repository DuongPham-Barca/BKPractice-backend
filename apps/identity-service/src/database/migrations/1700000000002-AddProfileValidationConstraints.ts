import type { MigrationInterface, QueryRunner } from 'typeorm';

const avatarPattern =
  '^avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-[0-9a-f]{32}$';

export class AddProfileValidationConstraints1700000000002 implements MigrationInterface {
  name = 'AddProfileValidationConstraints1700000000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    const invalid = (await queryRunner.query(
      `SELECT id FROM profiles WHERE display_name = '' OR display_name <> btrim(display_name, E' \\t\\n\\r\\f\\v') OR char_length(bio) > 1000 OR (avatar_url IS NOT NULL AND avatar_url !~ $1) LIMIT 1`,
      [avatarPattern],
    )) as unknown;
    if (Array.isArray(invalid) && invalid.length) {
      throw new Error(
        'Profile migration requires remediation of invalid display_name, bio, or legacy avatar_url values',
      );
    }
    await queryRunner.query(
      `ALTER TABLE profiles ADD CONSTRAINT "CHK_profiles_display_name" CHECK (display_name <> '' AND display_name = btrim(display_name, E' \\t\\n\\r\\f\\v'))`,
    );
    await queryRunner.query(
      `ALTER TABLE profiles ADD CONSTRAINT "CHK_profiles_bio_length" CHECK (bio IS NULL OR char_length(bio) <= 1000)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE profiles DROP CONSTRAINT "CHK_profiles_bio_length"`);
    await queryRunner.query(`ALTER TABLE profiles DROP CONSTRAINT "CHK_profiles_display_name"`);
  }
}
