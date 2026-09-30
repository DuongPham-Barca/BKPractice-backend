# ID-001 Kế hoạch triển khai Authentication

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-01`.

## Đặc tả liên quan

- [ID-001 Authentication](./spec.md)
- Phiên bản đã Approved: `1.0`
- Ngày phê duyệt: `2026-09-01`

Kế hoạch này triển khai đặc tả đã Approved mà không thay đổi các yêu cầu của nó. Luồng import Excel
của quản trị viên và trang Đổi mật khẩu vẫn là các tính năng riêng.

## Service đích

Service: Identity

Tích hợp ở biên: các thay đổi ở API Gateway chỉ giới hạn trong định tuyến, xác minh access token,
metadata route công khai, chuyển tiếp redirect, và giới hạn tần suất riêng cho việc xác thực.
Gateway sẽ không chứa quy tắc nghiệp vụ về tài khoản, liên kết Microsoft hay phiên.

## Kiến trúc service bắt buộc

Kiến trúc: Clean Architecture (theo [ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md))

Tính năng Authentication tuân theo chiều phụ thuộc feature-first đã phê duyệt:

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application
```

Module nông hiện tại sẽ được căn chỉnh tiệm tiến vì ID-001 đưa vào luồng nghiệp vụ thật và các seam
hạ tầng thật. Các entity TypeORM hiện có vẫn là model lưu trữ; kế hoạch này không kích hoạt một cuộc
refactor Identity trên toàn repository.

## Ảnh hưởng tới mã nguồn hiện có

### Hiện trạng

- `AuthController` phơi bày đăng ký công khai, đăng nhập bằng email/mật khẩu, làm mới phiên và đăng
  xuất.
- `AuthService` trực tiếp điều phối TypeORM, transaction, Argon2, JWT và cấu hình.
- `User` có `email` duy nhất, bản băm mật khẩu, trạng thái, vai trò và hồ sơ, nhưng chưa có MSSV.
- `RefreshToken` lưu token ID, bản băm Argon2, user ID, thời hạn và thời điểm thu hồi, nhưng chưa có
  metadata về họ phiên.
- Chưa có liên kết định danh Microsoft, kho lưu state OAuth, cơ chế đổi mã đăng nhập, `/auth/me`,
  hay bộ test riêng cho Identity.
- Gateway xác minh access token BKPractice, loại bỏ header định danh của người gọi, và chuyển tiếp
  `/api/auth` tới Identity. Danh sách route công khai của nó vẫn chứa register và thiếu các route
  Microsoft.
- Gateway không đi theo redirect và hiện đang bỏ header `Location` của upstream.
- Cấu hình Identity chưa yêu cầu Redis hay các thiết lập Microsoft Entra.
- Argon2, JWT, TypeORM, ioredis, phần kiểm tra dữ liệu, Swagger và throttler toàn cục của Gateway
  đều đã có sẵn. `@azure/msal-node` thì chưa được cài.

### Phân loại thay đổi

| Phân loại | Cách xử lý dự kiến                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Lớp lưu trữ User/Profile/Role, các trạng thái tài khoản, Argon2, Nest JWT, datasource TypeORM, phần kiểm tra dữ liệu toàn cục, thư viện client Redis, proxy Gateway       |
| MODIFY    | Model lưu trữ User và refresh token, registry entity, module/controller/DTO của Auth, phần kiểm tra cấu hình, route công khai/proxy/throttling của Gateway                |
| CREATE    | Các use case và port của tầng application, adapter Microsoft, adapter luồng auth trên Redis, các adapter repository TypeORM, entity định danh ngoài, migration, test auth |
| REMOVE    | Handler/DTO đăng ký công khai và `AuthService` nguyên khối, sau khi hành vi thay thế đã được kiểm thử                                                                     |

Các bản ghi hiện có được bảo toàn. Tài khoản cũ không có MSSV vẫn nằm trong cơ sở dữ liệu nhưng
không thể dùng luồng đăng nhập sinh viên đã Approved cho tới khi quy trình cấp tài khoản riêng cung
cấp dữ liệu định danh hợp lệ.

## Thay đổi ở tầng domain

Chỉ đưa vào các khái niệm mà ID-001 yêu cầu:

- **AuthenticationAccount:** Phép chiếu độc lập với framework, chứa `userId`, `studentId`, email
  trường đã chuẩn hoá, `AccountStatus` và tên các vai trò. Một phép chiếu repository có kèm mật khẩu
  chỉ phơi bày `passwordHash` cho use case đăng nhập sinh viên.
- **AccountStatus:** Tái dùng `ACTIVE | LOCKED | PENDING`. Chỉ `ACTIVE` mới được phát hành token mới.
- **MicrosoftIdentity:** Liên kết giữa một người dùng do Identity sở hữu với nhà cung cấp
  `MICROSOFT`, cặp `tenantId + objectId` bất biến, và `preferred_username` đã chuẩn hoá được ghi
  nhận tại thời điểm liên kết.
- **RefreshSessionFamily:** Phiên đăng nhập độc lập, xác định bởi `familyId`. Việc xoay vòng vẫn nằm
  trong một họ; đăng xuất hoặc dùng lại chỉ thu hồi đúng họ đó.
- **Lỗi xác thực:** Các lỗi độc lập với framework cho thông tin đăng nhập không hợp lệ, tài khoản
  không hoạt động, định danh/state/mã của nhà cung cấp không hợp lệ, xung đột liên kết, thông tin
  refresh không hợp lệ, và truy cập chưa xác thực.

Các bất biến:

- MSSV và email trường đã chuẩn hoá mỗi cái phân giải về nhiều nhất một người dùng đã được cấp tài
  khoản.
