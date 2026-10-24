# ID-002 Kế hoạch triển khai Profile

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-01`.

Kế hoạch này mô tả CÁCH triển khai đặc tả Profile đã Approved và không hiện thực mã nguồn. Các công
việc triển khai phải được tạo riêng ở giai đoạn SDD tiếp theo.

## Đặc tả liên quan

- [ID-002 Profile](./spec.md)
- Trạng thái: `Approved`
- Phiên bản đã Approved: `0.4`
- Ngày phê duyệt: `2026-09-01`

Đặc tả vẫn là nguồn chân lý cho hành vi, quyền riêng tư, phân quyền và phạm vi. Kế hoạch này không
được thêm trường Profile, thay đổi quyền sở hữu hay đưa vào một luồng xác thực.

## Service đích

Service: Identity Service

Profile vẫn là một tính năng do Identity sở hữu. API Gateway vẫn là cổng vào công khai duy nhất được
dự kiến và tiếp tục chuyển tiếp `/api/profile` và `/api/users` tới Identity. Tính năng này không truy
cập cơ sở dữ liệu của Learning, Submission hay Community.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md)).

Bản triển khai tuân theo chiều phụ thuộc đã phê duyệt của Identity:

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

Mã Identity hiện tại là một nền tảng thực dụng, mới căn chỉnh một phần: model lưu trữ Profile nằm
trong `modules/users/entities/`, còn `AuthService` vẫn gộp mối quan tâm của tầng application và
infrastructure. ID-002 dùng một feature module tiệm tiến và không kích hoạt refactor trên toàn
repository. Các entity TypeORM hiện có vẫn là model lưu trữ, cho tới khi một hành vi domain thật của
Profile đòi hỏi một đối tượng domain riêng.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại

- `apps/identity-service/src/modules/users/entities/profile.entity.ts` đã mô hình hoá một Profile
  trên mỗi User, với `user_id` duy nhất, `display_name varchar(100)`, `avatar_url varchar(500)` cho
  phép null và `bio text` cho phép null.
- `apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts` đã tạo bảng
  `profiles` và khoá ngoại nội bộ tới User kèm cascade delete.
- `apps/identity-service/src/modules/users/entities/user.entity.ts` đã sở hữu quan hệ tới Profile và
  từ vựng trạng thái tài khoản `ACTIVE | LOCKED | PENDING`.
- `apps/identity-service/src/modules/identity.entities.ts` đã đăng ký `Profile` với datasource của
  Identity.
- `apps/identity-service/src/identity-service.module.ts` hiện chỉ import `AuthModule` cùng hạ tầng
  health/config/database dùng chung; một module Profile sẽ cần được nối dây ở composition root.
- `libs/common/src/bootstrap.ts` đã bật `ValidationPipe` với transform, whitelist và
  `forbidNonWhitelisted`, và tạo Swagger có hỗ trợ Bearer.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` đã định tuyến `/api/profile` và `/api/users`
  tới Identity.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts` hiện bảo vệ mọi đường `/api` trừ đúng các
  route Authentication công khai. Vì vậy nó cần một bộ so khớp hẹp cho hồ sơ công khai; không được
  phép mở rộng bỏ qua xác thực cho toàn bộ `/api/users` hay `/api/profile`.
- Mã nguồn hiện tại chưa có controller Profile, use case Profile, adapter R2, port repository
  Profile, hay test riêng cho Profile.

### Phân loại thay đổi

| Phân loại | Cách xử lý                                                                                                                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Quan hệ lưu trữ Profile/User hiện có, datasource/registry entity của Identity, phần kiểm tra dữ liệu toàn cục, Swagger/bootstrap, proxy Gateway, ngữ cảnh định danh đã xác thực và khả năng đọc tài khoản của ID-001 |
| MODIFY    | Ngữ nghĩa thuộc tính của entity Profile, phần composition của module Identity, việc kiểm tra cấu hình Identity, `.env.example`, việc so khớp route hồ sơ công khai ở Gateway, và bộ migration của Profile            |
| CREATE    | Các tầng của module Profile theo hướng feature-first, các use case/port của tầng application, adapter repository TypeORM, adapter Cloudflare R2, các DTO/mapper phản hồi, test Profile, và một migration ràng buộc   |
| REMOVE    | Không có. Controller/service Auth hiện có và hành vi xác thực của ID-001 nằm ngoài ID-002 và phải giữ nguyên                                                                                                         |

Không mã nguồn ứng dụng nào bị thay đổi ở giai đoạn này. Các đường dẫn ở trên chỉ là bản kiểm kê cho
việc triển khai sau này.

## Thay đổi ở tầng domain

### Đối tượng domain Profile

Tạo một đối tượng domain Profile nhỏ, độc lập với framework, trong module Profile mới, vì tính năng
này có các bất biến thật (khởi tạo trễ, các trường bị kiểm soát, văn bản có giới hạn độ dài, toàn vẹn
của tham chiếu avatar, và cập nhật an toàn khi thực hiện lại). Nó chỉ nên chứa:

- `profileId` và `userId`;
- `displayName` (không rỗng, tối đa 100 ký tự);
- tham chiếu tới đối tượng avatar đã phê duyệt, cho phép null;
- `bio` cho phép null (tối đa 1.000 ký tự);
- ngữ nghĩa patch tường minh, phân biệt giữa trường bị bỏ qua và việc xoá trống một trường cho phép
  null.

Đối tượng domain không được import NestJS, TypeORM, HTTP, kiểu dữ liệu của R2 SDK hay các class JWT.
Class TypeORM `Profile` hiện có vẫn là model lưu trữ và được ánh xạ tại ranh giới hạ tầng; không
chuyển nó vào `libs/`.

### Chính sách và bất biến của domain

- Một User có nhiều nhất một Profile; ràng buộc duy nhất `profiles.user_id` trong cơ sở dữ liệu được
  giữ nguyên.
- Việc tạo trễ chỉ được phép ở lần đọc/cập nhật đầu tiên của chủ sở hữu, đúng như đặc tả định nghĩa.
  Một lượt đọc công khai không tạo Profile cho một người dùng không liên quan.
- Việc khởi tạo dùng `họ tên` chính thức đã được cấp, do ranh giới cấp tài khoản đã phê duyệt cung
  cấp. Không được phép dùng tên dự phòng bịa ra.
- `displayName` được cắt khoảng trắng, bảo toàn Unicode và giới hạn 100 ký tự.
- `bio` là tuỳ chọn, được cắt khoảng trắng ở hai đầu, bảo toàn Unicode và giới hạn 1.000 ký tự. Nó có
  thể được xoá trống tường minh bằng `null`.
- Chỉ `displayName`, tham chiếu avatar và `bio` là các trường Profile ghi được. Email, MSSV, vai trò,
  quyền, trạng thái tài khoản, mật khẩu và định danh nhà cung cấp không thuộc aggregate Profile.
- Hồ sơ công khai của tài khoản `LOCKED` hoặc `PENDING` được biểu diễn bằng một kết quả không khả
  dụng chung chung; bản thân trạng thái không bao giờ được trả về.
- Các thay đổi trong Profile không bao giờ phát hành, xoay vòng hay thu hồi token của Authentication,
  và không bao giờ thay đổi state của Learning, Submission hay Community.

### Các port

Chỉ đưa vào các seam thật trong tính năng Profile:

| Port                     | Tầng               | Trách nhiệm                                                                                                                                                                                 |
| ------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProfileRepository`      | Application/domain | Tìm một Profile, khởi tạo nguyên tử một Profile từ tên chính thức, và lưu các cập nhật tường minh trên các trường được phép                                                                 |
| `IdentityProfileContext` | Application        | Đọc định danh User hiện tại, tên chính thức đã được cấp, trạng thái tài khoản và vai trò qua ranh giới tài khoản hiện có của Identity; không tạo một repository User thứ hai không giới hạn |
| `AvatarStorage`          | Application        | Phát hành ý định tải lên, kiểm chứng một tham chiếu R2 đã phê duyệt, tạo signed URL đọc ngắn hạn, và lên lịch dọn dẹp đối tượng cũ                                                          |

