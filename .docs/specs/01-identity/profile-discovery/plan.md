# ID-005 Kế hoạch tìm kiếm hồ sơ công khai

## Trạng thái và đặc tả liên quan

Bản nháp để review theo [spec ID-005 0.1](./spec.md), hiện **Proposed**. Chưa phải kế hoạch được duyệt để triển khai; các lựa chọn phụ thuộc Câu hỏi mở của spec.

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway chỉ xác thực/chuyển tiếp, không truy vấn Identity DB.

## Ảnh hưởng mã hiện có

- Mở rộng `modules/profiles` với use case tìm kiếm và route đọc; giữ `GET /api/users/:userId/profile` và DTO của ID-002.
- Dùng `Profile.displayName` làm tên tìm kiếm, kết hợp User để lọc trạng thái/tài khoản hệ thống. Không dùng API quản trị User cấp dữ liệu tìm kiếm cho FE.

## Domain và application

- Áp dụng điều kiện hồ sơ công khai ID-002; không thêm state/entity domain.
- Thêm use case tìm theo tên và port truy vấn trang kết quả. Use case dựng biểu diễn công khai, ký avatar qua adapter hiện có, không xuất dữ liệu nhạy cảm.
- Chuẩn hoá `q`, quyền search và schema phân trang chờ quyết định spec.

## Lưu trữ, cơ sở dữ liệu và migration

- TypeORM adapter Identity truy vấn Profile gắn User `ACTIVE`, không phải hệ thống; khi có xoá mềm thì loại User đã xoá. Dùng tham số truy vấn, giới hạn trang và thứ tự ổn định.
- Không thêm cột. Chỉ thêm index/migration nếu kế hoạch truy vấn đã chốt cho thấy cần; không bật `synchronize`.
- Hành vi User chưa có Profile phải theo quyết định ở spec, không tự tạo hàng loạt trong thao tác đọc.

## API, DTO và phân quyền

- Route dự kiến `GET /api/profiles/search`; DTO chỉ nhận `q` và tham số phân trang được duyệt.
- DTO phản hồi chỉ xuất `userId`, `displayName`, `avatar` và metadata phân trang. Route chi tiết ID-002 giữ nguyên.
- Gateway cho phép cookie/Bearer theo chính sách search sau khi chốt; Identity kiểm tra quyền. Swagger mô tả lỗi/response.

## Messaging, realtime và adapter khác

N/A — truy vấn đồng bộ, không phát message hoặc sự kiện. Tái dùng adapter ký URL avatar.

## Kiểm thử và khả năng quan sát

- Unit: tên Profile cá nhân hoá, bộ lọc, projection, truy vấn sai/rỗng, phân trang (FR-001–FR-005).
- PostgreSQL/API/Gateway: dấu/ký tự đặc biệt theo quy tắc duyệt, thứ tự, quyền, avatar, route chi tiết (AC-001–AC-006).
- Log request ID/thời gian truy vấn tổng hợp; không log tên tìm kiếm thô hoặc dữ liệu kết quả.

## Thứ tự triển khai sau Approved

1. Chốt Câu hỏi mở và phê duyệt spec; review lại plan/tasks.
2. Tạo port/use case, adapter truy vấn, DTO/controller và kiểm tra Gateway.
3. Kiểm thử, Swagger, các lệnh pnpm áp dụng và đối chiếu FR/AC.

## Rủi ro và tuân thủ kiến trúc

Tìm tên tự do có thể gây truy vấn tốn tài nguyên/dò danh bạ; giới hạn đầu vào/trang và quyền cần chốt. Presentation xử lý HTTP, application điều phối, infrastructure giữ TypeORM/R2; Identity giữ quyền sở hữu User/Profile. Không đọc DB xuyên service.
