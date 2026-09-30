# SUB-004 Kết quả realtime (Realtime Result)

## Trạng thái

Proposed

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép một người học theo dõi kết quả chạy thử và nộp bài trong thời gian thực mà không phải
tự làm mới trang, bằng cách để Submission phát kết quả cho đúng chủ sở hữu qua một luồng đẩy do
Gateway phục vụ. Đồng thời bảo đảm rằng realtime chỉ là một tối ưu trải nghiệm: kết quả vẫn phải
tới được người học qua polling, và không có trường hợp nào mà người học mất kết quả vì realtime
hỏng.

## Tác nhân

- **STUDENT (người học):** Người học đã xác thực theo dõi kết quả của Run hoặc nộp bài chính thức
  của chính họ.
- **Khách chưa xác thực:** Người gọi không có ngữ cảnh định danh tin cậy. Tác nhân này MUST NOT mở
  được kênh realtime và MUST NOT nhận kết quả của bất kỳ ai.
- **API Gateway:** Chủ sở hữu phía client của kênh realtime. Nó xác minh access token, mở kênh,
  thông báo kết quả tới đúng người đã kết nối, và đóng kênh theo chính sách vòng đời.
- **Submission Service:** Chủ sở hữu nội dung kết quả và quyết định **có phát hay không**. Nó phát
  sau khi kết quả đã được lưu bền vững.
- **Redis:** Hạ tầng truyền thông nội bộ cho tín hiệu realtime. Nó không sở hữu kết quả và không
  phải nguồn chân lý.

## Bối cảnh

Realtime là phần dễ bị hiểu sai nhất trong Submission, vì nó có vẻ giống một đường truyền dữ liệu
quan trọng, trong khi thực tế nó chỉ là một kênh báo "hãy đọc lại".

Nền tảng hiện tại chưa có đường ống realtime hoàn chỉnh. Kiến trúc đã chốt các điểm sau, và
SUB-004 chỉ mô tả hành vi, không thiết kế cơ chế:

- Redis pub/sub là kênh nội bộ giữa Submission và Gateway.
- Gateway là bên sở hữu phía client của kênh đẩy. Submission không mở kết nối tới trình duyệt.
- `specs/00-system/communication.md` chỉ phê duyệt **một chiều** cho tin realtime, và chỉ dành cho
  thông báo không quan trọng. Phát lại kết quả cho nhiều instance Gateway chưa được kiểm chứng trong
  kiến trúc.

Hai hệ quả trực tiếp của việc realtime là một chiều và là best-effort:

1. **Một thông báo có thể tới đúng một instance Gateway, hoặc không tới instance nào.** Nếu người
   học đang kết nối với một instance khác, thông báo không tới. Đây không phải lỗi cần sửa, mà là
   hành vi đã biết.
2. **Không có hàng đợi bền vững, không có lưu trữ, không có phát lại.** Người học có thể không nhận
   được thông báo. Vì vậy polling không phải là phương án dự phòng, mà là **cơ chế bảo đảm duy nhất**
   rằng kết quả tới được người học.

Quyết định sản phẩm đã chốt cho phiên bản này và ràng buộc SUB-004:

- **Realtime là best-effort.** Client MUST có polling dự phòng.
- **Chỉ chủ sở hữu nhận được kết quả của mình.**

## Yêu cầu chức năng

- **SUB-004-FR-001 — Phát sau khi lưu:** Submission MUST chỉ phát kết quả realtime sau khi kết quả
  đã được lưu bền vững. Phát trước khi lưu sẽ khiến người học thấy một trạng thái mà hệ thống
  không giữ được.
- **SUB-004-FR-002 — Kênh theo chủ sở hữu:** Mỗi kênh realtime MUST gắn với đúng một chủ sở hữu
  lấy từ ngữ cảnh tin cậy. Submission MUST phát kết quả vào kênh của chủ sở hữu bản ghi.
- **SUB-004-FR-003 — Chỉ chủ sở hữu:** Một kênh realtime MUST chỉ nhận kết quả của chủ sở hữu kênh.
  Người học MUST NOT nhận được kết quả của người khác, kể cả khi họ biết định danh công khai của
  bản ghi đó.
