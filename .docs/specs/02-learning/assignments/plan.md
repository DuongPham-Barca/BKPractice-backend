# LRN-005 Kế hoạch triển khai Quản lý Assignment

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.0` (Approved) của đặc tả LRN-005. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả. Các quyết định liên tính năng đã chốt nằm ở
[Quyết định phối hợp đã chốt](#quyết-định-phối-hợp-đã-chốt).

## Đặc tả liên quan

- [LRN-005 Quản lý Assignment](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`

Đặc tả là nguồn chân lý cho quan hệ Assignment–Class, vòng đời, điều kiện xuất bản, quy tắc chỉnh
sửa, quy tắc chấm điểm, hiển thị và phân quyền. Theo LRN-005-FR-011, phép tính và việc hiển thị điểm
được cài đặt ở LRN-006 (`AssignmentScoreCalculator` trong module `progress`); kế hoạch này chỉ bảo đảm
dữ liệu chấm (LRN-005-FR-012) và quy tắc hiển thị mà LRN-006 đọc. Kế hoạch này không thêm hành vi nào ngoài đặc tả.

## Service đích

Service: Learning Service

Assignment nằm trong module `assignments` hiện có (`apps/learning-service/src/modules/assignments/`),
trong `bkpractice_learning`. Không tạo microservice mới. Gateway đã chuyển tiếp `/api/assignments`
và `/api/classes` tới Learning (`apps/api-gateway/src/proxy/gateway-proxy.service.ts`), nên không đổi
Gateway.

## Kiến trúc service bắt buộc

Kiến trúc: **DDD + Hexagonal Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- Module `assignments` có bất biến thật (vòng đời, khoá chỉnh sửa theo thời gian, danh sách Problem
  duy nhất và giới hạn, điều kiện xuất bản), nên được phân tầng đủ: `domain`, `application/ports`,
  `application/use-cases`, `infrastructure`, `presentation`.
- Tái dùng các port hạ tầng chung của LRN-001 (`PrincipalProvider`, `TransactionRunner`) và bộ kiểm
  tra Markdown hạn chế của LRN-001. **LRN-001 phải được triển khai trước.**
- Đọc dữ liệu của module khác trong Learning (Class/Enrollment của LRN-004, Problem của LRN-001) chỉ
  qua port đọc hẹp, hiện thực bởi adapter TypeORM trong cùng service. Không
  gọi use case của module khác theo kiểu dịch vụ chung, không sửa bảng của module khác.
- Chỉ dùng DDD tactical. Không thêm bounded context, CQRS, event store hay base repository chung.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `modules/assignments/entities/assignment.entity.ts`: entity `Assignment` (`title` varchar(200),
  quan hệ `course` tới `Course` `nullable` + `onDelete: 'SET NULL'`, quan hệ `classroom` tới
  `Classroom` `nullable` + `onDelete: 'CASCADE'`, `lecturerId`, `startsAt`, `deadlineAt` nullable) và
  `AssignmentProblem` (quan hệ tới `Assignment` `CASCADE`, tới `Problem` `CASCADE`, `maxScore` mặc định
  100, `displayOrder` mặc định 0, index duy nhất `(assignment, problem)`).
- Migration `1700000003000-InitialLearningSchema.ts` tạo đúng các cột trên. Khoá ngoại khai báo inline,
  nên tên ràng buộc do PostgreSQL sinh (`assignments_class_id_fkey`, `assignments_course_id_fkey`).
  Không có CHECK, không có index ngoài khoá chính và ràng buộc duy nhất.
- Module `assignments` không có `*.module.ts`, controller hay service; `LearningServiceModule` chỉ
  import `ProblemsModule` và `ProgressModule`. Entity được đăng ký qua `modules/learning.entities.ts`.
- `Classroom`/`Enrollment` hiện nằm trong `modules/courses/entities/course.entity.ts`; plan LRN-004
  chuyển chúng sang module `enrollments` và sửa đường import trong `assignment.entity.ts`.
- `ProgressConsumer` đặt `solvedAt ??= new Date(event.occurredAt)`, tức `solved_at` là lần đạt đầu
  tiên theo thời điểm có kết quả; LRN-006 giữ nguyên ngữ nghĩa này và đọc `assignments`,
  `assignment_problems` (chỉ đọc) để tính điểm theo quy tắc LRN-005.
- Plan LRN-003 (`CourseReferenceChecker`) đếm `assignments` theo `course_id` khi xoá hẳn Course nháp.
- LRN-001 không có xoá cứng Problem, nên `assignment_problems.problem_id ON DELETE CASCADE` không bao
  giờ được kích hoạt bởi luồng nghiệp vụ.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Bảng `assignment_problems` và các cột hiện có; cột `assignments.course_id` (giữ nguyên, LRN-005 không ghi, luôn `NULL` với Assignment mới); `PrincipalProvider`, `TransactionRunner`, bộ kiểm Markdown hạn chế của LRN-001; `ProblemReferenceReader` do `problems` export (plan LRN-003) nếu đã có; route prefix của Gateway; quy ước lỗi hiện có |
