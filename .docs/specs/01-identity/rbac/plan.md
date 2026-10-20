# ID-003 Kế hoạch triển khai RBAC

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-01`.

Kế hoạch này dựa trên phiên bản `0.3` đã Approved của đặc tả ID-003, và được bổ sung ngày
`2026-09-29` cho bản sửa đổi `0.4` ở mục [Bổ sung cho bản sửa đổi 0.4](#bổ-sung-cho-bản-sửa-đổi-04). Nó là một tài liệu thiết kế cho
các công việc triển khai; nó không hiện thực RBAC và không thay đổi đặc tả.

## Đặc tả liên quan

- [ID-003 Kiểm soát truy cập theo vai trò](./spec.md)
- Trạng thái: `Approved`
- Phiên bản đã Approved: `0.3`
- Ngày phê duyệt: `2026-09-01`

Đặc tả vẫn là nguồn chân lý cho từ vựng ba vai trò, hành vi nhiều vai trò, chính sách quản lý vai
trò, việc bảo vệ quản trị viên, các yêu cầu về quyền riêng tư/bảo mật và các loại trừ. Kế hoạch này
không thêm vai trò, danh mục quyền, yêu cầu endpoint hay khả năng IAM nào.

## Service đích

Service: Identity Service

State và policy của RBAC vẫn nằm trong `bkpractice_identity`. Các request quản lý vai trò công khai
đi tới Identity qua API Gateway. Learning, Submission và Community vẫn chịu trách nhiệm cho các kiểm
tra hành động/tài nguyên/sở hữu của riêng mình và không nhận một phụ thuộc repository hay cơ sở dữ
liệu vào Identity.

Gateway hiện có đã chuyển tiếp `/api/roles` tới Identity và bảo vệ các route `/api` không công khai.
Kế hoạch chỉ thêm ranh giới RBAC ở phía Identity và những điều chỉnh hẹp về contract principal tin
cậy mà thiết kế xác thực đã phê duyệt đòi hỏi.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture** (theo
[ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md)).

RBAC tuân theo chiều phụ thuộc của Identity:

```text
presentation -> application -> domain
infrastructure ----implements----^ các port
```

Tính năng được tổ chức tiệm tiến trong khu vực `apps/identity-service/src/modules/rbac/` hiện có.
Các tầng được đưa vào vì việc gán vai trò, đánh giá quyền và bảo vệ quản trị viên cuối cùng là hành
vi thật; không có kế hoạch viết lại cấu trúc thư mục trên toàn repository hay thêm tầng trừu tượng
rỗng nào.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại

- `apps/identity-service/src/modules/rbac/entities/role.entity.ts` đã định nghĩa enum `STUDENT`,
  `LECTURER`, `ADMIN` và quan hệ eager giữa Role và Permission.
- `apps/identity-service/src/modules/rbac/entities/permission.entity.ts` đã định nghĩa một cột mã
  quyền duy nhất.
- `apps/identity-service/src/modules/users/entities/user.entity.ts` đã cung cấp quan hệ nhiều-nhiều
  giữa User và Role qua `user_roles`; khoá chính tổ hợp của nó ngăn các phép gán trùng lặp.
- `apps/identity-service/src/modules/identity.entities.ts` và
  `apps/identity-service/src/database/data-source.ts` đã đăng ký các model lưu trữ RBAC chỉ trong
  Identity.
- `apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts` đã seed ba
  vai trò tĩnh và tạo `user_roles` cùng `role_permissions` với khoá ngoại nội bộ và tính duy nhất tổ
  hợp.
- `apps/identity-service/src/modules/auth/auth.service.ts` hiện nạp các vai trò cho claim của token;
  ID-003 phải tái dùng contract token đó của ID-001 và không được tạo một bộ phát hành token thứ hai.
- `apps/identity-service/src/identity-service.module.ts` import `AuthModule` nhưng chưa có feature
  module RBAC. Chưa có controller, guard, use case, repository port hay bộ test tập trung cho RBAC.
- `apps/api-gateway/src/auth/gateway-auth.middleware.ts` xác minh access token BKPractice, loại bỏ
  `x-auth-user-id`/`x-auth-roles` do người gọi cung cấp, và chuyển tiếp các giá trị tin cậy từ claim
  đã xác minh. `/api/roles` đã được `gateway-proxy.service.ts` định tuyến.
- Phần bootstrap toàn cục đã cung cấp việc kiểm tra dữ liệu, whitelist/từ chối trường lạ, và các quy
  ước Swagger.

### Phân loại thay đổi

| Phân loại | Cách xử lý dự kiến                                                                                                                                                                                                                                                                     |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Các model lưu trữ Role/Permission/User hiện có, schema `user_roles` và `role_permissions`, datasource/registry entity của Identity, ngữ cảnh token/xác thực của ID-001, việc làm sạch header và định tuyến `/api/roles` của Gateway, bootstrap kiểm tra dữ liệu/lỗi/Swagger dùng chung |
| MODIFY    | `role.entity.ts` chỉ ở mức cần thiết để tham chiếu tới một định nghĩa vai trò chuẩn tắc độc lập với framework; `identity-service.module.ts` cho phần composition của RBAC; adapter auth/principal hiện có, chỉ khi ID-001 chưa phơi bày một port ngữ cảnh tương thích                  |
| CREATE    | Các chính sách/kiểu của domain RBAC, các port và use case của tầng application, adapter TypeORM cho việc gán vai trò, phần tích hợp guard/decorator principal tin cậy, controller/DTO của RBAC, phần nối dây module, contract phân quyền kỹ thuật nếu chưa có, và các test tập trung   |
| REMOVE    | Không có. Kế hoạch này không gỡ bỏ Authentication, Profile hay hành vi lưu trữ vai trò hiện có.                                                                                                                                                                                        |

Các entity TypeORM nông hiện tại vẫn là model lưu trữ trong quá trình căn chỉnh tiệm tiến này. Chúng
không bị sao chép vào `libs/` và không bị thay thế bằng một cuộc viết lại clean architecture trên
toàn repository.

## Thay đổi ở tầng domain

### Các khái niệm chuẩn tắc về vai trò và quyền

- Tái dùng từ vựng `STUDENT`, `LECTURER` và `ADMIN` hiện có dưới dạng một kiểu domain độc lập với
  framework. Nếu enum hiện tại vẫn nằm trong file lưu trữ, hãy đưa vào một định nghĩa domain nhỏ và
  ánh xạ enum TypeORM sang nó; không tạo các enum vai trò khác biệt nhau ở các service khác.
- Biểu diễn các định danh quyền dưới dạng giá trị `resource:action` ổn định. Một bộ phân tích/kiểu
  giá trị nhỏ có thể từ chối các định danh sai định dạng, nhưng ID-003 không seed một danh mục đầy đủ
  cho các tính năng tương lai.
- Dùng một value/contract `AuthorizationPrincipal` chứa `userId` cục bộ đã xác minh, ảnh chụp vai trò
  tin cậy, và ngữ cảnh trạng thái tài khoản mà ranh giới phân quyền cần. Nó không được chứa mật khẩu,
  thông tin refresh, token của nhà cung cấp hay dữ liệu vai trò do người gọi cung cấp.
- Dùng một kết quả `AuthorizationDecision` với cho phép/từ chối và một phân loại lý do an toàn. Nó
  không phải một kiểu phản hồi HTTP và không phơi bày các bảng quyền nội bộ.

### Chính sách và bất biến của domain

Chỉ tạo hành vi chính sách mà đặc tả đã Approved yêu cầu:

- `STUDENT`, `LECTURER` và `ADMIN` là các vai trò định sẵn tĩnh; không tạo, xoá vai trò lúc chạy và
  không có vai trò tuỳ biến.
- Một User có thể giữ nhiều vai trò. Các khả năng hiệu lực là hợp của các quyền được ánh xạ tường
  minh tới những vai trò đó; không vai trò nào có được khả năng ngầm.
- Chính sách bị thiếu, không xác định hay mơ hồ thì mặc định từ chối.
- `ADMIN` là tác nhân duy nhất được phép gọi các thao tác quản lý vai trò.
- Việc gán/thu hồi xuyên người dùng chỉ nhắm tới `STUDENT` hoặc `LECTURER`. Việc cấp `ADMIN` cho một
  User khác luôn bị từ chối.
- Một Admin chỉ được từ bỏ vai trò `ADMIN` của chính mình khi vẫn còn một Admin khác. Admin cuối cùng
  không thể bị gỡ bỏ. Phép kiểm tra này là một bất biến của domain và cũng phải được lớp lưu trữ bảo
  vệ trong transaction.
- Việc gán một vai trò đã có và thu hồi một vai trò vắng mặt là các thao tác thành công idempotent.
- Trạng thái tài khoản không bị RBAC định nghĩa lại. Hành vi `LOCKED`/`PENDING` vẫn do ID-001 quản
  lý; RBAC không thể kích hoạt lại hay đi vòng qua nó.
- Đầu vào của Profile và Authentication không thể thay đổi state của vai trò hay quyền.
- Quyền sở hữu tài nguyên và các quy tắc riêng của tính năng vẫn nằm ở service sở hữu; một vai trò
  rộng không bao giờ thay thế các phép kiểm tra đó.

Tầng domain không import bất kỳ hiện thực nào của NestJS, TypeORM, JWT, Gateway, HTTP hay cơ sở dữ
liệu.

## Tầng application / Use case

Chỉ triển khai các thao tác mà đặc tả đã Approved yêu cầu. Tên gọi mang tính khái niệm và phải tuân
theo quy ước của repository khi triển khai.

### `GetUserRoles`

- **Tác nhân:** `ADMIN` đã xác thực.
- **Đầu vào:** `userId` đích từ route; định danh/vai trò của tác nhân từ principal tin cậy.
- **Luồng:** phân quyền tác nhân, nạp các phép gán vai trò hiện tại của User đích qua một port, và
  ánh xạ sang một danh sách vai trò an toàn.
- **Đầu ra:** chỉ `userId` đích và tên các vai trò định sẵn; không kèm mật khẩu, token, phần nội bộ
  của bảng quyền hay bí mật tài khoản.
- **Lỗi:** chưa xác thực, bị từ chối vì không phải Admin, hoặc không tìm thấy đích, theo các quy ước
  hiện có.

### `AssignRoleToUser`

- **Tác nhân:** `ADMIN` đã xác thực.
- **Đầu vào:** `userId` đích và một giá trị vai trò, giới hạn trong `STUDENT` hoặc `LECTURER`.
  Request không được mang `actorId`, vai trò của tác nhân, quyền, trạng thái tài khoản hay claim của
  token.
- **Luồng:** phân quyền tác nhân, kiểm tra đích và vai trò, áp dụng chính sách không-cấp-`ADMIN`, và
  chèn phép gán một cách idempotent trong một transaction của Identity.
- **Đầu ra:** state gán vai trò kết quả ở dạng an toàn.
- **Lỗi:** vai trò không hợp lệ, không tìm thấy đích, tác nhân bị từ chối, hoặc vi phạm chính sách.
  Một phép gán đã tồn tại thì trả về thành công mà không tạo bản trùng lặp.

### `RevokeRoleFromUser`

- **Tác nhân:** `ADMIN` đã xác thực.
- **Đầu vào:** `userId` đích và vai trò. Các thao tác xuyên người dùng có thể thu hồi `STUDENT` hoặc
  `LECTURER`. Việc một Admin tự thu hồi `ADMIN` là ngoại lệ được kiểm soát duy nhất.
- **Luồng:** phân quyền tác nhân, khoá phép kiểm tra tính liên tục của quản trị viên, thực thi bất
  biến về Admin cuối cùng, và gỡ phép gán một cách idempotent.
- **Đầu ra:** state gán vai trò kết quả ở dạng an toàn.
- **Lỗi:** bị từ chối vì không phải Admin, vi phạm bảo vệ Admin cuối cùng, vai trò không hợp lệ, hoặc
  không tìm thấy đích. Việc thu hồi một `STUDENT`/`LECTURER` vắng mặt là thành công và không tạo thay
  đổi không liên quan nào.

### `EvaluateAuthorization` (thao tác application nội bộ)

- **Mục đích:** cung cấp một seam domain/application duy nhất để đánh giá một principal tin cậy đối
  chiếu với một quyền yêu cầu và chính sách tính năng, ở những chỗ chính Identity sở hữu quyết định.
- **Đầu vào:** principal đã xác minh, định danh quyền ổn định được yêu cầu, và kết quả tuỳ chọn về
  quyền sở hữu/tài nguyên do tính năng cung cấp.
- **Đầu ra:** quyết định cho phép/từ chối kèm một phân loại an toàn.
- **Ranh giới:** đây không phải một endpoint `/authorize` công khai và không trở thành một dịch vụ
  quyết định từ xa cho mọi request. Các service phía sau tiêu thụ contract principal tin cậy và tự
  thực thi chính sách tài nguyên của mình; một kế hoạch tính năng tương lai chỉ có thể thêm một phép
  kiểm tra REST nội bộ đã phê duyệt nếu hành vi của nó thực sự cần tra cứu quyền ở phía Identity tại
  thời điểm đó.

### Các port của tầng application

Chỉ đưa vào các seam thật:

| Port                             | Trách nhiệm                                                                                                              | Adapter                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| `RbacRepository`                 | Đọc vai trò đích/quyền hiệu lực; gán/thu hồi vai trò idempotent; đếm số Admin; thực thi các thay đổi vai trò được bảo vệ | Adapter TypeORM trong tầng hạ tầng của Identity       |
| `IdentityAccountContext`         | Tái dùng ngữ cảnh principal/trạng thái tài khoản đã xác minh của ID-001 và dữ liệu về sự tồn tại của user đích           | Ngữ cảnh ID-001 hiện có hoặc một adapter Identity hẹp |
| `TransactionRunner`              | Điều phối phép kiểm tra Admin cuối cùng và việc thay đổi vai trò một cách nguyên tử                                      | Adapter dùng `DataSource` của TypeORM                 |
| `AuthorizationPrincipalProvider` | Dịch ngữ cảnh Gateway/ID-001 tin cậy thành một principal độc lập với framework                                           | Adapter guard/ngữ cảnh ở phía Identity                |

Không thêm base repository chung, bus CQRS, policy engine, event store hay service vai trò riêng.

## Lưu trữ

Toàn bộ lớp lưu trữ của RBAC vẫn nằm trong `bkpractice_identity`.

- Tái dùng `roles`, `permissions`, `user_roles` và `role_permissions` thông qua một adapter
  `RbacRepository` chuyên biệt. Không import datasource hay entity của service khác.
- Bảo toàn các ràng buộc duy nhất hiện có về tên vai trò và mã quyền. Các khoá chính tổ hợp trên
  `user_roles` và `role_permissions` đảm bảo không có phép gán/ánh xạ trùng lặp.
- Dùng các truy vấn/cập nhật tường minh thay vì spread đối tượng request vào entity TypeORM.
- Việc gán vai trò dùng `INSERT ... ON CONFLICT DO NOTHING` (hoặc tương đương của repository) để
  thành công idempotent. Việc thu hồi dùng một lệnh xoá có điều kiện và trả về state kết quả.
- Phép kiểm tra Admin cuối cùng và việc Admin tự thu hồi được thực hiện trong cùng một transaction.
  Hãy khoá các dòng vai trò/phép gán Admin liên quan hoặc dùng một chiến lược tuần tự hoá an toàn
  tương đương ở mức cơ sở dữ liệu, để các lần thu hồi đồng thời không thể làm cơ sở dữ liệu không còn
  Admin nào.
- Việc đánh giá quyền hiệu lực đọc các ánh xạ vai trò-quyền do Identity sở hữu. Một quyền chưa được
  gán thì tự nó không thể phân quyền cho một User. Không bịa ra một danh mục quyền đầy đủ cho các
  tính năng tương lai ở đây.
- Các sinh viên đã import hiện có nhận `STUDENT` qua luồng cấp tài khoản tin cậy mà ID-001 mô tả;
  RBAC không phân tích Excel và không tạo tài khoản.
- Các thay đổi vai trò không viết lại các access token đang tồn tại. ID-001 kiểm soát việc phát hành
  và hết hạn của token; các token mới phản ánh state vai trò hiện tại.

## Thay đổi cơ sở dữ liệu

Không cần thay đổi schema nào cho hành vi ID-003 v1 đã phê duyệt. Nền tảng hiện có đã cung cấp:

- các giá trị enum vai trò tĩnh `STUDENT`, `LECTURER`, `ADMIN`;
- tên vai trò và mã quyền duy nhất;
- các quan hệ nhiều-nhiều `user_roles` và `role_permissions`;
- tính duy nhất tổ hợp ngăn các phép gán trùng lặp; và
- chỉ có khoá ngoại nội bộ của Identity.

Việc triển khai không được thêm vai trò, bảng vai trò-quyền ở service khác, khoá ngoại xuyên service,
bảng lịch sử vai trò hay dữ liệu thiết bị/phiên. Các dòng quyền tĩnh cho các hành động cụ thể của
Learning/Submission/Community chỉ được đưa vào bởi các kế hoạch tính năng đã phê duyệt riêng của
chúng. Nếu việc khảo sát phát hiện các ràng buộc còn thiếu khiến bất biến đã Approved không thể thực
hiện được, hãy dừng lại và báo cáo xung đột schema thay vì âm thầm thay đổi nó.

## Migration

N/A cho bản triển khai v1 đã lập kế hoạch. Không sửa
`apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts` và không tạo
một migration rỗng chỉ để đại diện cho kế hoạch.

Trong lúc triển khai, hãy kiểm chứng rằng migration Identity hiện có áp dụng được với
`synchronize: false`, seed ba vai trò, và bảo toàn các ràng buộc của `user_roles`/`role_permissions`.
Mọi chỉnh sửa schema cần thiết phải là một migration Identity được rà soát riêng và không được đưa
vào một cách ngầm định bởi mã RBAC.

## API

Gateway đã định tuyến `/api/roles` tới Identity. Các thao tác REST sau cung cấp phạm vi quản lý vai
trò đã phê duyệt mà không phơi bày một endpoint phân quyền chung chung:

| Thao tác                                | Xác thực                                           | Thao tác application | Phản hồi/hành vi                                                                       |
| --------------------------------------- | -------------------------------------------------- | -------------------- | -------------------------------------------------------------------------------------- |
| `GET /api/roles/users/:userId`          | Bearer token BKPractice hợp lệ + principal `ADMIN` | `GetUserRoles`       | `200` kèm `userId` đích và tên các vai trò ở dạng an toàn                              |
| `POST /api/roles/users/:userId`         | Bearer token hợp lệ + principal `ADMIN`            | `AssignRoleToUser`   | `200` kèm phép gán kết quả; vai trò trong body chỉ là `STUDENT` hoặc `LECTURER`        |
| `DELETE /api/roles/users/:userId/:role` | Bearer token hợp lệ + principal `ADMIN`            | `RevokeRoleFromUser` | `200` kèm phép gán kết quả; vai trò Student/Lecturer vắng mặt là thành công idempotent |

`ADMIN` không phải là vai trò đích gán được. Thao tác xoá có thể đại diện cho ngoại lệ Admin tự thu
hồi đã phê duyệt, chỉ khi bất biến ở tầng application xác nhận vẫn còn một Admin khác; nó không bao
giờ cho phép gỡ bỏ Admin cuối cùng. Không có kế hoạch cho `POST /api/roles`, CRUD vai trò, CRUD quyền
hay một route `/authorize` công khai.

Controller chỉ phân tích đầu vào ở tầng truyền tải, gọi một use case và ánh xạ các lỗi
Identity/Gateway hiện có. Định danh tác nhân được lấy từ ngữ cảnh xác thực tin cậy, không bao giờ từ
body, đường dẫn hay query string của request.

## DTO / Kiểm tra dữ liệu

- `AssignRoleRequestDto` chỉ chứa một giá trị vai trò bắt buộc. Việc kiểm tra ở tầng truyền tải chấp
  nhận các giá trị enum định sẵn và từ chối các vai trò không xác định/trường thừa thông qua pipe
  whitelist toàn cục và `forbidNonWhitelisted`.
- Một tầng kiểm tra/ánh xạ tham số route chuyển `:role` sang kiểu vai trò chuẩn tắc của domain; các
  giá trị sai định dạng thất bại trước khi state thay đổi.
- `UserRolesResponseDto` và các DTO phản hồi của thao tác vai trò chỉ phơi bày dữ liệu gán vai
  trò/người dùng ổn định. Chúng không phơi bày phần nội bộ của bảng quyền, mật khẩu/bản băm, token,
  dữ liệu nhà cung cấp hay bí mật tài khoản.
- Không DTO nào nhận `actorId`, `actorRole`, `permissions`, `accountStatus`, `passwordHash` hay các
  header định danh tin cậy.
- Việc kiểm tra ở tầng truyền tải xử lý hình dạng và tính thành viên của enum. Chính sách
  domain/application xử lý việc phân quyền chỉ-Admin, việc cấm cấp Admin, việc bảo vệ Admin cuối
  cùng, và tính idempotent.

## Phân quyền

- Các thao tác quản lý vai trò đòi hỏi một principal ID-001 đã xác minh có vai trò `ADMIN` và một
  trạng thái tài khoản mà ID-001 cho phép. Người gọi là Sinh viên hay Giảng viên nhận hành vi từ chối
  hiện có.
- Gateway xác minh Bearer token và loại bỏ các header định danh của người gọi. Identity thêm một
  guard/adapter ngữ cảnh principal mỏng để phòng thủ nhiều lớp cho các lời gọi trực tiếp hoặc định
  tuyến sai; nó tái dùng việc kiểm chứng token của ID-001 và không tạo một hệ thống xác thực thứ hai.
- Tác nhân luôn được suy ra từ principal đã xác minh. Các trường `userId`, vai trò hay quyền do
  client cung cấp không thể làm thay đổi quyết định phân quyền.
- `ADMIN` có thể xem các vai trò và gán/thu hồi các vai trò định sẵn `STUDENT`/`LECTURER`. Việc cấp
  `ADMIN` cho một User khác bị từ chối. Việc Admin tự thu hồi chỉ được phép khi vẫn còn một Admin
  khác; Admin cuối cùng được bảo vệ.
- Các luồng `Profile` và `Authentication` vẫn không thể thay đổi state của RBAC. Các thao tác profile
  của Admin trong ID-002 không trở thành các thao tác quản lý vai trò.
- Learning, Submission và Community thực thi các quy tắc hành động/tài nguyên/sở hữu tại ranh giới
  tin cậy của riêng chúng. Chúng chỉ tiêu thụ ngữ cảnh truyền tải principal/vai trò đã phê duyệt và
  không bao giờ truy vấn trực tiếp `bkpractice_identity`.

## Messaging / Sự kiện

N/A. ID-003 không có event nghiệp vụ bất đồng bộ nào được phê duyệt. Các thay đổi vai trò là các
transaction đồng bộ của Identity. Không thêm event RabbitMQ chỉ để thông báo các thay đổi vai trò.

## Realtime

N/A. RBAC không có yêu cầu realtime qua Socket.IO hay Redis. Các ảnh chụp vai trò trong access token
tuân theo chính sách hết hạn của ID-001; không đưa vào danh sách đen access token phân tán hay hệ
thống vô hiệu hoá cache nào.

## Adapter hạ tầng

### Adapter RBAC dùng TypeORM

Hiện thực `RbacRepository` trong module hạ tầng của RBAC. Nó sở hữu các query builder, chi tiết
transaction, việc ánh xạ vai trò/quyền và hành vi gán idempotent. Nó chỉ dùng datasource Identity và
các entity Identity hiện có.

### Adapter principal/xác thực

Tái dùng bộ kiểm chứng access token/contract principal của ID-001 khi có sẵn. Adapter có thể kiểm
chứng Bearer token hoặc ngữ cảnh tin cậy do Gateway sinh ra để phòng thủ nhiều lớp, nhưng nó phải từ
chối các giá trị `x-auth-user-id`/`x-auth-roles` do client cung cấp và không bao giờ chấp nhận một
token của nhà cung cấp Microsoft như một principal của BKPractice.

### Adapter danh mục tĩnh

Đọc enum vai trò tĩnh và quan hệ quyền hiện có. Không thêm CRUD vai trò/quyền lúc chạy, bộ dựng vai
trò tuỳ biến hay một policy engine. Các định nghĩa quyền riêng của từng tính năng vẫn thuộc sở hữu
của Identity nhưng chỉ được thêm vào qua các kế hoạch tính năng đã phê duyệt của chúng.

### Contract kỹ thuật dùng chung

Nếu ID-001 chưa tạo một transport contract tương thích, hãy thêm một file nhỏ
`libs/contracts/src/authorization.contracts.ts` chỉ chứa hình dạng principal tin cậy và các kiểu định
danh vai trò/quyền ổn định cần dùng xuyên ranh giới service. Không đặt các class Role, Permission,
User hay repository ở đó. Chỉ export nó từ `libs/contracts/src/index.ts` nếu quy ước contract hiện có
đòi hỏi.

## Xử lý lỗi

Tái dùng phần kiểm tra dữ liệu của NestJS và việc chuẩn hoá lỗi của Gateway hiện có. Lỗi ở tầng
domain/application vẫn độc lập với framework và được tầng Presentation ánh xạ:

| Điều kiện                                                          | Ánh xạ mong đợi                                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Access token bị thiếu/không hợp lệ                                 | Quy ước xác thực `401` hiện có                                                                     |
| Sinh viên/Giảng viên đã xác thực hoặc principal không đủ điều kiện | Quy ước từ chối `403` hiện có                                                                      |
| Vai trò không xác định hoặc route/body sai định dạng               | Quy ước kiểm tra dữ liệu `400` hiện có; không thay đổi state                                       |
| Thử cấp `ADMIN` cho một User khác                                  | Vi phạm chính sách `403` (hoặc ánh xạ lỗi nghiệp vụ tương đương hiện có); không đổi state          |
| Không tìm thấy User đích                                           | Quy ước `404` hiện có của Identity; không thay đổi state                                           |
| Thao tác sẽ gỡ bỏ Admin cuối cùng                                  | Quy ước lỗi xung đột/quy tắc nghiệp vụ hiện có (thường là `409`); không thay đổi state             |
| Phép gán đã tồn tại hoặc thu hồi Student/Lecturer vắng mặt         | Thành công idempotent; không có thay đổi trùng lặp/không liên quan                                 |
| Ngữ cảnh tin cậy bị thiếu/giả mạo                                  | Thất bại theo hướng đóng qua ranh giới `401`/`403` hiện có                                         |
| Lỗi lưu trữ hoặc transaction                                       | Lỗi server chuẩn hoá hiện có kèm request ID; không bao giờ phơi bày phần nội bộ của SQL/chính sách |

Không đưa vào cấu trúc lỗi mới. Log dùng request/correlation ID và chỉ ghi kết quả thô; chúng không
bao gồm token, thông tin đăng nhập, header Authorization thô hay toàn bộ phần nội bộ của quyền.

## Bảo mật

| Yêu cầu        | Cách thực thi dự kiến                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ID-003-SR-001  | Chính sách gán vai trò ở domain/application từ chối việc tự nâng quyền; chỉ luồng của Admin mới thay đổi được vai trò; việc Admin tự thu hồi bị ràng buộc bởi bất biến Admin cuối cùng |
| ID-003-SR-002  | Gateway loại bỏ header giả mạo; các DTO từ chối trường tin cậy; adapter principal chỉ dùng ngữ cảnh ID-001 đã xác minh                                                                 |
| ID-003-SR-003  | Controller/use case của Identity và từng service nghiệp vụ sở hữu đều thực thi phân quyền phía server; khả năng hiển thị ở giao diện là không liên quan                                |
| ID-003-SR-004  | Bộ đánh giá phân quyền dùng các phép khớp vai trò/quyền tường minh và mặc định từ chối với chính sách bị thiếu/không xác định                                                          |
| ID-003-SR-005  | Chỉ `RbacRepository` của Identity và các use case được Admin phân quyền mới thay đổi các phép gán; Profile/các service khác không có đường ghi                                         |
| ID-003-SR-005a | Chính sách ở tầng application từ chối việc cấp Admin cho một User khác và bảo vệ Admin cuối cùng trong transaction                                                                     |
| ID-003-SR-006  | Chính sách vai trò giữ Giảng viên tách biệt khỏi Admin và không bao giờ biến Admin thành một cách đi vòng ngầm qua quyền sở hữu/kiểm tra dữ liệu                                       |
| ID-003-SR-007  | Tái dùng ngữ nghĩa về loại token/trạng thái/ảnh chụp của ID-001; token của nhà cung cấp và refresh token không phải thông tin xác thực cho RBAC                                        |
| ID-003-SR-008  | Toàn bộ lớp lưu trữ nằm trong `bkpractice_identity`; không có SQL, quan hệ TypeORM hay việc dùng chung thực thể nghiệp vụ xuyên service                                                |
| ID-003-SR-009  | Các DTO phản hồi an toàn và log đã che thông tin bỏ qua mật khẩu, dữ liệu token, thông tin xác thực nhà cung cấp và dữ liệu chính sách không cần thiết                                 |
| ID-003-SR-010  | Principal hoặc ngữ cảnh chính sách không hợp lệ/không khả dụng thì thất bại theo hướng đóng; không có phương án dự phòng dùng vai trò từ client hay Admin ngầm                         |

Không đưa vào Keycloak, nhà cung cấp OAuth, MFA, engine ABAC/ReBAC, danh sách đen phân quyền trên
Redis hay microservice audit nào.

## Chiến lược kiểm thử

### Unit test

- Việc kiểm tra vai trò chuẩn tắc chỉ chấp nhận `STUDENT`, `LECTURER`, `ADMIN`; các định danh quyền
  sai định dạng bị từ chối.
- Việc đánh giá nhiều vai trò trả về hợp của các quyền được ánh xạ tường minh và mặc định từ chối với
  chính sách bị thiếu/không xác định.
- Các nỗ lực quản lý vai trò của Sinh viên và Giảng viên đều bị cấm.
- Admin có thể xem và gán/thu hồi Student/Lecturer; việc Admin cấp Admin thì bị cấm.
- Việc Admin tự thu hồi chỉ thành công khi còn một Admin khác; việc gỡ Admin cuối cùng bị từ chối.
- Phép gán đã tồn tại và việc thu hồi Student/Lecturer vắng mặt đều idempotent và không tạo thay đổi
  không liên quan.
- Các quyết định về trạng thái tài khoản và ảnh chụp token đều nhường cho ID-001 và không bao giờ tạo
  ra một đường đi thay thế.
- Các trường vai trò/quyền/trạng thái tài khoản được cung cấp qua đầu vào dạng Profile/Auth không thể
  thay đổi chính sách RBAC.

### Test lưu trữ/integration

- Migration Identity hiện có tạo các vai trò tĩnh, các quan hệ vai trò và tính duy nhất tổ hợp với
  `synchronize: false`.
- Việc gán/thu hồi vai trò chỉ dùng các bảng của Identity và giữ cho các dòng trùng lặp là không thể.
- Các nỗ lực thu hồi Admin cuối cùng đồng thời được tuần tự hoá an toàn; vẫn còn ít nhất một Admin.
- Các phép join vai trò-quyền chỉ phân giải ra các khả năng được gán tường minh.
- Trường hợp không tìm thấy user đích và việc rollback transaction đều để nguyên state gán.
- Không datasource, khoá ngoại hay thực thể nghiệp vụ dùng chung xuyên service nào được import.

### Test API/Gateway

- `GET/POST/DELETE /api/roles/...` hoạt động qua Gateway cho một principal Admin tin cậy.
- Token bị thiếu/không hợp lệ trả về `401`; Sinh viên/Giảng viên hoặc ngữ cảnh không đủ trả về `403`.
- Các trường thừa trong body, các header tác nhân/vai trò do người gọi cung cấp và các giá trị vai
  trò trên đường dẫn đều không thể nâng quyền truy cập.
- Việc Admin cấp `ADMIN` và việc gỡ Admin cuối cùng đều bị từ chối mà không thay đổi lớp lưu trữ.
- Việc gán/thu hồi lặp lại idempotent trả về state kết quả ở dạng an toàn.
- Các phản hồi không bao giờ chứa mật khẩu, bản băm, token, thông tin xác thực nhà cung cấp hay chi
  tiết bảng quyền nội bộ.
- Một thay đổi vai trò được phản ánh trong các token ID-001 mới phát hành, trong khi một token đã
  phát hành vẫn không đổi cho tới khi hết hạn theo phê duyệt.

Ánh xạ các test tới các tiêu chí nghiệm thu đã Approved trong bảng truy vết bên dưới. Chạy đúng các
script thật của repository bằng pnpm sau khi triển khai: `pnpm lint`, `pnpm typecheck`, `pnpm test`
và `pnpm build`.

## Khả năng quan sát

- Bảo toàn `x-request-id`/correlation ID hiện có xuyên Gateway và Identity.
- Ghi log kết quả thô của việc quản lý vai trò (xem, gán, thu hồi, từ chối, bảo vệ Admin cuối cùng)
  kèm request ID và, ở nơi chính sách ghi log an toàn hiện có cho phép, kèm ID người dùng nội bộ.
- Không bao giờ ghi log header Authorization, JWT thô, refresh token, mật khẩu, token của nhà cung
  cấp hay toàn bộ bảng quyền.
- Không thêm metric, backend tracing, luồng event hay service audit mới. Nếu audit trở thành yêu cầu,
  nó cần một tính năng/kế hoạch được phê duyệt riêng.

## Truy vết yêu cầu

| Yêu cầu               | Đường triển khai                                                                           | Cách kiểm chứng chính                                    |
| --------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| ID-003-FR-001         | Module/repository RBAC do Identity sở hữu; không có schema hay adapter ghi ở bên tiêu thụ  | Test lưu trữ/kiến trúc; AC-016                           |
| ID-003-FR-002         | Định nghĩa vai trò tĩnh chuẩn tắc và việc kiểm tra enum ở DTO/domain                       | Test unit/API với vai trò không hợp lệ; AC-014, AC-016   |
| ID-003-FR-003         | Quan hệ nhiều-nhiều hiện có của User cộng với bộ đánh giá quyền theo phép hợp              | Test domain và lưu trữ; AC-006                           |
| ID-003-FR-004         | `EvaluateAuthorization` và việc tra cứu quyền hiệu lực của `RbacRepository`                | Unit test phân quyền; AC-001, AC-006                     |
| ID-003-FR-005         | Adapter principal của ID-001 và các controller/use case RBAC được bảo vệ                   | Test auth ở API; AC-002, AC-003                          |
| ID-003-FR-006         | Guard/use case phía server và contract phân quyền của service sở hữu                       | Test API/bảo mật; AC-002, AC-005, AC-013                 |
| ID-003-FR-007         | Chính sách mặc định từ chối cho quyền yêu cầu bị thiếu/mơ hồ                               | Test domain; AC-004, AC-014                              |
| ID-003-FR-008         | Khớp vai trò-quyền tường minh, không có đường đi vòng ngầm cho Admin                       | Test chính sách domain/tính năng; AC-001, AC-006, AC-012 |
| ID-003-FR-009         | Các use case gán chỉ dành cho Admin, việc loại trừ đường ghi từ Profile/Auth, ánh xạ tĩnh  | Test API/bảo mật quản lý vai trò; AC-007–AC-009          |
| ID-003-FR-010         | Danh sách vai trò đích cho phép và việc không cấp Admin cho User khác                      | Test application/API; AC-008a, AC-008c                   |
| ID-003-FR-010a        | Bất biến đếm/khoá Admin cuối cùng trong transaction và ngoại lệ tự thu hồi                 | Test integration đồng thời; AC-008b                      |
| ID-003-FR-011         | Contract principal tin cậy đã được Gateway làm sạch và phòng thủ nhiều lớp ở Identity      | Test giả mạo header/contract; AC-005, AC-013             |
| ID-003-FR-012         | Chính sách tính năng vẫn ở Learning/Submission/Community/Profile; không lấn sang danh mục  | Rà soát kiến trúc và test ranh giới; AC-013, AC-016      |
| ID-003-FR-013         | Tái dùng chính sách trạng thái tài khoản/điều kiện cấp token của ID-001                    | Test integration về trạng thái; AC-011                   |
| ID-003-FR-014         | Đọc vai trò hiện tại cho lần phát hành mới; không bao giờ thay đổi token đang tồn tại      | Test integration/API với ID-001; AC-010                  |
| ID-003-FR-015         | Không có trường vai trò/trạng thái/quyền trong các đường thay đổi của Profile/Auth         | Test bảo mật xuyên tính năng; AC-009                     |
| ID-003-FR-016         | Module RBAC vẫn nằm trong Identity; không có service/cơ sở dữ liệu vai trò                 | Khảo sát repository/module; AC-016                       |
| ID-003-SR-001–SR-005a | Chính sách domain, luồng chỉ-Admin, không cấp Admin, transaction cho Admin cuối cùng       | Test bảo mật và API đồng thời; AC-007–AC-008d            |
| ID-003-SR-006–SR-010  | Tách bạch vai trò, ngữ nghĩa token ID-001, cách ly service, che thông tin và thất bại đóng | Test unit/API/kiến trúc; AC-005, AC-010, AC-013–AC-016   |

## Các file dự kiến thay đổi

### REUSE

- `apps/identity-service/src/modules/rbac/entities/role.entity.ts`
- `apps/identity-service/src/modules/rbac/entities/permission.entity.ts`
- `apps/identity-service/src/modules/users/entities/user.entity.ts`
- `apps/identity-service/src/modules/identity.entities.ts`
- `apps/identity-service/src/database/data-source.ts`
- `apps/identity-service/src/database/migrations/1700000000000-InitialIdentitySchema.ts`
- Adapter principal xác thực/token của ID-001 và middleware xác thực hiện có của Gateway
- Route `/api/roles` trong `apps/api-gateway/src/proxy/gateway-proxy.service.ts`
- Các quy ước kiểm tra dữ liệu, Swagger và lỗi trong `libs/common/src/bootstrap.ts`

### MODIFY

- `apps/identity-service/src/modules/rbac/entities/role.entity.ts`: ánh xạ lớp lưu trữ sang định
  nghĩa vai trò chuẩn tắc của domain nếu cần, mà không thay đổi enum cơ sở dữ liệu đã phê duyệt.
- `apps/identity-service/src/identity-service.module.ts`: import module RBAC và gắn các port/adapter
  của nó.
- Ngữ cảnh principal/auth hiện có của ID-001, chỉ khi nó thiếu một port principal đã xác minh tái
  dùng được; bảo toàn hành vi về token và trạng thái của nó.
- `libs/contracts/src/index.ts`, chỉ khi quy ước export hiện có đòi hỏi một contract phân quyền kỹ
  thuật mới.

Không dự kiến thay đổi route nào ở Gateway vì `/api/roles` đã được chuyển tiếp và bảo vệ. Mọi chỉnh
sửa ở Gateway phải giới hạn trong việc truyền ngữ cảnh tin cậy và không được thêm logic nghiệp vụ.

### CREATE

- `apps/identity-service/src/modules/rbac/rbac.module.ts`
- `apps/identity-service/src/modules/rbac/domain/role-name.ts`
- `apps/identity-service/src/modules/rbac/domain/permission-code.ts`
- `apps/identity-service/src/modules/rbac/domain/authorization-decision.ts`
- `apps/identity-service/src/modules/rbac/domain/role-assignment-policy.ts`
- `apps/identity-service/src/modules/rbac/application/ports/` cho các port cụ thể ở trên
- `apps/identity-service/src/modules/rbac/application/use-cases/get-user-roles.use-case.ts`
- `apps/identity-service/src/modules/rbac/application/use-cases/assign-role-to-user.use-case.ts`
- `apps/identity-service/src/modules/rbac/application/use-cases/revoke-role-from-user.use-case.ts`
- `apps/identity-service/src/modules/rbac/application/use-cases/evaluate-authorization.use-case.ts`
- `apps/identity-service/src/modules/rbac/infrastructure/persistence/` adapter TypeORM và phần hiện
  thực transaction
- `apps/identity-service/src/modules/rbac/infrastructure/auth/` phần tích hợp adapter/guard principal
  tin cậy, tái dùng việc kiểm chứng token của ID-001
- `apps/identity-service/src/modules/rbac/presentation/rbac.controller.ts`
- `apps/identity-service/src/modules/rbac/presentation/dto/` các DTO request/response
- `apps/identity-service/src/modules/rbac/presentation/decorators/`, chỉ khi quy ước ngữ cảnh auth
  hiện có chưa có decorator lấy principal hiện tại tái dùng được
- Các test domain, lưu trữ, API và bảo mật tập trung, theo quy ước test hiện có của repository
- `libs/contracts/src/authorization.contracts.ts`, chỉ khi không tồn tại contract principal tương
  thích của ID-001 và tầng truyền tải phía sau cần hình dạng kỹ thuật đó

### REMOVE

Không có.

## Thứ tự triển khai

1. Xác nhận lại đặc tả đã Approved, kiến trúc Identity, schema RBAC hiện có và contract principal của
   ID-001; báo cáo mọi xung đột trước khi thay đổi code.
2. Thêm các kiểu vai trò/quyền chuẩn tắc độc lập với framework và các chính sách gán vai trò/phân
   quyền, không import NestJS hay TypeORM.
3. Định nghĩa bốn port hẹp của tầng application và các ranh giới use case; tái dùng một port ngữ cảnh
   của ID-001 thay vì tạo một trừu tượng hoá xác thực trùng lặp.
4. Hiện thực và kiểm thử adapter TypeORM, các thao tác idempotent trên bảng nối, và việc bảo vệ Admin
   cuối cùng trong transaction, trên schema Identity hiện có.
5. Thêm module RBAC/phần nối dây composition root và phần tích hợp guard/ngữ cảnh principal tin cậy.
6. Hiện thực `GetUserRoles`, `AssignRoleToUser`, `RevokeRoleFromUser` và bộ đánh giá nội bộ.
7. Thêm các DTO, route controller, phần ánh xạ lỗi và metadata Swagger; giữ controller chỉ lo truyền
   tải.
8. Kiểm chứng việc chuyển tiếp/làm sạch header cho `/api/roles` ở Gateway; chỉ sửa mã Gateway nếu
   phát hiện một vấn đề tương thích hẹp về ngữ cảnh tin cậy.
9. Chạy các test unit, lưu trữ, đồng thời, API và bảo mật, bao gồm hành vi ảnh chụp token khi đổi vai
   trò và việc loại trừ đường thay đổi từ Profile/Auth.
10. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build`; rà soát bản triển khai đối chiếu
    với mọi FR/SR/AC và các quy tắc phụ thuộc của Identity.

