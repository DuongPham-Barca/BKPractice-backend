# LRN-006 Công việc triển khai Tiến độ học tập

## Trạng thái

Approved — Sẵn sàng triển khai sau LRN-001; phần đọc tổng hợp cần LRN-003, LRN-004, LRN-005

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.0`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-30`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **LRN-006-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.0 Approved,
      `plan.md` Approved, kiến trúc Learning (DDD + Hexagonal, ADR 0002). Xác nhận LRN-001 đã triển
      khai `PrincipalProvider`, `TransactionRunner` và `deleted_at` của Problem. Nếu chưa, **DỪNG và
      BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; bước 1 mục Thứ tự triển khai của kế hoạch.

- [ ] **LRN-006-T002 — Xác nhận các tính năng được đọc.** Ghi lại tên bảng/cột thực tế sau khi
      LRN-003 (`chapter_problems`, `courses.status`, `courses.deleted_at`), LRN-004 (trạng thái Class,
      `lecturer_id`, Enrollment đang đăng ký, `class:read-managed` đã seed) và LRN-005 (`startsAt`,
      `deadlineAt`, trạng thái/xoá mềm Assignment, `max_score`, quy tắc hiển thị) được triển khai. Ghi
      lại truy vấn hiển thị nào module sở hữu đã export để reader dùng lại. Nếu một tính năng chưa
      xong, chỉ làm T004–T016 và **BÁO CÁO** phần bị chặn.
      **Phụ thuộc:** LRN-006-T001.
      **Truy vết:** Mục Phụ thuộc và Lưu trữ của kế hoạch.

- [ ] **LRN-006-T003 — Xác nhận ranh giới và loại trừ.** Ghi nhận: không đổi
      `SubmissionAcceptedEvent`, không sửa `libs/contracts`, `libs/common` hay code Submission; không
      `ATTEMPTED`; không lưu sẵn điểm; không backfill; không realtime; không route ghi tiến độ; không
      truy cập CSDL xuyên service.
      **Phụ thuộc:** LRN-006-T001.
      **Truy vết:** Mục Ngoài phạm vi của đặc tả; LRN-006-FR-001, FR-002, FR-007, FR-017; SR-006,
      SR-007.

## Domain

- [ ] **LRN-006-T004 — Value object `AcceptedSubmission`.** `parse(unknown)` kiểm UUID của `eventId`,
      `submissionId`, `userId`, `problemId`; `occurredAt` ISO hợp lệ; `score` nguyên ≥ 0; sai thì ném
      `InvalidAcceptedSubmission`. Không import NestJS, TypeORM hay class-validator.
      **Phụ thuộc:** LRN-006-T001.
      **Truy vết:** LRN-006-FR-009; AC-007.

- [ ] **LRN-006-T005 — Aggregate `ProblemProgress`.** `firstSolve(e)`; `applyAccepted(e)` với
      `solvedAt = min`, `bestScore = max`, `lastEventId = e.eventId`. Không có trạng thái `ATTEMPTED`.
      **Phụ thuộc:** LRN-006-T004.
      **Truy vết:** LRN-006-FR-003, FR-005, FR-006, FR-007.

- [ ] **LRN-006-T006 — `CompletionCount` và `CourseCompletionCalculator`.** Đếm đã giải/tổng cho toàn
      Course và từng Chapter trên cấu trúc hiển thị; `0/0` hợp lệ; trả danh sách Problem đã giải kèm
      thời điểm giải.
      **Phụ thuộc:** LRN-006-T001.
      **Truy vết:** LRN-006-FR-012, FR-014, FR-015.

- [ ] **LRN-006-T007 — `AssignmentScoreCalculator`.** Điểm Problem = `maxScore` nếu
      `solvedAt ≤ deadlineAt`, ngược lại 0; tổng, tối đa; `isFinal = now > deadlineAt`. Trước khi viết, kiểm tra
      LRN-005 đã có cài đặt tương đương chưa để không viết hai lần (plan, vấn đề 3).
      **Phụ thuộc:** LRN-006-T001.
      **Truy vết:** LRN-006-FR-013, FR-016.

