# SUB-004 Công việc triển khai

## Trạng thái

**Approved — 2026-09-30, chủ sở hữu sản phẩm phê duyệt trong hội thoại. Chưa triển khai.**

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản `1.0` ngày `2026-09-30`, trạng thái `Approved`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved 2026-09-30

Nguồn của yêu cầu này: mẫu [`specs/templates/tasks.template.md`](../../templates/tasks.template.md)
và [`docs/agent/working-agreement.md`](../../../agent/working-agreement.md) bước 1.

Task code vẫn chưa hoàn thành; chỉ bước phê duyệt tài liệu đã được tích.

Đánh dấu các mục không áp dụng là `- [x] N/A — lý do`. Giữ danh sách này đồng bộ với bản triển khai
thực tế; tích một mục nghĩa là mục đó đã hoàn thành và đã được xác minh nếu có liên quan.

## Chuẩn bị

- [ ] Khảo sát mã nguồn hiện có và trạng thái repository.
- [x] Spec và plan Approved; Socket.IO, payload tối thiểu, polling 5 giây, tối đa 5 kênh
      toàn cụm và đóng khi access token hết hạn.
- [x] Ghi kết luận câu hỏi mở trong worked entry phê duyệt SRS.
- [ ] **Báo cho frontend** rằng thông báo sẽ bỏ các trường thừa. Đây là thay đổi phá vỡ hợp đồng.
- [ ] Xác nhận kiến trúc Submission và Gateway trong `docs/architecture/`.
- [ ] Xác nhận `plan.md` khớp với đặc tả sau khi sửa và không mở rộng phạm vi.

## Domain

- [x] N/A — không có quy tắc miền mới. Realtime không mang ý nghĩa nghiệp vụ, chỉ báo rằng có dữ liệu
      mới để đọc.
- [ ] Xác minh tầng domain không import ioredis, không import NestJS và không biết tới Gateway.

## Application

- [ ] Giữ `RealtimePort` với đúng một phương thức `publishResult(ownerId, notification)`.
- [ ] Xác minh `ApplyJudgeResultUseCase` gọi port với `notification` tối thiểu, không phải
      `JudgeResult` thô.
- [ ] Xác minh cả ba luồng nguồn dùng chung một điểm phát, không tạo điểm phát thứ hai.
- [ ] Xác minh lỗi phát realtime **không** làm hỏng use case áp dụng kết quả.

## Infrastructure

- [ ] Chuyển `submission-realtime.publisher.ts` thành adapter hiện thực `RealtimePort`, thay vì
      provider độc lập không ai gọi qua port.
- [ ] Bổ sung kết nối Redis nếu chưa kết nối, trước khi phát.
- [ ] **Xoá lệnh `redis.set` hiện tại.** Khóa `submission:result:<id>` không nơi nào đọc, và nó đang
      lưu dữ liệu ẩn không cần thiết với TTL 300 giây.
- [ ] Nuốt lỗi phát tại adapter, thay vì để lỗi Redis ném ra khỏi use case.
- [ ] Ghi log `warn` một dòng và chống spam lặp lại khi Redis hỏng kéo dài.
- [ ] Không log nội dung thông báo, vì nó chứa định danh người dùng.

## Hợp đồng sự kiện

- [ ] Thêm `SubmissionResultNotification` gồm public `submissionId`, `kind`, `status`, `ready: true`
      vào `@app/contracts`.
- [ ] Thêm `SubmissionRealtimeEnvelope` gồm `userId` và `notification`.
- [ ] Giữ nguyên tên kênh `REDIS_CHANNELS.submissionResults`.
- [ ] Đổi nội dung thông báo từ `{ userId, result: JudgeResult }` sang
      `{ userId, notification: SubmissionResultNotification }`.
- [ ] N/A — không có message RabbitMQ nào cho tính năng này.
- [ ] **Triển khai đổi hợp đồng đồng thợt ở cả Submission và Gateway**, vì triển khai lệch pha sẽ hỏng.

## Lưu trữ

- [x] N/A — tính năng này không thay đổi truy vấn lưu trữ nào. Đọc kết quả vẫn đi qua
      `GetSubmissionDetailUseCase` và `ListSubmissionHistoryUseCase` của `SUB-003`.
- [x] N/A — không có cơ chế lưu thông báo chưa gửi. Việc đó sẽ biến best-effort thành giao có bảo đảm, và
      `specs/00-system/communication.md` chưa phê duyệt. Polling của `SUB-003` là cơ chế bảo đảm duy
      nhất.
