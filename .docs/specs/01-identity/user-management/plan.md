# ID-006 Kế hoạch xem và xoá mềm User

## Trạng thái và đặc tả liên quan

Bản nháp theo [spec ID-006 0.1](./spec.md), hiện **Proposed**. Chưa triển khai tới khi Approved và hoà giải phần CRUD Proposed của ID-004.

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway xác thực/chuyển tiếp, không sở hữu User/database.

## Ảnh hưởng mã hiện có

- `modules/users` hiện có persistence entity; cần boundary application/presentation thật cho quản trị, tránh đặt xoá trong Auth controller.
- Auth lookup, Microsoft matching, refresh, Profile public/search và RBAC phải cùng nhận biết User đã xoá.
- Giữ `POST /api/auth/accounts/import` ID-004 và `GET /api/users/:userId/profile` ID-002; đổi route Approved cần quyết định riêng.

## Domain và application

- Định nghĩa bất biến User đã xoá, Admin cuối cùng và quyền xem/xoá theo spec được duyệt.
- Use case đọc trang, đọc chi tiết, xoá mềm. Xoá điều phối User repository, RBAC và chính sách phiên, không sửa dữ liệu service khác.
- Port cho truy vấn projection, transaction xoá, thu hồi phiên; chính sách Admin/system/phiên cần chốt trước thiết kế cuối.

## Lưu trữ, cơ sở dữ liệu và migration

- TypeORM Identity truy vấn phân trang/thứ tự ổn định và projection allowlist; xoá dùng transaction/lock bảo vệ cạnh tranh và Admin cuối cùng.
- Migration TypeORM thêm dấu xoá theo contract, giữ User/tham chiếu; không bật `synchronize`.
- Cập nhật query xác thực/Microsoft/refresh/Profile để loại User đã xoá; uniqueness/import lại theo spec chốt.

## API, DTO và phân quyền

- Route dự kiến `GET /api/admin/users`, `GET /api/admin/users/:userId`, `DELETE /api/admin/users/:userId`.
- DTO chỉ xuất trường quản trị duyệt, không serialize User entity trực tiếp.
- Guard kiểm tra access token/phiên và ADMIN + quyền được duyệt; RBAC catalog/seed chỉ sửa sau khi mã quyền được duyệt.
- Gateway giữ cookie/Bearer và CSRF cho DELETE dùng cookie; Swagger mô tả phản hồi/lỗi/quyền.

## Messaging, realtime và adapter khác

N/A — không message/realtime. Thu hồi phiên nếu duyệt dùng port/repository Identity, không truy cập DB khác.

## Xử lý lỗi, bảo mật và quan sát

- Lỗi auth/quyền/UUID/User/chính sách bảo vệ ánh xạ nhất quán, không lộ lỗi DB.
- Log request ID, actor ID, kết quả tổng hợp; không log mật khẩu, token, email hoặc Profile.
- Test xoá cùng login/refresh/token cũ; không suy chính sách token từ `deletedAt`.

## Chiến lược kiểm thử

- Unit: role/quyền, projection, Admin cuối cùng, tính lặp (FR-001–FR-010).
- PostgreSQL: migration run/revert, transaction/concurrency, unique email/MSSV và tham chiếu.
- API/Gateway: phân trang, 401/403/404, CSRF, xoá đồng thời, login/Microsoft/refresh sau xoá, Profile/search (AC-001–AC-007).

## Thứ tự triển khai sau Approved

1. Chốt Câu hỏi mở, đối chiếu ID-004/ID-003/ID-001 và phê duyệt spec; review plan/tasks.
2. Thêm migration, domain/application, repository, controller/DTO/guard.
3. Cập nhật query Auth/Profile và Gateway; test, pnpm gates, đối chiếu FR/AC.

## Rủi ro và tuân thủ kiến trúc

Dấu xoá không được áp đồng nhất sẽ để lộ/cho login User đã xoá. Migration, uniqueness và token cũ cần chốt trong spec. Presentation xử lý HTTP; application điều phối; infrastructure giữ TypeORM; Identity giữ User/phiên, không cascade xuyên service.
