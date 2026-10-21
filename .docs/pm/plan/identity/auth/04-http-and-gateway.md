# ID-001 / 4 — HTTP, composition và API Gateway

- Nguồn: [spec](../../../../specs/01-identity/authentication/spec.md), [plan](../../../../specs/01-identity/authentication/plan.md), [tasks](../../../../specs/01-identity/authentication/tasks.md).
- Task: ID-001-T017, T025–T032; phụ thuộc các use case ở [phần 2](02-student-login-and-sessions.md) và [phần 3](03-microsoft-login.md).

## Trình tự thực hiện

1. Nối các port/use case/adapter trong `auth.module.ts`; controller chỉ kiểm tra và chuyển đổi dữ liệu HTTP. DTO dùng whitelist, từ chối trường thừa, giữ nguyên mật khẩu; DTO phản hồi liệt kê tường minh trường được phép.
2. Thay controller cũ bằng đúng bảy thao tác login, Microsoft start/callback/exchange, refresh, logout, `/me`. Gỡ public register **khi luồng mới và test thay thế đã sẵn sàng**; logout và `/me` cần Bearer hợp lệ ở Gateway và Identity.
3. Gateway chỉ mở các route auth công khai đã duyệt, xoá header định danh do client gửi, chuyển tiếp `Location` cho 302 an toàn và giữ quy ước không chuyển tiếp `set-cookie`. Thêm giới hạn tần suất theo đường dẫn/cấu hình từ plan; không đưa xử lý tài khoản vào Gateway.
4. Ánh xạ lỗi domain/application thành lỗi HTTP chung: dữ liệu sai `400`, lỗi xác thực `401`, phụ thuộc Microsoft/Redis `503`, lỗi ngoài dự kiến theo quy ước hiện có. Swagger mô tả các route, Bearer, redirect và phản hồi.

## Bàn giao và kiểm chứng

Test cả đường truy cập trực tiếp Identity lẫn đi qua Gateway: route công khai/chặn, header giả mạo, loại token, redirect không chứa bearer, throttling và phản hồi/log không lộ bí mật. Header `x-auth-permissions` thuộc [kế hoạch RBAC](../rbac/03-permission-catalog-and-claims.md), không suy từ request.
