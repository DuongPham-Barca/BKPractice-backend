# LRN-004 Kế hoạch triển khai Class & Enrollment

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.0` (Approved) của đặc tả LRN-004. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả. Các lựa chọn kỹ thuật nằm ở mục
[Quyết định kỹ thuật đã phê duyệt](#quyết-định-kỹ-thuật-đã-phê-duyệt); các điểm phối hợp và công việc
ngoài phạm vi nằm ở mục
[Điểm phối hợp và công việc ngoài phạm vi](#điểm-phối-hợp-và-công-việc-ngoài-phạm-vi).

## Đặc tả liên quan

- [LRN-004 Class & Enrollment](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`

Đặc tả là nguồn chân lý cho Class, mã tham gia, vòng đời `ACTIVE`/`ARCHIVED`, Enrollment, giới hạn và
phân quyền. Kế hoạch này không thêm hành vi nào ngoài đặc tả.

## Service đích

Service: Learning Service

Class và Enrollment chuyển từ module `courses` sang một module mới `enrollments`
(`apps/learning-service/src/modules/enrollments/`), trong `bkpractice_learning`. Tên module lấy theo
bố cục module ưu tiên của [`learning-service.md`](../../../architecture/learning-service.md)
(`modules/enrollments/`) và thư mục tính năng `specs/02-learning/enrollments/`. Không tạo
microservice mới. Identity cần một migration seed quyền (xem mục Phân quyền). API Gateway không đổi.

## Kiến trúc service bắt buộc

Kiến trúc: **DDD + Hexagonal Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- `learning-service.md` cho phép Class ở cùng Courses "cho tới khi hành vi của chúng biện minh cho
  một module nội bộ rõ hơn". LRN-004 đưa vào vòng đời riêng, mã tham gia, giới hạn sĩ số và quy tắc
  thành viên, không phụ thuộc vòng đời Course; đó là hành vi đủ để tách module. Module mới có đủ bốn
  tầng vì mỗi tầng đều có nội dung thật (aggregate + policy, use case + port, adapter TypeORM,
  controller).
- LRN-004 dùng lại `PrincipalProvider` và `TransactionRunner` của LRN-001 và đọc trạng thái Course do
  LRN-003 thêm. **LRN-001 và LRN-003 phải được triển khai trước.**
- Chỉ dùng DDD tactical. Không thêm bounded context, CQRS, event store hay base repository chung.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `apps/learning-service/src/modules/courses/entities/course.entity.ts` khai báo bốn entity:
  `Course`, `Chapter`, `Classroom` (bảng `classes`) và `Enrollment` (bảng `enrollments`). Module
  `courses` chỉ có thư mục `entities/`; chưa có module NestJS, controller hay provider.
- `Classroom`: `id` uuid, `course` `ManyToOne(() => Course, { onDelete: 'CASCADE' })` qua cột
  `course_id`, `joinCode` varchar(32) `@Index({ unique: true })`, `name` varchar(120), `lecturerId`
  uuid. Không có trạng thái hay mốc thời gian.
- `Enrollment`: `id` uuid, `classroom` `ManyToOne(() => Classroom, { onDelete: 'CASCADE' })` qua cột
  `class_id`, `studentId` uuid, `enrolledAt` (`CreateDateColumn`), `@Index(['classroom',
'studentId'], { unique: true })`.
- Migration `1700000003000-InitialLearningSchema.ts` tạo `classes` với
  `"course_id" uuid NOT NULL REFERENCES "courses"("id") ON DELETE CASCADE` (tên ràng buộc mặc định
  của PostgreSQL: `classes_course_id_fkey`), `"join_code" varchar(32) NOT NULL UNIQUE`; và
  `enrollments` với `"class_id" ... REFERENCES "classes"("id") ON DELETE CASCADE`,
  `UNIQUE ("class_id","student_id")`. Không có index trên `classes.lecturer_id` hay
  `enrollments.student_id`.
- `apps/learning-service/src/modules/assignments/entities/assignment.entity.ts` import `Classroom`
  và `Course` từ `../../courses/entities/course.entity`; `assignments.class_id` là
  `ON DELETE CASCADE`.
- `apps/learning-service/src/modules/learning.entities.ts` đăng ký `Classroom` và `Enrollment` từ
  cùng file entity của `courses`.
- `learning-service.module.ts` chỉ import `ProblemsModule`, `ProgressModule`.
- Gateway (`apps/api-gateway/src/proxy/gateway-proxy.service.ts`) đã chuyển `/api/classes` tới
  `LEARNING_SERVICE_URL`; `api-gateway.module.ts` có `ThrottlerModule` toàn cục 120 request/60 giây.
- Tác động cần xử lý: `ON DELETE CASCADE` từ `classes` tới `courses` nghĩa là nếu LRN-003-FR-018 xoá
  hẳn một Course đang được tham chiếu (do lỗi kiểm tra hoặc đua), cơ sở dữ liệu sẽ âm thầm xoá Class,
  Enrollment, và qua `assignments.class_id` cả Assignment. LRN-004-FR-019 cấm điều đó.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                                                  |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Bảng `classes`, `enrollments` và cột hiện có; `UNIQUE (class_id, student_id)`; `UNIQUE (join_code)`; `PrincipalProvider`, `TransactionRunner` của LRN-001; trạng thái Course và phép chiếu người học của LRN-003; `ValidationPipe` toàn cục; định tuyến `/api/classes` của Gateway                        |
