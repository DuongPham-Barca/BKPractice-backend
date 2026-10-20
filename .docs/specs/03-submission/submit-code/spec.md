# SUB-002 Nộp bài chính thức (Submit Code)

## Trạng thái

Approved

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép một người học đã xác thực nộp một lời giải cho một Problem đã xuất bản, để hệ thống chấm
lời giải đó trên Test Case ẩn do Learning sở hữu, lưu lại kết quả bền vững, và phát ra một sự kiện
tiến độ không bị mất khi lời giải được chấp nhận chính thức.

## Tác nhân

- **STUDENT (người học):** Người học đã xác thực nộp lời giải của chính mình cho một Problem, và
  quan sát được kết quả chấm của lời giải đó.
- **Khách chưa xác thực:** Người gọi không có ngữ cảnh định danh tin cậy. Tác nhân này MUST NOT nộp
  được bài và MUST NOT thấy Test Case ẩn.
- **API Gateway:** Cổng vào công khai, xác minh access token, loại bỏ header định danh tin cậy do
  client gửi, và chuyển tiếp ngữ cảnh định danh đã xác minh.
- **Submission Service:** Chủ sở hữu vòng đời nộp bài chính thức, quyết định ý nghĩa chấm điểm, lưu
  trữ kết quả, và phát `submission.accepted`.
- **Learning Service:** Chủ sở hữu Problem, Test Case ẩn, giới hạn thực thi và tập ngôn ngữ đang
  bật. Nó cung cấp gói dữ liệu judge được bảo vệ cho Submission và tiêu thụ `submission.accepted`
  để cập nhật tiến độ học tập.
- **Judge Service:** Worker tính toán tin cậy, thực thi lời giải trong sandbox và phân loại phán
  quyết. Nó không sở hữu lịch sử nộp bài và không quyết định ý nghĩa chính thức của kết quả.

## Bối cảnh

SUB-002 là tính năng trung tâm của Submission và là nguồn duy nhất được phép phát
`submission.accepted`. Nó khác [SUB-001](../run-code/spec.md) ở ba điểm quyết định:

1. **Dữ liệu chấm đến từ Learning, không phải từ người học.** Submission phải lấy gói dữ liệu
   judge được bảo vệ chứa Test Case ẩn, kết quả mong đợi, harness và giới hạn thực thi trước khi
   tạo việc cho Judge. Learning chỉ cấp gói cho Problem `PUBLISHED` và ngôn ngữ đang bật; người
   học không bao giờ cung cấp dữ liệu judge.
2. **Kết quả mang ý nghĩa chính thức.** Một phán quyết được chấp nhận trên một nộp bài chính thức là
   căn cứ để Learning đánh dấu Problem là đã giải và cập nhật tiến độ. Vì vậy ý nghĩa chấm điểm là
   một quyết định nghiệp vụ thuộc Submission, không phải một phép ánh xạ máy từ phán quyết của Judge.
3. **Kết quả phải bền vững và chống giao lại trùng.** Kết quả đi qua RabbitMQ với thủ công ACK, nên
   cùng một kết quả có thể được giao nhiều lần. Việc áp dụng kết quả MUST là idempotent; sự kiện
   tiến độ được phát bền vững và Learning áp dụng hiệu ứng đúng một lần theo `eventId`.

Quyết định sản phẩm đã chốt cho phiên bản này và ràng buộc SUB-002:

- **Submission kiểm tra ngôn ngữ đang bật.** SUB-002 MUST từ chối một lời giải dùng ngôn ngữ chưa
  được bật cho Problem đó, thay vì để Judge loại bỏ sau khi đã tạo việc.
- **Không giới hạn tần suất ở phiên bản này.** SUB-002 MUST NOT tự áp đặt hạn mức nộp bài theo người
  dùng. Rủi ro do việc này được ghi nhận tường minh.

Mã nguồn hiện tại đã có một hành vi Submit cơ bản: lấy gói judge từ Learning, lưu bản ghi ở trạng
thái `QUEUED`, phát `judge.request`, và khi không phát được thì ghi nhận `INTERNAL_ERROR`. Đó là nền
tảng hành vi, không phải một đặc tả `SUB-002` đã Approved.

## Yêu cầu chức năng

- **SUB-002-FR-001 — Quyền sở hữu của Submission:** Submission MUST sở hữu vòng đời nộp bài chính
  thức, việc lưu trữ lịch sử nộp bài, ý nghĩa chính thức của kết quả chấm, và quyết định khi nào một
  sự kiện tiến độ được phát. Judge MUST NOT quyết định những điều đó và Learning MUST NOT tự suy luận
  chúng từ dữ liệu chấm.
- **SUB-002-FR-002 — Ngôn ngữ phải được bật cho Problem:** Lời giải MUST dùng một ngôn ngữ nằm
  trong danh mục ngôn ngữ đã phê duyệt dùng chung VÀ được bật cho Problem mà lời giải nhắm tới.
  Submission MUST từ chối trước khi tạo việc cho Judge nếu ngôn ngữ không được bật cho Problem đó.
  Do LRN-002 trả cùng `404` cho Problem không đủ điều kiện và ngôn ngữ tắt, lỗi này MUST nêu rõ
  Problem/ngôn ngữ không sẵn sàng cho nộp bài, nhưng MUST NOT khẳng định nguyên nhân chưa thể biết.
