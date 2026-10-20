# SUB-004 Kế hoạch triển khai

## Trạng thái

**Approved — 2026-09-30, chủ sở hữu sản phẩm phê duyệt trong hội thoại.** Đây là kế hoạch triển
khai tương lai; chưa có task mã nguồn nào được thực hiện.

## Đặc tả liên quan

- [`./spec.md`](./spec.md) — SUB-004 Kết quả realtime (Realtime Result), phiên bản 1.0,
  ngày 2026-09-30
- Trạng thái spec dùng cho kế hoạch: **`Approved`**
- Cùng nhóm: [`../run-code/spec.md`](../run-code/spec.md),
  [`../submit-code/spec.md`](../submit-code/spec.md),
  [`../submission-history/spec.md`](../submission-history/spec.md)

## Service đích

| Service         | Phần việc                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------ |
| **Submission**  | Phát thông báo tối thiểu cho chủ sở hữu qua Redis sau khi kết quả đã lưu                         |
| **API Gateway** | Sở hữu phía client của kênh đẩy: xác thực khi mở kênh, chuyển thông báo tới đúng kênh, đóng kênh |

Hai service cùng tham gia, nhưng vai trò khác nhau và không đổi:

- Submission **không** mở kết nối tới trình duyệt và **không** mở socket.
- Gateway **không** sở hữu kết quả và **không** lưu trữ gì.

`specs/00-system/service-boundaries.md` và
[`specs/00-system/communication.md`](../../00-system/communication.md) đã chốt một chiều cho
tin realtime. Kế hoạch này không thay đổi quyết định đó.

## Kiến trúc service bắt buộc

| Service         | Kiến trúc bắt buộc                                                          |
| --------------- | --------------------------------------------------------------------------- |
| **Submission**  | Clean Architecture + Event-Driven Architecture                              |
| **API Gateway** | Gateway Pattern + Layered Architecture; không được sở hữu lưu trữ nghiệp vụ |

Với Submission, phần realtime là một port ở tầng application, không phải một kiến trúc riêng. Port đã
được `submission-service.md` liệt kê là `realtime port`.

Với Gateway, ranh giới Gateway Pattern đặt ở chỗ Gateway là cửa duy nhất mà client tiếp cận. Kênh
realtime không phải persistence, nên nó không vi phạm quy tắc "Gateway không sở hữu lưu trữ nghiệp vụ".

## Ảnh hưởng tới mã nguồn hiện có

### Submission

| Tệp hiện có                        | Vấn đề                                                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `submission-realtime.publisher.ts` | Phát **toàn bộ `JudgeResult`** gồm `stdout`, `stderr`, `compileOutput`, `error` xuống Redis                        |
| `submission-realtime.publisher.ts` | Ghi thêm một khóa Redis `submission:result:<id>` TTL 300 giây chứa toàn bộ kết quả. **Không nơi nào đọc khóa này** |
| `submission-realtime.publisher.ts` | Không có xử lý lỗi: lỗi Redis sẽ ném ra và làm hỏng use case áp dụng kết quả                                       |
| `judge-result.consumer.ts`         | Gọi `realtime.emitResult(userId, result)` truyền `JudgeResult` thô                                                 |

### Gateway

| Tệp hiện có                               | Vấn đề                                                                                                    |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `realtime/submission-realtime.gateway.ts` | Chuyển thẳng payload nhận được xuống client, nên mọi trường của `JudgeResult` lọt xuống trình duyệt       |
| `realtime/submission-realtime.gateway.ts` | Xác thực token lúc kết nối, và `join` vào phòng `user:<sub>`; phần này đúng và giữ nguyên                 |
| `realtime/submission-realtime.gateway.ts` | Không có giới hạn số kết nối, không có thời gian sống kết nối, không có kiểm tra token hết hạn sau khi mở |

### Hệ quả bảo mật cần xử lý trước

