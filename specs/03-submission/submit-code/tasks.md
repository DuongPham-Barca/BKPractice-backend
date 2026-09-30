# SUB-002 Công việc triển khai

## Trạng thái

**Approved — 2026-09-30, chủ sở hữu sản phẩm phê duyệt trong hội thoại. Chưa triển khai.**

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản `1.0` ngày `2026-09-30`, trạng thái `Approved`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved 2026-09-30

Nguồn của yêu cầu này: mẫu [`specs/templates/tasks.template.md`](../../templates/tasks.template.md)
và [`docs/agent/working-agreement.md`](../../../docs/agent/working-agreement.md) bước 1.

Task code vẫn chưa hoàn thành; chỉ bước phê duyệt tài liệu đã được tích.

Đánh dấu các mục không áp dụng là `- [x] N/A — lý do`. Giữ danh sách này đồng bộ với bản triển khai
thực tế; tích một mục nghĩa là mục đó đã hoàn thành và đã được xác minh nếu có liên quan.

## Chuẩn bị

- [ ] Khảo sát mã nguồn hiện có và trạng thái repository.
- [x] Spec và plan Approved; LRN-002-FR-015 xác nhận ngôn ngữ/Problem, không sửa Learning.
- [x] Chốt điểm Judge thiếu `null`, event accepted 100, outbox at-least-once, watchdog 10 phút.
- [x] Ghi kết luận câu hỏi mở trong worked entry phê duyệt SRS.
- [ ] Xác nhận kiến trúc Submission trong `docs/architecture/`.
- [ ] Xác nhận `plan.md` khớp với đặc tả sau khi sửa và không mở rộng phạm vi.
- [ ] Xác minh URL nội bộ của Learning không đi qua Gateway.

## Domain

- [ ] Bổ sung `isOfficiallyAccepted` vào aggregate dùng chung.
- [ ] Triển khai `ensureAcceptedEventId` sinh định danh đúng một lần và giữ lại.
- [ ] Triển khai `applyVerdict` với bất biến trạng thái cuối cùng không đổi.
- [ ] Triển khai `toJudgeVerdictStatus` có kiểm tra, thay cho ép kiểu `as SubmissionStatus`.
- [ ] Thêm `DecidingScore` phân biệt điểm `0` với chưa có điểm.
- [ ] Thêm kiểm thử domain: Run không được là nộp bài chính thức; `INTERNAL_ERROR` không đủ điều
      kiện chấp nhận; trạng thái cuối cùng không bị ghi đè.

## Application

- [ ] Tạo `SubmitCodeUseCase` với thứ tự: lấy gói judge → kiểm tra ngôn ngữ → kiểm tra sẵn sàng →
      lưu bản ghi → phát việc → chuyển `QUEUED`.
- [ ] Tạo `ApplyJudgeResultUseCase`.
- [ ] Thêm `applyVerdictOnce` trả về số hàng bị ảnh hưởng để chống giao lại trùng ở tầng lưu trữ.
- [ ] Ghi một hàng outbox `submission.accepted` cùng transaction áp dụng `ACCEPTED`, UNIQUE theo
      `submission_id` và `event_id`.
- [ ] Triển khai relay với broker confirm, retry hàng pending cùng `eventId`; Learning khử trùng.
- [ ] Đặt `score: 100` tường minh cho event tiến độ, giữ điểm Judge 0/null trong bản ghi.
- [ ] Chỉ triển khai năm port đã lập kế hoạch: repository, judge job, learning package, accepted
      event, realtime.

## Infrastructure

- [ ] Tạo `TypeormSubmissionRepository` với các cập nhật có điều kiện.
- [ ] Tạo `RabbitJudgeJobAdapter` hiện thực `JudgeJobPort`.
- [ ] Tạo `RabbitAcceptedEventAdapter` hiện thực `AcceptedEventPort`.
- [ ] Mở rộng `LearningJudgeClient` thành `HttpLearningJudgePackageAdapter` theo hợp đồng đã chốt.
- [ ] Tạo `RedisRealtimeAdapter` chỉ nhận đối tượng thông báo tối thiểu, không nhận `JudgeResult` thô.
- [ ] Gắn adapter tại `SubmissionsModule`.

## Lưu trữ

