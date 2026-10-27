# SUB-001 Chạy thử mã (Run Code)

## Trạng thái

Approved

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép một người học đã xác thực biên dịch và chạy mã của chính họ với dữ liệu đầu vào do họ
tự cung cấp, để kiểm tra mã trước khi nộp bài chính thức, mà không biến lần chạy đó thành một lần
nộp bài, không làm thay đổi tiến độ học tập, và không làm lộ dữ liệu judge ẩn.

## Tác nhân

- **STUDENT (người học):** Người học đã xác thực, chạy mã của chính mình bằng dữ liệu đầu vào do họ
  tự soạn, để tự kiểm tra trước khi nộp.
- **LECTURER:** Người dùng giảng dạy đã xác thực. SUB-001 không phân biệt người học với người giảng
  dạy ở cấp kỹ thuật; mọi vai trò đã xác thực đều được Run.
- **Khách chưa xác thực:** Người gọi không có ngữ cảnh định danh tin cậy. Tác nhân này MUST NOT chạy
  được mã.
- **API Gateway:** Cổng vào công khai, xác minh access token BKPractice, loại bỏ các header định
  danh tin cậy do client gửi, và chuyển tiếp ngữ cảnh định danh đã được xác minh.
- **Submission Service:** Chủ sở hữu vòng đời Run, lưu trữ bản ghi Run và phát kết quả.
- **Judge Service:** Worker tính toán tin cậy, thực thi mã trong sandbox. Nó không sở hữu lịch sử
  Run.
- **Learning Service:** **Không phải tác nhân của SUB-001.** Xem Mục tiêu và SUB-001-FR-004.

## Bối cảnh

BKPractice tách hai thao tác mà người học hay nhầm là một:

- **Run** là thử nghiệm, dùng dữ liệu do người học tự nhập, để kiểm tra mã có chạy và in ra đúng
  không.
- **Submit** là nộp bài chính thức, được chấm trên Test Case của Problem, và có thể làm thay đổi
  tiến độ học tập.

SUB-001 chỉ bao phủ Run. Vòng đời nộp bài chính thức, ý nghĩa của việc chấm điểm và điều kiện
tiến độ thuộc [SUB-002](../submit-code/spec.md); cách người học xem lại các lần chạy và lần nộp
thuộc [SUB-003](../submission-history/spec.md); việc đẩy kết quả về client theo thời gian thực
thuộc [SUB-004](../realtime-result/spec.md).

Quyết định sản phẩm đã chốt cho phiên bản này và ràng buộc SUB-001:

- **Run không tính.** Một lần Run MUST NOT phát `submission.accepted`, MUST NOT làm thay đổi
  `Progress` của Learning, và MUST NOT xuất hiện trong lịch sử nộp bài chính thức.
- **Run chỉ dùng stdin do người học gửi.** SUB-001 MUST NOT yêu cầu ví dụ hiển thị, Test Case, hay
  bất kỳ dữ liệu judge nào của Learning. Vì vậy SUB-001 không có phụ thuộc service-to-service nào.
- **Không giới hạn tần suất ở phiên bản này.** SUB-001 MUST NOT tự áp đặt hạn mức chạy theo người
  dùng. Rủi ro do việc này được ghi nhận tường minh.

Mã nguồn hiện tại của Submission đã có một hành vi Run cơ bản: lưu một bản ghi với `kind` là
`RUN`, tạo một Test Case duy nhất từ stdin của người học, và dùng giới hạn thời gian và bộ nhớ cố
định. Đó là nền tảng hành vi, không phải một đặc tả `SUB-001` đã Approved. SUB-001 giữ những phần
đó và định nghĩa rõ các hành vi còn bỏ ngỏ.

## Yêu cầu chức năng

- **SUB-001-FR-001 — Run không phải nộp bài:** Một lần Run MUST được ghi nhận với ý nghĩa thử
  nghiệm. Nó MUST NOT tạo ra một bản ghi nộp bài chính thức, MUST NOT được tính vào bất kỳ tổng
  hợp, thống kê hay thứ hạng nào, và MUST NOT khởi tạo hay cập nhật `Progress`.
