# ID-002 Profile

## Trạng thái

Approved

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép một người dùng BKPractice đã xác thực xem và duy trì tập nhỏ thông tin hồ sơ cá nhân mà nền
tảng học tập và Community cần, trong khi vẫn bảo toàn quyền sở hữu dữ liệu xác thực, phân quyền, học
tập và nộp bài ở các miền tương ứng của chúng.

## Tác nhân

- **STUDENT:** Sở hữu và duy trì hồ sơ của chính mình.
- **LECTURER:** Sở hữu và duy trì hồ sơ của chính mình; không quản lý hồ sơ của người dùng khác
  thông qua ID-002.
- **ADMIN:** Có thể xem và cập nhật các trường thuộc sở hữu của hồ sơ cho một người dùng khác, phục
  vụ việc quản trị nền tảng.
- **Khách chưa xác thực:** Chỉ có thể xem phần công khai trong hồ sơ của một người dùng đang tồn tại.
- **Identity Service:** Sở hữu state của hồ sơ và chính sách truy cập hồ sơ.
- **Cloudflare R2:** Ranh giới lưu trữ ảnh bên ngoài cho các đối tượng avatar; nó không sở hữu bản
  ghi Profile hay dữ liệu tài khoản của Identity.

## Bối cảnh

Xác thực trả lời câu hỏi **“Bạn là ai?”** và được định nghĩa bởi
[ID-001 Authentication](../authentication/spec.md). Profile trả lời câu hỏi **“Người dùng này trình
bày thông tin hồ sơ cá nhân nào?”**. Việc quản lý vai trò và quyền vẫn thuộc trách nhiệm của RBAC,
còn khoá học, lớp, tiến độ, bài nộp và bài viết Community vẫn thuộc sở hữu của các service tương ứng.

Nền tảng Identity đã có sẵn một quan hệ Profile trên mỗi User, với `displayName`, `avatarUrl` và
`bio`. ID-002 định nghĩa hành vi xoay quanh các trường đó và không thêm đồ thị mạng xã hội nào. Hồ sơ
được tạo trễ (lazy) vì các tài khoản cũ hoặc mới được cấp có thể chưa có dòng Profile. Khi một hồ sơ
lần đầu được yêu cầu hoặc cập nhật, tên hiển thị ban đầu của nó lấy từ tên chính thức do ranh giới
cấp tài khoản đã phê duyệt cung cấp.

Ảnh avatar được lưu trên Cloudflare R2. ID-002 coi avatar là một tham chiếu tới đối tượng R2 đã phê
duyệt và không định nghĩa một nhà cung cấp lưu trữ đối tượng mới. Chi tiết về bucket, object key và
cách hiện thực thông tin xác thực thuộc về một `plan.md` sau này.

## Yêu cầu chức năng

- **ID-002-FR-001 — Quyền sở hữu hồ sơ:** Mỗi User của BKPractice MUST có nhiều nhất một Profile
  thuộc sở hữu của Identity gắn với User đó.
- **ID-002-FR-002 — Khởi tạo hồ sơ trễ:** Khi một User đang tồn tại nhưng chưa có Profile lần đầu
  truy xuất hoặc cập nhật Profile của chính mình, Identity MUST tạo Profile với tên chính thức đã
  được cấp làm `displayName` ban đầu.
- **ID-002-FR-003 — Xem hồ sơ của mình:** Một người dùng đã xác thực MUST có thể truy xuất Profile
  của chính mình.
- **ID-002-FR-004 — Cập nhật hồ sơ của mình:** Một người dùng đã xác thực MUST có thể cập nhật một
  phần các trường Profile chỉnh sửa được của chính mình.
- **ID-002-FR-005 — Các trường chỉnh sửa được:** Trong v1, chủ sở hữu MAY chỉ cập nhật
  `displayName`, tham chiếu avatar và `bio`; một lần cập nhật một phần MUST để nguyên các trường bị
  bỏ qua.
- **ID-002-FR-006 — Các trường bị kiểm soát:** Việc cập nhật Profile MUST NOT thay đổi email,
  MSSV/mã số sinh viên, vai trò, quyền, trạng thái tài khoản, mật khẩu hay bất kỳ trường xác
  thực/tài khoản nào khác.
