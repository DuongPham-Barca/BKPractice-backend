# GW-002 Định tuyến và bảo vệ Problem qua API Gateway

> **Cập nhật LRN-008 (2026-11-07):** `ADMIN` có quyền tương ứng quản lý mọi Problem, không giới hạn người tạo; mọi câu trái ngược bên dưới đã ngừng áp dụng. Xem [Learning tự học](../../../02-learning/self-study/spec.md).

## Trạng thái

Approved

Phiên bản `0.1`, ngày `2026-11-03`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

API Gateway là cổng công khai duy nhất cho các thao tác Problem của BKPractice. Đặc tả này xác lập
hợp đồng ở biên cho họ route `/api/problems`: mọi thao tác Problem được chuyển tiếp tới Learning
Service, mọi yêu cầu phải có ngữ cảnh xác thực BKPractice hợp lệ, các header định danh/quyền do
client gửi bị loại bỏ, chỉ metadata đã xác minh được chuyển tiếp, route judge-package nội bộ không
bao giờ lộ ra ngoài, và Gateway không chứa bất kỳ quy tắc nghiệp vụ Problem nào.

Đặc tả cũng đóng hai lỗ hổng hẹp ở tầng truyền tải đã phát hiện trong quá trình rà soát:

1. Khớp route theo tiền tố chuỗi thô có thể coi các path không thuộc họ Problem là route Problem.
2. Path chứa dot segment có thể bị chuẩn hoá bởi HTTP client thành một route nội bộ của Learning,
   hoặc client có thể chuyển tiếp header tin cậy nội bộ nếu Gateway không loại bỏ.

Kết quả mong đợi: hành vi Problem ở biên trở nên tường minh, kiểm chứng được, và khớp với LRN-001
mà không thay đổi nghiệp vụ Problem.

## Tác nhân

- **STUDENT:** Người học đã xác thực, đọc catalogue/chi tiết Problem đã xuất bản qua Gateway.
- **LECTURER:** Người dạy đã xác thực, thực hiện các thao tác quản lý Problem mà Learning cho phép.
- **ADMIN:** Quản trị viên đã xác thực. Gateway không cấp thêm quyền Problem cho Admin.
- **Khách chưa xác thực:** Người gọi không có access token BKPractice hợp lệ. Mọi route Problem bị
  từ chối ở Gateway.
- **API Gateway:** Xác thực access token, loại bỏ header do client gửi, chuyển tiếp metadata đã xác
  minh và định tuyến tới Learning; không sở hữu quy tắc nghiệp vụ Problem.
- **Learning Service:** Chủ sở hữu Problem, quyền `problem:*`, quyền sở hữu, vòng đời, khả năng hiển
  thị và mọi chính sách Problem.
- **Identity Service:** Chủ sở hữu access token, phiên đăng nhập và claim `roles`/`permissions`;
  cung cấp endpoint kiểm tra phiên nội bộ.
- **Submission Service:** Bên gọi tin cậy của route judge-package nội bộ của Learning. Nó không đi
  qua Gateway công khai; luồng này nằm ngoài phạm vi GW-002.

## Bối cảnh

LRN-001 đã Approved và đã triển khai các route Problem trong Learning dưới tiền tố `/api/problems`.
GW-001 đã xác lập API Gateway theo kiến trúc phân tầng và mô tả chung rằng `/api/problems` được
chuyển tới Learning. Tuy nhiên, chưa có đặc tả riêng mô tả chính xác hợp đồng biên cho họ route
Problem, và mục `LRN-001-T039` vẫn đang mở vì chưa có bằng chứng kiểm chứng đầy đủ ở Gateway.

Mã nguồn Gateway hiện tại dùng một proxy chung khớp theo tiền tố và một middleware xác thực chung.
Cách làm này về cơ bản đúng, nhưng còn các điểm cần chốt:

