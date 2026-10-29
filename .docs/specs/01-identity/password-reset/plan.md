# ID-007 Kế hoạch đặt lại mật khẩu BKPractice bằng OTP

## Trạng thái và đặc tả liên quan

Bản sửa đổi kế hoạch 1.1 theo [spec ID-007 1.1](./spec.md) đang **Proposed**, chờ review/phê duyệt; kế hoạch 1.0 đã review là nền của code Redis hiện tại. Chưa thay code theo bản này. Hộp thư và quyền Graph vẫn phải được cấp/kiểm chứng trước khi chạy luồng gửi thật.

## Service đích và kiến trúc

Identity Service — **Clean Architecture**, theo [kiến trúc Identity](../../../architecture/identity-service.md) và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md). Gateway route/giới hạn tần suất; Identity sở hữu OTP, credential/phiên.

## Ảnh hưởng mã hiện có

- Giữ ba use case/route `auth` và User lookup, Argon2 hasher, repository phiên đã có; thay đúng kho trạng thái reset và ranh giới transaction reset.
- Giữ Gateway allowlist/throttling/Origin và contract HTTP hiện có; Gateway không xử lý OTP.

## Domain và application

- OTP 6 chữ số/hạn 5 phút, tối đa 5 lần thử sai, gửi lại sau 60 giây và vô hiệu OTP cũ; reset grant mờ/hạn 5 phút/một lần. Chỉ User ACTIVE có STUDENT/LECTURER, không có ADMIN/system/dấu xoá mềm, được reset.
- Send use case: tra email chuẩn hoá, tạo challenge, lưu state có hạn và gọi port gửi mail tới email đã lưu; phản hồi không xác nhận account tồn tại.
- Verify: kiểm tra OTP/lượt thử nguyên tử, tiêu thụ OTP và cấp grant mờ. Reset: tiêu thụ grant, kiểm tra lại User, kiểm tra password 8–128 ký tự/khác password cũ, băm và lưu credential, thu hồi mọi phiên.
- Ports cho kho challenge/grant, gửi email, credential/phiên; application không import Graph/TypeORM/NestJS. Đổi ranh giới reset để tiêu thụ grant cùng cập nhật credential/phiên trong một transaction Identity.

## Lưu trữ, cơ sở dữ liệu và migration

- Tạo TypeORM migration và entity thuộc `auth` trong `bkpractice_identity` cho challenge theo User/email chuẩn hoá và grant. Challenge giữ HMAC của email chuẩn hoá cùng OTP, thời điểm hết hạn, thời điểm được gửi tiếp, số lần sai; grant giữ hash của resetToken, User và thời điểm hết hạn. Không lưu OTP/resetToken thô; khoá/unique constraint và chỉ mục hỗ trợ một OTP hiện hành trên mỗi User, lookup grant và dọn bản ghi hết hạn.
- `send-otp`: kiểm tra trạng thái DB trước khi tra account, khoá User/challenge trong transaction (kể cả khi chưa có challenge), từ chối gửi lại trước 60 giây, thay HMAC và reset số lần sai khi được gửi lại. `verify-otp`: khoá challenge, kiểm tra email/User/HMAC/thời hạn/lượt thử, tăng lượt sai hoặc tiêu thụ OTP và tạo grant trong cùng transaction. Kiểm tra thời hạn tại mỗi lần đọc, không dựa vào việc dọn bảng để hết hiệu lực.
- `reset`: khoá grant và User; kiểm tra grant còn hạn/chưa dùng, điều kiện User và mật khẩu mới; tiêu thụ grant, cập nhật `users.password_hash` bằng Argon2, thu hồi session/refresh token trong **cùng transaction**. Chỉ một request đồng thời được thành công; lỗi DB rollback toàn bộ. Giữ các grant đã cấp độc lập với OTP gửi sau để không đổi hành vi hiện tại.
- Đăng ký entity mới trong datasource Identity; bỏ `RedisPasswordResetStore` khỏi wiring reset. Redis của OAuth/Gateway vẫn giữ theo các feature khác; không sửa schema/service ngoài Identity và không bật `synchronize`.