- **ID-002-FR-007 — Hồ sơ công khai:** Hệ thống MUST cung cấp một thao tác đọc hồ sơ công khai cho
  một người dùng đang tồn tại, chỉ phơi bày các trường Profile công khai đã phê duyệt.
- **ID-002-FR-008 — Các trường công khai:** Biểu diễn Profile công khai MUST chỉ chứa `displayName`,
  tham chiếu/URL avatar và `bio`.
- **ID-002-FR-009 — Bảo mật riêng tư của hồ sơ:** Email, MSSV/mã số sinh viên, dữ liệu mật khẩu, vai
  trò, quyền, trạng thái tài khoản, dữ liệu phiên refresh và các định danh nhà cung cấp MUST NOT bị
  phơi bày bởi thao tác Profile công khai.
- **ID-002-FR-010 — Quản lý hồ sơ của Admin:** ADMIN MUST có thể xem và cập nhật các trường thuộc sở
  hữu của Profile của một người dùng khác, tuân theo cùng các hạn chế về trường bị kiểm soát.
- **ID-002-FR-011 — Ranh giới của Giảng viên:** LECTURER MUST có thể quản lý Profile của chính mình
  nhưng MUST NOT cập nhật Profile của người dùng khác thông qua ID-002.
- **ID-002-FR-012 — Ranh giới lưu trữ avatar:** Avatar của một Profile MUST tham chiếu tới một đối
  tượng đã phê duyệt được lưu qua Cloudflare R2. ID-002 MUST NOT lưu các URL ảnh bên ngoài tuỳ ý do
  client cung cấp như thể chúng là avatar do BKPractice quản lý.
- **ID-002-FR-013 — Kiểm tra dữ liệu đầu vào:** Dữ liệu đầu vào của Profile MUST được kiểm tra về
  hình dạng trường, khả năng nhận null được hỗ trợ, và định dạng tham chiếu avatar đã phê duyệt,
  trước khi state của Profile thay đổi.
- **ID-002-FR-014 — Ranh giới miền của Profile:** Profile của Identity MUST NOT sở hữu hay lưu trữ
  dữ liệu về lớp, khoá học, tiến độ học tập, bài đã giải, điểm, lịch sử nộp bài hay bài viết
  Community.
- **ID-002-FR-015 — Vòng đời hồ sơ ổn định:** Việc truy xuất và cập nhật Profile MUST an toàn khi
  thực hiện lại; việc khởi tạo đồng thời MUST dẫn tới nhiều nhất một Profile cho một User.
- **ID-002-FR-016 — Không xoá tài khoản:** ID-002 MUST NOT xoá tài khoản User khi một trường Profile
  bị xoá trống; các giá trị avatar và bio cho phép null MAY được xoá trống theo contract cập nhật.

## Quy tắc nghiệp vụ

- `displayName`, tham chiếu avatar và `bio` là các trường v1 duy nhất thuộc sở hữu của Profile.
- `displayName` được khởi tạo từ giá trị `họ tên` đã import khi việc tạo trễ diễn ra. Chủ sở hữu sau
  đó có thể cá nhân hoá `displayName`; nó MUST dài tối đa 100 ký tự.
- `bio` là tuỳ chọn và MUST dài tối đa 1.000 ký tự khi được cung cấp. Văn bản trong Profile được cắt
  khoảng trắng ở đầu và cuối, bảo toàn ký tự Unicode (bao gồm tiếng Việt), và không chuyển tự hay đổi
  hoa thường nội dung của người dùng.
- `studentId/MSSV` vẫn là định danh tài khoản do Authentication sử dụng và không bị nhân bản thành
  một giá trị thuộc sở hữu của Profile. `email` vẫn là định danh tài khoản và không chỉnh sửa được
  qua Profile.
- `lớp/className` vẫn thuộc sở hữu của Learning. Khoa, bộ môn, mã giảng viên và các trường học thuật
  khác không thuộc ID-002 v1.
- Một hồ sơ công khai chỉ chứa ba trường Profile không nhạy cảm. Dữ liệu tài khoản và phân quyền
  không trở thành công khai chỉ vì người dùng có một Profile.
