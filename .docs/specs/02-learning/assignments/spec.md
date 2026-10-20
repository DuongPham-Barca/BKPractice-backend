# LRN-005 Quản lý Assignment

## Trạng thái

Approved

Phiên bản `1.0`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất).

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép Giảng viên sở hữu một Class giao bài tập (Assignment) cho lớp đó — một danh sách Problem đã
xuất bản có thứ tự, có điểm tối đa từng bài, thời điểm mở và hạn chót — và cho phép sinh viên của
lớp xem bài tập đã mở, đồng thời định nghĩa quy tắc chấm điểm xác định từ tiến độ giải bài mà
Learning đã ghi nhận, không cần một luồng nộp bài riêng cho bài tập. Việc hiển thị điểm thuộc LRN-006.

## Tác nhân

- **LECTURER:** Người dùng giảng dạy đã xác thực, là chủ sở hữu Class (LRN-004), tạo và quản lý
  Assignment của Class đó khi có quyền `assignment:*` cần thiết.
- **STUDENT:** Người học đã xác thực, đang đăng ký trong Class; xem Assignment đã xuất bản và đã tới
  thời điểm mở.
- **ADMIN:** Không mặc nhiên có thẩm quyền với Assignment, giống LRN-001 và LRN-003.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ header định danh do client gửi, chuyển tiếp ngữ
  cảnh định danh, vai trò và quyền đã xác minh (`x-auth-user-id`, `x-auth-roles`,
  `x-auth-permissions`, ID-003 0.4).
- **Learning Service:** Chủ sở hữu Assignment, danh sách Problem của Assignment và quy tắc chấm điểm.
- **Submission Service:** Không tương tác trực tiếp với LRN-005. Nó chỉ phát `submission.accepted`
  mà LRN-006 tiêu thụ để ghi tiến độ; LRN-006 áp dụng quy tắc chấm của LRN-005 lên tiến độ đó.

## Bối cảnh

Trong BKPractice, Course (LRN-003) là khung nội dung của môn, Class (LRN-004) là lớp học phần của
một kỳ thuộc một Course, còn **Assignment là bài tập giao cho đúng một Class**, có thời điểm mở và
hạn chót. Assignment không có luồng nộp bài riêng: sinh viên nộp bài vào Problem như bình thường
(SUB-002), và một Problem trong Assignment được tính đạt nếu tiến độ của sinh viên (LRN-006) ghi
nhận lần giải đầu tiên không muộn hơn hạn chót. LRN-005 định nghĩa quy tắc chấm và dữ liệu chấm;
LRN-006 (LRN-006-FR-013, FR-016) hiển thị điểm của sinh viên và của lớp theo đúng quy tắc này.

Nền tảng hiện có (khảo sát `apps/learning-service`):

- Bảng `assignments` (migration `1700000003000-InitialLearningSchema.ts`, entity
  `modules/assignments/entities/assignment.entity.ts`): `id` uuid, `title` varchar(200) NOT NULL,
  `course_id` uuid cho phép null tham chiếu `courses` `ON DELETE SET NULL`, `class_id` uuid cho phép
  null tham chiếu `classes` `ON DELETE CASCADE`, `lecturer_id` uuid NOT NULL, `starts_at` và
  `deadline_at` timestamptz cho phép null. Chưa có mô tả, trạng thái vòng đời, dấu xoá hay mốc thời
  gian tạo/cập nhật.
- Bảng `assignment_problems`: `assignment_id` (xoá theo Assignment), `problem_id` tham chiếu
  `problems` `ON DELETE CASCADE`, `max_score` integer mặc định `100`, `display_order` integer mặc
  định `0`, `UNIQUE (assignment_id, problem_id)`. Không có ràng buộc trên điểm hay thứ tự.
- Bảng `progress`: `(user_id, problem_id)` duy nhất, `status`, `best_score`, `solved_at`,
  `last_event_id`. `ProgressConsumer` hiện đánh dấu `SOLVED` và đặt `solved_at` một lần từ
  `occurredAt` của `submission.accepted`.
- Gateway đã chuyển tiếp tiền tố `/api/assignments` và `/api/classes` tới Learning. Learning chưa có
  controller, module hay API nào cho Assignment; module `assignments` chỉ chứa entity.

Mã nguồn hiện tại là hành vi nền tảng, không phải bản triển khai của đặc tả này. Theo quyết định đã
phê duyệt, Assignment bắt buộc thuộc một Class; khả năng `class_id` rỗng của schema ban đầu không phản
ánh mô hình này, còn cột `course_id` không được LRN-005 dùng (xem `plan.md`).