- **SUB-002-FR-003 — Lấy gói dữ liệu judge được bảo vệ:** Trước khi tạo việc cho Judge, Submission
  MUST lấy từ Learning, qua một luồng nội bộ được xác thực, tối thiểu các dữ liệu sau: loại Problem,
  Test Case kèm kết quả mong đợi và trọng số, giới hạn thời gian, giới hạn bộ nhớ và harness ẩn khi
  có. Gói được yêu cầu theo `problemId` và ngôn ngữ; việc Learning cấp gói thành công là xác nhận
  Problem đang `PUBLISHED`, chưa xoá mềm và ngôn ngữ đó đang bật theo LRN-002-FR-015.
- **SUB-002-FR-004 — Người học không cung cấp dữ liệu judge:** Yêu cầu nộp bài MUST NOT chấp nhận
  `testCases`, `expectedOutput`, `hiddenHarness`, `timeLimitMs`, `memoryLimitMb`, tên file, lệnh biên
  dịch hay tham số Docker. Các trường đó bị từ chối bởi kiểm tra danh sách cho phép và MUST NOT ảnh
  hưởng tới kết quả.
- **SUB-002-FR-005 — Người học suy ra từ ngữ cảnh tin cậy:** Bản ghi nộp bài MUST lấy chủ sở hữu từ
  ngữ cảnh Gateway đã xác minh. Yêu cầu MUST NOT chấp nhận một định danh người dùng có thẩm quyền
  từ body, query hay route.
- **SUB-002-FR-006 — Tham chiếu Problem là ID ngoài ổn định:** Nộp bài MUST tham chiếu Problem bằng
  định danh ổn định do Learning sở hữu. Submission MUST NOT lưu hay nhân bản thực thể Problem, và
  MUST NOT tạo quan hệ lưu trữ với Problem.
- **SUB-002-FR-007 — Kiểm tra tính sẵn có của Problem:** Nếu Problem không tồn tại, hoặc không ở
  trạng thái cho phép nộp bài theo chính sách đã phê duyệt, Submission MUST từ chối yêu cầu và MUST
  NOT tạo bản ghi. Tính sẵn có được xác định từ dữ liệu do Learning trả về qua luồng nội bộ.
- **SUB-002-FR-008 — Nộp bài bất đồng bộ:** Nộp bài MUST được chấp nhận và xử lý bất đồng bộ. Yêu cầu
  trả về một định danh bản ghi và trạng thái đã được nhận vào hàng đợi, chứ không chờ phán quyết.
- **SUB-002-FR-009 — Nộp bài bất biến:** Một bản ghi nộp bài đã tạo MUST NOT bị sửa ở mã nguồn, ngôn
  ngữ, `problemId` hay chủ sở hữu. Một lời giải mới là một bản ghi mới. Submission MUST NOT cung
  cấp thao tác sửa, ghi đè hay xoá một bản ghi nộp bài trong phạm vi SUB-002.
- **SUB-002-FR-010 — Lưu trữ bằng PostgreSQL:** Submission MUST lưu bản ghi nộp bài và chi tiết kết
  quả bằng PostgreSQL như là nguồn chân lý. RabbitMQ và Redis không thay thế lưu trữ này.
- **SUB-002-FR-011 — Chuyển trạng thái là quyết định nghiệp vụ:** Việc một bản ghi chuyển sang
  trạng thái phán quyết cuối cùng nào là quyết định của Submission, dựa trên phân loại của Judge.
  Submission MUST đặt trạng thái cuối cùng và các trường kết quả trong một thao tác lưu trữ nguyên
  tử.
- **SUB-002-FR-012 — Phán quyết cuối cùng là kết thúc vòng đời:** Một bản ghi ở một trạng thái phán
  quyết cuối cùng đã kết thúc vòng đời. Submission MUST NOT thay đổi trạng thái cuối cùng đó khi
  nhận thêm kết quả, kể cả khi kết quả về sau khác với kết quả đầu tiên.
- **SUB-002-FR-013 — Ý nghĩa của việc được chấp nhận:** Submission MUST coi một bản ghi là được
  chấp nhận chính thức khi và chỉ khi loại của nó là nộp bài chính thức, phán quyết cuối cùng là
  `ACCEPTED`, và bản ghi tham chiếu một Problem. Run MUST NOT bao giờ thoả điều kiện này.
- **SUB-002-FR-014 — Định danh sự kiện ổn định:** Mỗi bản ghi nộp bài chính thức được chấp nhận MUST
  có một định danh sự kiện ổn định, được sinh ra một lần và lưu lại. Định danh đó MUST NOT được
  sinh lại khi sự kiện được phát lại.
- **SUB-002-FR-015 — Giao sự kiện tiến độ không mất:** Khi một bản ghi nộp bài chính thức được
  chấp nhận, Submission MUST phát `submission.accepted` mang định danh sự kiện ổn định, định danh
  bản ghi, chủ sở hữu, Problem, điểm tiến độ 100 và thời điểm xảy ra. Sự kiện MAY được giao lại với
  cùng `eventId`; Learning MUST áp dụng hiệu ứng tiến độ đúng một lần theo LRN-006.
- **SUB-002-FR-016 — Outbox bền vững:** Submission MUST ghi ý định phát sự kiện vào outbox trong
  cùng giao dịch PostgreSQL áp dụng phán quyết `ACCEPTED`. Relay phát qua RabbitMQ với xác nhận và
  thử lại tới khi thành công; sập sau khi broker nhận nhưng trước khi đánh dấu outbox có thể dẫn đến
  giao lại cùng `eventId`, không làm mất sự kiện.
- **SUB-002-FR-017 — Xử lý kết quả idempotent:** Khi nhận một kết quả phán quyết cho một bản ghi đã ở
  trạng thái cuối cùng, Submission MUST giữ nguyên trạng thái và dữ liệu đã lưu, MUST NOT tạo bản
  ghi kết quả trùng, và giữ một ý định phát outbox duy nhất cho cùng bản ghi được chấp nhận.
