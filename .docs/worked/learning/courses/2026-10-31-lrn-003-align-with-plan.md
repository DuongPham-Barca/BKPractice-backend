# 2026-10-31 — LRN-003: đưa code về đúng plan (rò rỉ Problem, FR-019, Markdown, migration, API)

- Author: Claude Code
- Scope: `learning-service/modules/courses` và `modules/problems` (chỉ phần export `ProblemReferenceReader`),
  migration Learning mới. Không đổi spec/plan, Identity hay Gateway. Là phần tiếp của
  [`2026-10-31-lrn-003-review-fixes.md`](./2026-10-31-lrn-003-review-fixes.md), xử lý các điểm code lệch plan
  mà lần kiểm toán `tasks.md` tìm ra.

## Spec and plan

- Spec: `.docs/specs/02-learning/courses/spec.md` LRN-003 `1.0` (Approved) — không đổi.
- Plan: `.docs/specs/02-learning/courses/plan.md` — không đổi; làm theo mục Aggregate, Use case, Port, Lưu
  trữ, Thay đổi cơ sở dữ liệu, API, DTO, Xử lý lỗi.
- Tasks: `.docs/specs/02-learning/courses/tasks.md` — tick thêm 15 task (xem Verification).
- Spec status at start: Approved. Vẫn Approved (cần review của người, T030).

## Questions clarified

| Question                                                      | Conclusion                                                                                                                             | Source                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Sửa code theo plan hay sửa plan theo code?                    | Sửa code theo plan (mục 1–5: rò rỉ Problem, FR-019, Markdown, migration, API).                                                         | Người dùng, 2026-10-31 ("fix hết")          |
| Sửa migration `1700000008000` đã chạy hay thêm migration mới? | Thêm migration mới `1700000009000`; không sửa migration đã áp dụng trên các môi trường dev.                                            | Quy tắc migration của repo; an toàn dữ liệu |
| Có giữ route `/preview` và `/hard` không?                     | Bỏ: plan chỉ có 18 route, `DELETE /:id` xử lý cả xoá hẳn nháp lẫn xoá mềm.                                                             | plan.md bảng API; FR-007, FR-018            |
| Courses đọc Problem thế nào để lọc hiển thị?                  | Chỉ qua `ProblemReferenceReader` (tập ID); không join trực tiếp bảng `problems` từ `courses`.                                          | LRN-003-T002, T018; plan mục Port           |
| Mẫu (pattern) của slug Course là gì?                          | **Chưa chốt**: spec chỉ nêu duy nhất, ≤ 220 ký tự; plan ghi "đúng mẫu" mà không nêu mẫu. Chưa thêm quy tắc, chờ chủ sở hữu quyết định. | spec.md FR-002; plan.md bảng `CourseSlug`   |
| `TransactionRunner` tái dùng của LRN-001 hay có port riêng?   | **Chưa chốt**: plan ghi "(LRN-001)" nhưng T029 cấm import nội bộ `problems`. Hiện `courses` có port riêng cùng hình dạng.              | plan.md bảng Port; tasks T009, T029         |

## What was done

- **Không lộ Problem chưa công khai (FR-010, AC-004/010/020).** Thêm `CourseViewAssembler`: biểu diễn
  người học chỉ chứa Problem `PUBLISHED` chưa xoá (id, slug, title, loại, độ khó), giữ thứ tự; Problem
  `DRAFT`/`ON_HOLD`/đã xoá/không tồn tại bị bỏ hẳn, Chapter rỗng vẫn hiện. Biểu diễn quản lý (FR-011) thêm
  trạng thái từng Problem đã xếp và `readiness { ready, issues }`. `ProblemReferenceReader` (module
  `problems`) đổi sang đọc theo tập ID, chỉ trả `id, slug, title, problemType, difficulty, publishStatus,
isDeleted, createdBy`; `courses` dùng qua port hẹp `CourseProblemCatalog`.
- **Giữ điều kiện xuất bản khi sửa (FR-019, AC-019).** Mọi thao tác ghi đi qua `CourseMutationService`
  (quyền → transaction → `FOR UPDATE` → sở hữu → thay đổi → lưu → dựng view). `UpdateCourse`,
  `RemoveChapter`, `DetachProblem` trên Course `PUBLISHED` chạy lại `CourseReadiness` trước khi lưu; mất
  điều kiện thì `CourseNotReady` (400) và state không đổi. Course `ON_HOLD`/đã xoá không sửa được (409).
