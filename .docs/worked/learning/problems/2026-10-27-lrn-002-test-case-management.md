# 2026-10-27 — Triển khai LRN-002 Quản lý Test Case

- Author: OpenCode agent
- Scope: Source, test, migration, cấu hình body parser và tài liệu trong `apps/learning-service` +
  `apps/api-gateway`; không commit.

## Spec and plan

- Spec: `.docs/specs/02-learning/test-cases/spec.md` — LRN-002 phiên bản 1.1, `Approved`.
- Plan: `.docs/specs/02-learning/test-cases/plan.md` — Approved 2026-09-29.
- Tasks: `.docs/specs/02-learning/test-cases/tasks.md` — T001–T038.
- Spec status at start: `Approved`.

## Questions clarified

| Question                                        | Conclusion                                                                                                                                                              | Source                                                  |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Quyền `problem:*` đến Learning bằng cách nào?   | Giữ đúng seam LRN-001 (`x-auth-permissions`); không thêm fallback hay mã quyền mới. Seam Identity/Gateway vẫn chưa ship nên managed API chưa thể kiểm chứng end-to-end. | LRN-001-T002, LRN-002 plan mục Phân quyền               |
| Preview có được trả `testSuiteSummary` không?   | Không. Preview dùng mapper riêng, chỉ trả SAMPLE và readiness, để không lộ số lượng Test Case HIDDEN.                                                                   | LRN-002-FR-009, AC-006                                  |
| `PATCH` Test Case có nhận `displayOrder` không? | Có, theo DTO partial của plan; route reorder vẫn là cách sắp xếp toàn bộ.                                                                                               | LRN-002 plan mục DTO / Kiểm tra dữ liệu                 |
| Có dùng `supertest` cho API/E2E không?          | Không thêm dependency. Dùng Nest testing + `NestExpressApplication` + Node `fetch` với cổng tạm.                                                                        | Repo hiện không có supertest; plan yêu cầu test API/E2E |
| Có chạy migration trên database thật không?     | Không. Không có `TEST_DATABASE_URL` và không có phạm vi cho phép thao tác database; chỉ rà migration.                                                                   | Working agreement — Repository tooling and safety       |

## What was done

- Thêm domain `TestCase`/`Harness`, các value object (`TestCaseId`, `TestCaseInput`,
  `ExpectedOutput`, `TestCaseVisibility`, `TestCaseScore`, `DisplayOrder`, `HarnessSource`,
  `TestSuiteSummary`), kiểm tra byte UTF-8 và giới hạn 100 Test Case / 1 MiB mỗi trường / 8 MiB mỗi
  Problem.
- Mở rộng aggregate `Problem` với summary, quy tắc chỉnh sửa Test Case/harness và các điều kiện
  `PublishValidator` mới: `TEST_CASE_HIDDEN_REQUIRED`, `TEST_CASE_SCORE_REQUIRED`,
  `HARNESS_REQUIRED`.
- Thêm port/adapter TypeORM cho Test Case và harness, `loadForUpdate` và `loadTestSuiteSummary`;
  migration tạo `problem_harnesses`, chuyển dữ liệu từ `starter_codes.hidden_harness` và thêm CHECK,
  index.
- Thêm use case Add/Update/Remove/Reorder/List/Get Test Case, Set/Remove/Get Harness,
  BuildJudgePackage và `TestSuiteReadinessService`. Các use case ghi đều chạy trong transaction và
  khoá dòng Problem.
- Mở rộng API quản lý trong `ManagedTestCasesController`; route judge-package chuyển sang
  `BuildJudgePackageUseCase`; response public/preview chỉ lộ SAMPLE. Preview có mapper riêng để không
  trả `testSuiteSummary`.
- Nâng body parser JSON lên 4 MiB ở Gateway và Learning; thêm DTO/mapper/Swagger và test HTTP
  contract.

## Why these choices

- Giữ Test Case/harness trong module `problems` và `bkpractice_learning` đúng ranh giới service, ADR
  0002 và LRN-002-FR-001/FR-002; không tạo microservice hay bảng xuyên service.
- Dùng aggregate `TestCase`/`Harness` riêng thay vì nạp toàn bộ nội dung vào `Problem`, nhưng vẫn
  tính summary bằng truy vấn tổng hợp để giữ aggregate Problem nhẹ.
- Khoá dòng Problem trong transaction để tuần tự hoá các thay đổi Test Case/harness và tránh hai
  thao tác đồng thời cùng làm mất Test Case HIDDEN cuối cùng hoặc vượt giới hạn.
- Preview dùng `toPreviewDetail` thay vì `toManagedDetail` vì AC-006 cấm lộ số lượng Test Case ẩn;
  managed detail/list mới được phép có `testSuiteSummary`.