- **SUB-004-FR-004 — Nội dung thông báo:** Một thông báo kết quả MUST chỉ mang những thông tin có
  giá trị với người học: định danh bản ghi, loại bản ghi, trạng thái, và báo hiệu rằng chi tiết đã
  sẵn sàng để đọc. Nội dung chi tiết được lấy qua
  [SUB-003](../submission-history/spec.md), không đi qua thông báo.
- **SUB-004-FR-005 — Không mang dữ liệu nhạy cảm:** Một thông báo kết quả MUST NOT chứa Test Case,
  kết quả mong đợi, harness, `stdout` hoặc `stderr` từ Test Case ẩn, lệnh biên dịch, tham số
  sandbox, hay thông tin xác thực.
- **SUB-004-FR-006 — Bao gồm cả Run:** Realtime MUST áp dụng cho cả kết quả Run và kết quả nộp bài
  chính thức, vì người học cần biết cả hai đã xong. Việc phân biệt nội dung thông báo giữa hai
  loại chỉ thuộc trường loại bản ghi.
- **SUB-004-FR-007 — Không phát lại nhiều lần cho cùng một bản ghi:** Với mỗi bản ghi, Submission MUST
  phát tối đa một thông báo khi bản ghi chuyển sang trạng thái cuối cùng. Việc áp dụng kết quả lặp
  không được tạo thêm thông báo.
- **SUB-004-FR-008 — Không thông báo lỗi hệ thống ra ngoài:** Một thất bại nội bộ khiến phát realtime
  không được phép làm hỏng kết quả đã lưu, và việc phát thất bại không được tạo thêm thông báo cho
  người học.
- **SUB-004-FR-009 — Polling là bảo đảm duy nhất:** Kết quả của mọi bản ghi phải tới được người học
  qua một cơ chế kéo, bất kể realtime có hoạt động hay không. Nếu bỏ qua hết realtime, người học vẫn
  nhận được mọi kết quả và không mất bản ghi nào.
- **SUB-004-FR-010 — Polling phải bền vững:** Cơ chế kéo phải hoạt động với một bản ghi đã hoàn tất từ
  lâu, không chỉ ngay sau khi phát realtime. Một bản ghi hoàn tất trước khi người học mở trang vẫn
  phải đọc được.
- **SUB-004-FR-011 — Không suy luận trạng thái từ việc im lặng:** Vắng mặt thông báo realtime
  MUST NOT được client diễn giải là một trạng thái. Trạng thái thật chỉ lấy từ dữ liệu.
- **SUB-004-FR-012 — Không phát trạng thái trung gian:** Vì SUB-002 chỉ biết phán quyết cuối cùng,
  Submission MUST chỉ phát khi bản ghi chuyển sang trạng thái cuối cùng. Nếu sau này có trạng thái
  trung gian, việc phát thêm trạng thái đó là Câu hỏi mở.
- **SUB-004-FR-013 — Kết nối thay thế:** Khi một kết nối realtime bị gián đoạn và được mở lại, người
  học MUST vẫn nhận được các kết quả phát sinh trong lúc gián đoạn, nhờ polling. Kênh realtime mới
  mở MUST NOT được coi là đã bù cho các kết quả bị bỏ lỡ.
- **SUB-004-FR-014 — Nhiều phiên của cùng một người học:** Khi cùng một người học mở nhiều phiên, mỗi
  phiên đang mở kênh đều có thể nhận thông báo cho chủ sở hữu đó. Việc phát tới mọi kênh của một
  chủ sở hữu là hành vi được phép, vì mọi kênh đều thuộc cùng một chủ sở hữu đã xác thực.
- **SUB-004-FR-015 — Đóng kênh khi hết hạn xác thực:** Khi access token hết hạn hoặc bị thu hồi, Gateway
  MUST ngừng cấp thông báo cho kênh đó. Kênh cũ MUST NOT tiếp tục nhận kết quả như một kênh hợp lệ.
