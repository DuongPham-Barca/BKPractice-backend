# 2026-10-28 — Password reset bằng OTP email

- Author: Codex
- Scope: ID-007, Identity Auth và API Gateway

## Spec and plan

- Spec: `.docs/specs/01-identity/password-reset/spec.md` v1.0
- Plan: `.docs/specs/01-identity/password-reset/plan.md`
- Tasks: `.docs/specs/01-identity/password-reset/tasks.md`
- Spec status at start: Approved

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Dùng bộ tài liệu nào khi `specs/01-identity/password-reset/` chưa có? | Dùng bộ ID-007 Approved tại `.docs/specs`; người dùng yêu cầu rõ phần Identity trong `.docs`. | Yêu cầu người dùng ngày 2026-10-28; spec ID-007 v1.0. |
| Có được triển khai Graph `Mail.Send` không? | Người dùng duyệt triển khai theo spec/plan/tasks. Mailbox, app permission và giới hạn quyền trên tenant thật còn phải cấu hình và kiểm chứng trước triển khai. | Xác nhận người dùng ngày 2026-10-28; ID-007 FR-002 và plan. |
| Bản tham chiếu ID-004 ở đâu? | Bản tái dựng Approved cho import có tại `.docs/specs/01-identity/student-provisioning/spec.md`; chỉ STUDENT/LECTURER được import. | ID-004 spec và ID-007 AC-008. |
| Cần migration không? | Không; Redis giữ state tạm thời, bảng `users`, `sessions`, `refresh_tokens` đã có. | ID-007 plan, Identity entities. |

## What was done

Thêm ba use case và controller tại `modules/auth` cho `send-otp`, `verify-otp`, `reset`. Redis giữ HMAC của OTP và hash của grant với TTL, cooldown, giới hạn năm lần sai, thao tác Lua nguyên tử. Graph adapter gửi OTP tới email đã lưu từ mailbox cấu hình; lỗi Graph được ghi log chung và HTTP send vẫn trả 202. TypeORM cập nhật duy nhất password hash bằng Argon2 và thu hồi session/refresh token trong một transaction. Luồng login cũ đối chiếu hash đã xác minh khi tạo session để không phát hành phiên nếu reset vừa xảy ra. Gateway mở đúng ba route và giới hạn theo IP/route; Identity cũng throttle các route khi được gọi trực tiếp. DTO và Swagger mô tả contract công khai.

## Why these choices

Giữ use case ở application và Redis/Graph/TypeORM ở infrastructure theo kiến trúc Clean Architecture của Identity. Dùng `ioredis`, `@azure/msal-node` và hasher Argon2 đã có trong repo; không thêm dependency hoặc migration. Lua và Redis `GETDEL` bảo đảm OTP/grant không bị dùng lại khi request đồng thời. Transaction TypeORM bảo đảm hash mới và việc thu hồi mọi phiên cùng thành công hoặc cùng thất bại. Gateway dùng throttling và kiểm tra Origin hiện có; Identity có giới hạn bổ sung vì Docker Compose hiện cũng công bố cổng 3001.

## How the feature works

1. Khách gửi email tới `POST /api/auth/password/send-otp`; Gateway kiểm tra Origin và throttle, Identity cũng throttle gọi trực tiếp và kiểm tra Redis trước khi tra User để lỗi phụ thuộc không phân biệt email. Identity chuẩn hóa email và chỉ xét User ACTIVE, STUDENT/LECTURER, không ADMIN/system/xoá mềm.
2. Identity tạo OTP sáu chữ số, Redis lưu HMAC trong năm phút và cooldown 60 giây. Graph gửi từ `MICROSOFT_MAIL_SENDER` đến email User đã lưu; send luôn trả 202 cho cả account thiếu/không đủ điều kiện và lỗi Graph.
3. `verify-otp` tra User đủ điều kiện, Redis kiểm tra OTP và số lần thử nguyên tử, xóa OTP đúng và lưu grant hash trong năm phút; caller nhận resetToken một lần. OTP sai/hết hạn trả lỗi 400 chung.
4. `reset` tiêu thụ grant một lần; TypeORM khóa User, kiểm tra lại điều kiện và mật khẩu mới khác mật khẩu cũ, lưu Argon2 hash và thu hồi mọi phiên. Caller nhận 204; token/password không hợp lệ trả 400 chung, phụ thuộc lỗi trả 503 chung.
5. Gateway kiểm tra session cho access token cũ nên từ chối chúng sau commit. Luồng không tạo phiên mới hoặc thay mật khẩu Microsoft.

## Configuration

- `.env.example`: thêm `MICROSOFT_MAIL_SENDER`, địa chỉ mailbox Microsoft 365 gửi OTP.
- `libs/config/src/environment.ts`: xác thực định dạng email; bắt buộc mailbox ở production. App credential Microsoft hiện có được dùng để xin Graph app token; quyền `Mail.Send` giới hạn mailbox phải được cấp bên tenant.

## Verification

- `pnpm test`: pass 40 suite, 175 test; 7 suite/32 test vốn skip. Một lần chạy trước đó có test chữ ký MSAL không ổn định, chạy riêng và chạy lại full đều pass.
- `pnpm build:identity`, `pnpm build:gateway`, `pnpm exec tsc --noEmit -p apps/identity-service/tsconfig.app.json`, eslint các file Identity Auth/Gateway/config: pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo: fail tại dòng `heheh` đã có trong HEAD của `apps/learning-service/src/database/data-source.ts:14`, ngoài phạm vi ID-007.
- `git diff --check`: pass.
- Not verified: Redis/PostgreSQL integration, race trên service thật, Graph staging và quyền mailbox thực tế; Docker daemon không chạy tại môi trường này.

## Remaining

- Not done: kiểm chứng cấp mailbox và giới hạn `Mail.Send` trên tenant, smoke test Graph và integration Redis/PostgreSQL; FE integration và chuyển trạng thái SDD do bên có thẩm quyền thực hiện.
- Risks: app token có thể bị Graph từ chối cho tới khi tenant cấp quyền đúng; khi đó send vẫn trả 202 và log vận hành báo lỗi chung. Gate toàn repo còn bị chặn bởi lỗi Learning Service đã có trước thay đổi này.