## Phụ thuộc

- **ID-001 Authentication:** cung cấp định danh đã xác minh, trạng thái tài khoản, ảnh chụp vai trò
  trong access token, và ngữ nghĩa phát hành/hết hạn token. RBAC không tạo một luồng xác thực khác.
- **ID-002 Profile:** cấm tường minh việc Profile thay đổi vai trò, quyền hay trạng thái tài khoản;
  Profile vẫn là bên tiêu thụ biểu diễn vai trò ở dạng chỉ đọc nếu cần.
- **API Gateway:** cung cấp route công khai, việc kiểm chứng Bearer và ngữ cảnh tin cậy đã làm sạch;
  Gateway vẫn không chứa lớp lưu trữ nghiệp vụ của RBAC.
- **Các đặc tả Learning/Submission/Community tương lai:** định nghĩa các quyền ở mức hành động, quyền
  sở hữu tài nguyên và việc phân quyền phía service của riêng chúng. Chúng tiêu thụ nền tảng này
  nhưng không được ID-003 hiện thực.
- **Bootstrap Admin vận hành:** một Admin ban đầu phải được cấp qua một quy trình vận hành/seed được
  phê duyệt riêng, vì ID-003 cố ý không cung cấp route tạo Admin công khai nào. Đây là điều kiện tiên
  quyết khi triển khai, không phải một API RBAC mới.