| MODIFY    | Entity `Classroom` (thêm `status`, mốc thời gian; `onDelete: 'RESTRICT'`) và `Enrollment` — chuyển file sang module `enrollments`; `course.entity.ts` (bỏ hai entity này); `learning.entities.ts` và `assignment.entity.ts` (đổi đường import); `learning-service.module.ts` (import `EnrollmentsModule`) |
| CREATE    | Module `enrollments`: aggregate `Classroom`, entity `Enrollment`, value object, `EnrollmentPolicy`; port và use case; adapter TypeORM, adapter sinh mã; controller và DTO; migration Learning `Lrn004ClassEnrollment`; migration Identity `Lrn004ClassPermissions`; test                                  |
| REMOVE    | Không có. Không bỏ bảng hay cột nào                                                                                                                                                                                                                                                                       |

## Thay đổi ở tầng domain

### Ranh giới aggregate

- **`Classroom` là aggregate root**: `ClassId`, `ClassName`, `ClassStatus`, `JoinCode`, `ownerId`
  (UUID ngoài), `courseId` (cố định), `createdAt`, `updatedAt`, `archivedAt`. Tên `Classroom` giữ
  theo entity hiện có để tránh trùng từ khoá `class`.
- **`Enrollment` là một aggregate nhỏ riêng**, khoá theo `(classId, studentId)`, có `enrolledAt`.
  Một Class có tới 500 Enrollment; nạp cả danh sách vào `Classroom` cho mỗi lần tham gia là không cần
  thiết. Giống cách LRN-002 tách `TestCase`.
- Bất biến trải qua nhiều Enrollment (sĩ số ≤ 500, không trùng) được kiểm ở tầng application, trong
  transaction có khoá dòng `classes` (xem mục Đồng thời), cộng với ràng buộc duy nhất của CSDL.

### Value object

| Khái niệm     | Quy tắc                                                                                                   | Truy vết               |
| ------------- | --------------------------------------------------------------------------------------------------------- | ---------------------- |
| `ClassId`     | UUID ổn định                                                                                              | FR-002                 |
| `ClassName`   | Bỏ khoảng trắng hai đầu; 1..120 ký tự                                                                     | FR-002                 |
| `ClassStatus` | `ACTIVE` \| `ARCHIVED`                                                                                    | FR-008                 |
| `JoinCode`    | Đúng 8 ký tự `[A-Z0-9]`; `JoinCode.parse(input)` bỏ khoảng trắng hai đầu và chuyển chữ hoa trước khi kiểm | FR-005, FR-010, AC-023 |

### Hành vi của aggregate `Classroom`

| Phương thức                 | Quy tắc                                                                      | Truy vết               |
| --------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| `Classroom.open(...)`       | Tạo ở `ACTIVE` với mã do `JoinCodeGenerator` cấp                             | FR-003, FR-005         |
| `rename(name)`              | Chỉ khi `ACTIVE`, ngược lại `InvalidClassState`                              | FR-007, FR-009         |
| `replaceJoinCode(code)`     | Chỉ khi `ACTIVE`                                                             | FR-006, FR-009         |
| `archive(now)`              | `ACTIVE` → `ARCHIVED`, đặt `archivedAt`; trạng thái khác `InvalidClassState` | FR-008, AC-013         |
| `restore()`                 | `ARCHIVED` → `ACTIVE`, xoá `archivedAt`; giữ nguyên mã                       | FR-008, FR-009, AC-012 |
| `assertMembershipMutable()` | Ném `InvalidClassState` khi `ARCHIVED` (dùng cho tham gia, rời, gỡ)          | FR-009, AC-011         |
| `isOwnedBy(userId)`         | So `ownerId`                                                                 | FR-012, FR-015         |

Không có phương thức đổi `courseId` (FR-004).

### Domain service `EnrollmentPolicy`

`assertCanJoin(classroom, studentId, currentCount)`: Class phải `ACTIVE` (`InvalidClassState`),
người gọi không phải chủ sở hữu (`OwnerCannotEnroll`), `currentCount < 500` (`ClassFull`). Kiểm tra
vai trò `STUDENT` thuộc phân quyền ở tầng application, không nằm ở đây. Truy vết: FR-010, FR-012,
FR-018; AC-009, AC-011, AC-019.

### Lỗi domain

`InvalidClassState`, `OwnerCannotEnroll`, `ClassFull`, `InvalidClassName`, `InvalidJoinCodeFormat`.
Domain không import NestJS hay TypeORM.

## Tầng application / Use case

Mọi use case thay đổi dữ liệu chạy trong `TransactionRunner` và nạp Class bằng `loadForUpdate`.
Kiểm tra quyền và sở hữu qua `ClassAuthorization` (một service application nhỏ dùng principal từ
`PrincipalProvider`) trước khi đọc hay ghi dữ liệu nghiệp vụ.

