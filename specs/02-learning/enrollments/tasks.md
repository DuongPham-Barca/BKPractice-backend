# LRN-004 Công việc triển khai Class & Enrollment

## Trạng thái

Approved — Sẵn sàng triển khai sau LRN-001 và LRN-003

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.0`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-30`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **LRN-004-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.0 Approved,
      `plan.md` Approved, kiến trúc Learning (DDD + Hexagonal, ADR 0002). Xác nhận LRN-001 đã triển
      khai `PrincipalProvider` và `TransactionRunner`, và LRN-003 đã triển khai trạng thái vòng đời
      cùng dấu xoá mềm của `courses`. Nếu một trong hai chưa xong, **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; mục Thứ tự triển khai bước 1 của kế hoạch.

- [ ] **LRN-004-T002 — Xác nhận cơ chế quyền và vai trò.** Xác nhận ID-003 0.4 đã triển khai: Gateway
      đặt lại `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`; migration
      `Id003PermissionCatalog` đã có. LRN-004 chỉ đọc quyền và vai trò từ các header đó, header thiếu
      là tập rỗng.
      **Phụ thuộc:** LRN-004-T001.
      **Truy vết:** Mục Phân quyền của kế hoạch; LRN-004-SR-002, SR-008.

- [ ] **LRN-004-T003 — Xác nhận ranh giới và loại trừ.** Ghi nhận: không import hàng loạt, không
      nhiều giảng viên mỗi lớp, không đổi Course của Class, không xoá hẳn Class, không hiển thị hồ sơ
      sinh viên, không cho sinh viên xem bạn cùng lớp, không event, không microservice mới, không
      truy cập CSDL xuyên service.
      **Phụ thuộc:** LRN-004-T001.
      **Truy vết:** Mục Ngoài phạm vi của đặc tả; LRN-004-FR-020, FR-022; SR-007.

- [ ] **LRN-004-T004 — Kiểm tên ràng buộc khoá ngoại.** Trên cơ sở dữ liệu cách ly đã chạy migration
      nền tảng, xác nhận tên ràng buộc khoá ngoại của `classes.course_id` (dự kiến
      `classes_course_id_fkey`). Nếu khác, dùng tên thực tế trong migration LRN-004.
      **Phụ thuộc:** LRN-004-T001.
      **Truy vết:** Mục Migration của kế hoạch; LRN-004-FR-019.

## Domain

- [ ] **LRN-004-T005 — Thêm value object.** `ClassId`, `ClassName` (trim, 1..120), `ClassStatus`
      (`ACTIVE` | `ARCHIVED`), `JoinCode` (đúng 8 ký tự `[A-Z0-9]`, `parse` trim và chuyển chữ hoa).
      Bất biến, kiểm tra khi khởi tạo, không import NestJS/TypeORM.
      **Phụ thuộc:** LRN-004-T001.
      **Truy vết:** LRN-004-FR-002, FR-005, FR-008, FR-010; AC-023.

- [ ] **LRN-004-T006 — Hiện thực aggregate `Classroom`.** `open`, `rename`, `replaceJoinCode`,
      `archive`, `restore`, `assertMembershipMutable`, `isOwnedBy`. Không có phương thức đổi
      `courseId`. Bước chuyển sai và thao tác khi `ARCHIVED` ném `InvalidClassState`.
      **Phụ thuộc:** LRN-004-T005.
      **Truy vết:** LRN-004-FR-003, FR-004, FR-006–FR-009; AC-011, AC-012, AC-013, AC-024.

- [ ] **LRN-004-T007 — Hiện thực aggregate `Enrollment` và `EnrollmentPolicy`.** `Enrollment` khoá
      theo `(classId, studentId)` với `enrolledAt`. `EnrollmentPolicy.assertCanJoin` kiểm `ACTIVE`,
      không phải chủ sở hữu (`OwnerCannotEnroll`), sĩ số < 500 (`ClassFull`).
      **Phụ thuộc:** LRN-004-T006.
      **Truy vết:** LRN-004-FR-010, FR-012, FR-018; AC-009, AC-019.