- Việc tạo Profile là trễ, nhưng việc khởi tạo là idempotent và dùng tên chính thức đã được cấp làm
  giá trị khởi đầu. Không đưa vào bước onboarding bắt buộc hay cổng chặn yêu cầu hoàn thiện Profile.
- Việc thay hoặc xoá avatar sẽ thay đổi tham chiếu R2 đã phê duyệt của Profile. Việc phân phối avatar
  công khai dùng một signed URL ngắn hạn cho đối tượng R2 đã phê duyệt; các URL R2 trực tiếp tuỳ ý
  không được phơi bày như contract công khai.
- Việc thay hoặc xoá avatar MUST xoá/cập nhật tham chiếu trong Profile trước. Đối tượng R2 cũ đủ điều
  kiện để dọn dẹp bất đồng bộ sau một khoảng ân hạn được cấu hình; việc dọn dẹp thất bại MUST NOT làm
  hoàn tác một lần cập nhật Profile đã thành công.
- Hồ sơ công khai của một tài khoản `LOCKED` hoặc `PENDING` trả về một kết quả không khả dụng chung
  chung và không tiết lộ trạng thái tài khoản. Các lượt đọc có thẩm quyền của chủ sở hữu/Admin tiếp
  tục tuân theo các quy tắc phân quyền của Profile riêng tư.
- Một thao tác Profile không bao giờ cấp quyền truy cập khoá học, lớp, tiến độ, bài nộp hay khả năng
  kiểm duyệt của Community.

## Quy tắc phân quyền

- Cần một access token BKPractice hợp lệ để xem hoặc cập nhật Profile riêng tư của chính mình.
- STUDENT và LECTURER chỉ được đọc và cập nhật các trường thuộc sở hữu Profile của chính mình.
- ADMIN có thể đọc và cập nhật các trường thuộc sở hữu Profile của người dùng khác, nhưng các API
  Profile không thể thay đổi trạng thái tài khoản, vai trò, quyền, thông tin đăng nhập hay định danh.
- Khách chưa xác thực chỉ được đọc biểu diễn công khai trong Profile của một người dùng đang tồn tại.
- LECTURER không có quyền ID-002 nào để cập nhật Profile của một Sinh viên hay của một Giảng viên
  khác.
- Community service có thể tham chiếu `authorId`, nhưng nó không có quyền truy cập trực tiếp vào cơ
  sở dữ liệu của Identity; việc ghép dữ liệu hồ sơ cho Community vẫn là một tích hợp xuyên service
  trong tương lai.
- Các quyết định về xác thực và RBAC vẫn nằm ở ID-001/ID-003 và không được Profile hiện thực lại.

## Đầu vào

### Đọc hồ sơ của mình — theo ý niệm `GET /api/profile/me`

Yêu cầu một access token Bearer BKPractice hợp lệ và không nhận user ID nào do người gọi cung cấp để
xác định chủ sở hữu.

### Cập nhật hồ sơ của mình — theo ý niệm `PATCH /api/profile/me`

Chấp nhận một đối tượng một phần chỉ chứa:

| Trường        | Yêu cầu                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `displayName` | Tuỳ chọn trong cập nhật một phần; khi có mặt, phải là tên hiển thị không rỗng, tối đa 100 ký tự |
| `avatar`      | Tham chiếu tới đối tượng R2 đã phê duyệt, tuỳ chọn, hoặc một thao tác xoá trống tường minh      |
| `bio`         | Chuỗi tuỳ chọn tối đa 1.000 ký tự, hoặc null tường minh để xoá trống                            |

Request MUST từ chối email, MSSV/mã số sinh viên, vai trò, quyền, trạng thái tài khoản, mật khẩu,
định danh nhà cung cấp, URL chuyển hướng tuỳ ý và các trường không xác định.

### Đọc hồ sơ công khai — theo ý niệm `GET /api/users/:userId/profile`

Nhận ID Identity ổn định của người dùng đích và chỉ trả về biểu diễn Profile công khai. Nó không chấp
nhận một yêu cầu tiết lộ các trường tài khoản riêng tư.