- **SUB-002-FR-018 — Áp dụng kết quả bất biến với giao lại trùng:** Submission MUST coi việc áp dụng
  một kết quả phán quyết như một thao tác chống giao lại trùng: khi hai lần xử lý chạy đồng thời cho
  cùng một bản ghi, nhiều nhất một lần được áp dụng và trạng thái cuối cùng phải nhất quán.
- **SUB-002-FR-019 — Lưu trữ chi tiết kết quả:** Submission MUST lưu trữ stdout, stderr, output biên
  dịch và thông tin chẩn đoán lỗi biên dịch cùng với bản ghi. Việc trả về những dữ liệu này cho
  người học được quyết định ở [SUB-003](../submission-history/spec.md).
- **SUB-002-FR-020 — Phát kết quả realtime:** Khi bản ghi chuyển sang trạng thái cuối cùng, Submission
  MUST phát kết quả cho đúng chủ sở hữu qua luồng realtime đã phê duyệt. Việc phát là
  best-effort; xem [SUB-004](../realtime-result/spec.md).
- **SUB-002-FR-021 — Thất bại chuẩn bị không để lại dở dang:** Nếu không lấy được gói judge, hoặc
  không phát được việc cho Judge, Submission MUST không để lại một bản ghi ở trạng thái chờ vô hạn.
  Nếu Learning không cấp gói, yêu cầu thất bại trước khi tạo bản ghi. Nếu đã tạo bản ghi nhưng không
  phát được việc, bản ghi kết thúc ở `INTERNAL_ERROR` và vẫn hiện trong lịch sử.
- **SUB-002-FR-022 — Trùng lặp có kiểm soát:** Nếu cùng một yêu cầu nộp bài được gửi lại, Submission
  MUST tạo một bản ghi mới theo SUB-002-FR-009. V1 không dùng `Idempotency-Key` hay hạn mức.
- **SUB-002-FR-023 — Không thuộc phạm vi Run:** Lời giải gửi qua Run MUST NOT tạo ra kết quả chính
  thức. Run không được phát `submission.accepted` và không làm thay đổi tiến độ; xem
  [SUB-001](../run-code/spec.md).

## Quy tắc nghiệp vụ

### Vòng đời nộp bài chính thức

```text
PENDING -> QUEUED -> ACCEPTED | WRONG_ANSWER | COMPILE_ERROR | RUNTIME_ERROR
                     | TIME_LIMIT_EXCEEDED | MEMORY_LIMIT_EXCEEDED | INTERNAL_ERROR
```

| Trạng thái              | Ý nghĩa                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `PENDING`               | Bản ghi đã được tạo nhưng việc chưa được giao cho hàng đợi               |
| `QUEUED`                | Việc đã được phát cho Judge và chờ kết quả                               |
| `ACCEPTED`              | Lời giải đã vượt qua toàn bộ Test Case; đây là cơ sở của tiến độ học tập |
| `WRONG_ANSWER`          | Lời giải chạy được nhưng ít nhất một Test Case có kết quả không khớp     |
| `COMPILE_ERROR`         | Trình biên dịch từ chối mã nguồn                                         |
| `RUNTIME_ERROR`         | Lời giải chạy nhưng kết thúc bằng lỗi                                    |
| `TIME_LIMIT_EXCEEDED`   | Lời giải vượt giới hạn thời gian                                         |
| `MEMORY_LIMIT_EXCEEDED` | Lời giải vượt giới hạn bộ nhớ                                            |
| `INTERNAL_ERROR`        | Hệ thống không thể hoàn tất việc chấm; đây KHÔNG phải lỗi của người học  |

- Mỗi bản ghi nộp bài chính thức bắt đầu ở `PENDING` và chuyển sang `QUEUED` khi việc chấm được giao
  thành công.
- Bảy trạng thái cuối cùng đã nêu trong bảng kết thúc vòng đời. `INTERNAL_ERROR` là trạng thái
  cuối cùng nhưng khác bản chất: nó biểu diễn thất bại của hệ thống, không phải kết luận về lời giải.
- `RUNNING` có tồn tại trong danh mục trạng thái nền tảng nhưng không dùng trong v1; Judge chỉ báo
  phán quyết cuối cùng. Bản ghi `PENDING` hoặc `QUEUED` quá 10 phút từ lúc tạo được watchdog chuyển
  nguyên tử sang `INTERNAL_ERROR`; kết quả muộn không ghi đè trạng thái cuối.
- Trạng thái không phải là một trường tuỳ ý. Yêu cầu nộp bài MUST NOT chấp nhận trạng thái, điểm
  số hay bất kỳ trường trạng thái kết quả nào từ client.
- Submission MUST NOT tự tính lại phán quyết. `TIME_LIMIT_EXCEEDED`, `MEMORY_LIMIT_EXCEEDED`,
  `COMPILE_ERROR`, `RUNTIME_ERROR` và `INTERNAL_ERROR` do Judge phân loại theo
  [`specs/00-system/judge-security.md`](../../00-system/judge-security.md).

### Ý nghĩa chấm điểm

- **Điểm của một bản ghi là điểm do Judge báo về tập Test Case đã đánh giá.** Submission lưu điểm đó
  như một thuộc tính quan sát được; khi Judge không báo điểm, giá trị là `null`, không suy thành 0.
- **Điểm chính thức của một Problem với một người học không thuộc SUB-002.** Việc tổng hợp điểm theo
  Assignment, trọng số `maxScore` và cách quy đổi sang điểm học kỳ thuộc đặc tả Assignment và
  Progress của Learning. SUB-002 chỉ đảm bảo điểm nó phát ra là có nghĩa.
