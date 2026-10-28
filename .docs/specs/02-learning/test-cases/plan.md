# LRN-002 Kế hoạch triển khai Quản lý Test Case

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-29`.

Kế hoạch này bám theo phiên bản `1.2` của đặc tả LRN-002 (các thay đổi 1.2 về harness đã được
phê duyệt ngày `2026-10-28`). Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả. Các quyết định lúc review nằm ở mục
[Quyết định đã phê duyệt](#quyết-định-đã-phê-duyệt).

## Đặc tả liên quan

- [LRN-002 Quản lý Test Case](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.1`
- Ngày phê duyệt: `2026-09-29`

Đặc tả là nguồn chân lý cho Test Case, chế độ `HIDDEN`/`SAMPLE`, harness, điều kiện xuất bản bổ
sung, gói dữ liệu judge, giới hạn và phân quyền. Kế hoạch này không thêm hành vi nào ngoài đặc tả.

## Service đích

Service: Learning Service

Test Case và harness nằm trong module `problems` hiện có
(`apps/learning-service/src/modules/problems/`), trong `bkpractice_learning`. Không tạo module hay
microservice mới. API Gateway chỉ cần đổi giới hạn kích thước body (xem mục Cấu hình).

## Kiến trúc service bắt buộc

Kiến trúc: **DDD + Hexagonal Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- LRN-002 dựng trên các tầng mà LRN-001 tạo trong module `problems`: aggregate `Problem`,
  `PublishValidator`, `ProblemRepository`, `TransactionRunner`, `ProblemAuthorizationService`, cơ chế
  `@TrustedPrincipal()`/`TrustedPrincipalGuard`, và phép chiếu công khai/quản lý. **LRN-001 phải được
  triển khai trước.**
- Chỉ dùng DDD tactical. Không thêm bounded context, CQRS, event store hay base repository chung.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `test_cases` (migration `1700000003000-InitialLearningSchema.ts`): `id` uuid, `problem_id` FK nội
  bộ `ON DELETE CASCADE`, `input` text mặc định `''`, `expected_output` text NOT NULL, `is_hidden`
  boolean mặc định `true`, `score` integer mặc định `1`, `display_order` integer mặc định `0`. Không
  có ràng buộc trên `score` hay `display_order`, không có index ngoài khoá chính.
- Harness nằm ở cột `starter_codes.hidden_harness` (text, `select: false`), tức gắn với dòng
  starter code của từng ngôn ngữ.
- `ProblemsController.judgePackage` trả gói cho mọi Problem theo `id`, không kiểm tra
  `publish_status`, dấu xoá hay ngôn ngữ đang bật. Test Case lấy theo `display_order ASC`, không có
  tie-break.
- `LearningJudgeClient` (Submission) gọi route đó với timeout 5 giây và bọc mọi lỗi thành `503`.
- Body JSON của Gateway và Learning dùng giới hạn mặc định của Express (100 KB). Gateway chuyển tiếp
  body qua axios với timeout 15 giây.
- RabbitMQ là `rabbitmq:4-management-alpine`; RabbitMQ 4 mặc định `max_message_size` là 16 MiB.
  Submission gửi toàn bộ Test Case trong một message `judge.request`.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REUSE     | Bảng `test_cases` và entity `TestCase`; cột `is_hidden` làm chế độ hiển thị; transport contract `JudgeTestCase`/`JudgeRequest`; `InternalServiceGuard`; các port và phép chiếu của LRN-001                                                             |
| MODIFY    | Entity `TestCase` và `StarterCode`; `PublishValidator` của LRN-001 (thêm điều kiện Test Case); mapper chi tiết/xem trước/quản lý của LRN-001; route judge-package; `problems.module.ts`; `main.ts` của Gateway và Learning (giới hạn body)             |
| CREATE    | Aggregate `TestCase`, value object liên quan, `TestSuiteSummary`; entity/bảng `problem_harnesses`; port `TestCaseRepository`, `HarnessRepository`; use case Test Case/harness/gói judge; controller và DTO; migration `Lrn002TestCaseManagement`; test |
| REMOVE    | Cột `starter_codes.hidden_harness` sau khi dữ liệu được chuyển sang `problem_harnesses` (down migration khôi phục lại)                                                                                                                                 |

