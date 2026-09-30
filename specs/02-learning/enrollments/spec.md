# LRN-004 Class & Enrollment

## Trạng thái

Approved

Phiên bản `1.0`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất).

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép Giảng viên mở một lớp học phần (Class) cho một kỳ học dựa trên một Course đã xuất bản, phát
mã tham gia cho sinh viên, quản lý danh sách sinh viên của lớp và lưu trữ lớp khi kỳ học kết thúc;
cho phép sinh viên tham gia lớp bằng mã, xem thông tin lớp mình học và tự rời lớp. Learning vẫn sở
hữu toàn bộ dữ liệu và chính sách của Class và Enrollment, và không để lộ lớp hay danh sách sinh viên
cho người ngoài lớp.

## Tác nhân

- **LECTURER:** Người dùng giảng dạy đã xác thực, tạo và quản lý Class của chính mình khi có quyền
  Learning cần thiết.
- **STUDENT:** Người học đã xác thực, tham gia Class bằng mã, xem thông tin Class mình đã đăng ký và
  tự rời Class.
- **ADMIN:** Giống LRN-001 và LRN-003, không mặc nhiên có thẩm quyền với Class hay Enrollment.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ header định danh do client gửi, chuyển tiếp ngữ
  cảnh định danh, vai trò và quyền đã xác minh (ID-003 0.4).
- **Learning Service:** Chủ sở hữu Class, mã tham gia và Enrollment.

## Bối cảnh

Theo LRN-003, **Course là khung nội dung của một môn học**, dùng lại qua nhiều kỳ; **Class là lớp học
phần cụ thể** của một kỳ, có giảng viên, mã tham gia và sinh viên đăng ký. LRN-003 hoãn tường minh
Class, mã tham gia, Enrollment và danh sách sinh viên sang LRN-004, và ghi rằng trạng thái Course ảnh
hưởng tới Class thế nào thuộc LRN-004. Assignment (LRN-005) và tiến độ theo lớp (LRN-006) dựa trên
Class và Enrollment của đặc tả này.

Nền tảng hiện có (migration `1700000003000-InitialLearningSchema.ts`, entity trong
`apps/learning-service/src/modules/courses/entities/course.entity.ts`):

- Bảng `classes` (entity `Classroom`): `id` uuid, `course_id` NOT NULL tham chiếu `courses` với
  `ON DELETE CASCADE`, `join_code` varchar(32) duy nhất, `name` varchar(120), `lecturer_id` uuid. Chưa
  có trạng thái, mốc thời gian hay ràng buộc về định dạng mã tham gia.
- Bảng `enrollments` (entity `Enrollment`): `id` uuid, `class_id` NOT NULL tham chiếu `classes` với
  `ON DELETE CASCADE`, `student_id` uuid, `enrolled_at`, `UNIQUE (class_id, student_id)`.
- Bảng `assignments` có `class_id` cho phép null tham chiếu `classes` với `ON DELETE CASCADE`.
- `lecturer_id` và `student_id` là ID ngoài của Identity, không có khoá ngoại xuyên service.
- API Gateway đã chuyển tiền tố `/api/classes` tới Learning, nhưng Learning chưa có API nào cho
  Class hay Enrollment.
- LRN-003-FR-018 cho phép xoá hẳn một Course `DRAFT` không bị Class hay Assignment tham chiếu. Vì
  khoá ngoại hiện tại là `ON DELETE CASCADE`, một lần xoá Course ở tầng cơ sở dữ liệu sẽ xoá luôn
  Class và Enrollment; đặc tả này yêu cầu điều đó không bao giờ xảy ra (FR-019).

Mã nguồn hiện tại là hành vi nền tảng, không phải bản triển khai của đặc tả này.

## Yêu cầu chức năng

- **LRN-004-FR-001 — Quyền sở hữu của Learning:** Learning MUST sở hữu Class, mã tham gia và
  Enrollment. Không service nào khác lưu hay sửa các dữ liệu này.