## Yêu cầu chức năng

- **LRN-005-FR-001 — Quyền sở hữu của Learning:** Learning MUST sở hữu Assignment, danh sách Problem
  của Assignment và quy tắc chấm điểm. Không service nào khác lưu hay sửa các dữ liệu này.
- **LRN-005-FR-002 — Thuộc đúng một Class:** Mọi Assignment MUST thuộc đúng một Class của LRN-004,
  xác định khi tạo và không đổi sau đó. Assignment MUST có định danh ổn định.
- **LRN-005-FR-003 — Tạo Assignment:** Chủ sở hữu Class có quyền `assignment:create` MUST có thể tạo
  Assignment ở trạng thái `DRAFT` cho Class `ACTIVE` của mình, với tiêu đề, mô tả tuỳ chọn, và tuỳ
  chọn `startsAt`, `deadlineAt`. Người tạo MUST lấy từ ngữ cảnh xác thực tin cậy.
- **LRN-005-FR-004 — Cập nhật thông tin:** Chủ sở hữu có thẩm quyền MUST có thể sửa tiêu đề, mô tả,
  `startsAt` và `deadlineAt` theo quy tắc chỉnh sửa ở mục Quy tắc nghiệp vụ.
- **LRN-005-FR-005 — Danh sách Problem:** Chủ sở hữu có thẩm quyền MUST có thể thiết lập danh sách
  Problem có thứ tự của Assignment, mỗi mục gồm định danh Problem và `maxScore`. Chỉ Problem
  `PUBLISHED` chưa xoá mềm (của bất kỳ ai) được thêm; mỗi Problem xuất hiện tối đa một lần trong một
  Assignment. Problem không bắt buộc thuộc Course của Class.
- **LRN-005-FR-006 — Vòng đời:** Assignment MUST đi theo vòng đời ở mục Quy tắc nghiệp vụ:
  `DRAFT` → `PUBLISHED`; xoá hẳn Assignment `DRAFT`; xoá mềm Assignment `PUBLISHED` và khôi phục về
  `PUBLISHED`. Chuyển trạng thái là hành động riêng, không phải trường chỉnh sửa tự do.
- **LRN-005-FR-007 — Điều kiện xuất bản:** Assignment MUST chỉ được xuất bản khi: tiêu đề không rỗng;
  có cả `startsAt` và `deadlineAt`; `startsAt` < `deadlineAt`; `deadlineAt` sau thời điểm xuất bản;
  có ít nhất một Problem; mọi Problem trong danh sách đang `PUBLISHED` và chưa xoá mềm; Class đang
  `ACTIVE`. Việc xuất bản MUST nguyên tử, kiểm tra trên state đã lưu và báo mọi điều kiện còn thiếu.
- **LRN-005-FR-008 — Hiển thị cho sinh viên:** Sinh viên đang đăng ký trong Class MUST thấy được một
  Assignment khi và chỉ khi nó `PUBLISHED`, chưa xoá mềm và thời điểm hiện tại ≥ `startsAt`. Mọi
  Assignment khác MUST không xuất hiện với sinh viên và tra cứu trực tiếp trả không tìm thấy.
- **LRN-005-FR-009 — Liệt kê theo Class:** Sinh viên đang đăng ký MUST có thể liệt kê các Assignment
  hiển thị được của Class. Chủ sở hữu có thẩm quyền MUST có thể liệt kê
  mọi Assignment của Class mình ở mọi trạng thái, kể cả đã xoá mềm khi được yêu cầu.
- **LRN-005-FR-010 — Quy tắc chấm điểm:** Với một sinh viên và một Assignment, mỗi Problem được tính
  **đạt** khi tiến độ của sinh viên với Problem đó có thời điểm giải đầu tiên (`solved_at`, LRN-006)
  không muộn hơn `deadlineAt` (so sánh `≤`). Lần giải trước khi Assignment được tạo hay mở cũng được
  tính. Điểm một Problem bằng `maxScore` nếu đạt, `0` nếu không. Điểm Assignment bằng tổng điểm các
  Problem được tính.
- **LRN-005-FR-011 — Hiển thị điểm thuộc LRN-006:** Điểm của một sinh viên trên Assignment và điểm
  của cả lớp MUST được hiển thị qua LRN-006 (LRN-006-FR-013, FR-016), áp dụng đúng quy tắc
  LRN-005-FR-010, FR-013, FR-014, FR-015. LRN-005 MUST NOT cung cấp đường đọc điểm thứ hai hay quy tắc
  chấm khác.