| Use case              | Người gọi / Quyền                    | Luồng chính                                                                                                                                                                                                                                          | Truy vết                                             |
| --------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `CreateClass`         | `class:create`                       | Trong `TransactionRunner`, `CourseAvailabilityReader.isOpenForClasses(courseId)` (khoá `FOR SHARE` dòng `courses`) phải đúng (sai thì `CourseNotAvailable` → `400`); sinh mã; lưu; chèn trùng `join_code` thì sinh lại, tối đa 5 lần                 | FR-003, FR-005; AC-001, AC-002                       |
| `RenameClass`         | `class:update` + sở hữu              | `loadForUpdate`; `rename`; lưu                                                                                                                                                                                                                       | FR-007, FR-009; AC-011, AC-024                       |
| `RegenerateJoinCode`  | `class:update` + sở hữu              | `loadForUpdate`; `replaceJoinCode(new)`; lưu với cùng vòng retry khi trùng                                                                                                                                                                           | FR-006; AC-010                                       |
| `ArchiveClass`        | `class:archive` + sở hữu             | `loadForUpdate`; `archive(now)`; lưu                                                                                                                                                                                                                 | FR-008, FR-009; AC-011, AC-013                       |
| `RestoreClass`        | `class:restore` + sở hữu             | `loadForUpdate`; `restore()`; lưu; không đọc trạng thái Course                                                                                                                                                                                       | FR-008; AC-012, AC-013                               |
| `ListManagedClasses`  | `class:read-managed`                 | Chỉ Class có `ownerId` = principal; lọc trạng thái; phân trang ≤ 100; kèm số sinh viên và cờ Course khả dụng                                                                                                                                         | FR-015, FR-018                                       |
| `GetManagedClass`     | `class:read-managed` + sở hữu        | Biểu diễn quản lý gồm mã tham gia, số sinh viên, `courseId`, cờ Course khả dụng                                                                                                                                                                      | FR-015, FR-017                                       |
| `ListClassMembers`    | `class:read-managed` + sở hữu        | Trang ≤ 100 theo `(enrolled_at, student_id)`, kèm tổng số                                                                                                                                                                                            | FR-015; AC-022                                       |
| `RemoveClassMember`   | `class:manage-members` + sở hữu      | `loadForUpdate`; `assertMembershipMutable`; xoá Enrollment `(classId, studentId)`; không có thì `404`                                                                                                                                                | FR-014; AC-011, AC-015                               |
| `JoinClass`           | Vai trò `STUDENT`                    | `JoinCode.parse`; `loadByJoinCodeForUpdate` (không thấy → `ClassNotFound` → `404`); `assertMembershipMutable` (`ARCHIVED` → `409`); đã có Enrollment → trả về, `created = false`; ngược lại `EnrollmentPolicy.assertCanJoin` với `countByClass`; tạo | FR-010–FR-012, FR-018; AC-005–AC-009, AC-019, AC-023 |
| `LeaveClass`          | Thành viên sinh viên                 | `loadForUpdate`; không có Enrollment của principal → `404`; `assertMembershipMutable`; xoá                                                                                                                                                           | FR-013; AC-011, AC-014                               |
| `ListEnrolledClasses` | Người dùng đã xác thực               | Chỉ Class có Enrollment của principal; mọi trạng thái; phân trang ≤ 100                                                                                                                                                                              | FR-016                                               |
| `GetMemberClass`      | Chủ sở hữu hoặc sinh viên đã đăng ký | Không phải thành viên → `404`; biểu diễn thành viên; tóm tắt Course chỉ khi `CourseAvailabilityReader` báo khả dụng                                                                                                                                  | FR-016, FR-017; AC-016–AC-018                        |

Thứ tự kiểm tra trong `JoinClass` là: vai trò `STUDENT` (`403`) → định dạng mã (`400`) → tìm Class
theo mã (`404`) → Class phải `ACTIVE` (`409`) → đã là thành viên (thành công, lặp lại) →
`EnrollmentPolicy` (`409`). Class `ARCHIVED` luôn từ chối tham gia, kể cả với thành viên hiện có
(FR-009, FR-011, AC-011).

`LeaveClass` kiểm tra Enrollment trước trạng thái Class, để người không phải thành viên luôn nhận
`404` (không lộ trạng thái Class).

### Port

