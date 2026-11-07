# LRN-008 — Kế hoạch chuyển Learning sang tự học

## Trạng thái

Approved theo [spec.md](./spec.md), ngày 2026-11-07. Learning tiếp tục theo DDD + Hexagonal Architecture trong [kiến trúc Learning](../../../architecture/learning-service.md).

## Thực hiện

1. Đổi các policy quản lý Problem/Course sang `ADMIN` cộng quyền tương ứng; bỏ điều kiện người tạo trong use case, port và repository. Giữ `created_by` để audit.
2. Điều chỉnh chính sách gắn Problem vào Course để mọi ADMIN có thể dùng Problem nháp/tạm giữ của nhau; giữ điều kiện hiển thị công khai.
3. Bỏ entity Class/Enrollment/Assignment khỏi composition root; bỏ checker tham chiếu Class/Assignment của Course. Tạo migration mới để gỡ các bảng cũ, giữ nguyên migration lịch sử.
4. Gỡ các route Class/Assignment và tiến độ theo lớp khỏi Gateway. Giữ route tiến độ cá nhân và gợi ý.
5. Chuyển danh mục quyền Learning của Identity sang ADMIN; bỏ các quyền class/assignment. Không xoá vai trò nền tảng `LECTURER`.
6. Đồng bộ spec/plan/tasks LRN-001/002/003/006/007, tài liệu kiến trúc và vận hành; lưu các tài liệu LRN-004/005 như lịch sử đã huỷ với chỉ dẫn tới LRN-008.
7. Sửa test theo hợp đồng ADMIN, thêm ca quản lý chéo ADMIN và bảo vệ STUDENT/LECTURER; chạy lint, typecheck, test, build. Không chạy migration trên CSDL thật trong đợt này.

## Rủi ro và triển khai

Migration gỡ Class, Enrollment và Assignment sẽ xoá dữ liệu trong các bảng này khi được chạy. Đợt code chỉ tạo migration, không áp dụng lên môi trường có dữ liệu. Khi triển khai cần sao lưu và kiểm tra dữ liệu cũ trước khi chạy migration.