- **SUB-004-FR-016 — Không thay thế lưu trữ:** Realtime MUST NOT được dùng làm nơi lưu kết quả. Thông
  báo có thể mất, và việc mất thông báo không được làm mất kết quả.

## Quy tắc nghiệp vại

### Vị trí của realtime trong luồng tổng thể

```text
Judge -> RabbitMQ judge.result -> Submission
                                     |
                    (1) luu ket qua vao PostgreSQL
                                     |
                    (2) phat tin realtime qua Redis
                                     |
                    Gateway -> nguoi hoc
                                     |
                    (3) nguoi hoc keo chi tiet tu PostgreSQL
```

- Bước (1) là bắt buộc và là nguồn chân lý. Bước (2) là tối ưu. Bước (3) là nơi người học thực sự
  đọc dữ liệu.
- Thứ tự (1) rồi (2) là bắt buộc theo SUB-004-FR-001. Thứ tự ngược lại sẽ tạo ra trạng thái mà hệ
  thống không giữ được khi khởi động lại.
- Nếu bước (2) thất bại, bước (1) vẫn giữ nguyên hiệu lực và bước (3) vẫn cho kết quả. Đây là hành
  vi bắt buộc, không phải một trường hợp ngoại lệ.
- Vì dữ liệu chỉ đi một chiều qua Redis, nếu người học đang kết nối với một instance Gateway khác
  với instance nhận được thông báo, người học sẽ không nhận được thông báo trong lần chạy đó. Việc
  này được chấp nhận trong phạm vi này và phải được nói rõ với người dùng.

### Nội dung kết quả

| Nhóm      | Trường                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------- |
| Định danh  | Định danh công khai của bản ghi                                                                    |
| Phân loại  | Loại bản ghi: nộp bài chính thức hay Run                                                             |
| Trạng thái | Trạng thái cuối cùng của bản ghi                                                                   |
| Tín hiệu   | Báo hiệu rằng chi tiết kết quả đã sẵn sàng để đọc                                                  |

- Thông báo phải đủ để giao diện cập nhật một dòng lịch sử, và không nhiều hơn thế. Mọi thứ khác
  được lấy qua chi tiết bản ghi.
- Thông báo phải phản ánh trạng thái đã lưu. Vì nó phát sau bước (1), người học nhận được thông
  báo rồi đọc chi tiết sẽ luôn thấy trạng thái đó.
- Điểm số có nằm trong thông báo hay không là Câu hỏi mở. Việc không đưa điểm vào thông báo là an
  toàn, vì nó giữ thông báo nhỏ và tránh rủi ro hiển thị sai.

### Vòng đời kênh

- Kênh chỉ tồn tại sau khi Gateway xác minh access token thành công. Một yêu cầu mở kênh không có
  token hợp lệ không được thiết lập kênh.
- Một kênh bị đóng vì hết hạn token phải được coi như kênh không hợp lệ. Client phải lấy token mới
  và mở lại.
- Khi Gateway khởi động lại hoặc kết nối bị gián đoạn, client phải mở lại kênh và đồng thời tiếp
  tục polling, vì các kết quả phát sinh trong lúc gián đoạn chỉ tới được bằng polling.
- Thời gian giữ một kênh mở chưa được chốt. Nếu không có giới hạn, một kênh có thể giữ tài nguyên
  vô hạn. Đây là Câu hỏi mở.

## Quy tắc phân quyền

- Mở kênh realtime là một thao tác được bảo vệ. Người gọi thiếu hoặc sai access token MUST bị từ
  chối.
- Mỗi kênh gắn với một danh tính đã xác thực. Danh tính đó lấy từ token đã xác minh, không từ tham
  số do client gửi trong yêu cầu mở kênh.
- Client MUST NOT chọn danh tính của người khác khi mở kênh. Một tham số chủ sở hữu trong yêu cầu
  mở kênh phải bị từ chối.
- Mọi vai trò đã xác thực MAY mở kênh realtime trong phiên bản này, vì kênh chỉ nhận kết quả của
  chính chủ sở hữu.