## API, DTO và phân quyền

- `POST /api/auth/password/send-otp`, `POST /api/auth/password/verify-otp`, `POST /api/auth/password/reset` với DTO allowlist theo spec.
- Ba route public nhưng kiểm tra body, Origin và giới hạn tần suất ở boundary phù hợp. OTP sai/hết hạn/vượt lượt thử trả cùng lỗi 400; request gửi mail trả 202 chung, kể cả không có account hoặc Graph lỗi. Không tin role/status/email đích từ FE.
- Swagger mô tả response chung chống dò account, resetToken ở body verify, lỗi an toàn và reset `204`.

## Adapter hạ tầng và cấu hình dự kiến

- Graph `POST /users/{sender}/sendMail` từ mailbox trường; app-only token với `Mail.Send` được giới hạn tới mailbox gửi. Tái dùng MSAL và app registration Microsoft hiện có nếu trường cấp scope này; không thêm dependency chỉ cho một HTTP call.
- Giữ `MICROSOFT_MAIL_SENDER` trong `.env.example` để định danh mailbox gửi và các biến `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` hiện có. Không ghi giá trị bí mật. Cần xác nhận quyền/hộp thư thực tế trước smoke test.
- Không dùng namespace Redis cho reset; `REDIS_URL`/`AUTH_FLOW_STORE` vẫn phục vụ OAuth và các luồng khác, không đổi cấu hình của chúng trong bản sửa đổi này.

## Messaging, realtime và xử lý lỗi

N/A — không queue/realtime. Graph lỗi ghi nhận an toàn và endpoint send vẫn trả 202 chung; lỗi PostgreSQL trả dependency failure chung, không phân biệt email có account. Gửi lại sau ít nhất 60 giây và vô hiệu OTP cũ. Lỗi Redis của Gateway/OAuth không đổi.

## Bảo mật, kiểm thử và quan sát

- Test chống dò account, brute force/replay/race, Origin, trạng thái User, Argon2/phiên bằng mock mailbox/secret.
- Unit use case/adapter giả; PostgreSQL integration với migration run/revert trên DB test, TTL, lượt thử, gửi lại, race và rollback reset/grant/phiên; API/Gateway ba route và redaction, bao gồm AC-008/AC-009. Kiểm tra ba route trực tiếp tại Identity khi Redis không kết nối; Graph staging chỉ khi tenant/mailbox được cấp.
- Log request ID và mã kết quả tổng hợp; không log email thô, OTP, reset token, password hoặc Graph auth.

## Thứ tự triển khai sau Approved

1. Chờ review/phê duyệt spec 1.1 và kế hoạch này; đối chiếu ID-004, kiểm tra worktree và xác nhận điều kiện mailbox/quyền Graph.
2. Tạo migration/entity challenge và grant trong Identity, thay Redis adapter bằng TypeORM adapter; cập nhật port/use case và wiring để tiêu thụ grant cùng transaction reset.
3. Bổ sung integration/race/rollback test, kiểm tra API hiện có, chạy pnpm gates và smoke test trực tiếp Identity khi Redis không kết nối; giữ nguyên contract Swagger/Gateway nếu kết quả đối chiếu không yêu cầu sửa.

## Rủi ro và tuân thủ kiến trúc

App `Mail.Send` rộng hoặc lỗi Graph khác nhau theo email có thể lộ dữ liệu. Giới hạn quyền tới mailbox gửi và response 202 chung; kiểm chứng scope với trường trước smoke test. PostgreSQL lưu trạng thái ngắn hạn nên phải kiểm tra hạn ở mọi thao tác và dọn bản ghi hết hạn; HMAC OTP dùng secret ngoài DB để hạn chế dò ngoại tuyến mã 6 số nếu chỉ lộ DB. Presentation xử lý HTTP; application giữ luồng reset; infrastructure giữ Graph/TypeORM. Thay kho reset không loại bỏ phụ thuộc Redis của OAuth/Gateway và không đổi mật khẩu Entra hay DB service khác.
