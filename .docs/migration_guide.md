# Migration Guide (bkpractice-backend)

Hướng dẫn viết và chạy database migrations trong **bkpractice-backend** (Learning Service).

## 1. Cấu trúc & quy ước

- Mỗi service có thư mục migrations riêng, ví dụ:
  - Learning: `apps/learning-service/src/database/migrations/`
  - Identity: `apps/identity-service/src/database/migrations/`
- File migration đặt tên theo pattern: `<timestamp>-<TenChucNang>.ts`
  - Ví dụ: `1700000004000-Lrn004ClassEnrollment.ts`
- Class trong file đặt tên: `<TenChucNang><timestamp> implements MigrationInterface`
  - Ví dụ: `export class Lrn004ClassEnrollment1700000004000 implements MigrationInterface { ... }`
- Thuộc tính bắt buộc: `name = '<TenChucNang><timestamp>'`
- Hai method bắt buộc: `async up(queryRunner: QueryRunner): Promise<void>` và `async down(queryRunner: QueryRunner): Promise<void>`
- Sử dụng **raw SQL qua `queryRunner.query(...)`** (không dùng TypeORM `Table`, `TableColumn`...) để thống nhất với migration hiện có của repo.
- `synchronize: false` — không tự sinh schema từ entity, chỉ chạy migration thủ công.

## 2. Cách chạy migration trên VPS

### Bước 1: Cấu hình `.env`

Thêm vào file `.env` tại root repo:

```env
LEARNING_DATABASE_URL=postgres://bkpractice:123456@100.85.225.51:6789/bkpractice_learning
```

Lưu ý: `data-source.ts` của Learning Service đọc biến `LEARNING_DATABASE_URL`, không phải các biến `DB_LEARNING_*` tách biệt.

### Bước 2: Chạy migration

```bash
# Chạy tất cả migration chưa áp dụng
pnpm migration:run:learning

# Revert migration gần nhất
pnpm migration:revert:learning
```

Lệnh trên chạy TypeORM CLI với file:
`apps/learning-service/src/database/data-source.ts`

Nếu lỗi `ECONNREFUSED` hoặc `ENOTFOUND`, hãy kiểm tra PostgreSQL đang chạy trên VPS và biến `LEARNING_DATABASE_URL` đã đúng host/port/database chưa.

## 3. Mẫu migration cơ bản

### 3.1 Tạo bảng mới

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTopics1700000003001 implements MigrationInterface {
  name = 'CreateTopics1700000003001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "topics" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(80) NOT NULL UNIQUE
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "topics"`);
  }
}
```

### 3.2 Thêm cột vào bảng có sẵn

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToClasses1700000003002 implements MigrationInterface {
  name = 'AddStatusToClasses1700000003002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "classes_status_enum" AS ENUM ('ACTIVE', 'ARCHIVED')`);
    await queryRunner.query(
      `ALTER TABLE "classes" ADD COLUMN "status" "classes_status_enum" NOT NULL DEFAULT 'ACTIVE'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "classes" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "classes_status_enum"`);
  }
}
```

### 3.3 Thêm index

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexToProblemTopics1700000003003 implements MigrationInterface {
  name = 'AddIndexToProblemTopics1700000003003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_problem_topics_topic_id" ON "problem_topics" ("topic_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_problem_topics_topic_id"`);
  }
}
```

### 3.4 Thêm CHECK constraint

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProgressChecks1700000003004 implements MigrationInterface {
  name = 'AddProgressChecks1700000003004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "progress" ADD CONSTRAINT "progress_best_score_non_negative_check" CHECK ("best_score" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "progress" ADD CONSTRAINT "progress_solved_requires_solved_at_check" CHECK (status <> 'SOLVED' OR "solved_at" IS NOT NULL)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "progress" DROP CONSTRAINT "progress_solved_requires_solved_at_check"`,
    );
    await queryRunner.query(
      `ALTER TABLE "progress" DROP CONSTRAINT "progress_best_score_non_negative_check"`,
    );
  }
}
```

### 3.5 Đổi hành vi khoá ngoại (ON DELETE)

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeCoursesFkToRestrict1700000003005 implements MigrationInterface {
  name = 'ChangeCoursesFkToRestrict1700000003005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "classes_course_id_fkey"`);
    await queryRunner.query(
      `ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "classes" DROP CONSTRAINT "classes_course_id_fkey"`);
    await queryRunner.query(
      `ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE`,
    );
  }
}
```

### 3.6 Data migration (dùng transaction + kiểm tra trước)

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateProgressData1700000003006 implements MigrationInterface {
  name = 'MigrateProgressData1700000003006';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Kiểm tra dữ liệu trước khi chạy
    const invalidRows: unknown = await queryRunner.query(`
      SELECT id FROM "progress" WHERE "best_score" < 0
    `);
    if (Array.isArray(invalidRows) && invalidRows.length > 0) {
      throw new Error(`Found ${invalidRows.length} invalid progress rows. Fix data first.`);
    }

    // Chép dữ liệu cũ vào bảng biên nhận
    await queryRunner.query(`
      INSERT INTO "progress_event_receipts" ("event_id", "user_id", "problem_id", "received_at")
      SELECT "last_event_id", "user_id", "problem_id", "updated_at"
      FROM "progress"
      WHERE "last_event_id" IS NOT NULL
      ON CONFLICT ("event_id") DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "progress_event_receipts"`);
  }
}
```

