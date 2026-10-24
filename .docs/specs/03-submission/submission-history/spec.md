# SUB-003 Lịch sử nộp bài (Submission History)

## Trạng thái

Approved

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép một người học xem toàn bộ lịch sử nộp bài chính thức và lịch sử chạy thử của chính họ, đọc
chi tiết một bản ghi bất kỳ thuộc sở hữu của họ, và thấy trạng thái kết quả mà không cần biết ID
nội bộ của bản ghi. Lịch sử là chế độ chỉ đọc, chỉ hiện cho chủ sở hữu, và không để lộ Test Case ẩn.

## Tác nhân

- **STUDENT (người học):** Người học đã xác thực xem danh sách nộp bài của chính mình và đọc chi tiết
  một bản ghi thuộc sở hữu của họ.
- **Khách chưa xác thực:** Người gọi không có ngữ cảnh định danh tin cậy. Tác nhân này MUST NOT đọc
  được lịch sử của bất kỳ ai.
- **API Gateway:** Cổng vào công khai, xác minh access token, loại bỏ header định danh tin cậy do
  client gửi, và chuyển tiếp ngữ cảnh định danh đã xác minh.
- **Submission Service:** Chủ sở hữu việc đọc lịch sử và chi tiết bản ghi. Nó trả về dữ liệu đã lọc theo
  chủ sở hữu và đã loại bỏ trường nhạy cảm.
- **Judge Service:** Trả kết quả thực thi để Submission lưu vào lịch sử; Judge không sở hữu lịch sử.
  Sự khác biệt hành vi Run/Submit được mô tả ở [SUB-001](../run-code/spec.md) và
  [SUB-002](../submit-code/spec.md).

## Bối cảnh

SUB-001 và SUB-002 tạo ra bản ghi. SUB-003 là mặt đọc của dữ liệu đó, và là nơi duy nhất quyết định
**người học được thấy gì trong một bản ghi chấm**.

Ranh giới quan trọng: Submission có thể lưu `stdout` và `stderr` mà Judge gửi về, trong đó `stdout`
của một Test Case ẩn có thể chứa dữ liệu mà giảng viên không muốn lộ. Vì vậy SUB-003 phải quyết
định rõ:

1. Bản ghi nào hiện trong lịch sử (nộp bài chính thức, Run, hay cả hai).
2. Trường kết quả nào được trả về cho người học, và trường nào bị loại bỏ dù đã được lưu.

Quyết định sản phẩm đã chốt cho phiên bản này và ràng buộc SUB-003:

- **Chỉ chủ sở hữu được xem.** Lịch sử và chi tiết bản ghi là tài nguyên riêng tư của từng người học.
- **Phải có phân trang.** Danh sách lịch sử không bao giờ trả về toàn bộ bản ghi trong một phản hồi.

Hai quyết định trên đều có tác động bảo mật trực tiếp và không thể suy ra từ kiến trúc.

## Yêu cầu chức năng

- **SUB-003-FR-001 — Chỉ chủ sở hữu:** Danh sách lịch sử MUST được lọc theo chủ sở hữu lấy từ ngữ
  cảnh tin cậy. Một người học MUST chỉ thấy bản ghi của chính họ.
- **SUB-003-FR-002 — Cả nộp bài chính thức và Run:** Mặc định, danh sách lịch sử bao gồm cả nộp bài
  chính thức và Run, vì cả hai đều là hành vi của người học trên cùng một Problem. Mỗi bản ghi phải
  cho biết loại của nó.
- **SUB-003-FR-003 — Lọc theo loại:** Người học MUST có thể lọc danh sách theo Problem và theo loại
  bản ghi. Bộ lọc MUST được áp dụng cùng với bộ lọc chủ sở hữu; bộ lọc không bao giờ có thể mở rộng tập
  bản ghi ra ngoài phạm vi sở hữu.
- **SUB-003-FR-004 — Phân trang bắt buộc:** Danh sách lịch sử MUST được phân trang. Phản hồi phải cho
  biết có bao nhiêu bản ghi khớp bộ lọc và có bao nhiêu trang.
- **SUB-003-FR-005 — Thứ tự ổn định:** Danh sách MUST có thứ tự xác định bằng thời điểm tạo bản ghi từ
  mới đến cũ, và phải ổn định khi nhiều bản ghi trùng thời điểm. Phân trang qua các trang khác
  nhau không được bỏ sót hay lặp bản ghi.
