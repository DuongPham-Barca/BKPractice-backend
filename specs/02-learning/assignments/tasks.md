# LRN-005 Công việc triển khai Quản lý Assignment

## Trạng thái

Approved — Sẵn sàng triển khai sau LRN-001, LRN-004 và LRN-006

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.0`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-30`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **LRN-005-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.0 Approved,
      `plan.md` Approved, kiến trúc Learning (DDD + Hexagonal, ADR 0002). Xác nhận LRN-001 đã có
      `PrincipalProvider`, `TransactionRunner`, bộ kiểm Markdown hạn chế và xoá mềm Problem. Nếu chưa,
      **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; mục Thứ tự triển khai bước 1 của kế hoạch.

- [ ] **LRN-005-T002 — Xác nhận contract của LRN-004 và LRN-006.** Ghi lại: bảng/entity Class có
      chủ sở hữu `lecturer_id` và trạng thái `ACTIVE`/`ARCHIVED`; Enrollment hiện hành; LRN-004 khoá
      `FOR UPDATE` dòng Class khi đổi trạng thái và không xoá cứng Class có Assignment; `solved_at` của
      LRN-006 là lần giải đầu tiên theo `occurredAt`. Đối chiếu ba điểm ở mục "Quyết định phối hợp đã
      chốt" của kế hoạch; nếu plan LRN-004/LRN-006 mâu thuẫn, **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** LRN-005-T001.
      **Truy vết:** Mục Phụ thuộc và Quyết định phối hợp đã chốt của kế hoạch; LRN-005-FR-010,
      FR-019.

- [ ] **LRN-005-T003 — Xác nhận ranh giới và loại trừ.** Ghi nhận: không nộp trễ, không chấm tay,
      không điểm từng phần, không thông báo, không xuất file, không Assignment ngoài Class, không đổi
      contract `submission.accepted`, không gọi Submission, không ghi `progress`, không microservice
      mới.
      **Phụ thuộc:** LRN-005-T001.
      **Truy vết:** Mục Ngoài phạm vi của đặc tả; LRN-005-FR-014, FR-021; SR-008.

## Seed quyền ở Identity

- [ ] **LRN-005-T004 — Seed sáu quyền `assignment:*` ở Identity.** Tạo migration
      `apps/identity-service/src/database/migrations/<timestamp>-SeedAssignmentPermissions.ts`: up chèn
      `assignment:create`, `assignment:read-managed`, `assignment:update`, `assignment:publish`,
      `assignment:delete`, `assignment:restore` vào `permissions` và gán cả sáu cho vai trò `LECTURER`
      trong `role_permissions` (`ON CONFLICT DO NOTHING`); down xoá đúng các dòng đó. Không gán cho
      `STUDENT` hay `ADMIN`. Kiểm up/down bằng `pnpm migration:run:identity` /
      `pnpm migration:revert:identity` trên CSDL cách ly và xác nhận token `LECTURER` mang sáu quyền.
      **Phụ thuộc:** LRN-005-T001.
      **Truy vết:** ID-003-FR-017; mục Seed quyền ở Identity của kế hoạch; Quy tắc phân quyền của đặc tả.

## Domain

- [ ] **LRN-005-T005 — Thêm value object.** `AssignmentTitle` (trim, không rỗng, ≤ 200),
      `AssignmentDescription` (≤ 20.000, qua bộ kiểm Markdown hạn chế của LRN-001),
      `AssignmentSchedule` (`startsAt < deadlineAt` khi cả hai có), `MaxScore` (1..1.000, mặc định
      100), `AssignmentItem`. Bất biến, kiểm khi khởi tạo, không import NestJS/TypeORM.
      **Phụ thuộc:** LRN-005-T001.
      **Truy vết:** LRN-005-FR-004, FR-005, FR-017, FR-018; AC-018, AC-021.