- **SUB-001-FR-002 — Không phát sự kiện tiến độ:** Run MUST NOT phát `submission.accepted` và
  MUST NOT phát bất kỳ domain event nào mà Learning dùng để cập nhật tiến độ học tập. Chỉ
  [SUB-002](../submit-code/spec.md) được phát `submission.accepted`.
- **SUB-001-FR-003 — Ngôn ngữ phải thuộc danh mục dùng chung:** Run MUST chỉ chấp nhận một ngôn
  ngữ từ danh mục ngôn ngữ đã phê duyệt dùng chung mà Judge hỗ trợ. Ngôn ngữ không xác định MUST
  bị từ chối và MUST NOT tạo bản ghi.
- **SUB-001-FR-004 — Không phụ thuộc Learning:** Run MUST chỉ dùng dữ liệu do người học gửi cùng
  mã nguồn. Run MUST NOT gọi một luồng nội bộ của Learning, MUST NOT nhận Test Case, kết quả mong
  đợi, harness, giới hạn của Problem, hay tập ngôn ngữ đang bật của một Problem. Vì vậy Run có
  thể thực hiện khi Learning không sẵn sàng.
- **SUB-001-FR-005 — `problemId` là nhãn của người học:** Run MAY chấp nhận một `problemId` UUID hợp lệ nhưng tuỳ
  chọn để người học tự ghi nhận Problem đang làm. `problemId` đó là dữ liệu do client cung cấp,
  MUST NOT được Submission phân giải, xác thực hay tra cứu với Learning, MUST NOT ảnh hưởng tới
  phán quyết, điểm số hay trạng thái của bản ghi, và MUST NOT được dùng để quyết định tính hợp
  lệ của Problem.
- **SUB-001-FR-006 — Đối chiếu là tùy chọn:** Vì Run không có dữ liệu mong đợi, Run MUST NOT sinh ra
  phán quyết `WRONG_ANSWER`. Một lần chạy chỉ có thể kết thúc ở một phán quyết phản ánh việc biên
  dịch và thực thi thất bại, hoặc ở `EXECUTED` cho biết nó đã chạy xong.
- **SUB-001-FR-007 — Truyền mã nguồn như dữ liệu:** Mã nguồn và stdin của người học MUST được
  truyền tới Judge như dữ liệu. Chúng MUST NOT trở thành tên file, lệnh biên dịch, lệnh shell,
  tham số Docker hay bất kỳ mảnh lệnh nào do người học kiểm soát.
- **SUB-001-FR-008 — Ràng buộc đầu vào:** Mã nguồn MUST là chuỗi không rỗng và không vượt quá giới
  hạn độ dài đã phê duyệt của nền tảng. `stdin` MUST là chuỗi, có thể rỗng, và không vượt quá giới
  hạn độ dài đã phê duyệt. Giá trị vượt giới hạn MUST bị từ chối trước khi tạo bản ghi.
- **SUB-001-FR-009 — Người học suy ra từ ngữ cảnh tin cậy:** Bản ghi Run MUST lấy chủ sở hữu từ ngữ
  cảnh Gateway đã xác minh. Run MUST NOT chấp nhận một định danh người dùng có thẩm quyền từ
  body, query hay route.
- **SUB-001-FR-010 — Run bất đồng bộ:** Run MUST được chấp nhận và xử lý bất đồng bộ. Yêu cầu Run
  trả về một định danh thực thi và trạng thái đã được nhận vào hàng đợi, chứ không chờ kết quả
  phán quyết.
- **SUB-001-FR-011 — Lưu trữ bản ghi Run:** Submission MUST lưu bản ghi Run bằng PostgreSQL như là
  nguồn chân lý, gồm mã nguồn, stdin, ngôn ngữ, thời điểm tạo và trạng thái cuối cùng. Redis và
  RabbitMQ không thay thế lưu trữ này.
