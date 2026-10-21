# SUB-001 Công việc triển khai

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
- [x] Spec và plan Approved; chốt `EXECUTED`, 3000 ms/256 MB, watchdog 10 phút, UUID tùy chọn.
- [x] Ghi kết luận câu hỏi mở trong worked entry phê duyệt SRS.
- [ ] Xác nhận kiến trúc Submission trong `docs/architecture/`.
- [ ] Xác nhận `plan.md` khớp với đặc tả sau khi sửa và không mở rộng phạm vi.
- [ ] Xác nhận `pnpm migration:run:submission` chạy được trên môi trường đích.

## Domain

- [ ] Tạo aggregate `SubmissionRecord` không phụ thuộc framework trong
      `modules/submissions/domain/`.
- [ ] Chuyển `SubmissionKind` và `SubmissionStatus` sang tầng domain; thêm `EXECUTED` cho Run,
      giữ các giá trị cũ để không phá dữ liệu đã lưu.
- [ ] Triển khai `createRunRecord`, `markRunQueued`, `markRunFailedToDispatch`.
- [ ] Triển khai bất biến `isTerminal` và `canProduceWrongAnswer`.
- [ ] Khai báo `SubmissionRepositoryPort`, `JudgeJobPort`, `RealtimePort` trong
      `modules/submissions/domain/ports/`.
- [ ] Bổ sung kiểm thử domain: Run không sinh `WRONG_ANSWER`; `PENDING → QUEUED → INTERNAL_ERROR`
      là các chuyển trạng thái hợp lệ; chuyển trạng thái từ một trạng thái cuối cùng bị từ chối.

## Application

- [ ] Tạo `RunCodeUseCase` trong `modules/run-code/`.
- [ ] Chuyển `SubmissionsService.run()` sang gọi use case, giữ nguyên đường dẫn `POST /api/run` và
      mã `202`.
- [ ] Đảm bảo `modules/run-code` KHÔNG import `LearningJudgePackagePort` (SUB-001-FR-004).
- [ ] Chỉ triển khai ba port đã lập kế hoạch: repository, judge job, realtime.

## Infrastructure

- [ ] Tạo `TypeormSubmissionRepository` hiện thực `SubmissionRepositoryPort`.
- [ ] Tạo `RabbitJudgeJobAdapter` hiện thực `JudgeJobPort`.
- [ ] Tạo `RedisRealtimeAdapter` hiện thực `RealtimePort`.
- [ ] Gắn adapter tại `SubmissionsModule`, không tạo module mới ở cấp service.
- [ ] Để lỗi phát realtime được nuốt và ghi log `warn` tại adapter, không ném ra use case.

## Lưu trữ

- [ ] Lọc theo `userId` trước khi phân trang trong mọi truy vấn danh sách.
- [ ] Xác minh Run không tạo quan hệ lưu trữ với Problem và không truy vấn cơ sở dữ liệu của Learning,
      Identity hay Judge.

## Cơ sở dữ liệu / Migration

- [ ] Tạo migration `<timestamp>-AddRunStdin.ts` thêm cột `submissions.stdin` kiểu `text` nullable.
- [ ] Tạo migration thêm `EXECUTED` vào PostgreSQL enum; không rollback bằng cách âm thầm đổi
      bản ghi `EXECUTED` sang phán quyết khác.
- [ ] Có phương án `down` tương ứng; migration phải hoàn tác được.
- [ ] Chạy `pnpm migration:run:submission` và xác minh bản ghi Run cũ vẫn đọc được.
- [ ] Xác minh `synchronize` vẫn đang tắt và migration `InitialSubmissionSchema` không bị sửa.

## API

- [ ] Bổ sung `RunCodeRequestDto` với `language`, `sourceCode`, `stdin` (cho phép rỗng), `problemId`
      UUID tuỳ chọn; UUID sai dạng bị từ chối nhưng UUID không tồn tại không cần tra Learning.
- [ ] Tạo DTO kết quả Run liệt kê tường minh các trường trả về; không tuần tự hoá thẳng entity
      TypeORM.
- [ ] Bật `ValidationPipe` với `whitelist: true` và `forbidNonWhitelisted: true` nếu `main.ts` chưa
      có; không viết lại nếu đã có.
- [ ] Xác minh route `/api/run` vẫn được Gateway proxy với tiền tố `/api/run`.
- [ ] Cập nhật Swagger cho route Run nếu hình dạng phản hồi thay đổi.

## Messaging