Nếu ID-001 phơi bày một port đọc tài khoản tương thích, `IdentityProfileContext` phải tái dùng nó.
Chỉ mở rộng port đó cho phần tên chính thức đã được cấp, nếu contract cấp tài khoản hiện có chưa có
seam đọc riêng. Không import một use case của Auth hay một repository TypeORM vào mã tầng application
của Profile.

## Tầng application / Use case

Chỉ tạo các thao tác mà đặc tả đã Approved yêu cầu. Mỗi use case nhận một định danh đã xác thực hoặc
một ID đích công khai, điều phối các port, và trả về một model phản hồi an toàn.

### `GetMyProfile`

- **Tác nhân:** Sinh viên, Giảng viên hoặc Quản trị viên đã xác thực, hành động với tư cách chính mình.
- **Đầu vào:** User ID đã xác thực từ ngữ cảnh ID-001; không nhận `userId` do người gọi cung cấp.
- **Luồng:** đọc User/tên chính thức, tìm-hoặc-tạo Profile một cách nguyên tử, rồi ánh xạ kết quả
  sang phản hồi hồ sơ của chính mình. Các request đầu tiên đồng thời hội tụ về một Profile.
- **Đầu ra:** `userId`, các trường thuộc sở hữu của Profile, và một signed URL avatar khi tồn tại
  avatar đã phê duyệt; không kèm thông tin đăng nhập, dữ liệu nhà cung cấp, vai trò hay trạng thái
  tài khoản.
- **Lỗi:** chưa xác thực, thiếu tên chính thức dùng được, hoặc lỗi lưu trữ đã chuẩn hoá.

### `UpdateMyProfile`

- **Tác nhân:** chủ sở hữu đã xác thực.
- **Đầu vào:** User ID đã xác thực và một patch một phần tường minh.
- **Luồng:** liệt kê tường minh ba trường Profile được phép, chuẩn hoá/kiểm tra giá trị, kiểm chứng
  tham chiếu avatar qua `AvatarStorage`, khởi tạo nguyên tử một Profile còn thiếu từ tên chính thức,
  lưu cập nhật, và chỉ lên lịch dọn dẹp đối tượng bị thay thế sau khi commit thành công.
- **Đầu ra:** phản hồi hồ sơ của chính mình kết quả, với các trường bị bỏ qua giữ nguyên.
- **Lỗi:** dữ liệu/tham chiếu R2 không hợp lệ, thiếu tên chính thức, hoặc ngữ cảnh không có thẩm
  quyền. Một lỗi ở phụ thuộc lưu trữ không được để lại một tham chiếu Profile treo lơ lửng đã commit.

### `GetPublicProfile`

- **Tác nhân:** khách chưa xác thực hoặc bất kỳ người gọi đã xác thực nào yêu cầu góc nhìn công khai.
- **Đầu vào:** tham số đường dẫn `userId` ổn định của Identity.
- **Luồng:** nạp trạng thái User đích và Profile mà không tạo Profile còn thiếu. Trả về kết quả không
  khả dụng/không tìm thấy chung chung cho các hồ sơ công khai vắng mặt, `LOCKED` hoặc `PENDING`. Với
  một Profile khả dụng, chỉ ánh xạ `displayName`, signed URL avatar và `bio`.
- **Lỗi:** 404 chung cho các đích không khả dụng; không rò rỉ trạng thái tài khoản hay trường riêng tư.

### `AdminGetUserProfile` / `AdminUpdateUserProfile`

- **Tác nhân:** chỉ `ADMIN`, dựa trên khả năng RBAC đã phê duyệt từ ID-003.
- **Đầu vào:** `userId` đích và cùng hình dạng patch/phản hồi Profile tường minh như luồng của chủ sở
  hữu.
