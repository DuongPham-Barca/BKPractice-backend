# COM-001 Bài viết cộng đồng (Posts)

## Trạng thái

Approved

Phiên bản `1.0`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất).

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép mọi người dùng đã xác thực đăng bài thảo luận trong cộng đồng BKPractice, tuỳ chọn gắn bài
với một Problem hoặc một Course, đọc bài của người khác, và cho phép tác giả sửa, xoá mềm và khôi
phục bài của chính mình, trong khi Community sở hữu toàn bộ dữ liệu bài viết và không phụ thuộc vào
cơ sở dữ liệu của service khác.

## Tác nhân

- **Người dùng đã xác thực (`STUDENT`, `LECTURER`, `ADMIN`):** Đăng bài, đọc bài đang hiển thị, sửa,
  xoá mềm và khôi phục bài do chính mình viết. Vai trò không cấp thêm thẩm quyền nào với bài của
  người khác trong COM-001.
- **Tác giả:** Người dùng có định danh trùng `authorId` của bài. Là tác nhân duy nhất được sửa, xoá
  mềm và khôi phục bài đó, và thấy bài của mình kể cả khi bài đã bị xoá mềm hoặc bị ẩn bởi kiểm
  duyệt.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ và đặt lại các header định danh tin cậy
  (`x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`), chuyển tiếp tiền tố `/api/community`.
- **Community Service:** Chủ sở hữu Post, quy tắc sở hữu và vòng đời xoá mềm của Post.
- **Người kiểm duyệt (COM-005):** Không phải tác nhân của COM-001. COM-005 sở hữu việc ẩn/khôi phục
  Post bởi kiểm duyệt; COM-001 chỉ tôn trọng trạng thái đó khi đọc.

## Bối cảnh

Community đã có nền tảng mã nguồn (module `apps/community-service/src/modules/posts/`), không phải
bản triển khai của đặc tả này:

- Bảng `posts` trong `bkpractice_community` có `author_id`, `scope` (`GLOBAL`/`PROBLEM`/`COURSE`),
  `content` (text), `problem_id`, `course_id` (UUID cho phép null, không khoá ngoại xuyên service),
  `is_pinned`, `is_hidden` (mặc định `false`), `created_at`, `updated_at`. Chưa có tiêu đề, dấu xoá
  mềm hay mốc chỉnh sửa.
- `POST /api/community/posts` tạo bài với `authorId` lấy từ header `x-auth-user-id`, nội dung 1 tới
  10.000 ký tự; nếu `scope` không khớp thì âm thầm bỏ `problemId`/`courseId` thay vì báo lỗi.
- `GET /api/community/posts` trả tối đa 50 bài không bị ẩn, bài ghim trước rồi mới nhất trước,
  không phân trang, không lọc.
- Chưa có API đọc một bài, sửa, xoá hay khôi phục. Controller không kiểm tra header định danh có mặt
  hay hợp lệ.
- Cùng module còn chứa bình luận (thuộc COM-002) và bật/tắt LIKE (thuộc COM-003); bảng `bookmarks`,
  `reports` (thuộc COM-004, COM-005) có schema nhưng chưa có hành vi.

## Yêu cầu chức năng

- **COM-001-FR-001 — Quyền sở hữu của Community:** Community MUST sở hữu mọi Post. Không service nào
  khác lưu hay sửa Post.
- **COM-001-FR-002 — Tạo Post:** Mọi người dùng đã xác thực MUST có thể tạo Post gồm tiêu đề, nội
  dung và phạm vi. Tác giả MUST lấy từ ngữ cảnh xác thực tin cậy, không bao giờ từ dữ liệu client.
- **COM-001-FR-003 — Phạm vi và đích tuỳ chọn:** Mỗi Post MUST có đúng một phạm vi: `GLOBAL` (không
  đích), `PROBLEM` (gắn đúng một `problemId`) hoặc `COURSE` (gắn đúng một `courseId`). Một Post MUST
  NOT gắn đồng thời cả Problem lẫn Course. Đầu vào có phạm vi và đích không khớp MUST bị từ chối
  thay vì bị âm thầm sửa.
- **COM-001-FR-004 — Định danh ngoài:** `problemId` và `courseId` MUST là định danh ngoài dạng UUID,
  được lưu nguyên giá trị. Ở v1, Community MUST NOT kiểm tra sự tồn tại hay trạng thái của Problem
  hoặc Course, và MUST NOT truy vấn cơ sở dữ liệu của Learning.