- **Điểm tiến độ khác điểm Judge:** Event `submission.accepted` mang `score = 100` cho mọi Submit
  `ACCEPTED`, kể cả khi điểm Judge là 0 hoặc `null`, theo contract LRN-006. Assignment tự tổng hợp
  điểm từ dữ liệu cần thiết của Learning; Submission không lưu điểm Assignment riêng.
- `ACCEPTED` không suy ra từ việc có điểm. Quy tắc là trạng thái phán quyết, và điểm là thuộc tính
  đi kèm.
- Một bản ghi `WRONG_ANSWER` vẫn có thể đạt một phần điểm nếu Test Case có trọng số. Việc ghi nhận
  điểm một phần là thuộc tính của kết quả Judge, không phải quyết định của Submission.
- `INTERNAL_ERROR` MUST NOT mang một điểm mang ý nghĩa tiến độ. Nó MUST NOT phát
  `submission.accepted` dù điểm được lưu là bao nhiêu.

### Quan hệ với tiến độ học tập

- `submission.accepted` là tín hiệu duy nhất mà Submission phát để Learning cập nhật tiến độ.
- Ý định phát được lưu cùng phán quyết; RabbitMQ có thể giao lại cùng `eventId`. Learning nhận biết
  và bỏ qua sự kiện trùng theo LRN-006-FR-004.
- Submission MUST NOT gọi trực tiếp một API cập nhật tiến độ của Learning, và MUST NOT truy vấn
  cơ sở dữ liệu của Learning.
- Sự kiện mang thông tin tối thiểu cần thiết để Learning cập nhật tiến độ: định danh sự kiện ổn
  định, thời điểm xảy ra, định danh bản ghi, định danh người dùng, định danh Problem và điểm số.
  Submission MUST NOT gửi mã nguồn, Test Case, kết quả mong đợi hay harness trong sự kiện này.
- Việc Learning xử lý sự kiện trùng, ví dụ do giao hàng lặp, là trách nhiệm của Learning. Định
  danh sự kiện ổn định tồn tại chính là để phía tiêu thụ nhận biết.

### Ràng buộc dữ liệu judge

- Test Case ẩn, kết quả mong đợi và harness chỉ đi trên luồng nội bộ Learning → Submission → Judge. Chúng
  MUST NOT xuất hiện trong bất kỳ phản hồi nào hướng tới người học, kể cả trong lỗi.
- Submission không được lưu Test Case ẩn hay kết quả mong đợi vào cơ sở dữ liệu của mình. Nó chỉ
  giữ mã nguồn của người học và kết quả quan sát được.
- Harness ẩn có thể được ghép vào mã nguồn trước khi biên dịch, nhưng việc ghép đó là quyết định
  thuộc Judge. Submission không được sửa hay kiểm duyệt nội dung harness.

## Quy tắc phân quyền

- Nộp bài là một thao tác được bảo vệ. Người gọi thiếu hoặc sai access token MUST bị từ chối với
  `401` và không có bản ghi nào được tạo.
- Mọi vai trò đã xác thực MAY nộp bài trong phiên bản này; không cần quyền riêng
  `submission:submit`. Learning quyết định có cấp gói judge cho Problem/ngôn ngữ hay không.
- Một người học MUST NOT đọc, sửa hay xoá một bản ghi nộp bài không thuộc sở hữu của họ. Khả năng
  giảng viên xem lời giải của sinh viên thuộc phạm vi một đặc tả riêng và nằm ngoài SUB-002.
- `STUDENT` MUST NOT dùng bất kỳ thao tác nào của Submission để suy ra Test Case ẩn, kết quả mong
  đợi, harness, lệnh biên dịch hay cấu hình sandbox.
- `ADMIN` không mặc nhiên có thẩm quyền đặc biệt đối với nộp bài. Mọi khả năng đặc biệt cần một quy
  ết định tường minh và cùng việc kiểm tra phía server như mọi tác nhân khác.
- Gateway thực hiện xác thực và kiểm tra route ở mức thô. Submission MUST thực thi kiểm tra ngữ
  cảnh tin cậy, quyền và chính sách Problem tại một ranh giới backend tin cậy.
- Submission MUST suy ra danh tính người gọi từ ngữ cảnh Gateway/service đã được xác minh. Body,
  query, route hay header do client gửi MUST NOT thiết lập chủ sở hữu, vai trò, quyền hay quyền sở
  hữu.
- Submission là một service tin cậy đối với Learning khi lấy gói dữ liệu judge, nhưng việc tin cậy đó
  chỉ áp dụng cho luồng nội bộ đã phê duyệt và MUST NOT cấp cho Submission quyền quản lý Problem.

## Đầu vào

Các route dưới đây là thao tác ở mức khái niệm, không phải thiết kế controller cuối cùng. Cách đặt
tên chính xác và hình dạng DTO thuộc về `plan.md`.

### Nộp bài

Yêu cầu ngữ cảnh người gọi đã xác thực và tin cậy, và chấp nhận:

- định danh Problem ổn định;
- một ngôn ngữ từ danh mục đã phê duyệt dùng chung; và
- mã nguồn không rỗng, không vượt quá giới hạn độ dài đã phê duyệt của nền tảng.

Nó MUST NOT chấp nhận `testCases`, `expectedOutput`, `hiddenHarness`, `timeLimitMs`,
`memoryLimitMb`, tên file, lệnh biên dịch, tham số Docker, trạng thái, điểm số, chủ sở hữu, vai
trò hay quyền.

### Áp dụng kết quả từ Judge