### Quản lý hồ sơ của Admin — theo ý niệm `GET/PATCH /api/users/:userId/profile`

Cùng thao tác trên hồ sơ đích MAY được ADMIN sử dụng. Dữ liệu cập nhật vẫn giới hạn trong ba trường
thuộc sở hữu của Profile; một request của ADMIN không thể sửa đổi dữ liệu tài khoản hay phân quyền
thông qua Profile.

Cách đặt tên route chính xác, hình dạng DTO và việc phân quyền tải lên R2 thuộc về một kế hoạch triển
khai sau này và MUST tuân theo quy ước Gateway/API hiện có.

## Đầu ra

- Các lượt đọc hồ sơ của chính mình trả về các trường thuộc sở hữu của Profile và mối liên hệ ổn định
  với người dùng cục bộ mà contract API đã phê duyệt yêu cầu; chúng không trả về mật khẩu/bản băm,
  phiên refresh hay dữ liệu nhà cung cấp.
- Các lượt đọc hồ sơ công khai trả về đúng `displayName`, tham chiếu/URL avatar và `bio`.
- Giá trị avatar công khai trong các phản hồi hồ sơ công khai là các signed URL ngắn hạn cho những
  đối tượng R2 đã phê duyệt; phản hồi không phơi bày các URL lưu trữ trực tiếp tuỳ ý.
- Lượt đọc/cập nhật hồ sơ của chính mình lần đầu có thể tạo ra Profile còn thiếu và trả về kết quả đã
  khởi tạo trong cùng thao tác đó.
- Các lần cập nhật một phần thành công trả về biểu diễn Profile kết quả mà không thay đổi các trường
  bị bỏ qua.
- Việc xoá trống avatar hoặc bio trả về một hồ sơ thành công với trường cho phép null tương ứng để
  trống; nó không bao giờ xoá tài khoản User.
- Các thay đổi trong Profile không phát hành, thu hồi hay xoay vòng token của Authentication, và
  không cập nhật state nghiệp vụ của Learning, Submission hay Community.

## Tình huống lỗi

| Trường hợp                                                                                 | Hành vi quan sát được                                                                                  |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Thiếu/sai access token ở thao tác riêng tư                                                 | Quy ước Gateway/xác thực hiện có trả về 401                                                            |
| Người dùng đích hoặc hồ sơ công khai không tồn tại                                         | Quy ước không tìm thấy hiện có của Identity trả về 404 mà không phơi bày dữ liệu không liên quan       |
| Hồ sơ công khai thuộc một tài khoản `LOCKED` hoặc `PENDING`                                | Kết quả không khả dụng/không tìm thấy chung chung, không tiết lộ trạng thái tài khoản                  |
| Hình dạng trường không hợp lệ, giá trị không được hỗ trợ, trường lạ hoặc tham chiếu R2 sai | Lỗi kiểm tra dữ liệu (400) và không thay đổi state của Profile                                         |
| Thử cập nhật email, MSSV, vai trò, quyền, trạng thái, mật khẩu hay dữ liệu nhà cung cấp    | Bị từ chối như trường bị cấm/không hợp lệ (403 hoặc quy ước kiểm tra dữ liệu hiện có), không đổi state |
| LECTURER thử cập nhật Profile của người dùng khác                                          | 403 và không thay đổi state                                                                            |
| Người không phải ADMIN thử quản lý Profile của người dùng khác                             | 403 và không thay đổi state                                                                            |
| Khởi tạo Profile lần đầu đồng thời                                                         | Chỉ còn lại một Profile; các lần thử lại trả về cùng một Profile về mặt logic                          |
| Phụ thuộc R2 không khả dụng trong một thao tác avatar đã phê duyệt                         | Lỗi phụ thuộc chuẩn hoá hiện có; không commit tham chiếu Profile treo lơ lửng nào                      |
| Lỗi lưu trữ ngoài dự kiến                                                                  | Cấu trúc lỗi chuẩn hoá hiện có kèm request/correlation ID                                              |

ID-002 không đưa ra cấu trúc lỗi mới. Việc tuần tự hoá HTTP tuân theo quy ước Identity/Gateway mà nền
tảng đã thiết lập.