- [ ] **LRN-005-T006 — Hiện thực aggregate `Assignment`.** `create`, `rename`, `changeDescription`,
      `reschedule(…, now)`, `replaceItems(…, now)`, `publish(readiness, now)`, `softDelete(now)`,
      `restore()`, `isHardDeletable()`, `isVisibleToStudents(now)` theo bảng hành vi của kế hoạch; lỗi
      `InvalidAssignmentState`, `AssignmentLocked`, `AssignmentValidationError`, `AssignmentNotReady`.
      Không tự đọc đồng hồ.
      **Phụ thuộc:** LRN-005-T005.
      **Truy vết:** LRN-005-FR-002 tới FR-008; Quy tắc chỉnh sửa của đặc tả; AC-015, AC-019.

- [ ] **LRN-005-T007 — Hiện thực `AssignmentPublishValidator`.** Trả các mã `TITLE_REQUIRED`,
      `STARTS_AT_REQUIRED`, `DEADLINE_REQUIRED`, `SCHEDULE_INVALID`, `DEADLINE_IN_PAST`,
      `PROBLEM_REQUIRED`, `PROBLEM_NOT_PUBLISHED`, `CLASS_NOT_ACTIVE`; chế độ "giữ điều kiện" bỏ
      `DEADLINE_IN_PAST`.
      **Phụ thuộc:** LRN-005-T006.
      **Truy vết:** LRN-005-FR-007, FR-016; AC-004.

- [ ] **LRN-005-T008 — Chuẩn bị bộ ca biên quy tắc chấm cho LRN-006.** Không cài grader trong
      module `assignments`. Viết bộ dữ liệu ca biên (giải trước khi tạo, `solved_at` bằng hạn, sau hạn,
      chưa giải, Problem bị tạm giữ/xoá mềm, gia hạn sau khi quá hạn, `occurredAt` sau hạn) kèm kết quả
      mong đợi theo LRN-005-FR-010, FR-013 tới FR-015, và đối chiếu với test của
      `AssignmentScoreCalculator` (LRN-006). Lệch thì **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** LRN-005-T002.
      **Truy vết:** LRN-005-FR-010, FR-011, FR-013, FR-014, FR-015; AC-009, AC-010, AC-011, AC-016,
      AC-024.

- [ ] **LRN-005-T009 — Unit test domain.** Value object; mọi bước chuyển hợp lệ/bị cấm; khoá theo
      thời gian với `now` trước/bằng/sau `startsAt`; gia hạn sau khi quá hạn; `replaceItems` trùng/quá
      50/rỗng khi `PUBLISHED`; từng mã của validator; `isVisibleToStudents` trước/bằng/sau `startsAt`.
      Chạy không cần PostgreSQL.
      **Phụ thuộc:** LRN-005-T005 tới LRN-005-T007.
      **Truy vết:** AC-004, AC-006, AC-015, AC-016, AC-018, AC-019, AC-021.

## Tầng application

- [ ] **LRN-005-T010 — Định nghĩa port.** Chỉ thêm `AssignmentRepository`, `ClassAccessReader`,
      `ProblemCatalogReader`, `Clock`; tái dùng `PrincipalProvider` và
      `TransactionRunner` của LRN-001. Không port nào khác.
      **Phụ thuộc:** LRN-005-T006.
      **Truy vết:** Mục Port của kế hoạch.

- [ ] **LRN-005-T011 — Hiện thực `AssignmentAccessPolicy`.** `requireManage(principal, permission,
classAccess)`: có mã quyền và `ownerId === principal.userId`, ngược lại `403`; không có nhánh
      ngoại lệ cho `ADMIN`. Tập quyền rỗng khi thiếu header.
      **Phụ thuộc:** LRN-005-T002, LRN-005-T010.
      **Truy vết:** Quy tắc phân quyền của đặc tả; LRN-005-SR-001, SR-002, SR-009; AC-002.

- [ ] **LRN-005-T012 — Hiện thực `CreateAssignment` và `UpdateAssignment`.** Trong
      `TransactionRunner`: nạp Class `FOR SHARE` (không có thì `404`), kiểm quyền + sở hữu, Class
      `ACTIVE`; tạo `DRAFT` với `createdBy` = principal; cập nhật qua `rename`/`changeDescription`/
      `reschedule` với `now` từ `Clock`, `loadForUpdate`; nếu `PUBLISHED` chạy validator "giữ điều
      kiện".
      **Phụ thuộc:** LRN-005-T007, LRN-005-T011.
      **Truy vết:** LRN-005-FR-002, FR-003, FR-004, FR-019, FR-020; AC-001, AC-015, AC-016, AC-020,
      AC-021.