| Port                       | Trách nhiệm                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClassroomRepository`      | `insert`, `save`, `loadForUpdate(id)`, `loadByJoinCodeForUpdate(code)`, `findById(id)`, `listByOwner(ownerId, filter, page)`; báo `JoinCodeTaken` khi vi phạm `UNIQUE (join_code)`                               |
| `EnrollmentRepository`     | `find(classId, studentId)`, `insert`, `delete`, `countByClass(classId)`, `countByClasses(ids)`, `listByClass(classId, page)`, `listClassesForStudent(studentId, page)`                                           |
| `CourseAvailabilityReader` | `isOpenForClasses(courseId)`: Course tồn tại, `PUBLISHED`, chưa xoá mềm, khoá `SELECT ... FOR SHARE` tới hết transaction; `loadLearnerSummaries(courseIds)`: tóm tắt (id, slug, tiêu đề) chỉ cho Course khả dụng |
| `JoinCodeGenerator`        | `generate(): JoinCode` bằng CSPRNG; là port để test domain/application xác định được                                                                                                                             |
| `PrincipalProvider`        | (LRN-001) `userId`, `roles`, `permissions` từ header Gateway                                                                                                                                                     |
| `TransactionRunner`        | (LRN-001) transaction bao quanh nạp + kiểm tra + lưu                                                                                                                                                             |

Không thêm port nào khác.

## Lưu trữ

- Tái dùng `classes` và `enrollments`. Chủ sở hữu ánh xạ tới cột `lecturer_id` hiện có; không đổi
  tên cột.
- Rời lớp và gỡ sinh viên xoá dòng `enrollments`. Enrollment là tư cách thành viên hiện tại, không
  phải nội dung đã công khai, nên quy tắc "không xoá cứng nội dung đã công khai" không áp dụng; tiến
  độ nằm ở bảng `progress` theo `(user_id, problem_id)` nên không mất khi rời lớp.
- `CourseAvailabilityReader` là adapter TypeORM trong module `enrollments` đọc entity `Course` (cùng
  bounded context, cùng `bkpractice_learning`), chỉ chọn `id`, `slug`, `title` với điều kiện trạng
  thái `PUBLISHED` và dấu xoá mềm rỗng theo đúng cột mà migration LRN-003 thêm. Nếu LRN-003 cung cấp
  một truy vấn phép chiếu người học dùng lại được, adapter gọi truy vấn đó thay vì tự viết điều kiện.
- Truy vấn danh sách sinh viên sắp theo `(enrolled_at, student_id)`; danh sách Class quản lý theo
  `(created_at DESC, id)`; danh sách Class của sinh viên theo `(enrolled_at DESC, class_id)`.
- Số sinh viên tính bằng `COUNT(*)` trên `enrollments` theo `class_id` (có index từ ràng buộc duy
  nhất); với danh sách, một truy vấn `GROUP BY class_id` cho cả trang.

### Đồng thời

- Mọi thao tác thay đổi trên một Class chạy `SELECT ... FROM classes WHERE id = $1 FOR UPDATE` (hoặc
  `WHERE join_code = $1 FOR UPDATE` với `JoinClass`) trong cùng transaction. Cách này tuần tự hoá
  tham gia, rời, gỡ, lưu trữ và khôi phục trên cùng một Class, nên chỗ thứ 500 chỉ cấp cho một người
  (AC-019) và không có ai tham gia lọt sau khi lưu trữ.
- `CreateClass` khoá dòng `courses` bằng `FOR SHARE` khi kiểm Course, theo yêu cầu ở mục Phụ thuộc của
  kế hoạch LRN-003, để việc tạo Class không đua với xoá hẳn, tạm giữ hay xoá mềm Course. Khoá ngoại
  `RESTRICT` là lưới an toàn thứ hai.
- `UNIQUE (class_id, student_id)` là lưới an toàn cho tham gia trùng; vi phạm được ánh xạ thành kết
  quả "đã là thành viên".
- Tạo lại mã: mã cũ bị ghi đè trong cùng dòng, nên mã cũ mất hiệu lực ngay khi transaction commit
  (FR-006).

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_learning`.

- `classes`:
  - Thêm enum `classes_status_enum` (`ACTIVE`, `ARCHIVED`) và cột `status` NOT NULL DEFAULT
    `'ACTIVE'`.
  - Thêm `created_at` timestamptz NOT NULL DEFAULT `now()`, `updated_at` timestamptz NOT NULL DEFAULT
    `now()`, `archived_at` timestamptz NULL.
  - Thêm `CHECK ((status = 'ARCHIVED') = (archived_at IS NOT NULL))`.
  - Đổi khoá ngoại `course_id` từ `ON DELETE CASCADE` sang `ON DELETE RESTRICT` (FR-019).
  - Thêm index `(lecturer_id, created_at)`.
- `enrollments`: thêm index `(student_id, enrolled_at)`. Giữ `ON DELETE CASCADE` tới `classes` vì
  không còn đường xoá hẳn Class nào (FR-020); đổi nó không có tác dụng quan sát được.
- Không thêm `CHECK` định dạng cho `join_code`: dữ liệu cũ có thể không theo định dạng mới; định dạng
  do value object `JoinCode` bảo đảm cho mọi mã sinh ra từ nay. Độ dài cột varchar(32) giữ nguyên.
- `assignments.class_id` (`ON DELETE CASCADE`) và `assignments.course_id` (`ON DELETE SET NULL`)
  thuộc LRN-005; không đổi ở đây.

Không có khoá ngoại hay truy vấn xuyên service. `lecturer_id` và `student_id` vẫn là UUID thuần.

## Migration

`apps/learning-service/src/database/migrations/<timestamp>-Lrn004ClassEnrollment.ts`, chạy sau
migration LRN-001 và LRN-003, `synchronize: false`.

- **Up:** tạo `classes_status_enum`; thêm `status`, `created_at`, `updated_at`, `archived_at` (dòng cũ
  nhận `ACTIVE` và `now()`); thêm CHECK; `DROP CONSTRAINT "classes_course_id_fkey"` rồi
  `ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON
DELETE RESTRICT`; tạo hai index.
- **Down:** bỏ hai index; khôi phục khoá ngoại với `ON DELETE CASCADE`; bỏ CHECK, bỏ bốn cột, bỏ enum.
  Down làm mất trạng thái lưu trữ: mọi Class `ARCHIVED` trở thành Class không có trạng thái (tức lại
  nhận tham gia khi có code cũ); ghi cảnh báo này trong tài liệu triển khai.
