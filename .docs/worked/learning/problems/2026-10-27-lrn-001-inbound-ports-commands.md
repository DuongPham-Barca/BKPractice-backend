# 2026-10-27 — LRN-001: inbound ports và command folder

- Author: opencode
- Scope: `learning-service/modules/problems` — thêm inbound port cho 12 use case, chuyển command
  sang `application/command/`, controller inject qua token. Cập nhật tài liệu LRN-001 và thêm test
  kiểm tra wiring.

## Spec and plan

- Spec: LRN-001 Quản lý Problem `1.1` (Approved) — không đổi.
- Plan: `.docs/specs/02-learning/problems/plan.md` — cập nhật quy ước inbound port và command.
- Tasks: `.docs/specs/02-learning/problems/tasks.md` — cập nhật T011 và T038.
- Review: `review/LRN-001-detailed-design.md` — cập nhật T011, T013, T014, T038, T046 (file này
  thuộc `review/`, đang bị gitignore).
- Architecture: `.docs/architecture/learning-service.md` — làm rõ controller inject inbound port
  qua token.

## Questions clarified

| Question                                             | Conclusion                                                                                     | Source                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| Có thêm inbound port interface dù T011 cũ cấm không? | Có. Người dùng yêu cầu controller inject qua `@Inject(PORT_IN)` thay vì inject use case class. | Người dùng, 2026-10-27                |
| Command nào được chuyển sang `application/command/`? | Chỉ hai command đang tồn tại: `CreateProblemCommand`, `UpdateProblemCommand`.                  | Người dùng, 2026-10-27                |
| Token inbound port đặt ở đâu?                        | Export cùng file port, theo mẫu `uc-talent-backend`; outbound token vẫn ở `problem.tokens.ts`. | Người dùng và mẫu `uc-talent-backend` |
| Có đổi hành vi nghiệp vụ không?                      | Không. Chỉ đổi wiring, vị trí type và tài liệu; use case `execute()` giữ nguyên chữ ký.        | Diff và test hiện có                  |
| Có sửa `ProblemsController` nội bộ không?            | Không. Controller này vẫn dùng repository trực tiếp theo ngoại lệ T036.                        | T038, quy tắc 9                       |

## What was done

- Thêm 12 file `application/ports/in/*.port.in.ts`, mỗi file export interface `I...PortIn` và token
  `..._PORT_IN`. Interface mô tả đúng chữ ký `execute()` hiện có của use case.
- Cho cả 12 use case `implements I...PortIn` tương ứng.
- Chuyển `CreateProblemCommand` và `UpdateProblemCommand` khỏi file use case sang
  `application/command/create-problem.command.ts` và `update-problem.command.ts`.
- Cập nhật `problem-request.mapper.ts` import command từ vị trí mới.
- `ManagedProblemsController` và `PublicProblemsController` inject interface qua token, không inject
  use case class trực tiếp.
- `ProblemsModule` bind mỗi token inbound port tới use case class bằng `useExisting`, giữ nguyên
  các provider outbound port hiện có.
- Thêm `problems.module.spec.ts` kiểm tra 12 token được bind đúng use case và hai controller nhận
  đúng token qua `@Inject`.
- Cập nhật plan, kiến trúc Learning và detailed design để không còn câu “không tạo inbound port
  interface” và ghi rõ vị trí command.

## Why these choices

- Inbound port tách presentation khỏi class use case: controller chỉ phụ thuộc interface + token,
  cùng hướng với `uc-talent-backend` và với dependency rule đã dùng cho outbound port.
- Token đặt cùng file port giúp port tự mô tả đủ contract DI; outbound token giữ ở
  `problem.tokens.ts` để không mở rộng phạm vi refactor.
- `useExisting` giữ một instance use case duy nhất, tránh tạo thêm instance khi bind token.
- Command là input DTO của application, không phải chi tiết của use case, nên đặt trong
  `application/command/` để presentation và use case cùng import một type.
- Chỉ chuyển hai command đang có; không tạo command mới cho các use case nhận primitive để tránh mở
  rộng phạm vi ngoài yêu cầu.

## How the feature works

1. Request vào `ManagedProblemsController` hoặc `PublicProblemsController`.
2. Nest resolve tham số constructor qua token `..._PORT_IN`; `ProblemsModule` ánh xạ token tới use
   case class bằng `useExisting`.
3. Controller gọi `execute()` trên interface, không biết class cụ thể.
4. Use case chạy flow cũ: authorization, repository/transaction/outbound port, domain validator.
5. Kết quả vẫn là result model; response mapper chuyển thành DTO như trước.
6. Lỗi domain/application vẫn đi qua `ProblemExceptionFilter`; hành vi HTTP không đổi.

## Configuration

No configuration change.

## Verification

- `pnpm typecheck` — pass.
- `pnpm lint` — pass.
- `pnpm build:learning` — webpack build pass.
- `pnpm test` — 14 suite pass, 1 suite skip; 157 test pass, 18 skip. Suite skip cần
  `TEST_DATABASE_URL`.
- `pnpm exec jest apps/learning-service/src/modules/problems/problems.module.spec.ts --runInBand` —
  14 test pass.

## Remaining

- Not done: chưa commit.
- Not done: các vi phạm domain đã ghi nhận trước đó (domain service import `@nestjs/common`, domain
  import `@app/contracts`) nằm ngoài phạm vi yêu cầu này.
- Note: `review/LRN-001-detailed-design.md` đã được cập nhật nhưng file nằm trong `review/` bị
  gitignore nên không xuất hiện trong `git status`.