- **COM-001-FR-005 — Định danh ổn định:** Mọi Post MUST có định danh ổn định. Phạm vi và đích MUST
  bất biến sau khi tạo.
- **COM-001-FR-006 — Đọc một Post:** Người dùng đã xác thực MUST có thể đọc một Post đang hiển thị
  với họ theo định danh.
- **COM-001-FR-007 — Liệt kê Post:** Người dùng đã xác thực MUST có thể liệt kê các Post đang hiển
  thị, có phân trang, mới nhất trước, và lọc được theo phạm vi, theo `problemId` hoặc theo
  `courseId`. Kết quả rỗng là thành công.
- **COM-001-FR-008 — Bài của tôi:** Tác giả MUST có thể liệt kê Post của chính mình, có phân trang,
  gồm cả Post đã xoá mềm và Post bị ẩn bởi kiểm duyệt, kèm trạng thái của từng Post. Đây là luồng
  quản lý của tác giả, chỉ trả nội dung của chính người gọi; mọi luồng thông thường (danh sách, chi
  tiết) áp dụng quy tắc hiển thị COM-005-FR-012.
- **COM-001-FR-009 — Sửa Post:** Tác giả MUST có thể sửa tiêu đề và nội dung của Post chưa bị xoá
  mềm của chính mình. Lần sửa MUST ghi lại mốc chỉnh sửa gần nhất.
- **COM-001-FR-010 — Xoá mềm Post:** Tác giả MUST có thể xoá mềm Post của chính mình. Post đã xoá mềm
  MUST NOT hiển thị với người không phải tác giả, và dữ liệu MUST được giữ lại.
- **COM-001-FR-011 — Khôi phục Post:** Tác giả MUST có thể khôi phục Post đã xoá mềm của chính mình.
  Khôi phục đưa Post về đúng trạng thái trước khi xoá, kể cả trạng thái kiểm duyệt.
- **COM-001-FR-012 — Không xoá cứng:** COM-001 MUST NOT cung cấp thao tác xoá cứng Post.
- **COM-001-FR-013 — Hiển thị theo kiểm duyệt:** Post bị ẩn bởi kiểm duyệt (trạng thái do COM-005 sở
  hữu và thay đổi) MUST NOT xuất hiện trong danh sách hay chi tiết với người không phải tác giả. Tác
  giả MUST vẫn đọc được Post đó kèm trạng thái kiểm duyệt theo COM-005-FR-013. Quy tắc hiển thị của
  COM-001 MUST trùng với COM-005-FR-012. Không thao tác nào của COM-001 được thay đổi trạng thái kiểm
  duyệt.
- **COM-001-FR-014 — Nội dung Markdown hạn chế:** Tiêu đề là văn bản thuần; nội dung là Markdown hạn
  chế. Backend MUST kiểm tra độ dài và tính không rỗng, và MUST từ chối thẻ HTML/script thô nằm ngoài
  khối mã và đoạn mã Markdown. Frontend làm sạch khi render.
- **COM-001-FR-015 — Quy tắc nội dung mềm:** Community SHOULD hiển thị cho người dùng quy tắc không
  đăng lời giải hoặc mã nguồn kèm đáp án. Quy tắc này MUST NOT được kiểm tra tự động ở v1; vi phạm
  được xử lý qua báo cáo và kiểm duyệt của COM-005.
- **COM-001-FR-016 — Thông tin cho tính năng khác:** Community MUST cho các tính năng Community khác
  (COM-002 tới COM-005) biết một Post có tồn tại, có hiển thị với một người gọi, và có đang nhận
  tương tác mới hay không, theo cùng quy tắc hiển thị của đặc tả này.
- **COM-001-FR-017 — Retry xác định:** Một thao tác bị từ chối hay thất bại MUST để nguyên Post. Đọc
  lặp lại MUST NOT thay đổi state. Xoá mềm Post đã xoá mềm và khôi phục Post chưa bị xoá MUST bị từ
  chối với lỗi trạng thái không hợp lệ.

## Quy tắc nghiệp vụ

### Trạng thái của Post

Một Post có hai trục trạng thái độc lập:

| Trục       | Giá trị                         | Chủ sở hữu thay đổi |
| ---------- | ------------------------------- | ------------------- |
| Xoá mềm    | chưa xoá / đã xoá mềm           | Tác giả (COM-001)   |
| Kiểm duyệt | hiển thị / bị ẩn bởi kiểm duyệt | COM-005             |