- [ ] **LRN-006-T008 — Unit test domain.** `parse` với từng trường sai; `ProblemProgress` qua mọi hoán
      vị của một tập sự kiện có lặp cho cùng kết quả; sự kiện sớm hơn tới sau làm lùi `solvedAt`;
      calculator với Chapter rỗng, 0/0, giải trước khi giao, đúng hạn, trễ, `isFinal`. Không cần
      PostgreSQL.
      **Phụ thuộc:** LRN-006-T004 tới LRN-006-T007.
      **Truy vết:** AC-003, AC-004, AC-005, AC-007, AC-014, AC-015, AC-016.

## Tầng application

- [ ] **LRN-006-T009 — Định nghĩa port.** `ProgressRepository`, `CourseStructureReader`,
      `ClassMembershipReader`, `AssignmentReader`, `PublishedProblemFilter`, `Clock`; dùng lại
      `PrincipalProvider`, `TransactionRunner` của LRN-001. Không port nào khác.
      **Phụ thuộc:** LRN-006-T005.
      **Truy vết:** Mục Port của kế hoạch.

- [ ] **LRN-006-T010 — Hiện thực `ApplyAcceptedSubmission`.** `parse`; trong `TransactionRunner`:
      `recordReceipt` (trùng → `DUPLICATE`), `insertIfAbsent(firstSolve)`, nếu đã có dòng thì
      `loadForUpdate` → `applyAccepted` → `save`; trả `APPLIED`. Lỗi thì ném lại để transaction
      rollback.
      **Phụ thuộc:** LRN-006-T004, LRN-006-T005, LRN-006-T009.
      **Truy vết:** LRN-006-FR-002 tới FR-010; AC-001, AC-002, AC-006, AC-008, AC-009.

- [ ] **LRN-006-T011 — Hiện thực use case của chính mình.** `ListMySolvedProblems` (chỉ Problem
      `PUBLISHED` chưa xoá, `solved_at DESC, problem_id`, phân trang), `GetMySolvedStatus` (≤ 100 định
      danh, Problem không hiển thị trả chưa giải), `GetMyCourseProgress` (Course không hiển thị →
      `NotFound`), `GetMyAssignmentScore` (đăng ký + hiển thị theo LRN-005 tại `Clock.now()`, thiếu
      thì `NotFound`; chỉ trả Problem hiển thị với sinh viên). `userId` luôn là principal.
      **Phụ thuộc:** LRN-006-T002, LRN-006-T006, LRN-006-T007, LRN-006-T009.
      **Truy vết:** LRN-006-FR-011, FR-012, FR-013, FR-018; SR-002, SR-003, SR-004; AC-010 tới
      AC-017, AC-021.

- [ ] **LRN-006-T012 — Hiện thực `ClassProgressAuthorization` và use case của lớp.**
      Thứ tự kiểm: `class:read-managed` (thiếu → `Forbidden`) → Class tồn tại (`NotFound`) →
      `lecturerId` = principal (`Forbidden`). `GetClassCourseProgress`, `GetClassStudentCourseProgress`
      (sinh viên không đăng ký → `NotFound`), `GetClassAssignmentScores` (Assignment không thuộc Class
      hoặc chủ sở hữu không thấy theo LRN-005 → `NotFound`). Chỉ sinh viên đang đăng ký; Class
      `ARCHIVED` vẫn xem được; `ADMIN` không có ngoại lệ.
      **Phụ thuộc:** LRN-006-T002, LRN-006-T006, LRN-006-T007, LRN-006-T009.
      **Truy vết:** LRN-006-FR-014, FR-015, FR-016; SR-001, SR-003, SR-009; AC-018, AC-019, AC-022,
      AC-023.