- **LRN-004-FR-002 — Định danh ổn định:** Mọi Class và Enrollment MUST có định danh ổn định. Tên Class
  bắt buộc, không rỗng sau khi bỏ khoảng trắng hai đầu, tối đa 120 ký tự, và không phải định danh.
- **LRN-004-FR-003 — Tạo Class:** Giảng viên có quyền `class:create` MUST có thể tạo Class ở trạng
  thái `ACTIVE` với tên và một Course. Course MUST đang `PUBLISHED` và chưa xoá mềm tại thời điểm
  tạo; Course có thể thuộc bất kỳ giảng viên nào. Chủ sở hữu Class MUST lấy từ ngữ cảnh xác thực tin
  cậy. Mỗi Class có đúng một chủ sở hữu ở v1.
- **LRN-004-FR-004 — Course cố định:** Course của một Class MUST NOT thay đổi sau khi tạo.
- **LRN-004-FR-005 — Mã tham gia:** Khi tạo Class, hệ thống MUST sinh một mã tham gia ngẫu nhiên gồm
  đúng 8 ký tự thuộc tập `A`–`Z` và `0`–`9`, bằng bộ sinh số ngẫu nhiên an toàn mật mã, duy nhất trên
  toàn bộ Class (kể cả Class đã lưu trữ).
- **LRN-004-FR-006 — Tạo lại mã tham gia:** Chủ sở hữu có thẩm quyền MUST có thể tạo lại mã tham gia
  của Class `ACTIVE`. Mã cũ MUST mất hiệu lực ngay; sinh viên đã đăng ký không bị ảnh hưởng.
- **LRN-004-FR-007 — Đổi tên Class:** Chủ sở hữu có thẩm quyền MUST có thể đổi tên Class `ACTIVE`.
- **LRN-004-FR-008 — Vòng đời Class:** Class MUST đi theo vòng đời ở mục Quy tắc nghiệp vụ:
  `ACTIVE` → `ARCHIVED` (lưu trữ) và `ARCHIVED` → `ACTIVE` (khôi phục). Chuyển trạng thái là hành động
  riêng, không phải trường chỉnh sửa tự do.
- **LRN-004-FR-009 — Lưu trữ giữ dữ liệu:** Class `ARCHIVED` MUST giữ nguyên tên, Course, mã tham gia
  và toàn bộ Enrollment. Trong lúc lưu trữ, Class MUST NOT nhận sinh viên mới, và MUST NOT đổi tên,
  tạo lại mã, gỡ sinh viên hay cho sinh viên rời lớp. Khôi phục đưa Class về `ACTIVE` với cùng dữ
  liệu và cùng mã tham gia.
- **LRN-004-FR-010 — Tham gia bằng mã:** Người dùng có vai trò `STUDENT` MUST có thể tham gia một Class
  `ACTIVE` bằng mã tham gia hợp lệ. Mã nhập vào MUST được so sánh không phân biệt hoa thường sau khi
  bỏ khoảng trắng hai đầu. Sinh viên MUST lấy từ ngữ cảnh xác thực tin cậy.
- **LRN-004-FR-011 — Tham gia lặp lại:** Tham gia lại một Class `ACTIVE` mà người gọi đã đăng ký MUST
  thành công mà không tạo Enrollment thứ hai và không đổi thời điểm đăng ký. Tham gia một Class
  `ARCHIVED` luôn bị từ chối theo FR-009, kể cả khi người gọi đã là thành viên.
- **LRN-004-FR-012 — Chủ sở hữu không tự đăng ký:** Chủ sở hữu của một Class MUST NOT đăng ký làm sinh
  viên của chính Class đó.
- **LRN-004-FR-013 — Sinh viên tự rời lớp:** Sinh viên đã đăng ký MUST có thể tự rời một Class
  `ACTIVE`. Sau khi rời, sinh viên không còn là thành viên và có thể tham gia lại bằng mã hợp lệ.