- **LRN-005-FR-012 — Dữ liệu chấm điểm:** Assignment MUST lưu đủ dữ liệu để áp dụng quy tắc chấm mà
  không cần thêm gì từ LRN-005: Class, `deadlineAt`, danh sách Problem có thứ tự kèm `maxScore`, và các
  trường quyết định hiển thị với sinh viên (trạng thái, xoá mềm, `startsAt`).
- **LRN-005-FR-013 — Điểm tính khi đọc:** Điểm MUST được tính từ tiến độ hiện có và hạn chót hiện
  tại tại thời điểm đọc; không lưu bản sao điểm. Đổi hạn chót theo quy tắc cho phép làm kết quả thay
  đổi tương ứng. Trước hạn chót điểm là tạm tính; sau hạn chót điểm được coi là đã chốt, trừ khi hạn
  chót được gia hạn.
- **LRN-005-FR-014 — Không nộp trễ:** Lần giải sau `deadlineAt` MUST NOT được cộng điểm. Không có
  gia hạn riêng cho từng sinh viên hay hệ số phạt trễ ở v1.
- **LRN-005-FR-015 — Toàn vẹn khi Problem đổi trạng thái:** Khi một Problem trong Assignment chuyển
  sang `ON_HOLD` hoặc bị xoá mềm, tham chiếu MUST được giữ lại; trong thời gian đó Problem MUST bị ẩn
  khỏi biểu diễn sinh viên và không tính vào điểm lẫn tổng điểm tối đa. Khi Problem xuất bản lại hoặc
  được khôi phục, nó MUST hiển thị và được tính lại ở đúng vị trí.
- **LRN-005-FR-016 — Đọc ở phía quản lý:** Chủ sở hữu có thẩm quyền MUST có thể xem Assignment của
  mình ở mọi trạng thái, kèm trạng thái hiện tại của từng Problem đã xếp và các điều kiện xuất bản còn
  thiếu.
- **LRN-005-FR-017 — Nội dung an toàn:** Mô tả Assignment MUST dùng Markdown hạn chế như
  LRN-001-FR-029: backend kiểm tra độ dài, từ chối HTML/script thô; frontend làm sạch khi render.
- **LRN-005-FR-018 — Giới hạn:** Tiêu đề tối đa 200 ký tự; mô tả tối đa 20.000 ký tự; một Assignment
  có tối đa 50 Problem; `maxScore` là số nguyên từ 1 tới 1.000, mặc định 100.
- **LRN-005-FR-019 — Class đã lưu trữ:** Khi Class `ARCHIVED` (LRN-004), Assignment của nó MUST vẫn
  đọc được theo quy tắc hiển thị và vẫn được chấm theo quy tắc, nhưng mọi thao tác thay đổi Assignment
  (tạo, sửa, thiết lập Problem, xuất bản, xoá, khôi phục) MUST bị từ chối với lỗi trạng thái không hợp
  lệ.
- **LRN-005-FR-020 — Retry xác định:** Thao tác thất bại MUST để nguyên state; thao tác đọc lặp lại
  MUST NOT làm thay đổi state.
- **LRN-005-FR-021 — Không sở hữu nộp bài hay tiến độ:** LRN-005 MUST NOT nhận bài nộp, chấm lại mã,
  ghi hay sửa tiến độ, và MUST NOT gọi Submission hay truy vấn cơ sở dữ liệu của Submission.

## Quy tắc nghiệp vụ

### Cấu trúc

```text
Class (LRN-004, chủ sở hữu = lecturer_id)
 └── Assignment 0..n
      ├── tiêu đề, mô tả (Markdown hạn chế), startsAt, deadlineAt, trạng thái, người tạo, mốc thời gian
      └── Problem 1..50 (có thứ tự, tham chiếu theo ID của LRN-001, kèm maxScore)
```

- Chủ sở hữu Assignment là chủ sở hữu hiện tại của Class chứa nó.
- Một Problem có thể nằm trong nhiều Assignment, kể cả của cùng một Class.

### Vòng đời

| Trạng thái      | Sinh viên thấy                  | Chỉnh sửa được             | Ý nghĩa                                   |
| --------------- | ------------------------------- | -------------------------- | ----------------------------------------- |
| `DRAFT`         | Không                           | Có                         | Đang soạn; xoá hẳn được                   |
| `PUBLISHED`     | Có, khi thời điểm hiện tại ≥ mở | Có, theo quy tắc bên dưới  | Đã giao cho lớp                           |
| `DELETED` (mềm) | Không                           | Không (chỉ khôi phục được) | Đã xoá mềm, khôi phục được về `PUBLISHED` |