- **SUB-003-FR-006 — Điều hướng bằng con trỏ tới mốc thời gian:** Phân trang phải dựa trên một mốc
  thời gian cộng một định danh phá vỡ thứ tự, để việc thêm bản ghi mới trong lúc người học đang lật
  trang không làm bản ghi cũ bị bỏ sót hay lặp lại.
- **SUB-003-FR-007 — Xem chi tiết một bản ghi:** Người học MUST đọc được chi tiết của một bản ghi thuộc
  sở hữu của họ, gồm trạng thái, loại, ngôn ngữ, Problem, điểm, số Test Case đạt trên tổng số, thời
  gian chạy, bộ nhớ dùng, và các mốc thời gian.
- **SUB-003-FR-008 — Không cần biết ID nội bộ:** Mỗi bản ghi MUST có một định danh công khai ổn định để
  tra cứu, tách biệt khỏi khoá chính của cơ sở dữ liệu. Việc tra cứu phải dùng định danh công khai
  đó, không dùng khoá chính. Bản ghi cũ MAY được tra cứu bằng UUID khoá chính trong giai đoạn tương
  thích, luôn với cùng điều kiện chủ sở hữu; phản hồi chỉ trả `publicId` dưới tên `id`.
- **SUB-003-FR-009 — Điểm và trạng thái nhất quán với nguồn:** Trạng thái và điểm hiển thị MUST là giá
  trị đã lưu của bản ghi tại thời điểm đọc. Submission MUST NOT tự tính lại hay tự suy luận lại kết quả
  khi hiển thị.
- **SUB-003-FR-010 — Bản ghi chưa có kết quả:** Với một bản ghi chưa có phán quyết cuối cùng, Submission
  MUST trả về trạng thái hiện tại và các trường kết quả ở dạng chưa có, thay vì trả về 0 như một giá
  trị kết quả thật.
- **SUB-003-FR-011 — Loại trừ trường nhạy cảm:** `stdout` và `stderr` sinh ra từ Test Case ẩn MUST
  KHÔNG được trả về cho người học. Chỉ chi tiết Run MAY trả stdout/stderr vì Run chỉ dùng stdin của
  người gọi và không có Test Case ẩn.
- **SUB-003-FR-012 — Nội dung thuộc quyền xem:** Thông báo lỗi biên dịch, thông báo lỗi runtime và
  thông tin chẩn đoán lỗi biên dịch phải thuộc quyền xem của người học, vì chúng mô tả lỗi trong mã
  của chính họ. Tuy nhiên nội dung đó MUST được giới hạn vào khuôn khung lỗi do Judge cung cấp, và
  MUST bao gồm cả thông tin biên dịch, vì có nhiều ngôn ngữ chỉ báo cáo lỗi qua dòng biên dịch.
- **SUB-003-FR-013 — Không trả về dữ liệu judge:** Phản hồi lịch sử và chi tiết MUST NOT chứa Test
  Case, kết quả mong đợi, harness, lệnh biên dịch, tham số sandbox, hay dữ liệu judge nội bộ.
- **SUB-003-FR-014 — Vòng đời bản ghi bất biến trong lịch sử:** Một bản ghi xuất hiện trong lịch sử với
  mã nguồn và kết quả của nó. Khi kết quả được ghi vào, trạng thái và điểm được cập nhật, nhưng bản
  ghi đó vẫn là cùng một bản ghi, và lịch sử không được tạo ra một dòng thay thế cho nó.
- **SUB-003-FR-015 — Không chỉnh sửa lịch sử:** Không có thao tác chỉnh sửa hay xoá bản ghi nộp bài trong
  phạm vi SUB-003. Một thao tác xoá ở phía người học chỉ có thể là xoá khỏi hiển thị cục bộ, và
  việc đó MUST NOT làm thay đổi dữ liệu hay ý nghĩa của một sự kiện tiến độ đã phát.
- **SUB-003-FR-016 — Lịch sử theo Problem:** Người học MUST có thể xem lịch sử riêng của một Problem, và
  xem liệu họ đã từng giải được Problem đó hay chưa. Việc suy luận trạng thái đã giải từ lịch sử là
  điều được cho phép, nhưng nguồn chân lý của tiến độ vẫn là Learning.
- **SUB-003-FR-017 — Dữ liệu cũ vẫn đọc được:** Một bản ghi thuộc về một Problem đã bị dỡ khỏi
  danh sách công khai, hoặc thuộc về một Problem đã thay đổi, MUST vẫn đọc được trong lịch sử. Lịch
  sử MUST NOT phụ thuộc vào việc Problem còn tồn tại.
