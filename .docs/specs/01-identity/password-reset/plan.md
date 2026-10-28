# ID-007 Kế hoạch đặt lại mật khẩu BKPractice bằng OTP

## Trạng thái và đặc tả liên quan

Bản nháp theo [spec ID-007 0.1](./spec.md), hiện **Proposed**. Không triển khai tới khi câu hỏi mở được giải quyết và spec Approved.

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway route/giới hạn tần suất; Identity sở hữu OTP, credential/phiên.

## Ảnh hưởng mã hiện có

- Mở rộng `auth` bằng ba use case/route độc lập với Microsoft login và refresh.
- Tái dùng User lookup, Argon2 hasher, repository phiên; login đọc password hash mới sau reset.
- Gateway cho phép chính xác ba public route mới, giới hạn request và chuyển lỗi an toàn; không xử lý OTP.

## Domain và application

- Chính sách OTP/grant một lần, TTL, lượt thử và điều kiện User theo spec được duyệt.
- Send use case: tra email chuẩn hoá, tạo challenge, lưu state có hạn và gọi port gửi mail tới email đã lưu; phản hồi không xác nhận account tồn tại.
- Verify: kiểm tra OTP/lượt thử nguyên tử, cấp grant mờ. Reset: tiêu thụ grant, kiểm tra lại User, băm password, lưu credential/thu hồi phiên.
- Ports cho kho challenge/grant, gửi email, credential/phiên; application không import Graph/Redis/TypeORM/NestJS.

## Lưu trữ, cơ sở dữ liệu và migration

- Đề xuất Redis giữ OTP hash/lượt thử/grant hash với TTL; thao tác nguyên tử chống verify/reset đồng thời. Không lưu mã/token thô.
- TypeORM Identity cập nhật `users.password_hash`; credential và phiên cần transaction theo chính sách chốt. Không sửa email/role/Profile.
- Migration N/A nếu Redis tạm thời và schema hiện có đủ; chỉ thêm nếu review chứng minh cần, không bật `synchronize`.

## API, DTO và phân quyền

- `POST /api/auth/password/send-otp`, `POST /api/auth/password/verify-otp`, `POST /api/auth/password/reset` với DTO allowlist theo spec.
- Ba route public nhưng phải kiểm tra body, origin/rate limit, OTP/grant ở boundary phù hợp. Không tin role/status/email đích từ FE.
- Swagger mô tả response chung chống dò account, resetToken ở body verify, lỗi an toàn và reset `204`.

## Adapter hạ tầng và cấu hình dự kiến

- Graph `POST /users/{sender}/sendMail` từ mailbox trường; app-only token với `Mail.Send` sau khi được cấp. Có thể dùng MSAL đã cài nếu app contract được duyệt.
- Cần định danh mailbox và credential/app permission. Tên biến, phạm vi mailbox, OTP/rate/TTL cần chốt; chỉ ghi `.env.example`, không ghi secret thật.
- Redis namespace riêng cho reset, không tái dùng OAuth login code.

## Messaging, realtime và xử lý lỗi

N/A — không queue/realtime. Adapter Graph/Redis/DB ánh xạ lỗi không tiết lộ account; retry mail theo chính sách gửi lại.

## Bảo mật, kiểm thử và quan sát

- Test chống dò account, brute force/replay/race, Origin, trạng thái User, Argon2/phiên bằng mock mailbox/secret.
- Unit use case/adapter giả; Redis/PostgreSQL integration; API/Gateway ba route và redaction; Graph staging chỉ khi tenant/mailbox được cấp.
- Log request ID và mã kết quả tổng hợp; không log email thô, OTP, reset token, password hoặc Graph auth.

## Thứ tự triển khai sau Approved

1. Chốt câu hỏi spec, quyền Graph/cấu hình; review/Approved spec và cập nhật plan/tasks.
2. Thêm domain/application, Redis/Graph/TypeORM adapter và AuthModule.
3. Thêm DTO/controller/Gateway/Swagger, test, pnpm gates, đối chiếu FR/AC.

## Rủi ro và tuân thủ kiến trúc

App `Mail.Send` rộng hoặc lỗi Graph khác nhau theo email có thể lộ dữ liệu. Phạm vi mailbox, phản hồi chung/rate limit cần duyệt. Presentation xử lý HTTP; application giữ luồng reset; infrastructure giữ Redis/Graph/TypeORM; Identity không đổi mật khẩu Entra hay DB service khác.
