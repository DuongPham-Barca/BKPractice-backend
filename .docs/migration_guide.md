# Migration Guide

Hướng dẫn chi tiết về cách viết các loại migrations trong UC Talent Backend.

## 📋 Mục lục

1. [Tạo bảng mới](#tạo-bảng-mới)
2. [Thêm cột vào bảng có sẵn](#thêm-cột-vào-bảng-có-sẵn)
3. [Thêm index](#thêm-index)
4. [Xóa bảng](#xóa-bảng)
5. [Xóa cột](#xóa-cột)
6. [Thay đổi dữ liệu (Data migration)](#thay-đổi-dữ-liệu-data-migration)

---

## Tạo bảng mới

### Generic Example: Tạo bảng users

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table } from 'typeorm';

export class CreateUsers1700000000010 implements MigrationInterface {
  name = 'CreateUsers1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'email',
            type: 'varchar',
            isUnique: true,
          },
          {
            name: 'first_name',
            type: 'varchar',
          },
          {
            name: 'last_name',
            type: 'varchar',
          },
          {
            name: 'phone',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }
}
```

### Specific Example: Tạo bảng jobs với foreign keys và enum

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateJobs1700000000008 implements MigrationInterface {
  name = 'CreateJobs1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo enum type trước
    await queryRunner.query(`
      CREATE TYPE "public"."job_status_enum" AS ENUM('pending_to_review', 'published', 'closed', 'expired')
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."location_type_enum" AS ENUM('remote', 'on_site', 'hybrid')
    `);

    // Tạo bảng jobs
    await queryRunner.createTable(
      new Table({
        name: 'jobs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'job_number',
            type: 'bigint',
            isUnique: true,
          },
          {
            name: 'title',
            type: 'varchar',
          },
          {
            name: 'organization_id',
            type: 'uuid',
          },
          {
            name: 'status',
            type: 'job_status_enum',
            default: "'pending_to_review'",
          },
          {
            name: 'location_type',
            type: 'location_type_enum',
            isNullable: true,
          },
          {
            name: 'created_by',
            type: 'uuid',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Tạo foreign keys
    await queryRunner.createForeignKey(
      'jobs',
      new TableForeignKey({
        columnNames: ['organization_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'organizations',
        onDelete: 'CASCADE',
        name: 'FK_jobs_organization_id',
      }),
    );

    await queryRunner.createForeignKey(
      'jobs',
      new TableForeignKey({
        columnNames: ['created_by'],
        referencedColumnNames: ['id'],
        referencedTableName: 'users',
        onDelete: 'SET NULL',
        name: 'FK_jobs_created_by',
      }),
    );

    // Tạo indexes
    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_organization_id',
        columnNames: ['organization_id'],
      }),
    );

    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_status',
        columnNames: ['status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys trước
    await queryRunner.dropForeignKey('jobs', 'FK_jobs_organization_id');
    await queryRunner.dropForeignKey('jobs', 'FK_jobs_created_by');

    // Drop indexes
    await queryRunner.dropIndex('jobs', 'IDX_jobs_organization_id');
    await queryRunner.dropIndex('jobs', 'IDX_jobs_status');

    // Drop table
    await queryRunner.dropTable('jobs');

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."job_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."location_type_enum"`);
  }
}
```

---

## Thêm cột vào bảng có sẵn

### Generic Example: Thêm cột vào bảng users

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddPhoneToUsers1700000000017 implements MigrationInterface {
  name = 'AddPhoneToUsers1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone');
  }
}
```

### Specific Example: Thêm status column vào bảng jobs với default value

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddStatusToJobs1700000000018 implements MigrationInterface {
  name = 'AddStatusToJobs1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Tạo enum type nếu chưa có
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."job_status_enum" AS ENUM('pending_to_review', 'published', 'closed', 'expired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Thêm cột với default value
    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'status',
        type: 'job_status_enum',
        default: "'pending_to_review'",
        isNullable: false,
      }),
    );

    // Update existing rows với default value
    await queryRunner.query(`
      UPDATE jobs SET status = 'pending_to_review' WHERE status IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('jobs', 'status');
  }
}
```

### Thêm nhiều cột cùng lúc

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableColumn } from 'typeorm';

export class AddColumnsToUsers1700000000019 implements MigrationInterface {
  name = 'AddColumnsToUsers1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('users', [
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'avatar_url',
        type: 'varchar',
        isNullable: true,
      }),
      new TableColumn({
        name: 'bio',
        type: 'text',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'bio');
    await queryRunner.dropColumn('users', 'avatar_url');
    await queryRunner.dropColumn('users', 'phone');
  }
}
```

---

## Thêm index

### Single Column Index

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableIndex } from 'typeorm';

export class AddIndexToUsersEmail1700000000020 implements MigrationInterface {
  name = 'AddIndexToUsersEmail1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'IDX_users_email',
        columnNames: ['email'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'IDX_users_email');
  }
}
```

### Composite Index (Multiple Columns)

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableIndex } from 'typeorm';