- Không có bước chuyển từ `PUBLISHED` về `DRAFT`, không có tạm giữ ở v1.
- Các bước chuyển bị cấm (xuất bản khi không `DRAFT`, xoá mềm hay khôi phục sai trạng thái) trả lỗi
  trạng thái không hợp lệ và không đổi state.
- Khôi phục không kiểm tra lại điều kiện xuất bản.

### Quy tắc chỉnh sửa

| Thành phần        | `DRAFT`  | `PUBLISHED`, trước `startsAt`         | `PUBLISHED`, từ `startsAt` trở đi              |
| ----------------- | -------- | ------------------------------------- | ---------------------------------------------- |
| Tiêu đề, mô tả    | Sửa được | Sửa được                              | Sửa được                                       |
| `startsAt`        | Sửa được | Sửa được, vẫn phải < `deadlineAt`     | Không sửa được                                 |
| `deadlineAt`      | Sửa được | Sửa được, vẫn phải > `startsAt`       | Chỉ lùi về sau (gia hạn), kể cả khi đã quá hạn |
| Danh sách Problem | Sửa được | Sửa được, phải giữ điều kiện xuất bản | Không sửa được                                 |

- Khi cả hai được đặt, `startsAt` MUST nhỏ hơn `deadlineAt` ở mọi trạng thái.
- Sửa Assignment `PUBLISHED` MUST NOT làm nó mất điều kiện về danh sách Problem và lịch ở
  LRN-005-FR-007 (trừ điều kiện "hạn chót sau thời điểm xuất bản", chỉ áp dụng lúc xuất bản).
- Thay đổi thời gian dùng đồng hồ của server, lưu và so sánh ở dạng có múi giờ (UTC).

### Chấm điểm

- Nguồn dữ liệu duy nhất là thời điểm giải đầu tiên (`solved_at`) do LRN-006 ghi từ `occurredAt`
  của `submission.accepted`. Không có `solved_at` nghĩa là chưa giải.
- Đạt: `solved_at ≤ deadlineAt`. Không đạt: `solved_at > deadlineAt` hoặc chưa giải.
- Tổng điểm tối đa là tổng `maxScore` của các Problem đang hiển thị (LRN-005-FR-015).
- Chỉ sinh viên đang đăng ký trong Class được chấm; tiến độ của sinh viên đã rời lớp vẫn còn (LRN-006)
  nhưng không được chấm cho Assignment của lớp đó.

### Quan hệ với tính năng khác

- Class và Enrollment thuộc LRN-004. Trạng thái Course (LRN-003) không trực tiếp đổi Assignment;
  ảnh hưởng tới Class thuộc LRN-004.
- Tiến độ và việc hiển thị điểm thuộc LRN-006. LRN-006 cài đặt phép tính điểm theo đúng quy tắc
  LRN-005 và là nơi duy nhất cài đặt phép tính đó.

## Quy tắc phân quyền

- Mọi thao tác cần người dùng đã xác thực.
- Thao tác quản lý cần quyền tương ứng cộng với quyền sở hữu Class (chủ sở hữu Class là giảng viên
  `lecturer_id` của LRN-004, so với principal tin cậy):

  | Thao tác                                   | Quyền                     |
  | ------------------------------------------ | ------------------------- |
  | Tạo                                        | `assignment:create`       |
  | Đọc phía quản lý, liệt kê phía quản lý     | `assignment:read-managed` |
  | Sửa thông tin, thiết lập danh sách Problem | `assignment:update`       |
  | Xuất bản                                   | `assignment:publish`      |
  | Xoá hẳn nháp, xoá mềm                      | `assignment:delete`       |
  | Khôi phục                                  | `assignment:restore`      |

- Sáu quyền `assignment:*` được seed tĩnh ở Identity và chỉ gán cho `LECTURER`, theo ID-003-FR-017.
- Quyền đến từ header `x-auth-permissions` do Gateway đặt; thiếu header thì coi là không có quyền.
- Đọc hướng sinh viên không cần quyền mới: người gọi MUST đang đăng ký trong Class (LRN-004). Người
  không phải thành viên nhận không tìm thấy.
- `ADMIN` không có thẩm quyền ngầm; `STUDENT` không quản lý được Assignment; giảng viên không phải chủ
  sở hữu Class không quản lý được Assignment của Class đó.