- **SUB-001-FR-012 — Phát kết quả Run:** Khi Run kết thúc ở một phán quyết, Submission MUST phát
  kết quả theo luồng realtime đã phê duyệt cho đúng chủ sở hữu của bản ghi. Việc phát là
  best-effort; xem [SUB-004](../realtime-result/spec.md).
- **SUB-001-FR-013 — Run không sinh kết quả chính thức:** Điểm số, số Test Case đạt, tổng số Test
  Case và thời gian chạy của một lần Run MUST NOT được tính vào điểm chính thức, MUST NOT được tổng
  hợp thành điểm của Problem, và MUST NOT trở thành tiêu chí để đánh dấu Problem là đã giải.
- **SUB-001-FR-014 — Thất bại không để lại dở dang:** Một Run thất bại trong quá trình chuẩn bị, ví
  dụ không phát được việc cho Judge, MUST được ghi nhận ở một trạng thái lỗi xác định thay vì bị
  bỏ treo ở trạng thái đã nhận vào hàng đợi.
- **SUB-001-FR-015 — Xử lý kết quả trùng lặp:** Nếu một kết quả phán quyết cho bản ghi Run được xử
  lý lại do giao hàng lặp, Submission MUST giữ nguyên trạng thái cuối đã ghi nhận và MUST NOT
  tạo bản ghi kết quả trùng.

## Quy tắc nghiệp vụ

### Vòng đời Run

```text
PENDING -> QUEUED -> (kết quả phán quyết cuối cùng)
                    -> INTERNAL_ERROR khi không thể phát việc cho Judge
```

- Run và nộp bài chính thức dùng chung một khái niệm trạng thái vòng đời nhưng là hai thao tác tách
  biệt, theo [`docs/architecture/submission-service.md`](../../../architecture/submission-service.md).
- Run không có trạng thái trung gian báo rằng Judge đã bắt đầu. Một Run đang chờ kết quả vẫn ở
  `QUEUED`.
- Judge báo chạy thành công theo contract hiện có; Submission ánh xạ kết quả thành `EXECUTED` cho
  Run, không dùng `ACCEPTED` của Submit.
- Bản ghi `PENDING` hoặc `QUEUED` quá 10 phút kể từ khi tạo được watchdog của Submission chuyển
  nguyên tử sang `INTERNAL_ERROR`. Kết quả Judge đến sau không ghi đè trạng thái cuối.
- Một Run kết thúc ở trạng thái lỗi vẫn là một Run đã hoàn tất về mặt vòng đời; nó không được thử
  lại tự động bởi Submission.
- Submission không tự tính lại phán quyết. Việc phân loại `TIME_LIMIT_EXCEEDED`,
  `MEMORY_LIMIT_EXCEEDED`, `COMPILE_ERROR`, `RUNTIME_ERROR` và `INTERNAL_ERROR` là quyết định của
  Judge theo [`specs/00-system/judge-security.md`](../../00-system/judge-security.md).

### Giới hạn thực thi của Run

- Run không lấy giới hạn thời gian và bộ nhớ từ Problem, vì SUB-001 không gọi Learning. Run dùng
  giới hạn cố định 3000 ms và 256 MB; người học không được ghi đè.
- Giới hạn mặc định của Run không bao giờ được nới lỏng để vượt trần an toàn mà Judge áp dụng.
  Submission có thể áp một trần chặt hơn, không bao giờ áp trần lỏng hơn.

### Phân biệt Run và Submit