- Một cặp `tenantId + objectId` của Microsoft liên kết tới một người dùng; một người dùng có nhiều
  nhất một liên kết Microsoft.
- Chỉ riêng việc thuộc nhà cung cấp không bao giờ tạo ra một người dùng.
- Mọi đường đăng nhập và làm mới phiên đều kiểm tra trạng thái tài khoản hiện tại trước khi phát
  hành token.
- Mật khẩu thô, refresh token, token Microsoft, mã uỷ quyền và client secret không bao giờ lọt vào
  kiểu trả về của tầng domain.
- Mật khẩu ban đầu dùng chung đã phê duyệt không tạo ra state `mustChangePassword` nào trong ID-001.

## Tầng application / Use case

### `LoginWithStudentId`

- Đầu vào: MSSV đã cắt khoảng trắng và mật khẩu giữ nguyên.
- Nạp phép chiếu tài khoản có kèm mật khẩu theo MSSV.
- Kiểm tra bằng `PasswordHasher`; MSSV không tồn tại và mật khẩu sai đều trả về cùng một lỗi chung.
- Dùng một bản băm Argon2 giả cố định cho MSSV không tồn tại để giảm chênh lệch thời gian phản hồi.
- Yêu cầu trạng thái `ACTIVE`, tạo một họ refresh mới, và trả về `userId + TokenPair`.

### `StartMicrosoftLogin`

- Không nhận định danh của người gọi và không nhận đích chuyển hướng tuỳ ý.
- Sinh state, nonce và cặp verifier/challenge của PKCE.
- Lưu giao dịch OAuth dùng một lần trong năm phút qua `AuthFlowStore`.
- Yêu cầu URL uỷ quyền single-tenant của trường qua `MicrosoftIdentityProvider` với scope
  `openid profile email`.
- Chỉ trả về URL uỷ quyền cho tầng Presentation để thực hiện redirect HTTP.

### `CompleteMicrosoftLogin`

- Đầu vào: mã uỷ quyền của nhà cung cấp, state, và các trường lỗi của nhà cung cấp.
- Tiêu thụ state OAuth đã lưu một cách nguyên tử; từ chối state bị thiếu, hết hạn hoặc đã dùng.
- Đổi mã lấy token cùng PKCE verifier của nó qua adapter Microsoft.
- Yêu cầu đúng tenant/audience client đã cấu hình, nonce, `preferred_username`, `tid` và `oid`.
- Phân giải liên kết đã có theo `tid + oid`; nếu chưa có thì đối sánh đúng một
  `preferred_username` đã chuẩn hoá với `emailTruong` và tạo liên kết một cách nguyên tử.
- Từ chối các tài khoản không khớp, khớp nhập nhằng, xung đột, hoặc không ở trạng thái `ACTIVE`, mà
  không tạo người dùng.
- Lưu một mã đăng nhập ngẫu nhiên dùng một lần chỉ ánh xạ tới `userId` trong 60 giây, và trả về URL
  chuyển hướng frontend cố định có chứa mã mờ đó.
- Huỷ bỏ mã uỷ quyền/token của Microsoft sau khi trích xuất các claim đã xác minh; không gọi
  Microsoft Graph.

### `ExchangeMicrosoftLoginCode`

- Đầu vào: `loginCode` dạng mờ.
- Tiêu thụ nó một cách nguyên tử; lần đổi thứ hai hoặc đổi muộn sẽ thất bại.
- Nạp lại trạng thái/vai trò, yêu cầu `ACTIVE`, tạo một họ refresh độc lập, và trả về
  `userId + TokenPair`.

### `RefreshSession`

- Kiểm chứng chữ ký, thời hạn, mục đích, `sub`, `jti` và `fid` của refresh token.
- Nạp token đã lưu theo `jti + userId`, kiểm tra bản băm Argon2 của nó, và kiểm tra trạng thái tài
  khoản.
- Dùng một transaction TypeORM cùng cập nhật có điều kiện hoặc khoá dòng để chỉ một lần xoay vòng
  thắng.
- Chèn bản thay thế vào cùng họ và trả về cặp token dạng JSON.
- Việc dùng lại một token đã tiêu thụ sẽ thu hồi họ đó và trả về lỗi refresh chung. Các `fid` khác
  không bị đụng tới.

### `LogoutCurrentSession`

- Đầu vào: user ID từ access token đã xác thực và refresh token được gửi lên.
- Kiểm chứng mục đích và quyền sở hữu của refresh token; token của người dùng khác không thể thu hồi
  phiên của người dùng này.
- Thu hồi họ của token đã gửi lên. Thông tin refresh bị thiếu, đã thu hồi, hết hạn hoặc sai định
  dạng vẫn giữ tính idempotent và không tiết lộ chi tiết phiên.

### `GetCurrentAuthenticatedUser`

- Đầu vào: user ID từ access token đã xác thực.
- Nạp phép chiếu tài khoản Identity hiện tại.
- Trả về đúng `userId`, `studentId`, `roles` và `status`.
- Không nạp và không phơi bày Profile đầy đủ, mật khẩu, dữ liệu refresh hay dữ liệu nhà cung cấp.

### Các port của tầng application

| Port                         | Tầng và mục đích                                                      | Adapter   |
| ---------------------------- | --------------------------------------------------------------------- | --------- |
| `AuthAccountRepository`      | Phép chiếu xác thực theo MSSV/email/ID và vai trò/trạng thái hiện tại | TypeORM   |
| `ExternalIdentityRepository` | Tra cứu Microsoft ổn định và tạo liên kết đầu tiên một cách nguyên tử | TypeORM   |
| `RefreshSessionRepository`   | Tạo, xoay vòng nguyên tử, thu hồi họ, và xử lý dùng lại               | TypeORM   |
| `PasswordHasher`             | Ranh giới băm/kiểm tra thông tin đăng nhập                            | Argon2    |
| `BkTokenService`             | Phát hành và kiểm chứng các claim token BKPractice có phân loại       | Nest JWT  |
| `MicrosoftIdentityProvider`  | URL uỷ quyền và việc đổi mã lấy token đã được kiểm chứng              | MSAL Node |
| `AuthFlowStore`              | Giao dịch OAuth dùng một lần và mã đăng nhập                          | Redis     |