- **Luồng:** thực thi khả năng Admin tại ranh giới application, rồi dùng cùng repository Profile và
  cùng các quy tắc danh sách cho phép. Các thao tác này có thể quản lý một Profile đích đang tồn tại
  nhưng không thay đổi dữ liệu tài khoản hay phân quyền.
- **Đầu ra:** phản hồi an toàn chỉ gồm các trường thuộc sở hữu của Profile; không có trường tài khoản
  riêng tư. Một đích/Profile còn thiếu dùng quy ước không tìm thấy hiện có, thay vì âm thầm bịa ra
  hành vi vòng đời mà đặc tả chưa phê duyệt.

### Thao tác hỗ trợ: ý định tải avatar

Để thoả mãn ranh giới R2 đã phê duyệt mà không chấp nhận URL tuỳ ý, hãy thêm một thao tác đã xác thực
có phạm vi hẹp, ví dụ `POST /api/profile/me/avatar/upload-url`. Nó phát hành một object key do server
tạo và một presigned upload URL ngắn hạn; client sau đó tải trực tiếp lên R2 và gửi tham chiếu mờ qua
thao tác cập nhật Profile đã phê duyệt. Đây là một thao tác hỗ trợ ở tầng hạ tầng, không phải một
tính năng quản lý avatar riêng. Cách đặt tên DTO chính xác tuân theo quy ước API hiện có trong lúc
triển khai.

## Lưu trữ

Toàn bộ lớp lưu trữ của Profile vẫn nằm trong `bkpractice_identity`.

- `ProfileRepository` chỉ dùng bảng `profiles` hiện có và quan hệ nội bộ tới User.
- Giữ cột vật lý `avatar_url` để tương thích, nhưng lưu vào đó một tham chiếu/key đối tượng R2 ổn
  định do server phê duyệt, không bao giờ là một presigned URL hay một URL bên ngoài tuỳ ý. Tên thuộc
  tính trong domain có thể đổi thành `avatarReference` trong khi vẫn giữ tên cột vật lý ở bước tăng
  tiến an toàn với migration đầu tiên.
- Sinh signed URL đọc tại thời điểm trả phản hồi qua `AvatarStorage`; không bao giờ lưu các URL đó.
- Dùng một transaction hoặc chiến lược `INSERT ... ON CONFLICT (user_id) DO NOTHING` cộng với đọc lại
  cho việc khởi tạo trễ. Ràng buộc duy nhất là chốt chặn đồng thời cuối cùng.
- Các cập nhật dùng phép gán trường tường minh, không spread body request/entity. Tham chiếu avatar
  cũ được ghi nhận và việc dọn dẹp chỉ được lên lịch sau khi transaction của Profile commit.
- Các lượt đọc công khai không tạo dòng nào. Việc khởi tạo của chủ sở hữu có thể tạo một dòng, lấy
  giống từ tên chính thức đã được cấp. Các thao tác của Admin không thêm một quy tắc vòng đời tạo trễ
  mới.

## Thay đổi cơ sở dữ liệu

Nền tảng đã chứa sẵn bảng Profile cần thiết, quan hệ một-một với User và độ dài `display_name`. Không
cần bảng Profile mới hay quan hệ xuyên service nào.

Migration khi triển khai nên:

1. Kiểm tra trước các dòng Profile hiện có về độ dài/giá trị trống không hợp lệ của `display_name` và
   các giá trị `avatar_url` cũ không phải tham chiếu R2 đã phê duyệt. Thất bại kèm thông báo khắc
   phục hành động được; không âm thầm viết lại dữ liệu người dùng.
2. Thêm một ràng buộc check có tên của PostgreSQL cho `bio IS NULL OR char_length(bio) <= 1000`.
3. Thêm một check có tên cho `display_name` đã cắt khoảng trắng và không rỗng, nếu dữ liệu hiện có
   vượt qua bước kiểm tra trước.
4. Giữ tính duy nhất của `profiles.user_id`, khoá ngoại tới User và hành vi cascade.

Không thêm cột `studentCode`, email, lớp, khoa, vai trò, trạng thái, tiến độ, bài nộp hay Community
nào. Không đưa vào khoá ngoại hay quan hệ TypeORM xuyên service nào.

## Migration

Tạo một migration TypeORM thuộc sở hữu của Identity, theo ý niệm là
`AddProfileValidationConstraints`, mà không sửa `1700000000000-InitialIdentitySchema.ts`.

### Up

- Chạy bước kiểm tra dữ liệu trước khi thêm các ràng buộc.
- Thêm các check có tên cho bio/display-name.
- Giữ migration idempotent theo quy ước TypeORM của repository.

### Down

- Chỉ gỡ các check có tên theo thứ tự ngược lại.
- Không xoá hay tạo lại bảng Profile hiện có.

Kiểm chứng migration trên một cơ sở dữ liệu PostgreSQL Identity cách ly với các bước chạy, kiểm tra
schema, revert và chạy lại. Nếu dữ liệu production không vượt qua bước kiểm tra trước, hãy dừng lại
và báo cáo thay vì cắt bớt hay xoá các giá trị hồ sơ.

## API

Giữ nguyên các thao tác ở mức khái niệm đã được phê duyệt trong `spec.md`; cách đặt tên controller
chính xác tuân theo quy ước Identity/Gateway hiện có.