| MODIFY    | Entity `Assignment` (`classroom` bắt buộc, thêm cột mới; quan hệ `course` giữ nguyên, không dùng), `AssignmentProblem` (không đổi cột, thêm CHECK/index ở migration); `learning-service.module.ts` (import `AssignmentsModule`)                                                                                                                   |
| CREATE    | Domain (aggregate, value object, `AssignmentPublishValidator`); port và adapter; use case; controller, DTO; `assignments.module.ts`; migration `Lrn005AssignmentManagement`; migration seed quyền ở Identity; test                                                                                                                                |
| REMOVE    | Không có                                                                                                                                                                                                                                                                                                                                          |

## Thay đổi ở tầng domain

### Aggregate `Assignment`

Ranh giới nhất quán gồm Assignment và danh sách `AssignmentItem` của nó (≤ 50 mục), vì các bất biến
danh sách (duy nhất, thứ tự, giới hạn, khoá theo thời gian) phải được kiểm cùng lúc với trạng thái và
lịch.

Trạng thái: `id`, `classId`, `createdBy`, `title`, `description`, `schedule`, `status`
(`DRAFT` | `PUBLISHED`), `deletedAt`, `items`, `createdAt`, `updatedAt`.

Hành vi (mọi hành vi nhận `now` từ ngoài vào, không tự đọc đồng hồ):

| Hành vi                                 | Quy tắc                                                                                           | Truy vết               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| `create(classId, createdBy, …)`         | Trạng thái `DRAFT`; kiểm value object                                                             | FR-002, FR-003         |
| `rename`, `changeDescription`           | Bị chặn khi đã xoá mềm                                                                            | FR-004                 |
| `reschedule(startsAt, deadlineAt, now)` | Theo bảng Quy tắc chỉnh sửa của đặc tả: sau `startsAt` thì `startsAt` khoá, `deadlineAt` chỉ tăng | FR-004, AC-015, AC-016 |
| `replaceItems(items, now)`              | `DRAFT` hoặc `PUBLISHED` trước `startsAt`; duy nhất; ≤ 50; `PUBLISHED` phải còn ≥ 1 mục           | FR-005, FR-018, AC-018 |
| `publish(readiness, now)`               | Chỉ từ `DRAFT`; `readiness` rỗng lỗi                                                              | FR-006, FR-007         |
| `softDelete(now)` / `restore()`         | Xoá mềm chỉ từ `PUBLISHED` chưa xoá; khôi phục chỉ khi đã xoá, về `PUBLISHED`                     | FR-006, AC-019         |
| `isHardDeletable()`                     | Đúng khi `DRAFT`                                                                                  | FR-006                 |
| `isVisibleToStudents(now)`              | `PUBLISHED`, chưa xoá, `now ≥ startsAt`                                                           | FR-008                 |

Lỗi domain: `InvalidAssignmentState`, `AssignmentLocked` (thành phần đã khoá theo thời gian),
`AssignmentValidationError`, `AssignmentNotReady` (kèm danh sách mã điều kiện).

### Value object

| Khái niệm               | Quy tắc                                                                      | Truy vết       |
| ----------------------- | ---------------------------------------------------------------------------- | -------------- |
| `AssignmentTitle`       | Sau khi trim không rỗng, ≤ 200 ký tự                                         | FR-018         |
| `AssignmentDescription` | Tuỳ chọn, ≤ 20.000 ký tự, qua bộ kiểm Markdown hạn chế của LRN-001           | FR-017, FR-018 |
| `AssignmentSchedule`    | `startsAt`, `deadlineAt` tuỳ chọn; khi cả hai có thì `startsAt < deadlineAt` | FR-004, AC-021 |
| `MaxScore`              | Số nguyên 1..1.000, mặc định 100                                             | FR-018         |
| `AssignmentItem`        | `problemId` (UUID) + `MaxScore` + vị trí 0..n-1                              | FR-005         |

### Domain service

- **`AssignmentPublishValidator`**: nhận aggregate, tình trạng Problem (từ port) và trạng thái Class,
  trả danh sách mã: `TITLE_REQUIRED`, `STARTS_AT_REQUIRED`, `DEADLINE_REQUIRED`,
  `SCHEDULE_INVALID`, `DEADLINE_IN_PAST`, `PROBLEM_REQUIRED`, `PROBLEM_NOT_PUBLISHED` (kèm
  `problemId`, chỉ trả cho chủ sở hữu), `CLASS_NOT_ACTIVE`. Dùng cho xuất bản và cho phần "điều kiện
  còn thiếu" ở phía quản lý (FR-007, FR-016). Kiểm tra "giữ điều kiện" khi sửa Assignment `PUBLISHED`
  dùng cùng validator nhưng bỏ `DEADLINE_IN_PAST`.