Kết hợp hai vấn đề trên: `stdout` và `stderr` sinh ra từ **Test Case ẩn** của một Problem được
lưu trong `JudgeResult`, được ghi vào Redis, và được Gateway chuyển thẳng xuống trình duyệt của người
học. Đây là đường rò rỉ dữ liệu ẩn **đang tồn tại trong mã hiện tại**, vi phạm
`specs/00-system/judge-security.md` và SUB-004-FR-005. Việc sửa phải nằm trong phạm vi tính năng
này, vì đây là nơi duy nhất đường đi đó được định nghĩa.

Hành vi phải giữ tương thích:

- Tên namespace `/submissions` và tên sự kiện `submission.result` phía client. Tương thích ở đây
  được hiểu là giữ **hình dạng thông báo tối thiểu** mà client dùng để làm mới, không phải giữ các
  trường thừa. Nếu client hiện đang đọc `stdout` từ thông báo, việc bỏ trường đó là một thay đổi phá
  vỡ phải được nêu với frontend, và nằm ngoài phạm vi backend này.
- Gateway xác thực token khi kết nối và `join` vào phòng theo người dùng.

## Thay đổi ở tầng domain

Không thay đổi aggregate và không thêm quy tắc miền mới. Realtime không mang ý nghĩa nghiệp vụ; nó
chỉ báo rằng có dữ liệu mới để đọc.

Thứ mà domain **không** được biết: rằng có Redis, có Gateway, có socket, và rằng thông báo có thể bị
mất. Tính chất best-effort là một quyết định vận hành, nằm ở adapter, không phải ở domain.

## Tầng application / Use case

Không tạo use case mới. Cả ba luồng nguồn — Run, Submit, và cả kết quả của Run — đều dùng chung một
điểm phát, và điểm phát đó đã nằm trong `ApplyJudgeResultUseCase` của SUB-002.

`RealtimePort` có đúng một phương thức:

```text
publishResult(ownerId: string, notification: SubmissionResultNotification): Promise<void>
```

`SubmissionResultNotification` là một kiểu hợp đồng, không phải entity miền, nên nó nằm ở
[`libs/contracts/src/submission.contracts.ts`](../../../libs/contracts/src/submission.contracts.ts):

| Trường         | Bắt buộc | Nguồn                                      |
| -------------- | -------- | ------------------------------------------ |
| `submissionId` | Có       | `publicId` của bản ghi, không phải khoá DB |
| `kind`         | Có       | Loại bản ghi, để phân biệt Run với Submit  |
| `status`       | Có       | Trạng thái cuối cùng đã lưu                |
| `ready`        | Có       | Hằng `true`: chi tiết đã đọc được          |

Đó là toàn bộ nội dung được phép đi trong một thông báo. Không `stdout`, không `stderr`, không
`compileOutput`, không `error`, không điểm số hay output. Hợp đồng tối thiểu đã chốt trong SUB-004.

Bọc trong thông báo Redis, Gateway cần thêm một trường định tuyến: `userId` của chủ sở hữu kênh.
`SubmissionRealtimeEnvelope` gồm `userId` và `notification`.

## Lưu trữ

- Không có thay đổi PostgreSQL cho tính năng này.
- **Xoá** lệnh `redis.set` hiện tại. Khóa `submission:result:<id>` không có nơi nào đọc, nên nó chỉ
  tồn tại để lưu dữ liệu ẩn không cần thiết trong Redis với TTL 300 giây.
- Không tạo cơ chế lưu thông báo chưa gửi. Việc đó sẽ biến best-effort thành có bảo đảm giao, và
  [`specs/00-system/communication.md`](../../00-system/communication.md) chưa phê duyệt điều đó.
  Polling của SUB-003 là cơ chế bảo đảm duy nhất.

## Thay đổi cơ sở dữ liệu

N/A. Không có bảng, cột hay index nào thay đổi.

## Migration

N/A. Không có migration cho tính năng này.

## API