## Thay đổi ở tầng domain

### Ranh giới aggregate

Một Problem có thể có 100 Test Case, mỗi Test Case tới 2 MiB. Nạp toàn bộ nội dung vào aggregate
`Problem` cho mọi thao tác là không khả thi. Vì vậy:

- **`TestCase` là một aggregate riêng**, khoá theo `problemId`, chứa `TestCaseInput`,
  `ExpectedOutput`, `TestCaseVisibility`, `TestCaseScore`, `DisplayOrder`.
- **`Harness` là một aggregate nhỏ**, khoá theo `(problemId, language)`.
- **Aggregate `Problem` (LRN-001) nhận thêm value object `TestSuiteSummary`**: `hiddenCount`,
  `totalCount`, `totalScore`, `harnessLanguages`, `totalBytes`. Repository tính nó bằng truy vấn
  tổng hợp, không nạp nội dung.
- Các bất biến trải qua nhiều Test Case (điều kiện sẵn sàng, giới hạn số lượng/dung lượng) được kiểm
  tra ở tầng application, trong transaction có khoá dòng `problems` (xem mục Đồng thời).

### Value object

| Khái niệm            | Quy tắc                                                                           | Truy vết       |
| -------------------- | --------------------------------------------------------------------------------- | -------------- |
| `TestCaseId`         | UUID ổn định                                                                      | FR-002         |
| `TestCaseInput`      | Văn bản, được phép rỗng, ≤ 1 MiB tính theo byte UTF-8, lưu nguyên vẹn             | FR-011         |
| `ExpectedOutput`     | Văn bản bắt buộc có (được phép rỗng theo chuẩn hoá của Judge), ≤ 1 MiB byte UTF-8 | FR-011         |
| `TestCaseVisibility` | `HIDDEN` \| `SAMPLE`, mặc định `HIDDEN`                                           | FR-007, AC-017 |
| `TestCaseScore`      | Số nguyên ≥ 0                                                                     | FR-010         |
| `DisplayOrder`       | Số nguyên ≥ 0; thứ tự đọc là `(display_order, id)`                                | FR-006         |
| `HarnessSource`      | Văn bản không rỗng, ≤ 1 MiB byte UTF-8                                            | FR-012         |
| `TestSuiteSummary`   | Tổng hợp chỉ đọc dùng cho kiểm tra sẵn sàng và phép chiếu quản lý                 | FR-013, Đầu ra |

### Mở rộng `PublishValidator` của LRN-001

Thêm các điều kiện của LRN-002-FR-013, dựa trên `TestSuiteSummary`:

- `TEST_CASE_HIDDEN_REQUIRED`: `hiddenCount ≥ 1`.
- `TEST_CASE_SCORE_REQUIRED`: `totalScore > 0` (tính cả `SAMPLE`, theo quyết định 2a).
- `HARNESS_REQUIRED` (chỉ `FUNCTION`/`OOP`): mọi ngôn ngữ đang bật có mặt trong `harnessLanguages`
  (chỉ gồm harness của ngôn ngữ đang bật), báo lỗi theo từng ngôn ngữ thiếu.

Cùng validator được dùng bởi xuất bản, xuất bản lại, phần mức độ sẵn sàng ở phía quản lý, xem trước,
và kiểm tra "giữ điều kiện sẵn sàng" khi sửa Test Case/harness hoặc khi `UpdateProblem` của LRN-001
bật thêm ngôn ngữ cho Problem đã xuất bản.

### Quy tắc khả năng chỉnh sửa

Tái dùng quy tắc của aggregate `Problem`: chỉ `DRAFT` và `PUBLISHED` (chưa xoá mềm) cho phép thay đổi
Test Case và harness; trạng thái khác trả `InvalidProblemState`. Harness chỉ hợp lệ với
`FUNCTION`/`OOP` và ngôn ngữ được hỗ trợ; ngôn ngữ chưa bật vẫn đặt trước được nhưng chưa tính vào
`TestSuiteSummary`.

