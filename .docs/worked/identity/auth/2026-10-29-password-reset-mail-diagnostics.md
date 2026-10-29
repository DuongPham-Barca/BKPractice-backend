# 2026-10-29 — Chẩn đoán email OTP không tới hộp thư

- Author: Codex
- Scope: ID-007 Identity auth, quan sát lỗi gửi Microsoft Graph.

## Spec and plan

- Spec: `.docs/specs/01-identity/password-reset/spec.md` v1.1 Approved, FR-002/FR-003 và tình huống lỗi Graph.
- Plan: `.docs/specs/01-identity/password-reset/plan.md` v1.1, mục xử lý lỗi/quan sát.
- Tasks: `.docs/specs/01-identity/password-reset/tasks.md`.
- Spec status at start: Approved.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| HTTP 200 có xác nhận gửi OTP không? | Không. `send-otp` trả 202; `verify-otp` trả 200. OpenAPI của Identity đang chạy tại localhost khớp controller. | `password-reset.controller.ts`, OpenAPI localhost ngày 2026-10-29. |
| 202 có xác nhận email đã tới hộp thư không? | Không. Response chung được trả cả khi account không đủ điều kiện hoặc Graph lỗi. Ngay cả Graph 202 chỉ xác nhận đã nhận yêu cầu gửi, chưa xác nhận phát thư. | Spec FR-003 và lỗi Graph; Microsoft Graph `user: sendMail` documentation. |
| Có thể log gì để tìm nguyên nhân mà không lộ OTP/email/secret? | Chỉ giai đoạn cấu hình/xác thực/gọi sendMail và HTTP status của Graph nếu có. | Spec AC-006; plan mục bảo mật và quan sát. |
| Dịch vụ nào đang nghe cổng localhost? | Identity đang nghe cổng 3001; cổng 3000 đang do `next-server` chiếm, không phải API Gateway tại thời điểm kiểm tra. | `lsof`/`ps` localhost ngày 2026-10-29; `.env.example` định nghĩa cổng mẫu. |

## What was done

Sửa `GraphPasswordResetMailer` để cảnh báo nội bộ nêu giai đoạn lỗi (`configuration`, `authentication`, `sendMail`), mã HTTP Graph và `error.code` đã lọc khi có. Không đổi response công khai, không ghi email, OTP, token, secret hoặc `error.message`. Bổ sung test xác nhận Graph 403 và mã `ErrorAccessDenied` được ghi đúng dạng an toàn.

## Why these choices

Trước đây mọi lỗi Graph đều thành cùng một dòng `Password reset email delivery failed`, nên không phân biệt thiếu mailbox, lỗi lấy app token, Graph từ chối hay lỗi mạng. Status, giai đoạn và mã lỗi Graph đã lọc định hướng kiểm tra cấu hình/quyền mà không làm lộ account qua response hoặc log dữ liệu nhạy cảm.

## How the feature works

1. `send-otp` chỉ gọi mailer sau khi tìm được User đủ điều kiện và lưu OTP qua cooldown.
2. Mailer lấy app token rồi gọi Graph `/users/{sender}/sendMail`.
3. Nếu lỗi, mailer ghi giai đoạn/status an toàn và ném lỗi nội bộ; use case vẫn trả 202 chung theo spec. Nếu Graph trả 202, Exchange tiếp tục xử lý phát thư sau response.

## Configuration

No configuration change.

## Verification

- Commands run and their results: 12 targeted tests pass ở lần chẩn đoán đầu; sau khi bổ sung `error.code`, Graph mailer test (2 tests), Prettier, ESLint, Identity TypeScript typecheck, `pnpm build:identity` và `git diff --check` pass. OpenAPI Identity localhost cho thấy `send-otp` 202, `verify-otp` 200, `reset` 204.
- Not verified: người dùng đã thấy Graph HTTP 403 nhưng chưa có `error.code`; chưa có quyền xem Exchange/Entra tenant, mailbox hoặc cấu hình thực tế nên chưa xác định nguyên nhân quyền cụ thể. Không đọc file `.env`. API Gateway không có tiến trình nghe cổng mẫu 3000 tại thời điểm kiểm tra.

## Remaining

- Not done: dùng `error.code` từ log Identity sau một request thật để phân biệt thiếu `Mail.Send` application/admin consent, mailbox ngoài scope Exchange hoặc chính sách tenant; nếu Graph 202, kiểm tra message trace, Junk/quarantine và NDR của mailbox gửi/nhận.
- Risks: HTTP 202 của API hoặc Graph không chứng minh email đã được phát tới Inbox; không nên gửi lại liên tục vì cooldown 60 giây và OTP trước bị vô hiệu khi cấp OTP mới.
