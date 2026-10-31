# 2026-10-31 — LRN-001 Problem Management: kiểm chứng API/E2E, bảo mật, tài liệu, lint/typecheck/test/build, DDD và đối chiếu đặc tả

- Author: Claude Code (theo yêu cầu của DuongPham-Barca)
- Scope: `apps/learning-service/src/modules/problems` (source + test); `.docs/` (tài liệu, tasks); không
  đổi migration, không commit.

## Spec and plan

- Spec: `.docs/specs/02-learning/problems/spec.md` — LRN-001 phiên bản 1.1, `Approved`.
- Plan: `.docs/specs/02-learning/problems/plan.md` — Approved.
- Tasks: `.docs/specs/02-learning/problems/tasks.md` — 47 done / 3 open sau đợt này (T002, T039, T048).
- Spec status at start: `Approved`. Không thay đổi trạng thái đặc tả; T048 (bàn giao) và chuyển
  `Implemented`/`Verified` vẫn chờ review của con người.

## Questions clarified

| Question                              | Conclusion                                                                                                                                                   | Source                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------- |
| Có cần E2E với PostgreSQL thật không? | Không có `TEST_DATABASE_URL`; dùng adapter in-memory ở ranh giới HTTP, đúng tinh thần plan "write those tests without a database"                            | Người dùng + plan                |
| T002/T039 (Gateway) có làm không?     | Bỏ qua theo yêu cầu; seam quyền `problem:*` vẫn mở, ghi rõ trong tài liệu                                                                                    | Người dùng                       |
| T044 đặt tài liệu ở đâu?              | File mới `.docs/learning-service-operations.md`, liên kết từ `.docs/architecture/learning-service.md`; cảnh báo migration ghi vào `.docs/migration_guide.md` | Working agreement + architecture |

## What was done

1. **T042 — Test API/E2E Problem** (`problems.api.e2e.spec.ts`): harness in-memory
   `problems-e2e.harness.ts` nối controller + use case + domain service + mapper với fake
   `PROBLEM_REPOSITORY`, `TEST_CASE_REPOSITORY`, `TOPIC_TAG_READER`, `TRANSACTION_RUNNER`. Bao phủ: tạo
   DRAFT với người tạo từ principal tin cậy; STUDENT bị 403; DRAFT không xuất hiện ở public; xuất bản
   nguyên tử và thất bại khi chưa sẵn sàng không đổi trạng thái; chỉ chủ sở hữu cập nhật; giữ/xuất bản lại;
   xoá mềm/khôi phục giữ trạng thái xuất bản; danh sách managed ẩn bản xoá mềm trừ khi
   `includeDeleted=true`; xem trước không xuất bản; chỉ PUBLISHED xuất hiện ở public.
2. **T043 — Test bảo mật** (`problems.security.e2e.spec.ts`): gán hàng loạt ownership/status bị 400;
   header định danh trùng lặp bị 401; header sai định dạng bị 401; thiếu quyền bị 403; endpoint public yêu
   cầu xác thực; lỗi kiểm tra dữ liệu không commit dở dang; không lộ dữ liệu judge ẩn ở projection và lỗi;
   endpoint judge nội bộ từ chối thiếu/sai secret và cho phép đúng secret.
3. **T044 — Tài liệu**: `.docs/learning-service-operations.md` (Swagger, seam quyền `problem:*`,
   rủi ro chỉnh sửa tại chỗ, giới hạn đã biết); bổ sung cảnh báo migration vào
   `.docs/migration_guide.md` (mục 7); liên kết tài liệu mới từ `.docs/architecture/learning-service.md`.