## Rủi ro

- **Ảnh chụp vai trò lỗi thời:** Các access token ID-001 đang tồn tại giữ ảnh chụp vai trò của chúng
  cho tới khi hết hạn. Đây là hành vi đã phê duyệt; hãy dùng vòng đời token đã cấu hình và đừng âm
  thầm thêm danh sách đen.
- **Thay đổi Admin cuối cùng đồng thời:** Một phép đếm không nằm trong transaction có thể gỡ mất
  Admin cuối cùng. Hãy dùng một chiến lược khoá/tuần tự hoá an toàn ở mức cơ sở dữ liệu và kiểm thử
  các lần thu hồi đồng thời.
- **Bootstrap Admin:** Vì Admin không thể cấp Admin cho một User khác, việc cấp Admin ban đầu và Admin
  khôi phục phải tồn tại bên ngoài tính năng này. Hãy báo cáo nếu thiếu bootstrap vận hành trước khi
  phát hành.
- **Thời điểm có danh mục quyền:** Nền tảng có sẵn các bảng quyền nhưng chưa có seed đầy đủ cho các
  tính năng tương lai. Mặc định từ chối vẫn là đúng cho tới khi từng tính năng phê duyệt và seed các
  mã ổn định của riêng nó.
- **Logic phân quyền trùng lặp:** Hãy giữ quyền sở hữu vai trò ở Identity và các kiểm tra hành
  động/tài nguyên ở service sở hữu; chỉ dùng chung các contract principal kỹ thuật, không dùng chung
  thực thể nghiệp vụ hay repository.