- [ ] Xác minh `JudgeRequest` với `mode: 'RUN'` được phát qua `bkpractice.judge` / `judge.request`.
- [ ] Xác minh consumer phân biệt `mode: 'RUN'` và **không** gọi accepted-event port.
- [ ] Xác minh hành vi khi giao lại trùng: bản ghi kết quả không bị tạo lần hai.
- [ ] Xác minh kết quả có `submissionId` không tồn tại bị loại và ghi log cảnh báo.

## Realtime

- [ ] Xác minh kết quả Run được phát sau khi bản ghi đã lưu, cho đúng chủ sở hữu.
- [ ] Xác minh khi Redis không sẵn sàng thì bản ghi Run vẫn hoàn tất và vẫn đọc được trong lịch sử.
- [ ] N/A — nội dung thông báo, hình dạng kênh và vòng đời kênh thuộc `SUB-004`.

## Phân quyền

- [ ] Xác minh chủ sở hữu bản ghi chỉ đến từ header tin cậy `x-auth-user-id` do Gateway xác minh.
- [ ] Kiểm thử trường `userId`, vai trò, quyền trong body bị từ chối.
- [ ] Xác minh không có hạn mức tần suất nào được áp trong Submission.
- [ ] Xác minh không có quyền `submission:run` riêng trong v1.

## Kiểm thử

- [ ] Kiểm thử ngôn ngữ ngoài danh mục, mã nguồn rỗng, `stdin` quá dài → từ chối, không tạo bản ghi.
- [ ] Kiểm thử Run hợp lệ → bản ghi `QUEUED`, `JudgeJobPort.publish` gọi đúng một lần.
- [ ] Kiểm thử Run **không** phát `submission.accepted` và Learning không nhận thay đổi tiến độ.
- [ ] Kiểm thử `problemId` không tồn tại vẫn tạo bản ghi và không có lời gọi HTTP tới Learning.
- [ ] Kiểm thử `JudgeJobPort.publish` ném lỗi → bản ghi ở `INTERNAL_ERROR`, không ở `QUEUED`.
- [ ] Kiểm thử giao lại cùng một kết quả hai lần → không có bản ghi kết quả trùng.
- [ ] Kiểm thử kết quả không lỗi → trạng thái không phải `WRONG_ANSWER`.
- [ ] Kiểm thử Judge báo `ACCEPTED` cho Run → lưu `EXECUTED`, không phát `submission.accepted`.
- [ ] Kiểm thử watchdog 10 phút chuyển bản ghi còn chờ sang `INTERNAL_ERROR`, result muộn không
      ghi đè; request trùng tạo bản ghi Run mới.
- [ ] Kiểm thử `RealtimePort` ném lỗi → bản ghi vẫn hoàn tất, use case không ném lỗi ra ngoài.
- [ ] Kiểm thử thiếu access token → `401`, không tạo bản ghi.
- [ ] Chạy `pnpm lint`.
- [ ] Chạy `pnpm typecheck`.
- [ ] Chạy `pnpm test`.
- [ ] Chạy `pnpm build:submission`.

## Tài liệu

- [ ] Cập nhật [`docs/architecture/submission-service.md`](../../../architecture/submission-service.md)
      khi trạng thái từ PARTIALLY ALIGNED chuyển sang ALIGNED cho phần Run.
- [ ] Ghi chú migration `stdin` vào tài liệu vận hành.
- [ ] N/A — tài liệu tương tác phía Gateway không thay đổi.

## Xác minh

- [ ] Đối chiếu bản triển khai với từng `FR-001` … `FR-015`, `SR-001` … `SR-009` và `AC-001` …
      `AC-016` của `spec.md`.
- [ ] Xác nhận không có hành vi Ngoài phạm vi nào được thêm vào, đặc biệt là hạn mức, lưu nháp,
      chạy trên Test Case công khai và xếp hạng.
- [ ] Chỉ cập nhật trạng thái đặc tả sang `Implemented` thông qua quy trình review đã được phê duyệt.
- [ ] Ghi lại kết quả kiểm chứng và các hành vi chưa được xác minh.

## Tuân thủ kiến trúc

- [ ] Xác minh chiều phụ thuộc `controller → use case → domain port ← adapter`.
- [ ] Xác minh tầng domain không import TypeORM, NestJS, RabbitMQ hay ioredis.
- [ ] Xác minh `modules/run-code` không import bất kỳ port nào của Submit.
- [ ] Xác minh bản triển khai khớp với mục Tuân thủ kiến trúc của `plan.md`.