- Gateway thực hiện xác thực và kiểm tra ở mức thô. Submission MUST kiểm tra rằng chủ sở hữu kênh
  khớp với chủ sở hữu bản ghi trước khi phát, và Gateway MUST không chuyển tiếp một thông báo cho
  một kênh không thuộc sở hữu.
- Tài khoản bị khoá hoặc bị vô hiệu hoá MUST không còn nhận thông báo, theo hành vi đã Approved trong
  [ID-001](../../01-identity/authentication/spec.md).
- Không có quyền đọc kênh realtime của người khác. Xem
  [`specs/00-system/roles-permissions.md`](../../00-system/roles-permissions.md) để biết
  `STUDENT` là vai trò duy nhất được mô tả với nội dung học tập ở đây.

## Đầu vào

Các mục dưới đây là thao tác ở mức khái niệm, không phải thiết kế controller cuối cùng. Cách đặt
tên chính xác, loại kênh và hình dạng DTO thuộc về `plan.md`.

### Mở kênh

Yêu cầu mở kênh do Gateway phục vụ, cần access token hợp lệ. Nó MUST NOT nhận một tham số chủ
sở hữu, vai trò hay quyền từ client. Việc chọn WebSocket hay Server-Sent Events là Câu hỏi mở.

### Nội dung phát từ Submission

Một sự kiện kết quả nội bộ gồm định danh công khai của bản ghi, chủ sở hữu bản ghi, và trạng thái cuối
cùng. Đây là contract giao tiếp nội bộ, không phải đầu vào của người học.

## Đầu ra

- Một thông báo kết quả với các trường ở bảng nội dung kết quả.
- Một thông báo MUST NOT chứa Test Case, kết quả mong đợi, harness, `stdout` hoặc `stderr` từ Test
  Case ẩn, lệnh biên dịch, tham số sandbox, hay thông tin xác thực.
- Khi realtime không hoạt động, người học vẫn đọc được mọi kết quả qua cơ chế kéo của SUB-003. Việc
  mất thông báo không được tạo ra một hậu quả quan sát được khác.

## Tình huống lỗi

| Trường hợp                                                        | Hành vi quan sát được                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Thiếu hoặc sai access token khi mở kênh                            | Không thiết lập kênh; không nhận thông báo nào                              |
| Cố truyền chủ sở hữu hoặc vai trò khi mở kênh                     | Yêu cầu bị từ chối; danh tính lấy từ token đã xác minh                      |
| Token hết hạn hoặc bị thu hồi trong lúc kênh đang mở             | Kênh ngừng nhận thông báo; client phải lấy token mới và mở lại              |
| Tài khoản bị khoá trong lúc kênh đang mở                            | Kênh ngừng nhận thông báo, theo hành vi đã Approved trong ID-001            |
| Redis không sẵn sàng khi phát                                      | Bản ghi vẫn hoàn tất và được lưu; không có thông báo; polling vẫn cho kết quả |
| Phát realtime thất bại sau khi lưu thành công                      | Không có thông báo; kết quả vẫn đọc được qua cơ chế kéo; không lỗi cho người học |
| Người học đang kết nối với instance Gateway khác instance nhận thông báo | Không nhận được thông báo trong lần chạy đó; polling vẫn cho kết quả        |
| Gateway khởi động lại giữa chừng                                    | Client mở lại kênh và tiếp tục polling; các kết quả trong lúc gián đoạn vẫn đọc được |
| Kết nối bị gián đoạn rồi mở lại                                     | Không có kết quả nào bị mất; các kết quả phát sinh lúc gián đoạn tới bằng polling |
| Bản ghi hoàn tất trước khi người học mở trang                      | Không có thông báo nào được phát, nhưng người học vẫn thấy kết quả qua cơ chế kéo |
| Kết quả phán quyết được giao lại lặp                                 | Không có thông báo thứ hai cho cùng một bản ghi                              |
| Bản ghi không thuộc chủ sở hữu kênh nhận thông báo                   | Cấm; một kênh chỉ nhận kết quả của chủ sở hữu kênh                          |
| Cố dựng nhiều kênh không giới hạn                                    | Chính sách vòng đời kênh áp dụng; giới hạn cụ thể là Câu hỏi mở            |