- Quyền xem điểm (của chính mình, hay của lớp với `class:read-managed`) thuộc LRN-006.
- Thêm Problem vào Assignment không cấp quyền nào với Problem đó.
- Phân quyền thiếu hoặc mơ hồ mặc định là từ chối.

## Đầu vào

- **Tạo:** định danh Class, tiêu đề, mô tả tuỳ chọn, `startsAt` và `deadlineAt` tuỳ chọn (thời điểm
  ISO 8601 có múi giờ). Không nhận người tạo, trạng thái, mốc thời gian hệ thống.
- **Cập nhật thông tin:** tiêu đề, mô tả, `startsAt`, `deadlineAt`.
- **Thiết lập danh sách Problem:** danh sách có thứ tự các mục `{ định danh Problem, maxScore }`,
  thay thế toàn bộ danh sách hiện có.
- **Chuyển trạng thái:** định danh Assignment và ngữ cảnh tác nhân tin cậy.
- **Liệt kê/xem:** định danh Class hoặc Assignment, phân trang, lọc trạng thái phía quản
  lý.

Route và DTO cụ thể thuộc `plan.md`.

## Đầu ra

- **Biểu diễn hướng sinh viên:** định danh, tiêu đề, mô tả, `startsAt`, `deadlineAt`, danh sách
  Problem hiển thị theo thứ tự (định danh, slug, tiêu đề, độ khó, `maxScore`) và tổng điểm tối đa.
  Không có trạng thái nội bộ, người tạo, Problem bị ẩn hay tiến độ của người khác.
- **Liệt kê hướng sinh viên:** tóm tắt phân trang (định danh, tiêu đề, `startsAt`, `deadlineAt`,
  tổng điểm tối đa).
- **Biểu diễn quản lý:** thêm trạng thái, mốc thời gian, Class, trạng thái hiện tại của từng Problem
  đã xếp, và các điều kiện xuất bản còn thiếu.
- LRN-005 không phát domain event nào.

## Tình huống lỗi

| Trường hợp                                                             | Hành vi quan sát được                                    |
| ---------------------------------------------------------------------- | -------------------------------------------------------- |
| Thiếu hoặc sai xác thực                                                | `401`; không thay đổi state                              |
| Thiếu quyền hoặc không phải chủ sở hữu Class                           | `403`; không thay đổi state                              |
| Class/Assignment không tồn tại, hoặc không hiển thị với người gọi      | `404`; không lộ Assignment chưa mở hay nháp              |
| Class `ARCHIVED`, hoặc Assignment không ở trạng thái cho phép thao tác | Lỗi trạng thái không hợp lệ; không thay đổi state        |
| Sửa thành phần đã bị khoá theo quy tắc chỉnh sửa                       | Lỗi trạng thái không hợp lệ; không thay đổi state        |
| `startsAt` ≥ `deadlineAt`, hoặc rút ngắn hạn chót sau khi đã mở        | Lỗi kiểm tra dữ liệu; không thay đổi state               |
| Problem không tồn tại, chưa `PUBLISHED` hoặc đã xoá mềm khi thêm       | Lỗi kiểm tra dữ liệu; không lộ Problem chưa công khai    |
| Problem trùng trong danh sách                                          | Lỗi kiểm tra dữ liệu; không thay đổi state               |
| `maxScore` ngoài 1..1.000, quá 50 Problem, tiêu đề/mô tả quá dài       | Lỗi kiểm tra dữ liệu; không thay đổi state               |
| Mô tả có HTML/script thô                                               | Lỗi kiểm tra dữ liệu                                     |
| Xuất bản khi chưa đủ điều kiện                                         | Lỗi mức độ sẵn sàng kèm danh sách điều kiện; giữ `DRAFT` |
| Thay đổi làm Assignment `PUBLISHED` mất điều kiện về Problem hoặc lịch | Lỗi mức độ sẵn sàng; không thay đổi state                |

LRN-005 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- **Thời điểm có kết quả khác thời điểm nộp:** `occurredAt` của `submission.accepted` là lúc
  Submission ghi kết quả chấm, không phải lúc sinh viên nộp. Bài nộp sát hạn chót nhưng chấm xong sau
  hạn chót có `solved_at` sau hạn chót và bị tính không đạt. Đây là giới hạn đã chấp nhận ở v1; giảng
  viên có thể gia hạn hạn chót. LRN-005 MUST NOT tự đổi contract của sự kiện.
- `solved_at` đúng bằng `deadlineAt` được tính đạt.
- Sinh viên đã giải Problem trước khi Assignment được tạo nhận đủ điểm Problem đó ngay khi Assignment
  mở.