export class AddCompositeIndexToJobs1700000000021 implements MigrationInterface {
  name = 'AddCompositeIndexToJobs1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'jobs',
      new TableIndex({
        name: 'IDX_jobs_organization_status',
        columnNames: ['organization_id', 'status'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('jobs', 'IDX_jobs_organization_status');
  }
}
```

### Unique Index

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';
import { TableIndex } from 'typeorm';

export class AddUniqueIndexToUsersEmail1700000000022 implements MigrationInterface {
  name = 'AddUniqueIndexToUsersEmail1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'UQ_users_email',
        columnNames: ['email'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('users', 'UQ_users_email');
  }
}
```

### Partial Index (với WHERE clause)

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPartialIndexToJobs1700000000023 implements MigrationInterface {
  name = 'AddPartialIndexToJobs1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_jobs_active_status"
      ON "jobs" ("status")
      WHERE "status" = 'published';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_active_status"`);
  }
}
```

---

## Xóa bảng

### Generic Example: Xóa bảng

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropUsersTable1700000000024 implements MigrationInterface {
  name = 'DropUsersTable1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate table trong down() nếu cần
    // Thường không cần implement down() cho drop table
  }
}
```

### Xóa bảng với foreign key constraints

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropJobsTable1700000000025 implements MigrationInterface {
  name = 'DropJobsTable1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys trước
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "FK_jobs_organization_id";
    `);
    await queryRunner.query(`
      ALTER TABLE "jobs" DROP CONSTRAINT IF EXISTS "FK_jobs_created_by";
    `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_organization_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_status"`);

    // Drop table
    await queryRunner.dropTable('jobs');

    // Drop enum types nếu không còn sử dụng
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."job_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."location_type_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate table và constraints trong down() nếu cần
  }
}
```

---

## Xóa cột

### Generic Example: Xóa cột

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePhoneFromUsers1700000000026 implements MigrationInterface {
  name = 'RemovePhoneFromUsers1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate column trong down() nếu cần
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        isNullable: true,
      }),
    );
  }
}
```

### Xóa cột với indexes/constraints

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveEmailFromUsers1700000000027 implements MigrationInterface {
  name = 'RemoveEmailFromUsers1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop index trước
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email"`);

    // Drop unique constraint nếu có
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email";
    `);

    // Drop column
    await queryRunner.dropColumn('users', 'email');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate column và constraints trong down() nếu cần
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'email',
        type: 'varchar',
        isUnique: true,
      }),
    );
  }
}
```

---

## Thay đổi dữ liệu (Data migration)

### Update existing data

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateJobStatuses1700000000028 implements MigrationInterface {
  name = 'UpdateJobStatuses1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Update status của các jobs cũ
    await queryRunner.query(`
      UPDATE jobs
      SET status = 'published'
      WHERE status = 'active' AND created_at < NOW() - INTERVAL '30 days';
    `);

    // Update status của jobs expired
    await queryRunner.query(`
      UPDATE jobs
      SET status = 'expired'
      WHERE status = 'published' AND created_at < NOW() - INTERVAL '90 days';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes nếu cần
    await queryRunner.query(`
      UPDATE jobs
      SET status = 'published'
      WHERE status = 'expired';
    `);
  }
}
```

### Transform data

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class TransformUserNames1700000000029 implements MigrationInterface {
  name = 'TransformUserNames1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Transform full_name thành first_name và last_name
    await queryRunner.query(`
      UPDATE users
      SET
        first_name = SPLIT_PART(full_name, ' ', 1),
        last_name = SPLIT_PART(full_name, ' ', 2)
      WHERE full_name IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: combine first_name và last_name thành full_name
    await queryRunner.query(`
      UPDATE users
      SET full_name = CONCAT(first_name, ' ', last_name)
      WHERE first_name IS NOT NULL AND last_name IS NOT NULL;
    `);
  }
}
```

### Seed data

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultRoles1700000000030 implements MigrationInterface {
  name = 'SeedDefaultRoles1700000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert default roles
    await queryRunner.query(`
      INSERT INTO roles (id, name, description, created_at, updated_at)
      VALUES
        (uuid_generate_v4(), 'admin', 'Administrator role', NOW(), NOW()),
        (uuid_generate_v4(), 'user', 'Regular user role', NOW(), NOW()),
        (uuid_generate_v4(), 'talent', 'Talent role', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove seeded data
    await queryRunner.query(`
      DELETE FROM roles WHERE name IN ('admin', 'user', 'talent');
    `);
  }
}
```

### Migrate data với validation

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateJobData1700000000031 implements MigrationInterface {
  name = 'MigrateJobData1700000000031';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Validate và migrate data
    const invalidJobs = await queryRunner.query(`
      SELECT id FROM jobs
      WHERE organization_id IS NULL OR title IS NULL;
    `);

    if (invalidJobs.length > 0) {
      throw new Error(`Found ${invalidJobs.length} invalid jobs. Please fix before migration.`);
    }

    // Migrate valid data
    await queryRunner.query(`
      UPDATE jobs
      SET status = 'published'
      WHERE status IS NULL AND organization_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert changes
    await queryRunner.query(`
      UPDATE jobs
      SET status = NULL
      WHERE status = 'published';
    `);
  }
}
```

---

## Best Practices

1. **Luôn implement `down()` method** để có thể revert migration
2. **Test migrations** trên development trước khi deploy
3. **Backup database** trước khi chạy migrations trong production
4. **Atomic changes**: Mỗi migration chỉ làm một việc
5. **Handle errors**: Validate data trước khi migrate
6. **Use transactions**: TypeORM tự động wrap migrations trong transactions
7. **Document complex migrations**: Thêm comments cho logic phức tạp
8. **Luôn dùng `timestamptz`** (timestamp with time zone) thay vì `timestamp` cho tất cả các timestamp columns — đảm bảo timezone-safe, tránh nhầm lẫn giờ khi deploy trên server có timezone khác local

## Lưu ý

- TypeORM tự động wrap migrations trong transactions
- Nếu migration fails, transaction sẽ rollback
- Data migrations nên được test kỹ trước khi deploy
- Không nên thay đổi migrations đã được chạy trong production
