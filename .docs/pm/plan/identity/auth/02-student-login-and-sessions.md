# ID-001 / 2 — Đăng nhập sinh viên và vòng đời phiên

- Nguồn: [spec](../../../../specs/01-identity/authentication/spec.md), [plan](../../../../specs/01-identity/authentication/plan.md), [tasks](../../../../specs/01-identity/authentication/tasks.md).
- Task: ID-001-T018, T022–T024; dùng nền tảng T003–T014 của [phần 1](01-foundation-and-storage.md).

## Trình tự thực hiện

1. `LoginWithStudentId` nhận MSSV đã cắt khoảng trắng và mật khẩu nguyên vẹn; nạp tài khoản đã được cấp, kiểm tra Argon2, trả cùng lỗi chung cho MSSV thiếu và mật khẩu sai. Từ chối `LOCKED/PENDING`, dùng hash giả theo plan cho trường hợp MSSV không có, rồi tạo **một họ refresh mới** và cặp token cho tài khoản `ACTIVE`.
2. `RefreshSession` xác minh loại/chữ ký/thời hạn/claim, đối chiếu bản băm đã lưu và trạng thái hiện tại. Xoay vòng trong transaction để hai request đồng thời có nhiều nhất một request thành công; dùng lại token đã tiêu thụ chỉ thu hồi họ tương ứng.
3. `LogoutCurrentSession` đối chiếu chủ thể access token với refresh token và thu hồi họ hiện tại; giữ kết quả idempotent, không ảnh hưởng họ ở thiết bị khác. `GetCurrentAuthenticatedUser` trả đúng `userId`, `studentId`, `roles`, `status`.
4. Phần phát hành access token đọc quyền hiệu lực theo [phần 5](05-permission-claim.md) khi reader RBAC sẵn sàng; refresh token không mang quyền.

## Bàn giao và kiểm chứng

Test đăng nhập đúng/sai, trạng thái tài khoản, mật khẩu Unicode/khoảng trắng, hai phiên độc lập, refresh đồng thời/dùng lại, logout lặp và `/me` tối thiểu. Không thêm đăng ký công khai, bắt đổi mật khẩu lần đầu, danh sách đen access token hoặc luồng cấp tài khoản.
