# ID-003 / 1 — Chính sách RBAC và repository Identity

- Nguồn: [spec](../../../../specs/01-identity/rbac/spec.md), [plan](../../../../specs/01-identity/rbac/plan.md), [tasks](../../../../specs/01-identity/rbac/tasks.md).
- Task: ID-003-T001–T021; phần danh mục quyền mới của bản sửa đổi 0.4 ở [phần 3](03-permission-catalog-and-claims.md).

## Trình tự thực hiện

1. Xác nhận tài liệu Approved, schema `roles`, `permissions`, `user_roles`, `role_permissions`, principal ID-001 và ranh giới Gateway/Identity. Chỉ ba vai trò `STUDENT`, `LECTURER`, `ADMIN`; không tạo bảng/service vai trò khác.
2. Tạo kiểu role chuẩn tắc, mã quyền và principal/quyết định độc lập framework. Chính sách chỉ cho phép khả năng đã gán; thiếu hoặc sai chính sách thì từ chối. Admin được xem/gán/thu hồi Student/Lecturer; không được cấp Admin cho người khác, Admin cuối cùng không được tự thu hồi.
3. Định nghĩa các port hẹp theo plan, tái dùng ngữ cảnh xác thực ID-001. Hiện thực `GetUserRoles`, `AssignRoleToUser`, `RevokeRoleFromUser` và `EvaluateAuthorization` nội bộ; không tạo route `/authorize` công khai.
4. Adapter TypeORM tái dùng bảng/entity Identity hiện có. Gán/thu hồi idempotent; kiểm tra Admin cuối cùng và ghi thay đổi trong cùng transaction, có chiến lược khoá/tuần tự hoá an toàn khi hai lần thu hồi đồng thời.
5. Xác minh migration nền tảng đã seed ba role và các unique/FK hiện có. Phần role management v1 không cần migration schema; không sửa migration nền tảng hay tạo migration rỗng. Migration **dữ liệu permission** của bản 0.4 là phần riêng.

## Bàn giao và kiểm chứng

Test domain, repository, đồng thời, nhiều vai trò, idempotence và Admin cuối cùng; xác nhận auth/profile không thể ghi RBAC. Tài khoản Admin ban đầu và import Excel là điều kiện vận hành/feature khác, không tạo endpoint bootstrap trong ID-003.