- **Căn chỉnh kiến trúc mới một phần:** Identity hiện tại dùng cách nối dây TypeORM/AuthService trực
  tiếp. Hãy căn chỉnh RBAC một cách tiệm tiến với các port/use case thật và tránh viết lại trên toàn
  repository.
- **Tính sẵn có của ngữ cảnh tin cậy:** Ngữ cảnh Gateway/ID-001 bị thiếu hay giả mạo phải thất bại
  theo hướng đóng, không bao giờ rơi về các trường vai trò từ client.

## Tuân thủ kiến trúc

- **Clean Architecture:** Presentation phân tích DTO và ánh xạ phản hồi; các use case ở tầng
  application điều phối các port; domain sở hữu các bất biến về vai trò/quyền/Admin cuối cùng;
  infrastructure hiện thực các adapter TypeORM và ngữ cảnh xác thực.
- **Chiều phụ thuộc:** Domain không import mã NestJS, TypeORM, JWT, HTTP hay Gateway nào. Application
  chỉ phụ thuộc các kiểu domain và các port. Infrastructure được gắn ở composition root của module
  Identity.
- **Quyền sở hữu của Identity:** Vai trò, quyền và các phép gán vẫn nằm trong `bkpractice_identity`
  và bên trong ứng dụng Identity. Không tạo Role Service, Permission Service hay Admin Service nào.