- [ ] **LRN-005-T013 — Hiện thực `SetAssignmentProblems`.** Nạp tình trạng Problem qua
      `ProblemCatalogReader`; mục chưa `PUBLISHED`/đã xoá/không tồn tại trả mã chung
      `PROBLEM_NOT_AVAILABLE` không lộ thông tin; `replaceItems`; nếu `PUBLISHED` giữ điều kiện.
      **Phụ thuộc:** LRN-005-T012.
      **Truy vết:** LRN-005-FR-005, FR-018; SR-003; AC-017, AC-018.

- [ ] **LRN-005-T014 — Hiện thực `PublishAssignment`, `DeleteAssignment`, `RestoreAssignment`.**
      Xuất bản chạy validator trên state đã lưu và báo mọi điều kiện còn thiếu; xoá `DRAFT` là xoá hẳn,
      xoá `PUBLISHED` là xoá mềm; khôi phục về `PUBLISHED` không kiểm lại điều kiện. Mọi thao tác kiểm
      Class `ACTIVE`.
      **Phụ thuộc:** LRN-005-T012.
      **Truy vết:** LRN-005-FR-006, FR-007, FR-019; AC-004, AC-005, AC-019, AC-020.

- [ ] **LRN-005-T015 — Hiện thực `GetManagedAssignment` và `ListManagedAssignments`.**
      `assignment:read-managed` + sở hữu; mọi trạng thái; kèm trạng thái từng Problem và danh sách điều
      kiện còn thiếu; liệt kê phân trang, lọc `status`, tuỳ chọn gồm đã xoá mềm.
      **Phụ thuộc:** LRN-005-T007, LRN-005-T011.
      **Truy vết:** LRN-005-FR-009, FR-016.

- [ ] **LRN-005-T016 — Hiện thực `ListClassAssignments` và `GetStudentAssignment`.** Không đăng ký
      thì `404`; chỉ Assignment `isVisibleToStudents(now)`; lọc Problem đang `PUBLISHED` chưa xoá, giữ
      thứ tự; kèm tổng `maxScore` của Problem hiển thị; không kèm tiến độ hay điểm. Không mở
      transaction ghi.
      **Phụ thuộc:** LRN-005-T010.
      **Truy vết:** LRN-005-FR-008, FR-009, FR-011, FR-015, FR-020; SR-004; AC-006, AC-007, AC-008,
      AC-012, AC-014.

- [ ] **LRN-005-T017 — Test hợp đồng dữ liệu chấm với LRN-006.** Trên CSDL cách ly có dữ liệu LRN-005
      thật, xác nhận `AssignmentReader` của LRN-006 đọc đúng Class, `deadlineAt`, mục có thứ tự kèm
      `maxScore`, và cờ hiển thị (trạng thái, xoá mềm, `startsAt`, trạng thái Problem) giống
      `GetStudentAssignment`. Nếu LRN-006 chưa triển khai, để task mở và ghi vào worked entry.
      **Phụ thuộc:** LRN-005-T016, LRN-005-T024.
      **Truy vết:** LRN-005-FR-011, FR-012, FR-015; AC-012, AC-013.

- [ ] **LRN-005-T018 — Unit test application.** Port giả và `Clock` giả: quyền và sở hữu cho giảng
      viên khác, `STUDENT`, `ADMIN`; Class `ARCHIVED`; hiển thị theo thời gian và thành viên; xoá
      hẳn/xoá mềm/khôi phục; sinh viên đã rời lớp nhận `404`; thất bại không để lại thay đổi dở dang.
      **Phụ thuộc:** LRN-005-T011 tới LRN-005-T016.
      **Truy vết:** AC-002, AC-005 tới AC-008, AC-019, AC-020; FR-020.