| Thao tác                                   | Xác thực                | Thao tác application                                 | Chính sách phản hồi                                                                                 |
| ------------------------------------------ | ----------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /api/profile/me`                      | Access token Bearer     | `GetMyProfile`                                       | Phản hồi an toàn hồ sơ của mình, gồm `userId`, các trường Profile và signed URL avatar được sinh ra |
| `PATCH /api/profile/me`                    | Access token Bearer     | `UpdateMyProfile`                                    | Phản hồi an toàn hồ sơ của mình sau khi cập nhật                                                    |
| `GET /api/users/:userId/profile`           | Công khai               | `GetPublicProfile`                                   | Đúng `displayName`, URL avatar và `bio`; kết quả không khả dụng chung cho đích thiếu/LOCKED/PENDING |
| `GET /api/users/:userId/profile` bởi Admin | Bearer + khả năng Admin | `AdminGetUserProfile`                                | Chỉ phản hồi an toàn gồm các trường thuộc sở hữu của Profile                                        |
| `PATCH /api/users/:userId/profile`         | Bearer + khả năng Admin | `AdminUpdateUserProfile`                             | Phản hồi an toàn gồm các trường thuộc sở hữu của Profile sau khi cập nhật                           |
| `POST /api/profile/me/avatar/upload-url`   | Access token Bearer     | `CreateAvatarUploadIntent` (thao tác adapter hỗ trợ) | Presigned upload URL ngắn hạn và tham chiếu đối tượng mờ đã phê duyệt                               |

Controller chỉ thực hiện việc phân tích ở tầng truyền tải, kiểm tra DTO, gọi use case và ánh xạ phản
hồi/lỗi. Nó không truy cập trực tiếp TypeORM, R2 hay repository tài khoản. Các DTO phản hồi công khai
và riêng tư là hai danh sách cho phép tách biệt, kể cả khi hiện tại chúng chứa các trường Profile
tương tự nhau.

## DTO / Kiểm tra dữ liệu

Tạo các DTO ở tầng presentation theo quy ước đặt tên của repository:

- `UpdateMyProfileRequestDto`: `displayName` tuỳ chọn, tham chiếu avatar/xoá trống tuỳ chọn, `bio`
  tuỳ chọn hoặc `null`; các trường lạ bị pipe toàn cục hiện có từ chối.
- `ProfileResponseDto`: biểu diễn an toàn cho chủ sở hữu/Admin, gồm `userId` ổn định nhưng loại trừ
  thông tin đăng nhập, dữ liệu nhà cung cấp và phần nội bộ của phân quyền.
- `PublicProfileResponseDto`: đúng `displayName`, signed URL/tham chiếu avatar và `bio`.
- `CreateAvatarUploadIntentRequestDto`/phản hồi tương ứng: chỉ metadata nội dung đã được server kiểm
  chứng, đủ để phát hành một presigned upload; không có bucket, key, thông tin xác thực hay redirect
  do người gọi điều khiển.

Trách nhiệm kiểm tra dữ liệu:

- `class-validator`/`ValidationPipe` toàn cục xử lý hình dạng ở tầng truyền tải, kiểu chuỗi, khả năng
  nhận null, việc từ chối trường lạ, và độ dài tối đa (`displayName` 100, `bio` 1.000).
- Tầng application/domain cắt khoảng trắng, bảo toàn Unicode, từ chối tên hiển thị rỗng, và thực thi
  ngữ nghĩa patch tường minh giữa việc bỏ qua và việc gán null.
- `AvatarStorage` kiểm chứng rằng một tham chiếu đã được phát hành cho đúng User đã xác thực, khớp
  định dạng object key R2 đã phê duyệt, và không phải là một URL bên ngoài hay payload path traversal.
- Các DTO không được chứa trường email, MSSV, vai trò, quyền, trạng thái tài khoản, mật khẩu, nhà
  cung cấp hay URL tuỳ ý.

## Phân quyền

- Tái dùng ngữ cảnh định danh đã xác thực của ID-001. Không xây một hệ thống xác thực hay JWT thứ hai
  trong Profile.
- Sinh viên và Giảng viên chỉ được đọc/cập nhật các trường thuộc sở hữu Profile của chính mình.
- Các thao tác của Admin đòi hỏi khả năng vai trò/quyền Admin đã phê duyệt từ ID-003. ID-002 không
  hiện thực RBAC hay giao diện quản lý quyền.
- Một GET công khai chỉ trả về biểu diễn công khai và không cần token. Khả năng hiển thị của tài
  khoản Locked/Pending được xử lý như một kết quả không khả dụng chung, không phải như một phép kiểm
  tra trạng thái bị phơi bày.
- Metadata định danh/vai trò do Gateway suy ra không được chấp nhận từ header do người gọi cung cấp.
  Middleware Gateway hiện có loại bỏ các header định danh giả mạo; các handler được bảo vệ ở phía
  Identity tái dùng cơ chế kiểm chứng/ngữ cảnh phòng thủ nhiều lớp của ID-001.
- Việc phân quyền của Profile không bao giờ cấp quyền truy cập khoá học, lớp, tiến độ, bài nộp hay
  việc kiểm duyệt của Community.

## Messaging / Sự kiện

N/A. ID-002 không có event nghiệp vụ bất đồng bộ nào được phê duyệt và không cần RabbitMQ. Việc dọn
dẹp avatar là mối quan tâm của adapter/lưu trữ và không được tạo một topology event mới chỉ để cho
cân xứng về kiến trúc.

## Realtime

N/A. Việc đọc/cập nhật Profile không cần Socket.IO hay fan-out qua Redis. Việc sinh signed URL và dọn
dẹp là các thao tác lưu trữ, không phải state realtime.

## Adapter hạ tầng

### Adapter Profile dùng TypeORM

Hiện thực adapter `ProfileRepository` trong module hạ tầng Profile của Identity. Nó sở hữu các query
builder, transaction, việc xử lý xung đột, và việc ánh xạ giữa model TypeORM hiện có với đối tượng
domain. Nó không được import datasource/entity của service khác.

### Adapter ngữ cảnh Identity

Tái dùng ranh giới đọc tài khoản của ID-001 cho sự tồn tại của User, tên chính thức đã được cấp,
trạng thái và vai trò. Nếu tính năng cấp tài khoản/import chưa phơi bày phần lưu trữ tên chính thức,
hãy giữ adapter nói rõ về điều kiện tiên quyết đó và để đường khởi tạo thất bại bằng lỗi dữ liệu hiện
có; không bịa ra một cái tên và không nhân bản luồng import Excel trong ID-002.

### Adapter Cloudflare R2

Thêm một hiện thực `AvatarStorage` dựa trên API tương thích S3 của Cloudflare R2. Adapter phải:

- dùng cấu hình `R2_*` phía server đã được kiểm chứng và không bao giờ trả về thông tin xác thực;
- sinh các key do server sở hữu dưới một tiền tố avatar theo từng người dùng;
- phát hành presigned upload URL ngắn hạn với giới hạn kiểu nội dung/kích thước;
- kiểm chứng các tham chiếu hoàn tất theo người dùng/tiền tố và bucket đã phê duyệt;
- sinh signed GET URL ngắn hạn cho các phản hồi công khai/của chính mình;
- lên lịch xoá đối tượng cũ một cách bất đồng bộ sau một khoảng ân hạn được cấu hình, mà không làm
  cho một transaction Profile thành công phụ thuộc vào việc dọn dẹp hoàn tất;
- từ chối các URL bên ngoài trực tiếp và các giá trị bucket/key/lệnh do người gọi cung cấp.

Gói phụ thuộc hiện tại chưa có R2 SDK. Việc chọn phụ thuộc (thông thường là S3 client/presigner của
AWS SDK hoặc một lựa chọn tương đương đã được phê duyệt) là một khâu rà soát phụ thuộc ở thời điểm
triển khai; giai đoạn tài liệu này không cài đặt gì và không sửa `package.json` hay lockfile.

### Cấu hình

Chỉ mở rộng phần kiểm tra biến môi trường của Identity trong lúc triển khai, với các thiết lập R2 bắt
buộc và thất bại sớm, ví dụ endpoint/tài khoản, bucket, access key, secret, TTL của signed URL, kích
thước tải lên và các kiểu nội dung được phép. Tên biến chính xác phải tuân theo phong cách cấu hình
hiện có của repository và phải được thêm vào `.env.example` mà không kèm thông tin xác thực thật.

## Xử lý lỗi

Tái dùng cấu trúc lỗi NestJS/Gateway hiện có và hành vi request/correlation ID.

| Điều kiện ở tầng domain/application                                              | Ánh xạ ở tầng truyền tải                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Thiếu/sai xác thực ở thao tác riêng tư                                           | Quy ước 401 hiện có                                                       |
| Người không phải Admin cập nhật xuyên người dùng                                 | 403; không thay đổi state                                                 |
| Giảng viên/Sinh viên cập nhật xuyên người dùng                                   | 403; không thay đổi state                                                 |
| Thiếu user/Profile hoặc đích công khai `LOCKED`/`PENDING`                        | Kết quả 404/không khả dụng chung, không tiết lộ trạng thái                |
| Trường không hợp lệ, trường bị bảo vệ, trường lạ hoặc tham chiếu R2 không hợp lệ | Quy ước kiểm tra dữ liệu/400 hoặc trường bị cấm hiện có; không đổi state  |
| Thiếu tên chính thức đã được cấp và dùng được                                    | Lỗi dữ liệu hiện có của Identity; không tạo Profile rỗng                  |
| R2 không khả dụng khi tải lên/kiểm chứng tham chiếu/sinh URL đọc                 | Lỗi phụ thuộc chuẩn hoá hiện có; không có tham chiếu Profile treo lơ lửng |
| Lỗi lưu trữ/đua về tính duy nhất                                                 | Lỗi lưu trữ chuẩn hoá hiện có; thử lại an toàn ở nơi phù hợp              |

Không thêm cấu trúc lỗi riêng cho Profile. Không ghi log phần thân request thô, mật khẩu, bearer
token, thông tin xác thực R2 hay signed URL.

## Bảo mật

| Yêu cầu bảo mật đã phê duyệt                 | Nơi thực thi                                                                                                                                 |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| ID-002-SR-001 Quyền sở hữu                   | Ngữ cảnh auth của Gateway/Identity cộng với chính sách tác nhân ở tầng application; repository không bao giờ chọn định danh tác nhân từ body |
| ID-002-SR-002 Chống gán hàng loạt            | Danh sách cho phép ở DTO request và phép gán trường tường minh ở tầng application                                                            |
| ID-002-SR-003 Dữ liệu tài khoản bị kiểm soát | Model domain và các DTO phản hồi tách biệt; repository Profile không có phương thức cập nhật trường tài khoản                                |
| ID-002-SR-004 Riêng tư ở phần công khai      | `PublicProfileResponseDto`, mapper công khai và việc xử lý trạng thái không khả dụng chung                                                   |
| ID-002-SR-005 Toàn vẹn của avatar            | Object key do adapter R2 phát hành, kiểm chứng theo tiền tố từng người dùng và không lưu URL bên ngoài                                       |
| ID-002-SR-006 An toàn dữ liệu đầu vào        | Pipe class-validator toàn cục cộng với việc chuẩn hoá/bất biến ở tầng domain                                                                 |
| ID-002-SR-007 Ghi log an toàn                | Ghi log kèm request ID hiện có, có che thông tin tường minh; không ghi log thông tin xác thực/token/bí mật R2                                |
| ID-002-SR-008 Cách ly service                | Chỉ dùng datasource/repository của Identity; không truy cập cơ sở dữ liệu của Learning, Submission hay Community                             |

Signed URL phải ngắn hạn và chỉ được sinh cho một đối tượng đã phê duyệt. Cơ sở dữ liệu lưu tham
chiếu đối tượng ổn định, không lưu một URL công khai dùng được. Việc dọn dẹp R2 là bất đồng bộ và
không được làm transaction cập nhật Profile bị hoàn tác.

## Chiến lược kiểm thử

Các test phải truy vết tới các tiêu chí nghiệm thu đã Approved và bảo toàn hành vi hiện có của ID-001.

### Unit test

- Kiểm tra ở tầng domain cho biên 100 ký tự của tên hiển thị, biên 1.000 ký tự của bio, việc cắt
  khoảng trắng, việc bảo toàn Unicode, việc xoá trống tường minh các trường cho phép null, và các
  trường bị bỏ qua trong patch.
- Chính sách trường được phép từ chối email, MSSV, vai trò, quyền, trạng thái, mật khẩu, nhà cung cấp
  và các trường lạ.
- Chính sách hiển thị công khai ẩn trạng thái `LOCKED`/`PENDING` và chỉ tạo ra tập trường công khai.
- Việc khởi tạo trễ đòi hỏi một tên chính thức và là idempotent tại ranh giới use case.

### Test tầng application

- `GetMyProfile` tạo một Profile từ tên chính thức ở lần đọc đầu tiên và trả về nó ở các lần sau.
- `UpdateMyProfile` chỉ cập nhật các trường đã cung cấp, giữ nguyên các trường bị bỏ qua, và hỗ trợ
  xoá trống avatar/bio mà không xoá User.
- Truy cập của chủ sở hữu là Sinh viên/Giảng viên thì thành công; cập nhật xuyên người dùng bị cấm.
- Việc đọc/cập nhật đích của Admin chỉ thành công khi có khả năng Admin đã phê duyệt, và vẫn không
  thể thay đổi các trường tài khoản bị kiểm soát.
- Các lượt đọc công khai trả về đúng danh sách cho phép, hành vi thiếu/không khả dụng chung, và việc
  ánh xạ signed URL cho avatar.
- Lỗi kiểm chứng R2 để nguyên state của Profile; việc dọn dẹp avatar cũ chỉ được lên lịch sau khi
  commit và không làm thất bại lần cập nhật.

### Test lưu trữ/integration

- Schema Profile hiện có bảo toàn tính duy nhất một-một, cascade nội bộ tới User, và các trường cho
  phép null.
- Migration thêm/gỡ được các check có tên và từ chối dữ liệu có sẵn không hợp lệ mà không cắt bớt dữ
  liệu.
- Các lượt đọc/cập nhật lần đầu đồng thời tạo ra nhiều nhất một Profile và các phản hồi thành công
  tương đương nhau.
- Repository Profile không bao giờ phát SQL tới cơ sở dữ liệu của service khác.

### Test API/Gateway

- Đường riêng tư `/api/profile/me` đòi hỏi một Bearer token hợp lệ.
- Chỉ đúng hình dạng công khai `GET /api/users/:userId/profile` được bỏ qua xác thực ở Gateway;
  `PATCH`, thao tác ý định tải lên, và các đường `/api/users`/`/api/profile` khác vẫn được bảo vệ.
- Danh sách cho phép ở DTO từ chối các trường bị bảo vệ/lạ, và phản hồi không bao giờ chứa mật
  khẩu/bản băm, email, MSSV, vai trò, quyền, trạng thái, dữ liệu refresh hay nhà cung cấp.
- Phản hồi công khai cho tài khoản locked/pending không tiết lộ trạng thái tài khoản.
- Swagger mô tả các thao tác profile đã phê duyệt và không phơi bày các trường lưu trữ nội bộ.

### Test bảo mật/ghi log

- Các nỗ lực gán hàng loạt và giả mạo header định danh đều thất bại.
- Các URL avatar bên ngoài tuỳ ý, key/bucket R2 do người gọi điều khiển, và các tham chiếu path
  traversal đều bị từ chối.
- Việc thu thập log/lỗi xác nhận không phát ra mật khẩu, token, signed URL, thông tin xác thực R2 hay
  trường tài khoản nhạy cảm nào.

## Khả năng quan sát

- Tái dùng `RequestIdMiddleware`/correlation ID và việc ghi log lỗi chuẩn hoá hiện có.
- Ghi lại thao tác, service đích, phân loại tác nhân và kết quả; không bao giờ ghi lại bí mật của
  profile, thông tin access/refresh, signed URL hay thông tin xác thực R2.
- Chỉ thêm các metric vận hành có giới hạn nếu quy ước metric hiện có đã tồn tại; các tín hiệu hữu
  ích là xung đột khi khởi tạo Profile, lỗi kiểm tra dữ liệu, lỗi phụ thuộc R2 và lỗi dọn dẹp. Không
  thêm một stack metric mới cho ID-002.

## Truy vết yêu cầu

| Yêu cầu           | Đường triển khai                                                                            | Cách kiểm chứng chính                |
| ----------------- | ------------------------------------------------------------------------------------------- | ------------------------------------ |
| ID-002-FR-001     | Ràng buộc duy nhất `profiles.user_id` hiện có + `ProfileRepository`                         | Test schema/integration; AC-012      |
| ID-002-FR-002     | Khởi tạo nguyên tử ở `GetMyProfile`/`UpdateMyProfile` + tên chính thức từ ngữ cảnh Identity | Test tầng application; AC-002        |
| ID-002-FR-003     | `GetMyProfile` + route controller được bảo vệ                                               | Test API; AC-001                     |
| ID-002-FR-004–005 | DTO patch tường minh, chính sách domain và use case cập nhật                                | Test unit/API; AC-003–004            |
| ID-002-FR-006     | Danh sách cho phép của aggregate Profile và API cập nhật của repository                     | Test bảo mật/API; AC-006             |
| ID-002-FR-007–009 | `GetPublicProfile` + mapper công khai + route hẹp ở Gateway                                 | Test API/quyền riêng tư; AC-008–009  |
| ID-002-FR-010–011 | Chính sách khả năng Admin và chính sách chỉ-chủ-sở-hữu cho Giảng viên/Sinh viên             | Test phân quyền; AC-010–011          |
| ID-002-FR-012–013 | Adapter R2 `AvatarStorage`, ý định tải lên và việc kiểm chứng                               | Test R2/API; AC-005, AC-013, AC-013a |
| ID-002-FR-014     | Ranh giới domain/entity/repository chỉ trong Identity                                       | Test kiến trúc/integration; AC-014   |
| ID-002-FR-015     | Ràng buộc duy nhất cộng với tìm-hoặc-tạo trong transaction                                  | Test đồng thời; AC-012               |
| ID-002-FR-016     | Ngữ nghĩa patch cho phép null và việc cách ly aggregate User                                | Test application/API; AC-004         |

| Yêu cầu bảo mật   | Đường thực thi/kiểm thử                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- |
| ID-002-SR-001–003 | Ngữ cảnh auth, chính sách Admin, danh sách cho phép trường, và test DTO phản hồi bị kiểm soát |
| ID-002-SR-004–005 | Mapper công khai, kết quả không khả dụng chung, và test tham chiếu đối tượng R2               |
| ID-002-SR-006–007 | Test kiểm tra dữ liệu/tuần tự hoá và test log đã che thông tin                                |
| ID-002-SR-008     | Rà soát phụ thuộc datasource/repository và test integration về SQL                            |

## Các file dự kiến thay đổi

Đây chỉ là các thay đổi ở thời điểm triển khai; không file nào bên dưới được tạo hay sửa ở giai đoạn
lập kế hoạch này.

### REUSE

- `apps/identity-service/src/modules/users/entities/profile.entity.ts` với vai trò model lưu trữ
  Profile hiện có, giữ lại quan hệ nội bộ tới User và cột vật lý `avatar_url`.
- `apps/identity-service/src/modules/users/entities/user.entity.ts` cho quan hệ User hiện có và từ
  vựng trạng thái tài khoản, cộng với ranh giới đọc định danh/tài khoản đã xác thực của ID-001.
- `apps/identity-service/src/modules/identity.entities.ts`
- `apps/identity-service/src/database/data-source.ts`
- `libs/common/src/bootstrap.ts`
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` cho việc chuyển tiếp route tới Identity hiện có.