Đây đều là các seam thật về bảo mật, lưu trữ, hoặc nhà cung cấp bên ngoài. Không đưa vào base
repository chung, command bus, tầng CQRS, hay cây interface rỗng nào.

## Truy vết yêu cầu

| Yêu cầu       | Đường triển khai                                                   | Cách kiểm chứng chính                       |
| ------------- | ------------------------------------------------------------------ | ------------------------------------------- |
| ID-001-FR-001 | Bỏ handler/DTO register và mục đăng ký công khai ở Gateway         | ID-001-AC-001                               |
| ID-001-FR-002 | Chỉ tra cứu qua repository; Microsoft từ chối tài khoản không khớp | ID-001-AC-001, ID-001-AC-007                |
| ID-001-FR-003 | `LoginWithStudentId`                                               | ID-001-AC-002                               |
| ID-001-FR-004 | DTO đăng nhập và kiểm tra whitelist toàn cục                       | ID-001-AC-004                               |
| ID-001-FR-005 | Lỗi chung và đường kiểm tra bằng bản băm giả                       | ID-001-AC-003                               |
| ID-001-FR-006 | Use case khởi tạo/hoàn tất đăng nhập Microsoft                     | ID-001-AC-005                               |
| ID-001-FR-007 | Adapter MSAL single-tenant và cấu hình đã kiểm chứng               | ID-001-AC-006, ID-001-AC-009                |
| ID-001-FR-008 | Đối sánh `preferred_username` đã chuẩn hoá qua repository          | ID-001-AC-005, ID-001-AC-007                |
| ID-001-FR-009 | Bảng định danh ngoài và việc liên kết nguyên tử                    | ID-001-AC-005, ID-001-AC-008                |
| ID-001-FR-010 | Chính sách trạng thái dùng chung khi đăng nhập và làm mới          | ID-001-AC-010                               |
| ID-001-FR-011 | Bộ điều phối phát hành cặp token dùng chung                        | ID-001-AC-002, ID-001-AC-005                |
| ID-001-FR-012 | Claim JWT tối thiểu có phân loại và TTL cấu hình được              | ID-001-AC-011                               |
| ID-001-FR-013 | Middleware auth của Gateway và các header đã làm sạch              | ID-001-AC-015, ID-001-AC-016                |
| ID-001-FR-014 | Kiểm tra mục đích trong các adapter Gateway/JWT/MSAL               | ID-001-AC-009, ID-001-AC-011, ID-001-AC-013 |
| ID-001-FR-015 | `RefreshSession` và việc nạp lại tài khoản                         | ID-001-AC-012                               |
| ID-001-FR-016 | Xoay vòng trong transaction                                        | ID-001-AC-012                               |
| ID-001-FR-017 | Ánh xạ lỗi refresh chung                                           | ID-001-AC-013                               |
| ID-001-FR-018 | Đăng xuất theo họ hiện tại                                         | ID-001-AC-014, ID-001-AC-021                |
| ID-001-FR-019 | Không có danh sách đen; TTL của access token vẫn là quyết định     | ID-001-AC-014 và test hết hạn               |
| ID-001-FR-020 | Adapter Argon2 và danh sách trường cho phép ở phản hồi             | ID-001-AC-017, ID-001-AC-019                |
| ID-001-FR-021 | Claim vai trò chỉ đọc; không thay đổi RBAC                         | ID-001-AC-011, ID-001-AC-016                |
| ID-001-FR-022 | Phụ thuộc cấp tài khoản băm thông tin đăng nhập đã phê duyệt       | ID-001-AC-019                               |
| ID-001-FR-023 | Mỗi lần đăng nhập thành công tạo một họ mới                        | ID-001-AC-021                               |
| ID-001-FR-024 | Đổi mã đăng nhập dùng một lần trong 60 giây trên Redis             | ID-001-AC-018, ID-001-AC-020                |
| ID-001-FR-025 | Use case lấy người dùng hiện tại, được bảo vệ                      | ID-001-AC-023                               |
| ID-001-FR-026 | Dùng lại chỉ thu hồi đúng một họ                                   | ID-001-AC-022                               |

## Lưu trữ

Toàn bộ dữ liệu xác thực lưu bền vẫn nằm trong `bkpractice_identity`.

- `AuthAccountRepository` truy vấn các bảng `users`, `roles` và `user_roles` hiện có; nó chỉ select
  `password_hash` cho việc kiểm tra cục bộ.
- `ExternalIdentityRepository` sở hữu các transaction tra cứu/liên kết Microsoft. Việc đối sánh ban
  đầu dùng `preferred_username` đã chuẩn hoá; các liên kết đã thiết lập dùng `tenantId + oid`.
- `RefreshSessionRepository` sở hữu các dòng refresh và các bước chuyển của họ. Việc xoay vòng dùng
  một transaction cộng với cập nhật có điều kiện `revoked_at IS NULL`, để hai bên tiêu thụ đồng thời
  không thể cùng thắng.
- Thông tin refresh dạng thô không bao giờ được lưu; giữ nguyên chiến lược băm Argon2 hiện có.
- Token của nhà cung cấp Microsoft không được lưu.
- State/nonce/PKCE của OAuth và các mã đăng nhập là các giá trị tạm thời trên Redis, không phải bản
  ghi nghiệp vụ.
