# 2026-11-07 — Sửa ba lỗi review PR Learning

- Author: Codex
- Scope: Transaction khi Course đọc Problem, slug dành riêng và UUID của Progress.

## Spec and plan

- Spec: [LRN-003](../../specs/02-learning/courses/spec.md), [LRN-006](../../specs/02-learning/progress/spec.md), [LRN-008](../../specs/02-learning/self-study/spec.md).
- Plan: [Course](../../specs/02-learning/courses/plan.md), [Progress](../../specs/02-learning/progress/plan.md), mục sửa lỗi review PR.
- Tasks: [Course](../../specs/02-learning/courses/tasks.md), [Progress](../../specs/02-learning/progress/tasks.md).
- Spec status at start: Approved. Chủ dự án yêu cầu sửa cả ba lỗi đã được review.

## Questions clarified

| Question                                         | Conclusion                                                                                                                              | Source                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Chia sẻ gì giữa Course và Problem?               | Chỉ chia sẻ storage của transaction ở infrastructure theo DataSource; giữ các port và ranh giới đọc Problem hiện có.                    | Learning architecture, dependency rules, LRN-003 FR-012/FR-016. |
| Slug `managed` xử lý ở đâu?                      | Từ chối khi tạo Course, sau khi kiểm quyền và chuẩn hoá slug. Không phân biệt hoa/thường. Giá trị cũ vẫn rehydrate được và đọc bằng ID. | Yêu cầu sửa lỗi review; route quản lý cố định của LRN-003.      |
| UUID viết hoa là payload sai hay cùng định danh? | Cùng UUID, chuẩn hoá bốn định danh sang chữ thường sau validation.                                                                      | LRN-006 FR-003/FR-004/FR-006/FR-009; kiểu uuid PostgreSQL.      |

## What was done

Thêm `infrastructure/persistence/transaction-storage.ts` trong Learning. Helper giữ AsyncLocalStorage riêng theo từng DataSource qua WeakMap; Course và Problem context dùng chung storage khi cùng DataSource. Mỗi request bất đồng bộ vẫn có manager riêng. `ProblemReferenceReaderAdapter` dùng manager từ context thay vì gọi repository trực tiếp trên DataSource. Luồng Course đang giữ connection transaction vì vậy không cần xin thêm connection khi đọc Problem.

`CreateCourseUseCase` từ chối slug `managed`, gồm biến thể chữ hoa/thường và khoảng trắng đã được value object chuẩn hoá. Kiểm tra chỉ nằm trong luồng tạo nên không phá việc đọc dữ liệu cũ bằng ID. Swagger của DTO tạo Course mô tả slug dành riêng.

`AcceptedSubmission.parse` chuẩn hoá `eventId`, `submissionId`, `userId`, `problemId` sau khi xác nhận UUID hợp lệ. Aggregate và repository vì vậy dùng cùng biểu diễn định danh với PostgreSQL; sự kiện hợp lệ không còn thất bại khi áp dụng lên tiến độ đã tồn tại với kiểu chữ khác.

## Why these choices

Storage chung ở infrastructure giải quyết việc dùng connection trong cùng database mà không truyền EntityManager qua application port, không cho Course truy cập entity/repository của Problem, và không thêm generic business service. WeakMap phân vùng theo DataSource; AsyncLocalStorage phân vùng theo request. Kiểm tra slug lúc tạo giữ được định danh bất biến của dữ liệu cũ. Chuẩn hoá UUID ở boundary domain để mọi thao tác tiếp theo dùng cùng một giá trị.

## How the feature works

1. Course use case mở transaction và đặt manager vào storage của DataSource.
2. Course repository nạp/lưu qua manager đó. Khi cần Problem references, adapter của Problem nhận cùng manager qua context, truy vấn trên connection hiện tại.
3. Commit hoặc rollback thoát scope; request khác không nhận manager của request trước. Ngoài transaction, reader vẫn dùng manager mặc định.
4. Tạo Course kiểm quyền rồi kiểm slug. Slug dành riêng trả lỗi validation `400` trước khi mở transaction hay lưu dữ liệu.
5. Accepted event kiểm payload, chuẩn hoá UUID rồi chạy use case ghi Progress; event cùng định danh khác kiểu chữ được áp dụng hoặc nhận diện trùng chính xác.

## Configuration

- `tsconfig.json`, `compilerOptions.paths`: thêm alias chính xác `@/infrastructure/persistence` và alias `@/modules/problems/*` cho các import mới ở Learning.
- `jest.config.ts`, `moduleNameMapper`: ánh xạ tương ứng trước alias mặc định của Identity.
- `CoursesModule` integration test đặt pool PostgreSQL thành một connection, có timeout 1.500 ms để regression không treo vô hạn.
- Không thêm cấu hình triển khai, biến môi trường hoặc migration.

## Verification

- Regression PostgreSQL + Course unit/API: 12 suite, 157 test qua, không skip. Vòng đời qua `CoursesModule` thật dùng pool một connection; test Progress kiểm UUID hoa/thường, earliest solve, best score và retry cùng eventId khác kiểu chữ.
- API regression: 4 biến thể slug dành riêng đều trả `400` và không ghi state; Course cũ có slug `managed` vẫn xem được bằng ID.
- Toàn bộ Learning: 61 suite, 531 test qua; 6 suite, 52 test PostgreSQL skip trong lần chạy không có `TEST_DATABASE_URL`.
- Test storage kiểm việc cô lập request đồng thời và các DataSource khác nhau.
- `pnpm build:learning`: qua. `pnpm build`: cả sáu service qua.
- ESLint riêng các file thay đổi: qua. Prettier, `git diff --check`, `codegraph sync .`: qua.
- `pnpm lint` và `pnpm typecheck` toàn repo chỉ còn lỗi có sẵn trong `test/account-import.integration.spec.ts` về trường `officialName` của Identity.
- PostgreSQL tạm trên localhost đã dừng và tự xoá sau kiểm thử; không chạm dữ liệu thật.

## Remaining

- Not done: lỗi test Identity và rủi ro truy cập trực tiếp cổng Learning đã nêu ở review trước, ngoài ba lỗi được yêu cầu sửa lần này.
- Risks: Course cũ có slug dành riêng tiếp tục dùng ID để truy cập; lần sửa này không đổi slug đã lưu. Các gate toàn repo còn bị chặn bởi lỗi test Identity nêu trên.