- [ ] Triển khai lọc theo `userId` trước khi phân trang trong mọi truy vấn danh sách.
- [ ] Giữ nguyên ràng buộc `UNIQUE (submission_id)` trên `submission_results` như lớp bảo vệ thứ
      hai chống bản ghi kết quả trùng.
- [ ] Xác minh không có truy cập cơ sở dữ liệu xuyên service và không có khoá ngoại tới Problem.
- [ ] Xác minh `problem_id` chỉ là UUID thuần túy, không được dùng để tra cứu.

## Cơ sở dữ liệu / Migration

- [ ] Tạo migration `<timestamp>-MakeSubmissionScoreNullable.ts` cho phép `score` là `NULL` và bỏ
      giá trị mặc định.
- [ ] Tạo migration bảng `submission_accepted_outbox` và index hàng pending; không xóa event chưa
      giao khi rollback.
- [ ] Viết `down` có bước `COALESCE(score, 0)` trước khi siết lại `NOT NULL`.
- [ ] Chạy `pnpm migration:run:submission` và xác minh bản ghi cũ vẫn đọc được.
- [ ] Ghi nhận giới hạn: các bản ghi `score = 0` cũ không phân biệt được với chưa có điểm.
- [ ] Xác minh `synchronize` vẫn tắt và migration `InitialSubmissionSchema` không bị sửa.

## API

- [ ] Giữ nguyên route `POST /api/submissions` với mã `202`.
- [ ] Bổ sung `SubmitCodeRequestDto` với `problemId`, `language`, `sourceCode`.
- [ ] Tạo DTO kết quả nộp bài liệt kê tường minh các trường trả về; không tuần tự hoá thẳng entity.
- [ ] Bật `ValidationPipe` với `whitelist: true` và `forbidNonWhitelisted: true` nếu `main.ts` chưa
      có; dùng chung với Run.
- [ ] Cập nhật Swagger khi hình dạng phản hồi thay đổi.
- [ ] Xác minh phản hồi không chứa Test Case, kết quả mong đợi, harness hay tham số runtime.

## Messaging

- [ ] Phát `JudgeRequest` với `mode: 'SUBMIT'`, Test Case và giới hạn lấy từ gói judge.
- [ ] Xác minh mã nguồn chỉ nằm trong trường `sourceCode`, không dựng tên file hay lệnh.
- [ ] Làm `JudgeResultConsumer` mỏng: giải mã, gọi một use case, ACK/NACK ở adapter.
- [ ] Xác minh bản ghi `RUN` với `ACCEPTED` không bao giờ gọi `AcceptedEventPort`.
- [ ] Xác minh phát `submission.accepted` với `messageId = acceptedEventId` và nội dung đúng sáu
      trường đã phê duyệt.
- [ ] Xác minh kết quả không hợp lệ về hình thức bị NACK, không bị ACK như một kết quả rác.
- [ ] Xác minh kết quả cho bản ghi không tồn tại bị loại và ghi log cảnh báo.
- [ ] Xác minh hành vi ACK/NACK, retry và hàng chết theo quy ước hiện có.
- [ ] Xác minh Submission không gọi trực tiếp API cập nhật tiến độ của Learning.

## Realtime

- [ ] Xác minh thông báo realtime được phát **sau khi** bản ghi đã lưu.
- [ ] Xác minh đối tượng truyền cho `RealtimePort` không chứa `stdout`, `stderr`, Test Case hay
      harness.
- [ ] Xác minh khi Redis không sẵn sàng thì bản ghi vẫn hoàn tất và sự kiện tiến độ vẫn được phát.
- [ ] N/A — nội dung thông báo, hình dạng kênh và vòng đời kênh thuộc `SUB-004`.

## Phân quyền

- [ ] Xác minh chủ sở hữu chỉ đến từ header tin cậy `x-auth-user-id`.
- [ ] Kiểm thử thiếu access token → `401`, không tạo bản ghi.
- [ ] Kiểm thử body chứa `userId`, vai trò, quyền → bị từ chối.
- [ ] Xác minh URL gói judge chỉ nhận header nội bộ và không định tuyến qua Gateway.
- [ ] Xác minh không có hạn mức tần suất nào được áp.
- [ ] Xác minh không có quyền `submission:submit` riêng trong v1; mọi vai trò xác thực nộp được.

## Kiểm thử