- Việc khớp tiền tố bằng `startsWith` không tôn trọng ranh giới path segment.
- `request.path` và URL thực sự gửi lên upstream có thể khác nhau khi path chứa `.`/`..` hoặc dấu
  `\`; điều này có thể làm một request công khai chạm tới route nội bộ `internal/...` của Learning.
- Proxy chuyển tiếp phần lớn header do client gửi, nên header tin cậy nội bộ như
  `x-internal-service-secret` có thể bị chuyển tiếp nếu client tự đặt.

GW-002 ghi lại hành vi bắt buộc, đóng các lỗ hổng hẹp nêu trên, và bổ sung kiểm thử hồi quy. Đặc tả
này không thay đổi route, DTO, mã lỗi hay nghiệp vụ Problem của Learning.

## Yêu cầu chức năng

- **GW-002-FR-001 — Phạm vi route Problem:** Gateway MUST chỉ chuyển tiếp các cặp method/path được liệt kê trong bảng Đầu vào tới Learning
  Service, dùng `LEARNING_SERVICE_URL`. Gateway MUST NOT mở mọi method trên prefix hoặc chuyển route
  này tới Identity, Submission, Judge hay Community.
- **GW-002-FR-002 — Ranh giới path segment:** Việc khớp họ route MUST dựa trên path segment: path
  bằng đúng `/api/problems` hoặc bắt đầu bằng `/api/problems/`. Các path như `/api/problemsX` hay
  `/api/problems-old` MUST NOT được coi là route Problem.
- **GW-002-FR-003 — An toàn dot segment:** Trước khi khớp và chuyển tiếp, Gateway MUST chuẩn hoá
  hoặc từ chối path chứa segment `.`/`..`, kể cả dạng percent-encoded hoặc dấu `\`, nếu việc chuẩn
  hoá có thể đưa path ra khỏi họ `/api/problems`. Request như vậy MUST bị từ chối với `400` và MUST
  NOT gọi upstream. Path được chuyển tiếp MUST là path đã được Gateway khớp, không phải một dạng
  chuẩn hoá khác do HTTP client tạo ra.
- **GW-002-FR-004 — Bắt buộc xác thực:** Mọi route Problem MUST yêu cầu access token BKPractice hợp
  lệ, qua header `Authorization: Bearer` hoặc access cookie. Gateway MUST NOT có ngoại lệ ẩn danh
  cho catalogue hay chi tiết Problem. Khách chưa xác thực MUST nhận `401` và upstream MUST NOT được
  gọi.
- **GW-002-FR-005 — Xác minh token và phiên:** Gateway MUST xác minh chữ ký, hạn dùng, `type=access`
  và các claim bắt buộc `sub`, `sid`, `jti`, `roles`. Gateway MUST xác minh phiên còn hiệu lực qua
  endpoint phiên nội bộ của Identity. Token sai, hết hạn hoặc đã thu hồi MUST nhận `401`; Identity
  không khả dụng MUST nhận `503`. Gateway MUST NOT chuyển tiếp request khi xác thực thất bại.
- **GW-002-FR-006 — Loại bỏ header định danh giả mạo:** Gateway MUST xoá các header do client gửi
  `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions` và `x-client-ip` trước khi chuyển tiếp.
- **GW-002-FR-007 — Chỉ chuyển tiếp metadata đã xác minh:** Gateway MUST đặt
  `Authorization: Bearer <access-token>`, `x-auth-user-id` từ claim `sub`, `x-auth-roles` từ claim
  `roles` (phân tách bằng dấu phẩy), `x-auth-permissions` từ claim `permissions` (phân tách bằng dấu
  phẩy; thiếu hoặc sai kiểu thì chuỗi rỗng), và `x-client-ip` từ transport. Gateway MUST NOT suy ra
  quyền từ vai trò hoặc từ dữ liệu client.
- **GW-002-FR-008 — Loại bỏ header tin cậy nội bộ:** Gateway MUST xoá `x-internal-service-secret` và
  mọi header tin cậy nội bộ khác khỏi request công khai trước khi chuyển tiếp. Client MUST NOT có
  khả năng làm Learning coi request công khai là request của service tin cậy.
- **GW-002-FR-009 — An toàn xác thực bằng cookie:** Khi xác thực bằng access cookie, với các method
  không an toàn (`POST`, `PUT`, `PATCH`, `DELETE`), Gateway MUST kiểm tra Origin/Referer được phép và
  CSRF token hợp lệ; vi phạm MUST nhận `403`. Gateway MUST NOT chuyển tiếp raw `Cookie` tới Learning
  trên route Problem. Đường xác thực Bearer MUST NOT bị yêu cầu CSRF.
- **GW-002-FR-010 — Chuyển tiếp phản hồi và chặn Set-Cookie:** Gateway MUST giữ nguyên status và body
  của Learning, bao gồm `400`, `401`, `403`, `404`, `409` và `5xx`. Gateway MUST chỉ chuyển tiếp các
  header phản hồi `content-type`, `content-length`, `etag`, `last-modified`; MUST NOT chuyển tiếp
  `Set-Cookie` hay header tuỳ ý khác của Learning trên route Problem.
- **GW-002-FR-011 — Cô lập route judge-package nội bộ:** Gateway công khai MUST NOT cho phép truy cập
  `GET internal/problems/:id/judge-package/:language`. Gateway MUST NOT viết lại `/api/problems...`
  thành `internal/...`. Route nội bộ chỉ được gọi trực tiếp bởi service tin cậy, không qua Gateway
  công khai.
- **GW-002-FR-012 — Ánh xạ lỗi biên:** Gateway MUST trả `502` khi không có route upstream hoặc khi
  Learning không khả dụng/timeout; `401` khi thiếu/sai/hết hạn/thu hồi token; `403` khi Origin hoặc
  CSRF không hợp lệ; `503` khi kiểm tra phiên không khả dụng; và giữ `429` của cơ chế giới hạn tần
  suất hiện có. Lỗi MUST NOT chứa token, cookie, bí mật nội bộ hay chi tiết nội bộ của upstream.
- **GW-002-FR-013 — Tương quan request:** Gateway MUST bảo đảm mỗi request Problem có `x-request-id`
  (sinh mới nếu thiếu), trả lại header này cho client và chuyển tiếp nó tới Learning. Log MUST được
  gắn với `x-request-id` và MUST NOT ghi Authorization, cookie, mật khẩu hay bí mật nội bộ.
- **GW-002-FR-014 — Giới hạn tần suất:** Route Problem MUST chịu cơ chế giới hạn tần suất mặc định
  hiện có của Gateway. GW-002 MUST NOT thêm đường vòng hoặc miễn trừ riêng cho Problem. Nếu sau này cần
  một chính sách giới hạn riêng cho Problem, nó phải được đặc tả riêng.
- **GW-002-FR-015 — Không có nghiệp vụ Problem:** Gateway MUST NOT đánh giá quyền `problem:*`, quyền
  sở hữu, vòng đời, khả năng hiển thị, tính duy nhất của slug, mức độ sẵn sàng xuất bản hay bất kỳ
  chính sách Problem nào. Gateway MUST NOT chứa entity, repository, migration hay cơ sở dữ liệu
  Problem.
- **GW-002-FR-016 — Giữ nguyên query và body:** Gateway MUST chuyển tiếp query string và JSON body
  của request Problem mà không thêm, xoá, đổi tên hay sắp xếp lại trường, ngoại trừ việc loại bỏ các
  header transport/định danh/nội bộ đã nêu.

## Quy tắc nghiệp vụ

- Gateway chỉ là biên truyền tải. Learning là nguồn chân lý duy nhất cho state, chính sách và quyền
  của Problem.
- Chỉ metadata định danh đã được xác minh từ access token BKPractice mới được dùng để tạo header tin
  cậy.
- Họ route Problem là một khối định tuyến duy nhất; thứ tự khớp các route con như `managed` hay
  `:idOrSlug` thuộc trách nhiệm của Learning, không thuộc Gateway.
- Gateway không lưu cache, không tổng hợp dữ liệu Problem, không thực thi mã và không đọc cơ sở dữ
  liệu.
- Route judge-package nội bộ không phải bề mặt công khai, kể cả khi người gọi biết ID Problem và
  ngôn ngữ.
- Khi có xung đột, kiến trúc hệ thống và `spec.md` đã Approved thắng `plan.md`, `tasks.md` và mọi giả
  định triển khai.

## Quy tắc phân quyền

- Gateway chỉ xác thực người gọi; Gateway MUST NOT thực thi RBAC, kiểm tra quyền sở hữu hay quyết
  định ai được đọc/ghi Problem.
- Mọi tác nhân đã xác thực, gồm `STUDENT`, `LECTURER` và `ADMIN`, đều đi qua Gateway với cùng cơ
  chế. Learning quyết định thao tác nào được phép dựa trên quyền `problem:*` và quyền sở hữu.
- Khách chưa xác thực MUST bị từ chối tại Gateway cho mọi route Problem, bao gồm catalogue và chi
  tiết đã xuất bản, theo quyết định hiển thị đã Approved của LRN-001.
- `ADMIN` không có quyền Problem ngầm định và không có đường vòng ở Gateway.
- Learning áp dụng `problem:update` cho thao tác quản lý Test Case/harness và `problem:read-managed` cho đọc phía quản lý theo LRN-002; Gateway không tự đánh giá các quyền này.
- `STUDENT` chỉ đọc được Test Case `SAMPLE` qua chi tiết Problem đã xuất bản; Gateway không mở route đọc Test Case quản lý cho người học.
- Client không thể tự đặt `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`,
  `x-internal-service-secret` hay `x-client-ip` để thay đổi ngữ cảnh tin cậy.
- Route judge-package nội bộ chỉ dành cho service tin cậy gọi trực tiếp; danh tính người dùng cuối
  không cấp quyền truy cập route đó.

## Đầu vào

Gateway chấp nhận các route sau từ client công khai. Cột "Nguồn" chỉ ra controller sở hữu hành vi
nghiệp vụ; Gateway không sao chép logic của các controller này.

| Route                                              | Phương thức       | Nguồn (Learning)          |
| -------------------------------------------------- | ----------------- | ------------------------- |
| `/api/problems`                                    | `GET`, `POST`     | Public / Managed Problems |
| `/api/problems/:idOrSlug`                          | `GET`             | Public Problems           |
| `/api/problems/managed`                            | `GET`             | Managed Problems          |
| `/api/problems/managed/:id`                        | `GET`             | Managed Problems          |
| `/api/problems/:id`                                | `PATCH`, `DELETE` | Managed Problems          |
| `/api/problems/:id/publish`                        | `POST`            | Managed Problems          |
| `/api/problems/:id/hold`                           | `POST`            | Managed Problems          |
| `/api/problems/:id/republish`                      | `POST`            | Managed Problems          |
| `/api/problems/:id/restore`                        | `POST`            | Managed Problems          |
| `/api/problems/:id/preview`                        | `POST`            | Managed Problems          |
| `/api/problems/managed/:id/test-cases`             | `GET`             | Managed Test Cases        |
| `/api/problems/managed/:id/test-cases/:testCaseId` | `GET`             | Managed Test Cases        |
| `/api/problems/:id/test-cases`                     | `POST`            | Managed Test Cases        |
| `/api/problems/:id/test-cases/order`               | `PUT`             | Managed Test Cases        |
| `/api/problems/:id/test-cases/:testCaseId`         | `PATCH`, `DELETE` | Managed Test Cases        |
| `/api/problems/managed/:id/harnesses/:language`    | `GET`             | Managed Test Cases        |
| `/api/problems/:id/harnesses/:language`            | `PUT`, `DELETE`   | Managed Test Cases        |

Các route sau MUST NOT có mặt trên bề mặt công khai của Gateway:

| Route                                               | Lý do                                                    |
| --------------------------------------------------- | -------------------------------------------------------- |
| `GET internal/problems/:id/judge-package/:language` | Tài liệu judge nội bộ; chỉ service tin cậy gọi trực tiếp |

Route quản lý danh sách/chi tiết giữ nguyên query do LRN-001 định nghĩa, gồm `includeDeleted` khi
được hỗ trợ bởi route đó. Các query không thay đổi quyền hay phạm vi dữ liệu do Learning kiểm tra.

Mọi request Problem đều có thể mang:

- `Authorization: Bearer <access-token>` hoặc access cookie BKPractice;
- `x-csrf-token` khi dùng cookie với method không an toàn;
- query string và JSON body theo contract của Learning.

Client MUST NOT đặt các header tin cậy nội bộ. Nếu có, chúng bị loại bỏ.

## Đầu ra

- Request hợp lệ được chuyển tới Learning với path/query/body tương ứng, kèm `Authorization` và
  metadata định danh đã xác minh.
- Phản hồi của Learning được trả về client với status và body giữ nguyên; chỉ các header
  `content-type`, `content-length`, `etag`, `last-modified` được chuyển tiếp.
- `x-request-id` có mặt trên request tới Learning và trên phản hồi về client.
- Không có `Set-Cookie` từ Learning được chuyển tiếp trên route Problem.
- Các lỗi biên được trả theo bảng Tình huống lỗi; không lộ token, cookie, bí mật hay chi tiết nội bộ.
- Không có tài liệu judge ẩn, harness, Test Case ẩn hay lời giải nội bộ nào được Gateway tạo ra,
  biến đổi hay phơi bày.

## Tình huống lỗi

| Trường hợp                                                             | Hành vi quan sát được                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Không có access token hoặc token sai/hết hạn/đã thu hồi                | `401` tại Gateway; không gọi Learning                                        |
| Identity không khả dụng khi kiểm tra phiên                             | `503` tại Gateway; không gọi Learning                                        |
| Cookie dùng cho method không an toàn nhưng Origin/Referer không hợp lệ | `403` tại Gateway; không gọi Learning                                        |
| Cookie dùng cho method không an toàn nhưng thiếu/sai CSRF              | `403` tại Gateway; không gọi Learning                                        |
| Client gửi header `x-auth-*`, `x-client-ip` hoặc header tin cậy nội bộ | Header bị loại bỏ; Gateway đặt lại metadata đã xác minh                      |
| Path chứa dot segment/backslash có thể thoát khỏi họ `/api/problems`   | `400` tại Gateway; không gọi Learning                                        |
| Path không thuộc họ `/api/problems` nhưng cùng tiền tố chuỗi           | Không được coi là route Problem; không chuyển tới Learning như route Problem |
| Không có route upstream được cấu hình                                  | `502`                                                                        |
| Learning không khả dụng hoặc timeout                                   | `502`                                                                        |
| Learning trả `400`, `401`, `403`, `404`, `409` hoặc `5xx`              | Status và body được giữ nguyên                                               |
| Learning trả `Set-Cookie`                                              | Header bị chặn; client không nhận cookie từ route Problem                    |
| Client cố truy cập `internal/problems/...` hoặc path viết lại tới nó   | Bị từ chối/không định tuyến; không chạm route nội bộ                         |
| Vượt giới hạn tần suất mặc định                                        | `429` theo quy ước Gateway hiện có                                           |

GW-002 không định nghĩa cấu trúc lỗi mới. Cấu trúc lỗi của Learning/NestJS hiện có được giữ nguyên.

## Tình huống biên

- `/api/problems` và `/api/problems/` đều thuộc họ route Problem; việc có route con hay không do
  Learning quyết định.
- `/api/problems/managed` và `/api/problems/:idOrSlug` có thể trùng hình dạng; Gateway MUST chuyển
  tiếp nguyên path và MUST NOT tự đổi thứ tự hay viết lại để né xung đột. Learning sở hữu thứ tự
  khai báo route.
- Path chứa `.`, `..`, `%2e`, `%2f` hoặc `\` MUST được xử lý an toàn; không được để HTTP client
  chuẩn hoá thành một path khác với path Gateway đã khớp.
- Request đồng thời không được chia sẻ trạng thái; mỗi request có `x-request-id` riêng và metadata
  định danh riêng.
- Khi vừa có `Authorization` vừa có access cookie, Gateway dùng `Authorization` làm nguồn xác thực;
  cookie vẫn không được chuyển tiếp trên route Problem.
- Token cũ không có claim `permissions` MUST được coi là không có quyền; Gateway đặt
  `x-auth-permissions` rỗng và Learning từ chối thao tác cần quyền.
- Claim `permissions` sai kiểu MUST không tạo ra quyền; Gateway đặt chuỗi rỗng.
- Header bị lặp từ client MUST bị loại bỏ và thay bằng một giá trị duy nhất do Gateway đặt.
- Body vượt giới hạn JSON hiện có của Gateway MUST bị từ chối ở tầng transport trước khi tới
  Learning; GW-002 không thay đổi giới hạn này.
- Learning trả redirect hoặc lỗi bất thường trên route Problem MUST không làm Gateway chuyển tiếp
  `Location`/`Set-Cookie` không được phép; status/body vẫn theo FR-010.

## Yêu cầu bảo mật

- **GW-002-SR-001:** Access token, refresh token, cookie, mật khẩu, bí mật ký và header
  `Authorization` MUST NOT xuất hiện trong log hay thông điệp lỗi.
- **GW-002-SR-002:** Client MUST NOT thiết lập được ngữ cảnh định danh/vai trò/quyền tin cậy. Mọi
  header `x-auth-*` do client gửi MUST bị loại bỏ và chỉ được đặt lại từ access token đã xác minh.
- **GW-002-SR-003:** Raw `Cookie` MUST NOT được chuyển tới Learning trên route Problem; `Set-Cookie`
  của Learning MUST NOT được chuyển về client trên route Problem.
- **GW-002-SR-004:** Route judge-package nội bộ và mọi tài liệu judge ẩn MUST NOT truy cập được qua
  Gateway công khai bằng route, tham số, header, ngôn ngữ hay path traversal.
- **GW-002-SR-005:** Gateway MUST NOT truy cập cơ sở dữ liệu, entity, repository, migration hay
  source internals của Learning hay bất kỳ service nào khác.
- **GW-002-SR-006:** Với xác thực bằng cookie, Gateway MUST thực thi kiểm tra Origin/Referer và CSRF
  cho method không an toàn theo cấu hình hiện có.
- **GW-002-SR-007:** Lỗi xác thực MUST NOT phân biệt tài khoản không tồn tại, token sai, phiên bị thu
  hồi hay chi tiết nội bộ của Identity.
- **GW-002-SR-008:** Header tin cậy nội bộ như `x-internal-service-secret` MUST bị loại bỏ khỏi mọi
  request công khai; client MUST NOT kích hoạt được nhánh xử lý service-to-service của Learning.

## Tiêu chí nghiệm thu

- **GW-002-AC-001:** Cho trước một request hợp lệ tới bất kỳ route Problem nào trong bảng Đầu vào,
  khi đi qua Gateway, thì request được gửi tới `LEARNING_SERVICE_URL` với path và query giữ nguyên.
- **GW-002-AC-002:** Cho trước một path như `/api/problemsX` hoặc `/api/problems-old`, khi đi qua
  Gateway, thì path đó không được coi là route Problem và không được chuyển tới Learning như một
  route Problem.
- **GW-002-AC-003:** Cho trước path chứa dot segment hoặc dấu `\` có thể chuẩn hoá ra ngoài
  `/api/problems`, khi đi qua Gateway, thì Gateway trả `400` và không gọi upstream.
- **GW-002-AC-004:** Cho trước request Problem không có token hợp lệ, khi đi qua Gateway, thì trả
  `401` và không có request nào tới Learning.
- **GW-002-AC-005:** Cho trước token sai/hết hạn/đã thu hồi, khi đi qua Gateway, thì trả `401`; cho
  trước Identity không khả dụng, thì trả `503`.
- **GW-002-AC-006:** Cho trước request có header `x-auth-user-id`, `x-auth-roles`,
  `x-auth-permissions`, `x-client-ip` hoặc `x-internal-service-secret` giả mạo, khi đi qua Gateway,
  thì các header đó bị loại bỏ; `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions` được đặt từ
  claim đã xác minh; token thiếu `permissions` cho ra header rỗng.
- **GW-002-AC-007:** Cho trước xác thực bằng cookie với method không an toàn, khi Origin/Referer
  hoặc CSRF không hợp lệ, thì trả `403`; khi hợp lệ, thì Learning nhận `Authorization: Bearer` và
  không nhận `Cookie`.
- **GW-002-AC-008:** Cho trước Learning trả `400`, `403`, `404`, `409` hoặc `5xx`, khi đi qua
  Gateway, thì status và body được giữ nguyên; `Set-Cookie` của Learning không được chuyển tiếp.
- **GW-002-AC-009:** Cho trước request tới `internal/problems/:id/judge-package/:language` hoặc path
  cố ý viết lại tới route đó, khi đi qua Gateway công khai, thì route nội bộ không được chạm tới.
- **GW-002-AC-010:** Cho trước một request Problem, khi đi qua Gateway, thì `x-request-id` có mặt
  trên request tới Learning và trên phản hồi; log không chứa token/cookie/bí mật.
- **GW-002-AC-011:** Cho trước cấu hình giới hạn tần suất hiện tại, khi gửi request Problem vượt
  ngưỡng, thì Gateway trả `429`; không có đường vòng riêng cho Problem.
- **GW-002-AC-012:** Cho trước mã nguồn Gateway sau thay đổi, thì không có entity/repository/
  migration/cơ sở dữ liệu Problem, không có kiểm tra `problem:*`/quyền sở hữu/vòng đời Problem, và
  chiều phụ thuộc vẫn là `presentation -> application -> infrastructure`.
- **GW-002-AC-013:** Cho trước các test Gateway và các lệnh chất lượng repository, thì test liên
  quan vượt qua, `pnpm lint`, `pnpm typecheck` và `pnpm build:gateway` thành công.

## Ngoài phạm vi

- Thay đổi route, DTO, mã lỗi, quy tắc vòng đời, quyền `problem:*`, quyền sở hữu hay bất kỳ nghiệp
  vụ Problem nào của Learning.
- Triển khai CRUD Test Case/harness hoặc hành vi judge; các route này chỉ được chuyển tiếp.
- Mở route judge-package nội bộ ra công khai hoặc cấp quyền cho client công khai.
- Thêm cơ chế xác thực mới, refresh token mới, OAuth mới hay thay đổi claim token.
- Thêm RBAC, kiểm tra quyền theo tài nguyên hoặc đường vòng cho `ADMIN` ở Gateway.
- Thay đổi chính sách giới hạn tần suất, thêm cache, API composition, GraphQL hay WebSocket cho
  Problem.
- Thay đổi giới hạn kích thước body, timeout upstream hoặc cấu hình CORS hiện có, trừ khi một lỗi
  tương thích hẹp được phát hiện và ghi rõ.
- Xây dựng service Problem riêng hoặc chuyển quyền sở hữu Problem khỏi Learning.

## Phụ thuộc

- [LRN-001 Quản lý Problem](../../../02-learning/problems/spec.md) — phiên bản Approved `1.1`, đặc biệt
  là LRN-001-FR-006, LRN-001-FR-026, LRN-001-SR-002 và LRN-001-AC-005/AC-007.
- [LRN-001 tasks](../../../02-learning/problems/tasks.md) — mục `LRN-001-T039` là bằng chứng cần hoàn
  tất ở Gateway; GW-002 không sửa đặc tả LRN-001 đã Approved.
- [LRN-002 Quản lý Test Case](../../../02-learning/test-cases/spec.md) — nguồn của các route test-case
  và harness được chuyển tiếp.
- [ID-001 Authentication](../../../01-identity/authentication/spec.md) — access token, phiên và claim.
- [ID-003 RBAC](../../../01-identity/rbac/spec.md) — claim `permissions` và truyền qua Gateway.
- [GW-001 Cấu trúc lớp API Gateway](../../identity/spec.md) — kiến trúc phân tầng và hành vi proxy/xác thực
  hiện có.
- [Kiến trúc API Gateway](../../../../architecture/api-gateway.md)
- [Quy tắc phụ thuộc](../../../../architecture/dependency-rules.md)
- [Chiến lược giao tiếp](../../../00-system/communication.md)
- [Ranh giới service](../../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../../00-system/roles-permissions.md)
- [Định nghĩa Hoàn thành](../../../00-system/definition-of-done.md)

## Câu hỏi mở

Không còn câu hỏi về hành vi hoặc hợp đồng. Spec được phê duyệt theo chỉ đạo trực tiếp của người dùng sau khi đối chiếu LRN-001/LRN-002, các route Gateway và kiến trúc API Gateway.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review          | Tóm tắt                                                                  |
| ---------- | --------- | ----------------------------- | ------------------------------------------------------------------------ |
| 2026-11-04 | 0.1       | Codex theo chỉ đạo người dùng | Phê duyệt sau review Gateway contract, route Learning và kiến trúc       |
| 2026-11-03 | 0.1       | opencode                      | Đề xuất hợp đồng biên cho họ route Problem; đóng lỗ hổng path/header hẹp |
