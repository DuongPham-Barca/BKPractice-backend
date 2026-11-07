# 2026-11-07 — Hoàn thiện Progress cá nhân

- Author: Codex
- Scope: Ba API đọc Progress, domain completion, reader/repository, DI, kiểm thử và tài liệu vận hành.
- Branch: `feat/lrn-006-personal-progress`, tách từ main đã merge PR #25.

## Spec and plan

- Spec: [LRN-006](../../../specs/02-learning/progress/spec.md), [LRN-008](../../../specs/02-learning/self-study/spec.md), [Gateway Progress](../../../specs/gateway/learning/progress/spec.md).
- Plan: [Progress](../../../specs/02-learning/progress/plan.md), mục triển khai phần đọc tự học.
- Tasks: [Progress](../../../specs/02-learning/progress/tasks.md), giữ ID cũ và ghi N/A rõ cho phần Class/Assignment bị loại bỏ.
- Spec status at start: Approved. Không đổi nội dung hay trạng thái Approved spec.
- Ghi chú API/vận hành: [Progress cá nhân](../../../pm/plan/learning/progress/personal-progress.md).

## Questions clarified

| Question                                   | Conclusion                                                                                                                                                                                         | Source                                                          |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Phạm vi Progress lần này?                  | Hoàn thiện ba API cá nhân theo Problem/Course và xác minh phần ghi hiện có. Không làm lại Class/Assignment; không triển khai Recommendation.                                                       | Yêu cầu chủ dự án, LRN-008 FR-005; LRN-006 Out of Scope.        |
| Danh tính người đọc lấy ở đâu?             | Dùng principal tin cậy; không tham số chọn user khác. Mọi vai trò đọc được chính mình, không có quyền ADMIN đặc biệt.                                                                              | LRN-006 SR-002/SR-003, AC-020/AC-021; plan Authorization.       |
| Lọc bài ẩn trước hay sau phân trang?       | Trước phân trang và total. Status của bài ẩn giống bài chưa giải; Course không công khai trả 404.                                                                                                  | LRN-006 FR-011/FR-012, SR-004, AC-010–AC-013.                   |
| Course reader có truy vấn nào để tái dùng? | Course chưa export read query cấu trúc. Adapter riêng Progress chỉ SELECT trên các bảng cùng Learning, không import entity/repository của Course/Problem; so với Course API bằng integration test. | Learning architecture, Cross-module reads; LRN-006 plan Reader. |
| Output và giới hạn query?                  | Giữ đúng ba response của plan; page/limit mặc định 1/20, limit tối đa 100; status nhận 1..100 UUID duy nhất, giữ thứ tự.                                                                           | LRN-006 plan API/DTO.                                           |
| Có thay schema, broker hay contract không? | Dùng migration LRN-006 hiện có; không thêm runtime env, không sửa libs/common/contracts/Submission. URL broker mới chỉ dành cho integration test cách ly.                                          | LRN-006 plan Configuration/Messaging; working agreement.        |

## What was done

Thêm `ListMySolvedProblemsUseCase`, `GetMySolvedStatusUseCase`, `GetMyCourseProgressUseCase` và inbound port/token riêng. `MyProgressController` công khai đúng ba GET route; request được kiểm bằng DTO, response được chọn trường và đổi Date sang ISO trong mapper. Filter trả 401/400/404 theo contract và che lỗi hạ tầng trong response/log.

Domain có `CompletionCount` và `CourseCompletionCalculator`, tính solved/total theo cấu trúc hiển thị hiện tại, giữ Chapter rỗng và thứ tự; 0/0 hợp lệ. Repository bổ sung đọc SOLVED với solved_at không null. List join Problem công khai trước count/pagination; status dùng PublishedProblemFilter. CourseStructureReader dùng một SELECT với left join để giữ Course/Chapter rỗng và loại bài chưa công khai. Tiến độ gốc không bị xoá khi nội dung bị ẩn hoặc gỡ khỏi Course.

Progress context dùng transaction storage chung theo DataSource và có manager mặc định cho đọc. Các API đọc không mở transaction ghi hoặc lưu tổng hợp. Luồng accepted hiện có tiếp tục idempotent; consumer log riêng eventId, problemId và kết quả thành công, không log payload thô. Module được nối dây đầy đủ, mỗi use case/port một file, barrel/alias theo working agreement.

Bổ sung integration trên PostgreSQL với pool một connection và CoursesModule thật, test migration transactional down/up, và test consumer qua RabbitMQ thật. Checklist loại bỏ phụ thuộc Class/Assignment/Clock đã hết phạm vi thay vì để chúng thành việc còn thiếu.

