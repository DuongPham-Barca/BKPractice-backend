# ID-004 Kế hoạch import tài khoản — bản tái dựng

Theo [spec ID-004 phần import](./spec.md) đã Approved; đây là bản đối chiếu của phần đã triển khai, không mở thêm scope. Identity theo [Clean Architecture](../../../architecture/identity-service.md): parser và chính sách hàng trong Auth, use case điều phối, TypeORM adapter tạo User/Profile/role trong transaction. Gateway xử lý xác thực cookie/Bearer và CSRF; RBAC seed danh mục role và `user:import` riêng.

Đường chạy hiện có: `AccountImportController` → `AccountImportGuard` → `ImportAccounts` → parser/validation → `TypeormAccountImportRepository`. Khi ID-006 thêm `deletedAt`, giữ nguyên route/DTO/parser và giữ uniqueness trên email/MSSV của User đã xoá. Chỉ đối chiếu import ở ranh giới này; không đổi credential/role/transaction import trong ID-006.
