# 2026-10-31 — LRN-003: sửa lỗi sau review (readiness, transaction, lỗi HTTP, DTO, test)

- Author: Claude Code
- Scope: `learning-service/modules/courses` — sửa các lỗi logic và pattern tìm thấy khi review PR
  LRN-003 (nhánh `feat/lrn-003-course-management`). Không đổi spec/plan/tasks, Identity, Gateway hay
  schema DB.

## Spec and plan

- Spec: `.docs/specs/02-learning/courses/spec.md` LRN-003 `1.0` (Approved) — không đổi.
- Plan: `.docs/specs/02-learning/courses/plan.md` — không đổi; bảng "ánh xạ lỗi" (dòng 284–289) được
  dùng làm nguồn cho `CourseExceptionFilter`.
- Tasks: `.docs/specs/02-learning/courses/tasks.md` — không đổi; chưa tick task nào trong lần này.
- Spec status at start: Approved.

## Questions clarified

| Question                                                                    | Conclusion                                                                                                                       | Source                                            |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Có sửa hết các mục review (test, trùng code, `unknown`, reference, import)? | Có.                                                                                                                              | Người dùng, 2026-10-31 ("fix hết")                |
| `hasCourseReferences` làm thật được không khi LRN-004/005 chưa có code?     | Được: bảng `classes` và `assignments` (cột `course_id`) đã có trong migration `1700000003000`/`1700000004000`; chỉ đếm bằng SQL. | Migration; plan dòng 156, 269                     |
| Import `'../../course.tokens'` có đổi sang alias không?                     | Có, đổi sang `@learning/modules/courses/course.tokens`. Import một cấp trong cùng thư mục (`'../errors/...'`) giữ nguyên.        | Quy tắc alias trong CLAUDE.md; yêu cầu người dùng |
| Slug có quy tắc định dạng không?                                            | Không. Spec chỉ yêu cầu duy nhất và ≤ 220 ký tự, nên không thêm quy tắc định dạng.                                               | spec.md FR-003, dòng 38/55                        |

## What was done

- **Publish/Republish kiểm readiness thật.** Trước đây controller truyền `[]` làm trạng thái Problem
  nên điều kiện "có Problem PUBLISHED" không bao giờ được kiểm. Thêm
  `CoursePublishReadinessService` (application/services) lấy trạng thái Problem qua port
  `CourseReferenceChecker.getProblemState()` rồi gọi `CourseReadiness`; hai use case dùng chung, hết
  đoạn code bị sao chép.
- **Soft-delete/Restore đi qua aggregate.** Use case gọi `course.softDelete()`/`course.restore()` rồi
  `save()`, nên guard trạng thái của aggregate có hiệu lực (DRAFT không xoá mềm được; khôi phục Course
  chưa bị xoá bị từ chối). Bỏ hai method `softDelete`/`restore` thừa khỏi `CourseRepository` và adapter.
- **Xoá hẳn:** Course không phải `DRAFT` trả `409` (`InvalidCourseState`) thay vì `404`; kiểm tra tham
  chiếu nằm trong transaction.
- **`hasCourseReferences` thật** trong `infrastructure/persistence/course-reference.checker.ts`
  (`CourseTypeOrmReferenceChecker`, thay adapter inline trong `courses.module.ts`): `EXISTS` trên
  `classes` hoặc `assignments` theo `course_id`.
- **Slug trùng → 409.** `CreateCourseUseCase` kiểm `isSlugAvailable` (trước đây không ai gọi nên trùng
  slug thành `500`), thêm `DuplicateCourseSlugError`; repository đổi vi phạm `23505` thành lỗi này để
  xử lý race.
- **`CourseExceptionFilter` theo bảng plan.** Thêm `401` (thiếu principal), `403`
  (`ForbiddenError`), `404` (`ChapterNotFound`), `400` (`ProblemNotAttachable`), `409`
  (`DuplicateProblemInCourse`, `ConcurrentModification`, slug trùng) và giữ nguyên status của
  `HttpException` (ví dụ `ParseUUIDPipe` → 400). Trước đây các trường hợp này thành `500`. Lỗi `5xx`
  không còn trả message nội bộ cho client.
- **Kiểu trả về rõ ràng + response mapper.** Use case trả `Course`/`CoursePage<Course>`/`AddChapterResult`
  thay vì `unknown`; controller bỏ toàn bộ ép kiểu `as { toSnapshot... }`. Thêm
  `presentation/http/mappers/course-response.mapper.ts` trả primitive và ISO date (trước đây JSON có
  dạng `{ "id": { "value": ... } }` và danh sách trả cả aggregate, lộ field private).
- **Transaction thật + khoá dòng.** Thêm `CourseTypeOrmTransactionContext` (AsyncLocalStorage, cùng ý
  với module `problems`); `CourseTypeOrmTransactionRunner` chạy `dataSource.transaction` và đặt
  `EntityManager` vào context; `CourseTypeOrmRepository` lấy repository từ manager hiện hành thay vì
  `@InjectRepository`. `loadForUpdate` chạy `SELECT ... FOR UPDATE` (`pessimistic_write`) và
  `save`/`hardDelete` bắt buộc có transaction. Mọi use case ghi đưa cả chuỗi nạp → kiểm tra → sửa →
  lưu vào trong `transactionRunner.run`, nên khoá có tác dụng.