- Không đọc cơ sở dữ liệu của service khác và không entity nghiệp vụ nào của Identity chuyển vào
  `libs/`.

## Thay đổi cơ sở dữ liệu

### `users`

- Thêm `student_id varchar(64)` cho phép null.
- Thêm một partial unique index cho `student_id` khác null.
- Giữ `email` hiện có làm `emailTruong` đã chuẩn hoá và được lưu; không đổi tên nó.
- Thêm một functional unique index trên `LOWER(email)` sau khi đã kiểm tra trùng lặp không phân biệt
  hoa thường.
- Giữ nguyên `password_hash`, enum trạng thái, vai trò và quan hệ hồ sơ.

`student_id` chỉ cho phép null vì lý do tương thích với dữ liệu nền tảng. Việc xác thực đòi hỏi một
giá trị khác null. Quy trình cấp tài khoản có thể điền bù cho các sinh viên dự kiến trước khi một
migration sau này chuyển cột này thành non-null.

### `external_identities` (mới)

- `id uuid` khoá chính
- `user_id uuid` khoá ngoại nội bộ tới `users` kèm cascade delete
- `provider varchar`, được domain ràng buộc về `MICROSOFT`
- `provider_tenant_id varchar(64)`
- `provider_subject_id varchar(128)` cho `oid` của Microsoft
- `provider_username_at_link varchar(320)`
- `created_at`, `updated_at`
- Duy nhất theo `(provider, provider_tenant_id, provider_subject_id)`
- Duy nhất theo `(user_id, provider)`
- Index trên `user_id`

### `refresh_tokens`

- Thêm `family_id uuid` có index, non-null sau khi điền bù.
- Thêm `replaced_by_token_id uuid` cho phép null để lưu dấu vết xoay vòng; không bao giờ phơi bày nó
  ra công khai.
- Giữ lại các trường token ID, user ID, bản băm token, thời hạn, thu hồi và thời điểm tạo.
- Không thêm device fingerprint, tên thiết bị, hay phiên lưu bền trên Redis.

## Migration

Tạo một migration TypeORM thuộc sở hữu của Identity, tên theo ý niệm là
`AddStudentMicrosoftAuthentication`; không sửa migration nền tảng.

Trình tự phần up:

1. Dừng lại kèm thông báo lỗi hành động được nếu tồn tại email trùng nhau khi không phân biệt hoa
   thường.
2. Thêm `users.student_id` cho phép null và partial unique index của nó.
3. Thêm unique index không phân biệt hoa thường cho email.
4. Tạo `external_identities` cùng khoá ngoại nội bộ và các unique index của nó.
5. Thêm `refresh_tokens.family_id` và `replaced_by_token_id` cho phép null.
6. Điền bù cho mọi dòng refresh hiện có một UUID họ được sinh riêng.
7. Chuyển `family_id` thành non-null và thêm index cho họ.

Phần down chỉ gỡ các index, bảng và cột này theo thứ tự phụ thuộc ngược lại. Việc revert phá huỷ dữ
liệu liên kết/metadata họ và phải được thông báo trước. Kiểm chứng run/revert/run trên một cơ sở dữ
liệu test Identity cách ly.

## API

| Method và route                     | Xác thực                                 | Hành vi ở tầng Presentation           | Thao tác application          |
| ----------------------------------- | ---------------------------------------- | ------------------------------------- | ----------------------------- |
| `POST /api/auth/login`              | Công khai                                | Kiểm tra MSSV/mật khẩu; HTTP 200 JSON | `LoginWithStudentId`          |
| `GET /api/auth/microsoft`           | Công khai                                | HTTP 302 tới Microsoft                | `StartMicrosoftLogin`         |
| `GET /api/auth/microsoft/callback`  | Callback công khai của nhà cung cấp      | HTTP 302 tới frontend kèm mã mờ       | `CompleteMicrosoftLogin`      |
| `POST /api/auth/microsoft/exchange` | Công khai, mã dùng một lần               | HTTP 200 JSON kèm cặp token           | `ExchangeMicrosoftLoginCode`  |
| `POST /api/auth/refresh`            | Công khai, cần refresh token             | HTTP 200 JSON kèm cặp thay thế        | `RefreshSession`              |
| `POST /api/auth/logout`             | Cần access token và refresh token hợp lệ | HTTP 204, không có phần thân          | `LogoutCurrentSession`        |
| `GET /api/auth/me`                  | Cần access token hợp lệ                  | JSON định danh tối thiểu              | `GetCurrentAuthenticatedUser` |

Gỡ `POST /api/auth/register` và mục route công khai tương ứng ở Gateway. Swagger mô tả các DTO, yêu
cầu Bearer, các redirect và các mã lỗi công khai.

Thay đổi ở Gateway:

- Danh sách công khai trở thành login, Microsoft start/callback/exchange, và refresh.
- Logout và `/me` vẫn được bảo vệ.
- Chuyển tiếp header phản hồi `Location` an toàn cho các luồng 302; tiếp tục bỏ `set-cookie` vì cách
  giao refresh đã Approved là qua JSON.
- Giữ nguyên việc loại bỏ `x-auth-user-id` và `x-auth-roles` do người gọi cung cấp; việc loại bỏ và
  đặt lại `x-auth-permissions` thuộc ID-003-T048.
- Mở rộng throttler Nest hiện có với các giới hạn theo đường dẫn: mặc định 120/phút, đăng nhập bằng
  mật khẩu 5/phút/IP, Microsoft start/callback/exchange và refresh 30/phút/IP. Các giới hạn và TTL
  đều cấu hình được.