- **SUB-003-FR-018 — Không phụ thuộc Learning khi đọc:** Việc đọc lịch sử MUST được phục vụ hoàn toàn từ
  dữ liệu Submission đã lưu. Lịch sử MUST NOT phụ thuộc vào việc Learning còn sẵn sàng.
- **SUB-003-FR-019 — Hiệu lực access token:** Tài khoản bị khoá không nhận token mới; access token đã
  phát vẫn dùng được tới khi hết hạn theo hành vi đã Approved trong
  [ID-001](../../01-identity/authentication/spec.md).
- **SUB-003-FR-020 — Bản ghi của người khác:** Khi tra cứu một định danh công khai không thuộc sở hữu
  của người gọi, Submission MUST từ chối, và phản hồi từ chối MUST không tiết lộ rằng bản ghi đó tồn
  tại.

## Quy tắc nghiệp vụ

### Phạm vi lịch sử

| Loại bản ghi       | Có trong lịch sử mặc định | Ghi chú                                              |
| ------------------ | ------------------------- | ---------------------------------------------------- |
| Nộp bài chính thức | Có                        | Có thể sinh `submission.accepted` khi được chấp nhận |
| Run                | Có                        | Chỉ để thử nghiệm; không bao giờ sinh tiến độ        |

- Lịch sử của một người học là hợp nhất của cả hai loại, vì người học cần thấy những gì mình đã
  làm với một Problem, kể cả những lần thử chưa chính thức.
- Việc một lời giải Run xuất hiện cạnh một lời giải nộp bài chính thức trong cùng danh sách MUST
  được phân biệt rõ bằng trường loại, để người học không nhầm một lần thử với một lần nộp.
- Bộ lọc `kind=SUBMIT` cho phép xem riêng lịch sử nộp bài chính thức.

### Trường dữ liệu trong lịch sử và chi tiết

| Nhóm          | Trường                                                                             | Lịch sử              | Chi tiết |
| ------------- | ---------------------------------------------------------------------------------- | -------------------- | -------- |
| Định danh     | Định danh công khai của bản ghi                                                    | Có                   | Có       |
| Phân loại     | Loại bản ghi: nộp bài chính thức hay Run                                           | Có                   | Có       |
| Bài toán      | Định danh Problem, và tiêu đề hiển thị nếu có                                      | Có                   | Có       |
| Mã nguồn      | Ngôn ngữ, kích thước mã nguồn, và nội dung mã nguồn                                | Ngôn ngữ, kích thước | Có       |
| Kết quả       | Trạng thái, điểm, số Test Case đạt, tổng số Test Case, thời gian chạy, bộ nhớ dùng | Có                   | Có       |
| Chẩn đoán     | Thông báo lỗi biên dịch, thông báo lỗi runtime, thông tin chẩn đoán lỗi biên dịch  | Không                | Có       |
| Output thô    | `stdout` và `stderr` của Run; không bao giờ của Submit                             | Không                | Chỉ Run  |
| Dữ liệu judge | Test Case, kết quả mong đợi, harness, lệnh biên dịch, tham số sandbox              | Không                | Không    |

- Việc loại bỏ `stdout` và `stderr` của Submit là quyết định về **quyền xem**, không phải lưu trữ;
  Run trả output thô cho chủ sở hữu trong chi tiết.
- Tiêu đề Problem trong lịch sử là dữ liệu trình bày. Nó phải chịu được việc Problem đổi tiêu đề,
  và việc Learning không còn sẵn sàng. Vì vậy lịch sử phải tồn tại được mà không cần gọi Learning.
- Mã nguồn chỉ xuất hiện trong chi tiết. Danh sách không cần mã nguồn và không nên trả vì nó làm phản
  hồi nặng lên mà không có giá trị cho thao tác lật trang.

### Phân trang

- Phân trang dựa trên `createdAt` giảm dần, kèm `publicId` giảm dần làm khoá phá vỡ thứ tự.
- Phản hồi phải chứa: các bản ghi của trang hiện tại, mốc thời gian của bản ghi cuối trang, tổng số
  bản ghi khớp bộ lọc, và khoá phá vỡ thứ tự của bản ghi cuối trang khi có trang kế tiếp.
- Mốc thời gian và khoá phá vỡ thứ tự phải dùng chung một cặp. Dùng riêng rẽ chúng sẽ bỏ sót hoặc
  lặp bản ghi khi nhiều bản ghi trùng thời điểm.
- Tổng số bản ghi khớp bộ lọc MUST là số chính xác; kích thước trang mặc định 20, tối đa 100.
  V1 chỉ lọc `kind` và `problemId`, không lọc trạng thái hay mốc thời gian.

