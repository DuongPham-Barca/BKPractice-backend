# ID-005 — Tìm hồ sơ từ ô nhập tên

Contract triển khai theo [spec ID-005 Approved 1.1](../../../../specs/01-identity/profile-discovery/spec.md). FE gửi request sau khi người dùng nhập tên; không tải danh sách User để lọc trên trình duyệt.

## Request

`GET /api/profiles/search?q=<tên>&page=<số>&limit=<số>`

- Cần phiên BKPractice hợp lệ: cookie access trên web hoặc Bearer access token trên app.
- FE có thể gửi request sau mỗi ký tự được nhập: `q=D` tìm được `Dũng Dương`. URL-encode `q`; API trim tên và chấp nhận 1–100 ký tự. Khớp chuỗi con không phân biệt hoa thường, vẫn phân biệt dấu. `%` và `_` là ký tự thường. Không gửi request khi ô nhập rỗng.
- `page` mặc định 1, `limit` mặc định 20; cả hai là số nguyên dương, `limit` tối đa 50.

## Response và điều hướng

`200` trả `{ "items": [{ "userId": "<uuid>", "displayName": "Nguyễn An", "avatar": null }], "page": 1, "limit": 20, "hasMore": false }`.

`avatar` là URL ký ngắn hạn hoặc `null`. Mỗi item chỉ có ba trường công khai trên; không có bio hoặc dữ liệu tài khoản. FE dùng `hasMore` để lấy trang kế tiếp. Khi người dùng chọn một item, dùng `userId` gọi `GET /api/users/:userId/profile` để xem hồ sơ chi tiết. Không có kết quả vẫn là `200` với `items: []`.

Tham số sai trả `400`; chưa đăng nhập/phiên không hợp lệ trả `401`. Route chi tiết giữ quyền truy cập công khai đã có trong ID-002. Kết quả search có thể cũ nếu Profile hoặc trạng thái User thay đổi trước lúc mở chi tiết.
