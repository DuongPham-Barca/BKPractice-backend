# ID-005 Tìm kiếm hồ sơ công khai

## Trạng thái

Proposed — bản nháp 0.1 ngày 2026-10-28. Chưa được phê duyệt để triển khai.

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
- **ID-005-FR-005 — Giới hạn truy vấn:** API MUST kiểm tra chuỗi tìm kiếm, giới hạn kích thước trang, trả thứ tự ổn định và hỗ trợ trang tiếp theo. Không tải toàn bộ User/Profile về FE để lọc.
- **ID-005-FR-006 — Tương thích:** Chọn kết quả MUST tiếp tục dùng `GET /api/users/:userId/profile`; không tạo thêm route chi tiết trùng chức năng.

## Quy tắc phân quyền

Đề xuất: chỉ người dùng BKPractice có phiên hợp lệ được tìm kiếm; STUDENT và LECTURER nhận cùng biểu diễn công khai. Route xem hồ sơ ID-002 giữ chính sách hiện tại. Quyền tìm kiếm của khách chưa xác thực cần chốt trước Approved.

## Đầu vào và đầu ra

- Route đề xuất: `GET /api/profiles/search?q=<tên>&limit=<số>&cursor=<giá trị>`.
- `q` là tên cần tìm; không nhận role, status, email, MSSV hay quyền do client cung cấp làm bộ lọc tin cậy.
- Phản hồi là một trang `{ userId, displayName, avatar }` và thông tin lấy trang tiếp theo. Avatar theo chính sách URL ký ngắn hạn của ID-002.
- Hình dạng phân trang, độ dài `q`, cách khớp dấu tiếng Việt và thứ tự kết quả cần chốt.

## Tình huống lỗi và biên

- Truy vấn thiếu/sai định dạng hoặc vượt giới hạn trả lỗi kiểm tra dữ liệu, không chạy truy vấn không giới hạn.
- Không có kết quả trả danh sách rỗng; User không tồn tại, bị khoá hoặc chưa có Profile không hiện.
- Ký URL avatar thất bại theo chính sách lỗi ID-002, không lộ object key/bucket.
- Nếu Profile đổi tên hoặc User đổi trạng thái giữa lúc tìm và mở chi tiết, route chi tiết tự kiểm tra lại; kết quả tìm kiếm không đảm bảo hồ sơ còn khả dụng.

## Tiêu chí nghiệm thu

- **ID-005-AC-001:** STUDENT nhập tên trên FE, nhận trang kết quả và dùng `userId` để mở `GET /api/users/:userId/profile`.
- **ID-005-AC-002:** Profile có tên cá nhân hoá khác `User.displayName` được tìm bằng tên Profile.
- **ID-005-AC-003:** Kết quả không có email, MSSV, vai trò, quyền, trạng thái, bio hay credential; avatar là URL ngắn hạn đã duyệt.
- **ID-005-AC-004:** User `LOCKED`/`PENDING`, tài khoản hệ thống và User đã xoá mềm không xuất hiện.
- **ID-005-AC-005:** Truy vấn không hợp lệ bị từ chối; truy vấn không có kết quả trả trang rỗng; phân trang ổn định trong tập dữ liệu không đổi.
- **ID-005-AC-006:** Người không đủ quyền tìm kiếm bị từ chối theo chính sách đã duyệt, còn route chi tiết ID-002 giữ nguyên quyền truy cập.

## Ngoài phạm vi

`getAllUsers` cho Admin, quản trị User, đổi/quên mật khẩu, tìm theo email/MSSV, danh bạ toàn bộ người dùng, học tập và Community. Không đổi route công khai của ID-002.

## Phụ thuộc

- [ID-002 Profile](../profile/spec.md), [ID-001 Authentication](../authentication/spec.md).
- [Kiến trúc Identity](../../../architecture/identity-service.md), [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md).
- [ID-006 Quản trị User](../user-management/spec.md) liên quan tới dấu xoá mềm; ID-005 không phụ thuộc việc ID-006 được triển khai trước.

## Câu hỏi mở — chặn Approved

1. Search chỉ cho người đã đăng nhập như đề xuất, hay khách chưa xác thực cũng được dùng?
2. `q` khớp chuỗi con hay tiền tố, có bỏ dấu tiếng Việt không, tối thiểu/tối đa bao nhiêu ký tự?
3. Dùng `limit/cursor` hay `page/limit`, giới hạn trang, thứ tự và schema phản hồi chính xác là gì?
4. User cũ chưa có Profile được bỏ qua như route chi tiết hiện tại hay tạo Profile trễ trước khi trả kết quả?

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-10-28 | 0.1 | Codex / chờ review | Tách tìm kiếm hồ sơ công khai khỏi API quản trị User. |
