# SUB-002 Kế hoạch triển khai

## Trạng thái

**Chưa phê duyệt — bản nháp.** Đây là lệch quy trình có chủ ý.

Đặc tả liên quan [`./spec.md`](./spec.md) phiên bản `0.1` ngày `2026-09-29` đang ở trạng thái
`Proposed`, trong khi quy trình yêu cầu `Approved` trước khi lập kế hoạch. Chưa có người phê duyệt,
chưa có ngày phê duyệt, và tài liệu này **không có hiệu lực để triển khai**.

Nguồn của yêu cầu này: mẫu [`specs/templates/plan.template.md`](../../templates/plan.template.md) và
[`docs/agent/working-agreement.md`](../../../docs/agent/working-agreement.md) bước 1.

Khi đặc tả chuyển sang `Approved`, phần này phải được cập nhật kèm người phê duyệt và ngày phê duyệt
thật. Không tự điền để làm tài liệu trông hoàn tất.

## Đặc tả liên quan

- [`./spec.md`](./spec.md) — SUB-002 Nộp bài chính thức (Submit Code), phiên bản 0.1,
  ngày 2026-09-29
- Trạng thái spec tại thời điểm lập kế hoạch: **`Proposed`** (chưa Approved)
- Cùng nhóm: [`../run-code/spec.md`](../run-code/spec.md),
  [`../submission-history/spec.md`](../submission-history/spec.md),
  [`../realtime-result/spec.md`](../realtime-result/spec.md)

## Service đích

Service: **Submission**

Không có service mới. SUB-002 ghi rõ ở mục Ngoài phạm vi rằng không có microservice Submit riêng.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture + Event-Driven Architecture**