### MODIFY

- `apps/identity-service/src/modules/users/entities/profile.entity.ts`: phơi bày giá trị avatar đã
  lưu như một tham chiếu/key R2 ổn định và giữ nguyên ánh xạ schema hiện có.
- `apps/identity-service/src/identity-service.module.ts`: import module tính năng Profile và gắn các
  adapter của nó ở composition root.
- `libs/config/src/environment.ts`: kiểm chứng các thiết lập R2 bắt buộc của Identity trong lúc triển
  khai.
- `.env.example`: ghi các placeholder cho endpoint/bucket/thông tin xác thực R2, TTL của URL và giới
  hạn tải lên, không kèm bí mật thật.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts`: chỉ cho phép đúng route GET hồ sơ công khai
  đi qua mà không cần token; giữ mọi thao tác Profile/User riêng tư ở trạng thái được bảo vệ.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts`: chỉ sửa nếu cần thay đổi hành vi phản
  hồi/header cho signed URL của avatar; ngoài ra nên tái dùng nguyên các tiền tố route hiện có.

### CREATE

- `apps/identity-service/src/modules/profiles/profile.module.ts`
- `apps/identity-service/src/modules/profiles/domain/` — chính sách value/đối tượng của Profile, các
  bất biến và các lỗi độc lập với framework.