## Tầng application / Use case

Mỗi use case chạy trong `TransactionRunner`, nạp Problem bằng `loadForUpdate` (khoá dòng), kiểm tra
quyền sở hữu qua `ProblemAuthorizationService`, rồi mới thay đổi dữ liệu.

| Use case            | Quyền                  | Luồng chính                                                                                                                                                                                     | Truy vết                              |
| ------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `AddTestCase`       | `problem:update`       | Kiểm tra trạng thái chỉnh sửa được; kiểm tra `totalCount < 100`, 1 MiB mỗi trường và `totalBytes` mới ≤ 8 MiB; tạo Test Case với thứ tự cuối nếu không chỉ định; lưu                            | FR-003, FR-011, AC-001, 023, 024      |
| `UpdateTestCase`    | `problem:update`       | Test Case phải thuộc Problem trong route (khác thì `404`); áp dụng trường cho phép; kiểm tra lại `totalBytes` ≤ 8 MiB; nếu Problem `PUBLISHED` thì chạy lại điều kiện sẵn sàng trên summary mới | FR-004, FR-017, AC-011, 014           |
| `RemoveTestCase`    | `problem:update`       | Như trên; xoá hẳn; nếu `PUBLISHED` thì kiểm tra còn điều kiện sẵn sàng                                                                                                                          | FR-005, AC-011                        |
| `ReorderTestCases`  | `problem:update`       | Tập ID gửi lên phải trùng đúng tập hiện có; gán `display_order` 0..n-1                                                                                                                          | FR-006, AC-012                        |
| `ListTestCases`     | `problem:read-managed` | Trả mọi Test Case của Problem theo thứ tự, trong phạm vi chủ sở hữu, kèm `TestSuiteSummary`                                                                                                     | FR-008, AC-022                        |
| `GetTestCase`       | `problem:read-managed` | Trả một Test Case đầy đủ                                                                                                                                                                        | FR-008, AC-022                        |
| `SetHarness`        | `problem:update`       | Chỉ `FUNCTION`/`OOP`, ngôn ngữ được hỗ trợ (đặt trước được); upsert theo `(problemId, language)`; nếu ngôn ngữ đang bật thì kiểm tra `totalBytes` ≤ 8 MiB                                       | FR-012, AC-021, AC-025                |
| `RemoveHarness`     | `problem:update`       | Như trên; nếu `PUBLISHED` thì bị chặn khi làm mất điều kiện sẵn sàng                                                                                                                            | FR-012, FR-013                        |
| `GetHarness`        | `problem:read-managed` | Trả harness của một ngôn ngữ cho chủ sở hữu                                                                                                                                                     | FR-012                                |
| `BuildJudgePackage` | Service tin cậy        | Problem phải `PUBLISHED`, chưa xoá, ngôn ngữ đang bật; FUNCTION/OOP phải có harness (thiếu thì từ chối theo hướng đóng); trả Test Case `SAMPLE` + `HIDDEN` theo thứ tự                          | FR-014, FR-015, AC-008, 009, 019, 020 |

Thay đổi ở use case của LRN-001:

- `GetPublishedProblem` và `PreviewProblem` bổ sung danh sách Test Case `SAMPLE` (đầu vào, kết quả
  mong đợi), không kèm điểm (FR-019, FR-009, AC-016).
- `GetManagedProblem`/`ListManagedProblems` bổ sung `TestSuiteSummary` và lỗi sẵn sàng mới.
- `PublishProblem`/`RepublishProblem`/`UpdateProblem` dùng `PublishValidator` đã mở rộng và cũng
  khoá dòng `problems` để không đua với thao tác Test Case.
- `UpdateProblem` kiểm tra readiness và trần 8 MiB **sau khi lưu** trên `TestSuiteSummary` tải lại
  (vì tập ngôn ngữ đang bật quyết định harness nào tính); lỗi thì transaction rollback. Chỉ chặn vượt
  trần khi tổng byte tăng so với trước cập nhật.