Chép từ [`specs/00-system/architecture-reference.md`(../../00-system/architecture-reference.md)
và [`docs/architecture/submission-service.md`(../../../docs/architecture/submission-service.md).

`submission-service.md` nêu rõ các quy tắc mà kế hoạch này phải giữ:

- Chuyển trạng thái và điều kiện tiến độ là quyết định của domain, không phải của consumer.
- Payload của Judge là contract truyền tải, không phải entity của Submission.
- Xử lý kết quả phải idempotent dưới giao lại trùng của RabbitMQ.
- `submission.accepted` chỉ được phát cho một nộp bài chính thức được chấp nhận.
- Publication realtime là tạm thời; PostgreSQL là nguồn chân lý.

`submission-service.md` cũng nêu tên port cần định nghĩa: Submit, Run, ListHistory, ApplyJudgeResult
use case, cùng repository, judge-job, learning-client, realtime và accepted-event port. Kế hoạch này
bám đúng danh sách đó.

## Ảnh hưởng tới mã nguồn hiện có

| Tệp hiện có                                       | Vấn đề cần xử lý                                                                                      |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `modules/submissions/submissions.service.ts`      | `submit()` điều phối trực tiếp repository, HTTP và RabbitMQ; cần chuyển qua use case và port              |
| `modules/submissions/judge-result.consumer.ts`    | Có 4 lỗi thật, xem bảng bên dưới                                                                       |
| `modules/submissions/learning-judge.client.ts`    | `JudgePackage` không mang tập ngôn ngữ đang bật, nên không thể thực hiện SUB-002-FR-002                  |
| `libs/contracts/src/judge.contracts.ts`          | Không có trường nào cho ngôn ngữ đang bật theo Problem                                                     |
| `modules/submissions/entities/submission.entity.ts` | Cột `score` không phân biệt "chưa có điểm" với "điểm bằng 0"                                          |
| `apps/learning-service`                            | Phải bổ sung nguồn dữ liệu ngôn ngữ đang bật và tính sẵn sàng nhận bài; thuộc LRN-001, không thuộc kế hoạch này |

### Lỗi thật trong `judge-result.consumer.ts` phải sửa

| Dòng hiện tại                                | Vấn đề                                                                              | Sửa theo                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------- |
| `submission.score = result.score ?? 0`         | Biến "chưa có điểm" thành 0, phủ định SUB-002-FR-011                                | Cột cho phép `NULL`, truyền `null` qua  |
| `score: submission.score \|\| 100`             | `\|\|` biến điểm `0` thành `100`, tức là phát ra một điểm sai cho Learning          | Bỏ mặc định 100, xem Câu hỏi mở 3     |
| `result.status as SubmissionStatus`           | Ép kiểu không kiểm tra, vi phạm yêu cầu xử lý kết quả không hợp lệ về hình thức      | Kiểm tra hình thức rồi mới áp dụng     |
| `if (this.isTerminal(status)) { publish… }`    | Kiểm tra trạng thái rồi mới ghi, không chống được hai consumer chạy đồng thời          | Cập nhật có điều kiện trong một lệnh   |

## Thay đổi ở tầng domain

Dùng chung aggregate với [`../run-code/plan.md`](../run-code/plan.md). Phần bổ sung cho Submit:

- `isOfficiallyAccepted(record)` — bất biến của SUB-002-FR-013: loại là nộp bài chính thức, trạng
  thái là `ACCEPTED`, và có `problemId`.
- `ensureAcceptedEventId(record)` — sinh `acceptedEventId` đúng một lần và giữ lại, không sinh lại
  (SUB-002-FR-014).
- `applyVerdict(record, verdict)` — chuyển bản ghi sang trạng thái cuối cùng do Judge phân loại, kèm
  điểm, số Test Case đạt, tổng số Test Case, thời gian chạy và bộ nhớ. Trạng thái cuối cùng không
  được thay đổi sau khi đã đặt (SUB-002-FR-012).
- `toJudgeVerdictStatus(judgeStatus)` — ánh xạ trạng thái của contract sang trạng thái miền, có kiểm
  tra, không ép kiểu.
- `DecidingScore` — một giá trị có thể là số hoặc chưa có, để phân biệt `0` với chưa có. Đây là
  hình dạng nội bộ của domain, không phải trường API.

Domain không chứa HTTP, RabbitMQ, Redis, TypeORM, và không biết `SubmissionKind` từ hợp đồng
truyền tải; nó chỉ nhận giá trị miền tương ứng.

## Tầng application / Use case

`modules/submissions/submit-code.use-case.ts` — `SubmitCodeUseCase.execute({ userId, problemId,
language, sourceCode })`:

1. Lấy gói judge được bảo vệ qua `LearningJudgePackagePort.getPackage(problemId, language)`
   (SUB-002-FR-003).
2. **Kiểm tra ngôn ngữ** trong bước 1: `language` phải nằm trong tập ngôn ngữ đang bật của Problem
   (SUB-002-FR-002). Việc kiểm tra nằm trong use case vì đây là quyết định nghiệp vụ của Submission,
   không phải kiểm tra dữ liệu của DTO.
3. Kiểm tra tính sẵn sàng nhận bài của Problem từ dữ liệu Learning trả về (SUB-002-FR-007).
4. Lưu bản ghi ở trạng thái `PENDING`.
5. Phát `JudgeRequest` với `mode: 'SUBMIT'` và dữ liệu lấy từ gói judge.
6. Chuyển bản ghi sang `QUEUED` và trả về phản hồi `202`.

`modules/submissions/apply-judge-result.use-case.ts` — `ApplyJudgeResultUseCase.execute(result)`:

1. Kiểm tra hình thức kết quả: `submissionId` hợp lệ và trạng thái thuộc tập được phép.
2. Cập nhật bản ghi **có điều kiện**: chỉ ghi khi trạng thái hiện tại chưa phải trạng thái cuối cùng.
   Lệnh cập nhật phải trả về số hàng bị ảnh hưởng, và chỉ khi số đó bằng 1 thì mới ghi bản ghi kết
   quả (SUB-002-FR-018, AC-009).
3. Ghi bản ghi kết quả trong cùng một giao dịch với bản ghi chính (SUB-002-FR-011).
4. Nếu bản ghi chính thức được chấp nhận: đảm bảo có `acceptedEventId` rồi đi tới bước 5.
5. Phát `submission.accepted` theo cơ chế bên dưới.
6. Phát thông báo realtime tối thiểu cho chủ sở hữu (SUB-002-FR-020).

Cơ chế phát sự kiện tiến độ, thực hiện đúng SUB-002-FR-016 và AC-013:

```text
a) UPDATE ... SET progress_event_published_at = now()
   WHERE id = $1 AND progress_event_published_at IS NULL
   -> nếu ảnh hưởng 0 hàng: đã phát trước đó, dừng
b) publish submission.accepted
c) nếu (b) thất bại: UPDATE ... SET progress_event_published_at = NULL để lần sau thử lại
```

- Bước (a) làm chặn giao lại trùng khi hai tiến trình cùng xử lý.
- Vì đánh dấu **trước** khi phát, một lần sập sau khi phát xong sẽ không phát lại, đúng AC-013.
- Vì bước (c) xoá dấu hiệu khi phát thất bại, một lần phát lỗi vẫn được thử lại, đúng hàng "Sự kiện
  tiến độ không phát được" trong mục Tình huống lỗi.
- `messageId` của sự kiện là `acceptedEventId`, nên nếu phát lại vẫn là cùng một định danh sự kiện và
  phía Learning tự nhận biết trùng.

Các port:

| Port                          | Phục vụ yêu cầu                            |
| ----------------------------- | ------------------------------------------ |
| `SubmissionRepositoryPort`    | FR-009, FR-010, FR-011, FR-018             |
| `JudgeJobPort`                | FR-008, FR-021                             |
| `LearningJudgePackagePort`    | FR-002, FR-003, FR-007                     |
| `AcceptedEventPort`           | FR-015, FR-016, FR-023                      |
| `RealtimePort`                | FR-020                                     |

## Lưu trữ

- `SubmissionRepositoryPort` bổ sung `applyVerdictOnce(id, verdict, expectedNonTerminalStatuses)`,
  trả về `boolean` cho biết có ghi hay không, để chống giao lại trùng ở tầng cơ sở dữ liệu chứ không
  chỉ ở tầng ứng dụng.
- `markAcceptedEventPublishing(id)` và `clearAcceptedEventPublishing(id)` cho cơ chế ở trên.
- Bảng `submissions` giữ vai trò nguồn chân lý. `problem_id` là UUID thuần túy, không có khoá ngoại
  (SUB-002-SR-010).
- Bảng `submission_results` đã có ràng buộc `UNIQUE (submission_id)`. Ràng buộc này là lớp bảo vệ thứ
  hai chống tạo bản ghi kết quả trùng, và phải được giữ nguyên.

## Thay đổi cơ sở dữ liệu

| Thay đổi        | Chi tiết                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `score`         | Cho phép `NULL`. Hiện là `integer NOT NULL DEFAULT 0`, khiến "chưa có điểm" không phân biệt được với 0 |
| `score` default | Bỏ giá trị mặc định; Submission chủ động truyền `NULL` khi Judge không báo điểm                          |

Không thêm bảng, không thêm index mới. Index `user_id` và `problem_id` đã đủ cho truy vấn của Submit
và của SUB-003.

Ảnh hưởng tương thích: các bản ghi cũ có `score = 0` sẽ được hiểu là "điểm bằng 0 thật". Không có
cách nào suy ra lại ý nghĩa của các giá trị 0 cũ mà không có dữ liệu lịch sử. Kế hoạch ghi nhận đây là
một giới hạn không tránh được và phải được nêu trong worked entry.

## Migration

- Tệp: `apps/submission-service/src/database/migrations/<timestamp>-MakeSubmissionScoreNullable.ts`
- Lệnh sinh: `pnpm migration:generate:submission`
- `up`: `ALTER TABLE "submissions" ALTER COLUMN "score" DROP NOT NULL, ALTER COLUMN "score" DROP DEFAULT`
- `down`: `ALTER TABLE "submissions" ALTER COLUMN "score" SET NOT NULL, ALTER COLUMN "score" SET DEFAULT 0`
  — hoàn tác cần `COALESCE(score, 0)` trước nếu đã có dòng `NULL`, nên phương án `down` phải cập nhật
  dữ liệu trước khi siết ràng buộc
- Tính hoàn tác: có, kèm bước chuẩn hoá dữ liệu
- Không sửa `1700000001000-InitialSubmissionSchema`. `synchronize` tiếp tục tắt.

## API

| Route                       | Method | Mã thành công | Ghi chú                                        |
| --------------------------- | ------ | ------------- | ---------------------------------------------- |
| `/api/submissions`          | `POST` | `202`         | Giữ nguyên đường dẫn; Gateway đã proxy        |

Phản hồi `202` trả về: định danh bản ghi, loại là nộp bài chính thức, trạng thái đã nhận vào hàng đợi,
định danh Problem, ngôn ngữ và mốc thời gian. Không trả phán quyết, không trả Test Case, kết quả
mong đợi, harness hay tham số runtime.

Ánh xạ qua DTO kết quả riêng, không tuần tự hoá thẳng entity, để đạt SUB-002-SR-008.

## DTO / Kiểm tra dữ liệu

`SubmitCodeRequestDto` giữ nguyên ba trường hiện có: `problemId` (`@IsUUID('4')`), `language`
(`@IsIn(SUPPORTED_LANGUAGES)`), `sourceCode` (`@IsString()`, `MinLength(1)`, `MaxLength(100_000)`).

Cấu hình `ValidationPipe` với `whitelist: true` và `forbidNonWhitelisted: true` là **bắt buộc** để đạt
SUB-002-AC-004 và AC-005: `testCases`, `expectedOutput`, `hiddenHarness`, `timeLimitMs`,
`memoryLimitMb`, trạng thái, điểm số, chủ sở hữu, vai trò và quyền phải bị từ chối bởi kiểm tra danh
sách cho phép. Việc này dùng chung với Run nên được làm một lần ở `main.ts`.

Kiểm tra ngôn ngữ đang bật **không** đặt ở DTO, vì cần dữ liệu của Learning và là quyết định nghiệp
vụ. Xem mục Tầng application.

## Phân quyền

- Chủ sở hữu lấy từ header tin cậy `x-auth-user-id`. Controller không nhận định danh từ body.
- Không thêm kiểm tra quyền theo vai trò, vì SUB-002 cho phép mọi vai trò đã xác thực. Câu hỏi mở 9
  chưa chốt.
- Không thêm hạn mức tần suất (SUB-002 ghi rõ v1 không có).
- Submission nhận dữ liệu judge qua header `x-internal-service-secret` trên một URL nội bộ. Header
  này phải ở ngoài mọi contract công khai, và URL nội bộ phải không định tuyến qua Gateway.
- Submission không có route đọc hoặc sửa bản ghi trong phạm vi này; các route đó thuộc SUB-003.

## Messaging / Sự kiện

### Ra: `judge.request`

- Exchange `bkpractice.judge`, routing key `judge.request`, `messageId = executionId`.
- `JudgeRequest` với `mode: 'SUBMIT'`, `problemType` và Test Case lấy từ gói judge, giới hạn thời
  gian và bộ nhớ lấy từ gói judge.
- Mã nguồn chỉ nằm trong trường `sourceCode`; Submission không dựng tên file hay lệnh.

### Về: `judge.result`

- Consumer chỉ làm ba việc: giải mã, gọi một use case, rồi ACK/NACK ở ranh giới adapter. Việc
  phối hợp nằm trong `ApplyJudgeResultUseCase`, đúng khuyến nghị trong `submission-service.md`.
- `mode: 'RUN'` phải được bỏ qua ở nhánh sự kiện tiến độ.
- Nếu kết quả không hợp lệ về mặt hình thức, adapter phải NACK để vào hàng chết thay vì ACK một kết
  quả rác.

### Đi: `submission.accepted`

- Exchange `bkpractice.learning`, routing key `submission.accepted`, `messageId = acceptedEventId`.
- Nội dung theo `SubmissionAcceptedEvent` hiện có: `eventId`, `occurredAt`, `submissionId`, `userId`,
  `problemId`, `score`.
- Không thêm trường mã nguồn, Test Case hay harness.
- **Không gọi trực tiếp API cập nhật tiến độ của Learning** (SUB-002-FR-023 và AC-017).

## Realtime

- N/A cho hợp đồng thông báo; nội dung và vòng đời kênh thuộc
  [`../realtime-result/plan.md`](../realtime-result/plan.md).
- `ApplyJudgeResultUseCase` gọi `RealtimePort` **sau khi** lưu, với một đối tượng thông báo tối thiểu.
- Đối tượng truyền cho `RealtimePort` KHÔNG được là `JudgeResult` thô, vì `JudgeResult` chứa
  `stdout` và `stderr` từ Test Case ẩn, và Gateway hiện chuyển thẳng payload nhận được xuống client.
  Đây là một rủi ro rò rỉ đang tồn tại trong mã hiện tại; xem mục Rủi ro.

## Adapter hạ tầng

- `TypeormSubmissionRepository` — hiện thực port, gồm cập nhật có điều kiện.
- `RabbitJudgeJobAdapter` — hiện thực `JudgeJobPort`.
- `RabbitAcceptedEventAdapter` — hiện thực `AcceptedEventPort`.
- `HttpLearningJudgePackageAdapter` — hiện thực `LearningJudgePackagePort`, là bản đổi tên và mở
  rộng của `LearningJudgeClient` hiện tại.
- `RedisRealtimeAdapter` — hiện thực `RealtimePort`.

## Xử lý lỗi

| Tình huống                                        | Hành vi trong kế hoạch                                                      |
| ------------------------------------------------- | ---------------------------------------------------------------------------- |
| Ngôn ngữ chưa bật cho Problem                      | Từ chối trước khi tạo bản ghi, nêu rõ ngôn ngữ không hợp lệ cho Problem     |
| Problem không sẵn sàng nhận bài                    | Từ chối trước khi tạo bản ghi                                                |
| Không lấy được gói judge                            | Theo hành vi đã chốt ở Câu hỏi mở 6; kế hoạch mặc định từ chối trước khi tạo bản ghi, vì mã hiện tại đang làm vậy và nó không để lại bản ghi dở dang |
| Lỗi lưu trữ bản ghi                               | Không có bản ghi, không gọi Judge                                            |
| Lỗi phát việc cho Judge                            | Chuyển bản ghi sang `INTERNAL_ERROR`, không bỏ treo ở `QUEUED`               |
| Kết quả không hợp lệ về hình thức                 | Giữ trạng thái cũ, log cảnh báo, NACK                                         |
| Kết quả cho bản ghi không tồn tại                  | Log cảnh báo, NACK; không ghi dữ liệu rác                                     |
| Kết quả cho bản ghi đã ở trạng thái cuối cùng      | Cập nhật có điều kiện trả 0 hàng, không ghi, vẫn kiểm tra sự kiện tiến độ   |
| Hai lần xử lý đồng thời                            | Chỉ một lần ghi nhờ cập nhật có điều kiện                                     |
| Phát sự kiện tiến độ thất bại                       | Xoá dấu hiệu đã phát để lần sau thử lại                                       |
| Redis không sẵn sàng                               | Nuốt lỗi tại adapter, bản ghi vẫn hoàn tất                                   |

## Bảo mật

| Mối đe doã                         | Biện pháp                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------- |
| Client gửi dữ liệu judge giả       | `whitelist` + `forbidNonWhitelisted`; dữ liệu judge chỉ lấy từ Learning                          |
| Client gửi trạng thái/điểm giả      | Các trường đó không tồn tại trong DTO, nên bị từ chối                                            |
| Lộ Test Case ẩn                    | DTO kết quả liệt kê tường minh; không trả gói judge trong bất kỳ phản hồi nào                     |
| Lộ dữ liệu judge qua lỗi           | Adapter bọc lỗi HTTP thành lỗi phụ thuộc chung, không chuyển tiếp nội dung phản hồi của Learning |
| Gán hàng loạt chủ sở hữu           | Chủ sở hữu chỉ từ header tin cậy                                                                  |
| Truy cập bản ghi người khác        | Nằm ngoài phạm vi này nhưng port phải có sẵn phương thức lọc theo chủ sở hữu cho SUB-003            |
| Mã nguồn thành lệnh                | Submission không dựng lệnh, không dựng tên file                                                  |
| Giao lại trùng gây phát lặt        | Cập nhật có điều kiện ở ba nơi: trạng thái, dấu hiệu sự kiện, ràng buộc UNIQUE                    |
| Phát điểm sai cho Learning          | Bỏ mặc định 100, xử lý theo Câu hỏi mở 3                                                        |

## Chiến lược kiểm thử

| Mã             | Kịch bản                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| FR-002, AC-002 | Ngôn ngữ chưa bật cho Problem → từ chối, `JudgeJobPort` **không** được gọi                              |
| FR-003, AC-004 | Dữ liệu judge lấy từ `LearningJudgePackagePort`, không lấy từ body                                   |
| FR-004, AC-005 | Body chứa Test Case, giới hạn, trạng thái, điểm, chủ sở hữu → bị từ chối bởi `forbidNonWhitelisted`     |
| FR-005, AC-006 | Thiếu `x-auth-user-id` → `401`, không tạo bản ghi                                                        |
| FR-007, AC-003 | Problem không tồn tại hoặc chưa sẵn sàng → từ chối, không tạo bản ghi, không gọi Judge                |
| FR-008, AC-001 | Submit hợp lệ → bản ghi `QUEUED`, phản hồi không chứa phán quyết                                       |
| FR-011, AC-007 | Áp dụng phán quyết → trạng thái, điểm, Test Case, thời gian, bộ nhớ lưu trong một giao dịch           |
| FR-012, AC-008 | Bản ghi đã ở trạng thái cuối cùng nhận kết quả mới → trạng thái giữ nguyên, không có bản ghi kết quả mới |
| FR-018, AC-009 | Hai lần xử lý đồng thời → chỉ một lần ghi, trạng thái nhất quán                                          |
| FR-014, AC-010 | `acceptedEventId` giống nhau giữa hai lần phát                                                            |
| FR-015, AC-011 | `ACCEPTED` → `AcceptedEventPort.publish` gọi đúng một lần, đúng nội dung; `INTERNAL_ERROR` → không gọi |
| FR-016, AC-013 | Giả lập sập sau khi phát → lần chạy lại không phát lại; giả lập phát lỗi → dấu hiệu được xoá           |
| FR-023, AC-012 | Bản ghi `RUN` với `ACCEPTED` → `AcceptedEventPort` không được gọi                                       |
| FR-021, AC-014 | Lỗi ở bước chuẩn bị hoặc phát việc → bản ghi không ở `QUEUED` vô hạn                                    |
| FR-010, AC-015 | Xác minh Submission không thực thi mã, không có khoá ngoại xuyên service, chỉ gọi Learning qua nội bộ |
| AC-016          | Không trường ẩn nào trong phản hồi, lỗi, log hay Swagger                                               |
| AC-018          | Đổi tiêu đề Problem ở Learning không đổi kết quả bản ghi                                               |

Hai kiểm thử đáng chú ý nhất là FR-023/AC-012 và FR-016/AC-013, vì chúng bảo vệ trực tiếp tính đúng
đắn của tiến độ học tập và chống phát sự kiện lặp.

## Khả năng quan sát

- Log `debug` khi giao việc: `submissionId`, `mode: 'SUBMIT'`. Không log mã nguồn.
- Log `warn` khi bỏ qua kết quả vì bản ghi đã ở trạng thái cuối cùng, kèm `submissionId`.
- Log `warn` khi phát sự kiện tiến độ thất bại, kèm `submissionId` và `acceptedEventId` nhưng không
  kèm payload sự kiện.
- Dùng `acceptedEventId` làm khoá tương quan giữa Submission và Learning. Không thêm hệ thống
  correlation ID mới.

## Thứ tự triển khai

1. **Chốt Câu hỏi mở 1 và 2** với Learning, rồi cập nhật LRN-001 và hợp đồng nội bộ nếu cần.
2. Thêm trường hợp nghiệm vụ ngôn ngữ vào domain và tới domain của Learning.
3. Thêm cột `score` cho phép `NULL` và chạy `pnpm migration:run:submission`.
4. Thêm `ValidationPipe` `whitelist` + `forbidNonWhitelisted` ở `main.ts` nếu chưa có.
5. Tạo `SubmitCodeUseCase` cùng `LearningJudgePackagePort` và adapter.
6. Tạo `ApplyJudgeResultUseCase` với cập nhật có điều kiện và cơ chế dấu hiệu sự kiện.
7. Tạo `AcceptedEventPort` và adapter RabbitMQ.
8. Làm consumer mỏng, gọi một use case, xử lý ACK/NACK ở adapter.
9. Viết kiểm thử theo bảng ở mục Chiến lược kiểm thử.
10. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build:submission`.

Bước 1 đứng trước vì cả hai câu hỏi đều thay đổi hợp đồng. Viết code trước khi chốt sẽ tạo ra
một hợp đồng phải viết lại.

## Rủi ro

| Rủi ro                                                                  | Biện pháp giảm thiểu                                                              |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Câu hỏi mở 1 và 2 chưa chốt                                            | Chặn triển khai cho tới khi chốt; ghi rõ ở đầu tài liệu                            |
| Sự kiện tiến độ phát trùng khi sập giữa lúc phát                          | Cơ chế đánh dấu trước rồi bù trừ ở bước (c)                                       |
| Hai consumer chạy đồng thời ghi hai lần                                    | Cập nhật có điều kiện trả số hàng, cộng ràng buộc `UNIQUE (submission_id)`            |
| `score || 100` tiếp tục phát điểm sai                                     | Sửa tại bước 6 và có kiểm thử riêng cho `ACCEPTED` với điểm `0`                     |
| Realtime hiện đẩy `JudgeResult` thô xuống client, làm lộ `stdout`/`stderr` | `RealtimePort` chỉ nhận đối tượng tối thiểu; sửa nằm ở `SUB-004` nhưng phải làm cùng đợt |
| Dữ liệu `score = 0` cũ không phân biệt được với chưa có điểm               | Ghi nhận giới hạn, không có cách sửa; nêu trong worked entry                        |
| Ép kiểu trạng thái không kiểm tra                                          | `toJudgeVerdictStatus` có kiểm tra, kèm kiểm thử kết quả không hợp lệ               |
| Hợp đồng judge package đổi làm hỏng Submit đang chạy                        | Thêm trường mới, không đổi hoặc xoá trường cũ; triển khai giả lập trước ở Learning   |

## Tuân thủ kiến trúc

- **Chiều phụ thuộc:** `controller → SubmitCodeUseCase / ApplyJudgeResultUseCase → domain port ← adapter`.
  `JudgeResultConsumer` chỉ giải mã và gọi một use case.
- **Quyền sở hữu:** Submission sở hữu `submissions` và `submission_results`. `problem_id` là giá
  trị định danh ngoài, không phải quan hệ lưu trữ. Không truy vấn cơ sở dữ liệu của Learning.
- **Hợp đồng với Learning:** chỉ qua HTTP nội bộ có xác thực. Submission không đăng ký consumer
  RabbitMQ nào của Learning và không giả định có consumer nào tồn tại.
- **Ranh giới module:** `modules/submissions` giữ aggregate và port dùng chung. Use case Submit và
  use case áp dụng kết quả ở cùng module vì chúng chia sẻ bản ghi và cùng một giao dịch.
- **Không đưa vào service này:** biên dịch, runner, sandbox, mã của Judge; và cả logic cập nhật
  tiến độ của Learning.
- **Ngoại lệ đã được phê duyệt:** Không có.

## Câu hỏi mở còn chặn kế hoạch này

Lấy từ `spec.md`. Câu 1, 2, 3, 4 và 6 ảnh hưởng trực tiếp tới kế hoạch:

1. **Hình dạng contract kiểm tra ngôn ngữ** — thêm `allowedLanguages` vào gói judge hiện có, hay
   một luồng nội bộ riêng? Câu này chặn mục Tầng application và một phần Tầng infrastructure.
2. **Nguồn sự thật của tính sẵn sàng nộp bài** — trạng thái `PUBLISHED` của LRN-001 có đủ, hay cần
   khái niệm riêng? Chặn bước 2 của use case.
3. **Giá trị điểm khi Judge không báo điểm** — giá trị đó là bao nhiêu, và có được mang vào sự kiện
   tiến độ không? Chặn hành vi cột `score` và nội dung sự kiện.
4. **Điểm trong sự kiện tiến độ khi `ACCEPTED` với điểm `0`** — chặn kiểm thử `AC-010` và sửa lỗi
   `|| 100`.
5. **Trạng thái trung gian** — có dùng `RUNNING` không? Kế hoạch giữ nguyên enum, không dùng tới.
6. **Thất bại khi không lấy được gói judge** — kế hoạch mặc định từ chối trước khi tạo bản ghi, khớp
   với mã hiện tại.
7. **Bản ghi treo** — kế hoạch không thêm cơ chế hết hạn; cần quyết định.
8. **Yêu cầu trùng lặp** — kế hoạch giữ hành vi hiện tại là tạo bản ghi mới, không `Idempotency-Key`.
9. **Quyền nộp bài** — kế hoạch không thêm kiểm tra vai trò.
10. **Hiệu lực của việc kiểm tra ngôn ngữ** — kế hoạch chỉ kiểm tra một lần lúc lấy gói judge.
11. **Điểm chính thức và điểm Assignment** — kế hoạch không thêm trường điểm Assignment.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md`. Vì `spec.md` chưa Approved, tài liệu này chưa có hiệu lực để triển khai.