### Nhất quán với SUB-002

- Lịch sử phản ánh trạng thái đã lưu, nên nó thay đổi theo khi Judge trả kết quả. Lịch sử không cần
  truy vấn Judge và không được tự tính kết quả.
- Một bản ghi `INTERNAL_ERROR` hiện trong lịch sử như một bản ghi đã hoàn tất. Việc đánh dấu một
  bản ghi là "lỗi hệ thống" trong khung hiển thị chỉ là nhãn trình bày, và MUST NOT làm cho nó biến
  mất khỏi lịch sử.
- Vì SUB-002 chưa quyết định về trạng thái trung gian, lịch sử phải coi mọi trạng thái không phải
  trạng thái cuối cùng là bản ghi chưa có kết quả cuối cùng. Khi SUB-002 chốt thêm trạng thái, lịch sử
  phải cập nhật theo mà không cần thay đổi hợp đồng.

## Quy tắc phân quyền

- Lịch sử và chi tiết là tài nguyên riêng tư. Người gọi thiếu hoặc sai access token MUST bị từ chối
  với `401`.
- Mọi vai trò đã xác thực MAY xem lịch sử của chính mình trong phiên bản này; không cần quyền
  `submission:history:read` riêng.
- Một người học MUST NOT đọc bản ghi của người khác, kể cả khi biết định danh công khai của bản
  ghi đó.
- Một người học MUST NOT đọc lịch sử của những người dùng khác qua bộ lọc, tham số phân trang, hay
  tham số truy vấn tuỳ ý. Tập bản ghi trả về luôn bị giới hạn bởi sở hữu lấy từ ngữ cảnh tin
  cậy.
- Giảng viên xem lời giải của sinh viên, và `ADMIN` xem lịch sử người khác, nằm ngoài SUB-003. Xem
  [`specs/00-system/roles-permissions.md`](../../00-system/roles-permissions.md) để biết
  `STUDENT` là vai trò duy nhất được mô tả với nội dung học tập ở đây.
- Gateway kiểm tra route ở mức thô. Submission MUST thực hiện kiểm tra ngữ cảnh tin cậy, quyền và
  sở hữu tại một ranh giới backend tin cậy.
- Submission MUST suy ra danh tính người gọi từ ngữ cảnh Gateway/service đã được xác minh. Body,
  query, route hay header do client gửi MUST NOT thiết lập chủ sở hữu, vai trò hay quyền.

## Đầu vào

Các route dưới đây là thao tác ở mức khái niệm, không phải thiết kế controller cuối cùng. Cách đặt
tên chính xác và hình dạng DTO thuộc về `plan.md`.

### Liệt kê lịch sử

Yêu cầu ngữ cảnh người gọi đã xác thực và tin cậy, và chấp nhận tùy chọn:

- bộ lọc theo Problem;
- bộ lọc theo loại bản ghi; và
- con trỏ phân trang gồm mốc thời gian và khoá phá vỡ thứ tự, cùng kích thước trang.

Nó MUST NOT chấp nhận chủ sở hữu, vai trò, quyền, hay bất kỳ tham số nào có thể mở rộng tập bản
ghi ra ngoài phạm vi sở hữu của người gọi.

### Đọc chi tiết một bản ghi

Yêu cầu ngữ cảnh người gọi đã xác thực và tin cậy, cùng định danh công khai của bản ghi. Nó MUST
NOT chấp nhận trường cần thiết lập sở hữu hay quyền.

## Đầu ra

- Liệt kê lịch sử trả về một trang bản ghi cùng tổng số bản ghi khớp bộ lọc và thông tin điều
  hướng để lấy trang kế tiếp.
- Chi tiết bản ghi trả về toàn bộ trường trong nhóm "Chi tiết" của bảng ở mục Quy tắc nghiệp vụ.
- Cả hai phản hồi MUST NOT chứa `stdout` hay `stderr` của Submit, và MUST NOT chứa Test Case,
  kết quả mong đợi, harness, lệnh biên dịch hay tham số sandbox.
- Phản hồi lỗi MUST tuân theo quy ước lỗi chuẩn hoá hiện có, không kèm chi tiết xuyên service.

## Tình huống lỗi