Post **đang hiển thị công khai** khi chưa bị xoá mềm và không bị ẩn bởi kiểm duyệt.

| Tình trạng Post                | Người không phải tác giả | Tác giả                     | Sửa   | Xoá mềm | Khôi phục | Nhận tương tác mới |
| ------------------------------ | ------------------------ | --------------------------- | ----- | ------- | --------- | ------------------ |
| Hiển thị công khai             | Đọc được                 | Đọc được                    | Có    | Có      | Không     | Có                 |
| Bị ẩn bởi kiểm duyệt, chưa xoá | `404`                    | Đọc được, kèm trạng thái ẩn | Có    | Có      | Không     | Không              |
| Đã xoá mềm (bất kể kiểm duyệt) | `404`                    | Chỉ qua "bài của tôi"       | Không | Không   | Có        | Không              |

- Sửa Post bị ẩn bởi kiểm duyệt không bỏ ẩn Post đó.
- Xoá mềm và khôi phục Post không tạo, sửa hay xoá Comment, Reaction, Bookmark hay Report nào; các
  dữ liệu đó đơn giản là không đọc được khi Post không hiển thị.
- "Nhận tương tác mới" là điều kiện mà COM-002 tới COM-005 dựa vào (FR-016); hành vi cụ thể của từng
  tương tác thuộc đặc tả tương ứng.

### Dữ liệu của Post

- **Tiêu đề:** văn bản thuần, bắt buộc, 1 tới 200 ký tự sau khi bỏ khoảng trắng đầu/cuối.
- **Nội dung:** Markdown hạn chế, bắt buộc, 1 tới 10.000 ký tự sau khi bỏ khoảng trắng đầu/cuối.
- **Phạm vi:** `GLOBAL`, `PROBLEM`, `COURSE`; bất biến.
- **Đích:** `problemId` khi `PROBLEM`, `courseId` khi `COURSE`, không có khi `GLOBAL`; bất biến.
- **Tác giả:** định danh người dùng từ ngữ cảnh tin cậy; bất biến.
- **Mốc thời gian:** thời điểm tạo, thời điểm chỉnh sửa gần nhất (không có nếu chưa sửa), thời điểm
  xoá mềm (chỉ tác giả thấy).

### Thứ tự và phân trang

- Danh sách sắp theo thời điểm tạo giảm dần, hoà thì theo định danh, để thứ tự ổn định.
- Kích thước trang mặc định 20, tối đa 50.
- Ghim bài là Ngoài phạm vi; dữ liệu ghim hiện có không ảnh hưởng thứ tự.

## Quy tắc phân quyền

- Mọi thao tác đòi hỏi người dùng đã xác thực, xác định bằng định danh tin cậy do Gateway đặt.
  Thiếu hoặc sai định dạng định danh MUST bị từ chối là chưa xác thực.
- COM-001 không định nghĩa mã quyền mới. Mọi người dùng đã xác thực được tạo, đọc và liệt kê Post;
  sở hữu là điều kiện duy nhất để sửa, xoá mềm, khôi phục.
- Chỉ tác giả (`authorId` khớp principal tin cậy) được sửa, xoá mềm, khôi phục Post và xem Post đã xoá
  mềm hoặc bị ẩn của mình.
- `ADMIN` và `LECTURER` không có thẩm quyền ngầm với Post của người khác. Thẩm quyền kiểm duyệt thuộc
  COM-005 (`community:moderate`).
- Phạm vi quyền: toàn nền tảng cho tạo/đọc; phạm vi tài nguyên (sở hữu) cho sửa/xoá/khôi phục.
- Định danh, vai trò và quyền MUST NOT lấy từ body, query, route hay header do client gửi.

## Đầu vào

Các thao tác dưới đây là thao tác ở mức khái niệm; route và DTO thuộc về `plan.md`.

- **Tạo Post:** tiêu đề, nội dung, phạm vi, `problemId` hoặc `courseId` theo phạm vi. MUST NOT chấp
  nhận tác giả, mốc thời gian, trạng thái xoá, trạng thái kiểm duyệt, ghim, vai trò hay quyền.
- **Sửa Post:** định danh Post, tiêu đề và/hoặc nội dung. MUST NOT chấp nhận phạm vi, đích, tác giả
  hay trạng thái.