## Tình huống biên

- Một tài khoản đã import có thể bị tạo Profile trễ nhiều lần đồng thời; tính duy nhất và tính
  idempotent phải ngăn việc tạo Profile trùng lặp.
- Một User cũ không có tên chính thức đã được cấp và dùng được thì không thể khởi tạo bằng một giá trị
  định danh bịa ra; thao tác báo lỗi dữ liệu hiện có và không tạo ra một Profile rỗng.
- Một trường bị bỏ qua trong PATCH thì giữ nguyên; việc xoá trống tường minh avatar/bio cho phép null
  là có chủ đích.
- Việc thay avatar không được phơi bày các URL bên ngoài tuỳ ý như thể là nội dung R2 tin cậy.
- Các lượt đọc công khai không bao giờ trở thành cách để dò tìm email, MSSV, vai trò, trạng thái tài
  khoản hay state xác thực.
- Một đối tượng R2 đã bị xoá hoặc không truy cập được có thể dẫn tới một tham chiếu avatar hỏng; việc
  dọn dẹp bất đồng bộ dùng một khoảng ân hạn được cấu hình và độc lập với việc xoá tài khoản.
- Việc khoá hoặc đổi vai trò của một User không cho phép thao tác Cập nhật hồ sơ đi vòng qua
  Authentication hay RBAC.
- Dữ liệu Profile vẫn khả dụng độc lập với tiến độ Learning, lịch sử Submission và nội dung Community.

## Yêu cầu bảo mật

- **ID-002-SR-001 — Thực thi quyền sở hữu:** Các lượt đọc/cập nhật Profile riêng tư MUST kiểm chứng
  định danh đã xác thực của người gọi, và các lần cập nhật xuyên người dùng MUST đòi hỏi vai trò
  ADMIN đã phê duyệt.
- **ID-002-SR-002 — Chống gán hàng loạt:** Dữ liệu đầu vào của Profile MUST liệt kê tường minh các
  trường chỉnh sửa được và từ chối các trường lạ hoặc thuộc về tài khoản/phân quyền.
- **ID-002-SR-003 — Dữ liệu tài khoản bị kiểm soát:** Các API Profile MUST không bao giờ thay đổi hay
  phơi bày bản băm mật khẩu, refresh token, thông tin xác thực nhà cung cấp, email, MSSV, vai trò,
  quyền hay trạng thái tài khoản ngoài phạm vi hiển thị đã phê duyệt của chúng.
- **ID-002-SR-004 — Riêng tư ở phần công khai:** Các phản hồi Profile công khai MUST chỉ chứa các
  trường không nhạy cảm đã phê duyệt và MUST NOT làm rò rỉ chi tiết về sự tồn tại của tài khoản riêng
  tư vượt ra ngoài kết quả hồ sơ được yêu cầu.
- **ID-002-SR-005 — Toàn vẹn của avatar:** Các tham chiếu avatar MUST bị giới hạn trong những đối
  tượng R2 đã phê duyệt; các URL tuỳ ý từ client hay thông tin xác thực lưu trữ không tin cậy MUST
  NOT được lưu.
- **ID-002-SR-006 — An toàn dữ liệu đầu vào:** Các giá trị của Profile MUST đi qua các quy ước kiểm
  tra dữ liệu và tuần tự hoá đầu ra dùng chung trước khi được lưu hoặc trả về.
- **ID-002-SR-007 — Ghi log an toàn:** Mật khẩu, token, header Authorization, thông tin xác thực R2
  và các trường tài khoản nhạy cảm MUST NOT xuất hiện trong log hay lỗi của Profile.
- **ID-002-SR-008 — Cách ly service:** Profile MUST NOT truy vấn cơ sở dữ liệu của service khác hay
  nhân bản các thực thể nghiệp vụ của Learning, Submission, Community hay RBAC.

## Tiêu chí nghiệm thu

- **ID-002-AC-001:** Cho trước một người dùng đã xác thực, khi họ yêu cầu Profile của chính mình, thì
  Identity trả về dữ liệu thuộc sở hữu của Profile mà không kèm trường mật khẩu, token hay bí mật của
  nhà cung cấp.