| Trường hợp                                                    | Hành vi quan sát được                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Thiếu hoặc sai access token                                   | `401`                                                                       |
| Token đã hết hạn sau khi tài khoản bị khoá                    | `401`; token còn hạn tiếp tục hiệu lực theo ID-001                          |
| Bộ lọc theo Problem không hợp lệ về mặc hình thức             | Lỗi kiểm tra dữ liệu                                                        |
| Loại bản ghi không thuộc tập hợp được chấp nhận               | Lỗi kiểm tra dữ liệu; không bỏ qua bộ lọc một cách âm thầm                  |
| Con trỏ phân trang không hợp lệ về mặt hình thức              | Lỗi kiểm tra dữ liệu; không âm thầm trả trang đầu                           |
| Kích thước trang vượt giới hạn cho phép                       | Lỗi kiểm tra dữ liệu; không trả trang vượt 100 bản ghi                      |
| Người học chưa có bản ghi nào                                 | Danh sách rỗng với tổng số bằng 0, không phải lỗi                           |
| Tra cứu định danh công khai không tồn tại                     | Lỗi không tìm thấy, không tiết lộ nội bộ lưu trữ                            |
| Tra cứu định danh công khai thuộc về người khác               | Bị từ chối, không lộ sự tồn tại của bản ghi                                 |
| Cố truyền chủ sở hữu, vai trò hay quyền trong tham số         | Tham số bị từ chối, không thay đổi phạm vi trả về                           |
| Bản ghi chưa có phán quyết cuối cùng                          | Trạng thái hiện tại và các trường kết quả ở dạng chưa có, không phải số 0   |
| Bản ghi `INTERNAL_ERROR`                                      | Vẫn xuất hiện trong lịch sử, với nhãn là lỗi hệ thống chứ không phải lỗi mã |
| Problem đã bị gỡ khỏi danh sách công khai hoặc đã thay đổi    | Bản ghi vẫn đọc được, kết quả không thay đổi                                |
| Learning không sẵn sàng khi người học mở lịch sử              | Lịch sử vẫn đọc được vì phục vụ từ dữ liệu Submission                       |
| Yêu cầu cần dữ liệu mà Redis đang giữ và Redis không sẵn sàng | Lịch sử vẫn đọc được vì PostgreSQL là nguồn chân lý                         |
| Cố xoá hoặc sửa một bản ghi qua lịch sử                       | Thao tác không tồn tại trong phạm vi SUB-003; dữ liệu giữ nguyên            |

SUB-003 không đưa ra cấu trúc lỗi mới. Tuần tự hoá ở tầng truyền tải tuân theo quy ước
Gateway/Submission/NestJS hiện có.

## Tình huống biên

- Người học có hàng nghìn bản ghi. Danh sách vẫn phải phân trang và phản hồi phải giữ được kích
  thước đã phê duyệt, vì vậy phản hồi không bao giờ chứa toàn bộ bản ghi.
- Người học lật trang trong lúc vẫn đang nộp bài. Cặp mốc thời gian và khoá phá vỡ thứ tự phải bảo
  đảm bản ghi mới không làm bản ghi cũ bị bỏ sót hay lặp lại giữa hai lần tải trang.
- Nhiều bản ghi được tạo trong cùng một mốc thời gian. Thứ tự phải vẫn xác định, nếu không một bản
  ghi có thể bị lặp hoặc bỏ sót giữa các trang.
- Một người học đã từng giải được một Problem, rồi nộp thêm một lời giải sai. Lịch sử vẫn phải hiện
  cả hai, và chỉ một trong chúng có ý nghĩa với tiến độ.
- Một người học chỉ từng chạy Run mà chưa nộp bài chính thức. Lịch sử vẫn phải hiện các bản ghi đó
  vì chúng là lịch sử hành vi của họ.
- Một người học thử đoán định danh công khai của bản ghi người khác. Yêu cầu bị từ chối mà không
  lộ bản ghi đó tồn tại.
- Hai người học khác nhau có thể có cùng một bộ lọc và cùng một con trỏ phân trang. Tập bản ghi
  trả về vẫn khác nhau, vì sở hữu được áp dụng trước khi lọc và phân trang.
- Một Problem bị gỡ khỏi danh sách công khai trong khi người học đang xem lịch sử. Bản ghi vẫn đọc
  được, và tiêu đề hiển thị là giá trị đã lưu chứ không phải giá trị phải tra cập nhật.
- Điểm `null` nghĩa là Judge chưa báo điểm hoặc bản ghi chưa có kết quả; 0 chỉ hiển thị khi Judge
  thực sự báo 0. Trạng thái phân biệt hai trường hợp `null` đó.
- Một bản ghi rất dài về mặt kích thước. Kích thước mã nguồn phải hiện trong danh sách mà không cần
  tải nội dung mã nguồn.

## Yêu cầu bảo mật