SUB-004 không đưa ra cấu trúc lỗi mới. Tuần tự hoá ở tầng truyền tải tuân theo quy ước
Gateway/Submission/NestJS hiện có.

## Tình huống biên

- Nhiều người học nộp bài gần như đồng thời. Mỗi thông báo đi vào kênh của đúng chủ sở hữu, và
  một người học không nhận thông báo của người khác.
- Cùng một người học mở nhiều tab. Tất cả các tab đang kết nối đều có thể nhận thông báo cho chủ sở
  hữu đó. Điều này được chấp nhận, vì mọi kênh đều thuộc cùng một danh tính đã xác thực.
- Một người học nộp bài rồi ngay lập tức đóng trang. Kết quả vẫn được lưu và vẫn đọc được sau.
- Thông báo tới trễ hơn một phút, hoặc không tới. Vì polling là bảo đảm, trải nghiệm người học vẫn
  đúng; chỉ có độ trễ cảm nhận được là khác nhau.
- Người học giữ một kênh mở rất lâu mà không tạo bản ghi mới. Thời gian giữ kênh chưa được chốt, và
  việc một kênh mở lâu không được tạo ra tình huống có hậu quả khác với việc không có kênh.
- Người học đã đăng xuất ở một tab khác trong khi một kênh vẫn mở. Hành vi phụ thuộc vào việc token
  còn hợp lệ; việc thu hồi token chủ động là Câu hỏi mở.
- Redis phục hồi sau khi hỏng. Kết quả phát sinh trong lúc hỏng vẫn tới được người học bằng polling,
  và việc phục hồi không được tạo ra một loạt thông báo gộp cho các kết quả cũ.
- Một bản ghi `INTERNAL_ERROR`. Người học nhận được thông báo có trạng thái lỗi hệ thống, và đọc
  được chi tiết. Thông báo đó không phải là phán quyết về lời giải.
- Nhiều Submission instance phát cùng một bản ghi do giao lại trùng. Chỉ một thông báo được phát,
  nhờ việc áp dụng kết quả chống giao lại trùng của SUB-002.
- Redis có nhiều instance. Kết quả là không xác định instance nào nhận được thông báo. Đây là hành
  vi đã biết và được chấp nhận, không phải một lỗi cần phát hiện.

## Yêu cầu bảo mật

- **SUB-004-SR-001 — Xác thực khi mở kênh:** Gateway MUST xác minh access token trước khi thiết lập
  kênh, và danh tính của kênh MUST lấy từ token đã xác minh.
- **SUB-004-SR-002 — Chống chọn danh tính:** Tham số chủ sở hữu, vai trò hay quyền từ client MUST
  bị từ chối khi mở kênh, và MUST NOT ảnh hưởng tới kênh nào nhận thông báo.
- **SUB-004-SR-003 — Cô lập theo chủ sở hữu:** Một thông báo MUST chỉ được chuyển tới kênh có cùng
  chủ sở hữu với bản ghi. Cơ chế phát và Gateway MUST bảo đảm điều này ở phía server, không dựa vào
  logic phía client.
- **SUB-004-SR-004 — Nội dung tối thiểu:** Thông báo MUST chỉ mang những trường đã phê duyệt trong mục
  Nội dung kết quả. Mọi trường bổ sung phải được thêm vào danh sách cho phép một cách tường minh.
- **SUB-004-SR-005 — Không rò rỉ dữ liệu judge ẩn:** Test Case, kết quả mong đợi, harness, `stdout`
  hoặc `stderr` từ Test Case ẩn, lệnh biên dịch, tham số Docker và cấu hình sandbox MUST NOT xuất
  hiện trong thông báo, log, hay bất kỳ log kết nối nào.
- **SUB-004-SR-006 — Không dữ liệu xác thực trong thông báo:** Access token, header xác thực và bí
  mật của service MUST NOT xuất hiện trong thông báo.
