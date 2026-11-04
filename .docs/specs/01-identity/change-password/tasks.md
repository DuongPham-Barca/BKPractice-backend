# ID-008 Công việc đổi mật khẩu khi đã đăng nhập

Đặc tả: [spec.md](./spec.md) (1.0 Approved)  
Kế hoạch: [plan.md](./plan.md) (Approved)

## Trước khi triển khai

- [x] Chủ sở hữu phê duyệt spec và chốt giữ phiên hiện tại, thu hồi phiên khác; thao tác chỉ đổi account của chính principal.
- [x] Đối chiếu `auth` hiện tại, User credential, Argon2, auth principal, session store và Gateway route.
- [x] Xác nhận plan khớp spec 1.0 Approved và giới hạn thay đổi trong Identity.

## Triển khai

- [ ] Thêm use case đổi password và chỉ các port cần thiết.
- [ ] Tái dùng adapter persistence/password hasher; bảo đảm cập nhật credential và revoke phiên khác nguyên tử.
- [ ] Thêm DTO/controller/route được bảo vệ và mapping lỗi theo spec.
- [x] N/A — Gateway đã bảo vệ mọi route `/api/auth` không nằm trong public allowlist; route mới không cần thay đổi service Gateway.
- [ ] Thêm migration chỉ khi contract đã Approved yêu cầu thay đổi schema.

## Kiểm chứng

- [ ] Test xác thực principal, password hiện tại đúng/sai, min/max, same-password, ký tự Unicode/khoảng trắng.
- [ ] Test login bằng password mới và từ chối password cũ sau khi đổi.
- [ ] Test role/account đủ điều kiện, lỗi storage và request đồng thời.
- [ ] Test session policy đã được phê duyệt; xác nhận không có token/password/hash trong response/log.
- [ ] Chạy các script `pnpm` áp dụng từ Definition of Done sau khi code được triển khai.
- [ ] Đối chiếu mọi FR/AC, kiến trúc và ghi kết quả trong worked entry sau khi hoàn tất implementation.