- Không đổi transport `JudgeRequest`/`JudgeTestCase`; gói judge vẫn dùng các trường hiện có để
  Submission/Judge không phải đổi contract.

## How the feature works

1. Giảng viên sở hữu Problem gọi route quản lý Test Case/harness qua API Gateway.
2. `TrustedPrincipalGuard` lấy principal từ header Gateway; use case kiểm tra `problem:update` hoặc
   `problem:read-managed` và quyền sở hữu.
3. Use case mở transaction, khoá Problem, nạp summary, kiểm tra trạng thái và giới hạn; với Problem
   `PUBLISHED`, chạy lại `PublishValidator` trước khi ghi.
4. Adapter ghi/xoá Test Case hoặc upsert harness; lỗi giữa chừng rollback toàn bộ transaction.
5. Người học đọc Problem đã xuất bản thấy SAMPLE; owner đọc managed thấy đầy đủ và summary; preview
   chỉ thấy SAMPLE.
6. Submission gọi route nội bộ được bảo vệ; Learning chỉ trả gói khi Problem `PUBLISHED`, chưa xoá,
   ngôn ngữ đang bật và có harness cần thiết. Lỗi được trả theo quy ước hiện có; Submission hiện bọc
   thành `503`.

## Spec cross-check

- **FR-001–FR-019:** Test Case/harness thuộc Learning và module `problems`; CRUD, thứ tự, visibility,
  điểm, giới hạn byte/số lượng, harness FUNCTION/OOP, readiness, judge package, SAMPLE, không chấm
  lại và không thực thi mã đều có đường code tương ứng.
- **SR-001–SR-009:** quyền/sở hữu nằm trong use case; principal chỉ lấy từ header tin cậy; projection
  công khai chỉ đọc SAMPLE; judge package giữ guard nội bộ; DTO whitelist; không có log nội dung;
  không có truy cập CSDL xuyên service.
- **AC-001–AC-024:** đã có test domain/application/HTTP contract cho CRUD, quyền, trạng thái, giới
  hạn, readiness, reorder, judge package, SAMPLE/HIDDEN và preview không lộ summary. AC-006 được xử
  lý riêng bằng `toPreviewDetail` để không trả `testSuiteSummary`.
- **Sai lệch đã biết:** mục "Khả năng quan sát" của plan đề xuất log kết quả thao tác kèm kích thước;
  bản này chưa thêm log mới (chỉ giữ correlation ID hiện có), nên không có nội dung Test Case/harness
  bị log. Các sai lệch còn lại nằm ở phần Remaining.

## Configuration

- `apps/api-gateway/src/main.ts`: `app.useBodyParser('json', { limit: '4mb' })` — nhận payload JSON
  lớn hơn giới hạn Express mặc định để chuyển tiếp Test Case hợp lệ.
- `apps/learning-service/src/main.ts`: cùng cấu hình — Learning nhận trực tiếp payload lớn.
- Không thêm biến môi trường, Docker, RabbitMQ hay dependency mới.

## Verification

- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test --runInBand`: 50 suite pass, 1 suite integration skip (18 test skip), 357 test pass.
- `pnpm build`: pass cho cả 6 service (`api-gateway`, `identity-service`, `learning-service`,
  `submission-service`, `judge-service`, `community-service`).
- Migration chỉ được rà code; chưa chạy up/down trên PostgreSQL cách ly.

## Remaining

- Not done:
  - LRN-002-T002: chờ seam quyền Identity/Gateway của LRN-001.
  - LRN-002-T021/T023: integration/migration cần `TEST_DATABASE_URL` và database cách ly.
  - LRN-002-T031: chưa xác nhận Gateway chuyển tiếp request khoảng 2 MiB trong timeout 15 giây.
  - LRN-002-T038: cần review người và chuyển spec sang `Implemented`/`Verified`.
  - Chưa commit.
- Risks:
  - Down migration mất harness không có dòng starter code tương ứng.
  - `score`/`displayOrder` chưa cap int32 của PostgreSQL; giá trị rất lớn có thể lỗi ghi.
  - Đổi Problem từ FUNCTION/OOP sang STANDARD ở trạng thái DRAFT có thể để lại hàng harness cũ; dữ
    liệu này không được dùng khi judge STANDARD nhưng vẫn tồn tại.
  - Harness của ngôn ngữ bị tắt sau đó vẫn còn trong bảng; `RemoveHarness` cho phép dọn nhưng
    `GetHarness` có thể đọc được.
  - `ProblemExceptionFilter` đã sửa body lỗi từ dạng spread string sai sang `{ statusCode, message,
issues? }`; đây là thay đổi hành vi lỗi của LRN-001 cần lưu ý khi client cũ phụ thuộc body cũ.
