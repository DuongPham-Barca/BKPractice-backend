# Phiếu duyệt bộ SRS, plan và tasks của Judge

Ngày chuẩn bị: 2026-09-30. Tài liệu này giúp duyệt đồng thời năm phạm vi JDG; nó không thay thế quyết định trong từng `spec.md`.

## Tình trạng tài liệu

| Phạm vi          | Spec                             | Plan                                   | Tasks                                    | Kết luận hiện tại                      |
| ---------------- | -------------------------------- | -------------------------------------- | ---------------------------------------- | -------------------------------------- |
| JDG-001 Standard | [spec](standard-judge/spec.md)   | [plan draft](standard-judge/plan.md)   | [tasks draft](standard-judge/tasks.md)   | Chờ quyết định chấm/Run/output/message |
| JDG-002 Runners  | [spec](language-runners/spec.md) | [plan draft](language-runners/plan.md) | [tasks draft](language-runners/tasks.md) | Chờ toolchain/entrypoint/limits        |
| JDG-003 Function | [spec](function-judge/spec.md)   | [plan draft](function-judge/plan.md)   | [tasks draft](function-judge/tasks.md)   | Chờ callable/harness contract          |
| JDG-004 OOP      | [spec](oop-judge/spec.md)        | [plan draft](oop-judge/plan.md)        | [tasks draft](oop-judge/tasks.md)        | Chờ OOP/harness contract               |
| JDG-005 Sandbox  | [spec](sandbox/spec.md)          | [plan draft](sandbox/plan.md)          | [tasks draft](sandbox/tasks.md)          | Chờ trần tài nguyên/quyền ghi/cleanup  |

Tất cả spec đang `Proposed` v0.2. Các plan/tasks là **draft để review theo yêu cầu người dùng**; chúng có cổng bắt buộc xác nhận spec Approved và câu hỏi mở đã đóng trước khi triển khai. Không có code, cấu hình hoặc migration nào được thay đổi trong gói này.

Tasks đã được phân rã thành các đầu việc có mã riêng, có phụ thuộc, đầu ra review và evidence kiểm chứng theo FR/AC. Mỗi plan có thêm lát cắt triển khai, điểm chạm file dự kiến, đầu ra và điều kiện bắt đầu. Các đường dẫn/file mới chỉ là điểm dự kiến theo cấu trúc hiện tại; không mở rộng phạm vi hoặc đóng thay câu hỏi sản phẩm.

## Kết quả đối chiếu nguồn

- **Kiến trúc:** Cả năm plan dùng đúng `Hexagonal Architecture (Ports & Adapters) + Pipeline` theo ADR 0002. Judge là stateless, không có database/repository/entity; consumer là driving adapter, runner/sandbox và publish là các ranh giới driven.
- **Quyền sở hữu:** Learning sở hữu Problem/Test Case/harness; Submission sở hữu Run/Submit, lịch sử và tiến độ; Judge chỉ thực thi, đánh giá, phân loại và gửi result. Không plan nào yêu cầu truy cập DB service khác.
- **Contract hiện có:** `JudgeRequest`, `JudgeResult`, enum language/type/status và Rabbit topology nằm trong `libs/contracts`; giá trị mới chỉ được thêm nếu có quyết định contract tương thích với Submission/Learning.
- **Dữ liệu Learning đã chốt:** LRN-002 Approved quy định tối đa 100 testcase, mỗi stdin/expected output tối đa 1 MiB, tổng testcase/harness tối đa 8 MiB; FUNCTION/OOP harness đọc stdin thô và in stdout cần so; testcase SAMPLE cũng được chấm khi Submit.
- **Bảo mật:** JDG-005 bảo toàn network off, CPU/memory/time/PID/output limits, privilege tối thiểu, workspace riêng và cleanup. Bản code hiện tại có workspace quyền rộng, bind mount read-write, kết luận OOM từ exit code 137 và chưa đo memory; plan không coi các hành vi đó là chuẩn đã duyệt.
- **Messaging:** Code hiện dùng publisher confirm, manual ACK, retry tối đa ba lần và DLQ. Plan JDG-001 yêu cầu chốt chính sách poison message/duplicate/cleanup failure, tránh thay shared `RabbitMqService` làm đổi service khác.