- **Ranh giới xác thực:** ID-001 vẫn là nguồn của định danh đã xác thực, trạng thái tài khoản và ngữ
  nghĩa token. RBAC tiêu thụ ngữ cảnh đã xác minh và không bao giờ chấp nhận token của nhà cung cấp
  hay refresh token như thông tin xác thực phân quyền.
- **Ranh giới Gateway:** Gateway chỉ thực hiện xác thực ở biên/làm sạch header và định tuyến; nó
  không truy vấn các bảng RBAC và không chứa quy tắc nghiệp vụ về việc gán vai trò.
- **Thực thi ở phía service:** Các service nghiệp vụ vẫn chịu trách nhiệm cho các hành động được bảo
  vệ, quyền sở hữu và chính sách tài nguyên của mình. Khả năng hiển thị ở client và các kiểm tra thô
  ở Gateway không phải ranh giới phân quyền duy nhất.
- **Cách ly lớp lưu trữ:** Không đưa vào SQL, quan hệ TypeORM, việc import datasource hay khoá ngoại
  xuyên service nào. `libs/` chỉ nhận một transport contract trung tính về ngữ cảnh nếu cần, chứ
  không nhận các entity hay use case User/Role/Permission.
- **Kiểm soát phạm vi:** Không thêm IAM động, OAuth, MFA, ABAC/ReBAC, CQRS, event sourcing, danh sách
  đen trên Redis, microservice audit, CRUD vai trò hay danh mục quyền của tính năng tương lai nào.

