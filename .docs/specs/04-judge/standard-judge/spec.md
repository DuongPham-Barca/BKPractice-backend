# JDG-001 Chấm bài chuẩn

## Trạng thái

Proposed — phiên bản 0.2, ngày 2026-09-30.

## Mục tiêu

Định nghĩa cách Judge xử lý một yêu cầu chấm hợp lệ cho Problem `STANDARD`, so sánh từng kết quả
chạy với expected output, dừng hoặc tiếp tục theo chính sách đã chốt, và trả verdict cùng số liệu
kết quả nội bộ cho Submission.

## Tác nhân

- **Submission Service:** hệ thống tin cậy phát `judge.request`, nhận `judge.result` và sở hữu vòng
  đời bản ghi Run/Submit.
- **Judge Service:** worker thực thi và phân loại kết quả.
- **Learning Service:** nguồn gốc của Test Case, expected output và execution limits; không gọi Judge
  trực tiếp.
- **Người học:** tác giả mã nguồn; không giao tiếp trực tiếp với Judge.

## Bối cảnh

Judge hiện nhận một request qua RabbitMQ, tạo workspace, chọn runner, biên dịch nếu cần, chạy từng
Test Case, chuẩn hoá output, rồi publish result. `STANDARD` là chương trình hoàn chỉnh đọc stdin và
ghi stdout. Submission quyết định trạng thái nghiệp vụ và xử lý điểm theo SUB-002; Judge chỉ báo
verdict và số liệu đã đánh giá.

## Luồng chuẩn

1. Nhận message từ queue và deserialize thành `JudgeRequest`.
2. Kiểm tra trường, enum, limits và quan hệ giữa mode/problem type/testcase. Payload không hợp lệ
   không được đi tới compiler/runtime.
3. Tạo workspace riêng, ghi source bằng filename do runner định nghĩa; payload không điều khiển
   đường dẫn hay command.
4. Compile một lần nếu runner yêu cầu. Compile failure kết thúc đánh giá.
5. Duyệt testcase theo thứ tự: truyền stdin, chạy trong sandbox, phân loại process outcome; nếu
   process thành công thì chuẩn hóa stdout và so với expected output.
6. Cập nhật passed count, score và runtime theo policy đã duyệt; áp dụng stop/continue rule đã duyệt.
7. Tạo result mang định danh gốc, publish tới Submission; chỉ hoàn tất delivery sau publisher confirm.
   Workspace/container được cleanup trên mọi đường đi.

Compile một lần/request là hành vi pipeline hiện có. Process state giữa testcase, cách dùng lại artifact
đã biên dịch và runtime budget tổng thể cần được review vì ảnh hưởng trực tiếp đến kết quả chấm.

## Yêu cầu chức năng

- **JDG-001-FR-001 — Nhận yêu cầu nội bộ:** Judge MUST xử lý yêu cầu đến từ luồng `judge.request` nội
  bộ với contract `JudgeRequest`; MUST NOT cung cấp endpoint công khai để gửi mã thực thi.
- **JDG-001-FR-002 — Xác thực payload:** Judge MUST kiểm tra cấu trúc, enum, định danh, giới hạn và
  trường bắt buộc trước khi tạo workspace hay chạy mã. Payload sai nhưng còn đủ định danh để đối
  chiếu MAY tạo `INTERNAL_ERROR`; payload không thể đối chiếu MUST đi theo chính sách poison message
  đã duyệt. Cả hai trường hợp MUST NOT chạy mã.
- **JDG-001-FR-003 — Cách xử lý loại STANDARD:** Với `problemType=STANDARD`, Judge MUST chạy mã như
  chương trình độc lập; dữ liệu của mỗi Test Case được cấp qua stdin và kết quả chương trình được
  lấy từ stdout.
- **JDG-001-FR-004 — Pipeline xác định:** Một request hợp lệ MUST đi qua các bước kiểm tra, chuẩn bị,
  chọn runner, biên dịch khi cần, thực thi, đánh giá và phân loại theo thứ tự. Thất bại ở bước trước
  MUST không chạy các bước sau không còn ý nghĩa.
- **JDG-001-FR-005 — Biên dịch một lần:** Runner cần biên dịch MUST được biên dịch một lần cho mỗi
  request trước khi chạy Test Case. Lỗi biên dịch MUST kết thúc request với `COMPILE_ERROR`, ngoại
  trừ phân loại timeout biên dịch được chốt tại JDG-002/JDG-005.