Kết quả phán quyết đến qua hàng đợi `judge.result` với nội dung là một kết quả đã phân loại. Đây
không phải một request công khai, và các trường của nó là contract giao tiếp chứ không phải đầu vào
của người học. Submission MUST phân biệt được một kết quả không hợp lệ về mặt hình thức và xử lý nó
mà không làm hỏng bản ghi.

## Đầu ra

- Nộp bài thành công trả về định danh bản ghi, loại là nộp bài chính thức, trạng thái đã được nhận vào
  hàng đợi, định danh Problem, ngôn ngữ và các mốc thời gian cơ bản. Nó MUST NOT trả về phán quyết
  trong cùng một phản hồi.
- Phản hồi nộp bài MUST NOT chứa Test Case, kết quả mong đợi, harness, lệnh biên dịch hay tham số
  sandbox.
- Trạng thái cuối cùng, điểm số, số Test Case đạt, tổng số Test Case, thời gian chạy và bộ nhớ dùng
  của bản ghi được lưu trữ và quan sát được theo
  [SUB-003](../submission-history/spec.md).
- Khi bản ghi được chấp nhận chính thức, outbox phát `submission.accepted` với định danh sự kiện
  ổn định và có thể thử lại cùng định danh; không tạo sự kiện logic thứ hai cho bản ghi đó.
- Kết quả được phát cho đúng chủ sở hữu qua luồng realtime theo
  [SUB-004](../realtime-result/spec.md). Việc phát là best-effort.
- Sự kiện tiến độ MUST NOT chứa mã nguồn, Test Case, kết quả mong đợi hay harness.

## Tình huống lỗi

| Trường hợp                                                                   | Hành vi quan sát được                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Thiếu hoặc sai access token khi nộp bài                                      | `401`; không tạo bản ghi                                                                    |
| Problem không tồn tại                                                        | `404` từ gói judge được ánh xạ thành lỗi Problem/ngôn ngữ không sẵn sàng; không tạo bản ghi |
| Problem chưa ở trạng thái cho phép nộp bài                                   | Cùng lỗi Problem/ngôn ngữ không sẵn sàng; không tạo bản ghi                                 |
| Ngôn ngữ không thuộc danh mục dùng chung                                     | Lỗi kiểm tra dữ liệu; không tạo bản ghi, không gọi Judge                                    |
| Ngôn ngữ chưa được bật cho Problem                                           | Cùng lỗi Problem/ngôn ngữ không sẵn sàng; không tạo việc cho Judge                          |
| Mã nguồn rỗng hoặc vượt giới hạn độ dài                                      | Lỗi kiểm tra dữ liệu; không tạo bản ghi, không gọi Judge                                    |
| Cố cung cấp Test Case, `expectedOutput`, harness, giới hạn hoặc lệnh runtime | Trường bị từ chối; không thể thay đổi việc chấm                                             |
| Cố cung cấp trạng thái, điểm số, chủ sở hữu, vai trò hay quyền               | Trường bị từ chối; không thể ảnh hưởng tới vòng đời hay phân quyền                          |
| Không lấy được gói dữ liệu judge từ Learning                                 | Yêu cầu lỗi trước khi tạo bản ghi; không gọi Judge                                          |
| Không phát được việc cho Judge                                               | Bản ghi đã tạo kết thúc ở `INTERNAL_ERROR` và hiện trong lịch sử                            |
| Judge không trả kết quả trong 10 phút                                        | Watchdog chuyển bản ghi còn chờ sang `INTERNAL_ERROR`                                       |
| Kết quả phán quyết không hợp lệ về mặt hình thức                             | Bản ghi giữ trạng thái trước đó; Submission ghi nhận lỗi nội bộ, không ghi dữ liệu rác      |
| Kết quả phán quyết về một bản ghi không tồn tại                              | Bản ghi không hợp lệ bị loại; Submission ghi nhận lỗi nội bộ                                |
| Kết quả phán quyết cho bản ghi đã ở trạng thái cuối cùng                     | Trạng thái và dữ liệu giữ nguyên; không tạo bản ghi kết quả trùng                           |
| Hai lần xử lý kết quả cho cùng một bản ghi chạy đồng thời                    | Nhiều nhất một lần áp dụng; trạng thái cuối nhất quán                                       |
| Broker nhận event nhưng relay sập trước khi đánh dấu outbox                  | Relay MAY phát lại cùng `eventId`; Learning bỏ qua hiệu ứng trùng                           |
| Sự kiện tiến độ chưa phát được                                               | Outbox còn pending và relay thử lại; không mất ý định phát                                  |
| Cố đọc hoặc sửa một bản ghi nộp bài của người khác                           | Bị từ chối; không lộ sự tồn tại của bản ghi                                                 |
| Cố sửa mã nguồn của một bản ghi nộp bài đã tạo                               | Thao tác không tồn tại trong phạm vi SUB-002; bản ghi giữ nguyên                            |
| Redis hoặc luồng realtime không sẵn sàng                                     | Bản ghi vẫn hoàn tất, sự kiện tiến độ vẫn được phát, chỉ thiếu thông báo realtime           |
| Lỗi lưu trữ hoặc lỗi phụ thuộc ngoài dự kiến                                 | Quy ước lỗi chuẩn hoá hiện có, không kèm nội dung ẩn hay chi tiết xuyên service             |

SUB-002 không đưa ra cấu trúc lỗi mới. Tuần tự hoá ở tầng truyền tải tuân theo quy ước
Gateway/Submission/NestJS hiện có.

## Tình huống biên

- Một lời giải có thể nhận `ACCEPTED` với điểm Judge bằng 0 hoặc `null`. `ACCEPTED` là quy tắc
  trạng thái; event tiến độ vẫn mang `score = 100` theo LRN-006.