## Lưu trữ

- [ ] **LRN-005-T019 — Cập nhật entity.** `Assignment`: giữ quan hệ `course` kèm chú thích "không
      được LRN-005 ghi"; `classroom` bắt buộc
      (`nullable: false`, `onDelete: 'RESTRICT'`); thêm `description`, `status`, `deletedAt`,
      `createdAt`, `updatedAt`; giữ `lecturerId` với nghĩa người tạo. `AssignmentProblem` giữ cột. Trỏ
      quan hệ Class tới entity của LRN-004 ở vị trí mới nếu LRN-004 đã chuyển. Không chuyển entity vào
      `libs/`.
      **Phụ thuộc:** LRN-005-T002.
      **Truy vết:** Mục Lưu trữ và Thay đổi cơ sở dữ liệu của kế hoạch; LRN-005-FR-002.

- [ ] **LRN-005-T020 — Hiện thực `AssignmentRepository`.** Ánh xạ entity ↔ aggregate; `load`,
      `loadForUpdate` (khoá pessimistic), `save` (thay thế mục, `display_order` 0..n-1 trong cùng
      transaction), `hardDelete`, `listByClass` (phân trang, lọc trạng thái, đã xoá mềm).
      **Phụ thuộc:** LRN-005-T010, LRN-005-T019.
      **Truy vết:** LRN-005-FR-005, FR-006, FR-009, FR-020.

- [ ] **LRN-005-T021 — Hiện thực các reader.** `ClassAccessReader` (Class kèm `FOR SHARE` tuỳ chọn,
      `isEnrolled`); `ProblemCatalogReader` (bọc `ProblemReferenceReader` do `problems` export nếu có;
      chỉ cột công khai và trạng thái, không Test Case/harness); `SystemClock`. Không reader nào đọc
      `progress`.
      **Phụ thuộc:** LRN-005-T010.
      **Truy vết:** Mục Adapter hạ tầng của kế hoạch; LRN-005-FR-021; SR-005, SR-008.

- [ ] **LRN-005-T022 — Integration test lưu trữ.** Ánh xạ aggregate; thay thế mục và thứ tự; CHECK
      lịch và `max_score`; khoá ngoại `RESTRICT` chặn xoá Class; `course_id` không bị ghi; hai lần sửa
      đồng thời được tuần tự hoá.
      **Phụ thuộc:** LRN-005-T020, LRN-005-T021, LRN-005-T024.
      **Truy vết:** LRN-005-FR-005, FR-012, FR-020; mục Đồng thời của kế hoạch.

- [ ] **LRN-005-T023 — Xác minh không truy cập xuyên service.** Không datasource hay khoá ngoại nào
      tới Identity/Submission; không import code của service khác; không ghi bảng của module khác.
      **Phụ thuộc:** LRN-005-T021.
      **Truy vết:** LRN-005-SR-008, FR-021; `database-strategy.md`.

## Cơ sở dữ liệu / Migration

- [ ] **LRN-005-T024 — Viết migration `Lrn005AssignmentManagement`.** Up: dừng với lỗi rõ ràng nếu
      có `class_id IS NULL`; tạo `assignment_status_enum`; thêm `description`, `status`, `deleted_at`,
      `created_at`, `updated_at`; `class_id` NOT NULL và khoá ngoại `ON DELETE RESTRICT`; giữ nguyên
      `course_id`; CHECK lịch, CHECK `PUBLISHED` có đủ lịch, CHECK `max_score` 1..1000, CHECK
      `display_order ≥ 0`; index `(class_id, status)` và `(assignment_id, display_order)`. Down đảo
      ngược đúng thứ tự. Chạy sau migration của LRN-001,
      LRN-003, LRN-004.
      **Phụ thuộc:** LRN-005-T002, LRN-005-T019.
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu và Migration của kế hoạch; LRN-005-FR-002, FR-018.