- **JDG-001-FR-006 — Test Case có thứ tự:** Judge MUST đánh giá Test Case theo thứ tự nhận từ
  Learning qua request; Judge MUST NOT sắp xếp lại. Test Case `SAMPLE` và `HIDDEN` do Learning gửi
  đều được đánh giá như nhau khi Submit theo LRN-002.
- **JDG-001-FR-007 — So sánh output:** Judge MUST so sánh stdout với `expectedOutput`; không so
  sánh stderr như output đáp án. Đề xuất giữ comparator hiện tại: đổi CRLF thành LF rồi loại bỏ toàn
  bộ whitespace cuối chuỗi; các whitespace ở giữa chuỗi được giữ nguyên. Chính sách này cần review vì
  `trimEnd()` bỏ nhiều hơn một newline cuối.
- **JDG-001-FR-008 — Verdict:** Judge MUST phân biệt ít nhất các trạng thái contract hiện có:
  `ACCEPTED`, `WRONG_ANSWER`, `COMPILE_ERROR`, `RUNTIME_ERROR`, `TIME_LIMIT_EXCEEDED`,
  `MEMORY_LIMIT_EXCEEDED`, `INTERNAL_ERROR`.
- **JDG-001-FR-009 — Đếm kết quả:** Result MUST báo `passedTests` và `totalTests` khi đánh giá bộ
  Test Case; test bị lỗi hoặc sai không được tính là passed.
- **JDG-001-FR-010 — Điểm:** Judge MUST báo điểm theo trọng số Test Case đã qua theo chính sách điểm
  được chốt; Judge MUST NOT dùng điểm để suy ra verdict. Judge MUST NOT biến một bộ Test Case rỗng
  thành một lần chấm đạt.
- **JDG-001-FR-011 — Thời gian:** Result MUST báo runtime theo quy tắc đo thống nhất và không vượt
  giới hạn nền tảng. Cách cộng thời gian giữa compile/startup/các test là câu hỏi mở.
- **JDG-001-FR-012 — Bộ nhớ:** Nếu contract báo `memoryKb`, giá trị MUST phản ánh số đo được hoặc
  quy ước không khả dụng đã chốt; MUST NOT giả lập số đo.
- **JDG-001-FR-013 — Bảo toàn định danh:** Result MUST giữ đúng `executionId`, `submissionId` và
  `mode` từ request.
- **JDG-001-FR-014 — Không trả dữ liệu ẩn:** Result MUST NOT chứa trường Test Case, expected output,
  harness, source code, tên file nội bộ hay Docker command. stdout/stderr của một lần Submit có thể
  phản chiếu input ẩn do chính chương trình in ra; các trường này MUST chỉ được gửi nếu chính sách
  lọc/giới hạn và quyền đọc tương ứng đã được phê duyệt. Khi chưa có chính sách, Submit result MUST
  bỏ các trường output thô đó.
- **JDG-001-FR-015 — Chẩn đoán biên dịch:** Với `COMPILE_ERROR`, result MAY có thông báo biên dịch
  đã được lọc phù hợp; nếu không phân tích được line/column thì vẫn trả thông báo tổng quát.
- **JDG-001-FR-016 — Output người dùng:** Judge MUST NOT dùng stdout/stderr làm kênh trao đổi với
  client công khai; việc lưu/hiển thị output Run thuộc Submission.
- **JDG-001-FR-017 — Dọn workspace:** Mọi đường kết thúc thành công, lỗi, timeout hoặc exception MUST
  cố gắng dọn workspace tạm của request.
- **JDG-001-FR-018 — Ưu tiên lỗi thực thi:** Nếu execution không kết thúc thành công, Judge MUST phân
  loại timeout/resource/exit outcome trước khi so output; testcase bị terminate MUST NOT được so với
  expected output.
- **JDG-001-FR-019 — Đếm testcase:** `totalTests` MUST là số testcase hợp lệ nhận được. `passedTests`
  MUST chỉ đếm testcase chạy xong và được comparator chấp nhận. Test chưa chạy do compile failure hay
  early stop MUST NOT tính là passed.
- **JDG-001-FR-020 — Biểu diễn kết quả chưa hoàn tất:** Khi dừng sớm hoặc gặp lỗi terminal, result
  MUST phân biệt test đã qua với tổng test; test chưa chạy MUST NOT bị tính như test đã chạy sai.
- **JDG-001-FR-021 — Bảo toàn mode:** Result MUST giữ nguyên `RUN` hoặc `SUBMIT` của request.
- **JDG-001-FR-022 — Result ổn định khi publish retry:** Nếu publish result thất bại, lần thử publish
  tiếp theo MUST giữ nguyên executionId, submissionId, mode, status và các số liệu đã tính.