| Điểm                       | Run (SUB-001)          | Submit (SUB-002)                  |
| -------------------------- | ---------------------- | --------------------------------- |
| Nguồn dữ liệu đầu vào      | stdin do người học gửi | Test Case ẩn do Learning cung cấp |
| Cần gọi Learning           | Không                  | Có                                |
| Phát `submission.accepted` | Không bao giờ          | Có, khi được chấp nhập chính thức |
| Cập nhật `Progress`        | Không bao giờ          | Có                                |
| Vào lịch sử nộp bài        | Không                  | Có                                |
| Ghi nhận được phân biệt    | Có                     | Có                                |
| Có thể bị giới hạn hạn mức | Không ở phiên bản này  | Không ở phiên bản này             |

## Quy tắc phân quyền

- Run là một thao tác được bảo vệ. Người gọi thiếu hoặc sai access token MUST bị từ chối với `401`.
- Mọi vai trò đã xác thực MAY được chạy Run trong phiên bản này; không cần quyền riêng
  `submission:run`.
- Một người học MUST NOT đọc, sửa hay xoá một bản ghi Run không thuộc sở hữu của họ.
- `STUDENT` MUST NOT dùng Run để suy ra Test Case ẩn, kết quả mong đợi hay harness. Run không
  cung cấp các dữ liệu đó.
- Gateway thực hiện xác thực và kiểm tra route ở mức thô. Submission MUST thực thi kiểm tra ngữ
  cảnh tin cậy tại một ranh giới backend tin cậy.
- Submission MUST suy ra danh tính người gọi từ ngữ cảnh Gateway/service đã được xác minh. Body,
  query, route hay header do client gửi MUST NOT thiết lập chủ sở hữu bản ghi, vai trò hay quyền.
- Một lần Run không cấp bất kỳ quyền nào lên Problem, Assignment hay tiến độ học tập. Nó là tác
  nhân thụ thụ của luồng judge, không phải một service tin cậy của Learning.

## Đầu vào

Các route dưới đây là thao tác ở mức khái niệm, không phải thiết kế controller cuối cùng. Cách đặt
tên chính xác và hình dạng DTO thuộc về `plan.md`.

### Chạy thử mã

Yêu cầu ngữ cảnh người gọi đã xác thực và tin cậy, và chấp nhận:

- một ngôn ngữ từ danh mục đã phê duyệt dùng chung;
- mã nguồn không rỗng, không vượt quá giới hạn đã phê duyệt; và
- `stdin` do người học soạn, có thể rỗng, không vượt quá giới hạn đã phê duyệt.

Nó MAY chấp nhận một `problemId` tuỳ chọn theo SUB-001-FR-005.

Nó MUST NOT chấp nhận `stdin` lấy từ ví dụ hiển thị của Problem, bất kỳ `expectedOutput` nào, bất
kỳ `testCases` nào, `hiddenHarness`, `timeLimitMs`, `memoryLimitMb`, tên file, lệnh biên dịch, lệnh
Docker, chủ sở hữu bản ghi, vai trò hay quyền.

## Đầu ra

- Chạy thử mã trả về định danh bản ghi Run, loại là thử nghiệm, trạng thái đã được nhận vào hàng
  đợi, ngôn ngữ, thời điểm tạo và các mốc thời gian cơ bản. Nó MUST NOT trả về phán quyết trong
  cùng một phản hồi.
- Khi Run kết thúc, trạng thái, thời gian chạy, bộ nhớ dùng và thông tin chẩn đoán của lần chạy
  được ghi nhận trong lịch sử theo [SUB-003](../submission-history/spec.md).
- Kết quả Run được phát cho đúng chủ sở hữu qua luồng realtime theo
  [SUB-004](../realtime-result/spec.md). Việc phát là best-effort và không phải kênh bảo đảm.
- Kết quả Run MUST NOT xuất hiện trong tập lịch sử nộp bài chính thức và MUST NOT sinh ra bất kỳ
  thay đổi nào ở Learning.
- SUB-001 không phát ra domain event bắt buộc nào cho các bên tiêu thụ khác.

## Tình huống lỗi