- **ID-002-AC-002:** Cho trước một User đang tồn tại nhưng chưa có Profile và có tên chính thức đã
  được cấp, khi người dùng lần đầu đọc hoặc cập nhật Profile của mình, thì một Profile được tạo với
  tên đó làm `displayName` ban đầu.
- **ID-002-AC-003:** Cho trước một người dùng đã xác thực, khi họ cập nhật `displayName`, tham chiếu
  avatar hoặc `bio`, thì chỉ các trường chỉnh sửa được đã cung cấp thay đổi và Profile kết quả được
  trả về.
- **ID-002-AC-004:** Cho trước một lần cập nhật xoá trống tường minh avatar hoặc bio cho phép null,
  khi việc kiểm tra dữ liệu thành công, thì trường đó được xoá trống mà không xoá tài khoản User.
- **ID-002-AC-005:** Cho trước các giá trị sai định dạng, trường không được hỗ trợ hoặc tham chiếu
  avatar không hợp lệ, khi việc kiểm tra dữ liệu của Profile chạy, thì request bị từ chối và state của
  Profile không đổi.
- **ID-002-AC-005a:** Cho trước một `displayName` dài hơn 100 ký tự, khi việc kiểm tra dữ liệu của
  Profile chạy, thì request bị từ chối và state của Profile không đổi.
- **ID-002-AC-005b:** Cho trước một `bio` dài hơn 1.000 ký tự, khi việc kiểm tra dữ liệu của Profile
  chạy, thì request bị từ chối và state của Profile không đổi; nội dung Unicode hợp lệ được bảo toàn
  sau khi cắt khoảng trắng bên ngoài.
- **ID-002-AC-006:** Cho trước một request chứa các trường email, MSSV, vai trò, quyền, trạng thái
  tài khoản, mật khẩu hay nhà cung cấp, khi thử cập nhật Profile, thì request không thể thay đổi các
  trường đó.
- **ID-002-AC-007:** Cho trước một người gọi chưa xác thực, khi thử đọc/cập nhật hồ sơ riêng tư của
  chính mình, thì ranh giới xác thực hiện có từ chối request.
- **ID-002-AC-008:** Cho trước một người dùng đang tồn tại, khi một hồ sơ công khai được yêu cầu, thì
  phản hồi chỉ chứa `displayName`, tham chiếu/URL avatar và `bio`.
- **ID-002-AC-008a:** Cho trước một tài khoản `LOCKED` hoặc `PENDING`, khi một hồ sơ công khai được
  yêu cầu bởi người chưa xác thực, thì phản hồi là kết quả không khả dụng/không tìm thấy chung chung
  và không tiết lộ trạng thái tài khoản.
- **ID-002-AC-009:** Cho trước một request hồ sơ công khai, khi kiểm tra phản hồi, thì email, MSSV,
  mật khẩu/bản băm, vai trò, quyền, trạng thái tài khoản, dữ liệu refresh và định danh nhà cung cấp
  đều vắng mặt.
- **ID-002-AC-010:** Cho trước một ADMIN và Profile của một người dùng khác, khi ADMIN đọc hoặc cập
  nhật nó, thì chỉ các trường thuộc sở hữu của Profile là quản lý được.
- **ID-002-AC-011:** Cho trước một LECTURER hoặc STUDENT và Profile của một người dùng khác, khi họ
  thử cập nhật nó, thì thao tác bị cấm và không state nào thay đổi.
- **ID-002-AC-012:** Cho trước hai request Profile lần đầu đồng thời cho cùng một User, khi cả hai
  hoàn tất, thì tồn tại nhiều nhất một Profile và cả hai phản hồi thành công đều biểu diễn cùng một
  Profile.
- **ID-002-AC-013:** Cho trước một lần cập nhật avatar hợp lệ, khi kiểm tra tham chiếu đã lưu, thì nó
  trỏ tới một đối tượng Cloudflare R2 đã phê duyệt chứ không phải một URL bên ngoài tuỳ ý.
- **ID-002-AC-013a:** Cho trước một hồ sơ công khai có avatar, khi kiểm tra phản hồi, thì giá trị
  avatar là một signed URL ngắn hạn cho đối tượng R2 đã phê duyệt.