- **JDG-001-FR-023 — ACK sau publish:** Request MUST NOT được ACK thành công trước khi publish result
  được broker xác nhận.
- **JDG-001-FR-024 — Payload lỗi không retry vô hạn:** Request không thể parse/validate MUST không
  chạy mã và MUST đi theo chính sách bounded retry/DLQ đã duyệt.
- **JDG-001-FR-025 — Log an toàn:** Judge MUST NOT ghi source, stdin/expected output ẩn, harness,
  credentials hay raw payload vào log vận hành.

## Quy tắc nghiệp vụ

- `ACCEPTED` có nghĩa chương trình hoàn tất mọi Test Case theo semantics của loại Problem; nó không
  tự quyết định hoàn tất Submission hoặc cập nhật tiến độ.
- `INTERNAL_ERROR` biểu thị Judge không thể kết luận do lỗi hệ thống, không phải lỗi lời giải.
- Test Case rỗng không được coi là bằng chứng lời giải đúng. LRN-002 yêu cầu Problem xuất bản có
  Test Case ẩn và tổng điểm dương; Judge đề xuất từ chối request không có testcase trước khi chạy.
  Việc mapping thành result hay DLQ phụ thuộc khả năng tương quan message và retry policy.
- SUB-002 quy định Submission coi kết quả đầu tiên đến là kết quả cuối cùng; đó là quy tắc ở
  Submission, không tự quy định Judge dừng ở testcase sai đầu tiên. Stop-on-first-failure là chính sách
  Judge riêng và hiện còn mở.
- Submission sở hữu ý nghĩa lưu trữ/chính thức của điểm, tiến độ và trạng thái bản ghi.

## Quyền và ranh giới

Chỉ thông điệp service-to-service được xác thực/được bảo vệ mới là nguồn request đáng tin cậy. Dữ
liệu nhận từ queue vẫn phải được kiểm tra. Client không được chọn Test Case, expected output,
harness, runner command hay giới hạn để vượt chính sách Learning/Judge.

## Đầu vào

`JudgeRequest`: `executionId`, `submissionId`, `mode`, `problemType`, `language`, `sourceCode`,
`testCases[]` (`stdin`, `expectedOutput`, `score`), tùy chọn `hiddenHarness`, `timeLimitMs`,
`memoryLimitMb`. Ràng buộc byte tối đa của LRN-002 áp dụng cho gói Test Case/harness; giới hạn mã
nguồn và trần execution của Judge cần được chốt.

| Trường                        | Kiểm tra tối thiểu đề xuất                             | Ghi chú                                                                                 |
| ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `executionId`, `submissionId` | Có, không rỗng, định dạng ID hợp lệ                    | Tương quan request/result                                                               |
| `mode`                        | Chỉ `RUN` hoặc `SUBMIT`                                | Giá trị khác bị từ chối                                                                 |
| `problemType`                 | Chỉ `STANDARD`, `FUNCTION`, `OOP`                      | Type-specific ở JDG-003/004                                                             |
| `language`                    | Nằm trong registry được hỗ trợ                         | Không nhận compiler/image tùy ý                                                         |
| `sourceCode`                  | Chuỗi UTF-8 trong giới hạn                             | Maximum chưa được chốt                                                                  |
| `testCases`                   | Mảng có thứ tự, không rỗng; với Submit tối đa 100 item | Giới hạn gói Learning trong LRN-002                                                     |
| `stdin`, `expectedOutput`     | Với Submit là chuỗi UTF-8; mỗi trường tối đa 1 MiB     | Gói Test Case/harness tối đa 8 MiB theo LRN-002; `expectedOutput` có thể vắng trong RUN |
| `score`                       | Với Submit là số nguyên không âm ở mỗi testcase        | Learning sở hữu trọng số; tổng điểm của Problem xuất bản dương                          |
| limits                        | Số dương và bị kẹp bởi platform ceiling                | Request không thể nới trần                                                              |
| `hiddenHarness`               | Chỉ dùng cho FUNCTION/OOP khi bắt buộc                 | Không log hoặc đưa vào result                                                           |

Các kiểm tra này mô tả hành vi cần có, không chọn thư viện hay DTO implementation.

## Đầu ra