- **Xoá mềm / khôi phục Post:** định danh Post.
- **Đọc Post:** định danh Post.
- **Liệt kê Post:** trang, kích thước trang, bộ lọc tuỳ chọn: phạm vi, `problemId`, `courseId`.
- **Bài của tôi:** trang, kích thước trang.

## Đầu ra

- Tạo thành công trả về biểu diễn Post gồm định danh ổn định.
- Biểu diễn Post gồm định danh, tác giả, phạm vi, đích, tiêu đề, nội dung, thời điểm tạo và thời
  điểm chỉnh sửa gần nhất. Khi người gọi là tác giả, biểu diễn bổ sung trạng thái xoá mềm và trạng
  thái kiểm duyệt.
- Danh sách trả về một trang bản tóm tắt Post và thông tin phân trang; không bao giờ tiết lộ số lượng
  Post đã xoá mềm hay bị ẩn của người khác.
- Biểu diễn Post MAY được COM-002 tới COM-005 bổ sung trường của riêng họ (ví dụ số LIKE) theo đặc tả
  của họ.
- COM-001 không phát domain event nào.

## Tình huống lỗi

| Trường hợp                                                             | Hành vi quan sát được                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Thiếu hoặc sai xác thực, thiếu định danh tin cậy                       | `401`; không thay đổi state                               |
| Không phải tác giả khi sửa/xoá mềm/khôi phục Post đang hiển thị với họ | `403`; không thay đổi state                               |
| Post không tồn tại hoặc không hiển thị với người gọi                   | `404`; không lộ sự tồn tại                                |
| Tiêu đề/nội dung rỗng, quá dài, có HTML/script thô ngoài khối mã       | Lỗi kiểm tra dữ liệu (`400`); không thay đổi state        |
| Phạm vi và đích không khớp, đích không phải UUID                       | Lỗi kiểm tra dữ liệu (`400`); không tạo Post              |
| Trường không được phép trong đầu vào                                   | Lỗi kiểm tra dữ liệu (`400`); không thay đổi state        |
| Sửa hoặc xoá mềm Post đã xoá mềm; khôi phục Post chưa bị xoá           | Lỗi trạng thái không hợp lệ (`409`); không thay đổi state |
| Tham số phân trang/lọc sai định dạng                                   | Lỗi kiểm tra dữ liệu (`400`)                              |
| Lỗi lưu trữ ngoài dự kiến                                              | Lỗi chuẩn hoá hiện có, không kèm dữ liệu nội bộ           |

COM-001 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Post `PROBLEM`/`COURSE` trỏ tới Problem hay Course không tồn tại hoặc chưa công khai vẫn được lưu
  (FR-004); Community không biết và không suy ra trạng thái Learning.
- Khối mã Markdown chứa `<stdio.h>`, `vector<int>` hay `<script>` là văn bản hợp lệ, vì nằm trong
  khối mã hoặc đoạn mã.
- Sửa đồng thời hai lần: lần sau ghi đè lần trước; không lần nào để lại nội dung trộn.
- Sửa đồng thời với xoá mềm: nếu xoá mềm thắng, lần sửa bị từ chối với lỗi trạng thái không hợp lệ.
- Khôi phục một Post đang bị ẩn bởi kiểm duyệt: Post trở về chưa xoá nhưng vẫn bị ẩn.
- Trang vượt quá số trang thực tế trả về danh sách rỗng.

## Yêu cầu bảo mật

- **COM-001-SR-001 — Phân quyền phía server:** Community MUST thực thi xác thực, sở hữu và quy tắc
  hiển thị tại ranh giới backend tin cậy.
- **COM-001-SR-002 — Ngữ cảnh tác nhân tin cậy:** Định danh MUST chỉ đến từ header do Gateway đặt;
  thiếu hoặc sai định dạng thì từ chối.
- **COM-001-SR-003 — Chống gán hàng loạt:** Đầu vào MUST liệt kê tường minh các trường được phép; tác
  giả, trạng thái, ghim, mốc thời gian, vai trò và quyền không thể bị đặt qua request.
- **COM-001-SR-004 — Không lộ nội dung không công khai:** Post đã xoá mềm hoặc bị ẩn bởi kiểm duyệt
  MUST NOT lộ qua danh sách, chi tiết, số lượng hay thông báo lỗi với người không phải tác giả.
- **COM-001-SR-005 — Nội dung an toàn:** Backend MUST từ chối HTML/script thô ngoài khối mã và MUST
  NOT render hay thực thi nội dung.