## 4. Ví dụ thực tế trong repo (đã có sẵn)

File migration mẫu đã triển khai cho Learning Service:

| File                                           | Mục đích                                                                                                                                                                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1700000003000-InitialLearningSchema.ts`       | Schema ban đầu: `problems`, `test_cases`, `courses`, `classes`, `enrollments`, `progress`, ...                                                                                                                                           |
| `1700000004000-Lrn004ClassEnrollment.ts`       | Thêm `status`, `created_at`, `updated_at`, `archived_at` vào `classes`; CHECK `ARCHIVED ⇔ archived_at`; đổi FK `course_id` sang `ON DELETE RESTRICT`; index `classes(lecturer_id, created_at)` và `enrollments(student_id, enrolled_at)` |
| `1700000005000-Lrn006Progress.ts`              | Tạo bảng `progress_event_receipts`; thêm CHECK `best_score >= 0` và `SOLVED ⇒ solved_at` trên `progress`                                                                                                                                 |
| `1700000004000-Lrn001ProblemManagement.ts`     | Thêm `type_config`, `deleted_at`; đổi enum `publish_status` (`ARCHIVED -> ON_HOLD`); CHECK loại problem/giới hạn thực thi; unique `starter_codes(problem_id, language)`; partial index theo `deleted_at IS NULL`                         |
| `1700000006000-Lrn007RecommendationIndexes.ts` | Thêm index `problem_topics(topic_id)` và `problem_tags(tag_id)`                                                                                                                                                                          |
| `1700000007000-Lrn002TestCaseManagement.ts`    | CHECK `score`/`display_order` không âm; index `test_cases(problem_id, display_order)`; tạo `problem_harnesses` và chuyển `starter_codes.hidden_harness` sang bảng mới                                                                    |

Thứ tự chạy khuyến nghị: `InitialLearningSchema` → `Lrn001ProblemManagement` → `Lrn004ClassEnrollment` → `Lrn006Progress` → `Lrn007RecommendationIndexes` → `Lrn002TestCaseManagement`.

## 5. Best practices

1. **Luôn implement `down()`** để có thể revert migration.
2. **Test migration trên cơ sở dữ liệu cách ly** trước khi chạy production.
3. **Backup database** trước khi chạy migration trên production.
4. **Mỗi migration chỉ làm một việc** (atomic changes).
5. **Không sửa migration đã chạy trên production**; nếu sai, viết migration mới để sửa.
6. **Dùng raw SQL** qua `queryRunner.query(...)` để đồng nhất với mã hiện có.
7. **Kiểm tra dữ liệu trước khi thêm CHECK constraint** (tránh migration bị lỗi do dữ liệu cũ vi phạm).
8. **Enum type**: tạo trước khi dùng, xóa sau khi không còn cột tham chiếu.
9. **Tên ràng buộc FK**: PostgreSQL sinh tên mặc định (ví dụ `classes_course_id_fkey`). Kiểm tra tên thực tế trên DB trước khi viết migration `DROP CONSTRAINT`.

## 6. Lệnh thường dùng

```bash
# Chạy migration Learning
pnpm migration:run:learning

# Revert migration Learning
pnpm migration:revert:learning

# Kiểm tra trạng thái migration (nếu CLI hỗ trợ)
npx typeorm -d apps/learning-service/src/database/data-source.ts migration:show
```

## 7. Cảnh báo migration LRN-001 và LRN-002

### 7.1 `1700000004000-Lrn001ProblemManagement.ts`

- `up` kiểm tra dữ liệu hiện có trước khi thêm ràng buộc. Migration sẽ dừng nếu:
  - `problems.problem_type` có giá trị ngoài `STANDARD`, `FUNCTION`, `OOP`;
  - `time_limit_ms` ngoài `1..10000` hoặc `memory_limit_mb` ngoài `1..1024`;
  - `starter_codes` trùng cặp `(problem_id, language)`.
    Sửa dữ liệu và sao lưu trước khi chạy lại.
- `up` đổi enum `problems_publish_status_enum` và ánh xạ `ARCHIVED -> ON_HOLD`. Sau khi chạy, `ARCHIVED`
  không còn là giá trị hợp lệ; mọi mã đọc/ghi trạng thái phải dùng `ON_HOLD`.
- `down` ánh xạ ngược `ON_HOLD -> ARCHIVED` và **xoá cột `deleted_at` cùng `type_config`**. Dấu xoá mềm
  và cấu hình theo loại problem sẽ mất. Chỉ revert khi chấp nhận mất dữ liệu này và đã sao lưu.

### 7.2 `1700000007000-Lrn002TestCaseManagement.ts`

- `up` tạo bảng `problem_harnesses`, chép dữ liệu từ `starter_codes.hidden_harness`, rồi xoá cột
  `hidden_harness`. Sao lưu `starter_codes` trước khi chạy.
- `down` thêm lại cột `hidden_harness` và chỉ chép ngược các hàng có `starter_codes` khớp
  `(problem_id, language)`. Hàng harness không có starter code tương ứng sẽ mất khi bảng bị xoá.
- Phải chạy LRN-001 trước LRN-002 vì LRN-002 dựa trên schema problem đã cập nhật.
