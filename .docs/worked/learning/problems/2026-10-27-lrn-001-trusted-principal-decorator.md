# 2026-10-27 — LRN-001: `@TrustedPrincipal()` và domain không import NestJS

- Author: Claude Code
- Scope: `learning-service/modules/problems` — chuyển việc lấy principal từ provider có
  `Scope.REQUEST` sang decorator/guard ở tầng presentation; bỏ `@Injectable()` khỏi ba validator của
  domain. Không đổi Identity hay API Gateway.

## Spec and plan

- Spec: LRN-001 Quản lý Problem `1.1` (Approved) — không đổi.
- Plan: `.docs/specs/02-learning/problems/plan.md` — không đổi (xem mục Remaining về điểm lệch).
- Tasks: `.docs/specs/02-learning/problems/tasks.md` — không đổi; LRN-001-T002 vẫn mở (xem bên dưới).
- Spec status at start: Approved.

## Questions clarified

| Question                                                                      | Conclusion                                                                                                                            | Source                                                                           |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Gateway/Identity chưa phát `x-auth-permissions`: Learning có tự bù không?     | Không. Phần Identity/Gateway do người khác làm trên `origin/feat/01-identity` (commit `c02fd48`); Learning chỉ đọc header tin cậy.    | Người dùng, 2026-10-27; LRN-001-T002 (không dựng phương án tạm)                  |
| Có đổi `ProblemsController` (judge-package nội bộ) sang use case/port không?  | Không. Route nội bộ được giữ nguyên (REUSE) và nằm ngoài phạm vi LRN-001.                                                             | plan.md bảng route (dòng "Giữ nguyên (REUSE)"), LRN-001-T036, worked 10-27 trước |
| Vị trí `ProblemRepository` port (domain) khác các out port khác có sai không? | Không. Plan quy định rõ repository port ở `domain/repositories/`, out port còn lại ở `application/ports/out/`.                        | plan.md bản sửa đổi 2026-10-24                                                   |
| 12 inbound port, mỗi port một `execute()` có giữ không?                       | Giữ. Plan quy định mỗi use case có inbound port; chỉ `service-architectures.md` nói ngược, đó là mâu thuẫn tài liệu, không sửa ở đây. | plan.md "Các port và ranh giới"; yêu cầu người dùng 2026-10-27                   |
| Đổi `Scope.REQUEST` provider sang `@TrustedPrincipal()`?                      | Có.                                                                                                                                   | Người dùng, 2026-10-27; quy tắc decorator trong working agreement                |
| Domain import `@app/contracts` có phải sửa không?                             | Không. Plan cho phép tái dùng danh mục kỹ thuật `ProblemType`/`SupportedLanguage`; chỉ import `@nestjs/common` là vi phạm.            | plan.md dòng REUSE `SUPPORTED_LANGUAGES`/`PROBLEM_TYPES`                         |

## What was done

- Thêm `presentation/http/decorators/trusted-principal.decorator.ts`: hàm `readTrustedPrincipal()`
  (logic parse header chuyển nguyên từ `RequestPrincipalProvider`) và decorator `@TrustedPrincipal()`.
- Thêm `presentation/http/guards/trusted-principal.guard.ts`, dùng cho `PublicProblemsController`
  để các route đọc công khai vẫn trả `401` khi thiếu `x-auth-user-id` hợp lệ.
- Xoá `RequestPrincipalProvider`, port `principal-provider.port.out.ts` và token `PRINCIPAL_PROVIDER`.
- `ProblemAuthorizationService` không còn phụ thuộc provider: `requireCreate`, `requireManagedList`,
  `requireOwned` nhận `Principal` và chạy đồng bộ; bỏ `requirePublicRead`.
- 10 use case managed nhận `principal` làm tham số đầu của `execute()` (cập nhật cả 10 inbound
  port); hai use case public không còn nhận hay kiểm tra principal.