- [ ] **LRN-004-T008 — Unit test domain.** Value object (chữ thường, khoảng trắng, ký tự lạ, độ dài),
      vòng đời và bước chuyển sai, thao tác bị chặn khi `ARCHIVED`, `EnrollmentPolicy` với chủ sở hữu
      và sĩ số 499/500. Chạy được không cần PostgreSQL.
      **Phụ thuộc:** LRN-004-T005 tới LRN-004-T007.
      **Truy vết:** AC-009, AC-011, AC-012, AC-013, AC-019, AC-023.

## Tầng application

- [ ] **LRN-004-T009 — Định nghĩa port.** Chỉ thêm `ClassroomRepository`, `EnrollmentRepository`,
      `CourseAvailabilityReader`, `JoinCodeGenerator`; dùng lại `PrincipalProvider` và
      `TransactionRunner` của LRN-001. Không port nào khác.
      **Phụ thuộc:** LRN-004-T006, LRN-004-T007.
      **Truy vết:** Mục Port của kế hoạch.

- [ ] **LRN-004-T010 — Hiện thực `ClassAuthorization`.** `requirePermission`, `requireOwner` (`403`),
      `requireStudentRole` (`403`), `requireMember` (`404`). Không có nhánh cho `ADMIN`.
      **Phụ thuộc:** LRN-004-T002, LRN-004-T009.
      **Truy vết:** Quy tắc phân quyền của đặc tả; LRN-004-SR-001, SR-008; AC-003, AC-008, AC-017.

- [ ] **LRN-004-T011 — Hiện thực `CreateClass`.** `class:create`; `CourseAvailabilityReader.
isOpenForClasses` (trong transaction, khoá `FOR SHARE` dòng `courses`) sai thì `CourseNotAvailable` với thông báo chung; sinh mã, chèn, trùng
      `join_code` thì sinh lại tối đa 5 lần; chủ sở hữu từ principal.
      **Phụ thuộc:** LRN-004-T010.
      **Truy vết:** LRN-004-FR-003, FR-005; SR-006; AC-001, AC-002.

- [ ] **LRN-004-T012 — Hiện thực `RenameClass` và `RegenerateJoinCode`.** `class:update` + sở hữu;
      `loadForUpdate`; chỉ khi `ACTIVE`; tạo lại mã dùng cùng vòng retry, mã cũ bị ghi đè trong cùng
      dòng.
      **Phụ thuộc:** LRN-004-T011.
      **Truy vết:** LRN-004-FR-006, FR-007, FR-009; AC-010, AC-011, AC-024.

- [ ] **LRN-004-T013 — Hiện thực `ArchiveClass` và `RestoreClass`.** `class:archive` /
      `class:restore` + sở hữu; `loadForUpdate`; khôi phục không đọc trạng thái Course và giữ nguyên mã.
      **Phụ thuộc:** LRN-004-T010.
      **Truy vết:** LRN-004-FR-008, FR-009; AC-011, AC-012, AC-013.

- [ ] **LRN-004-T014 — Hiện thực `JoinClass`.** Thứ tự: vai trò `STUDENT` → `JoinCode.parse` →
      `loadByJoinCodeForUpdate` (không thấy → `404` chung) → `assertMembershipMutable` → đã là thành
      viên thì trả về với `created = false` → `EnrollmentPolicy.assertCanJoin` với `countByClass` →
      tạo Enrollment. Vi phạm `UNIQUE (class_id, student_id)` ánh xạ thành "đã là thành viên".
      **Phụ thuộc:** LRN-004-T010.
      **Truy vết:** LRN-004-FR-009–FR-012, FR-018; AC-005–AC-011, AC-019, AC-023.