- Sinh viên đăng ký vào lớp sau hạn chót vẫn được chấm theo cùng quy tắc; sinh viên đã rời hoặc bị gỡ
  khỏi lớp không còn xem được Assignment và không còn được chấm cho Assignment đó.
- `startsAt` ở quá khứ lúc xuất bản làm Assignment hiển thị ngay.
- Mọi Problem của một Assignment đã xuất bản bị tạm giữ sau đó: Assignment vẫn hiển thị với danh
  sách rỗng và tổng điểm tối đa `0`; không tự đổi trạng thái.
- Gia hạn sau khi đã quá hạn làm các lần giải trước hạn mới trở thành đạt.
- Hai thao tác quản lý đồng thời trên cùng Assignment để lại một state nhất quán.
- Assignment đã xoá mềm không xuất hiện với sinh viên, kể cả khi sinh viên có tiến độ trên các
  Problem của nó.

## Yêu cầu bảo mật

- **LRN-005-SR-001 — Phân quyền phía server:** Quyền, quyền sở hữu Class, tư cách thành viên và trạng
  thái kiểm tra tại backend.
- **LRN-005-SR-002 — Ngữ cảnh tin cậy:** Định danh và quyền chỉ từ header Gateway đã xác minh; không
  nhận định danh sinh viên hay giảng viên từ body hay query.
- **LRN-005-SR-003 — Không lộ nội dung chưa mở:** Assignment nháp, chưa tới `startsAt`, đã xoá mềm,
  và Problem chưa công khai MUST NOT lộ qua liệt kê, chi tiết, lỗi hay số đếm hướng sinh viên.
- **LRN-005-SR-004 — Không lộ tiến độ qua Assignment:** Biểu diễn Assignment của LRN-005 MUST NOT
  chứa tiến độ, điểm hay danh sách thành viên của sinh viên nào.
- **LRN-005-SR-005 — Không lộ dữ liệu judge:** Biểu diễn Assignment MUST NOT chứa Test Case, harness
  hay dữ liệu judge.
- **LRN-005-SR-006 — Chống gán hàng loạt:** Đầu vào liệt kê tường minh các trường được phép.
- **LRN-005-SR-007 — Nội dung an toàn:** Mô tả không thể thực thi script trên client.
- **LRN-005-SR-008 — Cách ly service:** Không truy vấn CSDL của service khác; không khoá ngoại xuyên
  service; định danh người dùng là UUID thuần.
- **LRN-005-SR-009 — Thất bại an toàn:** Ngữ cảnh thiếu hoặc mơ hồ thì từ chối và giữ nguyên state.

## Tiêu chí nghiệm thu

- **LRN-005-AC-001:** Cho trước chủ sở hữu Class `ACTIVE` có `assignment:create`, khi tạo Assignment
  hợp lệ, thì Assignment được tạo ở `DRAFT`, thuộc Class đó, với định danh ổn định và người tạo tin
  cậy.
- **LRN-005-AC-002:** Cho trước `STUDENT`, `ADMIN` chưa được cấp quyền, hoặc Giảng viên không sở hữu
  Class, khi thử thao tác quản lý, thì nhận `403` và state không đổi.
- **LRN-005-AC-003:** Cho trước người chưa xác thực, khi gọi bất kỳ thao tác nào, thì nhận `401`.
- **LRN-005-AC-004:** Cho trước Assignment `DRAFT` thiếu hạn chót, không có Problem, hoặc chứa Problem
  không còn `PUBLISHED`, khi xuất bản, thì thất bại nguyên tử và lỗi nêu mọi điều kiện còn thiếu.
- **LRN-005-AC-005:** Cho trước Assignment đủ điều kiện, khi chủ sở hữu xuất bản, thì nó thành
  `PUBLISHED`.
- **LRN-005-AC-006:** Cho trước Assignment `PUBLISHED` có `startsAt` ở tương lai, khi sinh viên của
  lớp liệt kê hoặc xem, thì nó không xuất hiện và tra cứu trực tiếp trả `404`; sau `startsAt` thì nó
  xuất hiện.
- **LRN-005-AC-007:** Cho trước Assignment `DRAFT` hoặc đã xoá mềm, khi sinh viên xem, thì nhận
  `404`.
- **LRN-005-AC-008:** Cho trước người dùng không đăng ký trong Class, khi xem Assignment đã mở của
  Class đó, thì nhận `404`.