- `ManagedProblemsController` đọc principal bằng `@TrustedPrincipal()` và truyền vào use case.
- Bỏ `@Injectable()` và import `@nestjs/common` khỏi `ContentFormatValidator`,
  `ProblemContractValidator`, `PublishValidator`; `ProblemsModule` đăng ký ba class này bằng
  `useFactory`.
- Cập nhật test: spec authorization/use case/controller theo chữ ký mới; chuyển spec provider thành
  spec cho `readTrustedPrincipal`; thêm spec cho guard và một test dựng DI thật cho 12 inbound port.
  Xoá test "requires a principal before querying" của use case public vì việc đó giờ thuộc guard.

## Why these choices

- Một provider `Scope.REQUEST` làm cả chuỗi authorization, use case và controller thành
  request-scoped (tạo lại mỗi request). Decorator ở biên giữ use case là singleton và đúng quy tắc
  "cross-cutting value ở transport context dùng decorator" của working agreement.
- Truyền `Principal` như tham số tường minh làm use case dễ test, không cần mock provider async.
- Guard riêng cho route public giữ nguyên hành vi hiện có (yêu cầu đã xác thực) mà không bắt use
  case public nhận tham số không dùng.
- Factory provider là cách để domain không cần decorator của Nest nhưng vẫn được inject, phù hợp
  quy tắc "Domain must not depend on NestJS" trong `dependency-rules.md`.

## How the feature works

1. Gateway xác thực JWT và đặt header tin cậy (`x-auth-user-id`, `x-auth-roles`, và
   `x-auth-permissions` khi Identity/Gateway hỗ trợ).
2. Route managed: `@TrustedPrincipal()` gọi `readTrustedPrincipal(request)`; header thiếu/sai định
   dạng ném `UnauthorizedError` (`401`).
3. Controller truyền `Principal` vào `execute()` của inbound port; use case gọi
   `ProblemAuthorizationService` để kiểm tra role `LECTURER`, quyền `problem:*` và quyền sở hữu,
   sai thì `ForbiddenError` (`403`).
4. Route public: `TrustedPrincipalGuard` chỉ kiểm tra có principal hợp lệ rồi cho qua; use case
   không dùng principal.
5. `ProblemExceptionFilter` vẫn ánh xạ lỗi application sang HTTP như trước.

## Configuration

No configuration change.

## Verification

- `pnpm lint` — pass.
- `pnpm typecheck` — pass.
- `pnpm test` — 40 suite pass, 1 skip (cần `TEST_DATABASE_URL`); 278 test pass, 18 skip.
- `pnpm build:learning` — webpack build pass.
- `pnpm format:check` — còn 2 cảnh báo ở file không thuộc thay đổi này:
  `.docs/worked/identity/auth/2026-10-19-identity-authentication.md` và
  `apps/learning-service/src/modules/progress/progress.consumer.spec.ts`.
- Not verified: chưa chạy end-to-end qua Gateway thật; chưa chạy integration spec cần database.

## Remaining

- Not done: chưa commit. Chưa đóng LRN-001-T002 vì Gateway/Identity trên nhánh này vẫn chưa phát
  `x-auth-permissions` (thay đổi nằm ở `origin/feat/01-identity`). Cho đến khi nhánh đó được merge,
  các route managed trả `403` qua Gateway.
- Not done: các spec use case/controller mới (chưa được git theo dõi từ trước) đã được cập nhật
  theo chữ ký mới; `eslint --fix` cũng bỏ vài phép ép kiểu `as unknown as ...` thừa trong chúng.
- Risks: plan LRN-001 vẫn liệt kê `PrincipalProvider` như một port. Code hiện dùng decorator/guard
  (plan có ghi "adapter dạng guard/decorator") và không còn port đó; cần người sở hữu plan xác nhận
  hoặc cập nhật plan cho khớp.
- Risks: `service-architectures.md` ("cấm interface một method") mâu thuẫn với plan (mỗi use case
  một inbound port); chưa xử lý.
