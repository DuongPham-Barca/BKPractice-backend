# ID-007 Kế hoạch đặt lại mật khẩu BKPractice bằng OTP

## Trạng thái và đặc tả liên quan

Bản sửa đổi kế hoạch 1.4 theo [spec ID-007 1.4](./spec.md) **Approved**, được chủ sở hữu yêu cầu cấu hình tên hiển thị Brevo ngày 2026-10-29. Phần PostgreSQL của 1.1 và Brevo API adapter của 1.3 giữ nguyên.

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway route/giới hạn tần suất; Identity sở hữu OTP, credential/phiên.

## Ảnh hưởng mã hiện có

- Giữ ba use case/route `auth`, User lookup, Argon2 hasher, kho PostgreSQL và transaction reset đã có; thay Graph mail adapter dành riêng cho OTP bằng Brevo API adapter.
- Giữ Gateway allowlist/throttling/Origin và contract HTTP hiện có; Gateway không xử lý OTP.

## Domain và application

- OTP 6 chữ số/hạn 5 phút, tối đa 5 lần thử sai, gửi lại sau 60 giây và vô hiệu OTP cũ; reset grant mờ/hạn 5 phút/một lần. Chỉ User ACTIVE có STUDENT/LECTURER, không có ADMIN/system/dấu xoá mềm, được reset.
- Send use case: tra email chuẩn hoá, tạo challenge, lưu state có hạn và gọi port gửi mail tới email đã lưu; phản hồi không xác nhận account tồn tại.
- Verify: kiểm tra OTP/lượt thử nguyên tử, tiêu thụ OTP và cấp grant mờ. Reset: tiêu thụ grant, kiểm tra lại User, kiểm tra password 8–128 ký tự/khác password cũ, băm và lưu credential, thu hồi mọi phiên.
- Giữ ports cho kho challenge/grant, gửi email, credential/phiên; application không import Brevo/TypeORM/NestJS. Adapter Brevo hiện thực `PasswordResetMailer` hiện có, không đổi contract use case.

## Lưu trữ, cơ sở dữ liệu và migration

- Tạo TypeORM migration và entity thuộc `auth` trong `bkpractice_identity` cho challenge theo User/email chuẩn hoá và grant. Challenge giữ HMAC của email chuẩn hoá cùng OTP, thời điểm hết hạn, thời điểm được gửi tiếp, số lần sai; grant giữ hash của resetToken, User và thời điểm hết hạn. Không lưu OTP/resetToken thô; khoá/unique constraint và chỉ mục hỗ trợ một OTP hiện hành trên mỗi User, lookup grant và dọn bản ghi hết hạn.
- `send-otp`: kiểm tra trạng thái DB trước khi tra account, khoá User/challenge trong transaction (kể cả khi chưa có challenge), từ chối gửi lại trước 60 giây, thay HMAC và reset số lần sai khi được gửi lại. `verify-otp`: khoá challenge, kiểm tra email/User/HMAC/thời hạn/lượt thử, tăng lượt sai hoặc tiêu thụ OTP và tạo grant trong cùng transaction. Kiểm tra thời hạn tại mỗi lần đọc, không dựa vào việc dọn bảng để hết hiệu lực.
- `reset`: khoá grant và User; kiểm tra grant còn hạn/chưa dùng, điều kiện User và mật khẩu mới; tiêu thụ grant, cập nhật `users.password_hash` bằng Argon2, thu hồi session/refresh token trong **cùng transaction**. Chỉ một request đồng thời được thành công; lỗi DB rollback toàn bộ. Giữ các grant đã cấp độc lập với OTP gửi sau để không đổi hành vi hiện tại.
- Đăng ký entity mới trong datasource Identity; bỏ `RedisPasswordResetStore` khỏi wiring reset. Redis của OAuth/Gateway vẫn giữ theo các feature khác; không sửa schema/service ngoài Identity và không bật `synchronize`.

## API, DTO và phân quyền

- `POST /api/auth/password/send-otp`, `POST /api/auth/password/verify-otp`, `POST /api/auth/password/reset` với DTO allowlist theo spec.
- Ba route public nhưng kiểm tra body, Origin và giới hạn tần suất ở boundary phù hợp. OTP sai/hết hạn/vượt lượt thử trả cùng lỗi 400; request gửi mail trả 202 chung, kể cả không có account hoặc Brevo lỗi. Không tin role/status/email đích từ FE.
- Swagger mô tả response chung chống dò account, resetToken ở body verify, lỗi an toàn và reset `204`.