4. **T045 — Kiểm chứng repository**: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` đều pass.
5. **T046 — DDD/Hexagonal**: rà soát import và wiring; không có entity/use case Problem trong `libs/`;
   domain không import NestJS/TypeORM/JWT/HTTP; application chỉ import `@nestjs/common` decorator DI và
   domain/port; presentation là driving adapter; infrastructure là driven adapter gắn ở composition root.
6. **T047 — Đối chiếu đặc tả**: rà soát FR-001..FR-034, SR-001..SR-012, AC-001..AC-031; ghi nhận
   các điểm chưa kiểm chứng và rủi ro còn lại (xem dưới). Không thêm hành vi ngoài phạm vi.
7. Cập nhật `.docs/specs/02-learning/problems/tasks.md`: đánh dấu T042–T047 là done; để T002, T039, T048
   mở.

## Why these choices

- **Adapter in-memory thay vì PostgreSQL**: plan và DoD cho phép test domain/use case không cần DB; không có
  `TEST_DATABASE_URL` trong môi trường. Harness giữ nguyên wiring thật (controller, use case, mapper, domain
  service) nên kiểm chứng transport + phân quyền + vòng đời + mapper, chỉ thay persistence port.
- **Fake repository enforce optimistic locking và summary mặc định**: `save(problem, expectedUpdatedAt)` ném
  `ConcurrentModificationError` khi lệch; `loadTestSuiteSummary` mặc định `{totalCount:1, hiddenCount:1,
totalScore:1}` để luồng xuất bản thành công mà không cần test case thật, khớp PublishValidator.
- **Không thêm phương án tạm ánh xạ vai trò sang quyền**: T002 vẫn mở; T030 đã hiện thực đọc quyền từ
  `x-auth-permissions` và fail-closed. Ghi rõ seam chưa hoàn tất trong tài liệu.
- **Tài liệu mới thay vì sửa spec Approved**: theo working agreement, không sửa spec chỉ để khớp code;
  mọi sai lệch được báo cáo trong Remaining/Risks.

## How the feature works

Đợt này là công việc kiểm chứng/tài liệu, không thêm luồng sản phẩm mới. Luồng Problem hiện có chạy như sau:

1. Gateway xác thực JWT và gắn `x-auth-user-id`, `x-auth-roles` (chưa gắn `x-auth-permissions`).
2. Controller nhận request, `ValidationPipe` kiểm tra DTO; `TrustedPrincipal` decorator đọc header đơn trị
   (trùng lặp → 401).
3. Use case kiểm tra quyền (`ProblemAuthorizationService`: role `LECTURER` + mã `problem:*`) và sở hữu
   (`createdBy === principal.userId`).
4. Aggregate `Problem` thực thi bất biến và chuyển trạng thái; `PublishValidator` kiểm tra sẵn sàng xuất bản.
5. Repository port lưu qua transaction runner; mapper ánh xạ result sang DTO allowlist.
6. `ProblemExceptionFilter` map lỗi domain/application sang HTTP status; không commit dở dang khi transaction
   throw.

## Configuration

No configuration change. Không thêm biến môi trường mới. `INTERNAL_SERVICE_SECRET` chỉ dùng trong test qua
`ConfigService` mock.

## Verification

- `pnpm lint`: pass (0 lỗi).
- `pnpm typecheck`: pass (0 lỗi).
- `pnpm test`: pass — 80 suites, 540 passed, 24 skipped (integration cần `TEST_DATABASE_URL`).
- `pnpm build`: pass — 6 service build thành công.
- Test mới: `problems.api.e2e.spec.ts` (12) và `problems.security.e2e.spec.ts` (12) đều pass.
- Rà soát import DDD: domain không import NestJS/TypeORM/JWT/HTTP; không có entity/use case Problem trong
  `libs/`.
- Not verified:
  - E2E với PostgreSQL thật (không có `TEST_DATABASE_URL`).
  - Migration `1700000004000` và `1700000007000` chưa chạy trên DB thật trong đợt này.
  - Seam quyền `problem:*` qua Gateway (T002/T039) chưa hoàn tất.

## Remaining

- Not done:
  - T002 — seam quyền `problem:*` (claim trong token hoặc endpoint REST nội bộ của Identity); Gateway phải
    xoá `x-auth-permissions` do client gửi.
  - T039 — xác minh routing Gateway → Learning và fail-closed khi thiếu quyền.
  - T048 — bàn giao SDD, review của con người, chuyển spec sang `Implemented`/`Verified`.
- Risks:
  - Khi đi qua Gateway, thao tác quản lý problem trả 403 vì `x-auth-permissions` chưa được gắn.
  - `GatewayAuthMiddleware` chưa xoá `x-auth-permissions` do client gửi → nguy cơ tự gắn quyền nếu Gateway
    chuyển tiếp header này; xử lý trong T002/T039 trước khi mở route production.
  - Không có versioning nội dung trong v1: gói judge sau chỉnh sửa có thể khác gói dùng cho submission cũ;
    Learning không sửa lịch sử Submission nhưng không bảo đảm tái lập.
  - AC-018 (slug trùng đồng thời) dựa vào ràng buộc unique của DB, chưa có test API đồng thời; cần kiểm tra
    trên PostgreSQL thật.
  - AC-024 (an toàn nội dung/XSS) thuộc trách nhiệm render phía client; backend trả chuỗi văn bản trong JSON.
  - Các spec Judge đang `Proposed` và chưa hiện thực.