| Trường hợp                                                                             | Hành vi quan sát được                                                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Thiếu hoặc sai access token khi chạy thử                                               | `401`; không tạo bản ghi Run                                                               |
| Ngôn ngữ không thuộc danh mục đã phê duyệt                                             | Lỗi kiểm tra dữ liệu; không tạo bản ghi, không gọi Judge                                   |
| Mã nguồn rỗng hoặc vượt giới hạn độ dài                                                | Lỗi kiểm tra dữ liệu; không tạo bản ghi, không gọi Judge                                   |
| `stdin` không phải chuỗi hoặc vượt giới hạn độ dài                                     | Lỗi kiểm tra dữ liệu; không tạo bản ghi, không gọi Judge                                   |
| Trường không xác định trong body                                                       | Trường bị từ chối bởi kiểm tra danh sách cho phép; không tạo bản ghi                       |
| Cố cung cấp `expectedOutput`, `testCases`, `hiddenHarness`, giới hạn hoặc lệnh runtime | Trường bị từ chối; Run không nhận dữ liệu judge và không suy ra được Test Case ẩn          |
| Không phát được việc cho Judge                                                         | Bản ghi Run ở trạng thái lỗi xác định; yêu cầu báo lỗi; không bỏ treo ở hàng đợi           |
| Judge không trả kết quả trong 10 phút                                                  | Watchdog chuyển bản ghi còn chờ sang `INTERNAL_ERROR`; kết quả muộn không ghi đè           |
| Judge trả về kết quả không hợp lệ về mặt hình thức                                     | Bản ghi Run giữ trạng thái trước đó; Submission ghi nhận lỗi nội bộ                        |
| Kết quả phán quyết được giao lại lần hai                                               | Trạng thái cuối giữ nguyên; không tạo bản ghi kết quả trùng                                |
| `problemId` không tồn tại hoặc thuộc Problem khác                                      | Bản ghi Run vẫn được tạo; `problemId` được lưu nguyên văn là nhãn, không ảnh hưởng kết quả |
| Cố đọc hoặc sửa một bản ghi Run của người khác                                         | Bị từ chối; không lộ sự tồn tại của bản ghi                                                |
| Redis hoặc luồng realtime không sẵn sàng                                               | Bản ghi Run vẫn hoàn tất và vẫn đọc được trong lịch sử; chỉ thiếu thông báo realtime       |
| Lỗi lưu trữ hoặc lỗi phụ thuộc ngoài dự kiến                                           | Quy ước lỗi chuẩn hoá hiện có, không kèm nội dung ẩn hay chi tiết xuyên service            |

SUB-001 không đưa ra cấu trúc lỗi mới. Tuần tự hoá ở tầng truyền tải tuân theo quy ước
Gateway/Submission/NestJS hiện có.

## Tình huống biên

- Nhiều Run gần như đồng thời của cùng một người học được chấp nhận đồng thời. Ở phiên bản này
  không có hạn mức, nên mức đồng thời chỉ bị giới hạn bởi hàng đợi Judge và hạn mức tần suất ở
  Gateway.
- `stdin` rỗng là hợp lệ và được truyền tới Judge như một đầu vào rỗng.
- Một Run với mã nguồn biên dịch được nhưng chạy vượt thời gian kết thúc ở
  `TIME_LIMIT_EXCEEDED`, không phải `WRONG_ANSWER`, vì Run không có dữ liệu mong đợi.
- Một Run kết thúc ở `INTERNAL_ERROR` vẫn là dữ liệu hợp lệ và vẫn nằm trong lịch sử; nó không bị
  xoá để làm sạch.
- Cùng một mã nguồn chạy nhiều lần tạo nhiều bản ghi Run độc lập. Run không có khái niệm cập
  nhật, sửa hay xoá bản ghi.
- Run tiếp tục hoạt động khi Learning không sẵn sàng, vì Run không gọi Learning.
- Bản ghi Run vẫn được lưu khi người học đã đăng xuất; vòng đời tài khoản ảnh hưởng tới quyền truy
  cập lịch sử chứ không xoá dữ liệu.