- [ ] **LRN-004-T015 — Hiện thực `LeaveClass` và `RemoveClassMember`.** `LeaveClass`: thành viên
      sinh viên; kiểm Enrollment trước (`404`), rồi `assertMembershipMutable`; xoá. `RemoveClassMember`:
      `class:manage-members` + sở hữu; `assertMembershipMutable`; không có Enrollment → `404`; xoá.
      **Phụ thuộc:** LRN-004-T010.
      **Truy vết:** LRN-004-FR-009, FR-013, FR-014; AC-011, AC-014, AC-015.

- [ ] **LRN-004-T016 — Hiện thực use case đọc phía quản lý.** `ListManagedClasses` (chỉ Class của
      principal, lọc trạng thái, trang ≤ 100, kèm sĩ số và cờ Course khả dụng, không kèm mã),
      `GetManagedClass` (kèm mã), `ListClassMembers` (trang ≤ 100 theo `(enrolled_at, student_id)`,
      kèm `total`). Cần `class:read-managed` + sở hữu.
      **Phụ thuộc:** LRN-004-T010.
      **Truy vết:** LRN-004-FR-015, FR-017, FR-018; SR-003, SR-004; AC-022.

- [ ] **LRN-004-T017 — Hiện thực use case đọc phía thành viên.** `ListEnrolledClasses` (chỉ Class có
      Enrollment của principal, mọi trạng thái) và `GetMemberClass` (không phải thành viên → `404`;
      tóm tắt Course chỉ khi khả dụng, ngược lại `course: null`; không có mã, sĩ số hay sinh viên
      khác).
      **Phụ thuộc:** LRN-004-T010.
      **Truy vết:** LRN-004-FR-016, FR-017; SR-003, SR-004, SR-006; AC-016, AC-017, AC-018.

- [ ] **LRN-004-T018 — Unit test application.** Dùng port giả để kiểm quyền, sở hữu, vai trò, thành
      viên, Course không khả dụng, tham gia lặp lại, mã cũ sau khi tạo lại, rời và gỡ, biểu diễn thành
      viên không lộ dữ liệu, vòng retry khi trùng mã, và việc thất bại không để lại thay đổi dở dang.
      **Phụ thuộc:** LRN-004-T011 tới LRN-004-T017.
      **Truy vết:** AC-002, AC-003, AC-006, AC-008, AC-010, AC-014–AC-018; LRN-004-FR-021.

## Lưu trữ

- [ ] **LRN-004-T019 — Chuyển và cập nhật entity.** Chuyển `Classroom` và `Enrollment` từ
      `modules/courses/entities/course.entity.ts` sang `modules/enrollments/entities/class.entity.ts`,
      giữ tên class, bảng, cột. `Classroom` thêm `status`, `createdAt`, `updatedAt`, `archivedAt` và
      đổi quan hệ `course` sang `onDelete: 'RESTRICT'`. Cập nhật import trong `learning.entities.ts` và
      `assignments/entities/assignment.entity.ts`. Không chuyển entity vào `libs/`.
      **Phụ thuộc:** LRN-004-T001.
      **Truy vết:** Mục Ảnh hưởng tới mã nguồn và Lưu trữ của kế hoạch; LRN-004-FR-019.

- [ ] **LRN-004-T020 — Hiện thực adapter `ClassroomRepository` và `EnrollmentRepository`.** Chỉ dùng
      datasource Learning; khoá pessimistic cho `loadForUpdate` và `loadByJoinCodeForUpdate`; ánh xạ
      lỗi `23505` thành `JoinCodeTaken` / "đã là thành viên"; sĩ số theo trang bằng một truy vấn
      `GROUP BY class_id`; sắp xếp đúng như kế hoạch.
      **Phụ thuộc:** LRN-004-T009, LRN-004-T019.
      **Truy vết:** LRN-004-FR-011, FR-015, FR-016, FR-018; SR-007.