- [ ] **LRN-006-T013 — Unit test application.** Port giả và `Clock` giả: `ApplyAcceptedSubmission`
      trùng/mới/đã có dòng, không ghi `ATTEMPTED`; use case của chính mình không nhận người dùng khác;
      phân quyền lớp khẳng định và phủ định (chủ sở hữu, giảng viên khác, `STUDENT` của lớp, `ADMIN`);
      sinh viên không đăng ký; Assignment chưa tới `startsAt`.
      **Phụ thuộc:** LRN-006-T010 tới LRN-006-T012.
      **Truy vết:** AC-001, AC-002, AC-009, AC-017, AC-019, AC-021, AC-022.

## Lưu trữ

- [ ] **LRN-006-T014 — Entity biên nhận và cập nhật entity `Progress`.** Thêm
      `ProgressEventReceipt` cho `progress_event_receipts`, đăng ký trong `learning.entities.ts`. Giữ
      `Progress` và enum `ProgressStatus` (không xoá `Attempted` vì cột enum còn giá trị đó); mapper
      entity ↔ `ProblemProgress` ở adapter. Không chuyển entity vào `libs/`.
      **Phụ thuộc:** LRN-006-T005.
      **Truy vết:** Mục Lưu trữ và Adapter hạ tầng của kế hoạch.

- [ ] **LRN-006-T015 — Adapter `ProgressRepository`.** `recordReceipt` (chèn biên nhận với
      `ON CONFLICT (event_id) DO NOTHING`), `insertIfAbsent` (chèn tiến độ với
      `ON CONFLICT (user_id, problem_id) DO NOTHING`), `loadForUpdate` (`FOR UPDATE`), `save`, dùng
      `EntityManager` của transaction hiện tại. Truy vấn đọc luôn lọc `status = 'SOLVED' AND solved_at IS NOT NULL`; truy vấn gộp theo
      `user_id = ANY` và `problem_id = ANY`.
      **Phụ thuộc:** LRN-006-T009, LRN-006-T014.
      **Truy vết:** LRN-006-FR-004, FR-005, FR-006, FR-010; mục Đồng thời trong Lưu trữ của kế hoạch.

- [ ] **LRN-006-T016 — Integration test lưu trữ và đồng thời.** Biên nhận và tiến độ cùng rollback;
      hai sự kiện khác nhau đồng thời cho cặp mới cho đúng một dòng và kết quả như tuần tự; cùng
      `eventId` đồng thời trên hai kết nối chỉ áp dụng một lần; sự kiện cũ tới lại sau sự kiện mới không
      đổi gì; lỗi cơ sở dữ liệu rồi đưa lại áp dụng đúng một lần.
      **Phụ thuộc:** LRN-006-T010, LRN-006-T015, LRN-006-T019.
      **Truy vết:** AC-002, AC-003, AC-006, AC-008.

- [ ] **LRN-006-T017 — Adapter reader chéo module và `SystemClock`.** `CourseStructureReader` (join
      `courses` → `chapters` → `chapter_problems` → `problems`, lọc như phép chiếu người học của
      LRN-003), `ClassMembershipReader`, `AssignmentReader`, `PublishedProblemFilter`: chỉ SELECT, dùng
      truy vấn do module sở hữu export nếu có (ghi nhận ở T002). Không dùng repository ghi của module
      khác.
      **Phụ thuộc:** LRN-006-T002, LRN-006-T009.
      **Truy vết:** LRN-006-FR-012 tới FR-016, FR-018; SR-004, SR-007.

