# ID-003 / 2 — API quản lý vai trò và principal tin cậy

- Nguồn: [spec](../../../../specs/01-identity/rbac/spec.md), [plan](../../../../specs/01-identity/rbac/plan.md), [tasks](../../../../specs/01-identity/rbac/tasks.md).
- Task: ID-003-T022–T035; phụ thuộc [chính sách/repository](01-domain-and-repository.md) và ranh giới xác thực ID-001.

## Trình tự thực hiện

1. Tái dùng xác minh Bearer/principal của ID-001 trong Identity; guard/ngữ cảnh chỉ nhận dữ liệu đã kiểm chứng. Tác nhân không lấy từ body, query, route hay header do client tự đặt. Kiểm tra tác động của thay đổi role lên token mới; token cũ không được viết lại.
2. Controller/DTO chỉ mở `GET /api/roles/users/:userId`, `POST /api/roles/users/:userId`, `DELETE /api/roles/users/:userId/:role`. Chỉ Admin được dùng. Body gán role chỉ nhận role đích hợp lệ; phản hồi chỉ trả dữ liệu gán an toàn. Nối `RbacModule` và cập nhật Swagger.
3. Ánh xạ lỗi chưa xác thực `401`, thiếu quyền `403`, đích vắng `404`, role sai theo quy ước kiểm tra; bất biến Admin cuối cùng giữ nguyên state khi thất bại. Gateway chỉ định tuyến/làm sạch header; không truy vấn database hoặc giữ chính sách gán vai trò.
4. Test Student/Lecturer tự nâng quyền, Admin cấp Admin cho người khác, gỡ Admin cuối cùng, thao tác lặp, header giả, token sai loại và log/response không lộ bí mật.

## Ranh giới

Không thêm CRUD role/permission, route `/authorize`, IAM động, audit service hay cập nhật Profile/Auth để cho phép gán vai trò. Các service khác chỉ tiêu thụ principal tin cậy và tự kiểm tra quyền sở hữu tài nguyên.
