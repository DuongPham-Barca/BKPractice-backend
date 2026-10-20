# ID-001 / 3 — Đăng nhập Microsoft của trường

- Nguồn: [spec](../../../../../specs/01-identity/authentication/spec.md), [plan](../../../../../specs/01-identity/authentication/plan.md), [tasks](../../../../../specs/01-identity/authentication/tasks.md).
- Task: ID-001-T015–T016, T019–T021; phụ thuộc model/port/migration ở [phần 1](01-foundation-and-storage.md) và phát hành phiên ở [phần 2](02-student-login-and-sessions.md).

## Trình tự thực hiện

1. Adapter MSAL dùng tenant và redirect cố định, Authorization Code Flow với PKCE; adapter Redis lưu state/nonce/PKCE ngắn hạn và tiêu thụ nguyên tử. Không lưu token Microsoft lâu dài hoặc gọi Microsoft Graph.
2. `StartMicrosoftLogin` sinh state/nonce và trả URL uỷ quyền. `CompleteMicrosoftLogin` tiêu thụ state, kiểm chứng issuer/audience/tenant/chữ ký/hạn/nonce và chỉ tin `preferred_username`, `tid`, `oid` đã xác minh.
3. Ưu tiên liên kết ổn định bằng `tid + oid`; lần đầu đối sánh đúng một email trường đã được cấp và tạo liên kết nguyên tử. Không tạo User mới. Từ chối tài khoản không khớp, xung đột, không `ACTIVE` bằng lỗi công khai chung.
4. Callback tạo mã đăng nhập mờ dùng một lần, TTL 60 giây; `ExchangeMicrosoftLoginCode` tiêu thụ nguyên tử, nạp lại tài khoản/trạng thái/vai trò và phát hành họ refresh mới.

## Bàn giao và kiểm chứng

Test bằng adapter Microsoft giả cho tenant sai, claim/nonce/state lỗi, liên kết lặp/xung đột, mã hết hạn hoặc dùng lần hai. Smoke test trên tenant staging theo T037 thuộc [phần kiểm chứng](06-verification-and-handoff.md); không đưa token hoặc bí mật vào URL/log.