Không có route HTTP mới. Realtime đi qua kênh đẩy, không đi qua REST.

Điểm cần nói rõ: Gateway **không** có HTTP route nào để đăng ký kênh. Kênh thiết lập bằng giao thức đẩy
mà Gateway phục vụ. Đây là hành vi sẵn có, và `spec.md` không yêu cầu thay đổi.

### Hợp đồng kênh

Phía client, tương đối tới Gateway:

| Mục                | Hành vi                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Xác thực           | Bắt buộc, dùng access token. Thiếu hoặc sai token thì không thiết lập kênh       |
| Tham số chủ sở hữu | Không nhận. Danh tính lấy từ token đã xác minh. Tham số do client gửi bị từ chối |
| Sự kiện nhận về    | Tên `submission.result`, nội dung là `SubmissionResultNotification`              |
| Truyền thông       | Socket.IO namespace `/submissions` qua Gateway                                   |

Về tham số chủ sở hữu: Gateway hiện chỉ đọc `client.handshake.auth.token`. Để đáp ứng SR-002, bổ
sung kiểm tra và từ chối handshake nếu có tham số chủ sở hữu/vai trò/quyền do client gửi; không
chỉ bỏ qua chúng.

## DTO / Kiểm tra dữ liệu

- `SubmissionResultNotification` là hợp đồng nội bộ giữa Submission và Gateway, nằm trong
  `@app/contracts`. Không phải DTO HTTP.
- Gateway phải **kiểm tra hình thức** thông báo nhận được trước khi chuyển tiếp, thay vì ép kiểu.
  Hiện tại Gateway có `isEnvelope` chỉ kiểm tra `userId` và `result` là object, rồi chuyển nguyên
  `result` xuống client. Kiểm tra đó phải được siết lại theo danh sách trường của hợp đồng mới.
- `kind` và `status` phải thuộc tập giá trị đã biết; giá trị lạ phải bị loại thay vì chuyển tiếp.

## Phân quyền

- Xác thực khi mở kênh thuộc Gateway, dùng cùng cơ chế `GatewayAuthMiddleware` đang xác thực REST:
  access token, kiểu `access`, và có `sub`.
- Kênh `join` vào phòng theo `sub` trong token. Danh tính đó là nguồn duy nhất quyết định kênh nhận
  thông báo nào.
- Khi kết nối, Gateway kiểm tra `exp` và hẹn đóng socket đúng lúc access token hết hạn. ID-001
  không thu hồi access token còn hạn khi logout/khóa tài khoản; không kiểm tra revocation riêng.
- Submission không tham gia quyết định kênh nào nhận thông báo. Nó chỉ phát vào phòng của chủ sở
  hữu bản ghi.
- Không có quyền đọc kênh của người khác. Không thêm quyền theo vai trò.

## Messaging / Sự kiện

- Không có message RabbitMQ nào cho tính năng này.
- Kênh Redis: `REDIS_CHANNELS.submissionResults` giữ nguyên tên hiện có, vì đổi tên sẽ phải sửa cả
  hai service cùng lúc mà không đổi hành vi.
- Nội dung thông báo đổi từ `{ userId, result: JudgeResult }` sang
  `{ userId, notification: SubmissionResultNotification }`. Đây là một **thay đổi phá vỡ hợp đồng**
  và phải triển khai cùng đợt ở cả hai service.

## Realtime

Phần lớn công việc của tính năng nằm ở đây.

### Phía Submission

`RedisRealtimeAdapter` thực hiện đúng ba việc:

1. Kết nối Redis nếu chưa kết nối.
2. `publish` một thông báo gồm `userId` và `notification`.
3. Nuốt lỗi và ghi log `warn` với tối đa một dòng cảnh báo lặp lại, để tránh spam khi Redis hỏng kéo
   dài.