- **LRN-004-FR-014 — Chủ sở hữu gỡ sinh viên:** Chủ sở hữu có thẩm quyền MUST có thể gỡ một sinh viên
  khỏi Class `ACTIVE`. Sinh viên bị gỡ có thể tham gia lại nếu có mã đang hiệu lực; chủ sở hữu tạo lại
  mã để chặn việc đó.
- **LRN-004-FR-015 — Xem phía quản lý:** Chủ sở hữu có thẩm quyền MUST có thể liệt kê mọi Class của
  mình ở mọi trạng thái, và xem chi tiết một Class gồm mã tham gia, số sinh viên và danh sách sinh viên
  có phân trang.
- **LRN-004-FR-016 — Xem phía thành viên:** Sinh viên đã đăng ký MUST có thể liệt kê các Class mình
  đang là thành viên (kể cả Class `ARCHIVED`) và xem thông tin một Class đó. Biểu diễn thành viên MUST
  NOT chứa mã tham gia, danh sách hay số lượng sinh viên khác.
- **LRN-004-FR-017 — Course trong biểu diễn Class:** Biểu diễn thành viên của Class MUST chỉ kèm tóm
  tắt Course khi Course đó đang `PUBLISHED` và chưa xoá mềm; ngược lại MUST báo Course không khả dụng
  mà không lộ tiêu đề, slug hay trạng thái của Course. Là thành viên Class không cấp quyền xem Course
  ngoài chính sách của LRN-003.
- **LRN-004-FR-018 — Giới hạn:** Một Class MUST có tối đa 500 sinh viên. Trang danh sách sinh viên và
  trang danh sách Class tối đa 100 mục.
- **LRN-004-FR-019 — Không mất Class khi Course thay đổi:** Mọi thay đổi trạng thái hay việc xoá của
  Course (LRN-003, gồm xoá hẳn Course nháp ở LRN-003-FR-018) MUST NOT xoá hay sửa Class hoặc
  Enrollment. Một Course đang được Class tham chiếu MUST NOT bị xoá hẳn.
- **LRN-004-FR-020 — Không xoá hẳn Class:** Class MUST NOT bị xoá hẳn ở v1; lưu trữ là cách kết thúc
  một Class.
- **LRN-004-FR-021 — Retry xác định:** Thao tác thất bại MUST để nguyên state; thao tác đọc lặp lại
  MUST NOT làm thay đổi state.
- **LRN-004-FR-022 — Không sở hữu nội dung, bài tập hay tiến độ:** LRN-004 MUST NOT tạo hay sửa
  Course, Chapter, Problem, Assignment, điểm hay tiến độ.

## Quy tắc nghiệp vụ

### Cấu trúc

```text
Class (lớp học phần)
 ├── tên, trạng thái, mã tham gia, chủ sở hữu (giảng viên), mốc thời gian
 ├── Course (đúng một, cố định, tham chiếu theo ID của LRN-003)
 └── Enrollment 0..500
      └── sinh viên (ID ngoài của Identity), thời điểm đăng ký
```

- Một Course có thể có nhiều Class (nhiều kỳ, nhiều giảng viên).
- Một sinh viên có thể đăng ký nhiều Class, kể cả nhiều Class của cùng một Course.
- Một sinh viên có tối đa một Enrollment trong một Class.
- Thành viên của một Class gồm chủ sở hữu và các sinh viên đang đăng ký.

### Vòng đời

| Trạng thái | Nhận sinh viên mới | Đổi tên / tạo lại mã | Gỡ / rời lớp | Ý nghĩa                                         |
| ---------- | ------------------ | -------------------- | ------------ | ----------------------------------------------- |
| `ACTIVE`   | Có                 | Có                   | Có           | Đang giảng dạy                                  |
| `ARCHIVED` | Không              | Không                | Không        | Đã kết thúc; giữ nguyên dữ liệu, khôi phục được |