- Tên ràng buộc `classes_course_id_fkey` là tên mặc định PostgreSQL sinh cho cột khai báo
  `REFERENCES` nội tuyến; kiểm lại trên cơ sở dữ liệu cách ly trước khi viết migration.
- Kiểm chứng bằng `pnpm migration:run:learning` / `pnpm migration:revert:learning` trên cơ sở dữ liệu
  cách ly có sẵn dòng `classes`, `enrollments`, và thử `DELETE FROM courses` với Course đang được
  tham chiếu (phải bị từ chối).

Migration Identity: xem mục Phân quyền.

## API

Tiền tố `/api/classes` đã được Gateway chuyển tới Learning. Tất cả route cần Bearer token.

| Method + route                               | Use case              | Phản hồi                                                              |
| -------------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| `POST /api/classes`                          | `CreateClass`         | `201` biểu diễn quản lý                                               |
| `GET /api/classes/managed`                   | `ListManagedClasses`  | `200` trang biểu diễn quản lý (không kèm mã tham gia trong danh sách) |
| `GET /api/classes/managed/:id`               | `GetManagedClass`     | `200` biểu diễn quản lý đầy đủ                                        |
| `GET /api/classes/managed/:id/members`       | `ListClassMembers`    | `200` trang `{ studentId, enrolledAt }` + `total`                     |
| `PATCH /api/classes/:id`                     | `RenameClass`         | `200` biểu diễn quản lý                                               |
| `POST /api/classes/:id/join-code`            | `RegenerateJoinCode`  | `200` `{ joinCode }`                                                  |
| `POST /api/classes/:id/archive`              | `ArchiveClass`        | `200` biểu diễn quản lý                                               |
| `POST /api/classes/:id/restore`              | `RestoreClass`        | `200` biểu diễn quản lý                                               |
| `DELETE /api/classes/:id/members/:studentId` | `RemoveClassMember`   | `204`                                                                 |
| `POST /api/classes/join`                     | `JoinClass`           | `201` lần tham gia mới, `200` lần lặp lại; biểu diễn thành viên       |
| `GET /api/classes/enrolled`                  | `ListEnrolledClasses` | `200` trang biểu diễn thành viên                                      |
| `GET /api/classes/:id`                       | `GetMemberClass`      | `200` biểu diễn thành viên                                            |
| `DELETE /api/classes/:id/enrollment`         | `LeaveClass`          | `204`                                                                 |

- Các route tĩnh `join`, `enrolled`, `managed` phải khai báo trước route có `:id`; `:id` và
  `:studentId` dùng `ParseUUIDPipe` (sai định dạng → `400`).
- Danh sách quản lý bỏ mã tham gia để giảm chỗ mã xuất hiện; mã chỉ có ở chi tiết quản lý, phản hồi
  tạo, và phản hồi tạo lại mã (SR-004).
- Không có route `DELETE /api/classes/:id` (FR-020).
- Swagger mô tả mọi route; ví dụ dùng mã tham gia giả rõ ràng (ví dụ `ABCD1234`).

## DTO / Kiểm tra dữ liệu

- `CreateClassRequestDto`: `name` (string, trim, 1..120), `courseId` (UUID).
- `RenameClassRequestDto`: `name` (string, trim, 1..120). Không có `courseId` (AC-024).
- `JoinClassRequestDto`: `joinCode` (string); kiểm định dạng qua `JoinCode.parse` ở domain để quy
  tắc trim/chữ hoa nằm một chỗ.
- `ListManagedClassesQueryDto`: `page` (int ≥ 1, mặc định 1), `pageSize` (int 1..100, mặc định 20),
  `status` (`ACTIVE` \| `ARCHIVED`, tuỳ chọn). `ListClassMembersQueryDto` và
  `ListEnrolledClassesQueryDto`: `page`, `pageSize`.
- `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`) chặn `lecturerId`, `ownerId`,
  `studentId`, `joinCode`, `status`, mốc thời gian trong body tạo/đổi tên (SR-005, AC-021).
- Response DTO: `ManagedClassResponseDto` (`id`, `name`, `status`, `joinCode?`, `courseId`,
  `courseAvailable`, `memberCount`, `createdAt`, `updatedAt`, `archivedAt`), `ClassMemberResponseDto`
  (`studentId`, `enrolledAt`), `MemberClassResponseDto` (`id`, `name`, `status`, `ownerId`,
  `course: { id, slug, title } | null`, `enrolledAt | null` — `null` khi người gọi là chủ sở hữu),
  `JoinCodeResponseDto`, `PageResponseDto<T>` (`items`, `page`, `pageSize`, `total`). Ánh xạ tường
  minh; `MemberClassResponseDto` không có trường nào về sĩ số hay mã (SR-003, SR-004).

## Phân quyền

- Principal lấy từ `PrincipalProvider` của LRN-001: `x-auth-user-id`, `x-auth-roles`,
  `x-auth-permissions` do Gateway đặt; header thiếu thì coi là tập rỗng (ID-003-FR-022).
  `PrincipalProvider` được export từ module sở hữu nó để `EnrollmentsModule` import, không sao chép.