Điểm quan trọng: **lỗi phát không được ném ra khỏi use case áp dụng kết quả**. Hiện tại
`emitResult` không bắt lỗi, nên Redis hỏng sẽ làm hỏng cả việc xử lý kết quả. Sửa điều này là điều
kiện để đạt SUB-004-AC-006 và SUB-001-AC-012.

### Phía Gateway

1. Xác thực token khi kết nối; `join` vào phòng theo `sub`.
2. Đăng ký `message` trên `REDIS_CHANNELS.submissionResults` và xử lý khi Redis sẵn sàng.
3. Với mỗi thông báo: kiểm tra hình thức, rồi `emit` **chỉ** `notification` xuống phòng `user:<userId>`.
4. Giữ cơ chế log một dòng khi Redis không sẵn sàng, rồi tự thử lại khi kết nối trở lại.

Điểm cần kiểm: hiện tại `onModuleInit` chỉ `subscribe` trong sự kiện `ready`. Nếu kết nối thất bại
ngay từ đầu rồi hồi phục, `ready` vẫn bắn nên đăng ký lại được. Nhưng cần kiểm thử trường hợp
`connect()` thất bại một lần rồi ioredis tự reconnect, để chắc chắn `subscribe` không bị bỏ sót.

### Chống lạm dụng kênh

Gateway dùng Redis lease có TTL và thao tác cấp chỗ nguyên tử để giới hạn 5 socket mỗi `userId`
trên toàn cụm. Gia hạn lease khi socket còn mở, giải phóng lúc disconnect; kết nối thứ sáu bị từ
chối. Redis không sẵn sàng thì từ chối kết nối mới, không ảnh hưởng polling. Socket có thời gian
sống tối đa bằng thời hạn còn lại của access token; không đặt trần độc lập.

## Adapter hạ tầng

| Service     | Adapter                                             |
| ----------- | --------------------------------------------------- |
| Submission  | `RedisRealtimeAdapter` hiện thực `RealtimePort`     |
| API Gateway | `SubmissionRealtimeGateway` giữ vai trò phía client |

Không thêm adapter mới nào. `submission-realtime.publisher.ts` được đổi thành adapter port thay vì là
một provider độc lập không ai gọi qua port.

## Xử lý lỗi

| Tình huống                        | Xử lý                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| Redis không sẵn sàng khi phát     | Nuốt tại adapter, log `warn` một dòng; bản ghi vẫn hoàn tất; polling vẫn cho kết quả |
| Redis không sẵn sàng ở Gateway    | Log `warn` một dòng, tự thử lại khi kết nối trở lại; client vẫn đọc được qua polling |
| Thông báo nhận được sai hình thức | Loại bỏ, log `warn`; không chuyển tiếp sang client                                   |
| Thông báo có trường lạ            | Chỉ chuyển các trường đã phê duyệt; không tuần tự hoá nguyên payload nhận được       |
| Token hết hạn sau khi kênh đã mở  | Timer tại Gateway đóng socket và giải phóng lease                                    |
| Kết nối vượt 5 socket toàn cụm    | Từ chối kết nối thứ sáu; polling vẫn dùng được                                       |

Không thêm cấu trúc lỗi mới theo SUB-004.

## Bảo mật

| Mối đe doã                                | Biện pháp                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Lộ `stdout`/`stderr` của Test Case ẩn** | Thay hợp đồng thông báo bằng `SubmissionResultNotification`; Gateway chuyển tiếp **chỉ** `notification` |
| Lưu dữ liệu ẩn trong Redis                | Xoá lệnh `redis.set` hiện tại; chỉ còn `publish` với nội dung tối thiểu                                 |
| Khách chưa xác thực nhận thông báo        | Xác thực token khi kết nối, từ chối thì ngắt kết nối                                                    |
| Client chọn danh tính khác                | Danh tính chỉ từ token; không đọc tham số chủ sở hữu; có kiểm thử khẳng định                            |
| Chuyển nhầm sang phòng khác               | Chuyển vào phòng lấy từ `userId` trong thông báo, và Gateway chỉ đồng ý với token đã xác minh           |
| Thông báo mang trường ngoài danh sách     | Danh sách cho phép là dương ở cả hai phía; kiểm tra hình thức trước khi chuyển tiếp                     |
| Lộ token trong log                        | Không log token, không log payload thông báo ở mức thông tin                                            |
| Dựa vào realtime để kết luận kết quả      | Kiểm thử chứng minh kết quả tới được khi Redis dừng hoàn toàn                                           |