- **DTO + Swagger cho controller.** Thêm `dto/course.request.dto.ts` (body, query, reorder; `class-validator`)
  và `dto/course.response.dto.ts`; controller bỏ kiểu body/query inline, thêm `@ApiOperation`/`@ApiOkResponse`
  và các `@Api*Response` lỗi. Filter trả danh sách lỗi chi tiết của `ValidationPipe` (400).
- Đổi import token trong 6 use case sang alias `@learning/...`.
- **Test mới (53 test cho module, 625 toàn repo khi có DB):** `course-lifecycle.use-cases.spec.ts`,
  `course-response.mapper.spec.ts`, `managed-courses.api.e2e.spec.ts` (HTTP thật qua controller + use
  case + repository giả: 401/403/404/400/409, validation DTO, readiness regression, vòng đời đầy đủ,
  header trùng), `testing/course-test.fakes.ts`, và hai integration spec chạy với PostgreSQL:
  `course.typeorm-repository.integration.spec.ts` (round-trip, rollback, `23505`, row lock tuần tự hoá,
  cascade, `hasCourseReferences` với `classes`/`assignments`) và `courses.module.integration.spec.ts`
  (boot `CoursesModule` thật + HTTP, bắt lỗi DI như lỗi `DataSource` trước đây).

## Why these choices

- Service readiness riêng thay vì để mỗi use case tự lấy trạng thái Problem: plan yêu cầu readiness lấy
  trạng thái qua port (plan dòng 111) và hai use case có cùng logic; một chỗ duy nhất để sửa.
- Đi qua aggregate cho soft-delete/restore vì ADR/plan coi `Course` là aggregate sở hữu quy tắc trạng
  thái (FR-007); gọi repository trực tiếp làm guard của aggregate thành code chết.
- Filter ánh xạ theo bảng của plan thay vì tự đặt status, để khớp "Tình huống lỗi" của spec (401/403/404/409).
- Response mapper theo cùng ý với `problem-response.mapper.ts` của module `problems` (mẫu tham chiếu).
- Fake in-memory + HTTP e2e theo cách của `problems-e2e.harness.ts` để chạy được không cần PostgreSQL.

## How the feature works

Ví dụ `POST /api/courses/:id/publish`:

1. Gateway (hoặc test) gửi `x-auth-user-id|roles|permissions`; `@TrustedPrincipal()` đọc header, thiếu
   hoặc sai → `401`.
2. `ManagedCoursesController.publish` gọi `PublishCourseUseCase.execute(principal, id)`.
3. Use case kiểm quyền `course:publish` và vai trò `LECTURER`, nạp Course, kiểm chủ sở hữu.
4. `CoursePublishReadinessService.assertReady` lấy trạng thái từng Problem được tham chiếu rồi chạy
   `CourseReadiness`; thiếu điều kiện → `CourseNotReadyError` (`400` kèm `issues`).
5. `course.publish()` đổi trạng thái; repository `save` trong transaction runner.
6. Controller trả `toCourseResponse(course)`: object phẳng với `status: "PUBLISHED"`.

Đường lỗi: mọi lỗi đi qua `CourseExceptionFilter` theo bảng plan; state không đổi khi lỗi xảy ra
trước `save`.

## Configuration

No configuration change.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build:learning`: qua.
- `pnpm test` không có DB: 84 suite qua, 4 skip (integration), 589 test qua.
- `pnpm test` với PostgreSQL 17 tạm (container `postgres:17-alpine`, DB `courses_test`, port 55439, đã
  xoá sau khi chạy; `TEST_DATABASE_URL` truyền qua biến môi trường, không ghi vào file): 88/88 suite,
  625/625 test qua, gồm cả integration của `problems`.
- `pnpm format:check`: chỉ còn cảnh báo ở `.docs/worked/identity/auth/2026-10-19-identity-authentication.md`
  (có từ trước, không thuộc thay đổi này).
- Not verified: chạy service qua Gateway thật (Gateway seam `x-auth-permissions` vẫn mở), Swagger UI
  hiển thị đúng bằng mắt, tải đồng thời lớn.

## Remaining

- Not done:
  - Chưa tick checkbox trong `tasks.md` LRN-003 và chưa chuyển spec sang `Implemented`/`Verified`:
    cần review của người (đúng quy trình, không tự chuyển trạng thái).
  - Seam quyền Gateway (`x-auth-permissions`) vẫn mở như các spec Learning khác.
  - `AddProblemToChapterUseCase` còn nhận biết lỗi "Problem trùng" qua message của aggregate
    (`'Problem already in course'`); nên đổi sang lỗi domain có kiểu riêng khi sửa aggregate.
  - `CourseReferenceChecker` dùng SQL thô trên `classes`/`assignments`; khi LRN-004/005 có repository
    riêng nên đổi sang port của hai module đó.
- Risks:
  - Hình dạng response đổi (primitive thay vì `{ value }`); chưa có client nào dùng route này, nhưng
    cần báo cho Gateway/Frontend trước khi tích hợp.
  - `loadForUpdate` khoá dòng `courses`; LRN-004 phải khoá `FOR SHARE` khi tạo Class (plan dòng 356–363).