- **SUB-004-SR-007 — Thất bại an toàn:** Khi Redis, Gateway hoặc kênh không sẵn sàng, thao tác phát
  MUST thất bại theo hướng đóng. Nó MUST NOT làm mất kết quả đã lưu, và MUST NOT tạo ra một phản
  hồi mang tính chấp nhận cho client.
- **SUB-004-SR-008 — Không tin cậy cơ chế phát cho tính đúng đắn:** Vì realtime là một chiều và
  best-effort, hệ thống MUST NOT dựa vào việc thông báo tới nơi để kết luận một kết quả đã hoàn
  tất. Kết luận đó chỉ được rút ra từ dữ liệu lưu trữ.
- **SUB-004-SR-009 — Ghi log an toàn:** Log kết nối MUST NOT ghi access token, và MUST ghi ở mức tối
  thiểu cần thiết cho vận hành. Mã nguồn và dữ liệu judge ẩn MUST NOT được ghi.
- **SUB-004-SR-010 — Chống lạm dụng kênh:** Số kênh đồng thời trên mỗi danh tính và thời gian giữ
  kênh phải có chính sách giới hạn đã phê duyệt. Giá trị cụ thể là Câu hỏi mở.
- **SUB-004-SR-011 — Không lộ nội dung không tin cậy:** Mọi trường trong thông báo phải là giá trị do
  hệ thống sinh ra, không phải nội dung do người học hay Judge cung cấp tự do.
- **SUB-004-SR-012 — Không tự leo thang phân quyền:** Việc phát realtime không cấp thêm khả năng
  đọc nào ngoài những gì chủ sở hữu đã có trong lịch sử. Một thông báo MUST NOT chứa nhiều thông
  tin hơn một lần đọc chi tiết mà chủ sở hữu được phép thực hiện.

## Tiêu chí nghiệm thu

- **SUB-004-AC-001:** Cho trước một bản ghi đã được lưu bền vững, khi thông báo realtime được kiểm
  tra, thì thông báo chỉ chứa định danh bản ghi, loại bản ghi, trạng thái và tín hiệu chi tiết đã sẵn
  sàng.
- **SUB-004-AC-002:** Cho trước một thông báo kết quả, khi nội dung được kiểm tra, thì nó không chứa
  Test Case, kết quả mong đợi, harness, `stdout` hoặc `stderr` từ Test Case ẩn, lệnh biên dịch, tham
  số sandbox, hay thông tin xác thực.
- **SUB-004-AC-003:** Cho trước hai người học khác nhau, khi một người nộp bài, thì kênh của người
  kia không nhận thông báo nào về bản ghi đó.
- **SUB-004-AC-004:** Cho trước một người học cố mở kênh với tham số chủ sở hữu của người khác, khi yêu
  cầu được kiểm tra, thì tham số bị từ chối và kênh chỉ nhận kết quả của chủ sở hữu token.
- **SUB-004-AC-005:** Cho trước một yêu cầu mở kênh thiếu hoặc có access token không hợp lệ, khi yêu
  cầu được kiểm tra, thì không có kênh nào được thiết lập.
- **SUB-004-AC-006:** Cho trước một bản ghi có kết quả, khi Redis được dừng, thì bản ghi vẫn hoàn tất
  và được lưu, và người học vẫn đọc được kết quả qua cơ chế kéo.
- **SUB-004-AC-007:** Cho trước một người học không bao giờ mở kênh realtime, khi họ theo dõi một
  bản ghi bằng cơ chế kéo, thì họ nhận được mọi kết quả, kể cả bản ghi hoàn tất trước khi họ mở trang.
- **SUB-004-AC-008:** Cho trước một kết nối bị gián đoạn trong khi bản ghi đang chờ kết quả, khi kết nối
  được mở lại và người học dùng cơ chế kéo, thì kết quả của bản ghi đó vẫn tới được và không có kết
  quả nào bị mất.
- **SUB-004-AC-009:** Cho trước cùng một kết quả phán quyết được giao lại lặp, khi nó được xử lý,
  thì không có thông báo thứ hai nào cho cùng một bản ghi.