## Bổ sung cho bản sửa đổi 0.4

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-29`, bám theo ID-003 0.4 (FR-017 tới FR-023, SR-010,
SR-011, AC-017 tới AC-022).

### Domain

- `PermissionCode` (đã có trong danh sách file dự kiến) kiểm mẫu `^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$`,
  tối đa 64 ký tự (FR-017).
- Chính sách `EffectivePermissions`: hợp không trùng, sắp xếp theo thứ tự từ điển, của quyền mọi vai
  trò hiện tại (FR-019).

### Application

- Port mới `EffectivePermissionReader.readForUser(userId)` do module `rbac` sở hữu và export cho
  module `auth`. Adapter TypeORM đọc `user_roles` → `role_permissions` → `permissions` trong
  `bkpractice_identity`.
- ID-001 gọi port này khi phát hành access token (xem bổ sung trong `authentication/plan.md`). Module
  `rbac` không phát hành token.

### Migration

- Migration mới `apps/identity-service/src/database/migrations/<timestamp>-Id003PermissionCatalog.ts`,
  `synchronize: false`:
  - Up: chèn tám mã `problem:create`, `problem:read-managed`, `problem:update`, `problem:publish`,
    `problem:hold`, `problem:republish`, `problem:delete`, `problem:restore` vào `permissions` (bỏ qua
    nếu đã có); chèn phép gán của cả tám mã cho vai trò `LECTURER` vào `role_permissions` (bỏ qua nếu
    đã có). Không gán cho `STUDENT` hay `ADMIN` (FR-018).
  - Down: xoá đúng các phép gán và tám mã đã chèn.
- Kiểm chứng bằng `pnpm migration:run:identity` / `pnpm migration:revert:identity`.

### API Gateway

- `apps/api-gateway/src/auth/gateway-auth.middleware.ts`: xoá `x-auth-permissions` cùng lúc với
  `x-auth-user-id` và `x-auth-roles`, trước khi xác minh token; sau khi xác minh, đặt
  `x-auth-permissions` bằng `permissions.join(',')` nếu claim là mảng chuỗi, ngược lại đặt chuỗi
  rỗng (FR-021, FR-022, SR-010).
- `AccessTokenPayload` của Gateway thêm `permissions?: string[]`.

### Contract dùng chung

- `libs/contracts/src/auth.contracts.ts` (đã có trong kế hoạch ID-001) thêm trường
  `permissions: string[]` vào hình dạng claim access. Không đưa entity hay use case vào `libs/`.
- Header `x-auth-permissions` là chuỗi các mã phân cách bằng dấu phẩy; service tiêu thụ tách chuỗi,
  bỏ phần tử rỗng, và coi header thiếu như tập rỗng (FR-022).

### Kiểm thử

- Unit: `PermissionCode`, `EffectivePermissions` (AC-017 tới AC-019).
- Integration: adapter đọc quyền với nhiều vai trò; migration up/down.
- Gateway: header giả mạo bị xoá (AC-020); token thiếu claim cho header rỗng (AC-021).
- E2E: gán `LECTURER` rồi token cũ không có quyền, token mới thì có (AC-022).

### Rủi ro

- Quyền đổi chỉ có hiệu lực ở token mới; chấp nhận theo FR-023.
- Token lớn thêm khoảng vài trăm byte với tám quyền; cần theo dõi khi danh mục lớn lên.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó phải được rà soát đối chiếu với `spec.md` đã Approved trước khi tạo
> `tasks.md`; không mã nguồn RBAC nào được tạo ở giai đoạn này.