- `ClassAuthorization`:
  - `requirePermission(code)`: thiếu → `403`.
  - `requireOwner(classroom)`: `ownerId` ≠ principal → `403` (theo quy ước LRN-001/LRN-003 cho thao tác
    quản lý).
  - `requireStudentRole()`: `x-auth-roles` không chứa `STUDENT` → `403`.
  - `requireMember(classroom)`: không phải chủ sở hữu và không có Enrollment → `404`.
- `ADMIN` không có nhánh đặc biệt nào.
- **Seed quyền ở Identity:** migration mới
  `apps/identity-service/src/database/migrations/<timestamp>-Lrn004ClassPermissions.ts`, chạy sau
  `Id003PermissionCatalog`, `synchronize: false`:
  - Up: chèn `class:create`, `class:read-managed`, `class:update`, `class:archive`, `class:restore`,
    `class:manage-members` vào `permissions` (bỏ qua nếu đã có); gán cả sáu cho vai trò `LECTURER`
    trong `role_permissions` (bỏ qua nếu đã có). Không gán cho `STUDENT` hay `ADMIN`.
  - Down: xoá đúng sáu phép gán và sáu mã đã chèn.
  - Mọi mã khớp mẫu `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$`, ≤ 64 ký tự (ID-003-FR-017).
  - Kiểm chứng bằng `pnpm migration:run:identity` / `pnpm migration:revert:identity`; access token mới
    của `LECTURER` chứa sáu mã này.

## Messaging / Sự kiện

N/A. LRN-004 không phát và không tiêu thụ event (đặc tả, mục Đầu ra). Không đụng contract
`submission.accepted`.

## Realtime

N/A. Đặc tả không yêu cầu thông báo realtime khi tham gia hay rời lớp.

## Adapter hạ tầng

- `infrastructure/persistence/classroom.repository.ts`: adapter TypeORM của `ClassroomRepository`,
  khoá pessimistic, ánh xạ lỗi `23505` trên `join_code` thành `JoinCodeTaken`.
- `infrastructure/persistence/enrollment.repository.ts`: adapter TypeORM của `EnrollmentRepository`,
  ánh xạ lỗi `23505` trên `(class_id, student_id)` thành "đã là thành viên".
- `infrastructure/persistence/course-availability.reader.ts`: adapter TypeORM đọc `courses`.
- `infrastructure/join-code/crypto-join-code.generator.ts`: dùng `crypto.randomInt(36)` của Node cho
  từng ký tự (không dùng `Math.random`).
- Entity `Classroom`, `Enrollment` chuyển sang `modules/enrollments/entities/class.entity.ts`, giữ tên
  class, tên bảng, tên cột.
- Không thêm adapter HTTP hay messaging.

## Cấu hình

No configuration change. Không thêm biến môi trường; giới hạn 500 và 100 là hằng số domain theo đặc
tả. Không đổi `.env.example`, Docker, Gateway.

## Xử lý lỗi

| Điều kiện                                                                  | Ánh xạ                     |
| -------------------------------------------------------------------------- | -------------------------- |
| Thiếu/sai token                                                            | `401` qua Gateway          |
| Thiếu quyền, không phải chủ sở hữu (quản lý), tham gia khi không `STUDENT` | `403`                      |
| Class không tồn tại; không phải thành viên (phía thành viên)               | `404`                      |
| Mã tham gia không khớp Class nào                                           | `404`, một thông báo chung |
| Gỡ/rời khi không có Enrollment                                             | `404`                      |
| `InvalidClassState` (tham gia/sửa/gỡ/rời khi `ARCHIVED`, bước chuyển sai)  | `409`                      |
| `OwnerCannotEnroll`, `ClassFull`                                           | `409`                      |
| `CourseNotAvailable` khi tạo                                               | `400`, thông báo chung     |
| `InvalidClassName`, `InvalidJoinCodeFormat`, UUID sai, phân trang sai      | `400`                      |
| Trùng `join_code` sau 5 lần sinh lại                                       | `500`, log cảnh báo        |

Không đưa vào cấu trúc lỗi mới; dùng các exception HTTP chuẩn của NestJS như LRN-001.

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-001  | Quyền, vai trò, sở hữu, thành viên và trạng thái kiểm tra trong use case, không ở controller                                                |
| SR-002  | Principal chỉ từ `PrincipalProvider`; DTO không có trường chủ sở hữu/sinh viên                                                              |
| SR-003  | `MemberClassResponseDto` không có sĩ số; danh sách sinh viên chỉ qua route quản lý có `requireOwner`                                        |
| SR-004  | Mã chỉ trong phản hồi quản lý; không log body `JoinClass` hay mã; mã sai và mã cũ cùng `404`; throttling toàn cục của Gateway hạn chế dò mã |
| SR-005  | DTO danh sách cho phép + `forbidNonWhitelisted`                                                                                             |
| SR-006  | `CourseNotAvailable` dùng một thông báo cho mọi lý do; tóm tắt Course chỉ từ `loadLearnerSummaries`                                         |
| SR-007  | Chỉ datasource Learning; `lecturer_id`, `student_id` là UUID thuần                                                                          |
| SR-008  | Thiếu principal/quyền/vai trò thì từ chối trước khi đọc dữ liệu                                                                             |

Không gian mã 36⁸ ≈ 2,8 × 10¹²; với giới hạn 120 request/phút mỗi client của Gateway, dò mã ngẫu nhiên
không khả thi trong thực tế.