## Quyết định cần chốt trước khi đổi spec sang Approved

| Mã   | Phạm vi               | Cần quyết định                                                                                                           | Vì sao chặn plan/implementation                                                     |
| ---- | --------------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| D-01 | JDG-001               | Dừng ở test sai đầu tiên hay chạy hết; điểm là tổng trọng số đã qua hay thang chuẩn hóa                                  | Quyết định verdict, `passedTests`, `score`, runtime và testcase cần chạy            |
| D-02 | JDG-001 + SUB-001     | RUN thành công dùng `ACCEPTED` với `mode=RUN` hay thêm status hoàn tất riêng; stdout/stderr của RUN được trả/lưu đến đâu | Contract `JudgeStatus` hiện không có `COMPLETED`; SUB-001 còn Proposed              |
| D-03 | JDG-001               | Giữ comparator CRLF→LF + `trimEnd()` hay quy tắc whitespace khác                                                         | Có thể đổi kết quả ACCEPTED/WRONG_ANSWER cho cùng một lời giải                      |
| D-04 | JDG-001 + SUB-002/003 | Với SUBMIT, bỏ stdout/stderr thô hay lọc/ẩn bằng chính sách quyền đọc cụ thể; compiler diagnostics nào được phép gửi     | Chương trình có thể tự in hidden stdin; SUB-002 có yêu cầu lưu chi tiết kết quả     |
| D-05 | JDG-001/005           | Runtime gồm container startup/compile không; compile timeout, output-limit và cleanup failure map verdict/ACK thế nào    | Thay đổi đo thời gian, verdict và retry; contract chưa có status riêng              |
| D-06 | JDG-001/005           | Có cần `memoryKb` thật không; tín hiệu OOM nào đủ đáng tin                                                               | Code hiện không đo memory; exit 137 không chứng minh OOM                            |
| D-07 | JDG-001/005           | Retry/backoff/DLQ cho invalid request, publish failure và duplicate execution; giới hạn một request được tính lại        | Worker stateless có thể chạy lại sau redelivery; result phải tương thích Submission |
| D-08 | JDG-002               | Version/image policy, Java entrypoint, Python syntax check và giới hạn source/diagnostics                                | Ảnh hưởng compile result và tính tương thích bài giải                               |
| D-09 | JDG-003               | Callable signature theo bốn language, cách đặt source/harness, lỗi assertion và cách phân biệt lỗi harness               | Ghép chuỗi hiện tại không bảo đảm đúng; không thể gán lỗi theo exit code đơn lẻ     |
| D-10 | JDG-004               | Class/method contract theo bốn language, định dạng thao tác trong stdin, multi-file/state policy, lỗi harness            | Transport hiện chỉ có source/harness dạng chuỗi; có thể cần đổi contract            |
| D-11 | JDG-005               | Trần platform cho CPU/memory/time/PID/output/disk/source; quyền ghi workspace/testcase, disk/FD/seccomp và cleanup       | Cần giá trị/biện pháp cụ thể để kiểm chứng yêu cầu bảo mật                          |

Các câu hỏi chi tiết dưới mục **Câu hỏi mở** của mỗi spec vẫn cần được đóng khi duyệt. Bảng trên gộp chúng thành các quyết định có tác động lớn nhất; không tự chọn một phương án khi chưa có phản hồi của chủ sở hữu.

## Thứ tự duyệt đề xuất

1. Chốt JDG-005 và JDG-002 vì giới hạn sandbox và runner quyết định những gì JDG-001 có thể đo/thực thi.
2. Chốt JDG-001 cùng các điểm giao với SUB-001/SUB-002/SUB-003, nhất là RUN status, scoring và output của SUBMIT.
3. Chốt callable/OOP contracts với Learning rồi duyệt JDG-003 và JDG-004.
4. Cập nhật từng spec lên `Approved` theo quyền review của repository; sau đó cập nhật plan thành reviewed và tasks thành checklist triển khai chính thức.

## Mẫu phản hồi duyệt

Bạn có thể ghi quyết định theo `D-01` đến `D-11`, hoặc đánh dấu riêng từng scope JDG nào được duyệt. Khi có quyết định, nội dung spec được sửa trước; plan/tasks được đối chiếu lại với phiên bản Approved, không tự thêm yêu cầu.