- [ ] Xác minh PostgreSQL vẫn là nguồn chân lý; realtime chỉ là thông báo "hãy đọc lại".

## Cơ sở dữ liệu / Migration

- [x] N/A — không có bảng, cột hay index nào thay đổi. PostgreSQL đã lưu đầy đủ kết quả.
- [x] N/A — không có migration cho tính năng này.
- [ ] Cân nhắc dọn khóa Redis `submission:result:*` còn sót. Có thể bỏ vì TTL 300 giây tự hết hạn.

## API

- [x] N/A — không có route HTTP mới. Realtime đi qua kênh đẩy, không đi qua REST.
- [ ] Xác minh Gateway **không** thêm HTTP route nào để đăng ký kênh.
- [ ] Xác minh tên sự kiện phía client là `submission.result`.
- [ ] Cập nhật Swagger nếu tài liệu mô tả kênh đẩy ở mục HTTP.

## API Gateway

- [ ] Siết `isEnvelope` thành kiểm tra danh sách trường cho phép của hợp đồng mới, thay vì ép kiểu rồi
      chuyển nguyên payload.
- [ ] Kiểm tra `kind` và `status` thuộc tập giá trị đã biết; giá trị lạ phải bị loại.
- [ ] Chuyển tiếp **chỉ** `notification` xuống phòng `user:<userId>`, không chuyển `userId` hay trường
      nào ngoài danh sách cho phép.
- [ ] Giữ xác thực token khi kết nối và `join` phòng theo `sub`.
- [ ] Từ chối handshake có tham số chủ sở hữu/vai trò/quyền do client gửi; danh tính chỉ lấy từ token.
- [ ] Áp dụng Redis lease nguyên tử giới hạn 5 kết nối toàn cụm mỗi danh tính; từ chối kết nối
      thứ sáu, giải phóng lease khi disconnect, từ chối kết nối mới khi Redis không sẵn sàng.
- [ ] Đóng socket đúng lúc access token hết hạn theo `exp` và giải phóng lease.
- [ ] Xác minh Gateway không lưu trữ kết quả nghiệp vụ ở bất kỳ đâu.

## Messaging

- [x] N/A — không phát và không tiêu thụ hàng đợi có ACK. Tính năng dùng Redis pub/sub.

## Realtime

- [ ] Xác minh thông báo chỉ phát **sau khi** bản ghi đã lưu và giao dịch đã hoàn tất.
- [ ] Xác minh nội dung thông báo chỉ gồm public `submissionId`, `kind`, `status`, `ready: true`.
- [ ] Xác minh thông báo không chứa `stdout`, `stderr`, `compileOutput`, `error`, điểm số, Test Case,
      kết quả mong đợi, harness, lệnh biên dịch hay tham số sandbox.
- [ ] Xác minh Gateway log `warn` một dòng khi Redis không sẵn sàng và tự thử lại khi kết nối trở lại.
- [ ] Xác minh `subscribe` không bị bỏ sót khi kết nối thất bại lúc khởi động rồi hồi phục.
- [ ] Xác minh khi Redis hồi phục không có loạt thông báo gộp cho các kết quả phát sinh lúc hỏng.
- [ ] Xác minh không có cơ chế lưu thông báo chưa gửi, để best-effort không biến thành giao có bảo đảm.
- [ ] Xác minh cả Run và Submit của cùng một người học đều phát thông báo, phân biệt được bằng `kind`.

## Phân quyền

- [ ] Xác minh mở kênh thiếu hoặc sai token thì không thiết lập được kênh nào.
- [ ] Xác minh kênh chỉ nhận thông báo của chủ sở hữu token, không của người khác.
- [ ] Xác minh không có đường để khách chọn danh tính khác qua tham số chung.
- [ ] Xác minh kênh đóng khi token hết hạn; logout/khóa tài khoản không thu hồi token còn hạn theo ID-001.
- [ ] N/A — không tách quyền theo vai trò cho kênh realtime.

## Kiểm thử

- [ ] Kiểm thử thông báo chỉ xảy ra sau khi bản ghi đã lưu, theo đúng thứ tự.
- [ ] Kiểm thử nội dung thông báo chỉ gồm public `submissionId`, `kind`, `status`, `ready: true`.
- [ ] Kiểm thử thông báo KHÔNG chứa `stdout`, `stderr`, `compileOutput`, `error`, điểm số, Test Case,
      harness, lệnh biên dịch hay tham số sandbox.