- `GetManagedProblem`, `UpdateProblem`, `PublishProblem`, `RepublishProblem`, `HoldProblem`,
  `RestoreProblem` nạp thêm Test Case `SAMPLE` cho `sampleTestCases` của phản hồi quản lý.

### Port

| Port                 | Trách nhiệm                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| `TestCaseRepository` | Nạp/lưu/xoá Test Case theo `(problemId, testCaseId)`; liệt kê theo thứ tự; liệt kê `SAMPLE`; cập nhật thứ tự |
| `HarnessRepository`  | Upsert/xoá/đọc harness theo `(problemId, language)`                                                          |
| `ProblemRepository`  | (LRN-001) thêm `loadForUpdate` và `loadTestSuiteSummary`                                                     |

Không thêm port nào khác.

## Lưu trữ

- Tái dùng `test_cases`. Ánh xạ `is_hidden = true` ↔ `HIDDEN`, `false` ↔ `SAMPLE`. Không đổi tên
  cột.
- Bảng mới `problem_harnesses` thay cho `starter_codes.hidden_harness`, để harness không mất theo
  starter code và thiết lập được trước khi có starter code (quyết định 2).
- Truy vấn quản lý và gói judge luôn lọc theo `problem_id`, sắp theo `(display_order, id)`.
- Phép chiếu công khai chỉ chọn cột `input`, `expected_output`, `display_order` của dòng
  `is_hidden = false`; không bao giờ chọn dòng `HIDDEN`.
- `TestSuiteSummary` dùng một truy vấn tổng hợp:
  `COUNT(*)`, `COUNT(*) FILTER (WHERE is_hidden)`, `SUM(score)`,
  `SUM(octet_length(input) + octet_length(expected_output))`, cộng danh sách ngôn ngữ và
  `SUM(octet_length(source))` trong `problem_harnesses`, chỉ với harness có ngôn ngữ `enabled` trong
  `problem_languages` và Problem không phải `STANDARD`. `totalBytes` là tổng hai phần này. Các số
  liệu đọc từ DB không áp trần (`TestSuiteSummary.fromStored`); trần chỉ áp khi thêm dữ liệu.

### Đồng thời