## Chiến lược kiểm thử

| Mã                     | Kịch bản                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| FR-001, AC-001         | Phát chỉ xảy ra sau khi bản ghi đã lưu; kiểm thử theo thứ tự                                                           |
| FR-004, AC-001         | Nội dung thông báo chỉ gồm public `submissionId`, `kind`, `status`, `ready: true`                                      |
| FR-005, SR-005, AC-002 | Thông báo không chứa `stdout`, `stderr`, `compileOutput`, `error`, Test Case, harness, lệnh biên dịch, tham số sandbox |
| FR-003, AC-003         | Hai người học, một người nộp bài → kênh của người kia không nhận thông báo                                             |
| SR-002, AC-004         | Mở kênh kèm tham số chủ sở hữu/vai trò/quyền → từ chối handshake                                                       |
| SR-001, AC-005         | Mở kênh thiếu hoặc sai token → không có kênh nào được thiết lập                                                        |
| FR-008, AC-006         | Redis dừng hoàn toàn → bản ghi vẫn hoàn tất, vẫn đọc được qua polling                                                  |
| FR-009, FR-010, AC-007 | Không bao giờ mở kênh → vẫn nhận mọi kết quả, kể cả bản ghi hoàn tất trước khi mở trang                                |
| FR-013, AC-008         | Kết nối gián đoạn rồi mở lại → không mất kết quả phát sinh trong lúc gián đoạn                                         |
| FR-007, AC-009         | Giao lại cùng một kết quả → không có thông báo thứ hai                                                                 |
| FR-006, AC-010         | Cả Run và Submit của cùng một người học → mỗi bản ghi một thông báo, phân biệt được bằng `kind`                        |
| FR-015, AC-011         | Token hết hạn sau khi kênh mở → socket đóng, ngừng nhận thông báo                                                      |
| FR-015, AC-012         | Khoá tài khoản không thu hồi access token còn hạn; socket đóng khi token hết hạn                                       |
| SR-010                 | Kết nối thứ sáu trên Gateway khác bị từ chối; Redis lỗi thì từ chối realtime mới                                       |
| FR-009                 | Client polling mỗi 5 giây khi còn chờ và đọc sớm khi có thông báo                                                      |
| FR-014, AC-013         | Nhiều phiên cùng một người học → mọi phiên đều có thể nhận; không phiên nào của người khác                             |
| AC-014                 | Redis phục hồi sau khi hỏng → không có loạt thông báo gộp cho các kết quả phát sinh lúc hỏng                           |
| FR-011, AC-016         | Không nhận thông báo nào → client không kết luận bản ghi chưa xong                                                     |
| AC-015                 | Bản ghi `INTERNAL_ERROR` → thông báo nêu trạng thái lỗi hệ thống, không phải phán quyết lời giải                       |

Kiểm thử AC-006, AC-007 và AC-014 là ba kiểm thử quan trọng nhất, vì chúng chứng minh tính best-effort
không làm mất kết quả.

## Khả năng quan sát

- Submission: log `warn` một dòng khi phát thất bại, có chống spam lặp lại. Không log nội dung thông
  báo vì nó chứa định danh người dùng.
- Gateway: log `warn` một dòng khi Redis không sẵn sàng, và log thông báo phục hồi. Giữ cơ chế chống
  spam hiện có.
- Không log token, và không log payload thông báo ở mức thông tin.
- Không thêm metric mới.