- Các bước chuyển bị cấm (lưu trữ Class đã `ARCHIVED`, khôi phục Class đang `ACTIVE`) trả lỗi trạng
  thái không hợp lệ và không đổi state.
- Khôi phục không kiểm tra lại trạng thái Course.
- Class không có trạng thái xoá mềm và không có trạng thái nháp.

### Quan hệ với Course

- Chỉ tạo được Class từ Course `PUBLISHED` chưa xoá mềm.
- Sau khi tạo, Course chuyển sang `ON_HOLD`, bị xoá mềm hay được khôi phục đều không đổi trạng thái
  Class, không chặn việc tham gia, rời lớp hay gỡ sinh viên. Chỉ phần tóm tắt Course trong biểu diễn
  thành viên bị ẩn theo FR-017.
- Vì Class chỉ tạo được từ Course đã xuất bản, và LRN-003 không có bước chuyển về `DRAFT`, một Course
  `DRAFT` bình thường không bao giờ có Class. FR-019 là bảo đảm bổ sung cho mọi trường hợp còn lại.

### Mã tham gia

- Mã chỉ để tham gia; biết mã không cấp quyền xem Class trước khi tham gia.
- Mã sai, mã đã bị thay thế và mã không tồn tại cho cùng một kết quả quan sát được.
- Mã của Class `ARCHIVED` vẫn thuộc về Class đó và không được cấp cho Class khác.

## Quy tắc phân quyền

- Mọi thao tác cần người dùng đã xác thực.
- Thao tác quản lý cần quyền tương ứng cộng với quyền sở hữu (chỉ chủ sở hữu quản lý Class của mình):

  | Thao tác                                     | Quyền                             |
  | -------------------------------------------- | --------------------------------- |
  | Tạo Class                                    | `class:create`                    |
  | Liệt kê, xem chi tiết và danh sách sinh viên | `class:read-managed`              |
  | Đổi tên, tạo lại mã tham gia                 | `class:update`                    |
  | Lưu trữ / khôi phục                          | `class:archive` / `class:restore` |
  | Gỡ sinh viên                                 | `class:manage-members`            |

- Sáu quyền `class:*` được seed tĩnh ở Identity và chỉ gán cho `LECTURER`, theo ID-003-FR-017.
- Quyền đến từ header `x-auth-permissions` do Gateway đặt (ID-003 0.4); vai trò đến từ header
  `x-auth-roles`; quyền sở hữu so chủ sở hữu Class với principal tin cậy.
- Tham gia bằng mã cần vai trò `STUDENT` trong ngữ cảnh tin cậy; không cần quyền `class:*`.
- Rời lớp và xem biểu diễn thành viên chỉ cần là thành viên của Class đó.
- Quyền phạm vi tài nguyên: có `class:*` chỉ cho phép thao tác trên Class mình sở hữu.
- `ADMIN` không có thẩm quyền ngầm; `STUDENT` không quản lý được Class; giảng viên không phải chủ sở
  hữu không xem được danh sách sinh viên.
- LRN-006 dùng `class:read-managed` cộng quyền sở hữu để giảng viên xem tiến độ sinh viên trong lớp;
  LRN-004 không định nghĩa hành vi đó.
- Phân quyền thiếu hoặc mơ hồ mặc định là từ chối.

## Đầu vào

- **Tạo Class:** tên, định danh Course. Không nhận chủ sở hữu, mã tham gia, trạng thái, mốc thời gian.
- **Đổi tên:** tên.
- **Tạo lại mã, lưu trữ, khôi phục:** định danh Class và ngữ cảnh tác nhân tin cậy.
- **Tham gia:** mã tham gia.
- **Rời lớp:** định danh Class.
- **Gỡ sinh viên:** định danh Class, định danh sinh viên.
- **Liệt kê/xem:** phân trang; danh sách quản lý lọc được theo trạng thái.

Route và DTO cụ thể thuộc `plan.md`.

