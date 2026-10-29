# 2026-10-29 — Gửi OTP đặt lại mật khẩu qua Brevo

- Author: Codex
- Scope: Identity Auth, kênh gửi email OTP ID-007

## Spec and plan

- Spec: [ID-007 spec 1.3](../../../specs/01-identity/password-reset/spec.md)
- Plan: [ID-007 plan 1.3](../../../specs/01-identity/password-reset/plan.md)
- Tasks: [ID-007 tasks](../../../specs/01-identity/password-reset/tasks.md)
- Spec status at start: Approved 1.3; chủ sở hữu chọn Brevo thay Gmail SMTP 1.2 trước khi phương án Gmail được triển khai.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Kênh gửi OTP nào thay Microsoft Graph? | Brevo Transactional Email API qua HTTPS. | Chỉ đạo của chủ sở hữu và ID-007-FR-002. |
| Email đích có do client chọn không? | Không; use case tiếp tục lấy email từ User đủ điều kiện. | ID-007-FR-001/003 và `SendPasswordResetOtp`. |
| Ứng dụng cần cấu hình gì? | API key và sender đã xác minh; không cần Gmail App Password hay Graph `Mail.Send`. | ID-007 spec 1.3 và Brevo API docs. |
| Có thể xác nhận email đã đến Inbox qua HTTP 201/202 không? | Không; 201 là Brevo nhận request, 202 là response công khai chung của Identity. | ID-007 tình huống lỗi và Brevo API contract. |

## What was done

Đổi `PasswordResetMailer` trong AuthModule từ Graph sang `BrevoPasswordResetMailer`. Adapter dùng API HTTPS của Brevo để gửi OTP bằng thư văn bản; lỗi cấu hình, mạng hoặc HTTP khác 201 đều thành `PasswordResetMailDeliveryFailure`. Log chỉ chứa mã HTTP hoặc nhóm lỗi cấu hình/mạng, không ghi nội dung phản hồi. Gỡ riêng Graph mail adapter và test của nó; MSAL cho Microsoft OAuth vẫn còn. Cập nhật cấu hình mẫu và validation production, thêm test adapter và cấu hình. Plan/tasks 1.3 thay phương án Gmail SMTP chưa triển khai.

## Why these choices

Port `PasswordResetMailer` hiện có giữ application/use case độc lập với nhà cung cấp email. `fetch` có sẵn trong Node 22 của dự án gọi HTTPS nên không thêm dependency/SMTP. Timeout 10 giây giới hạn thời gian chờ. Chỉ coi HTTP 201 là Brevo chấp nhận thư. Bản ghi OTP PostgreSQL và ba endpoint không cần đổi khi thay kênh gửi.

## How the feature works

1. Người dùng gọi `POST /api/auth/password/send-otp` qua Gateway hoặc Identity.
2. Controller chuẩn hoá email; `SendPasswordResetOtp` chỉ chọn User đủ điều kiện, phát OTP và lưu HMAC challenge trong PostgreSQL.
3. `BrevoPasswordResetMailer` gửi POST HTTPS với `api-key`, sender cấu hình, địa chỉ email đã lưu và OTP trong `textContent`.
4. Nếu Brevo trả 201, use case hoàn tất; nếu lỗi, adapter ghi cảnh báo an toàn và use case vẫn trả response chung.
5. Caller thấy `202` không chứa OTP trong cả trường hợp không có account hoặc gửi thất bại. Verify/reset và thu hồi phiên giữ flow 1.1.

## Configuration

- `.env.example`: thêm `BREVO_API_KEY` để xác thực API và `BREVO_SENDER_EMAIL` là địa chỉ gửi đã xác minh; bỏ `MICROSOFT_MAIL_SENDER` chỉ dùng cho Graph OTP.
- `libs/config/src/environment.ts`: Identity production yêu cầu cả hai biến Brevo; các biến Microsoft OAuth vẫn bắt buộc như trước.
- Cấu hình thật phải đặt trong môi trường chạy, không lưu giá trị bí mật trong repo.

## Verification

- `pnpm exec jest --runInBand` cho adapter, config và use case: 21 test pass.
- `pnpm test` ngoài sandbox: 184 pass, 38 skipped. Lần chạy trong sandbox bị chặn bind `127.0.0.1`; sau đó chạy lại thành công.
- `pnpm exec tsc --noEmit -p apps/identity-service/tsconfig.app.json`, ESLint scoped, `pnpm build:identity`, `git diff --check`: pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo: dừng tại `heheh` trong `apps/learning-service/src/database/data-source.ts:14`, không liên quan thay đổi này.
- Not verified: gửi Brevo thật và nhận email trường; chưa có API key/sender đã xác minh trong phiên làm việc. Tích hợp migration PostgreSQL/race/rollback của bản 1.1 chưa chạy trên DB test cách ly.

## Remaining

- Not done: cấu hình Brevo, xác minh sender, smoke tới email trường; kiểm chứng tích hợp PostgreSQL của 1.1.
- Risks: 201 từ Brevo không chứng minh thư tới Inbox; email trường có thể lọc thư. Production cần Node >=22 theo `package.json`; máy kiểm thử hiện chạy Node 20 nên có cảnh báo engine.