- Một kết quả phán quyết đến muộn sau khi người học đã xoá hoặc ẩn bản ghi tương ứng MUST NOT khôi
  phục bản ghi đó.
- `problemId` vắng mặt hoặc là UUID của Problem chưa xuất bản đều không làm Run thất bại;
  `problemId` có mặt nhưng sai định dạng UUID bị từ chối trước khi tạo bản ghi.

## Yêu cầu bảo mật

- **SUB-001-SR-001 — Phân quyền phía server:** Submission MUST thực thi kiểm tra ngữ cảnh tin cậy và
  quyền Run tại một ranh giới backend tin cậy; giao diện frontend không phải là biện pháp kiểm soát
  bảo mật.
- **SUB-001-SR-002 — Ngữ cảnh tác nhân tin cậy:** Chủ sở hữu bản ghi Run MUST chỉ đến từ ngữ cảnh
  Gateway/service đã được xác minh. Định danh, vai trò, quyền hay header nội bộ tin cậy do client
  gửi MUST NOT ảnh hưởng tới bất kỳ quyết định nào.
- **SUB-001-SR-003 — Mã nguồn là dữ liệu, không phải lệnh:** Mã nguồn và stdin của người học MUST
  được coi là dữ liệu không tin cậy và MUST NOT trở thành tên file, lệnh biên dịch, lệnh shell,
  tham số Docker, mạng hay cấu hình sandbox.
- **SUB-001-SR-004 — Run không được phủ nhận dữ liệu judge ẩn:** Run MUST NOT nhận, yêu cầu hay
  trả về Test Case ẩn, kết quả mong đợi, harness hay lời giải nội bộ. `problemId` do người học gửi
  MUST NOT dùng để vượt qua ranh giới này.
- **SUB-001-SR-005 — Không thực thi tại Submission:** Submission MUST NOT biên dịch hay thực thi mã
  của người học. Mọi thực thi diễn ra ở Judge theo các ràng buộc sandbox bắt buộc.
- **SUB-001-SR-006 — Không rò rỉ trong log và lỗi:** Header xác thực, toàn bộ mã nguồn và stdin của
  người học, cùng thông tin chẩn đoán nội bộ của sandbox MUST NOT được ghi vào log hoặc trả về trong
  lỗi ở mức lộ dữ liệu ẩn.
- **SUB-001-SR-007 — Cách ly service và cơ sở dữ liệu:** Submission MUST NOT truy vấn cơ sở dữ liệu
  của Learning, Identity hay Judge, và MUST NOT tạo khoá ngoại xuyên service. Run MUST NOT tạo
  quan hệ lưu trữ với Problem của Learning.
- **SUB-001-SR-008 — Thất bại an toàn:** Ngữ cảnh bị thiếu, sai định dạng hoặc không xác định MUST
  bị từ chối và MUST không để lại một bản ghi Run ở trạng thái dở dang.
- **SUB-001-SR-009 — Bỏ qua khi hạn mức vắng mặt:** Vì không có hạn mức ở phiên bản này, Submission
  MUST NOT suy ra hay áp một hạn mức ngầm. Nếu Gateway từ chối do throttle, Run không được tạo.

## Tiêu chí nghiệm thu

- **SUB-001-AC-001:** Cho trước một người học đã xác thực, khi họ gửi một Run hợp lệ với ngôn ngữ
  thuộc danh mục, mã nguồn không rỗng và `stdin` tuỳ ý, thì một bản ghi Run được tạo ở trạng thái đã
  nhận vào hàng đợi với chủ sở hữu lấy từ ngữ cảnh tin cậy, và phản hồi không chứa phán quyết.
- **SUB-001-AC-002:** Cho trước một người học đã xác thực, khi Run của họ kết thúc ở một phán quyết,
  thì trạng thái, thời gian chạy, bộ nhớ và thông tin chẩn đoán được ghi nhận và kết quả được phát
  cho chính họ qua luồng realtime.