- **Không có domain service chấm điểm trong module này.** Quy tắc LRN-005-FR-010, FR-013, FR-014,
  FR-015 được cài đặt một lần bởi `AssignmentScoreCalculator` của LRN-006 (LRN-005-FR-011). Việc
  LRN-005 cần làm là giữ dữ liệu chấm đúng: `deadlineAt`, mục có thứ tự kèm `maxScore`, và các trường
  quyết định hiển thị (`status`, `deleted_at`, `starts_at`) mà `AssignmentReader` của LRN-006 đọc.

## Tầng application / Use case

Mỗi use case thay đổi dữ liệu chạy trong `TransactionRunner`, nạp Class bằng `ClassAccessReader`
(khoá chia sẻ), nạp Assignment bằng `loadForUpdate`, kiểm quyền và sở hữu qua
`AssignmentAccessPolicy`, kiểm Class `ACTIVE` (FR-019), rồi mới gọi aggregate và lưu.

| Use case                 | Quyền / điều kiện                  | Luồng chính                                                                                                                    | Truy vết                                               |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `CreateAssignment`       | `assignment:create` + sở hữu       | Class tồn tại (khác thì `404`), `ACTIVE`; tạo `DRAFT` với `createdBy` = principal                                              | FR-002, FR-003; AC-001, AC-002                         |
| `UpdateAssignment`       | `assignment:update` + sở hữu       | `rename`/`changeDescription`/`reschedule`; nếu `PUBLISHED` chạy validator "giữ điều kiện"                                      | FR-004; AC-015, AC-016, AC-021                         |
| `SetAssignmentProblems`  | `assignment:update` + sở hữu       | Nạp tình trạng Problem; mục mới phải `PUBLISHED` chưa xoá (lỗi chung, không lộ); `replaceItems`; nếu `PUBLISHED` giữ điều kiện | FR-005, FR-018; AC-017, AC-018                         |
| `PublishAssignment`      | `assignment:publish` + sở hữu      | Chạy `AssignmentPublishValidator` trên state đã lưu; `publish`                                                                 | FR-007; AC-004, AC-005                                 |
| `DeleteAssignment`       | `assignment:delete` + sở hữu       | `DRAFT` → xoá hẳn (mục đi theo cascade); `PUBLISHED` → `softDelete`                                                            | FR-006; AC-019                                         |
| `RestoreAssignment`      | `assignment:restore` + sở hữu      | `restore` về `PUBLISHED`; không kiểm lại điều kiện xuất bản                                                                    | FR-006; AC-019                                         |
| `GetManagedAssignment`   | `assignment:read-managed` + sở hữu | Mọi trạng thái; kèm trạng thái từng Problem và điều kiện còn thiếu                                                             | FR-016                                                 |
| `ListManagedAssignments` | `assignment:read-managed` + sở hữu | Phân trang theo Class, lọc trạng thái, tuỳ chọn gồm đã xoá mềm                                                                 | FR-009                                                 |
| `ListClassAssignments`   | Thành viên đang đăng ký            | Không phải thành viên → `404`; chỉ Assignment `isVisibleToStudents(now)`; kèm tổng `maxScore` của Problem hiển thị             | FR-008, FR-009; AC-006, AC-008                         |
| `GetStudentAssignment`   | Thành viên đang đăng ký            | Không hiển thị hoặc không phải thành viên → `404`; chỉ trả Problem đang `PUBLISHED` chưa xoá, giữ thứ tự; không kèm tiến độ    | FR-008, FR-015; AC-006, AC-007, AC-008, AC-012, AC-014 |

- Thao tác đọc không mở transaction ghi và không thay đổi state (FR-020).
- Route hướng sinh viên chỉ phục vụ sinh viên đang đăng ký. Chủ sở hữu Class dùng route quản lý;
  kế hoạch không thêm chế độ xem trước ngoài đặc tả.

### Port

| Port                   | Trách nhiệm                                                                                                           | Adapter                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `AssignmentRepository` | `load`, `loadForUpdate` (khoá dòng), `save` (aggregate + thay thế mục), `hardDelete`, `listByClass` (phân trang, lọc) | TypeORM trên `assignments`, `assignment_problems`                                                                       |
| `ClassAccessReader`    | `loadClass(classId, { lockShared })` → `{ id, ownerId, status }`; `isEnrolled(classId, userId)`                       | TypeORM trên bảng Class/Enrollment của LRN-004                                                                          |
| `ProblemCatalogReader` | `loadStates(problemIds)` → `{ id, slug, title, difficulty, publishStatus, deleted }`; không đọc Test Case/harness     | Tái dùng `ProblemReferenceReader` do `problems` export (plan LRN-003), hoặc TypeORM chỉ đọc trên `problems` nếu chưa có |
| `Clock`                | `now()`; cho phép test biên thời gian không phụ thuộc đồng hồ thật                                                    | Adapter hệ thống                                                                                                        |
| `PrincipalProvider`    | (LRN-001) principal tin cậy gồm `userId`, `roles`, `permissions`                                                      | Tái dùng                                                                                                                |
| `TransactionRunner`    | (LRN-001) nguyên tử                                                                                                   | Tái dùng                                                                                                                |

