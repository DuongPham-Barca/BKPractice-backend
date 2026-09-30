# LRN-002 Công việc triển khai Quản lý Test Case

## Trạng thái

Approved — Sẵn sàng triển khai sau LRN-001

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-29`.

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.1`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-29`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **LRN-002-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.1 Approved,
      `plan.md` Approved, kiến trúc Learning (DDD + Hexagonal, ADR 0002). Xác nhận LRN-001 đã triển
      khai: aggregate `Problem`, `PublishValidator`, `ProblemRepository`, `PrincipalProvider`,
      `ProblemAuthorizationService`, `TransactionRunner`, các phép chiếu công khai/quản lý, và
      migration LRN-001. Nếu LRN-001 chưa xong, **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; mục Thứ tự triển khai bước 1 của kế hoạch.

- [ ] **LRN-002-T002 — Xác nhận cơ chế quyền.** Ghi lại kết quả của LRN-001-T002 (seam đã phê duyệt ở ID-003
      0.4: claim `permissions` → header `x-auth-permissions`). LRN-002 dùng đúng
      seam đó cho `problem:update` và `problem:read-managed`, không thêm mã quyền mới và không bao
      giờ rơi về dữ liệu do client cung cấp.
      **Phụ thuộc:** LRN-002-T001.
      **Truy vết:** Mục Phân quyền của kế hoạch; LRN-002-SR-001, SR-002; quyết định 9 của đặc tả.

- [ ] **LRN-002-T003 — Xác nhận ranh giới và loại trừ.** Ghi nhận: không chấm lại, không checker
      tuỳ chỉnh, không import hàng loạt, không subtask, không giới hạn theo từng Test Case, không đổi
      hành vi Run Code hay cách Judge chấm, không microservice mới, không truy cập CSDL xuyên service.
      **Phụ thuộc:** LRN-002-T001.
      **Truy vết:** Mục Ngoài phạm vi của đặc tả; LRN-002-FR-016, FR-018; SR-007.

## Domain

- [ ] **LRN-002-T004 — Thêm value object.** `TestCaseId`, `TestCaseInput`, `ExpectedOutput`,
      `TestCaseVisibility` (`HIDDEN` mặc định | `SAMPLE`), `TestCaseScore` (≥ 0), `DisplayOrder`
      (≥ 0), `HarnessSource` (không rỗng). Giới hạn 1 MiB mỗi trường tính theo byte UTF-8. Bất biến,
      kiểm tra khi khởi tạo, không import NestJS/TypeORM.
      **Phụ thuộc:** LRN-002-T001.
      **Truy vết:** LRN-002-FR-002, FR-007, FR-010, FR-011, FR-012; AC-005, AC-017.

- [ ] **LRN-002-T005 — Hiện thực aggregate `TestCase` và `Harness`.** `TestCase` khoá theo
      `problemId`; `Harness` khoá theo `(problemId, language)`. Không chứa state của Submission hay
      Judge.
      **Phụ thuộc:** LRN-002-T004.
      **Truy vết:** LRN-002-FR-001, FR-002, FR-012; mục Ranh giới aggregate của kế hoạch.

- [ ] **LRN-002-T006 — Thêm `TestSuiteSummary` vào aggregate `Problem`.** Gồm `hiddenCount`,
      `totalCount`, `totalScore`, `harnessLanguages`, `totalBytes`. Là value object chỉ đọc; kèm các
      kiểm tra giới hạn: `totalCount ≤ 100`, `totalBytes ≤ 8 MiB`.
      **Phụ thuộc:** LRN-002-T004.
      **Truy vết:** LRN-002-FR-011, FR-013; AC-023, AC-024.

- [ ] **LRN-002-T007 — Mở rộng `PublishValidator` của LRN-001.** Thêm
      `TEST_CASE_HIDDEN_REQUIRED` (≥ 1 `HIDDEN`), `TEST_CASE_SCORE_REQUIRED` (tổng điểm mọi Test Case > 0), `HARNESS_REQUIRED` (FUNCTION/OOP, báo theo từng ngôn ngữ đang bật thiếu harness). Dùng
      chung cho xuất bản, xuất bản lại, mức độ sẵn sàng phía quản lý, xem trước, và kiểm tra "giữ
      điều kiện sẵn sàng" khi sửa Problem `PUBLISHED`.
      **Phụ thuộc:** LRN-002-T006.
      **Truy vết:** LRN-002-FR-013; AC-010, AC-011, AC-018.

- [ ] **LRN-002-T008 — Quy tắc khả năng chỉnh sửa.** Tái dùng quy tắc của aggregate `Problem`: chỉ
      `DRAFT` và `PUBLISHED` chưa xoá mềm cho phép thay đổi Test Case/harness, ngược lại
      `InvalidProblemState`. Harness chỉ hợp lệ với FUNCTION/OOP và ngôn ngữ đang bật.
      **Phụ thuộc:** LRN-002-T005.
      **Truy vết:** Quy tắc nghiệp vụ của đặc tả; LRN-002-FR-012; AC-004, AC-021.

- [ ] **LRN-002-T009 — Unit test domain.** Value object (byte UTF-8, điểm âm, mặc định `HIDDEN`),
      giới hạn trong `TestSuiteSummary`, mọi tổ hợp lỗi của `PublishValidator` mở rộng, quy tắc
      harness. Chạy được không cần PostgreSQL.
      **Phụ thuộc:** LRN-002-T004 tới LRN-002-T008.
      **Truy vết:** AC-004, AC-005, AC-010, AC-017, AC-018, AC-021, AC-023, AC-024.

## Tầng application

- [ ] **LRN-002-T010 — Định nghĩa port.** Chỉ thêm `TestCaseRepository`, `HarnessRepository`, và
      thêm `loadForUpdate`, `loadTestSuiteSummary` vào `ProblemRepository` của LRN-001. Không port
      nào khác.
      **Phụ thuộc:** LRN-002-T005, LRN-002-T006.
      **Truy vết:** Mục Port của kế hoạch.

- [ ] **LRN-002-T011 — Hiện thực `AddTestCase`, `UpdateTestCase`, `RemoveTestCase`.** Trong
      `TransactionRunner`, `loadForUpdate` Problem, kiểm tra `problem:update` + sở hữu, trạng thái
      chỉnh sửa được, Test Case thuộc đúng Problem (khác thì không tìm thấy), giới hạn 100 / 1 MiB /
      8 MiB, và nếu `PUBLISHED` thì giữ điều kiện sẵn sàng. Gỡ là xoá hẳn.
      **Phụ thuộc:** LRN-002-T002, LRN-002-T007, LRN-002-T008, LRN-002-T010.
      **Truy vết:** LRN-002-FR-003, FR-004, FR-005, FR-011, FR-017; AC-001, AC-002, AC-004, AC-005,
      AC-011, AC-023, AC-024.

- [ ] **LRN-002-T012 — Hiện thực `ReorderTestCases`.** Tập ID phải trùng đúng tập Test Case hiện
      có; gán `display_order` 0..n-1 trong cùng transaction.
      **Phụ thuộc:** LRN-002-T011.
      **Truy vết:** LRN-002-FR-006; AC-012.

- [ ] **LRN-002-T013 — Hiện thực `ListTestCases` và `GetTestCase`.** `problem:read-managed` + sở
      hữu; trả đầy đủ nội dung theo thứ tự `(display_order, id)`, kèm `TestSuiteSummary`. Problem đã
      xoá mềm không đọc được.
      **Phụ thuộc:** LRN-002-T002, LRN-002-T010.
      **Truy vết:** LRN-002-FR-008; AC-002, AC-022.

- [ ] **LRN-002-T014 — Hiện thực `SetHarness`, `RemoveHarness`, `GetHarness`.** Chỉ FUNCTION/OOP,
      ngôn ngữ đang bật; upsert theo `(problemId, language)`; kiểm tra 1 MiB và 8 MiB; gỡ bị chặn nếu
      Problem `PUBLISHED` mất điều kiện sẵn sàng.
      **Phụ thuộc:** LRN-002-T007, LRN-002-T008, LRN-002-T010.
      **Truy vết:** LRN-002-FR-012, FR-013; AC-021, AC-024.

- [ ] **LRN-002-T015 — Hiện thực `BuildJudgePackage`.** Chỉ Problem `PUBLISHED` chưa xoá mềm và
      ngôn ngữ đang bật; FUNCTION/OOP thiếu harness thì từ chối theo hướng đóng; trả Test Case
      `SAMPLE` + `HIDDEN` theo thứ tự, đúng các trường của contract `JudgePackage` hiện có.
      **Phụ thuộc:** LRN-002-T010.
      **Truy vết:** LRN-002-FR-014, FR-015; AC-008, AC-009, AC-019, AC-020.

- [ ] **LRN-002-T016 — Cập nhật use case của LRN-001.** `GetPublishedProblem` và `PreviewProblem`
      bổ sung Test Case `SAMPLE` (đầu vào, kết quả mong đợi, thứ tự; không điểm).
      `GetManagedProblem`/`ListManagedProblems` bổ sung `TestSuiteSummary` và lỗi sẵn sàng mới.
      `PublishProblem`, `RepublishProblem`, `UpdateProblem` dùng validator mở rộng và `loadForUpdate`;
      `UpdateProblem` bật thêm ngôn ngữ cho FUNCTION/OOP đã xuất bản mà thiếu harness thì bị từ chối.
      **Phụ thuộc:** LRN-002-T007, LRN-002-T010.
      **Truy vết:** LRN-002-FR-009, FR-013, FR-019; AC-006, AC-010, AC-016, AC-018.

- [ ] **LRN-002-T017 — Unit test application.** Dùng port giả để kiểm quyền và sở hữu, trạng thái,
      giới hạn, giữ điều kiện sẵn sàng, sắp xếp lại, gói judge theo trạng thái/ngôn ngữ/harness, và
      việc thất bại không để lại thay đổi dở dang.
      **Phụ thuộc:** LRN-002-T011 tới LRN-002-T016.
      **Truy vết:** AC-002, AC-004, AC-008, AC-009, AC-011, AC-012, AC-019, AC-020, AC-023, AC-024.

## Lưu trữ

- [ ] **LRN-002-T018 — Cập nhật entity.** `TestCase` ánh xạ `is_hidden` ↔ `TestCaseVisibility`.
      Thêm entity `ProblemHarness` cho bảng `problem_harnesses` và đăng ký trong
      `learning.entities.ts`. Bỏ trường `hiddenHarness` khỏi `StarterCode`. Không chuyển entity vào
      `libs/`.
      **Phụ thuộc:** LRN-002-T005.
      **Truy vết:** Mục Lưu trữ của kế hoạch; quyết định 2 của kế hoạch.

- [ ] **LRN-002-T019 — Hiện thực adapter `TestCaseRepository` và `HarnessRepository`.** Chỉ dùng
      datasource Learning; luôn lọc theo `problem_id`; sắp `(display_order, id)`; phép chiếu công khai
      chỉ chọn dòng `is_hidden = false` và không chọn cột `score`.
      **Phụ thuộc:** LRN-002-T010, LRN-002-T018.
      **Truy vết:** LRN-002-FR-006, FR-009; SR-003, SR-007.

- [ ] **LRN-002-T020 — Mở rộng adapter `ProblemRepository`.** `loadForUpdate` dùng khoá pessimistic
      (`SELECT ... FOR UPDATE`) trong transaction hiện tại. `loadTestSuiteSummary` dùng một truy vấn
      tổng hợp trên `test_cases` và `problem_harnesses`, gồm `totalBytes` bằng `octet_length`.
      **Phụ thuộc:** LRN-002-T010, LRN-002-T018.
      **Truy vết:** LRN-002-FR-011, FR-013, FR-017; mục Đồng thời của kế hoạch.

- [ ] **LRN-002-T021 — Integration test lưu trữ và đồng thời.** Ánh xạ `is_hidden`; thứ tự ổn định;
      truy vấn summary đúng; hai lần gỡ đồng thời không cùng gỡ được Test Case `HIDDEN` cuối cùng của
      Problem `PUBLISHED`; hai lần thêm đồng thời không vượt 100 hay 8 MiB.
      **Phụ thuộc:** LRN-002-T019, LRN-002-T020, LRN-002-T023.
      **Truy vết:** AC-011, AC-012, AC-023, AC-024.

## Cơ sở dữ liệu / Migration

- [ ] **LRN-002-T022 — Viết migration LRN-002.** Tạo
      `apps/learning-service/src/database/migrations/<timestamp>-Lrn002TestCaseManagement.ts`, chạy
      sau migration LRN-001, `synchronize: false`. Up: `CHECK (score >= 0)`,
      `CHECK (display_order >= 0)`, index `(problem_id, display_order)` trên `test_cases`; tạo
      `problem_harnesses` với `UNIQUE (problem_id, language)` và FK nội bộ `ON DELETE CASCADE`; chép
      `starter_codes.hidden_harness` khác null sang bảng mới; bỏ cột `hidden_harness`. Down: thêm lại
      cột, chép ngược harness về dòng starter code cùng `(problem_id, language)`, bỏ bảng, index,
      CHECK.
      **Phụ thuộc:** LRN-002-T018.
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu và Migration của kế hoạch.

- [ ] **LRN-002-T023 — Kiểm chứng vòng đời migration.** Trên `bkpractice_learning` cách ly có dữ
      liệu harness mẫu: `pnpm migration:run:learning`, kiểm tra schema và dữ liệu đã chuyển,
      `pnpm migration:revert:learning`, kiểm tra down, chạy lại up. Ghi lại rằng harness không có dòng
      starter code tương ứng sẽ mất khi down.
      **Phụ thuộc:** LRN-002-T022.
      **Truy vết:** Định nghĩa Hoàn thành; chiến lược cơ sở dữ liệu.

## API / Presentation

- [ ] **LRN-002-T024 — Tạo DTO request.** `AddTestCaseRequestDto`, `UpdateTestCaseRequestDto`
      (partial, ngữ nghĩa `PATCH` như LRN-001), `ReorderTestCasesRequestDto` (UUID không trùng,
      1..100), `SetHarnessRequestDto`. `language` trong route kiểm theo `SUPPORTED_LANGUAGES`. Không
      payload nào đặt được `problemId`, người tạo, mốc thời gian, vai trò hay quyền.
      **Phụ thuộc:** LRN-002-T004.
      **Truy vết:** LRN-002-SR-005; AC-005, AC-014.

- [ ] **LRN-002-T025 — Tạo DTO response và mapper.** `ManagedTestCaseResponseDto`,
      `TestSuiteSummaryDto`, `ManagedHarnessResponseDto`, `SampleTestCaseResponseDto` (chỉ `input`,
      `expectedOutput`, `order`). Ánh xạ tường minh; không trả entity trực tiếp.
      **Phụ thuộc:** LRN-002-T005, LRN-002-T006.
      **Truy vết:** LRN-002-FR-008, FR-009, FR-019; SR-003; AC-006, AC-016, AC-022.

- [ ] **LRN-002-T026 — Hiện thực route quản lý.** `POST /api/problems/:id/test-cases`,
      `PATCH|DELETE /api/problems/:id/test-cases/:testCaseId`,
      `PUT /api/problems/:id/test-cases/order` (khai báo trước route có `:testCaseId`),
      `GET /api/problems/managed/:id/test-cases`, `GET /api/problems/managed/:id/test-cases/:testCaseId`,
      `PUT|DELETE /api/problems/:id/harnesses/:language`,
      `GET /api/problems/managed/:id/harnesses/:language`. Mỗi route gọi đúng một use case; controller
      chỉ lo transport.
      **Phụ thuộc:** LRN-002-T011 tới LRN-002-T014, LRN-002-T024, LRN-002-T025.
      **Truy vết:** LRN-002-FR-003 tới FR-008, FR-012; AC-001, AC-012, AC-021, AC-022.

- [ ] **LRN-002-T027 — Cập nhật route judge-package nội bộ.** Gọi `BuildJudgePackage`; giữ
      `InternalServiceGuard` và `@ApiExcludeEndpoint`; Problem không đủ điều kiện hoặc ngôn ngữ tắt
      trả `404`, FUNCTION/OOP thiếu harness trả `409`; các trường phản hồi không đổi.
      **Phụ thuộc:** LRN-002-T015.
      **Truy vết:** LRN-002-FR-014, FR-015; SR-004; AC-007, AC-008, AC-009, AC-019, AC-020.

- [ ] **LRN-002-T028 — Ánh xạ lỗi.** Theo bảng Xử lý lỗi của kế hoạch: `401`, `403`, `404`, `409`
      `InvalidProblemState`, `400` cho kiểm tra dữ liệu và mất điều kiện sẵn sàng (kèm danh sách điều
      kiện), `413` khi body vượt giới hạn. Không đưa vào cấu trúc lỗi mới.
      **Phụ thuộc:** LRN-002-T026, LRN-002-T027.
      **Truy vết:** Mục Tình huống lỗi của đặc tả; LRN-002-FR-017; SR-009.

- [ ] **LRN-002-T029 — Cập nhật Swagger.** Mô tả các route quản lý, DTO, yêu cầu Bearer, mã lỗi. Ví
      dụ không chứa nội dung Test Case ẩn hay harness thật. Route nội bộ vẫn ẩn khỏi Swagger.
      **Phụ thuộc:** LRN-002-T026.
      **Truy vết:** LRN-002-SR-003; AC-015.

- [ ] **LRN-002-T030 — Nối dây module `problems`.** Đăng ký use case, gắn `TestCaseRepository`,
      `HarnessRepository` với adapter TypeORM. Không đụng Courses/Assignments/Progress.
      **Phụ thuộc:** LRN-002-T011 tới LRN-002-T016, LRN-002-T019, LRN-002-T020, LRN-002-T026,
      LRN-002-T027.
      **Truy vết:** Mục Adapter hạ tầng và Tuân thủ kiến trúc của kế hoạch.

## Cấu hình

- [ ] **LRN-002-T031 — Nâng giới hạn body JSON.** Trong `apps/api-gateway/src/main.ts` và
      `apps/learning-service/src/main.ts`, đặt `app.useBodyParser('json', { limit: '4mb' })` (dùng
      `NestExpressApplication`). Xác nhận Gateway chuyển tiếp được request khoảng 2 MiB trong timeout
      15 giây. Không thêm biến môi trường, không đổi `.env.example`, Docker hay RabbitMQ.
      **Phụ thuộc:** LRN-002-T026.
      **Truy vết:** Mục Cấu hình của kế hoạch; LRN-002-FR-011.

## Messaging

- [x] **N/A — LRN-002 không phát event.** Transport contract `JudgeRequest` không đổi; không có
      exchange, queue, routing key, retry hay DLQ mới.

## Realtime

- [x] **N/A — Không có yêu cầu realtime.**

## Kiểm thử và bảo mật

- [ ] **LRN-002-T032 — Test API/E2E.** CRUD và sắp xếp Test Case; người học thấy `SAMPLE` và không
      thấy `HIDDEN` ở chi tiết và xem trước; `401` khi chưa xác thực; `403` cho người không phải chủ
      sở hữu, `STUDENT`, `ADMIN` chưa được cấp; trường lạ bị từ chối; xuất bản bị chặn khi thiếu
      điều kiện Test Case; gói judge với bí mật giả mạo và với Problem `DRAFT`.
      **Phụ thuộc:** LRN-002-T026 tới LRN-002-T031.
      **Truy vết:** AC-001 tới AC-024.

- [ ] **LRN-002-T033 — Rà soát bảo mật tập trung.** Kiểm phản hồi, lỗi, log, Swagger không chứa dữ
      liệu Test Case ẩn, harness, bí mật service hay header xác thực; không log body request Test
      Case/harness; không có truy cập CSDL xuyên service; nội dung Test Case không trở thành lệnh
      runtime.
      **Phụ thuộc:** LRN-002-T032.
      **Truy vết:** LRN-002-SR-001 tới SR-009; AC-006, AC-007, AC-015.

## Tài liệu và kiểm chứng

- [ ] **LRN-002-T034 — Cập nhật tài liệu triển khai.** Ghi cảnh báo down migration mất harness không
      có starter code; ghi rằng route judge-package đổi hành vi (chặn Problem chưa xuất bản) và
      Submission hiện bọc lỗi thành `503` cho tới SUB-002; ghi rủi ro chỉnh sửa tại chỗ khi đã xuất
      bản.
      **Phụ thuộc:** LRN-002-T023, LRN-002-T029.
      **Truy vết:** Mục Rủi ro của kế hoạch; Định nghĩa Hoàn thành.

- [ ] **LRN-002-T035 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`. Chỉ sửa lỗi thuộc phạm vi; không che lỗi bằng `any`, `@ts-ignore` hay tắt lint.
      **Phụ thuộc:** LRN-002-T032, LRN-002-T033, LRN-002-T034.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-002-T036 — Kiểm chứng tuân thủ kiến trúc.** Domain không import NestJS/TypeORM; use case
      chỉ phụ thuộc domain và port; controller chỉ lo transport; adapter gắn ở composition root; không
      entity hay use case Test Case nào trong `libs/`.
      **Phụ thuộc:** LRN-002-T030, LRN-002-T035.
      **Truy vết:** ADR 0002; `dependency-rules.md`; mục Kiến trúc của kế hoạch.