- [ ] Kiểm thử Redis dừng hoàn toàn → bản ghi vẫn hoàn tất, vẫn đọc được kết quả qua polling.
- [ ] Kiểm thử Redis hỏng rồi phục hồi → không có loạt thông báo gộp cho các kết quả phát sinh lúc
      hỏng.
- [ ] Kiểm thử `subscribe` được gọi lại khi kết nối thất bại lúc khởi động rồi hồi phục.
- [ ] Kiểm thử hai người học, một người nộp bài → kênh của người kia không nhận thông báo.
- [ ] Kiểm thử mở kênh kèm tham số chủ sở hữu/vai trò/quyền → handshake bị từ chối.
- [ ] Kiểm thử mở kênh thiếu hoặc sai token → không có kênh nào được thiết lập.
- [ ] Kiểm thử giao lại cùng một kết quả → không có thông báo thứ hai.
- [ ] Kiểm thử kết nối gián đoạn rồi mở lại → không mất kết quả phát sinh trong lúc gián đoạn.
- [ ] Kiểm thử nhiều phiên cùng một người học → mọi phiên đều có thể nhận; không phiên nào của người
      khác.
- [ ] Kiểm thử không nhận thông báo nào → client không kết luận bản ghi chưa xong.
- [ ] Kiểm thử bản ghi `INTERNAL_ERROR` → thông báo nêu trạng thái lỗi hệ thống, không phải phán quyết
      lời giải.
- [ ] Kiểm thử token hết hạn sau khi kênh mở → kênh ngừng nhận; logout trước hạn không đóng token.
- [ ] Kiểm thử kết nối thứ sáu trên Gateway khác bị từ chối; Redis lỗi thì realtime mới bị từ chối.
- [ ] Kiểm thử client polling 5 giây khi còn chờ và đọc sớm khi có thông báo.
- [ ] Kiểm thử thông báo nhận được sai hình thức hoặc có trường lạ → bị loại, không chuyển tiếp.
- [ ] Kiểm thử log không chứa token và không chứa payload thông báo ở mức thông tin.
- [ ] Chạy `pnpm lint`.
- [ ] Chạy `pnpm typecheck`.
- [ ] Chạy `pnpm test`.
- [ ] Chạy `pnpm build:submission`.
- [ ] Chạy `pnpm build:gateway`.

## Tài liệu

- [ ] Ghi rõ hợp đồng thông báo tối thiểu và lý do loại bỏ toàn bộ output khỏi realtime.
- [ ] Ghi rõ polling là cơ chế bảo đảm, còn realtime chỉ là tối ưu độ trễ.
- [ ] Ghi rõ hiệu lực token stateless theo ID-001 và chính sách đóng kênh khi hết hạn.
- [ ] N/A — không có thay đổi hợp đồng sự kiện RabbitMQ.

## Xác minh

- [ ] Đối chiếu bản triển khai với từng `FR-001` … `FR-016`, `SR-001` … `SR-012` và `AC-001` …
      `AC-016` của `spec.md`.
- [ ] Xác minh bằng kiểm thử rằng `stdout` và `stderr` **không còn** lọt tới trình duyệt qua đường
      realtime hiện tại.
- [ ] Xác minh bằng kiểm thử rằng kết quả tới được người học **kể cả khi Redis dừng hoàn toàn**.
- [ ] Xác nhận không có hành vi Ngoài phạm vi nào được thêm vào.
- [ ] Chỉ cập nhật trạng thái đặc tả sang `Implemented` thông qua quy trình review đã được phê duyệt.
- [ ] Ghi lại kết quả kiểm chứng và các hành vi chưa được xác minh.

## Tuân thủ kiến trúc

- [ ] Xác minh chiều phụ thuộc `use case → RealtimePort ← RedisRealtimeAdapter`.
- [ ] Xác minh Submission chỉ phát, Gateway chỉ nhận và chuyển tiếp, và không service nào gọi trực
      tiếp vào service kia ngoài Redis pub/sub.
- [ ] Xác minh Submission không mở kết nối tới trình duyệt và không mở socket.
- [ ] Xác minh Gateway không lưu trữ kết quả nghiệp vụ.
- [ ] Xác minh không thêm chiều thông báo ngược so với `specs/00-system/communication.md`.
- [ ] Xác minh PostgreSQL vẫn là nguồn chân lý; realtime chỉ là thông báo "hãy đọc lại".
- [ ] Xác minh bản triển khai khớp với mục Tuân thủ kiến trúc của `plan.md`.