## Đầu ra

- **Biểu diễn quản lý:** định danh, tên, trạng thái, mã tham gia, định danh Course kèm cờ Course có
  đang khả dụng với người học hay không, số sinh viên, mốc tạo, cập nhật, lưu trữ.
- **Danh sách sinh viên:** tóm tắt phân trang gồm định danh sinh viên và thời điểm đăng ký, sắp theo
  thời điểm đăng ký. LRN-004 không lưu tên hay email của sinh viên.
- **Biểu diễn thành viên:** định danh, tên, trạng thái, định danh chủ sở hữu, tóm tắt Course (định
  danh, slug, tiêu đề) hoặc báo không khả dụng, thời điểm đăng ký của người gọi. Không có mã tham gia
  hay thông tin sinh viên khác.
- **Tham gia:** biểu diễn thành viên của Class đã tham gia, phân biệt được lần tham gia mới với lần
  lặp lại.
- **Tạo lại mã:** mã tham gia mới.
- Rời lớp, gỡ sinh viên: không có nội dung trả về.
- LRN-004 không phát domain event nào.

## Tình huống lỗi

| Trường hợp                                                                  | Hành vi quan sát được                                |
| --------------------------------------------------------------------------- | ---------------------------------------------------- |
| Thiếu hoặc sai xác thực                                                     | `401`; không thay đổi state                          |
| Thiếu quyền, không phải chủ sở hữu, hoặc tham gia mà không `STUDENT`        | `403`; không thay đổi state                          |
| Class không tồn tại, hoặc người gọi không phải thành viên (phía thành viên) | `404`; không lộ sự tồn tại của Class                 |
| Mã tham gia sai, không tồn tại hoặc đã bị thay thế                          | `404`; cùng một thông báo cho mọi trường hợp         |
| Tham gia Class `ARCHIVED`                                                   | Lỗi trạng thái không hợp lệ; không tạo Enrollment    |
| Chủ sở hữu tham gia Class của chính mình                                    | Lỗi xung đột; không tạo Enrollment                   |
| Class đã đủ 500 sinh viên                                                   | Lỗi xung đột; không tạo Enrollment                   |
| Course không tồn tại, không `PUBLISHED` hoặc đã xoá mềm khi tạo             | Lỗi kiểm tra dữ liệu; không lộ Course chưa công khai |
| Đổi tên, tạo lại mã, gỡ, rời lớp khi Class `ARCHIVED`                       | Lỗi trạng thái không hợp lệ; không thay đổi state    |
| Bước chuyển vòng đời không hợp lệ                                           | Lỗi trạng thái không hợp lệ; không thay đổi state    |
| Gỡ hoặc rời khi không có Enrollment tương ứng                               | `404`; không thay đổi state                          |
| Tên rỗng hoặc quá dài; mã tham gia sai định dạng                            | Lỗi kiểm tra dữ liệu                                 |

LRN-004 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Hai lần tham gia đồng thời của cùng một sinh viên để lại đúng một Enrollment.
- Nhiều sinh viên tham gia đồng thời khi Class còn một chỗ: đúng một người thành công.
- Tham gia bằng mã cũ ngay sau khi mã được tạo lại thất bại như mã sai.
- Sinh viên bị gỡ vai trò `STUDENT` sau khi đăng ký vẫn là thành viên cho tới khi rời hoặc bị gỡ;
  chỉ việc tham gia mới cần vai trò đó.
- Chủ sở hữu mất quyền `class:*` vẫn là chủ sở hữu, nhưng không thực hiện được thao tác quản lý tương
  ứng cho tới khi có lại quyền.
- Mã tham gia nhập chữ thường hoặc có khoảng trắng hai đầu vẫn khớp.
- Class có 0 sinh viên hợp lệ; lưu trữ Class rỗng được phép.
- Tên tiếng Việt có dấu được hỗ trợ.

## Yêu cầu bảo mật