- **SUB-003-SR-001 — Chỉ chủ sở hữu ở phía server:** Submission MUST lọc theo chủ sở hữu lấy từ ngữ
  cảnh tin cậy tại một ranh giới backend tin cậy. Lọc ở giao diện người dùng không phải biện pháp
  kiểm soát bảo mật.
- **SUB-003-SR-002 — Không tham số vượt phạm vi sở hữu:** Bộ lọc, tham số phân trang và tham số truy
  vấn MUST NOT có khả năng mở rộng tập bản ghi ra ngoài sở hữu của người gọi.
- **SUB-003-SR-003 — Không lộ sự tồn tại:** Phản hồi khi định danh không thuộc sở hữu MUST không cho
  phép phân biệt giữa "không tồn tại" và "thuộc về người khác".
- **SUB-003-SR-004 — Không rò rỉ dữ liệu judge ẩn:** Test Case, kết quả mong đợi, harness, lời giải
  nội bộ, lệnh biên dịch, tham số Docker và cấu hình sandbox MUST NOT xuất hiện trong phản hồi
  lịch sử, phản hồi chi tiết, log, thông báo lỗi hay ví dụ Swagger.
- **SUB-003-SR-005 — Kiểm soát output thô:** `stdout` và `stderr` từ Test Case ẩn MUST NOT được trả
  về cho người học. Output thô của Run MAY trả ở chi tiết vì không có Test Case ẩn; output của
  Submit MUST NOT trả dù được lưu.
- **SUB-003-SR-006 — Giới hạn chẩn đoán:** Thông báo lỗi biên dịch và thông báo lỗi runtime trả về
  MUST được giới hạn trong khuôn khung lỗi do Judge cung cấp, và MUST NOT chứa dữ liệu judge ẩn.
  Nội dung lỗi phải thuộc quyền xem của người học, vì nó mô tả lỗi trong mã của chính họ.
- **SUB-003-SR-007 — Nội dung không tin cậy trong phản hồi:** Tiêu đề Problem, thông báo lỗi và mã
  nguồn là nội dung không tin cậy. Chúng MUST được hiển thị dưới dạng dữ liệu, không được diễn giải
  làm mã thực thi, và việc lọc thông tin nhạy cảm trong thông báo lỗi phải do Judge đảm bảo.
- **SUB-003-SR-008 — Danh sách cho phép ở đầu ra:** Phản hồi lịch sử và chi tiết MUST được ánh xạ
  tường minh theo danh sách trường đã phê duyệt trong mục Quy tắc nghiệp vụ, và MUST NOT phụ thuộc
  vào việc chọn cột của cơ sở dữ liệu để tự động loại bỏ trường nhạy cảm.
- **SUB-003-SR-009 — Ghi log an toàn:** Header xác thực, bí mật của service và toàn bộ mã nguồn của
  người học MUST NOT được ghi vào log. Số liệu thống kê về lịch sử MAY được ghi.
- **SUB-003-SR-010 — Phân trang chống tràn tài nguyên:** Phản hồi lịch sử MUST có giới hạn kích
  thước trang và giới hạn kích thước nội dung trả về, kể cả khi người gọi cố yêu cầu trang rất lớn.
- **SUB-003-SR-011 — Tác động tới tiến độ:** Lịch sử là chế độ chỉ đọc. Nó MUST NOT phát sự kiện tiến
  độ, MUST NOT gọi API cập nhật tiến độ của Learning, và việc người học xem lại lịch sử MUST NOT
  làm thay đổi tiến độ.
- **SUB-003-SR-012 — Tài khoản bị khoá:** Quyền đọc lịch sử tuân theo access token còn hạn của
  ID-001; khóa tài khoản không thu hồi token đã phát. Không xoá dữ liệu nộp bài.
- **SUB-003-SR-013 — Không dựa vào Redis:** Lịch sử MUST được phục vụ từ PostgreSQL. Redis không
  được dùng làm nguồn chân lý cho lịch sử, và việc Redis không sẵn sàng không được làm hỏng việc đọc
  lịch sử.

## Tiêu chí nghiệm thu

- **SUB-003-AC-001:** Cho trước một người học đã xác thực có nhiều bản ghi, khi họ mở lịch sử không bộ
  lọc, thì chỉ bản ghi của chính họ được trả về, mỗi bản ghi nêu rõ loại nộp bài chính thức hay Run,
  và danh sách được phân trang.
- **SUB-003-AC-002:** Cho trước một người học đã xác thực, khi họ lọc theo Problem hoặc theo loại bản
  ghi, thì tập bản ghi trả về thuộc đúng bộ lọc và vẫn giới hạn trong sở hữu của họ.