`JudgeResult`: cùng định danh/mode; verdict; tùy chọn `passedTests`, `totalTests`, `score`,
`runtimeMs`, `memoryKb`, chẩn đoán compile. Kết quả gửi trên `judge.result` về Submission. Kết quả
không tạo bản ghi tại Judge.

| Trường                      | Quy tắc hiện đề xuất                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| ID, mode, status            | Có trên mọi result có thể tương quan                                                              |
| `passedTests`, `totalTests` | Có khi request chứa testcase array hợp lệ; dùng đúng nghĩa ở trên                                 |
| `score`                     | Chỉ có theo scoring policy; không tự gán 100/default khi thiếu dữ liệu                            |
| `runtimeMs`                 | Chỉ báo theo cách đo đã duyệt; không giả thành runtime toàn request                               |
| `memoryKb`                  | Chỉ báo nếu sandbox có metric thực đo tin cậy                                                     |
| stdout/stderr               | Với RUN cần có output để người học xem; với SUBMIT chỉ gửi theo chính sách lọc/quyền đọc đã duyệt |
| `compileOutput`, `error`    | Có thể vắng mặt; nếu có phải giới hạn và lọc nội dung                                             |

Contract hiện cho phép `stdout`/`stderr` tùy chọn. Cần chốt chúng đại diện test cuối, test lỗi hay
output duy nhất của RUN; implementation hiện tại trả output của lần execute cuối cùng được chạy.

## Tình huống lỗi

| Trường hợp                                        | Kết quả yêu cầu                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Payload sai hoặc thiếu trường                     | Không chạy mã; result tương quan nếu còn đủ ID, ngược lại xử lý poison message |
| Ngôn ngữ không hỗ trợ                             | Không chạy mã; `INTERNAL_ERROR`                                                |
| Compile thất bại                                  | `COMPILE_ERROR`; không chạy Test Case                                          |
| Compile/run timeout                               | Verdict timeout theo chính sách compile/runtime được chốt                      |
| Output vượt trần                                  | Kết thúc tiến trình; phân loại theo chính sách output được chốt                |
| Mismatch                                          | `WRONG_ANSWER`; xử lý các test còn lại theo chính sách dừng sớm                |
| Sandbox/container không sẵn sàng hoặc lỗi hạ tầng | `INTERNAL_ERROR`, không gán lỗi cho lời giải                                   |
| Lỗi bất ngờ                                       | `INTERNAL_ERROR`; không phát raw secret hay dữ liệu test ẩn                    |

Message JSON không parse được chưa có JudgeRequest để tạo JudgeResult có định danh. Broker hiện retry
handler failure tối đa ba lần rồi dead-letter. Vì vậy lỗi parse/thiếu ID không được mô tả như một
JudgeResult có thể tương quan; xử lý poison message thuộc contract messaging và cần review.

## Tình huống biên

- Một Test Case, stdin/expected output rỗng, output chỉ có newline, whitespace cuối dòng, UTF-8 và
  output rất lớn.
- Request Test Case rỗng, test có `expectedOutput` bị thiếu, score bằng 0 hoặc tổng score khác 100.
- Nhiều Test Case, lỗi ở test đầu/giữa/cuối, và một executionId được giao lại.
- Timeout khi compile, timeout khi khởi động, timeout khi chạy test; tiến trình bị kill nhưng container
  còn sống.
- Submission gửi `RUN` chỉ có một Test Case và không có expected output; semantics của trường hợp
  này cần khớp SUB-001.

## Tiêu chí nghiệm thu

- **JDG-001-AC-001:** Cho request STANDARD hợp lệ và mọi output khớp sau chuẩn hoá, result là
  `ACCEPTED` và báo đúng số test.
- **JDG-001-AC-002:** Cho một output không khớp, result là `WRONG_ANSWER` và không đếm test đó là đạt.
- **JDG-001-AC-003:** Cho lỗi biên dịch, result là `COMPILE_ERROR` và không có Test Case nào được chạy.
- **JDG-001-AC-004:** Cho lỗi runtime, timeout hoặc cạn bộ nhớ, result dùng verdict tương ứng đã
  định nghĩa và không báo `ACCEPTED`.
- **JDG-001-AC-005:** Result giữ nguyên execution/submission/mode từ request.
- **JDG-001-AC-006:** Không trường hợp nào trong result làm lộ stdin ẩn, expected output hoặc harness.
- **JDG-001-AC-007:** Workspace được dọn sau cả success và các đường lỗi có thể phục hồi.
- **JDG-001-AC-008:** Bộ Test Case rỗng không thể nhận `ACCEPTED` hay điểm tối đa theo mặc định.
- **JDG-001-AC-009:** `memoryKb` không được báo như số đo nếu sandbox không cung cấp số đo đáng tin.
- **JDG-001-AC-010:** Khi publish result thất bại, request không được ACK; khi message được giao lại,
  result vẫn giữ cùng executionId/submissionId/mode và Submission có thể bỏ kết quả terminal trùng.

