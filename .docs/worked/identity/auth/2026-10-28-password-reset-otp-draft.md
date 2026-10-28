# 2026-10-28 — Bản nháp đặt lại mật khẩu BKPractice bằng OTP

- Author: Codex
- Scope: Tài liệu Identity/Auth; không thay đổi code, runtime, cấu hình hay database.

## Spec and plan

- Spec: [ID-007](../../../specs/01-identity/password-reset/spec.md).
- Plan: [ID-007 plan](../../../specs/01-identity/password-reset/plan.md).
- Tasks: [ID-007 tasks](../../../specs/01-identity/password-reset/tasks.md).
- Spec status at start: Chưa có spec riêng; ID-001 Authentication Approved loại forgot/reset password. ID-007 giữ Proposed, plan/tasks là bản nháp review.

## Questions clarified

| Question | Conclusion | Source |
| --- | --- | --- |
| Đặt lại mật khẩu nào? | Mật khẩu cục bộ BKPractice; không đổi mật khẩu Microsoft. | Người dùng xác nhận ngày 2026-10-28. |
| Bao nhiêu thao tác? | Ba endpoint gửi OTP, xác minh, đặt mật khẩu mới. | Người dùng xác nhận ngày 2026-10-28. |
| Microsoft tham gia ở đâu? | Graph chuyển email; Identity tạo/xác minh OTP. Mailbox/quyền Graph còn chờ chốt. | Yêu cầu người dùng; tài liệu Graph `sendMail`. |
| Có thể triển khai theo ID-001 không? | Không; ID-001 Out of Scope. Tạo feature Proposed riêng. | ID-001 spec. |
| TTL/lượt thử/đối tượng/phiên chốt chưa? | Chưa; ghi thành Câu hỏi mở chặn Approved. | ID-007 draft và Auth code hiện có. |

## What was done

Tạo `spec.md`, `plan.md`, `tasks.md` ID-007 tại `.docs/specs/01-identity/password-reset/`. Spec mô tả ba endpoint, reset grant một lần, chống dò account, ranh giới BKPractice/Microsoft, lỗi và AC. Plan ánh xạ Auth use cases, Redis, TypeORM, Graph/Gateway sau Approved. Tasks chưa triển khai.

## Why these choices

ID-001 Approved đã loại trừ forgot/reset nên không sửa nó. Identity giữ password/phiên; Graph chỉ gửi email. `resetToken` sau verify bảo đảm bước đổi mật khẩu dựa trên bằng chứng server, không tin trạng thái FE.

## How the feature works

Đây là tài liệu, chưa có runtime mới. FE yêu cầu OTP; Identity tạo challenge, Graph chuyển mail. FE gửi OTP lấy reset grant, rồi gửi grant cùng mật khẩu mới; Identity băm/lưu credential và xử lý phiên theo chính sách duyệt. Lỗi/email không có account cần phản hồi chống dò. Chỉ có hiệu lực sau Approved/triển khai.

## Configuration

No configuration change. Plan dự kiến cần mailbox/quyền Graph; chưa thêm key hoặc secret.

## Verification

- Commands run and their results: kiểm tra ba tài liệu, liên kết nội bộ và khoảng trắng Markdown sau khi khôi phục.
- Not verified: không chạy lint/typecheck/test/build, Graph/Redis/database vì chỉ soạn tài liệu.

## Remaining

- Not done: chốt Câu hỏi mở, review/Approved ID-007, cập nhật plan/tasks theo quyết định và triển khai code.
- Risks: mailbox/`Mail.Send` chưa xác nhận; TTL/attempts, đối tượng, password policy và phiên cũ chưa duyệt. Tài liệu ID-004 `student-provisioning` ngoài phạm vi khôi phục này hiện thiếu trong worktree.