- [ ] **LRN-002-T037 — Đối chiếu với đặc tả.** Rà từng LRN-002-FR-001 tới FR-019, SR-001 tới SR-009,
      AC-001 tới AC-024 với code, test, migration và Swagger. Xác nhận không có hành vi Ngoài phạm vi.
      Báo cáo sai lệch và rủi ro còn lại; không sửa đặc tả để khớp code.
      **Phụ thuộc:** LRN-002-T035, LRN-002-T036.
      **Truy vết:** Đặc tả 1.1; Định nghĩa Hoàn thành.

- [ ] **LRN-002-T038 — Bàn giao theo SDD.** Cập nhật ô đánh dấu trung thực, viết worked entry, lấy
      review của con người, chỉ chuyển đặc tả sang `Implemented` rồi `Verified` qua quy trình SDD.
      **Phụ thuộc:** LRN-002-T037.
      **Truy vết:** Quy trình SDD.

## Bảng tổng hợp độ phủ

| Yêu cầu               | Công việc triển khai chính   | Kiểm thử/xác minh      |
| --------------------- | ---------------------------- | ---------------------- |
| LRN-002-FR-001–FR-002 | T005, T018                   | T009, T036, T037       |
| LRN-002-FR-003–FR-006 | T011, T012, T026             | T017, T021, T032       |
| LRN-002-FR-007–FR-009 | T004, T013, T016, T019, T025 | T009, T032, T033       |
| LRN-002-FR-010–FR-011 | T004, T006, T011, T020, T031 | T009, T021, T032       |
| LRN-002-FR-012–FR-013 | T007, T008, T014, T016       | T009, T017, T032       |
| LRN-002-FR-014–FR-015 | T015, T027                   | T017, T032             |
| LRN-002-FR-016–FR-018 | T003, T011                   | T033, T037             |
| LRN-002-FR-019        | T016, T025                   | T032                   |
| LRN-002-SR-001–SR-009 | T002, T019, T024, T027, T028 | T033, T037             |
| LRN-002-AC-001–AC-024 | —                            | T009, T017, T021, T032 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