- **LRN-005-AC-009:** Cho trước sinh viên có `solved_at` ≤ `deadlineAt` cho một Problem, khi áp dụng
  quy tắc chấm (qua LRN-006), thì Problem đó đạt và được `maxScore`; nếu `solved_at` > `deadlineAt` hoặc
  chưa giải thì được `0`; điểm Assignment là tổng các Problem.
- **LRN-005-AC-010:** Cho trước sinh viên đã giải một Problem trước khi Assignment được tạo, khi
  Assignment mở, thì Problem đó được tính đạt.
- **LRN-005-AC-011:** Cho trước `solved_at` đúng bằng `deadlineAt`, khi chấm, thì được tính đạt.
- **LRN-005-AC-012:** Cho trước một Problem trong Assignment đã xuất bản bị tạm giữ, khi sinh viên
  xem, thì Problem đó không xuất hiện và không tính vào điểm lẫn tổng điểm tối đa; khi xuất bản lại
  thì xuất hiện lại đúng vị trí và được tính.
- **LRN-005-AC-013:** Cho trước một Assignment bất kỳ, khi đọc dữ liệu chấm, thì có đủ Class,
  `deadlineAt`, danh sách Problem có thứ tự kèm `maxScore`, và các trường quyết định hiển thị.
- **LRN-005-AC-014:** Cho trước biểu diễn Assignment hướng sinh viên hay quản lý, khi kiểm tra, thì
  không chứa tiến độ hay điểm của sinh viên nào, và LRN-005 không có route đọc điểm.
- **LRN-005-AC-015:** Cho trước Assignment `PUBLISHED` đã tới `startsAt`, khi chủ sở hữu sửa danh sách
  Problem, sửa `startsAt` hay rút ngắn `deadlineAt`, thì bị từ chối và state không đổi; khi gia hạn
  `deadlineAt` hay sửa tiêu đề/mô tả thì thành công.
- **LRN-005-AC-016:** Cho trước Assignment đã quá hạn, khi chủ sở hữu gia hạn, thì lần giải nằm trong
  hạn mới được tính đạt ở lần đọc kế tiếp.
- **LRN-005-AC-017:** Cho trước Problem `DRAFT`, `ON_HOLD`, đã xoá mềm hoặc không tồn tại, khi thêm
  vào Assignment, thì bị từ chối mà không lộ thông tin Problem đó.
- **LRN-005-AC-018:** Cho trước danh sách Problem có mục trùng, quá 50 mục, hoặc `maxScore` ngoài
  1..1.000, khi thiết lập, thì bị từ chối và danh sách cũ giữ nguyên.
- **LRN-005-AC-019:** Cho trước Assignment `DRAFT`, khi chủ sở hữu xoá, thì nó bị xoá hẳn; cho trước
  Assignment `PUBLISHED`, khi xoá, thì bị xoá mềm, ẩn với sinh viên, và khôi phục đưa về `PUBLISHED`.
- **LRN-005-AC-020:** Cho trước Class `ARCHIVED`, khi chủ sở hữu thử tạo, sửa, xuất bản, xoá hay khôi
  phục Assignment, thì bị từ chối với lỗi trạng thái; sinh viên của lớp vẫn xem được Assignment đã
  mở.
- **LRN-005-AC-021:** Cho trước mô tả có HTML/script thô hoặc `startsAt` ≥ `deadlineAt`, khi lưu, thì
  bị từ chối.
- **LRN-005-AC-022:** Cho trước request chứa trường không được phép (người tạo, trạng thái, Class khi
  cập nhật, định danh sinh viên), khi kiểm tra, thì các trường đó không làm thay đổi state.
- **LRN-005-AC-023:** Cho trước biểu diễn Assignment bất kỳ, khi kiểm tra, thì không chứa Test Case,
  harness hay dữ liệu judge.
- **LRN-005-AC-024:** Cho trước bài nộp được chấm xong sau hạn chót (`occurredAt` > `deadlineAt`),
  khi chấm Assignment, thì Problem đó được tính không đạt, đúng với giới hạn đã ghi ở mục Tình huống
  biên.

## Ngoài phạm vi