## Why these choices

Port riêng cho projection giúp Progress đọc dữ liệu Learning mà không dùng repository ghi hoặc entity của module khác. Lọc trước phân trang bảo vệ số lượng nội dung chưa công khai. Domain calculator có thể kiểm thử không cần database và không biết HTTP/TypeORM. Một truy vấn cấu trúc tránh mất Chapter rỗng hoặc nạp nhiều lần; test so với Course API kiểm chính sách hiển thị thay vì chỉ kiểm implementation nội bộ.

Giữ ghi nhận accepted hiện có để API đọc tận dụng receipt/min/max đã được kiểm chứng. Test migration trong transaction rồi rollback bảo toàn schema và dữ liệu test; test broker riêng kiểm retry/DLQ đúng hạ tầng dùng trong production mà không đổi shared messaging code.

## How the feature works

1. Client gọi một GET qua Gateway; Gateway đặt principal tin cậy. Guard/decorator ở Learning xác nhận và truyền principal vào controller.
2. Controller chuyển query đã kiểm tra cho một inbound port. userId luôn lấy từ principal; query lạ bị 400.
3. List đọc Progress của user, lọc bài công khai rồi phân trang/đếm tổng. Status lọc tập Problem công khai rồi đọc trạng thái của user, trả theo thứ tự input.
4. Course reader trả cấu trúc công khai hoặc null. Use case đọc các Problem đã giải trong cấu trúc đó; calculator đếm trong domain. Mapper trả định danh, số đếm, thời điểm; không có dữ liệu judge hay hồ sơ.
5. Các đường đọc chỉ SELECT. Khi Problem bị ẩn, nó biến mất khỏi số liệu; khi mở lại, tiến độ cũ được tính lại mà không nộp thêm.
6. Accepted event đi qua consumer/use case ghi như trước. Receipt và Progress cùng commit/rollback; payload hỏng hoặc lỗi lưu đi retry/DLQ. Replay sau phục hồi an toàn theo eventId.

## Configuration

- `tsconfig.json`, `compilerOptions.paths["@/modules/progress/*"]`: thêm alias module cho TypeScript/build và entry point ts-node.
- `jest.config.ts`, `moduleNameMapper`: alias Progress tương ứng trước alias Identity.
- `TEST_DATABASE_URL` hiện có dùng cho database test; `TEST_RABBITMQ_URL` chỉ dùng trong suite integration consumer, bắt buộc localhost và vhost kết thúc `_test`.
- Không đổi biến môi trường triển khai, Docker Compose, quyền Identity hoặc schema. Gateway đã có allowlist ba route cá nhân nên không sửa production routing.

## Verification

- Toàn bộ Progress với PostgreSQL 15 và RabbitMQ 4 cách ly: **9 suite, 69 test qua**, không skip. Bao gồm API/Nest/SQL thật, privacy, visibility, order, pagination, 0/0, giữ tiến độ, lỗi an toàn, Swagger, concurrency/idempotency, migration down/up và retry/DLQ/replay.
- `pnpm test --silent`: **135 suite, 1.056 test qua**, 16 suite/118 test skip do thiếu URL integration trong lần chạy mặc định. Một suite Identity lỗi biên dịch do `officialName` không còn trong kiểu hiện hành.
- `pnpm build`: cả sáu service qua.
- `pnpm lint`, `pnpm typecheck` toàn repo: chỉ còn lỗi baseline nói trên trong `test/account-import.integration.spec.ts`. Không sửa hoặc che lỗi này trong feature Progress.
- ESLint riêng Progress/Jest config, Prettier các file thay đổi, `git diff --check`, `codegraph sync .`: qua.
- Entry point trực tiếp với ts-node + tsconfig-paths nạp được ProgressModule.
- Domain không import framework; production Progress không import entity/repository/infrastructure của Course/Problem. Use case đọc không ghi state; test so trước/sau xác nhận Progress/receipts không đổi.
- Hai container test đã dừng và tự xoá. Không chạy migration hay ghi dữ liệu trên môi trường thật.

## Remaining

- Not done: các gate toàn repo chưa xanh vì lỗi test Identity đã biết; không tự đổi spec sang Verified. Recommendation thuộc lần triển khai khác.
- Risks: bảo vệ cổng Learning trực tiếp vẫn là mục đã được chủ dự án quyết định để sau; API Progress dùng hợp đồng principal hiện hành.