- [ ] **LRN-006-T018 — Integration test reader.** So kết quả `CourseStructureReader` với phép chiếu
      người học của LRN-003 trên cùng dữ liệu (Problem `ON_HOLD`, xoá mềm, Chapter rỗng, Course không
      `PUBLISHED`); `ClassMembershipReader` chỉ trả sinh viên đang đăng ký; `AssignmentReader` tôn trọng
      xoá mềm và quy tắc hiển thị của LRN-005.
      **Phụ thuộc:** LRN-006-T017, LRN-006-T020.
      **Truy vết:** AC-011, AC-012, AC-017, AC-023; rủi ro "Lặp điều kiện hiển thị" của kế hoạch.

## Cơ sở dữ liệu / Migration

- [ ] **LRN-006-T019 — Viết migration LRN-006.** Tạo
      `apps/learning-service/src/database/migrations/<timestamp>-Lrn006Progress.ts`, chạy sau migration
      của LRN-003/004/005, `synchronize: false`. Up: kiểm tra trước dòng vi phạm (dừng kèm thông báo);
      tạo `progress_event_receipts` (`event_id` PK, `user_id`, `problem_id`, `received_at`); chép
      `last_event_id` khác null vào biên nhận (`ON CONFLICT DO NOTHING`); thêm
      `CHECK (best_score >= 0)` và `CHECK (status <> 'SOLVED' OR solved_at IS NOT NULL)`. Down: bỏ hai
      CHECK, bỏ bảng biên nhận.
      **Phụ thuộc:** LRN-006-T014.
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu và Migration của kế hoạch.

- [ ] **LRN-006-T020 — Kiểm chứng vòng đời migration.** Trên `bkpractice_learning` cách ly có dữ liệu
      tiến độ mẫu: `pnpm migration:run:learning`, kiểm tra schema, biên nhận đã chép và CHECK;
      `pnpm migration:revert:learning`, kiểm tra down không đổi `progress`; chạy lại up.
      **Phụ thuộc:** LRN-006-T019.
      **Truy vết:** Định nghĩa Hoàn thành; chiến lược cơ sở dữ liệu.

## Messaging

- [ ] **LRN-006-T021 — Thay consumer.** Tạo `presentation/submission-accepted.consumer.ts`: ở
      `onModuleInit` gọi `RabbitMqService.consume(RABBIT_QUEUES.learningAccepted, ...)`, chuyển payload
      cho `ApplyAcceptedSubmission`, không bắt `InvalidAcceptedSubmission` hay lỗi lưu trữ để cơ chế
      retry/DLQ hiện có xử lý. Xoá `progress.consumer.ts`. Không sửa `libs/common` hay `libs/contracts`.
      **Phụ thuộc:** LRN-006-T010, LRN-006-T015.
      **Truy vết:** LRN-006-FR-009, FR-010; SR-006; mục Messaging của kế hoạch.

- [ ] **LRN-006-T022 — Integration test messaging.** Với RabbitMQ thật hoặc container test: sự kiện hợp
      lệ được ACK và áp dụng; gửi lại cùng message được ACK không đổi gì; payload hỏng qua 3 lần thử rồi
      nằm ở `learning.submission.accepted.dead`, tiến độ không đổi; đưa lại message từ DLQ sau sự cố cơ
      sở dữ liệu áp dụng đúng một lần.
      **Phụ thuộc:** LRN-006-T021.
      **Truy vết:** AC-002, AC-007, AC-008.

## API / Presentation

- [ ] **LRN-006-T023 — DTO request và response.** `PageQueryDto` (page ≥ 1, limit 1..100, mặc định
      20), `SolvedStatusQueryDto` (1..100 UUID không trùng), `ParseUUIDPipe` cho tham số route;
      `CourseProgressDto`, `AssignmentScoreDto`, DTO trang cho lớp. Ánh xạ tường minh; không có tên,
      email, mã nguồn, Test Case, harness hay kết quả chấm.
      **Phụ thuộc:** LRN-006-T006, LRN-006-T007.
      **Truy vết:** SR-002, SR-005; AC-021, AC-024.