## Thứ tự triển khai

1. Xác nhận Socket.IO và thời hạn access token theo ID-001 trong Gateway hiện có.
2. Thêm `SubmissionResultNotification` và `SubmissionRealtimeEnvelope` vào `@app/contracts`.
3. Viết `RedisRealtimeAdapter` với xử lý lỗi và chống spam, và bỏ lệnh `redis.set`.
4. Đổi `ApplyJudgeResultUseCase` và luồng Run sang truyền `notification` tối thiểu.
5. Đổi Gateway sang kiểm tra hình thức nghiêm và chỉ chuyển tiếp `notification`.
6. Áp dụng giới hạn 5 kết nối toàn cụm bằng Redis lease và đóng socket khi token hết hạn.
7. Viết kiểm thử theo bảng ở mục Chiến lược kiểm thử.
8. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:submission`, `pnpm build:gateway`.

Các bước 2 đến 5 phải triển khai **cùng một đợt** ở cả hai service, vì hợp đồng thông báo đổi và sẽ
hỏng nếu triển khai lệch pha.

## Rủi ro

| Rủi ro                                                                 | Biện pháp giảm thiểu                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `stdout`/`stderr` đang lọt tới trình duyệt qua đường realtime hiện tại | Sửa ở bước 3 đến 5, cùng đợt với đổi hợp đồng                                           |
| Đổi hợp đồng thông báo làm frontend ngừng hiển thị kết quả             | Phải báo frontend trước khi triển khai; nêu rõ ngoài phạm vi backend                    |
| Khóa Redis `submission:result:*` còn sót từ lần triển khai trước       | Xoá lệnh ghi; cân nhắc dọn khóa cũ khi triển khai, có thể bỏ vì TTL 300 giây tự hết hạn |
| Lỗi phát realtime làm hỏng use case áp dụng kết quả                    | Nuốt lỗi tại adapter; có kiểm thử Redis dừng                                            |
| `subscribe` bị bỏ sót khi Redis hồi phục                               | Kiểm thử kịch bản kết nối thất bại lúc khởi động rồi hồi phục                           |
| Kênh hỏng âm thầm và người học không biết                              | Ghi rõ trong hợp đồng rằng polling là bảo đảm; client phải polling luôn                 |
| Kênh còn sống sau khi token hết hạn                                    | Hẹn đóng theo `exp` và kiểm thử timer với token ngắn hạn                                |

## Tuân thủ kiến trúc

- **Chiều phụ thuộc Submission:** `use case → RealtimePort ← RedisRealtimeAdapter`. Domain không biết
  Redis tồn tại.
- **Ranh giới service:** Submission chỉ **phát**. Gateway chỉ **nhận và chuyển tiếp**. Không service nào
  gọi trực tiếp vào service kia ngoài Redis pub/sub, và Redis không phải nguồn chân lý.
- **Gateway Pattern:** Gateway sở hữu phía client; Submission không mở kết nối tới trình duyệt. Gateway
  không lưu trữ kết quả, nên không vi phạm quy tắc không sở hữu persistence nghiệp vụ.
- **Một chiều:** giữ đúng quyết định của `specs/00-system/communication.md`. Không thêm chiều ngược.
- **Nguồn chân lý:** PostgreSQL. Realtime chỉ là thông báo "hãy đọc lại".
- **Không có phần event-driven mới:** tính năng này dùng pub/sub, không phải hàng đợi có ACK.
- **Ngoại lệ đã được phê duyệt:** Không có.

## Quyết định đã chốt

Socket.IO, Redis Pub/Sub best-effort tới các Gateway subscriber đang hoạt động, payload tối thiểu
không điểm/output, polling 5 giây đồng thời, tối đa 5 socket mỗi danh tính toàn cụm, đóng theo
`exp` token; không thu hồi tức thời access token còn hạn theo ID-001. Không còn câu hỏi chặn.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` Approved.
