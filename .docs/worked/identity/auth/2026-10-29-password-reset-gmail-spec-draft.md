# 2026-10-29 — Đề xuất Gmail gửi OTP reset

- Author: Codex
- Scope: Tài liệu ID-007 Identity auth, bản sửa đổi 1.2.

## Spec and plan

- Spec: `.docs/specs/01-identity/password-reset/spec.md` 1.1 Approved là nền hiện có; 1.2 Proposed sau yêu cầu sửa tài liệu của người dùng.
- Plan: `.docs/specs/01-identity/password-reset/plan.md` 1.2 chưa review.
- Tasks: `.docs/specs/01-identity/password-reset/tasks.md` có checklist mới cho 1.2 và giữ lịch sử 1.1.
- Spec status at start: 1.1 Approved; 1.2 chưa tồn tại.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Vì sao đổi kênh gửi OTP? | Graph trả HTTP 403 và màn hình Entra cho thấy `Mail.Send` Application chưa được tenant trường chấp thuận; người dùng đã tự gửi từ Gmail cá nhân tới một email sinh viên và nhận được. | Trao đổi người dùng ngày 2026-10-29; spec ID-007 1.1 FR-002. |
| Có đổi nơi lưu OTP hoặc API không? | Không. PostgreSQL Identity, ba endpoint, response chống dò account, TTL và chính sách reset của 1.1 giữ nguyên. | Spec ID-007 FR-003–FR-011; yêu cầu lần này chỉ sửa spec theo hướng Gmail. |
| Gmail dùng mọi môi trường hay chỉ test/dev? | Chưa có câu trả lời; 1.2 để Proposed và checklist chặn triển khai cho tới khi chủ sở hữu chốt. | Câu hỏi làm thay đổi phạm vi vận hành; working agreement bước 3. |
| Có sửa code/cấu hình đang chạy ngay không? | Không. Người dùng yêu cầu cập nhật tài liệu; Graph adapter và `.env.example` hiện tại tiếp tục là trạng thái triển khai 1.1. | Yêu cầu người dùng và working agreement mục Documentation-only work. |

## What was done

Cập nhật spec ID-007 thành bản đề xuất 1.2: Gmail SMTP có xác thực/TLS là kênh gửi OTP tới email trường đã lưu, thay yêu cầu Graph `Mail.Send` của luồng reset. Cập nhật plan về adapter SMTP, biến cấu hình dự kiến, kiểm thử và bảo vệ bí mật; cập nhật tasks để tách việc 1.2 chưa làm khỏi lịch sử 1.1. Không thay đổi source, dependency, migration hoặc biến runtime.

## Why these choices

Người dùng đã chứng minh một mailbox trường nhận được email gửi thủ công từ Gmail, nên Gmail là phương án cần đặc tả để thử thay Graph đang bị tenant từ chối. Spec giữ status Proposed vì phạm vi môi trường Gmail còn mở và mail gửi thủ công chưa chứng minh backend gửi được. App Password được ghi là điều kiện triển khai dự kiến, không ghi giá trị bí mật; nếu tài khoản không có tùy chọn này phải chọn lại cơ chế xác thực trước khi sửa code.

## How the feature works

1. Khi 1.2 được Approved và triển khai, client vẫn gọi `send-otp`, `verify-otp`, `reset` như cũ.
2. Identity vẫn tra User đủ điều kiện và lưu challenge/grant trong PostgreSQL, rồi mail port chuyển OTP tới Gmail SMTP adapter.
3. Adapter dự kiến gửi từ Gmail cấu hình tới email trường đã lưu. Gmail SMTP lỗi vẫn dẫn tới response 202 chung và log an toàn; verify/reset không đổi.
4. Hiện tại code chưa đi theo luồng này; mailer Graph của 1.1 vẫn đang chạy.

## Configuration

No configuration change. Kế hoạch 1.2 dự kiến `GMAIL_SMTP_USER` và `GMAIL_SMTP_APP_PASSWORD` dưới dạng placeholder ở `.env.example` khi triển khai; `MICROSOFT_MAIL_SENDER` dành cho OTP sẽ được bỏ, các biến Microsoft OAuth vẫn giữ.

## Verification

- Commands run and their results: đọc spec/plan/tasks, kiến trúc Identity, ADR và working agreement; `git diff --check` pass; đối chiếu FR-001–FR-011 và AC-001–AC-009 để chỉ thay kênh gửi mail.
- Not verified: không chạy test/build/migration vì đây là thay đổi tài liệu; chưa có Gmail App Password hoặc smoke SMTP backend; chưa xác minh mọi mailbox trường nhận được thư Gmail.

## Remaining

- Not done: chủ sở hữu chốt Gmail dùng chính thức hay chỉ test/dev, review/Approved 1.2, xác nhận App Password khả dụng rồi mới triển khai adapter/cấu hình và kiểm thử thật.
- Risks: gửi thủ công thành công cho một mailbox không bảo đảm các mailbox khác hoặc luồng SMTP backend sẽ thành công; code hiện tại vẫn dùng Graph và có thể tiếp tục nhận 403.