- [ ] **LRN-004-T021 — Hiện thực adapter `CourseAvailabilityReader`.** Đọc `courses` qua entity
      `Course`, chỉ chọn `id`, `slug`, `title`, điều kiện `PUBLISHED` và chưa xoá mềm theo cột của
      LRN-003 (`status`, `deleted_at`); `isOpenForClasses` dùng `FOR SHARE`; dùng lại truy vấn phép chiếu người học của LRN-003 nếu có.
      **Phụ thuộc:** LRN-004-T009.
      **Truy vết:** LRN-004-FR-003, FR-017; SR-006; AC-002, AC-018.

- [ ] **LRN-004-T022 — Hiện thực adapter `JoinCodeGenerator`.** `crypto.randomInt(36)` cho từng ký
      tự; không dùng `Math.random`.
      **Phụ thuộc:** LRN-004-T005, LRN-004-T009.
      **Truy vết:** LRN-004-FR-005; SR-004.

- [ ] **LRN-004-T023 — Integration test lưu trữ.** Khoá dòng tuần tự hoá nhiều lần tham gia vào chỗ
      cuối; hai lần tham gia đồng thời của cùng sinh viên để lại một Enrollment; `DELETE FROM courses`
      với Course đang được tham chiếu bị chặn; truy vấn đọc Course không trả Course chưa công khai.
      **Phụ thuộc:** LRN-004-T020, LRN-004-T021, LRN-004-T024.
      **Truy vết:** AC-006, AC-019, AC-020; LRN-004-FR-019.

## Cơ sở dữ liệu / Migration

- [ ] **LRN-004-T024 — Viết migration Learning `Lrn004ClassEnrollment`.** Up: enum
      `classes_status_enum`; cột `status`, `created_at`, `updated_at`, `archived_at`; CHECK trạng
      thái/`archived_at`; khoá ngoại `course_id` sang `ON DELETE RESTRICT`; index
      `classes(lecturer_id, created_at)` và `enrollments(student_id, enrolled_at)`. Down theo thứ tự
      ngược, khôi phục `ON DELETE CASCADE`. `synchronize` vẫn tắt.
      **Phụ thuộc:** LRN-004-T004, LRN-004-T019.
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu và Migration của kế hoạch; LRN-004-FR-008, FR-019.

- [ ] **LRN-004-T025 — Kiểm chứng migration Learning.** `pnpm migration:run:learning` /
      `pnpm migration:revert:learning` trên cơ sở dữ liệu cách ly có sẵn dòng `classes` và
      `enrollments`; dòng cũ nhận `ACTIVE`; revert trả về đúng schema nền tảng.
      **Phụ thuộc:** LRN-004-T024.
      **Truy vết:** Định nghĩa Hoàn thành; chiến lược cơ sở dữ liệu.

- [ ] **LRN-004-T026 — Seed quyền ở Identity.** Migration
      `apps/identity-service/src/database/migrations/<timestamp>-Lrn004ClassPermissions.ts`, chạy sau
      `Id003PermissionCatalog`: chèn `class:create`, `class:read-managed`, `class:update`,
      `class:archive`, `class:restore`, `class:manage-members` (bỏ qua nếu đã có) và gán cả sáu chỉ cho
      vai trò `LECTURER`; không gán cho `STUDENT` hay `ADMIN`. Down xoá đúng các phép gán và mã đã
      chèn. Kiểm chứng bằng `pnpm migration:run:identity` / `pnpm migration:revert:identity` và bằng
      access token `LECTURER` mới.
      **Phụ thuộc:** LRN-004-T002.
      **Truy vết:** Quy tắc phân quyền của đặc tả; ID-003-FR-017; quyết định 10 của đặc tả.

## API

- [ ] **LRN-004-T027 — Thêm DTO.** `CreateClassRequestDto`, `RenameClassRequestDto` (không có
      `courseId`), `JoinClassRequestDto`, các DTO query phân trang (`pageSize` 1..100, `status` tuỳ
      chọn), và các response DTO theo kế hoạch với ánh xạ tường minh; `MemberClassResponseDto` không có
      mã hay sĩ số.
      **Phụ thuộc:** LRN-004-T011 tới LRN-004-T017.
      **Truy vết:** Đầu vào/Đầu ra của đặc tả; SR-003, SR-004, SR-005; AC-021, AC-024.