## Adapter hạ tầng và cấu hình dự kiến

- Brevo adapter trong `auth/infrastructure` gọi `POST https://api.brevo.com/v3/smtp/email` qua `fetch` Node, header `api-key`, payload sender/to/subject/textContent; chỉ chấp nhận HTTP `201`. Timeout 10 giây. Đặt `sender.name` từ `BREVO_SENDER_NAME`, mặc định `BKPractice`; `sender.email` giữ từ `BREVO_SENDER_EMAIL` đã xác minh.
- Giữ `BREVO_API_KEY` (bí mật) và `BREVO_SENDER_EMAIL` (địa chỉ gửi đã xác minh), bắt buộc trong production; thêm `BREVO_SENDER_NAME` vào `.env.example` và validation để người vận hành đổi tên hiển thị. Cấu hình thật giữ ngoài Git. Giữ các biến Microsoft cho đăng nhập ID-001.
- Người vận hành tạo API key, xác minh sender trong Brevo và thử gửi tự động tới email trường trước khi xác nhận AC-001 ngoài môi trường test.
- Không dùng namespace Redis cho reset; `REDIS_URL`/`AUTH_FLOW_STORE` vẫn phục vụ OAuth và các luồng khác, không đổi cấu hình của chúng trong bản sửa đổi này.

## Messaging, realtime và xử lý lỗi

N/A — không queue/realtime. Brevo lỗi được ghi nhận an toàn và endpoint send vẫn trả 202 chung; lỗi PostgreSQL trả dependency failure chung, không phân biệt email có account. Gửi lại sau ít nhất 60 giây và vô hiệu OTP cũ. Lỗi Redis của Gateway/OAuth không đổi.

## Bảo mật, kiểm thử và quan sát

- Test chống dò account, brute force/replay/race, Origin, trạng thái User, Argon2/phiên bằng mock mailbox/secret.
- Unit use case/adapter giả; PostgreSQL integration còn mở từ 1.1 với migration run/revert trên DB test, TTL, lượt thử, gửi lại, race và rollback reset/grant/phiên. Giữ API/Gateway ba route và redaction, bao gồm AC-008/AC-009; kiểm tra ba route trực tiếp tại Identity khi Redis không kết nối. Mock `fetch` cho adapter, rồi smoke Brevo thật tới email trường sau khi có API key/sender.
- Test payload Brevo chứa tên hiển thị cấu hình và địa chỉ sender đã xác minh riêng biệt; kiểm tra mặc định `BKPractice` và giá trị tên rỗng không được chấp nhận.
- Chỉ log mã HTTP hoặc giai đoạn lỗi, không log email thô, OTP, reset token, password, API key hay nội dung response của Brevo. HTTP 201 chỉ chứng minh Brevo nhận request, chưa chứng minh thư tới Inbox; kiểm tra trạng thái giao thư/Junk ở bên nhận.

## Thứ tự triển khai sau Approved

1. Đối chiếu spec 1.3 Approved với code, xác định port/wiring và cấu hình OTP hiện có.
2. Thay Graph mail adapter/wiring reset bằng Brevo API adapter; cập nhật template và validation biến cấu hình OTP, giữ MSAL/Microsoft OAuth của ID-001.
3. Test API lỗi/thành công, giữ response 202 chống dò account, chạy các gate và smoke gửi thật khi có cấu hình; hoàn tất các kiểm chứng PostgreSQL còn mở từ 1.1 trên DB test cách ly.

## Rủi ro và tuân thủ kiến trúc

Email trường có thể lọc thư ngoài; phải thử nhận thật, giữ response 202 chung và kiểm tra trạng thái giao thư an toàn. API key là bí mật vận hành, chỉ đặt trong môi trường chạy và không ghi vào repo/log. PostgreSQL lưu trạng thái ngắn hạn nên phải kiểm tra hạn ở mọi thao tác và dọn bản ghi hết hạn; HMAC OTP dùng secret ngoài DB để hạn chế dò ngoại tuyến mã 6 số nếu chỉ lộ DB. Presentation xử lý HTTP; application giữ luồng reset; infrastructure giữ Brevo/TypeORM. Thay mail adapter không loại bỏ phụ thuộc Redis của OAuth/Gateway và không đổi mật khẩu Entra hay DB service khác.
