# ID-002 / 1 — Domain Profile và lưu trữ Identity

- Nguồn: [spec](../../../../specs/01-identity/profile/spec.md), [plan](../../../../specs/01-identity/profile/plan.md), [tasks](../../../../specs/01-identity/profile/tasks.md).
- Task: ID-002-T001–T014; phụ thuộc ranh giới định danh/tên chính thức do ID-001 và quy trình cấp tài khoản cung cấp.

## Trình tự thực hiện

1. Xác nhận spec/plan Approved, dữ liệu `users`/`profiles`, ngữ cảnh auth của ID-001, proxy Gateway và nguồn tên chính thức. Nếu tên chính thức chưa được cung cấp, ghi rõ điều kiện tiên quyết; không dùng tên mặc định tự đặt.
2. Tạo model Profile thuần với `displayName` không rỗng ≤100, `bio` ≤1.000, Unicode giữ nguyên sau khi cắt khoảng trắng; patch phân biệt trường bỏ qua với `null` hợp lệ. Chỉ ba trường Profile được ghi; test các bất biến.
3. Giữ entity TypeORM Profile hiện có là model lưu trữ. Tạo các port hẹp `ProfileRepository`, `IdentityProfileContext`, `AvatarStorage`; adapter TypeORM sở hữu mapping/query/transaction. Khởi tạo trễ khi chủ sở hữu đọc hoặc cập nhật lần đầu bằng `INSERT ... ON CONFLICT` hoặc transaction tương đương; hai request đồng thời hội tụ về một dòng.
4. Tạo migration Identity mới `AddProfileValidationConstraints`: kiểm tra dữ liệu cũ, thêm check cho bio/display name; giữ unique `profiles.user_id`, FK User và cột vật lý `avatar_url`. Không sửa migration nền tảng hoặc âm thầm chuyển URL avatar cũ.

## Bàn giao và kiểm chứng

Test domain, unique/đồng thời, migration run/revert/run trên database test cách ly, bước kiểm tra dữ liệu cũ và mapping key avatar. Phần đọc công khai không tạo Profile; Admin không tạo vòng đời khởi tạo mới. Không thêm dữ liệu lớp, tiến độ, bài nộp hoặc Community vào Identity.