- [ ] Kiểm thử ngôn ngữ chưa bật cho Problem → từ chối, `JudgeJobPort` không được gọi.
- [ ] Kiểm thử Problem không tồn tại hoặc chưa sẵn sàng → từ chối, không tạo bản ghi.
- [ ] Kiểm thử dữ liệu judge lấy từ port Learning, không lấy từ body.
- [ ] Kiểm thử body chứa Test Case, giới hạn, trạng thái, điểm, chủ sở hữu → bị từ chối.
- [ ] Kiểm thử Submit hợp lệ → bản ghi `QUEUED`, phản hồi không chứa phán quyết.
- [ ] Kiểm thử áp dụng phán quyết → mọi trường kết quả lưu trong một giao dịch.
- [ ] Kiểm thử bản ghi đã ở trạng thái cuối cùng nhận kết quả mới → không đổi, không có bản ghi kết
      quả mới.
- [ ] Kiểm thử hai lần xử lý đồng thời → chỉ một lần ghi, trạng thái nhất quán.
- [ ] Kiểm thử `ACCEPTED` → `AcceptedEventPort` gọi đúng một lần với nội dung đúng.
- [ ] Kiểm thử `INTERNAL_ERROR` với điểm bất kỳ → `AcceptedEventPort` không được gọi.
- [ ] Kiểm thử `ACCEPTED` với điểm Judge `0` hoặc `null` → bản ghi giữ giá trị đó, event mang 100.
- [ ] Kiểm thử crash trước/sau broker confirm → outbox retry cùng `eventId`, Learning chỉ áp dụng
      tiến độ một lần.
- [ ] Kiểm thử watchdog 10 phút và kết quả Judge đến sau không ghi đè `INTERNAL_ERROR`.
- [ ] Kiểm thử phát sự kiện thất bại → dấu hiệu được xoá để lần sau thử lại.
- [ ] Kiểm thử Run với `ACCEPTED` → không phát `submission.accepted`.
- [ ] Kiểm thử lỗi chuẩn bị hoặc lỗi phát việc → bản ghi không ở `QUEUED` vô hạn.
- [ ] Kiểm thử Learning không nhận bất kỳ thay đổi tiến độ nào ngoài `submission.accepted`.
- [ ] Chạy `pnpm lint`.
- [ ] Chạy `pnpm typecheck`.
- [ ] Chạy `pnpm test`.
- [ ] Chạy `pnpm build:submission`.

## Tài liệu

- [ ] Xác minh adapter dùng đúng gói judge LRN-002 theo `problemId + language`, không thêm
      `allowedLanguages` hoặc thay đổi hợp đồng Learning.
- [ ] Cập nhật [`docs/architecture/submission-service.md`](../../../docs/architecture/submission-service.md)
      khi trạng thái chuyển khỏi PARTIALLY ALIGNED.
- [ ] Ghi chú migration `score` và giới hạn dữ liệu `0` cũ vào tài liệu vận hành.
- [ ] Ghi lại các sai lệch đã được phê duyệt.

## Xác minh

- [ ] Đối chiếu bản triển khai với từng `FR-001` … `FR-023`, `SR-001` … `SR-013` và `AC-001` …
      `AC-020` của `spec.md`.
- [ ] Xác nhận `AC-009` bằng kiểm thử chạy đồng thời thật, không bằng giả định về tuần tự.
- [ ] Xác nhận không có hành vi Ngoài phạm vi nào được thêm vào, đặc biệt là hạn mức, xếp hạng,
      chấm điểm Assignment và xem lời giải của sinh viên.
- [ ] Chỉ cập nhật trạng thái đặc tả sang `Implemented` thông qua quy trình review đã được phê duyệt.
- [ ] Ghi lại kết quả kiểm chứng và các hành vi chưa được xác minh.

## Tuân thủ kiến trúc

- [ ] Xác minh chiều phụ thuộc `controller → use case → domain port ← adapter`.
- [ ] Xác minh `JudgeResultConsumer` không điều phối trực tiếp repository, RabbitMQ, HTTP hay
      Redis.
- [ ] Xác minh tầng domain không import TypeORM, NestJS, RabbitMQ hay ioredis.
- [ ] Xác minh Submission không chứa biên dịch, runner hay sandbox.
- [ ] Xác minh Submission không giả định Learning có consumer nào.
- [ ] Xác minh bản triển khai khớp với mục Tuân thủ kiến trúc của `plan.md`.