- **COM-001-SR-006 — Cách ly service/cơ sở dữ liệu:** Không truy vấn cơ sở dữ liệu của service khác,
  không khoá ngoại xuyên service.
- **COM-001-SR-007 — Ghi log an toàn:** Nội dung Post, header xác thực và token MUST NOT được ghi vào
  log.

## Tiêu chí nghiệm thu

- **COM-001-AC-001:** Cho trước một người dùng đã xác thực, khi tạo Post `GLOBAL` hợp lệ, thì Post
  được lưu với định danh ổn định và tác giả là người gọi.
- **COM-001-AC-002:** Cho trước một Post `PROBLEM` kèm `problemId` hợp lệ, khi tạo, thì Post lưu đúng
  `problemId`, không có `courseId`, và Community không gọi Learning.
- **COM-001-AC-003:** Cho trước đầu vào `GLOBAL` kèm `problemId`, `PROBLEM` thiếu `problemId`, hoặc
  có cả `problemId` lẫn `courseId`, khi tạo, thì bị từ chối `400` và không có Post nào được tạo.
- **COM-001-AC-004:** Cho trước một request không có định danh tin cậy, khi gọi bất kỳ thao tác Post
  nào, thì nhận `401` và không có thay đổi state.
- **COM-001-AC-005:** Cho trước body có tác giả, trạng thái xoá, trạng thái ẩn hoặc ghim, khi tạo hay
  sửa, thì bị từ chối `400` và các trường đó không làm thay đổi state.
- **COM-001-AC-006:** Cho trước tiêu đề rỗng, tiêu đề trên 200 ký tự, nội dung trên 10.000 ký tự,
  hoặc nội dung có thẻ HTML/script ngoài khối mã, khi tạo hay sửa, thì bị từ chối `400`.
- **COM-001-AC-007:** Cho trước nội dung có `#include <stdio.h>` bên trong khối mã Markdown, khi tạo,
  thì Post được lưu nguyên vẹn.
- **COM-001-AC-008:** Cho trước nhiều Post đang hiển thị, khi liệt kê, thì nhận trang mới nhất trước,
  mặc định 20 mục; khi yêu cầu kích thước trang lớn hơn 50, thì bị từ chối `400`.
- **COM-001-AC-009:** Cho trước Post của nhiều phạm vi, khi liệt kê với bộ lọc `problemId`, thì chỉ
  nhận Post `PROBLEM` gắn đúng `problemId` đó.
- **COM-001-AC-010:** Cho trước tác giả của một Post chưa xoá, khi sửa tiêu đề hoặc nội dung, thì thay
  đổi được lưu, mốc chỉnh sửa được cập nhật, phạm vi và đích không đổi.
- **COM-001-AC-011:** Cho trước một người dùng không phải tác giả, khi sửa, xoá mềm hay khôi phục Post
  đang hiển thị với họ, thì nhận `403` và Post không đổi.
- **COM-001-AC-012:** Cho trước tác giả xoá mềm Post, khi người khác đọc chi tiết hoặc liệt kê, thì
  Post không xuất hiện và đọc chi tiết trả `404`.
- **COM-001-AC-013:** Cho trước một Post đã xoá mềm, khi tác giả khôi phục, thì Post hiển thị lại như
  trước khi xoá.
- **COM-001-AC-014:** Cho trước Post đã xoá mềm, khi tác giả sửa hoặc xoá mềm lần nữa, thì nhận `409`;
  cho trước Post chưa xoá, khi tác giả khôi phục, thì nhận `409`.
- **COM-001-AC-015:** Cho trước một Post bị ẩn bởi kiểm duyệt, khi người không phải tác giả đọc hoặc
  liệt kê, thì Post không xuất hiện và chi tiết trả `404`; khi tác giả đọc, thì nhận Post kèm trạng
  thái bị ẩn.
- **COM-001-AC-016:** Cho trước tác giả có Post đang hiển thị, đã xoá mềm và bị ẩn, khi liệt kê "bài
  của tôi", thì nhận cả ba kèm trạng thái đúng của từng Post.
- **COM-001-AC-017:** Cho trước một `ADMIN` hoặc `LECTURER` không phải tác giả, khi sửa hay xoá mềm
  Post của người khác, thì nhận `403`.