`AssignmentAccessPolicy` là thành phần application (không phải port) gom kiểm tra "có quyền X và
principal là chủ sở hữu Class", dùng chung cho mọi use case quản lý. Không thêm port nào khác.

## Lưu trữ

- Tái dùng `assignments` và `assignment_problems`. `SetAssignmentProblems` xoá các dòng mục cũ và chèn
  lại danh sách mới với `display_order` 0..n-1 trong cùng transaction.
- `lecturer_id` được giữ tên cột, mang nghĩa "giảng viên tạo Assignment" (ánh xạ sang `createdBy`), chỉ
  để kiểm toán. Quyền sở hữu luôn tính theo chủ sở hữu hiện tại của Class (LRN-005 Quy tắc phân quyền).
- Truy vấn hướng sinh viên lọc `status = 'PUBLISHED' AND deleted_at IS NULL AND starts_at <= now`.
- LRN-005 không đọc và không ghi `progress`. LRN-006 đọc `assignments`/`assignment_problems` chỉ đọc;
  LRN-005 giữ tên cột ổn định (`deadline_at`, `starts_at`, `status`, `deleted_at`, `max_score`,
  `display_order`) để reader đó không vỡ.
- Cột `course_id` được giữ nguyên và không được ghi: Assignment gắn với Course qua Class. Nhờ vậy
  `CourseReferenceChecker` của plan LRN-003 vẫn chạy đúng (đếm theo `course_id` luôn ra 0 với
  Assignment mới, còn tham chiếu qua Class do đếm `classes` bao phủ).

### Đồng thời

- Mọi thao tác thay đổi chạy `SELECT ... FROM assignments WHERE id = $1 FOR UPDATE`, nên hai lần sửa
  danh sách hay xuất bản đồng thời được tuần tự hoá.
- Thao tác thay đổi đọc dòng Class bằng `FOR SHARE` để không đua với thao tác lưu trữ Class của
  LRN-004 (LRN-004 cần khoá `FOR UPDATE` dòng Class khi đổi trạng thái; ghi ở mục Phụ thuộc).