- [ ] **LRN-004-T028 — Thêm controller.** Mười ba route ở mục API của kế hoạch; route tĩnh `join`,
      `enrolled`, `managed` khai báo trước `:id`; `ParseUUIDPipe` cho `:id`, `:studentId`; `JoinClass`
      trả `201`/`200`; controller chỉ gọi một use case và ánh xạ kết quả. Không có route xoá Class.
      **Phụ thuộc:** LRN-004-T027.
      **Truy vết:** Mục API của kế hoạch; LRN-004-FR-020.

- [ ] **LRN-004-T029 — Ánh xạ lỗi.** Lỗi domain/application sang `400`/`403`/`404`/`409`/`500` đúng
      bảng Xử lý lỗi của kế hoạch; không cấu trúc lỗi mới; mã sai và mã cũ cùng một thông báo `404`.
      **Phụ thuộc:** LRN-004-T028.
      **Truy vết:** Tình huống lỗi của đặc tả; AC-007; SR-004, SR-006.

- [ ] **LRN-004-T030 — Swagger.** Mô tả mọi route, quyền cần có, mã phản hồi; ví dụ dùng mã giả rõ
      ràng.
      **Phụ thuộc:** LRN-004-T028.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-004-T031 — Gắn module.** Tạo `EnrollmentsModule` gắn adapter vào port tại composition
      root, import module export `PrincipalProvider`/`TransactionRunner`; đăng ký trong
      `learning-service.module.ts`.
      **Phụ thuộc:** LRN-004-T020 tới LRN-004-T022, LRN-004-T028.
      **Truy vết:** Mục Kiến trúc service bắt buộc của kế hoạch.

## Messaging

- [x] N/A — LRN-004 không phát và không tiêu thụ event (đặc tả, mục Đầu ra; kế hoạch, mục Messaging).

## Realtime

- [x] N/A — Đặc tả không yêu cầu realtime (kế hoạch, mục Realtime).

## Phân quyền và kiểm thử

- [ ] **LRN-004-T032 — Test API/E2E.** Luồng tạo → lấy mã → tham gia → xem → rời; tham gia lặp lại;
      mã cũ sau khi tạo lại; lưu trữ chặn mọi thay đổi thành viên; khôi phục giữ dữ liệu; `401` khi
      chưa xác thực; `403` với `STUDENT`, `ADMIN` chưa được cấp, giảng viên không phải chủ sở hữu, và
      người không có vai trò `STUDENT` khi tham gia; `404` với người ngoài lớp; trường lạ bị từ chối;
      danh sách sinh viên phân trang; xoá hẳn Course nháp có Class bị từ chối.
      **Phụ thuộc:** LRN-004-T023, LRN-004-T026, LRN-004-T031.
      **Truy vết:** AC-001 tới AC-024.

- [ ] **LRN-004-T033 — Rà soát bảo mật tập trung.** Phản hồi, lỗi, log, Swagger không chứa mã tham
      gia ngoài phản hồi quản lý, không lộ sĩ số hay danh sách sinh viên cho người không phải chủ sở
      hữu, không lộ Course chưa công khai; không log body `JoinClass`; không truy cập CSDL xuyên service.
      **Phụ thuộc:** LRN-004-T032.
      **Truy vết:** LRN-004-SR-001 tới SR-008; AC-016, AC-017, AC-018.

## Tài liệu và kiểm chứng