- **Markdown hạn chế (FR-014, AC-012).** `assertSafeMarkdown` trong value object `CourseDescription` và
  `ChapterDescription` từ chối thẻ nguy hiểm, `on…=` và `javascript:`/`data:text/html` (cùng mẫu với bộ
  kiểm LRN-001, sao chép các regex để không import nội bộ `problems`).
- **Migration `1700000009000-Lrn003CourseConstraints`.** `courses.status` kiểu enum `courses_status_enum`
  (đổi tên từ `publish_status`), CHECK độ dài mô tả (20.000 / 5.000), `UNIQUE (id, course_id)` trên
  `chapters`, `chapter_problems.course_id` + FK kép, FK `problem_id → problems ON DELETE RESTRICT`,
  `UNIQUE (course_id, problem_id)`, index `(problem_id)` và `courses(created_by)`. Down gỡ đúng thứ tự
  ngược. Repository đổi vi phạm ràng buộc thành lỗi nghiệp vụ theo tên constraint: slug trùng →
  `DuplicateCourseSlugError`, trùng Problem → `ProblemAlreadyInCourse`, Problem không tồn tại →
  `ProblemNotAttachableError`.
- **API đúng plan (18 route).** `DELETE /:id` là `204` (xoá hẳn nháp chưa bị tham chiếu, ngược lại xoá
  mềm) bởi `DeleteCourseUseCase`; bỏ `/hard` và `/preview`. `publish|hold|republish|restore` `200`; remove
  Chapter/Problem `204`; add Chapter và attach Problem `201`. DTO theo plan: `AddChapterRequestDto`
  (`position?`), `AttachProblemRequestDto` (`position?`), `ReorderRequestDto { ids }` (1–50, không trùng),
  query `page`, `pageSize` (≤ 50), `q` (≤ 200), `includeDeleted`; phản hồi `CourseSummaryResponseDto`,
  `CourseDetailResponseDto`, `ManagedCourseResponseDto`. Mọi route có `TrustedPrincipalGuard` (401 khi
  thiếu principal, kể cả route đọc công khai). Tìm theo tên `ILIKE` thoát `%`/`_`.
- **Lỗi domain có kiểu.** `ChapterNotFound` → 404 (trước đây `DomainValidationError` → 400).
- **Sửa lỗi tra cứu theo id/slug.** Truy vấn `GET /courses/:idOrSlug` dùng chung một tham số cho cột uuid
  và varchar nên Postgres báo lỗi kiểu (500) ngay cả với UUID; tách hai tham số và chỉ thử `id` khi chuỗi
  là UUID. Chỉ lộ ra khi chạy trên PostgreSQL thật.
- Port `CourseReferenceChecker` chỉ còn `hasCourseReferences`; thông tin Problem đi qua
  `CourseProblemCatalog`; chính sách thêm Problem dùng `ProblemAttachPolicy` của domain trong
  `AttachProblemUseCase`.

## Why these choices

- Một `CourseMutationService` thay vì lặp khung transaction/khoá/sở hữu trong 14 use case: một chỗ giữ
  đúng thứ tự "quyền trước, khoá, kiểm tra, ghi" (plan: use case ghi chạy trong `TransactionRunner` với
  `loadForUpdate`) và dễ chèn kiểm readiness (FR-019).
- `CourseViewAssembler` ở tầng application để cả use case đọc lẫn ghi trả cùng kiểu kết quả; presentation
  chỉ ánh xạ sang DTO, không biết value object của domain (ADR 0002: presentation → application).
- `ProblemReferenceReader` theo tập ID, không join: giữ ranh giới "`courses` chỉ đọc Problem qua reader"
  (T002, T018) mà vẫn lọc đúng trạng thái; chi phí là hai truy vấn thay cho một join.
- Migration mới thay vì sửa file cũ: file `1700000008000` đã chạy trên DB dev, sửa sẽ làm lệch lịch sử.
- Bỏ `/hard` và `/preview`: không có trong plan nên không có trong spec (không thêm hành vi ngoài spec).
- Fake repository trong test **clone** khi nạp/lưu để mô phỏng DB: thay đổi chưa `save` không rò vào state
  đã lưu (nhờ đó test AC-019 "state không đổi" có ý nghĩa).

## How the feature works

Học viên xem Course: `GET /api/courses/:idOrSlug` →

1. `TrustedPrincipalGuard` kiểm `x-auth-user-id` (thiếu/sai → 401).
2. `ManagedCoursesController.getPublished` gọi `GetPublishedCourseUseCase`.
3. Use case lấy Course `PUBLISHED` chưa xoá mềm (không thì 404 như chưa từng có), rồi
   `CourseViewAssembler.toLearner` hỏi `CourseProblemCatalog` trạng thái các Problem và bỏ mọi Problem
   không `PUBLISHED` hoặc đã xoá.