- **ID-002-AC-013b:** Cho trước một thao tác thay hoặc xoá avatar, khi việc cập nhật Profile thành
  công, thì tham chiếu Profile mới/rỗng được commit ngay lập tức và việc dọn dẹp đối tượng cũ là bất
  đồng bộ và không làm thất bại lần cập nhật Profile.
- **ID-002-AC-014:** Cho trước các thao tác Profile, khi kiểm tra lớp lưu trữ của Identity, thì không
  có dữ liệu về lớp, khoá học, tiến độ, bài đã giải, điểm, lịch sử nộp bài hay bài viết Community nào
  được tạo hoặc truy vấn.
- **ID-002-AC-015:** Cho trước một lần cập nhật hoặc đọc Profile, khi rà soát log và lỗi, thì không
  mật khẩu, token, thông tin xác thực R2 hay trường tài khoản nhạy cảm nào bị ghi log hoặc trả về.

## Ngoài phạm vi

- Xác thực, đăng nhập, đăng xuất, refresh token và hành vi định danh của `/auth/me`
- Đổi mật khẩu và Đổi email
- Quên/Đặt lại mật khẩu
- Quản lý vai trò, quyền và RBAC
- Khoá/mở khoá tài khoản, xoá tài khoản và phê duyệt giảng viên
- Phân tích Excel, cấp tài khoản sinh viên và báo cáo import
- Ghi danh vào lớp, quyền sở hữu khoa/lớp và tiến độ Learning
- Lịch sử nộp bài, điểm số, thành tích và huy hiệu
- Bài viết, bình luận, phản ứng, người theo dõi, bạn bè, dòng thời gian hay nhắn tin của Community
- Hạ tầng lưu trữ avatar khác ngoài ranh giới Cloudflare R2 đã chọn
- Xác minh hồ sơ, phân tích số liệu, cổng chặn hoàn thiện/onboarding và uy tín xã hội
- Các thay đổi về OAuth Google/Microsoft, MFA, SSO, Keycloak và các nhà cung cấp định danh bên ngoài

## Phụ thuộc

- [ID-001 Authentication](../authentication/spec.md)
- [Kiến trúc Identity Service](../../../docs/architecture/identity-service.md)
- [Ranh giới service](../../../specs/00-system/service-boundaries.md)
- [Vai trò và quyền](../../../specs/00-system/roles-permissions.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [Kiến trúc hệ thống](../../../docs/architecture/system-architecture.md)
- [Quy trình SDD](../../README.md)
- Contract cấp tài khoản của quản trị viên đã phê duyệt cung cấp giá trị `họ tên` ban đầu; ID-002
  không hiện thực luồng import đó.
- Cloudflare R2 là ranh giới lưu trữ avatar đã chọn. Thông tin xác thực, chính sách bucket, giới hạn
  tải lên, vòng đời đối tượng và luồng client/server chính xác vẫn là các vấn đề của kế hoạch triển
  khai.

## Câu hỏi mở

Không còn. Các quyết định sản phẩm đã ghi trong đặc tả này là đủ cho giai đoạn SDD tiếp theo.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review | Tóm tắt                                                                                      |
| ---------- | --------- | -------------------- | -------------------------------------------------------------------------------------------- |
| 2026-09-01 | 0.1       | Codex / TBD          | Đặc tả Profile ban đầu ở trạng thái Proposed                                                 |
| 2026-09-01 | 0.2       | Quyết định sản phẩm  | Chốt displayName 100 ký tự, signed URL R2, async avatar cleanup và ẩn profile LOCKED/PENDING |
| 2026-09-01 | 0.3       | Chủ sở hữu sản phẩm  | Phê duyệt đặc tả ID-002 Profile                                                              |
| 2026-09-01 | 0.4       | Chủ sở hữu sản phẩm  | Chốt bio tối đa 1.000 ký tự và quy tắc xử lý Unicode                                         |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực DTO, adapter R2, ánh xạ cơ sở dữ
> liệu và thứ tự thực thi thuộc về một `plan.md` sau này, sau khi có phê duyệt của con người.
