# JDG-003 Function Judge

## Trạng thái

Proposed — phiên bản 0.2, ngày 2026-09-30.

## Mục tiêu

Chấm bài `FUNCTION` bằng cách biên dịch/thực thi code người học cùng harness ẩn do Learning cấp,
không yêu cầu người học tự viết chương trình stdin/stdout hoàn chỉnh.

## Tác nhân và bối cảnh

Submission lấy judge package được bảo vệ từ Learning, gồm loại Problem, Test Case, expected output,
harness theo language, và gửi cho Judge. Learning sở hữu harness; Judge chỉ sử dụng trong một lần
thực thi và không lưu giữ sau đó. LRN-001/002 yêu cầu FUNCTION có starter code và harness theo mỗi
language đang bật.

## Yêu cầu chức năng

- **JDG-003-FR-001:** Với `problemType=FUNCTION`, Judge MUST dùng harness ẩn tương ứng language để
  gọi/kiểm tra phần hiện thực của người học.
- **JDG-003-FR-002:** Judge MUST từ chối payload thiếu harness hoặc có harness rỗng khi harness là
  bắt buộc; không được âm thầm chuyển sang semantics STANDARD.
- **JDG-003-FR-003:** Judge MUST coi harness là code tin cậy do Learning cung cấp qua Submission,
  nhưng vẫn chạy toàn bộ chương trình ghép trong sandbox như mã không tin cậy.
- **JDG-003-FR-004:** Harness MUST NOT được gửi trong JudgeResult, log công khai hoặc phản hồi client.
- **JDG-003-FR-005:** Input Test Case được chuyển tới harness theo contract đã định nghĩa cho loại
  FUNCTION; Judge MUST NOT tự suy đoán schema dữ liệu có cấu trúc.
- **JDG-003-FR-006:** Compile, timeout, runtime, output, verdict và điểm tuân theo JDG-001/JDG-002/
  JDG-005 sau khi semantics FUNCTION được xác định.
- **JDG-003-FR-007:** Nếu mã người học lỗi compile, Judge báo `COMPILE_ERROR` và không chạy test.
  Nếu lỗi do harness/configuration, Judge báo `INTERNAL_ERROR`; cách xác định nguồn lỗi phải được
  chốt trước Approved và không được chỉ dựa trên exit code.
- **JDG-003-FR-008:** Lỗi assertion/kiểm tra trong harness phải được chuyển thành kết quả test sai
  hoặc lỗi thực thi theo quy ước được chốt, không làm lộ harness.
- **JDG-003-FR-009 — Input testcase:** Judge MUST chuyển nguyên văn `stdin` của testcase tới process
  chạy harness; Judge không parse chuỗi thành JSON hay suy diễn kiểu tham số.
- **JDG-003-FR-010 — Expected output:** `expectedOutput` là stdout mong đợi do harness tạo ra cho
  testcase đó, theo LRN-002; Judge so sánh theo comparator chung JDG-001.
- **JDG-003-FR-011 — Cô lập testcase:** Mỗi testcase MUST tuân theo quy tắc process isolation/state
  chung đã duyệt. Judge MUST NOT để một testcase thay đổi kết quả testcase sau qua file/process state
  ngoài những gì policy cho phép.
- **JDG-003-FR-012 — Không đánh giá harness như đáp án:** Kết quả compile/runtime của harness và
  implementation được phân loại theo nguyên nhân; thông báo không được làm lộ source harness.

## Quy tắc nghiệp vụ

FUNCTION là loại Problem do Learning khai báo. Learning định nghĩa contract callable theo từng
language; Judge thực hiện contract đó nhưng không diễn dịch mô hình bài tập riêng ngoài những quy tắc
được thống nhất giữa Learning và Judge. Harness do server sở hữu, không đến từ client.

## Đầu vào/đầu ra

Input dùng `JudgeRequest` với `problemType=FUNCTION`, `hiddenHarness`, source, language và Test Case.
Theo LRN-002, Judge chuyển `stdin` nguyên văn cho harness; harness tự đọc input và in output để so với
`expectedOutput`. JudgeResult theo contract chung, không chứa harness hoặc dữ liệu Test Case.

## Lỗi và biên

Thiếu harness; harness không tương thích language; tên hàm/class không khớp; nhiều file/import;
Test Case rỗng hoặc dữ liệu cấu trúc sai; lỗi assertion; harness vượt timeout/memory/output; lỗi
compile chỉ phát sinh từ harness. Harness do Learning cấp nhưng vẫn không được quyền vượt sandbox.

## Tiêu chí nghiệm thu

- **JDG-003-AC-001:** FUNCTION request hợp lệ gọi implementation theo contract language đã khai báo.
- **JDG-003-AC-002:** Thiếu harness không được chạy như STANDARD.
- **JDG-003-AC-003:** Harness và nội dung test ẩn không xuất hiện trong result/log hướng client.
- **JDG-003-AC-004:** Harness hoặc submission gây timeout/resource exhaustion vẫn bị sandbox giới hạn.
- **JDG-003-AC-005:** Compile/runtime/test failure được phân loại theo contract chung sau khi policy
  FUNCTION được chốt.

## Ngoài phạm vi

Quản lý contract/harness (Learning), authoring UI, execution sandbox (JDG-005), OOP-specific
conventions (JDG-004), lịch sử/điểm chính thức (Submission).

## Phụ thuộc

[LRN-001](../../02-learning/problems/spec.md), [LRN-002](../../02-learning/test-cases/spec.md),
[JDG-001](../standard-judge/spec.md), [JDG-002](../language-runners/spec.md),
[JDG-005](../sandbox/spec.md), `JudgeRequest`.

## Câu hỏi mở

1. FUNCTION contract theo language gồm signature nào: tên hàm/class, kiểu tham số/return, overload,
   visibility, namespace/package và filename?
2. Harness được ghép vào source hay đặt thành file riêng? Contract hiện chỉ có một chuỗi
   `hiddenHarness` và một `sourceCode`.
3. Với C/C++, có quy tắc tên symbol/prototype/linking nào không; với Java, tên class/package nào bắt
   buộc; với Python, callable/import rule nào bắt buộc?
4. Assertion failure/expected exception của harness được ánh xạ sang `WRONG_ANSWER` hay
   `RUNTIME_ERROR`? Các trường hợp harness sai cấu hình được báo thế nào?
5. Có giới hạn API/library nào cho implementation không? Có cho phép file phụ/import ngoài image
   mặc định không?
6. Mỗi testcase chạy process mới hay cùng process? Nếu cùng process, state giữa testcase có chủ ý
   được chia sẻ không?

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review | Tóm tắt                                          |
| ---------- | --------- | -------------------- | ------------------------------------------------ |
| 2026-09-30 | 0.1       | Codex / chờ review   | SRS đề xuất                                      |
| 2026-09-30 | 0.2       | Codex / chờ review   | Làm rõ stdin thô và expected output theo LRN-002 |