- [ ] **LRN-004-T034 — Cập nhật tài liệu triển khai.** Ghi cảnh báo down migration mất trạng thái
      `ARCHIVED` và trả khoá ngoại về `CASCADE`; ghi việc entity chuyển sang module `enrollments` cho
      người làm LRN-005; ghi rằng quyền `class:*` chỉ có ở token phát hành sau khi seed.
      **Phụ thuộc:** LRN-004-T024, LRN-004-T026.
      **Truy vết:** Mục Rủi ro của kế hoạch; Định nghĩa Hoàn thành.

- [ ] **LRN-004-T035 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`. Chỉ sửa lỗi thuộc phạm vi; không che lỗi bằng `any`, `@ts-ignore` hay tắt lint.
      **Phụ thuộc:** LRN-004-T032, LRN-004-T033, LRN-004-T034.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-004-T036 — Kiểm chứng tuân thủ kiến trúc.** Domain không import NestJS/TypeORM; use case
      chỉ phụ thuộc domain và port; controller chỉ lo transport; adapter gắn ở composition root; không
      entity hay use case Class nào trong `libs/`; không khoá ngoại tới Identity.
      **Phụ thuộc:** LRN-004-T031, LRN-004-T035.
      **Truy vết:** ADR 0002; `dependency-rules.md`; mục Tuân thủ kiến trúc của kế hoạch.

- [ ] **LRN-004-T037 — Đối chiếu với đặc tả.** Rà từng LRN-004-FR-001 tới FR-022, SR-001 tới SR-008,
      AC-001 tới AC-024 với code, test, migration và Swagger. Xác nhận không có hành vi Ngoài phạm vi.
      Báo cáo sai lệch và rủi ro còn lại; không sửa đặc tả để khớp code.
      **Phụ thuộc:** LRN-004-T035, LRN-004-T036.
      **Truy vết:** Đặc tả 1.0; Định nghĩa Hoàn thành.

- [ ] **LRN-004-T038 — Bàn giao theo SDD.** Cập nhật ô đánh dấu trung thực, viết worked entry, lấy
      review của con người, chỉ chuyển đặc tả sang `Implemented` rồi `Verified` qua quy trình SDD.
      **Phụ thuộc:** LRN-004-T037.
      **Truy vết:** Quy trình SDD.

## Tuân thủ kiến trúc

Kế hoạch giữ Learning ở DDD + Hexagonal: `Classroom`/`Enrollment` và `EnrollmentPolicy` ở domain,
use case chỉ gọi port, adapter TypeORM và adapter sinh mã ở infrastructure, controller là driving
adapter. Module `enrollments` có đủ bốn tầng vì mỗi tầng có hành vi thật. Quan hệ `classes` →
`courses` là quan hệ nội bộ `bkpractice_learning`; `lecturer_id`, `student_id` là UUID ngoài. Không
có ngoại lệ kiến trúc nào. Kiểm chứng ở LRN-004-T036.

## Bảng tổng hợp độ phủ

| Yêu cầu               | Công việc triển khai chính         | Kiểm thử/xác minh      |
| --------------------- | ---------------------------------- | ---------------------- |
| LRN-004-FR-001–FR-002 | T005, T019, T031                   | T008, T036, T037       |
| LRN-004-FR-003–FR-005 | T006, T011, T021, T022             | T018, T032             |
| LRN-004-FR-006–FR-009 | T006, T012, T013, T024             | T008, T018, T032       |
| LRN-004-FR-010–FR-012 | T007, T010, T014                   | T008, T018, T023, T032 |
| LRN-004-FR-013–FR-014 | T015                               | T018, T032             |
| LRN-004-FR-015–FR-017 | T016, T017, T021, T027             | T018, T032, T033       |
| LRN-004-FR-018        | T007, T014, T016, T020             | T008, T023, T032       |
| LRN-004-FR-019        | T004, T019, T024                   | T023, T025, T032       |
| LRN-004-FR-020–FR-022 | T003, T028                         | T018, T037             |
| LRN-004-SR-001–SR-008 | T002, T010, T020, T026, T027, T029 | T033, T037             |
| LRN-004-AC-001–AC-024 | —                                  | T008, T018, T023, T032 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