- **LRN-004-SR-001 — Phân quyền phía server:** Quyền, vai trò, sở hữu, tư cách thành viên và trạng
  thái kiểm tra tại backend.
- **LRN-004-SR-002 — Ngữ cảnh tin cậy:** Định danh, vai trò và quyền chỉ từ header Gateway đã xác
  minh; chủ sở hữu và sinh viên không bao giờ lấy từ body hay query.
- **LRN-004-SR-003 — Không lộ danh sách lớp:** Danh sách sinh viên và số sinh viên MUST NOT lộ cho
  người không phải chủ sở hữu, qua phản hồi, lỗi hay số đếm.
- **LRN-004-SR-004 — Bảo vệ mã tham gia:** Mã tham gia MUST chỉ xuất hiện trong biểu diễn quản lý của
  chủ sở hữu; MUST NOT xuất hiện trong log; mã sai MUST NOT cho biết Class nào tồn tại.
- **LRN-004-SR-005 — Chống gán hàng loạt:** Đầu vào liệt kê tường minh các trường được phép.
- **LRN-004-SR-006 — Không lộ Course chưa công khai:** Biểu diễn Class và lỗi khi tạo MUST NOT lộ
  tiêu đề, slug hay trạng thái của Course chưa công khai.
- **LRN-004-SR-007 — Cách ly service:** Không truy vấn CSDL của service khác; không khoá ngoại xuyên
  service.
- **LRN-004-SR-008 — Thất bại an toàn:** Ngữ cảnh thiếu hoặc mơ hồ thì từ chối và giữ nguyên state.

## Tiêu chí nghiệm thu

- **LRN-004-AC-001:** Cho trước Giảng viên có `class:create` và một Course `PUBLISHED` của giảng viên
  khác, khi tạo Class hợp lệ, thì Class được tạo ở `ACTIVE` với chủ sở hữu tin cậy và một mã tham gia
  8 ký tự thuộc `A`–`Z` và `0`–`9`.
- **LRN-004-AC-002:** Cho trước Course `DRAFT`, `ON_HOLD`, đã xoá mềm hoặc không tồn tại, khi tạo
  Class, thì bị từ chối và lỗi không lộ tiêu đề hay trạng thái của Course.
- **LRN-004-AC-003:** Cho trước `STUDENT`, `ADMIN` chưa được cấp quyền, hoặc Giảng viên không phải chủ
  sở hữu, khi thử thao tác quản lý, thì nhận `403` và state không đổi.
- **LRN-004-AC-004:** Cho trước người chưa xác thực, khi gọi bất kỳ thao tác nào, thì nhận `401`.
- **LRN-004-AC-005:** Cho trước một `STUDENT` và mã của Class `ACTIVE`, khi tham gia, thì Enrollment
  được tạo với sinh viên tin cậy và sinh viên thấy Class trong danh sách lớp của mình.
- **LRN-004-AC-006:** Cho trước sinh viên đã đăng ký một Class `ACTIVE`, khi tham gia lại cùng Class, thì thành công, vẫn
  chỉ có một Enrollment và thời điểm đăng ký không đổi.
- **LRN-004-AC-007:** Cho trước mã sai, mã đã bị thay thế hoặc mã không tồn tại, khi tham gia, thì
  nhận `404` với cùng thông báo.
- **LRN-004-AC-008:** Cho trước người dùng không có vai trò `STUDENT`, khi tham gia bằng mã hợp lệ, thì
  nhận `403` và không tạo Enrollment.
- **LRN-004-AC-009:** Cho trước chủ sở hữu có cả vai trò `STUDENT`, khi tham gia Class của chính mình,
  thì bị từ chối và không tạo Enrollment.
- **LRN-004-AC-010:** Cho trước chủ sở hữu tạo lại mã, khi sinh viên dùng mã cũ, thì bị từ chối như mã
  sai; khi dùng mã mới, thì tham gia được; sinh viên đã đăng ký trước đó vẫn là thành viên.