Identity cũng kiểm chứng Bearer token được chuyển tiếp cho các endpoint auth được bảo vệ và so sánh
chủ thể của access token khi đăng xuất với chủ thể của refresh token. Đây là phòng thủ nhiều lớp,
không phải logic nghiệp vụ tài khoản bị lặp lại.

## DTO / Kiểm tra dữ liệu

- `StudentLoginDto`: `studentId` và mật khẩu đều là chuỗi bắt buộc; chỉ cắt khoảng trắng bao quanh
  MSSV. Không tự bịa ra biểu thức chính quy cho MSSV. Giới hạn độ dài và cho phép mật khẩu sáu ký tự
  đã phê duyệt.
- `MicrosoftCallbackDto`: các trường tuỳ chọn `code`, `state`, `error`, `error_description` của nhà
  cung cấp; tầng application đảm bảo phải có một cặp thành công hợp lệ.
- `MicrosoftExchangeDto`: `loginCode` dạng mờ, bắt buộc, có giới hạn độ dài.
- `RefreshTokenDto`: `refreshToken` bắt buộc, không rỗng, có giới hạn độ dài.
- `TokenPairResponseDto`: `accessToken`, `refreshToken`.
- `AuthenticatedResponseDto`: `userId` kèm cặp token.
- `CurrentAuthUserResponseDto`: đúng `userId`, `studentId`, `roles`, `status`.

`ValidationPipe` toàn cục giữ nguyên transform, whitelist và `forbidNonWhitelisted`. Các DTO không
bao giờ nhận vai trò, trạng thái, email, định danh Microsoft, claim của token, hay URL chuyển hướng
từ người gọi. Các DTO phản hồi ngăn không cho đối tượng lưu trữ/bản băm mật khẩu vượt qua tầng
Presentation.

## Phân quyền

- Các đường login/Microsoft/refresh chỉ công khai vì chúng thiết lập hoặc xoay vòng việc xác thực.
- Chỉ một tài khoản `ACTIVE` đã được cấp mới nhận được token.
- Việc thuộc tenant Microsoft là không đủ nếu không có một tài khoản khớp sẵn có.
- Logout và `/me` yêu cầu một access token BKPractice đã xác minh.
- Chủ thể của access token khi đăng xuất phải trùng với chủ thể của refresh token.
- Vai trò được đọc từ Identity và phát hành dưới dạng claim. Request không thể gán hay thay đổi vai
  trò hoặc quyền.
- Việc phân quyền khoá học/lớp/tài nguyên vẫn thuộc về service sở hữu.

## Messaging / Sự kiện

N/A. ID-001 không có event RabbitMQ nào được phê duyệt. OAuth của Microsoft là HTTPS đồng bộ thông
qua một adapter; thêm một event auth sẽ mở rộng phạm vi.

## Realtime

N/A. ID-001 không có hành vi Socket.IO nào. Redis chỉ lưu state OAuth ngắn hạn và mã đăng nhập dùng
một lần, không lưu phiên lâu dài.

## Adapter hạ tầng

- **Argon2PasswordHasher:** Bọc `argon2.verify/hash` hiện có. ID-001 thực hiện việc kiểm tra; tính
  năng cấp tài khoản riêng thực hiện việc băm mật khẩu mặc định đã phê duyệt.
- **JwtBkTokenService:** Bọc Nest JWT với hai bí mật access/refresh riêng biệt đã được kiểm chứng và
  TTL cấu hình được. Claim của access: `sub, roles, permissions, type=access` (bản sửa đổi 1.1); claim của refresh:
  `sub, jti, fid, type=refresh`, cộng với `iat/exp` chuẩn.
- **MsalMicrosoftIdentityProvider:** Dùng `ConfidentialClientApplication` của `@azure/msal-node`,
  authority theo tenant, Authorization Code Flow và PKCE. Chỉ trả về `preferred_username`, `tid` và
  `oid` đã xác minh; không dùng quyền Graph và không dùng token cache.
- **RedisAuthFlowStore:** Tái dùng `ioredis` với khoá có namespace. TTL của giao dịch OAuth là 300
  giây; TTL của mã đăng nhập là 60 giây. Tiêu thụ qua `GETDEL` nguyên tử hoặc tương đương. Không bao
  giờ lưu bearer token thô của nhà cung cấp hay của BKPractice.
- **Các adapter TypeORM:** Chỉ hiện thực ba repository port và sở hữu các chi tiết về transaction,
  khoá, và query builder.

Thay đổi phụ thuộc ở thời điểm triển khai:

- Thêm phụ thuộc runtime `@azure/msal-node` bằng pnpm và chỉ cập nhật `pnpm-lock.yaml`.
- Tái dùng ioredis, Argon2, Nest JWT, TypeORM, class-validator và Swagger hiện có.
- Không thêm Passport, Microsoft Graph SDK, framework session, OAuth broker, hay một service khác.

Cấu hình Identity bắt buộc:

- `REDIS_URL`
- `MICROSOFT_TENANT_ID`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `MICROSOFT_REDIRECT_URI`
- `AUTH_WEB_LOGIN_REDIRECT_URL`

Cấu hình giới hạn tần suất bắt buộc ở Gateway:

- `AUTH_RATE_LIMIT_TTL_MS` mặc định `60000`
- `AUTH_PASSWORD_LOGIN_RATE_LIMIT` mặc định `5`
- `AUTH_OAUTH_RATE_LIMIT` mặc định `30`

Cấu hình Microsoft thất bại ngay khi thiếu. Thông tin xác thực thật nằm ngoài hệ thống quản lý mã
nguồn.

## Xử lý lỗi