- [ ] **LRN-005-T025 — Kiểm chứng migration.** `pnpm migration:run:learning` /
      `pnpm migration:revert:learning` trên CSDL cách ly có dữ liệu mẫu, kể cả nhánh dừng khi có
      `class_id` rỗng; xác nhận `synchronize` vẫn tắt.
      **Phụ thuộc:** LRN-005-T024.
      **Truy vết:** `database-strategy.md`; Định nghĩa Hoàn thành.

## API

- [ ] **LRN-005-T026 — Viết DTO.** `CreateAssignmentRequestDto`, `UpdateAssignmentRequestDto`,
      `SetAssignmentProblemsRequestDto`, query phân trang/lọc, và các response DTO ánh xạ tường minh
      như kế hoạch; `IsISO8601({ strict: true })` cho thời điểm; không có `status`, `createdBy`,
      `lecturerId`, `studentId`, `classId` trong body cập nhật.
      **Phụ thuộc:** LRN-005-T010.
      **Truy vết:** Mục DTO của kế hoạch; LRN-005-SR-006; AC-022, AC-023.

- [ ] **LRN-005-T027 — Viết controller.** Mười route ở bảng API (không route điểm); route `managed` trước route
      `:id`; `ParseUUIDPipe`; mỗi handler gọi một use case và dịch lỗi domain sang `400`/`403`/`404`/
      `409` theo mục Xử lý lỗi; không truy vấn TypeORM trong controller.
      **Phụ thuộc:** LRN-005-T012 tới LRN-005-T016, LRN-005-T026.
      **Truy vết:** Mục API và Xử lý lỗi của kế hoạch; tình huống lỗi của đặc tả.

- [ ] **LRN-005-T028 — Composition root.** Tạo `assignments.module.ts` gắn adapter vào port, import
      vào `LearningServiceModule`; không đổi Gateway.
      **Phụ thuộc:** LRN-005-T020, LRN-005-T021, LRN-005-T027.
      **Truy vết:** Mục Adapter hạ tầng của kế hoạch; `dependency-rules.md`.

- [ ] **LRN-005-T029 — Cập nhật Swagger.** Mô tả mọi route, quyền cần có và mã lỗi; ví dụ không chứa
      dữ liệu judge hay định danh thật.
      **Phụ thuộc:** LRN-005-T027.
      **Truy vết:** Định nghĩa Hoàn thành; LRN-005-SR-005.

## Messaging

- [x] N/A — LRN-005 không phát và không tiêu thụ sự kiện; `progress` do LRN-006 ghi (mục Messaging
      của kế hoạch).

## Realtime

- [x] N/A — Không có đẩy realtime ở v1 (mục Realtime của kế hoạch; Ngoài phạm vi
      của đặc tả).

## Cấu hình

- [x] N/A — Không đổi biến môi trường, Docker hay Gateway (mục Cấu hình của kế hoạch).

## Phân quyền và kiểm thử

- [ ] **LRN-005-T030 — Test API/E2E.** Vòng đời đầy đủ; `401`; `403` cho giảng viên khác, `STUDENT`,
      `ADMIN` chưa được cấp; `404` cho người không đăng ký và Assignment chưa mở/nháp/đã xoá; `409` khi
      Class `ARCHIVED` và khi sửa thành phần đã khoá; trường lạ bị từ chối; Markdown thô bị từ chối;
      Problem không hợp lệ không lộ thông tin; Problem bị tạm giữ ẩn rồi hiện lại đúng vị trí; phản
      hồi không chứa tiến độ, điểm hay dữ liệu judge; không tồn tại route điểm trong module.
      **Phụ thuộc:** LRN-005-T004, LRN-005-T025, LRN-005-T028.
      **Truy vết:** AC-001 tới AC-008, AC-012 tới AC-023.

- [ ] **LRN-005-T031 — Rà soát bảo mật tập trung.** Phản hồi, lỗi, log, Swagger không chứa Assignment
      chưa mở, Problem chưa công khai, tiến độ hay điểm của sinh viên, dữ liệu judge hay header xác
      thực; không log mô tả; không route nào nhận định danh người dùng từ client.
      **Phụ thuộc:** LRN-005-T030.
      **Truy vết:** LRN-005-SR-001 tới SR-009; AC-014, AC-017, AC-023.