- **LRN-004-AC-011:** Cho trước Class `ARCHIVED`, khi tham gia, đổi tên, tạo lại mã, gỡ sinh viên hoặc
  rời lớp, thì bị từ chối và state không đổi; sinh viên đã đăng ký vẫn xem được thông tin Class.
- **LRN-004-AC-012:** Cho trước Class `ARCHIVED`, khi chủ sở hữu khôi phục, thì Class về `ACTIVE` với
  cùng tên, Course, mã tham gia và danh sách sinh viên.
- **LRN-004-AC-013:** Cho trước bước chuyển không hợp lệ (lưu trữ Class `ARCHIVED`, khôi phục Class
  `ACTIVE`), khi yêu cầu, thì nhận lỗi trạng thái không hợp lệ và state không đổi.
- **LRN-004-AC-014:** Cho trước sinh viên đã đăng ký Class `ACTIVE`, khi tự rời lớp, thì Enrollment
  không còn, sinh viên không xem được Class nữa (`404`), và có thể tham gia lại bằng mã hợp lệ.
- **LRN-004-AC-015:** Cho trước chủ sở hữu gỡ một sinh viên, khi sinh viên đó xem Class, thì nhận
  `404`; Enrollment của sinh viên khác không bị ảnh hưởng.
- **LRN-004-AC-016:** Cho trước một sinh viên đã đăng ký, khi xem Class, thì biểu diễn không chứa mã
  tham gia, số sinh viên hay định danh sinh viên khác.
- **LRN-004-AC-017:** Cho trước người dùng không phải thành viên (kể cả khi biết mã), khi xem Class
  theo định danh, thì nhận `404`.
- **LRN-004-AC-018:** Cho trước Course của một Class bị tạm giữ hoặc xoá mềm, khi sinh viên xem Class,
  thì Class vẫn hiển thị, trạng thái Class không đổi, và phần Course báo không khả dụng mà không lộ
  tiêu đề hay slug.
- **LRN-004-AC-019:** Cho trước Class đã có 500 sinh viên, khi thêm một sinh viên tham gia, thì bị từ
  chối; khi nhiều sinh viên cùng tham gia vào chỗ cuối cùng, thì đúng một người thành công.
- **LRN-004-AC-020:** Cho trước một Course đang được Class tham chiếu, khi có bất kỳ thao tác nào cố
  xoá hẳn Course, thì bị từ chối và Class cùng Enrollment còn nguyên.
- **LRN-004-AC-021:** Cho trước request chứa trường không được phép (chủ sở hữu, mã tham gia, trạng
  thái, sinh viên, mốc thời gian), khi kiểm tra, thì các trường đó không làm thay đổi state.
- **LRN-004-AC-022:** Cho trước chủ sở hữu, khi xem danh sách sinh viên, thì nhận danh sách phân trang
  tối đa 100 mục, sắp theo thời điểm đăng ký, cùng tổng số sinh viên.
- **LRN-004-AC-023:** Cho trước mã tham gia nhập chữ thường hoặc có khoảng trắng hai đầu, khi tham
  gia, thì khớp như mã gốc.
- **LRN-004-AC-024:** Cho trước một Class đã tạo, khi chủ sở hữu gửi yêu cầu đổi tên kèm định danh
  Course khác, thì yêu cầu bị từ chối và Course của Class không đổi.

## Ngoài phạm vi

- Import danh sách sinh viên hàng loạt, mời qua email, duyệt yêu cầu tham gia
- Nhiều giảng viên hoặc trợ giảng cho một Class, chuyển quyền sở hữu Class
- Đổi Course của Class, sao chép Class
- Xoá hẳn Class
- Hiển thị tên, email hay hồ sơ sinh viên (thuộc Identity); LRN-004 chỉ lưu định danh
- Sinh viên xem danh sách bạn cùng lớp
- Hạn dùng của mã tham gia, mã tham gia dùng một lần
- Lịch học, học kỳ có cấu trúc, phòng học
- Giới hạn Course theo Class (Course đã xuất bản vẫn hiển thị với mọi người dùng đã xác thực theo
  LRN-003)
