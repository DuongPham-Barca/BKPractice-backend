# ID-005 Kế hoạch tìm kiếm hồ sơ công khai

## Trạng thái và đặc tả liên quan

Kế hoạch theo [spec ID-005 1.1](./spec.md), **Approved** theo yêu cầu cập nhật của chủ sở hữu ngày 2026-10-28. Code ID-005 đã triển khai; xác minh PostgreSQL và các lệnh toàn repo còn chờ điều kiện ở [tasks.md](./tasks.md).

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway chỉ xác thực/chuyển tiếp, không truy vấn Identity DB.

## Ảnh hưởng mã hiện có

- Mở rộng `modules/profiles` với use case tìm kiếm và route đọc; giữ `GET /api/users/:userId/profile` và DTO của ID-002.
- Dùng `Profile.displayName` làm tên tìm kiếm, kết hợp User để lọc trạng thái/tài khoản hệ thống. Không dùng API quản trị User cấp dữ liệu tìm kiếm cho FE.

## Domain và application

- Áp dụng điều kiện hồ sơ công khai ID-002; không thêm state/entity domain.
- Thêm use case tìm theo tên và port truy vấn trang kết quả. Use case dựng biểu diễn công khai, ký avatar qua adapter hiện có, không xuất dữ liệu nhạy cảm.
- Trim `q`, kiểm tra 1–100 ký tự để FE tìm sau từng ký tự nhập, tìm chuỗi con không phân biệt hoa thường nhưng giữ dấu; escape `%`/`_` trước truy vấn để chúng là ký tự thường. Không tạo Profile cho User cũ khi search.

## Lưu trữ, cơ sở dữ liệu và migration

- TypeORM adapter Identity truy vấn Profile gắn User `ACTIVE`, không phải hệ thống; khi có xoá mềm thì loại User đã xoá. Dùng tham số truy vấn, `page`/`limit` và sắp xếp tên không phân biệt hoa thường rồi `userId` tăng dần.
- Không thêm cột. Chỉ thêm index/migration nếu kế hoạch truy vấn đã chốt cho thấy cần; không bật `synchronize`.
- User chưa có Profile bị bỏ qua; không tự tạo hàng loạt trong thao tác đọc.

## API, DTO và phân quyền

- Route `GET /api/profiles/search`; DTO nhận `q`, `page` mặc định 1 và `limit` mặc định 20/tối đa 50.
- DTO phản hồi `{ items, page, limit, hasMore }`; mỗi item chỉ có `userId`, `displayName`, `avatar`. Route chi tiết ID-002 giữ nguyên.
- Gateway nhận cookie/Bearer đã xác minh; Identity yêu cầu người dùng đăng nhập. Swagger mô tả 400/401/200 và projection.

## Messaging, realtime và adapter khác

N/A — truy vấn đồng bộ, không phát message hoặc sự kiện. Tái dùng adapter ký URL avatar.

## Kiểm thử và khả năng quan sát

- Unit: tên Profile cá nhân hoá, truy vấn một ký tự, bộ lọc, projection, truy vấn sai/rỗng, phân trang (FR-001–FR-005).
- PostgreSQL/API/Gateway: giữ dấu, `%`/`_` literal, thứ tự, phân trang, 401, avatar và route chi tiết (AC-001–AC-006).
- Log request ID/thời gian truy vấn tổng hợp; không log tên tìm kiếm thô hoặc dữ liệu kết quả.

## Thứ tự triển khai sau Approved

1. Tạo port/use case, adapter truy vấn, DTO/controller và kiểm tra Gateway.
2. Kiểm thử, Swagger, các lệnh pnpm áp dụng và đối chiếu FR/AC.

## Rủi ro và tuân thủ kiến trúc

Tìm tên tự do có thể gây truy vấn tốn tài nguyên/dò danh bạ; giới hạn `q`, trang và quyền đăng nhập đã chốt giảm rủi ro. Presentation xử lý HTTP, application điều phối, infrastructure giữ TypeORM/R2; Identity giữ quyền sở hữu User/Profile. Không đọc DB xuyên service.