- [ ] **LRN-006-T024 — Controller.** `MyProgressController`: `GET /api/progress/me/problems`,
      `GET /api/progress/me/problems/status` (khai báo trước route có tham số cùng cấp),
      `GET /api/progress/me/courses/:courseId`, `GET /api/progress/me/assignments/:assignmentId`.
      `ClassProgressController`: `GET /api/progress/classes/:classId/course`,
      `GET /api/progress/classes/:classId/students/:studentId/course`,
      `GET /api/progress/classes/:classId/assignments/:assignmentId`. Mỗi route gọi đúng một use case;
      không route ghi.
      **Phụ thuộc:** LRN-006-T011, LRN-006-T012, LRN-006-T023.
      **Truy vết:** LRN-006-FR-011 tới FR-016; SR-006.

- [ ] **LRN-006-T025 — Ánh xạ lỗi.** Theo bảng Xử lý lỗi của kế hoạch: `401`, `403`, `404`, `400`, lỗi
      chuẩn hoá hiện có. Không đưa vào cấu trúc lỗi mới; `404` không lộ nội dung chưa công khai.
      **Phụ thuộc:** LRN-006-T024.
      **Truy vết:** Mục Tình huống lỗi của đặc tả; SR-004, SR-009.

- [ ] **LRN-006-T026 — Cập nhật Swagger.** Mô tả 7 route, DTO, Bearer, mã lỗi; ví dụ dùng UUID giả.
      **Phụ thuộc:** LRN-006-T024.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-006-T027 — Nối dây module `progress`.** Đăng ký use case, gắn port với adapter, consumer,
      controller trong `progress.module.ts`; import `PrincipalProvider`/`TransactionRunner` của LRN-001.
      Không đụng module khác ngoài việc dùng truy vấn chúng export.
      **Phụ thuộc:** LRN-006-T010 tới LRN-006-T012, LRN-006-T015, LRN-006-T017, LRN-006-T021,
      LRN-006-T024.
      **Truy vết:** Mục Adapter hạ tầng và Tuân thủ kiến trúc của kế hoạch.

## Cấu hình

- [ ] **LRN-006-T028 — Thêm tiền tố Gateway.** Trong
      `apps/api-gateway/src/proxy/gateway-proxy.service.ts`, thêm `'/api/progress'` vào tiền tố của
      `LEARNING_SERVICE_URL`. Không thêm biến môi trường, không đổi `.env.example`, Docker hay RabbitMQ.
      **Phụ thuộc:** LRN-006-T024.
      **Truy vết:** Mục Cấu hình của kế hoạch.

## Phân quyền

- [x] **N/A — Seed quyền ở Identity.** LRN-006 không thêm mã quyền. `class:read-managed` do task seed
      của LRN-004 định nghĩa và gán cho `LECTURER`; T002 xác nhận nó đã có.

## Realtime

- [x] **N/A — Không có yêu cầu realtime.** Đặc tả loại trừ thông báo khi tiến độ thay đổi.

## Kiểm thử và bảo mật

- [ ] **LRN-006-T029 — Test API/E2E.** `401` khi chưa xác thực; liệt kê đã giải lọc Problem
      `ON_HOLD`; tiến độ Course với Problem `ON_HOLD`/xoá mềm, Course không `PUBLISHED`, Problem tạm giữ
      rồi xuất bản lại; điểm Assignment đúng hạn/trễ/giải trước khi giao/đúng bằng hạn; Assignment chưa
      hiển thị hoặc không đăng ký → `404`; tiến độ lớp chỉ có sinh viên đang đăng ký, rời lớp; `403`
      cho giảng viên khác, `STUDENT` của lớp, `ADMIN`; query có `userId` bị từ chối.
      **Phụ thuộc:** LRN-006-T024 tới LRN-006-T028.
      **Truy vết:** AC-010 tới AC-024.

