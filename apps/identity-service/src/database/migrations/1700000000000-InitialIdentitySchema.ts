import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialIdentitySchema1700000000000 implements MigrationInterface {
  name = 'InitialIdentitySchema1700000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    await queryRunner.query(`CREATE TYPE "roles_name_enum" AS ENUM ('STUDENT','LECTURER','ADMIN')`);
    await queryRunner.query(
      `CREATE TYPE "users_status_enum" AS ENUM ('ACTIVE','LOCKED','PENDING')`,
    );
    await queryRunner.query(
      `CREATE TABLE "permissions" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "code" varchar(100) NOT NULL UNIQUE, "description" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE TABLE "roles" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "name" "roles_name_enum" NOT NULL UNIQUE, "description" varchar(255))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "email" varchar(320) NOT NULL UNIQUE, "password_hash" varchar(255) NOT NULL, "status" "users_status_enum" NOT NULL DEFAULT 'ACTIVE', "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE TABLE "profiles" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE, "display_name" varchar(100) NOT NULL, "avatar_url" varchar(500), "bio" text)`,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "token_id" uuid NOT NULL UNIQUE, "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "token_hash" varchar(255) NOT NULL, "expires_at" timestamptz NOT NULL, "revoked_at" timestamptz, "created_at" timestamptz NOT NULL DEFAULT now())`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_refresh_tokens_user_id" ON "refresh_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE TABLE "user_roles" ("user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE, "role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE, PRIMARY KEY ("user_id","role_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("role_id" uuid NOT NULL REFERENCES "roles"("id") ON DELETE CASCADE, "permission_id" uuid NOT NULL REFERENCES "permissions"("id") ON DELETE CASCADE, PRIMARY KEY ("role_id","permission_id"))`,
    );
    await queryRunner.query(
      `INSERT INTO "roles" ("name", "description") VALUES ('STUDENT','Default student role'), ('LECTURER','Lecturer role'), ('ADMIN','Platform administrator')`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(`DROP TABLE "user_roles"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "permissions"`);
    await queryRunner.query(`DROP TYPE "users_status_enum"`);
    await queryRunner.query(`DROP TYPE "roles_name_enum"`);
  }
}