- Nhiều nộp bài gần như đồng thời của cùng một người học được chấp nhận đồng thời. Ở phiên bản này
  không có hạn mức, nên thứ tự chấm là bất đảm bảo.
- Thứ tự mà các kết quả về không nhất thiết khớp với thứ tự gửi. Mỗi bản ghi được xử lý độc lập, nên
  một lời giải sai vẫn có thể chấm trước một lời giải đúng của cùng người học.
- Với cùng một người học và cùng một Problem, một `submission.accepted` thứ hai vẫn được phát vì nó
  thuộc một bản ghi khác. Learning, chứ không phải Submission, quyết định việc gộp nhiều lần giải
  thành một trạng thái tiến độ.
- Nếu Judge trả về hai kết quả khác nhau cho cùng một bản ghi, kết quả đến trước thắng. Kết quả đến
  sau bị bỏ qua; chỉ một ý định phát event ổn định tồn tại trong outbox.
- Nếu một bản ghi nhận `INTERNAL_ERROR`, nó vẫn là một bản ghi đã hoàn tất và vẫn hiện trong lịch
  sử. Nó MUST NOT bị xoá để làm sạch, vì người học cần thấy rằng hệ thống đã thất bại chứ không phải
  lời giải của họ.
- Gánh nặng hàng đợi tăng lên khi một người học gửi nhiều nộp bài. Vì v1 không có hạn mức, đây là rủi
  ro đã biết của v1.
- Một Problem có thể bị giải bởi lời giải cũ sau khi người học đã xoá lịch sử hiển thị. Xoá ở phía
  người học không thay đổi ý nghĩa của một sự kiện tiến độ đã phát.
- Một bản ghi thuộc về một người học vẫn tồn tại sau khi tài khoản bị khoá. Quyền truy cập thay đổi;
  dữ liệu nộp bài không bị xoá.
- Tiêu đề Problem và nội dung đề bài có thể thay đổi sau khi lời giải đã được nộp. Điều đó MUST NOT
  thay đổi kết quả của một bản ghi đã lưu.

## Yêu cầu bảo mật

- **SUB-002-SR-001 — Phân quyền phía server:** Submission MUST thực thi kiểm tra ngữ cảnh tin cậy,
  quyền và chính sách Problem tại một ranh giới backend tin cậy; giao diện frontend không phải là
  biện pháp kiểm soát bảo mật.
- **SUB-002-SR-002 — Ngữ cảnh tác nhân tin cậy:** Chủ sở hữu bản ghi MUST chỉ đến từ ngữ cảnh
  Gateway/service đã được xác minh. Định danh, vai trò, quyền hay header nội bộ tin cậy do client gửi
  MUST NOT ảnh hưởng tới bất kỳ quyết định nào.
- **SUB-002-SR-003 — Chống gán hàng loạt:** Đầu vào nộp bài MUST liệt kê tường minh các trường được
  phép. Chủ sở hữu, trạng thái, điểm số, dữ liệu judge, vai trò và quyền MUST NOT thay đổi được qua
  các trường request tuỳ ý.
- **SUB-002-SR-004 — Bảo vệ luồng nội bộ:** Gói dữ liệu judge chứa Test Case ẩn MUST chỉ được lấy qua
  một luồng nội bộ đã xác thực. Người gọi công khai và các header nội bộ giả mạo MUST bị từ chối.
- **SUB-002-SR-005 — Không rò rỉ dữ liệu judge ẩn:** Test Case ẩn, kết quả mong đợi, harness, lời giải
  nội bộ, lệnh biên dịch và cấu hình Docker MUST NOT xuất hiện trong phản hồi công khai, phản hồi quản
  lý, thông báo lỗi, log, hay ví dụ Swagger.
- **SUB-002-SR-006 — Không thực thi tại Submission:** Submission MUST NOT biên dịch hay thực thi mã
  của người học. Mọi thực thi diễn ra ở Judge theo các ràng buộc sandbox bắt buộc.
- **SUB-002-SR-007 — Mã nguồn là dữ liệu, không phải lệnh:** Mã nguồn của người học MUST được coi là
  dữ liệu không tin cậy và MUST NOT trở thành tên file, lệnh biên dịch, lệnh shell, tham số Docker,
  mạng hay cấu hình sandbox.
- **SUB-002-SR-008 — Danh sách cho phép ở đầu ra:** Phản hồi nộp bài MUST được ánh xạ tường minh và
  MUST NOT tuần tự hoá thực thể lưu trữ theo cách làm rò rỉ các trường bị ẩn khỏi select hoặc các
  trường nội bộ mới thêm.
- **SUB-002-SR-009 — Ghi log an toàn:** Header xác thực, bí mật của service, toàn bộ mã nguồn của người
  học, tài liệu judge ẩn và nội dung render không tin cậy MUST NOT được ghi vào log hoặc lỗi.
- **SUB-002-SR-010 — Cách ly service và cơ sở dữ liệu:** Submission MUST NOT truy vấn cơ sở dữ liệu của
  Learning, Identity hay Judge, và MUST NOT tạo khoá ngoại xuyên service. `problemId` là một giá
  trị định danh ngoài, không phải quan hệ lưu trữ.
- **SUB-002-SR-011 — Chống giao lại trùng:** Việc áp dụng kết quả phán quyết MUST chịu được giao hàng
  lặp. Một kết quả không bao giờ được áp dụng hai lần vào cùng một bản ghi; outbox chỉ tạo một event
  logic cho bản ghi, dù RabbitMQ MAY giao lại cùng `eventId`.