- **SUB-004-AC-010:** Cho trước một bản ghi nộp bài chính thức và một bản ghi Run của cùng một người
  học, khi cả hai hoàn tất, thì mỗi bản ghi có đúng một thông báo và thông báo phân biệt được loại
  bản ghi.
- **SUB-004-AC-011:** Cho trước một kênh đang mở thuộc về một token hết hạn hoặc bị thu hồi, khi trạng
  thái token thay đổi, thì kênh ngừng nhận thông báo.
- **SUB-004-AC-012:** Cho trước một tài khoản bị khoá trong lúc kênh đang mở, khi trạng thái tài khoản
  thay đổi, thì kênh ngừng nhận thông báo, và việc đóng kênh không xoá kết quả đã lưu.
- **SUB-004-AC-013:** Cho trước một người học mở nhiều phiên cùng lúc, khi một bản ghi hoàn tất, thì
  mọi phiên đang kết nối của chủ sở hữu đó có thể nhận thông báo, và không có phiên nào nhận thông
  báo của người khác.
- **SUB-004-AC-014:** Cho trước hành vi realtime, khi Redis phục hồi sau khi hỏng, thì không có một
  loạt thông báo gộp cho các kết quả phát sinh trong lúc hỏng, và các kết quả đó vẫn đọc được bằng cơ
  chế kéo.
- **SUB-004-AC-015:** Cho trước một bản ghi `INTERNAL_ERROR`, khi thông báo được kiểm tra, thì người học
  thấy trạng thái lỗi hệ thống và đọc được chi tiết, và thông báo không được trình bày như một phán
  quyết về lời giải.
- **SUB-004-AC-016:** Cho trước một người học chưa từng nhận thông báo realtime nào, khi họ kiểm tra
  tiến độ, thì họ không suy luận rằng bản ghi chưa hoàn tất nếu thực tế nó đã hoàn tất.

## Ngoài phạm vi

- Mở rộng đường ống realtime từ một chiều thành hai chiều có bảo đảm giao kết quả, dùng hàng đợi
  bền vững thay cho pub/sub, hay dùng outbox và giao chính-xác-một-lần
- Realtime dùng để điều phối thay cho RabbitMQ, hoặc dùng RabbitMQ cho thông báo tới client
- Nội dung thông báo, việc dựng bảng xếp hạng, và thông báo mang tính xã hội
- Thông báo cho giảng viên, thông báo cho quản trị viên, và bất kỳ vai trò nào khác ngoài chủ sở
  hữu
- WebSocket hay Server-Sent Events ở mức công nghệ; SUB-004 chỉ ràng buộc hành vi
- Ứng dụng di động và giao diện cụ thể; SUB-004 chỉ ràng buộc hành vi phía server
- Trạng thái trung gian của quá trình chấm, ví dụ việc Judge đã bắt đầu chạy
- Hàng đợi ngắn hạn giữa Submission và Gateway, và cơ chế xác nhận đã nhận thông báo
- Chính sách dự phòng khi người học mất toàn bộ kết nối trong lúc chờ kết quả, ngoài yêu cầu bắt
  buộc phải có cơ chế kéo
- Sự kiện tiến độ `submission.accepted` và việc cập nhật tiến độ ở Learning; chúng thuộc
  [SUB-002](../submit-code/spec.md)
- Nội dung chi tiết của một bản ghi; nó thuộc [SUB-003](../submission-history/spec.md)
- Cơ chế lưu trữ kết quả; nó thuộc [SUB-002](../submit-code/spec.md)

## Phụ thuộc