- `apps/identity-service/src/modules/profiles/application/ports/` — các port ProfileRepository,
  IdentityProfileContext và AvatarStorage.
- `apps/identity-service/src/modules/profiles/application/use-cases/` — đọc/cập nhật hồ sơ của mình,
  đọc hồ sơ công khai, các thao tác trên đích của Admin, và thao tác hỗ trợ ý định tải avatar.
- `apps/identity-service/src/modules/profiles/infrastructure/persistence/` — adapter repository
  TypeORM và mapper giữa lớp lưu trữ với domain.
- `apps/identity-service/src/modules/profiles/infrastructure/storage/` — adapter Cloudflare R2.
- `apps/identity-service/src/modules/profiles/presentation/` — controller, các DTO, các mapper phản
  hồi và phần tích hợp với ngữ cảnh đã xác thực hiện có.
- `apps/identity-service/src/database/migrations/*-AddProfileValidationConstraints.ts`
- Các test Profile tập trung ở mức unit, application, lưu trữ, adapter R2 và API/Gateway, theo quy
  ước test đã thiết lập của repository.

### REMOVE

Không có. ID-002 không gỡ bỏ hay thay thế controller/service Auth của ID-001, entity User, hay các
DTO của Authentication.

## Thứ tự triển khai

1. Xác nhận lại đặc tả ID-002 đã Approved, kiến trúc Identity và contract ngữ cảnh đã xác thực của
   ID-001; kiểm chứng rằng ranh giới cấp tài khoản có thể cung cấp tên chính thức.