- **SUB-001-AC-003:** Cho trước một Run đã hoàn tất, khi kiểm tra, thì không có
  `submission.accepted` nào được phát cho nó và Learning không ghi nhận bất kỳ thay đổi tiến độ nào.
- **SUB-001-AC-004:** Cho trước một Run đã hoàn tất, khi người học xem lịch sử nộp bài chính thức,
  thì bản ghi đó không xuất hiện trong tập nộp bài chính thức.
- **SUB-001-AC-005:** Cho trước một yêu cầu Run không có hoặc có access token không hợp lệ, khi yêu
  cầu được kiểm tra, thì nó nhận `401` và không có bản ghi Run nào được tạo.
- **SUB-001-AC-006:** Cho trước một ngôn ngữ nằm ngoài danh mục đã phê duyệt dùng chung, khi thử
  chạy, thì việc kiểm tra dữ liệu từ chối nó và không có việc nào được gửi tới Judge.
- **SUB-001-AC-007:** Cho trước một mã nguồn rỗng hoặc vượt giới hạn độ dài, khi kiểm tra dữ liệu
  chạy, thì yêu cầu bị từ chối và không có bản ghi Run nào được tạo.
- **SUB-001-AC-008:** Cho trước một yêu cầu Run chứa `expectedOutput`, `testCases`,
  `hiddenHarness`, `timeLimitMs`, `memoryLimitMb`, tên file hay lệnh runtime, khi kiểm tra dữ liệu
  chạy, thì các trường đó không thể ảnh hưởng tới hành vi Run và không bị coi là dữ liệu judge.
- **SUB-001-AC-009:** Cho trước một Run với `problemId` không tồn tại hoặc thuộc Problem chưa xuất
  bản, khi Run được xử lý, thì nó vẫn hoàn tất bình thường, `problemId` được giữ nguyên văn và
  Submission không thực hiện tra cứu nào với Learning.
- **SUB-001-AC-010:** Cho trước một Run mà việc phát cho Judge thất bại, khi lỗi được xử lý, thì bản
  ghi Run kết thúc ở trạng thái lỗi xác định thay vì bị bỏ treo ở trạng thái đã nhận vào hàng đợi.
- **SUB-001-AC-011:** Cho trước cùng một kết quả phán quyết được giao hai lần do giao hàng lặp, khi
  nó được xử lý lần hai, thì trạng thái cuối không đổi và không có bản ghi kết quả trùng.
- **SUB-001-AC-012:** Cho trước một Run đã hoàn tất trong khi luồng realtime không sẵn sàng, khi kết
  quả được xử lý, thì bản ghi vẫn hoàn tất và vẫn đọc được qua lịch sử.
- **SUB-001-AC-013:** Cho trước một Run kết thúc mà không lỗi thực thi, khi phán quyết được ghi nhận,
  thì nó không phải `WRONG_ANSWER`, vì Run không có dữ liệu mong đợi để đối chiếu.
- **SUB-001-AC-014:** Cho trước hành vi Run, khi quyền sở hữu service được kiểm tra, thì Submission
  không thực thi mã, không gọi Learning, và không có quan hệ lưu trữ nào với Problem được tạo ra.
- **SUB-001-AC-015:** Cho trước một Run hoàn tất, khi kiểm tra điểm số của người học trên Problem đó,
  thì điểm và trạng thái giải của Learning không thay đổi.
- **SUB-001-AC-016:** Cho trước một yêu cầu Run có trường chủ sở hữu, vai trò hoặc quyền, khi việc
  kiểm tra dữ liệu chạy, thì các trường đó không thể thay đổi chủ sở hữu bản ghi hay quyền thực
  thi.

## Ngoài phạm vi

- Nộp bài chính thức, chấm trên Test Case của Problem, ý nghĩa của việc chấm điểm và phát
  `submission.accepted`; chúng thuộc [SUB-002](../submit-code/spec.md)
