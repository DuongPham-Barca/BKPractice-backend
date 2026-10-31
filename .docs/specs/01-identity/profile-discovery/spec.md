# ID-005 Tìm kiếm hồ sơ công khai

## Trạng thái

Approved — phiên bản 1.1, chủ sở hữu cập nhật yêu cầu ngày 2026-10-28.

## Mục tiêu

Cho phép người dùng nhập tên trên FE để tìm người dùng BKPractice khác, rồi mở hồ sơ công khai của người được chọn mà không dùng API danh sách tài khoản quản trị.

## Tác nhân và bối cảnh

- STUDENT và LECTURER tìm hồ sơ người khác bằng tên hiển thị.
- Identity sở hữu Profile và User; Gateway chuyển tiếp request theo chính sách xác thực đã duyệt.
- ID-002 đã có `GET /api/users/:userId/profile`, trả `displayName`, `avatar`, `bio`. Route này cần `userId` và không tìm theo tên.

## Yêu cầu chức năng

- **ID-005-FR-001 — Tìm theo tên:** Identity MUST cung cấp thao tác tìm hồ sơ theo `Profile.displayName`. Tên `User.displayName` ban đầu không thay thế tên Profile đã được cá nhân hoá.
- **ID-005-FR-002 — Kết quả có định danh:** Mỗi kết quả MUST có `userId` để FE gọi route hồ sơ công khai hiện có, cùng `displayName` và avatar công khai nếu có.
- **ID-005-FR-003 — Giới hạn dữ liệu:** Kết quả MUST NOT chứa email, MSSV, mật khẩu/hash, vai trò, quyền, trạng thái, token, định danh Microsoft, bio hoặc dữ liệu học tập. Bio chỉ được đọc ở route chi tiết ID-002.
- **ID-005-FR-004 — Tập hồ sơ được tìm:** Chỉ Profile đã tồn tại của User `ACTIVE`, không phải tài khoản hệ thống, mới xuất hiện. User `LOCKED`/`PENDING` và User đã xoá mềm sau khi ID-006 được duyệt không xuất hiện.
- **ID-005-FR-005 — Giới hạn truy vấn:** API MUST tìm chuỗi con không phân biệt hoa thường nhưng giữ dấu tiếng Việt trong `Profile.displayName`. `q` sau khi trim dài 1–100 ký tự để FE có thể tìm ngay khi người dùng nhập ký tự đầu tiên; ví dụ `q=D` tìm được Profile tên `Dũng Dương`. API MUST phân trang bằng `page`/`limit`, mặc định `page=1`, `limit=20`, tối đa `limit=50`, sắp xếp theo `displayName` rồi `userId` để ổn định. Không tải toàn bộ User/Profile về FE để lọc.
- **ID-005-FR-006 — Tương thích:** Chọn kết quả MUST tiếp tục dùng `GET /api/users/:userId/profile`; không tạo thêm route chi tiết trùng chức năng.

## Quy tắc phân quyền

Chỉ người dùng BKPractice có phiên hợp lệ được tìm kiếm; STUDENT, LECTURER và ADMIN nhận cùng biểu diễn công khai. Khách chưa xác thực không dùng được search. Route xem hồ sơ ID-002 giữ chính sách công khai hiện tại.

## Đầu vào và đầu ra

- Route: `GET /api/profiles/search?q=<tên>&page=<số>&limit=<số>`.
- `q` được trim, phải dài 1–100 ký tự; tìm chuỗi con không phân biệt hoa thường, giữ dấu tiếng Việt. FE có thể gọi lại API sau mỗi ký tự được nhập. Ký tự `%` và `_` trong `q` được hiểu là ký tự thường, không phải wildcard. Không nhận role, status, email, MSSV hay quyền do client cung cấp làm bộ lọc tin cậy.
- `page` là số nguyên từ 1, mặc định 1; `limit` là số nguyên từ 1 tới 50, mặc định 20. Response `200` là `{ items: Array<{ userId, displayName, avatar }>, page, limit, hasMore }`. Không có kết quả trả `items: []` và `hasMore: false`; không trả tổng số User.
- Sắp xếp theo `displayName` không phân biệt hoa thường, rồi `userId` tăng dần. Avatar theo chính sách URL ký ngắn hạn của ID-002.

## Tình huống lỗi và biên

- Truy vấn thiếu/sai định dạng hoặc vượt giới hạn trả `400`, không chạy truy vấn không giới hạn. Thiếu hoặc sai phiên trả `401`.
- Không có kết quả trả danh sách rỗng; User không tồn tại, bị khoá hoặc chưa có Profile không hiện.
- Ký URL avatar thất bại theo chính sách lỗi ID-002, không lộ object key/bucket.
- Nếu Profile đổi tên hoặc User đổi trạng thái giữa lúc tìm và mở chi tiết, route chi tiết tự kiểm tra lại; kết quả tìm kiếm không đảm bảo hồ sơ còn khả dụng.

## Tiêu chí nghiệm thu

- **ID-005-AC-001:** STUDENT nhập tên trên FE, nhận trang kết quả và dùng `userId` để mở `GET /api/users/:userId/profile`.
- **ID-005-AC-002:** Profile có tên cá nhân hoá khác `User.displayName` được tìm bằng tên Profile.
- **ID-005-AC-003:** Kết quả không có email, MSSV, vai trò, quyền, trạng thái, bio hay credential; avatar là URL ngắn hạn đã duyệt.
- **ID-005-AC-004:** User `LOCKED`/`PENDING`, tài khoản hệ thống và User đã xoá mềm không xuất hiện.
- **ID-005-AC-005:** `q` một ký tự (ví dụ `D`) được chấp nhận và tìm được tên phù hợp (ví dụ `Dũng Dương`); `q` rỗng sau khi trim hoặc trên 100 ký tự, `page`/`limit` ngoài giới hạn bị từ chối; truy vấn không có kết quả trả trang rỗng; phân trang ổn định trong tập dữ liệu không đổi.
- **ID-005-AC-006:** Khách chưa xác thực bị từ chối search; route chi tiết ID-002 giữ nguyên quyền truy cập.

## Ngoài phạm vi

`getAllUsers` cho Admin, quản trị User, đổi/quên mật khẩu, tìm theo email/MSSV, danh bạ toàn bộ người dùng, học tập và Community. Không đổi route công khai của ID-002.

## Phụ thuộc

- [ID-002 Profile](../profile/spec.md), [ID-001 Authentication](../authentication/spec.md).
- [Kiến trúc Identity](../../../architecture/identity-service.md), [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md).
- [ID-006 Quản trị User](../user-management/spec.md) liên quan tới dấu xoá mềm; ID-005 không phụ thuộc việc ID-006 được triển khai trước.

## Câu hỏi mở

Không còn. User cũ chưa có Profile bị bỏ qua trong search, giống route xem hồ sơ công khai hiện tại; thao tác search không tạo Profile trễ.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-10-28 | 0.1 | Codex / chờ review | Tách tìm kiếm hồ sơ công khai khỏi API quản trị User. |
| 2026-10-28 | 1.0 | Chủ sở hữu sản phẩm | Chốt quyền search, quy tắc khớp tên, phân trang và User thiếu Profile; Approved. |
| 2026-10-28 | 1.1 | Chủ sở hữu sản phẩm | Cho phép tìm từ một ký tự đầu tiên; ví dụ `q=D` tìm được `Dũng Dương`; Approved theo yêu cầu trực tiếp. |