2. Thêm đối tượng domain Profile, các bất biến, các lỗi chính sách và ba port thật.
3. Điều chỉnh model lưu trữ/ngữ nghĩa thuộc tính của Profile hiện có mà không thay đổi quyền sở hữu;
   giữ cột vật lý `avatar_url` làm cột tham chiếu R2 ổn định.
4. Hiện thực repository TypeORM cho Profile cùng hành vi khởi tạo trễ/cập nhật nguyên tử.
5. Thêm và kiểm chứng migration của Identity cho các check của Profile; kiểm tra SQL và chạy các test
   migration/revert cách ly.
6. Thêm cấu hình R2 và adapter `AvatarStorage`, bao gồm hành vi ý định tải lên, đọc có ký, và dọn dẹp
   sau khi commit. Chỉ thêm SDK nào đã được xác nhận là cần thiết khi triển khai.
7. Hiện thực `GetMyProfile`, `UpdateMyProfile`, `GetPublicProfile` và các thao tác trên đích của Admin.
8. Thêm các DTO, mapper phản hồi, controller Profile và phần nối dây composition root của module
   Identity.
9. Căn chỉnh việc so khớp hồ sơ công khai ở Gateway trong khi giữ mọi route Profile/User khác ở trạng
   thái được bảo vệ; kiểm chứng route proxy hiện có vẫn không đổi.