- Assignment, hạn chót, chấm điểm (LRN-005); tiến độ theo lớp (LRN-006)
- Thông báo hay sự kiện khi tham gia/rời lớp
- Microservice mới cho Class

## Phụ thuộc

- [Kiến trúc Learning Service](../../../docs/architecture/learning-service.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002: Sửa lại kiến trúc nội bộ của các service](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [LRN-003 Quản lý Course](../courses/spec.md) 1.0: trạng thái và phép chiếu người học của Course,
  LRN-003-FR-018 (xoá hẳn Course nháp không bị tham chiếu).
- [ID-003 RBAC](../../01-identity/rbac/spec.md) bản 0.4: claim `permissions`, header
  `x-auth-roles`/`x-auth-permissions`, seed quyền của tính năng (FR-017).
- LRN-005 Assignment và LRN-006 Progress dùng Class và Enrollment của đặc tả này.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp ngày
2026-09-30:

1. **Class gắn với Course nào?** Đúng một Course đang `PUBLISHED` chưa xoá mềm, của bất kỳ giảng viên
   nào; cố định sau khi tạo (FR-003, FR-004).
2. **Ai sở hữu Class?** Giảng viên tạo; một giảng viên mỗi lớp ở v1 (FR-003).
3. **Mã tham gia?** Ngẫu nhiên 8 ký tự thuộc `A`–`Z` và `0`–`9`, duy nhất, so khớp không phân biệt hoa thường;
   chủ sở hữu tạo lại được, mã cũ mất hiệu lực ngay (FR-005, FR-006, FR-010).
4. **Ai tham gia được?** Người có vai trò `STUDENT`, bằng mã; chủ sở hữu không tự đăng ký; tham gia
   lặp lại là thành công không đổi state (FR-010 tới FR-012).
5. **Rời lớp và gỡ sinh viên?** Sinh viên tự rời; chủ sở hữu gỡ; cả hai được tham gia lại bằng mã
   hợp lệ; muốn chặn thì tạo lại mã (FR-013, FR-014).
6. **Vòng đời Class?** `ACTIVE` ⇄ `ARCHIVED`; lưu trữ khoá tham gia mới và đóng băng danh sách, giữ
   dữ liệu; khôi phục được; không xoá hẳn Class ở v1 (FR-008, FR-009, FR-020).
7. **Ai xem gì?** Chủ sở hữu xem đầy đủ gồm mã tham gia và danh sách sinh viên; sinh viên chỉ xem
   thông tin lớp, không xem bạn cùng lớp ở v1 (FR-015, FR-016).
8. **Course bị tạm giữ/xoá mềm sau khi mở lớp?** Class không bị ảnh hưởng; chỉ ẩn tóm tắt Course với
   sinh viên (FR-017).
9. **Tương tác với xoá hẳn Course nháp (LRN-003-FR-018)?** Course đang được Class tham chiếu không bao
   giờ bị xoá hẳn; việc xoá Course không bao giờ xoá Class hay Enrollment (FR-019).
10. **Mã quyền?** Sáu quyền `class:create`, `class:read-managed`, `class:update`, `class:archive`,
    `class:restore`, `class:manage-members`, seed cho `LECTURER` theo ID-003-FR-017.
11. **Giới hạn?** 500 sinh viên mỗi Class; trang danh sách tối đa 100 mục (FR-018).
12. **Import hàng loạt?** Không có ở v1.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                        |
| ---------- | --------- | ----------------------------------- | -------------------------------------------------------------- |
| 2026-09-30 | 0.1       | DuongPham-Barca (cùng Claude Code)  | Đặc tả Class & Enrollment ban đầu                              |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Chốt 12 quyết định theo phương án đề xuất và phê duyệt LRN-004 |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