- **SUB-003-AC-003:** Cho trước tập bản ghi lớn hơn một trang, khi người học lật qua các trang, thì
  không có bản ghi nào bị lặp hoặc bị bỏ sót giữa các trang của cùng một bộ lọc.
- **SUB-003-AC-004:** Cho trước nhiều bản ghi trùng thời điểm tạo, khi phân trang, thì thứ tự vẫn xác
  định và ổn định, và không có bản ghi nào bị lặp hoặc bị bỏ sót.
- **SUB-003-AC-005:** Cho trước một người học đang lật trang trong lúc nộp bài mới, khi họ tải trang kế
  tiếp, thì bản ghi mới không làm bản ghi cũ bị bỏ sót hoặc lặp lại.
- **SUB-003-AC-006:** Cho trước một yêu cầu lịch sử thiếu hoặc có access token không hợp lệ, khi yêu
  cầu được kiểm tra, thì nó nhận `401` và không trả về bản ghi nào.
- **SUB-003-AC-007:** Cho trước một bản ghi thuộc sở hữu của người học, khi họ mở chi tiết, thì trạng
  thái, loại, ngôn ngữ, Problem, điểm, số Test Case đạt trên tổng số, thời gian chạy, bộ nhớ, mốc
  thời gian, thông báo lỗi và nội dung mã nguồn đều có mặt.
- **SUB-003-AC-008:** Cho trước một bản ghi thuộc sở hữu của người học, khi họ mở chi tiết, thì phản
  hồi không chứa `stdout` hay `stderr` từ Test Case ẩn, Test Case, kết quả mong đợi, harness, lệnh
  biên dịch hay tham số sandbox.
- **SUB-003-AC-009:** Cho trước một yêu cầu lịch sử hoặc chi tiết cố truyền chủ sở hữu, vai trò hay quyền,
  khi kiểm tra dữ liệu chạy, thì các trường đó bị từ chối và không thay đổi phạm vi trả về.
- **SUB-003-AC-010:** Cho trước một bản ghi chưa có phán quyết cuối cùng, khi chi tiết được đọc, thì các
  trường kết quả ở dạng chưa có chứ không phải giá trị số 0 như một kết quả thật.
- **SUB-003-AC-011:** Cho trước một bản ghi `INTERNAL_ERROR`, khi lịch sử được đọc, thì bản ghi vẫn xu
  hiện với nhãn là lỗi hệ thống, và việc hiển thị nó không phát ra sự kiện tiến độ nào.
- **SUB-003-AC-012:** Cho trước một định danh công khai thuộc về bản ghi của người khác, khi người học
  thử mở chi tiết, thì yêu cầu bị từ chối với phản hồi không cho phép phân biệt với trường hợp
  không tồn tại.
- **SUB-003-AC-013:** Cho trước một yêu cầu lịch sử cố thiết lập chủ sở hữu hoặc quyền trong bộ lọc hay
  tham số phân trang, khi kiểm tra, thì không thể thu được bản ghi ngoài phạm vi sở hữu của người
  gọi.
- **SUB-003-AC-014:** Cho trước một bản ghi thuộc về một Problem đã bị gỡ khỏi danh sách công khai,
  khi người học mở chi tiết, thì bản ghi vẫn đọc được và kết quả không thay đổi.
- **SUB-003-AC-015:** Cho trước hành vi đọc lịch sử, khi Redis không sẵn sàng, thì lịch sử vẫn đọc được
  vì phục vụ từ PostgreSQL.
- **SUB-003-AC-016:** Cho trước một người học xem lại một Problem đã từng giải được, khi họ mở lịch sử
  của Problem đó, thì bản ghi tương ứng có mặt, nhưng việc suy luận trạng thái đã giải từ lịch sử
  không thay thế nguồn tiến độ của Learning.
- **SUB-003-AC-017:** Cho trước một tài khoản bị khoá, khi token cũ còn hạn được dùng để mở lịch sử,
  thì hành vi tuân theo ID-001; sau khi token hết hạn, yêu cầu bị từ chối và dữ liệu không bị xoá.
- **SUB-003-AC-018:** Cho trước một yêu cầu lịch sử với kích thước trang vượt giới hạn, khi kiểm tra,
  thì yêu cầu bị từ chối và không có phản hồi trang vượt 100 bản ghi.
- **SUB-003-AC-019:** Cho trước hành vi lịch sử, khi thực thi được kiểm tra, thì Submission không gọi
  API cập nhật tiến độ của Learning, không phát sự kiện tiến độ, và không phụ thuộc vào việc Learning
  còn sẵn sàng.