- [Kiến trúc hệ thống BKPractice](../../../docs/architecture/system-architecture.md)
- [Kiến trúc Submission Service](../../../docs/architecture/submission-service.md)
- [Ma trận kiến trúc service](../../../docs/architecture/service-architectures.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002: Kiến trúc nội bộ riêng theo từng service](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Quy trình SDD](../../README.md)
- [Tham chiếu kiến trúc](../../00-system/architecture-reference.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược giao tiếp](../../00-system/communication.md) cho quyết định một chiều và tính
  best-effort của realtime.
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md) cho ranh giới Redis và PostgreSQL.
- [Bảo mật Judge](../../00-system/judge-security.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [ID-001 Authentication](../../01-identity/authentication/spec.md) cho xác thực khi mở kênh và hành
  vi theo trạng thái tài khoản.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) cho mặc-định-từ-chối và quy ước đặt tên quyền
  `resource:action`.
- [SUB-001 Run Code](../run-code/spec.md) cho bản ghi Run mà realtime cũng phải thông báo.
- [SUB-002 Submit Code](../submit-code/spec.md) cho vòng đời, trạng thái, tín hiệu đã lưu và điều kiện
  phát sau khi lưu.
- [SUB-003 Submission History](../submission-history/spec.md) cho cơ chế kéo và nội dung chi tiết
  mà thông báo chỉ dẫn tới.

## Câu hỏi mở

Các quyết định sản phẩm sau chưa được giải quyết bởi Kiến trúc, SDD hệ thống, các đặc tả Identity
đã Approved, hay nền tảng hiện tại. Chúng chặn việc phê duyệt ở những chỗ chúng ảnh hưởng tới hành
vi được yêu cầu:

1. **Công nghệ kênh:** Dùng WebSocket hay Server-Sent Events cho phía client? Kiến trúc chỉ quy
   định Redis pub/sub nội bộ và Gateway phục vụ phía client, chưa chốt công nghệ phía client. Lựa
   chọn này ảnh hưởng tới việc Gateway triển khai thế nào.
2. **Thứ tự phát khi có nhiều Submission instance:** Nếu một bản ghi kết thúc ở một instance, có cần
   bảo đảm mọi instance đều phát không, hay chỉ cần phục vụ tốt nhất có thể? Quyết định này ảnh hưởng
   tới việc có cần một cơ chế phát bổ sung hay không.
3. **Điểm số trong thông báo:** Thông báo có nên mang điểm số để giao diện cập nhật một dòng đầy
   đủ, hay giữ thông báo tối giản và luôn kéo chi tiết? SUB-004 hiện chọn tối giản.
4. **Chu kỳ polling và ngưỡng chuyển sang realtime:** Client nên polling với chu kỳ bao nhiêu, và có
   nên bắt đầu polling đồng thời với kênh realtime, hay chỉ polling khi realtime hỏng? Chính sách
   này ảnh hưởng trực tiếp tới tải hệ thống.
5. **Vòng đời kênh:** Thời gian tối đa một kênh được giữ mở, số kênh đồng thời tối đa trên một danh
   tính, và hành vi khi vượt giới hạn chưa được chốt.
6. **Trạng thái trung gian:** Nếu SUB-002 chốt một trạng thái như `RUNNING`, có phát trạng thái đó
   qua realtime không? Và khi phát, người học có thấy một báo hiệu tiến độ không?
7. **Thu hồi token đang dùng:** Khi một token bị thu hồi, có cần chấm dứt ngay các kênh đang mở
   bằng token đó không? ID-001 đã phê duyệt hành vi cho request, nhưng chưa chốt hành vi cho một
   kênh đã thiết lập.
8. **Bảo mật output trong thông báo:** SUB-004 loại bỏ toàn bộ output khỏi thông báo. Nếu sau này
   cho phép hiển thị một dạng output đã lọc theo Câu hỏi mở 1 của SUB-003, thông báo có được mang
   theo hay vẫn phải kéo từ chi tiết?

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review | Tóm tắt                                             |
| ---------- | --------- | -------------------- | --------------------------------------------------- |
| 2026-09-29 | 0.1       | Codex / TBD          | Đặc tả Kết quả realtime ban đầu ở trạng thái Proposed |

> `spec.md` mô tả CÁI GÌ. Controller, DTO, entity, aggregate, repository, migration, hình dạng
> lưu trữ, hợp đồng message và thứ tự thực thi thuộc về một `plan.md` sau này, sau khi có phê duyệt
> của con người.
