# ID-008 Kế hoạch đổi mật khẩu khi đã đăng nhập

## Trạng thái

Approved — kế hoạch triển khai ID-008 theo spec 1.0 Approved ngày `2026-11-04`.

## Đặc tả liên quan

- [ID-008 Change password](./spec.md), phiên bản 1.0 Approved ngày `2026-11-04`.
- Plan này chỉ phân rã các yêu cầu ID-008 đã Approved.

## Service đích

Service: Identity. API Gateway chỉ xác minh principal và route request.

## Kiến trúc service bắt buộc

Kiến trúc: Clean Architecture (Identity), theo [identity-service.md](../../../architecture/identity-service.md)
và [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md).

Chiều phụ thuộc: `presentation → application → domain`; infrastructure hiện thực các port cần cho
credential, hashing và transaction.

## Ảnh hưởng tới mã nguồn hiện có

- Tái dùng module `auth`, User credential hiện có, Argon2 và principal đã xác minh.
- Thêm một thao tác authenticated; không sửa các endpoint login, Microsoft login hay password reset.
- Route `/api/auth/password/change` nằm dưới middleware auth/proxy `/api/auth` hiện có; route không
  thuộc public allowlist nên Gateway tự yêu cầu access token. Không sửa Gateway hay service khác.

## Thay đổi ở tầng domain

- Thực thi điều kiện credential hiện tại hợp lệ, mật khẩu mới 8–128 ký tự và khác credential đang
  lưu.
- Người dùng của mọi role, kể cả ADMIN, chỉ đổi account của principal hiện tại; không nhận user ID
  mục tiêu từ client.

## Tầng application / Use case

- Một use case đổi credential nhận `userId` từ principal đã xác minh cùng `currentPassword` và
  `newPassword`.
- Nạp credential của đúng user, xác minh password hiện tại, băm password mới qua port hasher; yêu
  cầu persistence cập nhật credential và thu hồi mọi session family trừ family hiện tại trong cùng
  transaction.
- Không nhận user ID đích từ request body. Không đưa Argon2, TypeORM hoặc HTTP vào use case.

## Lưu trữ, cơ sở dữ liệu và migration

- Tái dùng cột `users.password_hash`, bảng `sessions` và `refresh_tokens`; không cần schema change hay
  migration.
- Transaction khóa User, kiểm tra hash đã xác minh và session hiện tại còn active, cập nhật hash,
  thu hồi các session family khác cùng refresh-token records; để nguyên current family.

## API và DTO

- Route đề xuất: `POST /api/auth/password/change`, yêu cầu access token BKPractice.
- Request dự thảo: `{ currentPassword, newPassword }`; success `204`; lỗi được ánh xạ theo contract
  hiện có và không làm lộ credential.
- DTO từ chối trường ngoài allowlist, đặc biệt `userId`; Swagger mô tả auth, body, policy và errors.
- Với web cookie, Gateway hiện kiểm tra Origin/CSRF trên unsafe methods rồi chuyển token thành
  Bearer; Identity controller cũng kiểm tra Origin/CSRF cho direct cookie requests. Mobile/Bearer
  không dùng cookie.

## Phân quyền và bảo mật

- Đọc User ID từ principal do Gateway/Identity xác minh.
- Dựa vào access token/session verification hiện có; không thêm gateway/service mới hoặc lưu password
  thô trong log.
- Password giữ nguyên chuỗi nhập; không lưu/ghi log password thô; chỉ dùng Argon2 đã có.
- Chỉ cập nhật hash sau khi xác minh mật khẩu hiện tại thành công; thao tác lưu phải nguyên tử.

## Chiến lược kiểm thử

- Unit: password đúng/sai, policy min/max, Unicode/khoảng trắng, same-password, account không có
  credential và lỗi repository.
- API/Gateway: xác thực bắt buộc, body allowlist, không nhận user ID mục tiêu, lỗi không rò bí mật.
- Integration/unit adapter: credential đổi nguyên tử; current family còn active, family khác bị
  revoke và không thể refresh.
- HTTP tests: authentication, Origin/CSRF cho cookie request, body allowlist, response 204.

## Thứ tự triển khai sau khi spec Approved

1. Tái dùng Identity Auth account repository, Argon2 hasher, access claims và session tables.
2. Thêm use case xác minh credential, policy password và hash mới.
3. Cập nhật account persistence transaction để lưu hash mới và revoke sessions khác, giữ session hiện tại.
4. Thêm route/controller/DTO/Swagger trong Identity Auth và test use case, HTTP, transaction behavior.

## Rủi ro

- Cập nhật credential đồng thời có thể làm một request xác minh trên hash cũ nhưng ghi đè một hash
  mới hơn; transaction/điều kiện cập nhật phải bảo toàn kết quả nhất quán.
- Session revocation và credential write phải nguyên tử; refresh/login race phải không thể ghi đè
  credential đã đổi.

## Tuân thủ kiến trúc

Presentation nhận/validate request và principal; application điều phối xác minh, hashing, lưu; các
adapter Identity sở hữu persistence. Gateway không truy cập DB và không chứa policy đổi password.