- **COM-001-AC-018:** Cho trước tác giả sửa một Post bị ẩn bởi kiểm duyệt, khi lưu, thì Post vẫn bị
  ẩn.
- **COM-001-AC-019:** Cho trước một Post không hiển thị công khai (đã xoá mềm hoặc bị ẩn), khi một tính
  năng Community khác hỏi Post có nhận tương tác mới không, thì câu trả lời là không.
- **COM-001-AC-020:** Cho trước phản hồi, lỗi và log của thao tác Post, khi kiểm tra, thì không chứa
  header xác thực, token, hay dữ liệu của Post không hiển thị với người gọi.

## Ngoài phạm vi

- Kiểm tra sự tồn tại hay trạng thái Problem/Course qua Learning
- Ghim bài, bài nổi bật, sắp theo độ phổ biến
- Tìm kiếm toàn văn
- Thẻ (tag), danh mục riêng của Community
- Đính kèm file, ảnh
- Lịch sử phiên bản khi sửa
- Xoá cứng Post
- Kiểm tra tự động lời giải/mã nguồn trong nội dung
- Thông báo (notification), theo dõi bài, realtime
- Hiển thị tên/ảnh tác giả (frontend tự phân giải `authorId`)
- Bình luận (COM-002), Reaction (COM-003), Bookmark (COM-004), báo cáo và kiểm duyệt (COM-005)
- Giới hạn tần suất đăng bài riêng của Community

## Phụ thuộc

- [Kiến trúc Community Service](../../../architecture/community-service.md)
- [Quy tắc phụ thuộc](../../../architecture/dependency-rules.md)
- [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [ID-003 RBAC](../../01-identity/rbac/spec.md): header định danh tin cậy do Gateway đặt.
- [COM-002 Bình luận](../comments/spec.md): dùng FR-016 để biết Post có nhận bình luận mới không.
- [COM-005 Kiểm duyệt](../moderation/spec.md): sở hữu trạng thái ẩn bởi kiểm duyệt mà FR-013 tôn
  trọng, quy tắc hiển thị COM-005-FR-012 và trạng thái cho tác giả COM-005-FR-013.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp ngày
2026-09-30:

1. **Ai được đăng bài?** Mọi người dùng đã xác thực; không thêm mã quyền mới (FR-002, Quy tắc phân
   quyền).
2. **Gắn đích thế nào?** Giữ `scope` hiện có; `PROBLEM` cần đúng `problemId`, `COURSE` cần đúng
   `courseId`, `GLOBAL` không có đích; không khớp thì từ chối thay vì âm thầm sửa (FR-003).
3. **Có kiểm tra Problem/Course tồn tại không?** Không ở v1; lưu UUID thuần, không gọi Learning
   (FR-004). Lý do: Learning chưa có endpoint phù hợp và kiểm tra không thay đổi quyền truy cập.
4. **Có tiêu đề không?** Có, bắt buộc, tối đa 200 ký tự; nội dung giữ trần 10.000 ký tự hiện có.
5. **Sửa được gì?** Chỉ tiêu đề và nội dung; phạm vi và đích bất biến; không giới hạn thời gian sửa;
   ghi mốc chỉnh sửa, không lưu lịch sử.
6. **Xoá thế nào?** Chỉ xoá mềm; tác giả khôi phục được, không giới hạn thời gian (FR-010, FR-011).
7. **Ai thấy Post đã xoá hoặc bị ẩn?** Chỉ tác giả, qua "bài của tôi" và chi tiết (FR-008, FR-013).
8. **Trạng thái kiểm duyệt?** COM-005 sở hữu và thay đổi; COM-001 chỉ tôn trọng khi đọc, sửa không bỏ
   ẩn (FR-013).
9. **Phân trang?** Mặc định 20, tối đa 50, mới nhất trước; bỏ ghim khỏi thứ tự (ghim là Ngoài phạm
   vi).
10. **Định dạng nội dung?** Markdown hạn chế, từ chối HTML/script thô ngoài khối mã; frontend làm
    sạch (FR-014).
11. **Quy tắc không đăng lời giải?** Quy tắc mềm, không kiểm tự động (FR-015).

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                        |
| ---------- | --------- | ----------------------------------- | -------------------------------------------------------------- |
| 2026-09-30 | 0.1       | DuongPham-Barca (cùng Claude Code)  | Đặc tả COM-001 ban đầu                                         |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Chốt 11 quyết định theo phương án đề xuất và phê duyệt COM-001 |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