- Problem bị tạm giữ ngay sau khi Assignment xuất bản không cần khoá chéo: FR-015 xử lý khi đọc.

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_learning`.

- `assignments`:
  - thêm `description` text NULL; `status` enum `assignment_status_enum` (`DRAFT`, `PUBLISHED`) NOT
    NULL DEFAULT `'DRAFT'`; `deleted_at` timestamptz NULL; `created_at`, `updated_at` timestamptz NOT
    NULL DEFAULT `now()`;
  - `class_id` SET NOT NULL; thay khoá ngoại `assignments_class_id_fkey` bằng `ON DELETE RESTRICT`
    (không để việc xoá Class vô tình xoá Assignment đã công khai);
  - giữ nguyên cột `course_id` và khoá ngoại của nó (không ghi);
  - `CHECK (starts_at IS NULL OR deadline_at IS NULL OR starts_at < deadline_at)`;
  - `CHECK (status <> 'PUBLISHED' OR (starts_at IS NOT NULL AND deadline_at IS NOT NULL))`;
  - index `(class_id, status)`.
- `assignment_problems`: `CHECK (max_score BETWEEN 1 AND 1000)`, `CHECK (display_order >= 0)`, index
  `(assignment_id, display_order)`. Giữ `problem_id ON DELETE CASCADE` (LRN-001 không xoá cứng).
- Không đổi `progress`, `classes`, `enrollments`, `problems`. Không có khoá ngoại hay truy vấn xuyên
  service.

## Migration

`apps/learning-service/src/database/migrations/<timestamp>-Lrn005AssignmentManagement.ts`, chạy sau
migration của LRN-001, LRN-003 và LRN-004; `synchronize: false`.

- **Up:**
  1. Kiểm tra `SELECT count(*) FROM assignments WHERE class_id IS NULL`; nếu > 0 thì ném lỗi rõ ràng và
     dừng (không tự xoá dữ liệu). Hiện chưa có API tạo Assignment nên dự kiến bảng rỗng.
  2. Tạo enum, thêm cột mới.
  3. `class_id` SET NOT NULL; bỏ và tạo lại khoá ngoại với `ON DELETE RESTRICT`.
  4. Thêm CHECK và index trên hai bảng.
- **Down:** bỏ index và CHECK; đổi khoá ngoại `class_id` về `ON DELETE CASCADE` và cho phép null; bỏ
  `created_at`, `updated_at`, `deleted_at`, `status`, `description`; bỏ enum. Down làm mất mô tả,
  trạng thái và dấu xoá mềm; Assignment đã xoá mềm sẽ trở lại như chưa xoá — ghi cảnh báo trong tài
  liệu triển khai.
- Kiểm chứng bằng `pnpm migration:run:learning` / `pnpm migration:revert:learning` trên cơ sở dữ liệu
  cách ly có dữ liệu mẫu (hai script này có trong `package.json` gốc); với Identity dùng
  `pnpm migration:run:identity` / `pnpm migration:revert:identity`.

### Seed quyền ở Identity

`apps/identity-service/src/database/migrations/<timestamp>-SeedAssignmentPermissions.ts`, theo
ID-003-FR-017:

- **Up:** chèn sáu mã vào `permissions` (`assignment:create`, `assignment:read-managed`,
  `assignment:update`, `assignment:publish`, `assignment:delete`, `assignment:restore`) kèm mô tả;
  chèn `role_permissions` gán cả sáu cho vai trò `LECTURER`; dùng `ON CONFLICT DO NOTHING`.
- **Down:** xoá các dòng `role_permissions` và `permissions` của sáu mã này.
- Không gán cho `STUDENT` hay `ADMIN`.

## API

Tất cả route cần Bearer token; Gateway đặt header định danh tin cậy.

| Method + route                                  | Use case                 | Phản hồi                                   |
| ----------------------------------------------- | ------------------------ | ------------------------------------------ |
| `POST /api/classes/:classId/assignments`        | `CreateAssignment`       | `201` biểu diễn quản lý                    |
| `GET /api/classes/:classId/assignments/managed` | `ListManagedAssignments` | `200` danh sách quản lý phân trang         |
| `GET /api/classes/:classId/assignments`         | `ListClassAssignments`   | `200` danh sách hướng sinh viên phân trang |
| `GET /api/assignments/managed/:id`              | `GetManagedAssignment`   | `200` biểu diễn quản lý                    |
| `GET /api/assignments/:id`                      | `GetStudentAssignment`   | `200` biểu diễn hướng sinh viên            |
| `PATCH /api/assignments/:id`                    | `UpdateAssignment`       | `200` biểu diễn quản lý                    |
| `PUT /api/assignments/:id/problems`             | `SetAssignmentProblems`  | `200` biểu diễn quản lý                    |
| `POST /api/assignments/:id/publish`             | `PublishAssignment`      | `200` biểu diễn quản lý                    |
| `DELETE /api/assignments/:id`                   | `DeleteAssignment`       | `204`                                      |
| `POST /api/assignments/:id/restore`             | `RestoreAssignment`      | `200` biểu diễn quản lý                    |

- Route `managed` khai báo trước route có `:id`; `:id`, `:classId` kiểm `ParseUUIDPipe`.
- Controller Class-scoped (`classes/:classId/assignments`) nằm trong module `assignments`, không sửa
  controller của LRN-004.
- Swagger mô tả mọi route; ví dụ không chứa dữ liệu judge.
- Không có route điểm hay bảng điểm trong module này; điểm đi qua `/api/progress/...` của LRN-006.

## DTO / Kiểm tra dữ liệu

- `CreateAssignmentRequestDto`: `title` (string, bắt buộc, ≤ 200), `description` (string, tuỳ chọn,
  ≤ 20.000), `startsAt`, `deadlineAt` (`IsISO8601({ strict: true })`, tuỳ chọn, phải có múi giờ).
- `UpdateAssignmentRequestDto`: partial của `title`, `description`, `startsAt`, `deadlineAt`; ngữ nghĩa
  `PATCH` như LRN-001 (thiếu trường = giữ nguyên; `null` cho `description` = xoá mô tả).
- `SetAssignmentProblemsRequestDto`: `items` mảng 0..50 phần tử `{ problemId: UUID, maxScore?: int
1..1000 }`; thứ tự mảng là thứ tự hiển thị. Trùng `problemId` bị từ chối ở domain.
- Query phân trang: `page` ≥ 1, `pageSize` 1..100 (mặc định 20); phía quản lý thêm `status`
  (`DRAFT` | `PUBLISHED`) và `includeDeleted` (boolean).
- `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`) chặn `classId` trong body cập nhật,
  `status`, `createdBy`, `lecturerId`, mốc thời gian hệ thống, `studentId` (SR-006, AC-022).
- Response DTO ánh xạ tường minh: `ManagedAssignmentResponseDto` (kèm `problems[].publishStatus`,
  `problems[].visible`, `readiness[]`), `StudentAssignmentResponseDto` (`problems[]` gồm `problemId`,
  `slug`, `title`, `difficulty`, `maxScore`, `order`; `maxTotalScore`), `AssignmentSummaryDto`. Không
  trả `lecturer_id`, trạng thái, `deletedAt` hay bất kỳ tiến độ nào trong biểu diễn sinh viên.

## Phân quyền

- Principal lấy từ `PrincipalProvider` của LRN-001 (header `x-auth-user-id`, `x-auth-roles`,
  `x-auth-permissions` do Gateway làm sạch và đặt lại). Thiếu header quyền thì tập quyền rỗng.
- `AssignmentAccessPolicy.requireManage(principal, permission, classAccess)`: có mã quyền và
  `classAccess.ownerId === principal.userId`; thiếu thì `403`. `ADMIN` không có nhánh ngoại lệ.
- Đọc hướng sinh viên: `ClassAccessReader.isEnrolled(classId, principal.userId)`; sai thì `404`.
- Không có route nào nhận `studentId` từ client. Quyền xem điểm (`class:read-managed` + sở hữu Class)
  do LRN-006 thực thi.
- Kiểm thử khẳng định và phủ định cho từng quyền, cho giảng viên khác, `STUDENT`, `ADMIN`, và người
  không đăng ký.

## Messaging / Sự kiện

N/A. LRN-005 không phát và không tiêu thụ sự kiện; `progress` được LRN-006 ghi từ
`submission.accepted` và contract sự kiện không đổi.

## Realtime

N/A. Không có đẩy realtime ở v1 (đặc tả Ngoài phạm vi); điểm tính khi đọc ở LRN-006.

## Adapter hạ tầng

- `infrastructure/persistence/assignment.repository.ts`: `AssignmentRepository`, ánh xạ entity ↔
  aggregate, `loadForUpdate` dùng khoá pessimistic.
- `infrastructure/readers/class-access.reader.ts`: đọc bảng Class/Enrollment của LRN-004 qua entity của
  LRN-004 (hoặc qua query service LRN-004 cung cấp, nếu plan LRN-004 có).
- `infrastructure/readers/problem-catalog.reader.ts`: bọc `ProblemReferenceReader` do `problems`
  export nếu đã có; nếu chưa, chọn đúng các cột công khai và trạng thái của `problems`.
- `infrastructure/system-clock.ts`: `Clock`.
- `assignments.module.ts`: composition root, gắn adapter vào port; import vào
  `LearningServiceModule`.

## Cấu hình

Không đổi cấu hình, biến môi trường, Docker hay Gateway.

## Xử lý lỗi

| Điều kiện                                                                                   | Ánh xạ                                                     |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Thiếu/sai token                                                                             | `401` qua Gateway                                          |
| Thiếu quyền hoặc không sở hữu Class                                                         | `403`                                                      |
| Class/Assignment không tồn tại; không hiển thị hoặc không phải thành viên (sinh viên)       | `404`                                                      |
| `InvalidAssignmentState`, `AssignmentLocked`, Class `ARCHIVED`                              | `409`                                                      |
| `AssignmentValidationError` (độ dài, lịch, `maxScore`, trùng, quá 50, Problem không hợp lệ) | `400`                                                      |
| `AssignmentNotReady` (xuất bản hoặc sửa làm mất điều kiện)                                  | `400` kèm danh sách mã điều kiện, như lỗi sẵn sàng LRN-001 |
| DTO sai kiểu, trường lạ                                                                     | `400` theo `ValidationPipe`                                |

Lỗi thêm Problem không hợp lệ chỉ báo `problemId` mà client đã gửi và mã chung
`PROBLEM_NOT_AVAILABLE`, không phân biệt không tồn tại / nháp / tạm giữ / đã xoá (SR-003, AC-017).
Không đưa vào cấu trúc lỗi mới.

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------- |
| SR-001  | Quyền, sở hữu, thành viên, trạng thái kiểm trong use case, không ở controller                        |
| SR-002  | Principal chỉ từ `PrincipalProvider`; không route nào nhận định danh người dùng từ client            |
| SR-003  | Truy vấn sinh viên lọc trạng thái, xoá mềm, `startsAt`; lọc Problem theo FR-015; lỗi `404` đồng nhất |
| SR-004  | Không response DTO nào có trường tiến độ/điểm/thành viên; module không phụ thuộc `progress`          |
| SR-005  | `ProblemCatalogReader` không chọn cột Test Case/harness; test soi phản hồi                           |
| SR-006  | DTO danh sách cho phép + `forbidNonWhitelisted`                                                      |
| SR-007  | Bộ kiểm Markdown hạn chế của LRN-001                                                                 |
| SR-008  | Chỉ datasource Learning; ID người dùng là UUID thuần; không khoá ngoại xuyên service                 |
| SR-009  | Thiếu principal hoặc thiếu quyền thì từ chối trước khi đọc dữ liệu                                   |

## Chiến lược kiểm thử

- **Unit (domain, không PostgreSQL):** value object (độ dài, lịch, `maxScore`); aggregate: mọi bước
  chuyển hợp lệ/bị cấm, khoá theo thời gian với `now` trước/bằng/sau `startsAt` (AC-015), gia hạn
  (AC-016), `replaceItems` trùng/quá 50 (AC-018); `AssignmentPublishValidator` với từng điều kiện
  (AC-004). Quy tắc chấm (AC-009 tới AC-011, AC-016, AC-024) được kiểm ở test của
  `AssignmentScoreCalculator` (LRN-006); LRN-005 cung cấp bộ ca biên (giải trước khi tạo, bằng hạn, sau
  hạn, chưa giải, Problem bị ẩn, gia hạn) để hai bên đối chiếu.
- **Unit (application, port giả và `Clock` giả):** quyền và sở hữu (AC-002), Class `ARCHIVED`
  (AC-020), hiển thị theo thời gian và thành viên (AC-006 tới AC-008), xoá hẳn/xoá mềm/khôi phục
  (AC-019), thất bại không để lại thay đổi dở dang (FR-020).
- **Integration (lưu trữ):** ánh xạ aggregate; thay thế mục và thứ tự; CHECK và khoá ngoại
  `RESTRICT`; `course_id` không bị ghi; khoá dòng tuần tự hoá hai lần sửa đồng thời; migration up/down
  (kể cả nhánh dừng khi có `class_id` rỗng).
- **API/E2E:** vòng đời đầy đủ; `401` (AC-003); trường lạ (AC-022); Markdown thô (AC-021); Problem
  bị tạm giữ biến mất rồi hiện lại đúng vị trí (AC-012); đủ dữ liệu chấm trên Assignment đã lưu
  (AC-013); phản hồi không có tiến độ/điểm (AC-014) hay dữ liệu judge (AC-023); Problem không hợp lệ
  không lộ thông tin (AC-017).
- **Hợp đồng với LRN-006:** một test tích hợp dùng dữ liệu LRN-005 thật để xác nhận
  `AssignmentReader` của LRN-006 đọc đúng hạn chót, mục và cờ hiển thị.
- **Seed quyền:** migration Identity up/down; token của `LECTURER` có sáu quyền, của `STUDENT`/`ADMIN`
  không có.
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID hiện có.
- Log kết quả thao tác quản lý (tạo, sửa, thiết lập Problem, xuất bản, xoá, khôi phục) kèm
  `assignmentId`, `classId`, request ID, số Problem; không log mô tả hay header xác thực.

## Truy vết yêu cầu

| Yêu cầu                | Đường triển khai                                                         | Kiểm chứng                               |
| ---------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| FR-001, FR-002         | Aggregate trong Learning; `class_id` NOT NULL, không đổi                 | Kiến trúc, unit, migration               |
| FR-003, FR-004         | `CreateAssignment`, `UpdateAssignment`, `reschedule`                     | Unit/API; AC-001, 015, 016, 021          |
| FR-005, FR-018         | `SetAssignmentProblems`, `replaceItems`, value object                    | Unit/API; AC-017, 018                    |
| FR-006, FR-007         | `publish`, `softDelete`, `restore`, `AssignmentPublishValidator`         | Unit/API; AC-004, 005, 019               |
| FR-008, FR-009         | `ListClassAssignments`, `GetStudentAssignment`, `ListManagedAssignments` | API; AC-006, 007, 008                    |
| FR-010, FR-013, FR-014 | Cài ở `AssignmentScoreCalculator` (LRN-006); LRN-005 không lưu điểm      | Test LRN-006; AC-009, 010, 011, 016, 024 |
| FR-011                 | Không route điểm trong module `assignments`                              | Rà soát; AC-014                          |
| FR-012                 | Cột `deadline_at`, `starts_at`, `status`, `deleted_at`, mục có thứ tự    | Integration/hợp đồng; AC-013             |
| FR-015                 | Lọc Problem hiển thị ở `GetStudentAssignment`; LRN-006 dùng cùng quy tắc | API; AC-012                              |
| FR-016                 | `GetManagedAssignment`                                                   | API                                      |
| FR-017                 | Bộ kiểm Markdown hạn chế                                                 | Unit/API; AC-021                         |
| FR-019                 | Kiểm Class `ACTIVE` trong mọi use case thay đổi                          | Unit/API; AC-020                         |
| FR-020                 | Transaction; đọc không ghi                                               | Unit/integration                         |
| FR-021                 | Không adapter Submission, không đọc/ghi `progress`                       | Rà soát                                  |
| SR-001–SR-009          | Mục Bảo mật                                                              | Test bảo mật; AC-002, 014, 022, 023      |

## Thứ tự triển khai

1. Xác nhận LRN-001 (port hạ tầng, Markdown) và LRN-004 (Class, Enrollment, trạng thái) đã triển
   khai. LRN-006 triển khai sau LRN-005 vì nó đọc bảng Assignment.
2. Migration seed quyền ở Identity.
3. Domain: value object, aggregate, `AssignmentPublishValidator`; unit test.
4. Migration LRN-005 và cập nhật entity; kiểm chứng up/down.
5. Port, adapter lưu trữ và reader; integration test.
6. Use case, `AssignmentAccessPolicy`; unit test application.
7. DTO, controller, `assignments.module.ts`, Swagger.
8. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **LRN-001 đã triển khai:** `PrincipalProvider`, `TransactionRunner`, bộ kiểm Markdown hạn chế, trạng
  thái và xoá mềm Problem.
- **LRN-004:** bảng/entity Class với `lecturer_id` là chủ sở hữu và trạng thái `ACTIVE`/`ARCHIVED`;
  Enrollment hiện hành. LRN-004 cần khoá `FOR UPDATE` dòng Class khi đổi trạng thái, và không được xoá
  cứng Class có Assignment (khoá ngoại `RESTRICT`).
- **LRN-006:** cài đặt phép tính điểm theo quy tắc LRN-005 (`AssignmentScoreCalculator`) và các route
  điểm; `solved_at` là lần giải đầu tiên theo `occurredAt`. LRN-006 phụ thuộc bảng của LRN-005, không
  ngược lại.
- **LRN-003:** `CourseReferenceChecker` đếm `assignments.course_id`; cột được giữ nên không vỡ.
- **ID-003 0.4 / ID-003-FR-017:** claim `permissions`, header `x-auth-permissions`, seed tĩnh.
- **Submission:** contract `submission.accepted` không đổi.

## Rủi ro

- **`occurredAt` là lúc có kết quả, không phải lúc nộp.** Bài nộp sát hạn chót nhưng Judge/Submission
  xử lý xong sau hạn chót (hàng đợi dài, retry) có `solved_at` sau hạn và bị tính không đạt. Tắc nghẽn
  thường xảy ra đúng lúc sát hạn nên rủi ro là thật. Giảm thiểu ở v1: giảng viên gia hạn
  `deadlineAt`; ghi rõ trong tài liệu người dùng. Đề xuất cho đội Submission (không tự đổi contract):
  thêm trường `submittedAt` vào `submission.accepted` ở phiên bản sau, rồi sửa LRN-006/LRN-005 qua một
  đặc tả mới.
- **Điểm tính khi đọc thay đổi theo trạng thái Problem.** Tạm giữ một Problem sau hạn chót làm giảm
  tổng điểm tối đa và điểm của lớp; đây là hành vi đặc tả chọn (FR-015), cần ghi trong tài liệu giảng
  viên.
- **Cột `course_id` không dùng:** gây nhầm lẫn cho người đọc schema; ghi chú trong entity rằng cột
  này không được LRN-005 ghi. Bỏ cột là việc dọn dẹp riêng (xem Quyết định phối hợp đã chốt).
- **Đổi khoá ngoại sang `RESTRICT`:** chặn xoá cứng Class có Assignment; phải khớp với plan LRN-004.
- **Hai module cùng hiểu quy tắc hiển thị:** `GetStudentAssignment` (LRN-005) và `AssignmentReader`
  (LRN-006) cùng lọc Problem hiển thị và Assignment hiển thị; lệch nhau sẽ làm điểm và danh sách
  Problem không khớp. Giảm thiểu bằng test hợp đồng ở mục Kiểm thử.
- **Đồng hồ server:** so sánh thời gian dùng đồng hồ Learning; lệch đồng hồ giữa Submission và
  Learning ảnh hưởng biên hạn chót ở mức giây.

## Quyết định phối hợp đã chốt

Không có mâu thuẫn kiến trúc hay yêu cầu đổi contract Submission/Judge. Đã đối chiếu với spec/plan
LRN-003, LRN-004, LRN-006 hiện có trong working tree; các điểm sau đã được chốt theo phê duyệt gộp:

1. **Nơi cài phép tính điểm (đã chọn theo LRN-006).** Plan LRN-006 đặt `AssignmentScoreCalculator` và
   các route điểm (`/api/progress/me/assignments/:id`, `/api/progress/classes/:classId/assignments/:id`,
   quyền `class:read-managed`) trong module `progress`. LRN-005 vì vậy không có grader hay bảng điểm
   riêng (LRN-005-FR-011). Mục tương ứng của plan LRN-006 đã đóng theo hướng này.
2. **Cột `assignments.course_id` tạm giữ dù không dùng.** Bỏ cột ngay sẽ làm vỡ
   `CourseReferenceChecker` của plan LRN-003 (đếm `assignments` theo `course_id`). Sau khi LRN-003 chỉ
   kiểm qua `classes` (đủ, vì Class chỉ thuộc Course `PUBLISHED` còn xoá hẳn chỉ cho Course `DRAFT`),
   việc bỏ cột là migration dọn dẹp riêng ngoài LRN-005.
3. **Khoá ngoại `assignments.class_id` đổi sang `ON DELETE RESTRICT`.** Khớp LRN-004-FR-020 (không xoá
   hẳn Class); plan LRN-004 đã ghi nhận lựa chọn này trong điểm phối hợp của nó.

## Tuân thủ kiến trúc

- **Chiều phụ thuộc:** domain (`Assignment`, value object, `AssignmentPublishValidator`) không import NestJS/TypeORM; use case chỉ phụ thuộc domain và port; controller chỉ
  dịch DTO và gọi một use case; adapter TypeORM hiện thực port và được gắn ở `assignments.module.ts`.
- **Quyền sở hữu dữ liệu:** mọi bảng đều thuộc `bkpractice_learning`. Đọc Class/Enrollment/Problem là
  đọc nội bộ trong cùng bounded context qua port hẹp; LRN-005 không ghi bảng của module
  khác. Định danh người dùng là UUID thuần, không khoá ngoại tới Identity.
- **Không service mới, không `libs/`:** aggregate và entity ở lại Learning.
- **Không trang trí:** không event, không realtime, không cache; mỗi port có lý do là một ranh giới
  module hoặc seam kiểm thử (`Clock`).
- **Tiệm tiến:** chỉ module `assignments` được phân tầng; không xáo trộn thư mục module khác.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.0). Danh sách công việc dẫn xuất từ kế hoạch này nằm ở
> [`tasks.md`](./tasks.md).
