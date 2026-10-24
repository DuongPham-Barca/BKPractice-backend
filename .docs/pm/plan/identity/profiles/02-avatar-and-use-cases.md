# ID-002 / 2 — Avatar R2 và các use case Profile

- Nguồn: [spec](../../../../specs/01-identity/profile/spec.md), [plan](../../../../specs/01-identity/profile/plan.md), [tasks](../../../../specs/01-identity/profile/tasks.md).
- Task: ID-002-T015–T024; phụ thuộc [domain/repository](01-domain-and-storage.md) và ngữ cảnh principal tin cậy từ ID-001.

## Trình tự thực hiện

1. Xem lại phụ thuộc SDK đang có, chỉ thêm SDK R2 cần thiết nếu được plan cho phép. Bổ sung cấu hình `R2_*` bắt buộc vào phần kiểm tra Identity và placeholder trong `.env.example`, không ghi thông tin xác thực thật.
2. Adapter `AvatarStorage` tạo key do server sở hữu, presigned upload URL và signed GET URL ngắn hạn; kiểm chứng key thuộc đúng User/bucket/tiền tố và giới hạn kiểu/kích thước. Chỉ lưu key/tham chiếu ổn định vào cột hiện có, không lưu signed URL hoặc URL ngoài tuỳ ý.
3. `GetMyProfile` và `UpdateMyProfile` dùng user ID xác thực, khởi tạo trễ từ tên chính thức và áp dụng patch tường minh. `GetPublicProfile` chỉ đọc ba trường công khai, trả kết quả không khả dụng chung cho đích thiếu/`LOCKED`/`PENDING` mà không tạo Profile.
4. `AdminGetUserProfile`/`AdminUpdateUserProfile` chỉ cho Admin, dùng cùng allowlist nhưng không khởi tạo đích còn thiếu. `CreateAvatarUploadIntent` cấp URL/key mờ cho chủ sở hữu; sau khi cập nhật commit, lên lịch dọn avatar cũ bất đồng bộ với khoảng ân hạn cấu hình được.

## Bàn giao và kiểm chứng

Test R2 bằng adapter giả và integration phù hợp: key sai chủ sở hữu/URL ngoài bị từ chối; lỗi R2 không để tham chiếu treo; lỗi cleanup không hoàn tác cập nhật đã commit. Test chủ sở hữu/Admin, `null` so với trường bỏ qua, tính idempotent và kết quả công khai tối thiểu. Không tạo event RabbitMQ hoặc realtime mới chỉ cho cleanup.