- **SUB-003-AC-020:** Cho trước một yêu cầu cố sửa hoặc xoá một bản ghi qua lịch sử, khi kiểm tra, thì
  thao tác đó không tồn tại trong phạm vi SUB-003 và dữ liệu bản ghi giữ nguyên.
- **SUB-003-AC-021:** Cho trước một Run thuộc sở hữu của người học, khi mở chi tiết, thì họ xem được
  `stdout`/`stderr` của Run; cùng thao tác với Submit không trả output thô.

## Ngoài phạm vi

- Chạy thử mã và lịch sử chạy thử; chúng thuộc [SUB-001](../run-code/spec.md). SUB-003 chỉ
  biểu diễn bản ghi Run.
- Nộp bài chính thức, vòng đời nộp bài và phát sự kiện tiến độ; chúng thuộc
  [SUB-002](../submit-code/spec.md). SUB-003 chỉ đọc bản ghi đã có.
- Hợp đồng realtime và cơ chế phát tới Gateway; chúng thuộc
  [SUB-004](../realtime-result/spec.md)
- Chấm điểm Assignment, `maxScore`, hạn chót và bảng điểm; chúng thuộc đặc tả Assignment trong
  tương lai của Learning
- Trạng thái tiến độ học tập; nguồn chân lý là tiến độ của Learning, được cập nhật qua
  `submission.accepted` do SUB-002 phát
- Lịch sử nộp bài ở cấp khóa học, lớp, Assignment hay Problem đối với giảng viên
- Xem lời giải của sinh viên bởi giảng viên, chấm điểm thủ công, nhận xét và phản hồi của giảng viên
- Quyền quản trị đọc lịch sử của người dùng khác
- Xoá bản ghi nộp bài, sửa bản ghi nộp bài, rút lại bản ghi nộp bài, và xoá tài khoản kèm dữ liệu
- Lưu nháp mã nguồn, lịch sử phiên bản của mã nguồn, và đồng bộ mã giữa các thiết bị
- Xuất dữ liệu lịch sử ra tệp, và báo cáo tổng hợp
- Xếp hạng, bảng xếp hạng và so sánh lời giải giữa những người học khác nhau
- Bất kỳ microservice Lịch sử nộp bài riêng nào; lịch sử thuộc Submission

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
- [Chiến lược giao tiếp](../../00-system/communication.md)
- [Bảo mật Judge](../../00-system/judge-security.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [ID-001 Authentication](../../01-identity/authentication/spec.md) cho hành vi theo trạng thái tài khoản và
  ngữ cảnh Gateway tin cậy.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) cho mặc-định-từ-chối và quy ước đặt tên quyền
  `resource:action`.
- [LRN-001 Quản lý Problem](../../02-learning/problems/spec.md) cho vòng đời Problem và ranh giới
  dữ liệu tin cậy.
- [SUB-001 Run Code](../run-code/spec.md) cho hình dạng bản ghi Run.
- [SUB-002 Submit Code](../submit-code/spec.md) cho vòng đời, trạng thái và trường kết quả của bản ghi
  nộp bài chính thức.
- [SUB-004 Realtime Result](../realtime-result/spec.md) để đảm bảo lịch sử không phụ thuộc realtime.
- Đặc tả Test Case trong tương lai của Learning, cho tổng số Test Case và trọng số.

## Quyết định đã phê duyệt

Lịch sử mặc định gồm Run và Submit, phân trang cursor `createdAt + publicId`, trang 20 tối đa 100,
tổng số chính xác, chỉ lọc `kind`/`problemId`. Điểm thiếu là `null`; chỉ chi tiết Run trả output thô.
Mọi vai trò đã xác thực chỉ xem lịch sử của chính mình. Không lọc trạng thái/thời gian, không tự
xoá, không attempt number. Tiêu đề Problem không được snapshot trong v1 và có thể là `null`;
lịch sử không gọi Learning. ID công khai tách khoá chính, với alias đọc ID cũ có kiểm tra sở hữu.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review        | Tóm tắt                                              |
| ---------- | --------- | --------------------------- | ---------------------------------------------------- |
| 2026-09-29 | 0.1       | Codex / TBD                 | Đặc tả Lịch sử nộp bài ban đầu ở trạng thái Proposed |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm / Codex | Phê duyệt lịch sử, public ID và chính sách output    |

> `spec.md` mô tả CÁI GÌ. Controller, DTO, entity, aggregate, repository, migration, hình dạng
> lưu trữ, hợp đồng message và thứ tự thực thi thuộc về `plan.md`.