- **SUB-002-SR-012 — Thất bại an toàn:** Ngữ cảnh phân quyền bị thiếu, lỗi thời, sai định dạng hay mơ
  hồ MUST thất bại theo hướng đóng và không được để lại một bản ghi ở trạng thái dở dang.
- **SUB-002-SR-013 — `INTERNAL_ERROR` không phải kết luận:** Submission MUST NOT trình bày
  `INTERNAL_ERROR` như một phán quyết về lời giải, và MUST NOT dùng nó để phát sự kiện tiến độ.

## Tiêu chí nghiệm thu

- **SUB-002-AC-001:** Cho trước một người học đã xác thực và một Problem sẵn sàng nhận lời giải, khi
  họ nộp mã hợp lệ bằng một ngôn ngữ được bật cho Problem, thì một bản ghi nộp bài chính thức được
  tạo ở trạng thái đã được nhận vào hàng đợi với chủ sở hữu lấy từ ngữ cảnh tin cậy, và phản hồi
  không chứa phán quyết.
- **SUB-002-AC-002:** Cho trước một Problem đã xuất bản, khi một người học nộp bằng ngôn ngữ chưa được
  bật cho Problem đó, thì yêu cầu bị từ chối với lỗi Problem/ngôn ngữ không sẵn sàng và
  không có việc nào được gửi tới Judge.
- **SUB-002-AC-003:** Cho trước một Problem không tồn tại hoặc chưa ở trạng thái cho phép nộp bài, khi
  nộp, thì yêu cầu bị từ chối với lỗi phù hợp và không có bản ghi nào được tạo.
- **SUB-002-AC-004:** Cho trước một yêu cầu nộp bài chứa `testCases`, `expectedOutput`,
  `hiddenHarness`, `timeLimitMs`, `memoryLimitMb` hay lệnh runtime, khi kiểm tra dữ liệu chạy, thì các
  trường đó không thể thay đổi việc chấm và dữ liệu judge lấy từ Learning là nguồn duy nhất.
- **SUB-002-AC-005:** Cho trước một yêu cầu nộp bài chứa trạng thái, điểm số, chủ sở hữu, vai trò hoặc
  quyền, khi kiểm tra dữ liệu chạy, thì các trường đó không thể thay đổi vòng đời hay phân quyền.
- **SUB-002-AC-006:** Cho trước một yêu cầu nộp bài thiếu hoặc có access token không hợp lệ, khi yêu
  cầu được kiểm tra, thì nó nhận `401` và không có bản ghi nào được tạo.
- **SUB-002-AC-007:** Cho trước một bản ghi nộp bài chính thức, khi Judge trả về phán quyết cuối cùng,
  thì trạng thái, điểm, số Test Case đạt, tổng số Test Case, thời gian chạy, bộ nhớ và chi tiết kết
  quả được ghi nhận trong một thao tác lưu trữ nguyên tử.
- **SUB-002-AC-008:** Cho trước cùng một kết quả phán quyết được giao lại lần thứ hai do giao hàng lặp,
  khi nó được xử lý, thì trạng thái cuối và dữ liệu đã lưu không đổi, không có bản ghi kết quả trùng, và
  không tạo thêm ý định phát event; relay MAY giao lại cùng `eventId`.
- **SUB-002-AC-009:** Cho trước hai lần xử lý kết quả cho cùng một bản ghi chạy đồng thời, khi chúng
  hoàn tất, thì nhiều nhất một lần áp dụng và trạng thái cuối cùng nhất quán.
- **SUB-002-AC-010:** Cho trước một bản ghi nộp bài chính thức được chấp nhận, khi sự kiện tiến độ được
  kiểm tra, thì outbox có đúng một event logic với định danh ổn định, mang định danh bản ghi, chủ
  sở hữu, Problem và điểm tiến độ 100, không mang mã nguồn, Test Case hay harness.
- **SUB-002-AC-011:** Cho trước một bản ghi nhận `INTERNAL_ERROR`, khi sự kiện tiến độ được kiểm tra,
  thì không có `submission.accepted` nào được phát cho nó bất kể điểm số được lưu là bao nhiêu.
- **SUB-002-AC-012:** Cho trước một Run đã hoàn tất với trạng thái `EXECUTED`, khi sự kiện tiến độ được
  kiểm tra, thì không có `submission.accepted` nào được phát cho Run đó.
- **SUB-002-AC-013:** Cho trước một bản ghi đã được chấp nhận và sự kiện tiến độ đã được phát, khi tiến
  trình sập và kết quả được xử lý lại, thì không tạo thêm event logic; nếu relay phát lại cùng
  `eventId`, Learning không áp dụng tiến độ lần nữa.
- **SUB-002-AC-014:** Cho trước một bản ghi nộp bài chính thức, khi tiến trình sập giữa lúc chuẩn bị hoặc
  lúc phát việc cho Judge, khi xử lý lại, thì bản ghi không bị bỏ treo ở trạng thái chờ vô hạn.
- **SUB-002-AC-015:** Cho trước hành vi nộp bài, khi quyền sở hữu service được kiểm tra, thì Submission
  không thực thi mã, không tạo quan hệ lưu trữ với Problem, và chỉ tham chiếu Learning qua luồng nội
  bộ đã xác thực.
- **SUB-002-AC-016:** Cho trước một phản hồi, lỗi, log hay ví dụ Swagger của nộp bài, khi kiểm tra,
  thì nó không chứa Test Case ẩn, kết quả mong đợi, harness, lời giải nội bộ, thông tin xác thực hay
  lệnh runtime nào.