Lỗi ở tầng domain/application có phân loại ổn định nhưng không import gì từ Nest. Tầng Presentation
ánh xạ chúng sang quy ước Nest/Gateway hiện có:

| Phân loại lỗi                                                                               | Hành vi HTTP                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| DTO không hợp lệ hoặc callback sai định dạng                                                | 400 qua cấu trúc kiểm tra dữ liệu/lỗi hiện có  |
| MSSV không tồn tại, mật khẩu sai, tài khoản không hoạt động, định danh Microsoft không khớp | Một lỗi 401 chung                              |
| Mã đăng nhập hoặc refresh token không hợp lệ/hết hạn/đã dùng                                | 401 chung                                      |
| Xung đột tính duy nhất của liên kết Microsoft                                               | 401 chung ở phía công khai; log nội bộ an toàn |
| Access token bị thiếu hoặc không hợp lệ                                                     | 401 ở Gateway và ở guard của Identity          |
| Microsoft hoặc Redis không khả dụng                                                         | 503 mà không kèm chi tiết nhà cung cấp/token   |
| Lỗi lưu trữ ngoài dự kiến                                                                   | Lỗi 500 chuẩn hoá hiện có kèm request ID       |

Việc đăng xuất bắt các thông tin refresh không hợp lệ hoặc đã bị thu hồi sau khi đã xác thực access
token, và trả về 204. Nó không bao giờ tiết lộ liệu một họ phiên có từng tồn tại hay không.

## Bảo mật

| Yêu cầu bảo mật             | Cách thực thi                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| ID-001-SR-001–ID-001-SR-003 | Danh sách trường cho phép ở phản hồi, adapter Argon2, cấp tài khoản chỉ lưu bản băm, giới hạn tần suất đăng nhập |
| ID-001-SR-004–ID-001-SR-007 | MSAL, authority theo tenant, PKCE/state/nonce, redirect cố định, cấu hình/claim đã kiểm chứng                    |
| ID-001-SR-008–ID-001-SR-010 | Refresh token được băm, claim JWT tối thiểu, không lưu/ghi log token của nhà cung cấp                            |
| ID-001-SR-011–ID-001-SR-014 | DTO có whitelist, lỗi chung, kiểm tra trạng thái và kiểm tra nghiêm ngặt mục đích của token                      |
| ID-001-SR-015               | Cấu hình HTTPS ở production và cơ chế bàn giao bằng mã mờ                                                        |
| ID-001-SR-016               | Throttling theo đường dẫn, cấu hình được, ở Gateway                                                              |
| ID-001-SR-017               | Mã đăng nhập ngẫu nhiên 60 giây, tiêu thụ nguyên tử đúng một lần                                                 |
| ID-001-SR-018               | Thu hồi theo họ khi bị dùng lại, trong transaction                                                               |

Các biện pháp bổ sung:

- Làm sạch log và bỏ qua phần thân request của các thao tác auth.
- Không bao giờ chấp nhận token Microsoft như token BKPractice.
- Không bao giờ chấp nhận email, tenant, object ID, vai trò, trạng thái hay redirect URI do client
  cung cấp.
- Giữ các redirect callback/frontend cố định và được cấu hình.
- Xoá state OAuth một cách nguyên tử trước khi đổi mã của nhà cung cấp.
- Giữ access token ngắn hạn với giá trị mặc định cấu hình được hiện có là `15m`; không dùng danh
  sách đen.
- Ghi nhận việc chủ sở hữu chấp nhận rủi ro của mật khẩu dùng chung `123456`. Việc giới hạn tần suất
  và Argon2 làm giảm chứ không loại bỏ nguy cơ chiếm tài khoản trước khi chủ nhân kịp đăng nhập.

## Chiến lược kiểm thử

### Unit test

- Mọi use case: trường hợp thành công, các lỗi chung, trạng thái không hoạt động, và không có lời
  gọi ngoài ý muốn nào sau khi thất bại.
- Đăng nhập sinh viên: việc cắt khoảng trắng MSSV, mật khẩu không bị thay đổi, bản băm giả, vai trò,
  họ phiên độc lập.
- Microsoft: state/nonce/PKCE, các claim tenant/audience, liên kết lần đầu/lần sau, người dùng không
  khớp/khớp nhập nhằng, xung đột, mã 60 giây, dùng một lần.
- Refresh: xoay vòng hợp lệ, token không hợp lệ/hết hạn, trạng thái, bên thắng khi đồng thời, thu
  hồi họ khi bị dùng lại, và tính cách ly giữa các họ.
- Logout: chủ thể không khớp, thu hồi họ, tính idempotent, giữ nguyên thiết bị khác.
- `/me`: đúng bốn trường đã phê duyệt.
- Các adapter JWT/Argon2 và các đường công khai/được bảo vệ của Gateway, header giả mạo, token có
  phân loại, giới hạn tần suất, và việc chuyển tiếp `Location`.

### Test lưu trữ/integration

- Chạy run/revert/run migration trên PostgreSQL cách ly.
- Ràng buộc MSSV duy nhất khác null và email duy nhất không phân biệt hoa thường.
- Tính duy nhất của liên kết Microsoft và việc liên kết lần đầu nguyên tử khi đồng thời.
- Refresh chỉ một bên thắng, thu hồi họ khi bị dùng lại, và giữ nguyên các họ khác.
- Tiêu thụ nguyên tử trên Redis và các TTL 300/60 giây.
- Điền bù các dòng refresh hiện có bằng các ID họ duy nhất.

### Test API/E2E