## Chiến lược kiểm thử

- **Unit (domain, không cần PostgreSQL):** `ClassName`, `JoinCode.parse` (chữ thường, khoảng trắng,
  ký tự lạ, độ dài; AC-023); vòng đời `archive`/`restore` và bước chuyển sai (AC-012, AC-013); các
  thao tác bị chặn khi `ARCHIVED` (AC-011); `EnrollmentPolicy` với chủ sở hữu, sĩ số 499/500 (AC-009,
  AC-019).
- **Unit (application, port giả):** mỗi use case với quyền/sở hữu/vai trò (AC-003, AC-008), Course
  không khả dụng (AC-002), tham gia lặp lại (AC-006), mã cũ sau khi tạo lại (AC-010), rời và gỡ
  (AC-014, AC-015), biểu diễn thành viên không lộ mã/sĩ số và ẩn Course không khả dụng (AC-016,
  AC-018), vòng retry khi trùng mã, và thất bại không để lại thay đổi dở dang.
- **Integration (lưu trữ):** khoá dòng tuần tự hoá nhiều lần tham gia vào chỗ cuối (AC-019);
  `UNIQUE (class_id, student_id)` với hai lần tham gia đồng thời; `DELETE FROM courses` bị
  `RESTRICT` chặn (AC-020); migration up/down với dữ liệu mẫu; migration Identity up/down.
- **API/E2E:** luồng đầy đủ tạo → lấy mã → sinh viên tham gia → xem → rời; `401` (AC-004); trường lạ
  bị từ chối (AC-021, AC-024); người ngoài lớp nhận `404` (AC-017); chủ sở hữu xem danh sách phân trang
  (AC-022); xoá hẳn Course nháp của LRN-003 bị từ chối khi có Class (AC-020); token `LECTURER` mới có
  sáu quyền `class:*`.
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID hiện có.
- Log kết quả các thao tác (tạo, đổi tên, tạo lại mã, lưu trữ, khôi phục, tham gia, rời, gỡ) kèm
  `classId`, `actorId`, request ID và kết quả; tham gia thất bại chỉ log lý do (`not_found`,
  `archived`, `full`, `owner`), không log mã tham gia hay body.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                                  | Kiểm chứng                     |
| -------------- | ----------------------------------------------------------------- | ------------------------------ |
| FR-001, FR-002 | Module `enrollments`; `ClassId`, `ClassName`                      | Kiến trúc, unit                |
| FR-003, FR-004 | `CreateClass`, `CourseAvailabilityReader`; không có setter Course | API; AC-001, 002, 024          |
| FR-005, FR-006 | `JoinCode`, `JoinCodeGenerator`, `RegenerateJoinCode`             | Unit/API; AC-001, 010          |
| FR-007         | `RenameClass`                                                     | API; AC-011                    |
| FR-008, FR-009 | `archive`/`restore`, `assertMembershipMutable`                    | Unit/API; AC-011, 012, 013     |
| FR-010–FR-012  | `JoinClass`, `EnrollmentPolicy`, `requireStudentRole`             | Unit/API; AC-005–009, 023      |
| FR-013, FR-014 | `LeaveClass`, `RemoveClassMember`                                 | API; AC-014, 015               |
| FR-015         | `ListManagedClasses`, `GetManagedClass`, `ListClassMembers`       | API; AC-022                    |
| FR-016, FR-017 | `ListEnrolledClasses`, `GetMemberClass`, `loadLearnerSummaries`   | API; AC-016, 017, 018          |
| FR-018         | `ClassFull`, khoá dòng; `pageSize ≤ 100`                          | Integration; AC-019, 022       |
| FR-019         | Khoá ngoại `ON DELETE RESTRICT`                                   | Integration/API; AC-020        |
| FR-020         | Không có route/use case xoá Class                                 | Rà soát                        |
| FR-021         | Transaction + khoá dòng; đọc không ghi                            | Unit/integration               |
| FR-022         | Module không ghi bảng của Course, Assignment, Progress            | Rà soát                        |
| SR-001–SR-008  | Mục Bảo mật                                                       | Test bảo mật; AC-003, 016, 021 |

## Thứ tự triển khai

1. Xác nhận LRN-001 (`PrincipalProvider`, `TransactionRunner`) và LRN-003 (trạng thái và dấu xoá mềm
   của Course) đã triển khai; xác nhận ID-003 0.4 (`x-auth-permissions`) đã có.
2. Domain: value object, aggregate `Classroom`, `Enrollment`, `EnrollmentPolicy`; unit test.
3. Chuyển entity sang module `enrollments`, cập nhật import; migration LRN-004; kiểm chứng up/down.
4. Migration seed quyền ở Identity; kiểm chứng up/down và token.
5. Adapter lưu trữ, adapter đọc Course, adapter sinh mã; integration test.
6. `ClassAuthorization` và các use case; unit test application.
7. DTO, controller, Swagger, `EnrollmentsModule` và đăng ký trong `learning-service.module.ts`.
8. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **LRN-001 đã triển khai**: `PrincipalProvider`, `TransactionRunner`, quy ước lỗi.
- **LRN-003 đã triển khai**: cột trạng thái và dấu xoá mềm của `courses`, phép chiếu người học. Việc
  kiểm tra "không bị Class tham chiếu" của LRN-003-FR-018 đọc bảng `classes`; khi LRN-003 viết
  `plan.md`, kiểm tra đó nên đi qua một truy vấn đếm tường minh trên `classes` và bắt lỗi `23503` từ
  khoá ngoại `RESTRICT` làm lưới an toàn. LRN-004 không sửa tài liệu của LRN-003.