- **SUB-002-AC-017:** Cho trước một bản ghi nộp bài, khi tiến độ học tập ở Learning được kiểm tra, thì
  tiến độ chỉ thay đổi qua `submission.accepted` và Submission không gọi trực tiếp bất kỳ API cập
  nhật tiến độ nào của Learning.
- **SUB-002-AC-018:** Cho trước một tiêu đề hay nội dung Problem thay đổi sau khi lời giải đã được nộp,
  khi kết quả của bản ghi cũ được đọc, thì kết quả đó không thay đổi.
- **SUB-002-AC-019:** Cho trước một bản ghi nộp bài chính thức, khi người học thử sửa mã nguồn của nó,
  thì thao tác đó không tồn tại trong phạm vi SUB-002 và bản ghi giữ nguyên mã nguồn ban đầu.
- **SUB-002-AC-020:** Cho trước một bản ghi nộp bài của một người học, khi người khác thử đọc hoặc sửa
  nó, thì thao tác bị từ chối mà không lộ sự tồn tại của bản ghi.

## Ngoài phạm vi

- Chạy thử mã; nó thuộc [SUB-001](../run-code/spec.md)
- Lịch sử nộp bài, phân trang lịch sử và biểu diễn chi tiết kết quả cho người học; chúng thuộc
  [SUB-003](../submission-history/spec.md)
- Hợp đồng realtime, cơ chế phát tới Gateway và hành vi khi tin realtime bị mất; chúng thuộc
  [SUB-004](../realtime-result/spec.md)
- Việc biên dịch, thực thi, sinh harness, so sánh và phân loại kết quả của Judge
- Quản lý Problem, Test Case, starter code, harness và tập ngôn ngữ đang bật; chúng thuộc Learning
- Việc tổng hợp điểm, chấm điểm Assignment, hạn chót và quyết định có được chấp nộp bài hay không;
  chúng thuộc đặc tả Assignment trong tương lai của Learning
- Quyền tiếp cận Problem theo khóa học, lớp hay đăng ký học; chúng thuộc đặc tả Course, Enrollment
  và Assignment trong tương lai
- Giao diện xem lời giải của sinh viên cho giảng viên, chấm điểm thủ công, nhận xét và phản hồi
  của giảng viên
- Lưu nháp mã nguồn, tự động lưu, và đồng bộ mã giữa các thiết bị
- Sửa, ghi đè, xoá hoặc rút lại một bản ghi nộp bài đã tạo
- Xếp hạng, bảng xếp hạng và tranh giành Problem
- Hạn mức tần suất, giới hạn số việc chờ theo người dùng, và trả `429` tại Submission
- Xác định đạo văn, chống sao chép mã giữa những người học khác nhau, và phân tích tương đối
- Bất kỳ microservice Submit riêng nào; Submit thuộc Submission
- Bảo đảm broker giao vật lý chính xác một lần; v1 dùng outbox phát at-least-once và Learning
  chống áp dụng trùng theo `eventId`

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
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Chiến lược giao tiếp](../../00-system/communication.md)
- [Bảo mật Judge](../../00-system/judge-security.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [ID-001 Authentication](../../01-identity/authentication/spec.md) cho định danh đã xác thực, ngữ
  cảnh Gateway tin cậy và hành vi theo trạng thái tài khoản.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) cho mặc-định-từ-chối, quy ước đặt tên quyền
  `resource:action` và ngữ nghĩa vai trò.
- [LRN-001 Quản lý Problem](../../02-learning/problems/spec.md) cho vòng đời Problem, danh mục
  ngôn ngữ đang bật theo Problem, giới hạn thực thi, và ranh giới dữ liệu judge tin cậy.
- [SUB-001 Run Code](../run-code/spec.md) cho phân biệt Run với nộp bài chính thức.
- [SUB-003 Submission History](../submission-history/spec.md) cho biểu diễn bản ghi và phân trang.
- [SUB-004 Realtime Result](../realtime-result/spec.md) cho hợp đồng phát kết quả.
- Đặc tả Test Case trong tương lai của Learning, cho trọng số Test Case và tính sẵn có của dữ liệu
  chấm.
- Đặc tả Assignment trong tương lai của Learning, cho hạn chót, `maxScore` và chấm điểm.
- Các đặc tả Judge (`JDG-*`), cho phân loại phán quyết, cách ghép harness và các trần sandbox.

## Quyết định đã phê duyệt

Learning cấp gói judge theo `problemId` và ngôn ngữ chỉ khi Problem `PUBLISHED`, chưa xoá mềm và
ngôn ngữ đang bật (LRN-002-FR-015). Gói tại lúc nhận yêu cầu là snapshot để Judge xử lý, kể cả
khi Learning đổi ngôn ngữ sau đó. Điểm Judge thiếu là `null`; event `ACCEPTED` mang 100 theo
LRN-006. Không dùng `RUNNING`, không quyền riêng, không quota hoặc idempotency key; mỗi yêu cầu tạo
bản ghi mới. Learning lỗi thì từ chối trước khi tạo bản ghi; phát job lỗi thì bản ghi kết thúc
`INTERNAL_ERROR`; watchdog 10 phút xử lý bản ghi treo. Submission không lưu điểm Assignment riêng.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review        | Tóm tắt                                                 |
| ---------- | --------- | --------------------------- | ------------------------------------------------------- |
| 2026-09-29 | 0.1       | Codex / TBD                 | Đặc tả Nộp bài chính thức ban đầu ở trạng thái Proposed |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm / Codex | Phê duyệt Submit, outbox và contract điểm tiến độ       |

> `spec.md` mô tả CÁI GÌ. Controller, DTO, entity, aggregate, repository, migration, hình dạng
> lưu trữ, hợp đồng message và thứ tự thực thi thuộc về `plan.md`.