Mọi thao tác thay đổi Test Case, harness, và các bước xuất bản/xuất bản lại/cập nhật của LRN-001
đều chạy `SELECT ... FROM problems WHERE id = $1 FOR UPDATE` trong cùng transaction. Cách này tuần tự
hoá các thao tác trên cùng một Problem, nên hai lần gỡ đồng thời không thể cùng gỡ Test Case `HIDDEN`
cuối cùng, và giới hạn 100 Test Case không bị vượt.

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_learning`.

- `test_cases`: thêm `CHECK (score >= 0)`, `CHECK (display_order >= 0)`, index
  `(problem_id, display_order)`.
- Tạo `problem_harnesses`: `id` uuid PK, `problem_id` uuid NOT NULL FK nội bộ tới `problems`
  `ON DELETE CASCADE`, `language` varchar(20) NOT NULL, `source` text NOT NULL, `created_at`,
  `updated_at`, `UNIQUE (problem_id, language)`.
- Chuyển dữ liệu: chèn vào `problem_harnesses` mọi dòng `starter_codes` có `hidden_harness IS NOT
NULL`, rồi bỏ cột `starter_codes.hidden_harness`.

Không có khoá ngoại hay truy vấn xuyên service.

## Migration

`apps/learning-service/src/database/migrations/<timestamp>-Lrn002TestCaseManagement.ts`, chạy sau
migration LRN-001, `synchronize: false`.

- **Up:** thêm CHECK và index trên `test_cases`; tạo `problem_harnesses`; chép dữ liệu harness; bỏ
  cột `hidden_harness`.
- **Down:** thêm lại cột `starter_codes.hidden_harness`; chép ngược harness về dòng starter code cùng
  `(problem_id, language)`; bỏ `problem_harnesses`; bỏ index và CHECK. Harness không có dòng starter
  code tương ứng sẽ mất khi down, cần ghi cảnh báo này trong tài liệu triển khai.
- Kiểm chứng bằng `pnpm migration:run:learning` / `pnpm migration:revert:learning` trên cơ sở dữ liệu
  cách ly, có dữ liệu harness mẫu.

## API

Tiền tố `/api/problems` đã được Gateway chuyển tới Learning. Tất cả route cần Bearer token.

| Method + route                                         | Use case            | Phản hồi                                                                       |
| ------------------------------------------------------ | ------------------- | ------------------------------------------------------------------------------ |
| `POST /api/problems/:id/test-cases`                    | `AddTestCase`       | `201` Test Case đầy đủ (quản lý)                                               |
| `PATCH /api/problems/:id/test-cases/:testCaseId`       | `UpdateTestCase`    | `200` Test Case đầy đủ                                                         |
| `DELETE /api/problems/:id/test-cases/:testCaseId`      | `RemoveTestCase`    | `204`                                                                          |
| `PUT /api/problems/:id/test-cases/order`               | `ReorderTestCases`  | `200` danh sách tóm tắt theo thứ tự mới                                        |
| `GET /api/problems/managed/:id/test-cases`             | `ListTestCases`     | `200` danh sách Test Case + `TestSuiteSummary` (đầy đủ nội dung, quyết định 3) |
| `GET /api/problems/managed/:id/test-cases/:testCaseId` | `GetTestCase`       | `200` Test Case đầy đủ                                                         |
| `PUT /api/problems/:id/harnesses/:language`            | `SetHarness`        | `200` harness (quản lý)                                                        |
| `DELETE /api/problems/:id/harnesses/:language`         | `RemoveHarness`     | `204`                                                                          |
| `GET /api/problems/managed/:id/harnesses/:language`    | `GetHarness`        | `200` harness                                                                  |
| `GET internal/problems/:id/judge-package/:language`    | `BuildJudgePackage` | `200` contract `JudgePackage` hiện có, không đổi trường                        |

- Route `PUT .../test-cases/order` phải khai báo trước route có `:testCaseId`.
- Route judge-package giữ `InternalServiceGuard` và `@ApiExcludeEndpoint`. Problem không đủ điều
  kiện hoặc ngôn ngữ đang tắt trả `404`; FUNCTION/OOP thiếu harness trả `409`. Submission hiện bọc
  mọi lỗi thành `503`; việc Submission phân biệt các lỗi này thuộc SUB-002.
- Swagger mô tả các route công khai/quản lý; ví dụ không chứa nội dung Test Case ẩn hay harness thật.

## DTO / Kiểm tra dữ liệu

- `AddTestCaseRequestDto`: `input` (string, tuỳ chọn, mặc định `''`), `expectedOutput` (string, bắt
  buộc), `visibility` (`HIDDEN` \| `SAMPLE`, tuỳ chọn, mặc định `HIDDEN`), `score` (int ≥ 0, bắt
  buộc), `displayOrder` (int ≥ 0, tuỳ chọn).
- `UpdateTestCaseRequestDto`: dạng partial của các trường trên, ngữ nghĩa `PATCH` như LRN-001.
- `ReorderTestCasesRequestDto`: `testCaseIds` (mảng UUID, không trùng, 1..100 phần tử).
- `SetHarnessRequestDto`: `source` (string, không rỗng).
- `language` trong route kiểm tra theo `SUPPORTED_LANGUAGES`.
- Giới hạn 1 MiB kiểm tra theo **byte UTF-8** ở value object domain, vì `MaxLength` của
  class-validator đếm ký tự.
- `ValidationPipe` toàn cục (`whitelist`, `forbidNonWhitelisted`) chặn `problemId`, người tạo, mốc
  thời gian, vai trò, quyền trong body (SR-005, AC-014).
- Response DTO: `ManagedTestCaseResponseDto`, `TestSuiteSummaryDto`, `ManagedHarnessResponseDto`,
  `SampleTestCaseResponseDto` (chỉ `input`, `expectedOutput`, `order`). Tất cả ánh xạ tường minh.

## Phân quyền

- Principal lấy từ `@TrustedPrincipal()`/`TrustedPrincipalGuard` của LRN-001 tại presentation
  (header Gateway đã làm sạch).
- `ProblemAuthorizationService` của LRN-001 đánh giá `problem:update` / `problem:read-managed` cộng
  với quyền sở hữu (`createdBy` = principal). `ADMIN` không có quyền ngầm.
- Cùng phụ thuộc LRN-001-T002: nếu vẫn dùng phương án tạm ánh xạ theo vai trò `LECTURER`, LRN-002
  dùng chung ánh xạ đó và không thêm mã quyền mới.
- Gói judge chỉ qua `InternalServiceGuard`; không phải principal người dùng.

## Messaging / Sự kiện

N/A. LRN-002 không phát event. Transport contract `JudgeRequest` không đổi.

## Realtime

N/A.

## Adapter hạ tầng

- `infrastructure/persistence/test-case.repository.ts`: adapter TypeORM của `TestCaseRepository`.
- `infrastructure/persistence/harness.repository.ts`: adapter TypeORM của `HarnessRepository`.
- `ProblemRepository` (LRN-001) thêm `loadForUpdate` (khoá pessimistic) và `loadTestSuiteSummary`.
- Không thêm adapter HTTP hay messaging.

## Cấu hình

- `apps/api-gateway/src/main.ts` và `apps/learning-service/src/main.ts`: nâng giới hạn body JSON từ
  100 KB mặc định lên đủ cho một Test Case (2 × 1 MiB cộng phần escape JSON), đề xuất `4mb`, qua
  `app.useBodyParser('json', { limit })`. Không thêm biến môi trường mới trừ khi review yêu cầu.
- Không đổi `.env.example`, Docker hay RabbitMQ trong kế hoạch này (quyết định 1).

## Xử lý lỗi

| Điều kiện                                                                        | Ánh xạ                                                      |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Thiếu/sai token                                                                  | `401` qua Gateway                                           |
| Thiếu quyền hoặc không phải chủ sở hữu                                           | `403`                                                       |
| Problem/Test Case không tồn tại, không hiển thị, sai Problem                     | `404`                                                       |
| Problem không ở trạng thái chỉnh sửa được                                        | `409` `InvalidProblemState`                                 |
| Vượt 100 Test Case, vượt 1 MiB, vượt tổng 8 MiB, điểm âm, thiếu kết quả mong đợi | `400`                                                       |
| Harness cho `STANDARD` hoặc ngôn ngữ đang tắt                                    | `400`                                                       |
| Thứ tự không khớp tập hiện có                                                    | `400`                                                       |
| Thay đổi làm Problem `PUBLISHED` mất điều kiện sẵn sàng                          | `400` kèm danh sách điều kiện, như lỗi sẵn sàng của LRN-001 |
| Body vượt giới hạn parser                                                        | `413` của Express                                           |
| Gói judge: Problem không đủ điều kiện / ngôn ngữ tắt                             | `404`                                                       |
| Gói judge: FUNCTION/OOP thiếu harness                                            | `409`                                                       |

Không đưa vào cấu trúc lỗi mới.

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                                          |
| ------- | ---------------------------------------------------------------------------------------------------------------------- |
| SR-001  | Quyền, sở hữu, trạng thái kiểm tra trong use case, không ở controller                                                  |
| SR-002  | Principal chỉ từ decorator/guard tin cậy của LRN-001                                                                   |
| SR-003  | Phép chiếu công khai chỉ đọc dòng `SAMPLE`; harness không có trong phép chiếu công khai; test soi phản hồi/log/Swagger |
| SR-004  | Gói judge giữ `InternalServiceGuard`; không có route công khai tương đương                                             |
| SR-005  | DTO danh sách cho phép + `forbidNonWhitelisted`                                                                        |
| SR-006  | Learning chỉ lưu nội dung; không sinh lệnh hay tên file từ nội dung                                                    |
| SR-007  | Chỉ datasource Learning; không khoá ngoại xuyên service                                                                |
| SR-008  | Không log body request Test Case/harness, không log nội dung gói judge                                                 |
| SR-009  | Thiếu principal hoặc thiếu quyền thì từ chối trước khi đọc dữ liệu                                                     |

## Chiến lược kiểm thử

- **Unit (domain, không cần PostgreSQL):** value object (byte UTF-8, điểm âm, mặc định `HIDDEN`);
  `PublishValidator` mở rộng với mọi tổ hợp thiếu Test Case `HIDDEN` / tổng điểm 0 / thiếu harness
  theo ngôn ngữ (AC-010, AC-018); quy tắc harness chỉ cho FUNCTION/OOP (AC-021).
- **Unit (application, port giả):** mỗi use case: quyền và sở hữu (AC-002), trạng thái (AC-004),
  giới hạn 100 (AC-023), giữ điều kiện sẵn sàng khi `PUBLISHED` (AC-011), sắp xếp lại (AC-012), gói
  judge theo trạng thái/ngôn ngữ/harness (AC-008, AC-009, AC-019, AC-020).
- **Integration (lưu trữ):** ánh xạ `is_hidden`; thứ tự `(display_order, id)`; truy vấn summary;
  khoá dòng tuần tự hoá hai lần gỡ đồng thời; migration up/down có dữ liệu harness.
- **API/E2E:** CRUD và sắp xếp Test Case; người học thấy `SAMPLE` và không thấy `HIDDEN` ở chi tiết
  và xem trước (AC-006, AC-016); `401` khi chưa xác thực (AC-003); trường lạ bị từ chối (AC-014);
  gói judge với bí mật giả mạo (AC-007); lỗi không lộ harness (AC-015); sửa Test Case không đổi kết
  quả Submission cũ (AC-013, kiểm bằng việc Learning không gọi Submission).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID hiện có.
- Log kết quả thao tác (thêm/sửa/gỡ/sắp xếp Test Case, đặt/gỡ harness, cấp/từ chối gói judge) kèm
  `problemId`, `testCaseId`, request ID và kích thước tính bằng byte; không log nội dung.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                                      | Kiểm chứng                     |
| -------------- | --------------------------------------------------------------------- | ------------------------------ |
| FR-001, FR-002 | Aggregate `TestCase` trong Learning; UUID ổn định                     | Kiến trúc, unit                |
| FR-003–FR-006  | `AddTestCase`, `UpdateTestCase`, `RemoveTestCase`, `ReorderTestCases` | API; AC-001, 011, 012          |
| FR-007, FR-019 | `TestCaseVisibility`; mapper chi tiết/xem trước                       | API; AC-016, AC-017            |
| FR-008         | `ListTestCases`, `GetTestCase`                                        | API; AC-022                    |
| FR-009         | Phép chiếu công khai chỉ đọc `SAMPLE`, không điểm                     | API/bảo mật; AC-006            |
| FR-010, FR-011 | `TestCaseScore`; giới hạn byte và số lượng                            | Unit/API; AC-005, 023          |
| FR-012         | `SetHarness`, `RemoveHarness`, `GetHarness`                           | API; AC-021                    |
| FR-013         | `PublishValidator` mở rộng                                            | Unit/API; AC-010, 018          |
| FR-014, FR-015 | `BuildJudgePackage`                                                   | API; AC-008, 009, 019, 020     |
| FR-016         | Không có luồng nào gọi Submission                                     | Rà soát; AC-013                |
| FR-017         | Transaction + khoá dòng                                               | Integration; AC-011            |
| FR-018         | Không có adapter thực thi                                             | Rà soát                        |
| SR-001–SR-009  | Mục Bảo mật                                                           | Test bảo mật; AC-007, 014, 015 |

## Thứ tự triển khai

1. Xác nhận LRN-001 đã triển khai (aggregate, validator, port, phép chiếu) và LRN-001-T002 đã có
   hướng giải quyết.
2. Domain: value object, aggregate `TestCase`/`Harness`, `TestSuiteSummary`, mở rộng
   `PublishValidator`; unit test.
3. Migration LRN-002 và entity; kiểm chứng up/down.
4. Adapter lưu trữ, `loadForUpdate`, truy vấn summary; integration test.
5. Use case Test Case, harness, gói judge; cập nhật use case LRN-001 liên quan.
6. DTO, controller, Swagger; nâng giới hạn body ở Gateway và Learning.
7. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **LRN-001 đã triển khai**, vì LRN-002 mở rộng aggregate, validator, port và phép chiếu của nó.
- **LRN-001-T002** (cơ chế truyền quyền `problem:*`).
- **SUB-002** cho cách Submission xử lý lỗi gói judge và cách tính điểm; **SUB-001** cho việc Run
  Code dùng Test Case `SAMPLE`.

## Rủi ro

- **Kích thước gói judge:** trần 8 MiB giữ gói dưới giới hạn 16 MiB của RabbitMQ, nhưng message vẫn
  lớn; Submission và Judge không được sao chép thêm dữ liệu vào `JudgeRequest` ngoài gói judge.
- **Đổi chỗ lưu harness** làm down migration mất harness không có starter code tương ứng.
- **Đua giữa thao tác Test Case và xuất bản**: giảm thiểu bằng khoá dòng `problems`; LRN-001 cũng
  phải khoá cùng dòng.
- **Chỉnh sửa tại chỗ khi đã xuất bản**: bài nộp cũ được chấm trên bộ Test Case cũ; không chấm lại
  theo đặc tả.
- **Body lớn qua Gateway**: timeout 15 giây và giới hạn body phải đủ cho request 2 MiB.

## Quyết định đã phê duyệt

Chủ sở hữu sản phẩm chốt ngày 2026-09-29:

1. **Tổng dung lượng gói judge.** Giới hạn cũ (100 Test Case × 2 MiB) cho phép gói khoảng 200 MiB,
   trong khi RabbitMQ 4 mặc định từ chối message trên 16 MiB. Chọn thêm trần tổng 8 MiB mỗi Problem
   (đầu vào + kết quả mong đợi + harness). Đặc tả đã sửa thành 1.1 (LRN-002-FR-011, LRN-002-AC-024).
   Không đổi cấu hình RabbitMQ và không đổi kiến trúc truyền tải.
2. **Chỗ lưu harness.** Dùng bảng riêng `problem_harnesses`; bỏ cột `starter_codes.hidden_harness`.
   Việc này thay ghi chú "giữ `hidden_harness` `select: false`" của LRN-001-T022 khi LRN-002 được
   triển khai.
3. **Danh sách quản lý.** `ListTestCases` trả đầy đủ nội dung mọi Test Case, vì trần 8 MiB giữ phản
   hồi ở kích thước chấp nhận được. Thoả LRN-002-AC-022.

## Tuân thủ kiến trúc

- **Chiều phụ thuộc:** controller chỉ dịch transport và gọi use case; application phụ thuộc aggregate
  Problem/TestCase cùng các port; domain không import NestJS, TypeORM hay RabbitMQ; adapter TypeORM
  hiện thực các port tại module `problems`.
- **DDD có lý do:** Test Case và harness tham gia trực tiếp bất biến publish-readiness của Problem;
  việc cập nhật và xuất bản khoá cùng aggregate Problem để không tạo trạng thái nửa vời.
- **Ranh giới module/service:** Test Case ở trong module `problems` của bounded context Learning như
  `learning-service.md` quy định. Gói judge chỉ được phơi qua endpoint nội bộ được bảo vệ; Learning
  không thực thi mã và không truy cập CSDL Submission/Judge.
- **Quyền sở hữu dữ liệu:** mọi bảng Test Case/harness thuộc `bkpractice_learning`; không có khoá
  ngoại hay repository xuyên service, và không chuyển entity/use case nghiệp vụ vào `libs/`.
- **Tiệm tiến:** kế hoạch chỉ căn chỉnh các luồng Problem/Test Case bị thay đổi, không tổ chức lại
  toàn bộ Learning và không có ngoại lệ kiến trúc.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.1). Danh sách công việc dẫn xuất từ kế hoạch này nằm ở
> [`tasks.md`](./tasks.md).