- Lịch sử nộp bài, phân trang lịch sử và biểu diễn chi tiết kết quả; chúng thuộc
  [SUB-003](../submission-history/spec.md)
- Hợp đồng realtime, cơ chế phát tới Gateway và hành vi khi tin realtime bị mất; chúng thuộc
  [SUB-004](../realtime-result/spec.md)
- Việc biên dịch, thực thi, sinh harness, so sánh và phân loại kết quả của Judge
- Chạy trên ví dụ hiển thị, Test Case công khai, hay bất kỳ dữ liệu Test Case nào của Problem
- Hạn mức tần suất, giới hạn số việc chờ theo người dùng, và trả `429` tại Submission
- Lưu nháp mã nguồn, tự động lưu, và đồng bộ mã giữa các thiết bị
- So sánh kết quả với một lần nộp bài trước đó
- Tiến độ học tập, điểm Problem, thống kê cá nhân và xếp hạng
- Hạn chót Assignment, điểm Assignment và quyết định có được chấp nộp bài hay không; chúng thuộc
  đặc tả Assignment của Learning trong tương lai
- Bất kỳ microservice Run riêng nào; Run thuộc Submission
- Kiểm tra ngôn ngữ đang bật theo Problem; đó là trách nhiệm của SUB-002 vì Run không gọi Learning

## Phụ thuộc

- [Kiến trúc hệ thống BKPractice](../../../architecture/system-architecture.md)
- [Kiến trúc Submission Service](../../../architecture/submission-service.md)
- [Ma trận kiến trúc service](../../../architecture/service-architectures.md)
- [Quy tắc phụ thuộc](../../../architecture/dependency-rules.md)
- [ADR 0002: Kiến trúc nội bộ riêng theo từng service](../../../adr/0002-revised-service-internal-architectures.md)
- [Quy trình SDD](../../README.md)
- [Tham chiếu kiến trúc](../../00-system/architecture-reference.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Chiến lược giao tiếp](../../00-system/communication.md)
- [Bảo mật Judge](../../00-system/judge-security.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [ID-001 Authentication](../../01-identity/authentication/spec.md) cho định danh đã xác thực, ngữ
  cảnh Gateway tin cậy và hành vi theo trạng thái tài khoản.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) cho mặc-định-từ-chối, quy ước đặt tên quyền
  `resource:action` và ngữ nghĩa vai trò.
- [SUB-002 Submit Code](../submit-code/spec.md) cho vòng đời nộp bài chính thức, ý nghĩa chấm điểm
  và `submission.accepted`.
- [SUB-003 Submission History](../submission-history/spec.md) cho biểu diễn bản ghi và phân trang.
- [SUB-004 Realtime Result](../realtime-result/spec.md) cho hợp đồng phát kết quả.
- Đặc tả Judge tương lai (`JDG-*`), cho phân loại phán quyết, các trần sandbox và giới hạn thực
  thi.
- Đặc tả Assignment trong tương lai của Learning, cho hạn chót và điểm chấm.

## Quyết định đã phê duyệt

Run thành công dùng `EXECUTED`; giới hạn cố định 3000 ms/256 MB; mọi người dùng đã xác thực được
Run. Watchdog chuyển bản ghi còn chờ sau 10 phút sang `INTERNAL_ERROR`. Không hạn mức, không
khóa chống trùng: mỗi lần gửi tạo một bản ghi. `problemId` là UUID tùy chọn và không được tra cứu
ở Learning.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review        | Tóm tắt                                          |
| ---------- | --------- | --------------------------- | ------------------------------------------------ |
| 2026-09-29 | 0.1       | Codex / TBD                 | Đặc tả Chạy thử mã ban đầu ở trạng thái Proposed |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm / Codex | Phê duyệt hành vi Run và giải quyết câu hỏi mở   |

> `spec.md` mô tả CÁI GÌ. Controller, DTO, entity, repository, migration, hình dạng lưu trữ,
> chiến lược hàng đợi và thứ tự thực thi thuộc về `plan.md`.