| Tiêu chí nghiệm thu         | Nhóm kịch bản                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------ |
| ID-001-AC-001–ID-001-AC-004 | Không có register; đăng nhập MSSV thành công/thất bại chung/kiểm tra dữ liệu         |
| ID-001-AC-005–ID-001-AC-009 | Khớp tenant Microsoft/liên kết/dùng lại và các thất bại do nhà cung cấp không hợp lệ |
| ID-001-AC-010–ID-001-AC-011 | Trạng thái tài khoản và claim token tối thiểu                                        |
| ID-001-AC-012–ID-001-AC-014 | Xoay vòng/từ chối refresh và đăng xuất                                               |
| ID-001-AC-015–ID-001-AC-018 | Việc từ chối ở Gateway/làm sạch header/an toàn log/an toàn redirect                  |
| ID-001-AC-019–ID-001-AC-020 | Fixture bản băm mật khẩu mặc định và việc đổi mã Microsoft một lần                   |
| ID-001-AC-021–ID-001-AC-022 | Cách ly nhiều thiết bị và khoanh vùng khi bị dùng lại                                |
| ID-001-AC-023–ID-001-AC-024 | `/me` tối thiểu và ánh xạ ranh giới cấp tài khoản                                    |

Việc tự động hoá OAuth dùng mock cho `MicrosoftIdentityProvider`; một bài smoke test trên tenant
staging kiểm chứng việc đăng ký ứng dụng thật mà không đưa bí mật vào fixture. Các lệnh cuối:
`pnpm lint`, `pnpm typecheck`, `pnpm test`, và `pnpm build`.

## Khả năng quan sát

- Bảo toàn `x-request-id` xuyên Gateway và Identity.
- Ghi log kết quả thô cho việc đăng nhập, callback/liên kết Microsoft, refresh/dùng lại, thu hồi họ,
  và sự cố phụ thuộc.
- Log thành công có thể kèm `userId` nội bộ và ID họ. Log thất bại ở phía công khai dùng request ID
  và lý do thô, không bao giờ kèm MSSV/email.
- Không bao giờ ghi log mật khẩu, token thô, mã uỷ quyền, PKCE verifier, nonce, client secret, hay
  payload claim của Microsoft.
- Tái dùng logger hiện có; không thêm phụ thuộc metric/tracing nào.

## Kế hoạch thay đổi file

### REUSE

- `apps/identity-service/src/modules/users/entities/profile.entity.ts`
- `apps/identity-service/src/modules/rbac/entities/role.entity.ts`
- `apps/identity-service/src/database/data-source.ts`
- `libs/common/src/bootstrap.ts`
- Hạ tầng JWT, Argon2, TypeORM, ioredis, kiểm tra dữ liệu, Swagger và proxy Gateway hiện có

### MODIFY

- `apps/identity-service/src/modules/users/entities/user.entity.ts`: thêm lớp lưu trữ cho MSSV.
- `apps/identity-service/src/modules/users/entities/refresh-token.entity.ts`: thêm họ/dấu vết.
- `apps/identity-service/src/modules/identity.entities.ts`: đăng ký entity định danh ngoài.
- `apps/identity-service/src/modules/auth/auth.module.ts`: composition root.
- `apps/identity-service/src/identity-service.module.ts`: chỉ khi cần cho vòng đời của adapter.
- `libs/config/src/environment.ts` và `.env.example`: cấu hình Microsoft/Redis/giới hạn tần suất đã
  kiểm chứng.
- `libs/contracts/src/index.ts`: export các claim token auth mang tính kỹ thuật.
- `apps/api-gateway/src/api-gateway.module.ts`: gắn throttler theo đường dẫn.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts`: route công khai/làm sạch header.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts`: chuyển tiếp redirect `Location` an toàn.
- `package.json` và `pnpm-lock.yaml`: chỉ thêm `@azure/msal-node` bằng pnpm.

### CREATE

- `apps/identity-service/src/modules/auth/domain/`: các phép chiếu, kiểu nhà cung cấp/phiên, lỗi.
- `apps/identity-service/src/modules/auth/application/ports/`: bảy port cụ thể.
- `apps/identity-service/src/modules/auth/application/use-cases/`: bảy use case đã phê duyệt.
- `apps/identity-service/src/modules/auth/application/auth-token-issuer.ts`.
- `apps/identity-service/src/modules/auth/infrastructure/persistence/`: các adapter TypeORM và
  entity lưu trữ định danh ngoài.
- `apps/identity-service/src/modules/auth/infrastructure/security/`: các adapter Argon2/JWT.
- `apps/identity-service/src/modules/auth/infrastructure/microsoft/`: adapter MSAL.
- `apps/identity-service/src/modules/auth/infrastructure/redis/`: adapter OAuth/mã đăng nhập.
- `apps/identity-service/src/modules/auth/presentation/`: controller, guard/decorator, các DTO.
- `apps/identity-service/src/database/migrations/*-AddStudentMicrosoftAuthentication.ts`.
- `libs/contracts/src/auth.contracts.ts`: hình dạng claim access/refresh mang tính kỹ thuật.
- `apps/api-gateway/src/auth/gateway-throttler.guard.ts`.
- Các test unit, adapter, guard, migration, integration và API tập trung.

### REMOVE sau khi các test thay thế đã pass

- `apps/identity-service/src/modules/auth/auth.service.ts`.
- `apps/identity-service/src/modules/auth/auth.controller.ts`.
- `apps/identity-service/src/modules/auth/dto/register.dto.ts`.
- Các DTO login/refresh hiện có, sau khi các bản thay thế đã phê duyệt của chúng được nối dây xong.

Không migration nền tảng, tài liệu kiến trúc, mã nguồn service không liên quan, hay entity nghiệp vụ
nào bên ngoài Identity bị sửa đổi.

## Thứ tự triển khai