- **ID-003 0.4** (claim `permissions`, header `x-auth-permissions`) và migration
  `Id003PermissionCatalog`.
- **LRN-005** dùng `classes` và `enrollments`; nó phải import entity từ vị trí mới và tự quyết định
  hành vi Assignment khi Class `ARCHIVED`.
- **LRN-006** dùng `class:read-managed` + sở hữu và bảng `enrollments` để xem tiến độ theo lớp.

## Rủi ro

- **Đổi chỗ entity** (`courses` → `enrollments`) chạm vào file mà LRN-003 và LRN-005 cũng sửa; cần
  làm sau LRN-003 và báo cho người làm LRN-005.
- **Down migration** mất trạng thái `ARCHIVED` và trả khoá ngoại về `CASCADE`.
- **Danh sách sinh viên chỉ có UUID**: giảng viên không thấy tên sinh viên cho tới khi có một đường
  tra cứu hồ sơ ở Identity (xem mục Điểm phối hợp và công việc ngoài phạm vi).
- **Mã bị chia sẻ ra ngoài lớp**: ai có vai trò `STUDENT` và biết mã đều tham gia được; giảm thiểu
  bằng tạo lại mã và gỡ sinh viên, đúng như đặc tả.
- **Quyền mới chỉ có ở token mới** (ID-003-FR-023): giảng viên phải đăng nhập lại hoặc làm mới phiên
  sau khi migration seed chạy.

## Tuân thủ kiến trúc

- **Chiều phụ thuộc:** `presentation` (controller, DTO) → `application` (use case, `ClassAuthorization`,
  port) → `domain` (`Classroom`, `Enrollment`, value object, `EnrollmentPolicy`). `infrastructure`
  hiện thực port và được gắn ở `EnrollmentsModule`. Domain không import framework.
- **Quyền sở hữu dữ liệu:** Chỉ `bkpractice_learning`. Quan hệ `classes` → `courses` và `enrollments`
  → `classes` là quan hệ nội bộ Learning; `lecturer_id`, `student_id` là ID ngoài của Identity, không
  có khoá ngoại xuyên service.
- **Ranh giới module:** `enrollments` đọc Course qua port `CourseAvailabilityReader`, không gọi repository
  nội bộ của module `courses`; không có service Learning dùng chung.
- **`libs/`:** Không thêm entity, use case hay kiểu nghiệp vụ Class vào `libs/`.
- **Identity:** Chỉ thêm một migration seed dữ liệu tĩnh theo ID-003-FR-017; không đổi mã nguồn
  Identity.
- **Ngoại lệ:** Không có.

## Quyết định kỹ thuật đã phê duyệt

Chủ sở hữu sản phẩm phê duyệt gộp ngày 2026-09-30:

1. **Module:** tách `enrollments` khỏi `courses`, theo bố cục module của `learning-service.md`.
2. **Enrollment là aggregate riêng**, bất biến sĩ số kiểm dưới khoá dòng `classes`.
3. **Khoá ngoại `classes.course_id` đổi sang `ON DELETE RESTRICT`** để bảo đảm FR-019 ở tầng CSDL.
4. **Rời lớp và gỡ sinh viên xoá dòng `enrollments`**; không lưu lịch sử thành viên ở v1.
5. **Không thêm CHECK định dạng cho `join_code`**; định dạng do domain bảo đảm.
6. **Mã tham gia sinh bằng `crypto.randomInt`**, retry tối đa 5 lần khi trùng.
7. **Tham gia lặp lại trả `200`, lần đầu trả `201`.**

## Điểm phối hợp và công việc ngoài phạm vi

Không điểm nào dưới đây chặn việc triển khai LRN-004.

1. **Danh mục quyền đã căn chỉnh.** ID-003-AC-017/018 đã được làm rõ ngày 2026-09-30: token chứa hợp
   các quyền mà đặc tả Approved gán cho vai trò. Seed `course:*` và `class:*` vì vậy không mâu thuẫn
   với tám quyền `problem:*` ban đầu.
2. **Hiển thị tên sinh viên trong danh sách lớp.** Learning chỉ có `student_id`; Identity hiện chưa có
   route nào cho giảng viên tra hồ sơ người khác. Đặc tả LRN-004 để việc này ngoài phạm vi; nếu cần,
   phải có một đặc tả Identity (ví dụ tra cứu hồ sơ công khai theo danh sách ID).
3. **Khoá ngoại Assignment đã được phối hợp.** LRN-005 chọn đổi `assignments.class_id` sang
   `ON DELETE RESTRICT`, khớp FR-020 và quyết định khoá ngoại của kế hoạch này.
4. **Tên module đã được phối hợp.** Module đích là `enrollments` theo `learning-service.md`; LRN-005
   dùng entity Class/Enrollment từ module này.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.0). Danh sách công việc dẫn xuất từ kế hoạch này nằm ở
> [`tasks.md`](./tasks.md).
