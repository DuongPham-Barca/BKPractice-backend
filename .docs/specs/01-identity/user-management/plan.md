# ID-006 Kế hoạch xem và xoá mềm User

## Trạng thái và đặc tả liên quan

Kế hoạch được chủ sở hữu review theo [spec ID-006 1.0](./spec.md), **Approved** ngày 2026-10-28. Phần import ID-004 đã Approved giữ nguyên; bản sao spec ID-004 đã được tái dựng theo yêu cầu chủ sở hữu để đối chiếu trước khi triển khai.

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway xác thực/chuyển tiếp, không sở hữu User/database.

## Ảnh hưởng mã hiện có

- `modules/users` hiện có persistence entity; cần boundary application/presentation thật cho quản trị, tránh đặt xoá trong Auth controller.
- Auth lookup, Microsoft matching, refresh, Profile public/search và RBAC phải cùng nhận biết User đã xoá.
- Giữ `POST /api/auth/accounts/import` ID-004 và `GET /api/users/:userId/profile` ID-002; đổi route Approved cần quyết định riêng.

## Domain và application

- Định nghĩa bất biến User có `deletedAt`, chặn xoá ADMIN/system và quyền đọc/xoá theo spec 1.0.
- Use case đọc trang, đọc chi tiết, xoá mềm. Xoá điều phối User repository, RBAC và chính sách phiên, không sửa dữ liệu service khác.
- Port cho truy vấn projection, transaction xoá và thu hồi mọi phiên. Dùng kiểm tra phiên hiện có để access token cũ bị từ chối ngay.

## Lưu trữ, cơ sở dữ liệu và migration

- TypeORM Identity truy vấn phân trang/thứ tự ổn định và projection allowlist; xoá dùng transaction/lock bảo vệ cạnh tranh và Admin cuối cùng.
- Migration TypeORM thêm dấu xoá theo contract, giữ User/tham chiếu; không bật `synchronize`.
- Cập nhật query xác thực/Microsoft/refresh/Profile để loại User đã xoá; giữ email/MSSV unique và cho import lại báo trùng.

## API, DTO và phân quyền

- Route `GET /api/admin/users`, `GET /api/admin/users/:userId`, `DELETE /api/admin/users/:userId`.
- DTO danh sách nhận `page`/`limit` (1/20, tối đa 50) và `includeDeleted` mặc định false; trả `{ items, page, limit, hasMore }`, sắp xếp `createdAt`/`userId` giảm dần. Projection chỉ các trường FR-002, không serialize User entity trực tiếp.
- Guard kiểm tra access token/phiên và ADMIN + `user:read` hoặc `user:delete`. Bổ sung hai quyền vào RBAC catalog/seed chỉ cho ADMIN; token cũ nhận quyền sau login/refresh.
- Gateway giữ cookie/Bearer và CSRF cho DELETE dùng cookie; Swagger mô tả phản hồi/lỗi/quyền.

## Messaging, realtime và adapter khác

N/A — không message/realtime. Thu hồi mọi phiên dùng port/repository Identity, không truy cập DB khác.

## Xử lý lỗi, bảo mật và quan sát

- Lỗi auth/quyền/UUID/User/chính sách bảo vệ ánh xạ nhất quán, không lộ lỗi DB.
- Log request ID, actor ID, kết quả tổng hợp; không log mật khẩu, token, email hoặc Profile.
- Test xoá cùng login/refresh/token cũ; session revocation và dấu `deletedAt` đều bắt buộc.

## Chiến lược kiểm thử

- Unit: role/quyền, projection, Admin cuối cùng, tính lặp (FR-001–FR-010).
- PostgreSQL: migration run/revert, transaction/concurrency, unique email/MSSV và tham chiếu.
- API/Gateway: phân trang, 401/403/404, CSRF, xoá đồng thời, login/Microsoft/refresh sau xoá, Profile/search (AC-001–AC-007).

## Thứ tự triển khai sau Approved

1. Khôi phục bản sao ID-004 còn thiếu và đối chiếu phần import đã Approved, rồi kiểm tra worktree/schema.
2. Thêm migration, domain/application, repository, controller/DTO/guard và RBAC seed.
3. Cập nhật query Auth/Profile và Gateway; test, pnpm gates, đối chiếu FR/AC.

## Rủi ro và tuân thủ kiến trúc

Dấu xoá không được áp đồng nhất sẽ để lộ/cho login User đã xoá. Test mọi đường phát token, kiểm tra phiên và uniqueness; không đổi dữ liệu service khác. Presentation xử lý HTTP; application điều phối; infrastructure giữ TypeORM; Identity giữ User/phiên, không cascade xuyên service.