1. Thêm phụ thuộc MSAL/schema cấu hình và các contract token kỹ thuật mà không đổi route.
2. Thêm migration và cập nhật các model lưu trữ/registry entity của Identity.
3. Thêm các kiểu/lỗi ở tầng domain và bảy port của tầng application.
4. Hiện thực các adapter TypeORM, Argon2, JWT, Redis và MSAL kèm test tập trung.
5. Hiện thực việc đăng nhập sinh viên và phần phát hành cặp token dùng chung.
6. Hiện thực Microsoft start/callback/exchange và việc liên kết nguyên tử.
7. Hiện thực việc xoay vòng/dùng lại refresh, đăng xuất, và use case người dùng hiện tại.
8. Thay thế controller/DTO, gỡ register, rồi gỡ `AuthService` nguyên khối.
9. Cập nhật route Gateway, việc chuyển tiếp redirect, phòng thủ nhiều lớp cho auth, và throttling.
10. Thêm test migration/integration/API và Swagger.
11. Chạy migration run/revert/run và smoke test Microsoft trên staging.
12. Chạy lint/typecheck/test/build và kiểm chứng mọi vết truy FR/SR/AC.

## Rủi ro

- **Mật khẩu mặc định dùng chung:** `123456` là đoán được và tạo ra nguy cơ bị chiếm tài khoản trước
  khi chủ nhân kịp đăng nhập. Chủ sở hữu đã chấp nhận điều này; biện pháp giảm thiểu gồm Argon2 khi
  lưu, lỗi chung chung, throttling nghiêm ngặt, không có đăng ký công khai, và một tính năng Đổi mật
  khẩu tự nguyện riêng.
- **Phụ thuộc vào việc cấp tài khoản:** ID-001 có thể dùng fixture nhưng không thể đạt trạng thái
  Verified trọn vẹn end-to-end cho tới khi tính năng import riêng cung cấp MSSV/email duy nhất và
  các bản băm Argon2.
- **Dữ liệu cũ:** Người dùng đăng ký theo cách cũ không có MSSV. Migration cho phép null bảo toàn
  họ, nhưng họ không dùng được luồng đăng nhập mới cho tới khi được cấp tài khoản.
- **Cấu hình Microsoft:** Cấu hình sai tenant/client/redirect sẽ vô hiệu hoá việc đăng nhập
  Microsoft. Hãy thất bại sớm và smoke test việc đăng ký ứng dụng trên portal staging.
- **Sự cố Redis:** Microsoft start/callback/exchange không khả dụng; đăng nhập bằng MSSV và refresh
  qua cơ sở dữ liệu vẫn dùng được.
- **Đua khi xoay vòng:** Refresh đồng thời có thể khiến cơ chế khoanh vùng thu hồi cả họ; hãy ghi rõ
  hành vi an toàn đã phê duyệt này cho phía client.
- **Tương thích redirect ở Gateway:** Việc chuyển tiếp `Location` là bắt buộc và cần một bài test
  cho proxy.
- **Sự cố nhà cung cấp:** Trả về 503 an toàn và không bao giờ chấp nhận các claim chưa xác minh như
  một phương án dự phòng.

## Tuân thủ kiến trúc

- Tầng Presentation kiểm tra/chuyển đổi HTTP, gọi đúng một thao tác application, và ánh xạ lỗi; nó
  không thực hiện luồng nghiệp vụ nào của TypeORM, Argon2, Redis, JWT hay Microsoft.
- Tầng application điều phối các luồng xác thực/phiên thông qua các port hẹp và chỉ phụ thuộc vào
  các kiểu của domain.
- Tầng domain không import bất kỳ hiện thực nào của NestJS, TypeORM, Redis, JWT, MSAL hay HTTP.
- Tầng infrastructure sở hữu TypeORM, Argon2, JWT, Redis và MSAL. Module Auth gắn các port với
  adapter.
- Gateway xác minh access token, loại bỏ header giả mạo, chuyển tiếp redirect và giới hạn tần suất;
  nó không đối sánh tài khoản, không truy vấn dữ liệu Identity, và không tạo phiên.
- Dữ liệu lưu bền vẫn nằm trong `bkpractice_identity`; Redis chỉ chứa state luồng tạm thời. Không có
  SQL, khoá ngoại, import repository hay entity nghiệp vụ dùng chung xuyên service nào.
- `libs/contracts` chỉ nhận các claim token mang tính kỹ thuật, không bao giờ nhận các model domain
  User, MicrosoftIdentity hay RefreshSession.
- Việc căn chỉnh chỉ giới hạn trong Authentication. Nó không tái cấu trúc Profile/RBAC và không đưa
  vào CQRS, event sourcing, Keycloak, Graph API, hay một microservice khác.

## Bổ sung cho bản sửa đổi 1.1

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-29`, bám theo ID-001 1.1 và ID-003 0.4.

- Use case đăng nhập (mật khẩu, Microsoft) và làm mới phiên gọi `EffectivePermissionReader` của module
  `rbac` ngay trước khi phát hành access token, cùng lúc nạp vai trò.
- `JwtBkTokenService` thêm claim `permissions` (mảng chuỗi, có thể rỗng) vào access token. Refresh
  token không đổi.
- `libs/contracts/src/auth.contracts.ts` thêm `permissions: string[]` vào hình dạng claim access.
- `/auth/me` không đổi.
- Test: claim access chỉ gồm `sub`, `roles`, `permissions`, `type`, `iat`, `exp` (ID-001-AC-011 sửa);
  làm mới phiên phản ánh quyền hiện tại.

> `plan.md` mô tả NHƯ THẾ NÀO. Việc triển khai vẫn cần `tasks.md` ở Giai đoạn 06, khớp với kế hoạch
> đã Approved này.