10. Thêm các test unit, application, lưu trữ, adapter R2, API/Gateway và bảo mật.
11. Cập nhật Swagger của Identity và `.env.example` cho contract API/cấu hình đã phê duyệt.
12. Chạy các lệnh kiểm chứng pnpm liên quan và đối chiếu mọi FR, SR và AC với đặc tả này.

## Phụ thuộc

- **ID-001 Authentication:** điều kiện tiên quyết cho định danh đã xác minh, trạng thái tài khoản, ID
  người dùng và ngữ cảnh `/auth/me`. Profile không được nhân bản logic token/phiên của nó.
- **ID-003 RBAC:** cung cấp khả năng Admin đã phê duyệt dùng cho các thao tác Profile xuyên người
  dùng; ID-002 tiêu thụ nó nhưng không hiện thực RBAC.
- **Contract cấp tài khoản/import:** phải phơi bày giá trị `họ tên` chính thức đã import cho việc
  khởi tạo Profile trễ. Việc phân tích Excel và cấp tài khoản sinh viên vẫn nằm ngoài ID-002.
- **Cấu hình/thông tin xác thực Cloudflare R2:** cần cho ý định tải lên, việc kiểm chứng tham chiếu
  đã phê duyệt và các signed URL đọc. R2 vẫn là một adapter bên ngoài, không phải cơ sở dữ liệu của
  Identity.
- **API Gateway:** việc chuyển tiếp route tới Identity hiện có được tái dùng; chỉ metadata xác thực
  cho đúng route hồ sơ công khai là cần căn chỉnh.

## Rủi ro

- **Thiếu nguồn cung cấp tên chính thức:** entity `User` hiện tại chưa phơi bày tên chính thức đã
  import. Không có contract đọc từ quy trình cấp tài khoản đã phê duyệt thì AC-002 không kiểm chứng
  được; hãy dừng hướng đó lại thay vì bịa ra một tên hiển thị hoặc hiện thực import Excel ở đây.
- **Giá trị avatar cũ:** dữ liệu `avatar_url` hiện có có thể là các URL bên ngoài. Bước kiểm tra
  trước của migration phải thất bại một cách an toàn và đòi hỏi khắc phục, thay vì phơi bày hoặc âm
  thầm viết lại chúng.
- **Đối tượng R2 mồ côi khi dọn dẹp:** việc dọn dẹp bất đồng bộ có thể để lại các đối tượng mồ côi
  tạm thời sau khi một worker sập. Hãy cấu hình một chính sách ân hạn/vòng đời có giới hạn và giám
  sát các lần dọn dẹp thất bại; đừng chặn việc cập nhật Profile bởi một thao tác xoá best-effort.
- **Rò rỉ trạng thái ở phần công khai:** mọi đích công khai bị thiếu, bị khoá và đang chờ duyệt đều
  phải dùng cùng một phản hồi không khả dụng chung.
- **Sai sót khiến Gateway bị đi vòng:** cho phép rộng `/api/users` hay `/api/profile` sẽ phơi bày các
  thao tác riêng tư. Hãy giữ bộ so khớp công khai ở dạng chính xác và có test bao phủ.
- **Thứ tự với RBAC:** các thao tác của Admin không kiểm chứng được cho tới khi khả năng ID-003 đã
  phê duyệt sẵn sàng; các thao tác của chủ sở hữu/công khai vẫn kiểm thử được độc lập.
- **Tương thích schema:** việc chuyển đổi cột `bio text` hiện có là không cần thiết; hãy dùng một bất
  biến ở tầng ứng dụng cộng với một migration check có tên, để dữ liệu hiện có không bị cắt bớt.

## Tuân thủ kiến trúc

- Profile được triển khai bên trong một feature module của Identity theo Clean Architecture; không tạo Profile
  Service nào và không chuyển entity User/Profile nào vào `libs/`.
- Tầng Presentation chỉ xử lý mối quan tâm HTTP/DTO/Swagger và gọi đúng một thao tác application cho
  mỗi request. Nó không chứa TypeORM, R2 SDK hay quy tắc nghiệp vụ về tài khoản.
- Các use case ở tầng application điều phối các port ProfileRepository, IdentityProfileContext và
  AvatarStorage, đồng thời thực thi chính sách tác nhân/trường thông qua các service của
  domain/application.
- Mã ở tầng domain độc lập với framework và sở hữu các bất biến của Profile, ngữ nghĩa patch và chính
  sách hiển thị. Nó không import các hiện thực NestJS, TypeORM, JWT, Redis, HTTP hay R2.
- Tầng infrastructure sở hữu việc ánh xạ TypeORM, transaction, việc presign/signed URL của R2 và các
  adapter dọn dẹp. Composition root của Nest gắn các port với adapter cụ thể.
- Hành vi Gateway hiện có vẫn là hạ tầng ở biên: nó định tuyến, xác minh access token và chỉ đánh dấu
  đúng route GET hồ sơ công khai là không cần xác thực. Nó không truy vấn Identity và không chứa logic
  nghiệp vụ của Profile.
- Identity chỉ ghi vào `bkpractice_identity`; không có truy vấn SQL, khoá ngoại, repository hay thực
  thể nghiệp vụ dùng chung xuyên service nào. `className`, tiến độ học tập, lịch sử nộp bài và dữ
  liệu Community vẫn nằm ngoài kế hoạch này.
- Kế hoạch không đưa vào event RabbitMQ, state nghiệp vụ trên Redis, CQRS, Event Sourcing, nhà cung
  cấp định danh mới hay tính năng hồ sơ mạng xã hội nào. Mọi file và adapter được đề xuất đều truy vết
  được tới một yêu cầu ID-002 đã Approved hoặc một ranh giới kỹ thuật đã được ghi nhận.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó phải luôn phụ thuộc vào `spec.md` đã Approved; các công việc triển
> khai được cố ý hoãn sang giai đoạn SDD tiếp theo.