- Class, mã tham gia, Enrollment (LRN-004)
- Ghi, sửa, tổng hợp tiến độ; route và màn hình hiển thị điểm của sinh viên và của lớp (LRN-006)
- Luồng nộp bài riêng cho Assignment, nộp trễ, hệ số phạt trễ, gia hạn riêng từng sinh viên
- Chấm tay, sửa điểm thủ công, nhận xét của giảng viên
- Điểm từng phần theo Test Case hay theo `best_score`; LRN-005 chỉ dùng đạt/không đạt
- Chấm lại mã hay xét lại kết quả của Submission
- Thông báo (email, realtime) khi Assignment mở hay sắp hết hạn
- Xuất bảng điểm ra file, thống kê nâng cao
- Assignment không thuộc Class, Assignment dùng chung cho nhiều Class, sao chép Assignment
- Đồng sở hữu hay trợ giảng
- Thay đổi contract `submission.accepted` (thuộc Submission)
- Microservice mới cho Assignment

## Phụ thuộc

- [Kiến trúc Learning Service](../../../docs/architecture/learning-service.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [LRN-001 Quản lý Problem](../problems/spec.md): định danh, trạng thái, Markdown hạn chế và phép
  chiếu công khai của Problem.
- [LRN-003 Quản lý Course](../courses/spec.md): Course mà Class thuộc về.
- [LRN-004 Class & Enrollment](../enrollments/spec.md): Class, chủ sở hữu Class, trạng thái
  `ACTIVE`/`ARCHIVED`, tư cách thành viên.
- [LRN-006 Progress](../progress/spec.md): `solved_at` là lần giải đầu tiên theo `occurredAt`,
  idempotent theo `eventId`; hiển thị điểm Assignment (LRN-006-FR-013, FR-016).
- [ID-003 RBAC](../../01-identity/rbac/spec.md) bản 0.4: claim `permissions`, seed quyền theo
  ID-003-FR-017.
- Sự kiện `submission.accepted` của Submission (contract không đổi). Đề xuất cho đội Submission, không
  phải yêu cầu của LRN-005: bổ sung `submittedAt` vào sự kiện ở một phiên bản sau để chấm theo thời
  điểm nộp.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp ngày
2026-09-30:

1. **Assignment thuộc gì?** Đúng một Class của LRN-004, bắt buộc, không đổi (FR-002).
2. **Ai quản lý?** Chủ sở hữu Class với sáu quyền `assignment:*` seed cho `LECTURER`.
3. **Vòng đời?** `DRAFT` → `PUBLISHED`; xoá hẳn nháp; xoá mềm và khôi phục bản đã xuất bản; không
   tạm giữ, không quay về nháp (FR-006).
4. **Điều kiện xuất bản?** Tiêu đề, cả hai mốc thời gian, `startsAt` < `deadlineAt`, hạn chót ở tương
   lai, ≥ 1 Problem, mọi Problem đang `PUBLISHED`, Class `ACTIVE` (FR-007).
5. **Sinh viên thấy khi nào?** Khi `PUBLISHED`, chưa xoá, đã tới `startsAt`, và đang đăng ký (FR-008).
6. **Chấm như thế nào?** Đạt nếu `solved_at` ≤ `deadlineAt`, kể cả giải trước khi giao; điểm =
   `maxScore` hoặc `0`; tổng các Problem; tính khi đọc, không lưu điểm (FR-010, FR-013).
7. **Nộp trễ?** Lần giải sau hạn chót không được cộng điểm (FR-014).
8. **Sửa sau khi xuất bản?** Theo bảng Quy tắc chỉnh sửa: danh sách Problem và `startsAt` khoá từ lúc
   mở; hạn chót chỉ được gia hạn sau khi mở.
9. **Problem nào được thêm?** Mọi Problem `PUBLISHED` chưa xoá, không bắt buộc thuộc Course; Problem
   bị tạm giữ/xoá sau đó bị ẩn và không tính (FR-005, FR-015).
10. **Giới hạn?** 200 ký tự tiêu đề, 20.000 ký tự mô tả, 50 Problem, `maxScore` 1..1.000 mặc định
    100 (FR-018).
11. **Class lưu trữ?** Assignment chỉ đọc (FR-019).
12. **Điểm hiển thị ở đâu?** LRN-005 định nghĩa quy tắc và dữ liệu chấm; LRN-006 là nơi duy nhất tính
    và hiển thị điểm của sinh viên và của lớp (FR-011, FR-012).
13. **`occurredAt` không phải lúc nộp?** Chấp nhận giới hạn ở v1, ghi rủi ro, đề xuất đội Submission
    thêm `submittedAt` sau; không tự đổi contract.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                        |
| ---------- | --------- | ----------------------------------- | -------------------------------------------------------------- |
| 2026-09-30 | 0.1       | DuongPham-Barca (cùng Claude Code)  | Đặc tả Quản lý Assignment ban đầu                              |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Chốt 13 quyết định theo phương án đề xuất và phê duyệt LRN-005 |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