- [ ] **LRN-006-T030 — Rà soát bảo mật tập trung.** Phản hồi, lỗi, log, Swagger không chứa header xác
      thực, token, mã nguồn, Test Case, harness hay hồ sơ sinh viên; log consumer chỉ có định danh;
      không route ghi tiến độ; không truy cập CSDL xuyên service; tiến độ của người khác không lộ qua
      route `me/*`.
      **Phụ thuộc:** LRN-006-T029.
      **Truy vết:** LRN-006-SR-001 tới SR-009; AC-021, AC-024.

## Tài liệu và kiểm chứng

- [ ] **LRN-006-T031 — Cập nhật tài liệu vận hành.** Ghi cách theo dõi và đưa lại message ở
      `learning.submission.accepted.dead` bằng công cụ RabbitMQ hiện có và vì sao an toàn; ghi rằng dữ
      liệu tiến độ cũ không được backfill; ghi rủi ro `occurredAt` so với hạn chót.
      **Phụ thuộc:** LRN-006-T022, LRN-006-T026.
      **Truy vết:** Mục Rủi ro của kế hoạch; Định nghĩa Hoàn thành.

- [ ] **LRN-006-T032 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`. Chỉ sửa lỗi thuộc phạm vi; không che lỗi bằng `any`, `@ts-ignore` hay tắt lint.
      **Phụ thuộc:** LRN-006-T029, LRN-006-T030, LRN-006-T031.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-006-T033 — Kiểm chứng tuân thủ kiến trúc.** Domain không import framework; use case chỉ
      phụ thuộc domain và port; consumer và controller chỉ lo transport; reader chéo module chỉ đọc;
      adapter gắn ở composition root; không entity hay use case tiến độ nào trong `libs/`.
      **Phụ thuộc:** LRN-006-T027, LRN-006-T032.
      **Truy vết:** ADR 0002; `dependency-rules.md`; mục Tuân thủ kiến trúc của kế hoạch.

- [ ] **LRN-006-T034 — Đối chiếu với đặc tả.** Rà từng LRN-006-FR-001 tới FR-018, SR-001 tới SR-009,
      AC-001 tới AC-024 với code, test, migration và Swagger. Xác nhận không có hành vi Ngoài phạm vi.
      Báo cáo sai lệch và rủi ro còn lại; không sửa đặc tả để khớp code.
      **Phụ thuộc:** LRN-006-T032, LRN-006-T033.
      **Truy vết:** Đặc tả 1.0; Định nghĩa Hoàn thành.

- [ ] **LRN-006-T035 — Bàn giao theo SDD.** Cập nhật ô đánh dấu trung thực, viết worked entry dưới
      `docs/worked/learning/progress/`, lấy review của con người, chỉ chuyển đặc tả sang `Implemented`
      rồi `Verified` qua quy trình SDD.
      **Phụ thuộc:** LRN-006-T034.
      **Truy vết:** Quy trình SDD.

## Bảng tổng hợp độ phủ

| Yêu cầu               | Công việc triển khai chính         | Kiểm thử/xác minh                  |
| --------------------- | ---------------------------------- | ---------------------------------- |
| LRN-006-FR-001–FR-002 | T003, T021, T024                   | T030, T034                         |
| LRN-006-FR-003–FR-007 | T005, T010, T015                   | T008, T013, T016                   |
| LRN-006-FR-008        | T011, T012, T017                   | T029                               |
| LRN-006-FR-009–FR-010 | T004, T010, T021                   | T008, T016, T022                   |
| LRN-006-FR-011–FR-013 | T006, T007, T011, T017             | T008, T013, T018, T029             |
| LRN-006-FR-014–FR-016 | T006, T007, T012, T017             | T013, T018, T029                   |
| LRN-006-FR-017–FR-018 | T003, T011, T012                   | T033, T034                         |
| LRN-006-SR-001–SR-009 | T011, T012, T021, T023, T024, T025 | T030, T034                         |
| LRN-006-AC-001–AC-024 | —                                  | T008, T013, T016, T018, T022, T029 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