4. Controller ánh xạ sang `CourseDetailResponseDto`: không có trạng thái, người tạo hay dấu vết Problem ẩn.

Giảng viên gỡ Problem khỏi Course đã xuất bản: `DELETE …/problems/:problemId` → `DetachProblemUseCase` →
`CourseMutationService`: kiểm quyền `course:update`, mở transaction, `SELECT … FOR UPDATE` dòng Course,
kiểm chủ sở hữu, `course.removeProblemFromChapter`, rồi vì Course `PUBLISHED` chạy `CourseReadiness`; nếu
mất điều kiện thì `CourseNotReadyError` → 400 kèm `issues`, transaction rollback, state giữ nguyên;
ngược lại `save` và trả `204`.

## Configuration

Migration Learning mới `1700000009000-Lrn003CourseConstraints.ts` (nằm trong
`apps/learning-service/src/database/migrations/`, được `data-source.ts` nạp bằng glob). Không đổi biến môi
trường, Docker hay script.

## Verification

- `pnpm lint`, `pnpm typecheck`, `pnpm build` (6 app): qua.
- `pnpm test` không có DB: 88 suite qua, 5 skip (integration), 664 test qua.
- `pnpm test` với PostgreSQL 17 tạm (`TEST_DATABASE_URL` qua biến môi trường, DB `courses_test`, container
  đã xoá): 93/93 suite, 714/714 test qua. Gồm integration: repository (22 test: round-trip, rollback,
  `FOR UPDATE`, hai attach đồng thời chỉ một thắng, từng constraint của migration, revert + chạy lại
  migration giữ nguyên dữ liệu), wiring `CoursesModule` + HTTP (vòng đời, ẩn/hiện Problem, AC-019, xoá
  mềm không xoá Class, xoá hẳn bị Class tham chiếu), reader theo tập ID.
- HTTP e2e (`managed-courses.api.e2e.spec.ts`): 18 route đúng mã trạng thái, 401/403/404/400/409, trường
  bị cấm (AC-016), HTML/script (AC-012), tài liệu OpenAPI có đủ 18 operation, Bearer và mã lỗi.
- Đã tick `tasks.md`: T008, T011–T015, T018–T024, T026, T027 (cùng T002, T005–T007, T010, T017, T025, T028
  từ lần trước).
- Not verified: `pnpm migration:run:learning` / `revert:learning` bằng CLI trên DB dev (cần `.env`, không
  được đọc); test integration chỉ dùng TypeORM `runMigrations`/`undoLastMigration` tương đương nên **T016
  chưa tick**. Chưa chạy qua Gateway thật.

## Remaining

- Not done (cần người quyết định hoặc ngoài phạm vi):
  - **T004** mở vì mẫu slug chưa chốt (xem Questions clarified); đề xuất tái dùng mẫu kebab-case chữ thường
    như `Slug` của LRN-001 nếu chủ sở hữu đồng ý.
  - **T009/T029** mở vì plan và task mâu thuẫn: plan bảo tái dùng `TransactionRunner` của LRN-001, T029 cấm
    `courses` import nội bộ `problems`. Hiện `courses` còn import `TrustedPrincipal`, `TrustedPrincipalGuard`,
    token và `UnauthorizedError` của `problems` (T009 cho phép decorator/guard; phần còn lại cần chốt).
  - **T016**: chạy `pnpm migration:run:learning`, kiểm schema, `pnpm migration:revert:learning`, chạy lại.
  - **T001** (xác nhận ID-003-T045..T048), **T003** (seed quyền `course:*` ở Identity) nằm ngoài nhánh này;
    **T030** cần review của người trước khi chuyển trạng thái spec.
  - Seam quyền Gateway (`x-auth-permissions`) vẫn mở như các spec Learning khác.
  - `CourseReferenceChecker` dùng SQL thô trên `classes`/`assignments`; đổi sang port của LRN-004/005 khi
    hai module đó có repository riêng.
- Risks:
  - Hợp đồng API đổi so với bản trước (route, mã trạng thái, tên field, dạng response); chưa có client
    dùng, nhưng phải báo Gateway/Frontend trước khi tích hợp.
  - Migration `1700000009000` sẽ lỗi nếu DB có dòng `chapter_problems` trỏ tới Problem không tồn tại hoặc
    cùng Problem lặp trong một Course; dữ liệu dev hiện chưa có trường hợp này nhưng cần kiểm trước khi chạy
    trên môi trường khác.
  - `loadForUpdate` khoá dòng `courses`; LRN-004 phải khoá `FOR SHARE` khi tạo Class (plan dòng 356–363).
