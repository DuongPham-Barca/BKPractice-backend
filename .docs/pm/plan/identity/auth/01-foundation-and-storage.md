# ID-001 / 1 — Nền tảng, domain và lưu trữ

- Nguồn: [spec](../../../../../specs/01-identity/authentication/spec.md), [plan](../../../../../specs/01-identity/authentication/plan.md), [tasks](../../../../../specs/01-identity/authentication/tasks.md).
- Task: ID-001-T001–T014, trừ adapter Microsoft/Redis được triển khai ở [phần 3](03-microsoft-login.md).
- Đầu vào: trạng thái Approved của ID-001 1.1, schema Identity hiện có và contract cấp tài khoản đã được xác nhận; chưa thực hiện import Excel trong phần này.

## Trình tự thực hiện

1. Khảo sát Git/code, Auth/User/RBAC, Gateway, datasource và migration. Cập nhật contract claim kỹ thuật, cấu hình Microsoft/Redis/throttling đã duyệt và phụ thuộc MSAL theo T001–T002; không đưa bí mật vào repo.
2. Tạo phép chiếu tài khoản, định danh Microsoft, họ refresh, lỗi độc lập với framework và đúng bảy port trong plan. Kiểm thử các bất biến `ACTIVE`, tính duy nhất và cách ly họ phiên theo T003–T004.
3. Mở rộng model lưu trữ User, RefreshToken; thêm model liên kết Microsoft và registry entity. Hiện thực ba adapter TypeORM cho tài khoản, liên kết và refresh theo T005–T010. Bản băm mật khẩu chỉ được đọc cho đăng nhập cục bộ; token thô/nhà cung cấp không được lưu.
4. Viết migration Identity **mới** `AddStudentMicrosoftAuthentication`: kiểm tra email trùng không phân biệt hoa thường, thêm MSSV/index duy nhất, liên kết Microsoft và metadata họ refresh, điền bù riêng từng họ. Giữ migration nền tảng. Thêm test migration/repository theo T011–T012.
5. Đặt Argon2 và JWT sau các port ở infrastructure/security theo T013–T014; access token theo bản 1.1 có claim quyền hiệu lực khi [phần claim](05-permission-claim.md) được nối dây.

## Bàn giao và kiểm chứng

Kiểm chứng ràng buộc duy nhất, mapping TypeORM, transaction liên kết/xoay vòng và run/revert/run **trên database test cách ly**. Phần `down` của migration có thể làm mất metadata/liên kết nên không chạy trên dữ liệu đang dùng. Chưa đổi route công khai hoặc gỡ `AuthService` ở phần này.