## Ngoài phạm vi

- Quản lý Problem/Test Case/harness (Learning).
- Tạo Run/Submit, lưu lịch sử, trạng thái bản ghi, tiến độ và realtime (Submission).
- Ngôn ngữ mới hay chi tiết compiler/runtime cụ thể (JDG-002).
- Semantics FUNCTION/OOP và thiết kế harness tương ứng (JDG-003/JDG-004).
- Chính sách/cơ chế isolation chi tiết (JDG-005).
- Chấm thủ công, leaderboard, plagiarism detection, rejudge hoặc lưu trữ lịch sử Judge.

## Phụ thuộc

- [LRN-001 Problem](../../02-learning/problems/spec.md), [LRN-002 Test Case](../../02-learning/test-cases/spec.md)
- [SUB-001 Run](../../03-submission/run-code/spec.md), [SUB-002 Submit](../../03-submission/submit-code/spec.md)
- `libs/contracts/src/judge.contracts.ts`, [Kiến trúc Judge](../../../architecture/judge-service.md),
  [Judge security](../../00-system/judge-security.md)

## Câu hỏi mở

1. Với một mismatch, dừng ở test sai đầu tiên (hành vi code hiện có) hay tiếp tục để lấy đầy
   đủ thống kê? Điểm có tính riêng từng test đã qua trong cả hai trường hợp không?
2. Điểm result là tổng raw score hay chuẩn hoá về thang cố định? Có cho phép accepted với score 0?
   SUB-002 hiện cho phép accepted score 0 nhưng LRN-002 chỉ yêu cầu tổng score dương.
3. Test Case thiếu `expectedOutput` có hợp lệ cho RUN không? RUN hiện dùng stdin tùy ý; output có
   cần trả về cho Submission hay không và giới hạn lưu/hiển thị ở đâu?
4. Có duyệt giữ comparator hiện tại không: chuẩn hóa CRLF thành LF và gọi `trimEnd()` (bỏ toàn bộ
   whitespace cuối output, không chỉ newline)? Có cần Unicode normalization không?
5. Runtime tính theo từng testcase hay tổng tất cả testcase; có tính khởi động container không?
   Compile timeout là `COMPILE_ERROR` hay `TIME_LIMIT_EXCEEDED`?
6. Judge phải cung cấp memory usage thực đo? Nếu Docker không cung cấp số đo khả tín thì bỏ field hay
   dùng quy ước khác?
7. Output limit bị phân loại `RUNTIME_ERROR` hay verdict riêng? Contract hiện không có verdict riêng.
8. Delivery trùng cùng executionId có cần tính toán lại/publish result lần nữa không? Ai đảm bảo
   chống kết quả stale; hiện Submission dùng kết quả đến trước.
9. Request malformed có thể thiếu executionId; quy tắc publish lỗi và ACK/NACK/retry/DLQ cần được
   thống nhất với contract messaging.
10. Với `RUN`, SUB-001 hiện định nghĩa Run chỉ có thể kết thúc ở verdict phản ánh compile/execute
    hoặc trạng thái chạy xong; contract JudgeStatus không có `COMPLETED`. Judge/SUB-001 có cần mở rộng
    enum hay dùng `ACCEPTED` cho RUN mà không mang nghĩa được chấp nhận chính thức?
11. Cần trả stdout/stderr cho Run để người học quan sát chương trình. Có thể bỏ chúng khỏi SUBMIT để
    giảm khả năng rò rỉ; policy theo mode và giới hạn lưu trữ/hiển thị phải thống nhất với SUB-003.
12. Compile diagnostics có thể chứa đoạn source hoặc đường dẫn harness. Quy tắc lọc cụ thể và mức
    thông tin lỗi được phép gửi cho Submission/người học là gì?

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review | Tóm tắt                                                     |
| ---------- | --------- | -------------------- | ----------------------------------------------------------- |
| 2026-09-30 | 0.1       | Codex / chờ review   | Bản SRS đề xuất dựa trên tài liệu và code hiện có           |
| 2026-09-30 | 0.2       | Codex / chờ review   | Bổ sung pipeline, validation, result semantics và messaging |