## Tài liệu và kiểm chứng

- [ ] **LRN-005-T032 — Cập nhật tài liệu triển khai.** Ghi: rủi ro `occurredAt` là lúc có kết quả
      chứ không phải lúc nộp (bài nộp sát hạn có thể bị tính không đạt) và cách giảm thiểu bằng gia hạn;
      đề xuất đội Submission thêm `submittedAt` vào `submission.accepted` ở phiên bản sau (không tự đổi
      contract); cảnh báo down migration mất mô tả/trạng thái/xoá mềm; cột `course_id` giữ lại nhưng
      không dùng; khoá ngoại `RESTRICT`; việc tạm giữ Problem làm đổi điểm đã chốt.
      **Phụ thuộc:** LRN-005-T024.
      **Truy vết:** Mục Rủi ro của kế hoạch; Tình huống biên của đặc tả; Định nghĩa Hoàn thành.

- [ ] **LRN-005-T033 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`. Chỉ sửa lỗi thuộc phạm vi; không che lỗi bằng `any`, `@ts-ignore` hay tắt lint.
      **Phụ thuộc:** LRN-005-T030, LRN-005-T031, LRN-005-T032.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-005-T034 — Kiểm chứng tuân thủ kiến trúc.** Domain không import NestJS/TypeORM; use case
      chỉ phụ thuộc domain và port; controller chỉ lo transport; adapter gắn ở composition root; không
      entity hay use case Assignment nào trong `libs/`; reader không ghi bảng của module khác.
      **Phụ thuộc:** LRN-005-T028, LRN-005-T033.
      **Truy vết:** ADR 0002; `dependency-rules.md`; mục Tuân thủ kiến trúc của kế hoạch.

- [ ] **LRN-005-T035 — Đối chiếu với đặc tả.** Rà từng LRN-005-FR-001 tới FR-021, SR-001 tới SR-009,
      AC-001 tới AC-024 với code, test, migration và Swagger. Xác nhận không có hành vi Ngoài phạm vi.
      Báo cáo sai lệch và rủi ro còn lại; không sửa đặc tả để khớp code.
      **Phụ thuộc:** LRN-005-T033, LRN-005-T034.
      **Truy vết:** Đặc tả 1.0; Định nghĩa Hoàn thành.

- [ ] **LRN-005-T036 — Bàn giao theo SDD.** Cập nhật ô đánh dấu trung thực, viết worked entry, lấy
      review của con người, chỉ chuyển đặc tả sang `Implemented` rồi `Verified` qua quy trình SDD.
      **Phụ thuộc:** LRN-005-T035.
      **Truy vết:** Quy trình SDD.

## Bảng tổng hợp độ phủ

| Yêu cầu                | Công việc triển khai chính         | Kiểm thử/xác minh                  |
| ---------------------- | ---------------------------------- | ---------------------------------- |
| LRN-005-FR-001–FR-002  | T006, T019, T024                   | T009, T025, T034, T035             |
| LRN-005-FR-003–FR-004  | T005, T006, T012                   | T009, T018, T030                   |
| LRN-005-FR-005, FR-018 | T005, T006, T013, T024             | T009, T022, T030                   |
| LRN-005-FR-006–FR-007  | T006, T007, T014                   | T009, T018, T030                   |
| LRN-005-FR-008–FR-009  | T006, T015, T016                   | T009, T018, T030                   |
| LRN-005-FR-010–FR-015  | T008, T016, T019, T024             | T008, T017, T030                   |
| LRN-005-FR-016         | T007, T015                         | T030                               |
| LRN-005-FR-017         | T005                               | T009, T030                         |
| LRN-005-FR-019         | T012, T014                         | T018, T030                         |
| LRN-005-FR-020         | T012, T016, T020                   | T018, T022                         |
| LRN-005-FR-021         | T003, T021                         | T023, T035                         |
| LRN-005-SR-001–SR-009  | T004, T011, T013, T021, T026, T027 | T023, T031, T035                   |
| LRN-005-AC-001–AC-024  | —                                  | T008, T009, T017, T018, T022, T030 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
