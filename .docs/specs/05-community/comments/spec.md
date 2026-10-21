# COM-002 Bình luận và trả lời (Comments)

## Trạng thái

Approved

Phiên bản `1.0`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất).

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép người dùng đã xác thực thảo luận dưới một Post bằng Comment gốc và trả lời một cấp vào
Comment gốc, đọc luồng thảo luận theo thứ tự thời gian, và cho phép tác giả sửa, xoá mềm và khôi
phục Comment của chính mình, theo cùng quy tắc hiển thị mà kiểm duyệt (COM-005) dùng.

## Tác nhân

- **Người dùng đã xác thực (`STUDENT`, `LECTURER`, `ADMIN`):** Viết Comment gốc và trả lời trên Post
  đang nhận tương tác, đọc Comment của Post đang hiển thị với họ, sửa, xoá mềm và khôi phục Comment
  của chính mình. Vai trò không cấp thêm thẩm quyền với Comment của người khác.
- **Tác giả Comment:** Người dùng có định danh trùng `authorId` của Comment. Là tác nhân duy nhất được
  sửa, xoá mềm, khôi phục Comment đó, và thấy Comment đó kèm trạng thái khi nó đã xoá mềm hoặc bị ẩn
  bởi kiểm duyệt.
- **Tác giả Post:** Không có thẩm quyền gì thêm với Comment của người khác trên Post của mình.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token và đặt lại header định danh tin cậy.
- **Community Service:** Chủ sở hữu Comment, quy tắc độ sâu trả lời, sở hữu và xoá mềm Comment.
- **COM-001 Posts:** Cho biết Post có hiển thị với người gọi và có nhận tương tác mới không.
- **COM-005 Kiểm duyệt:** Sở hữu trạng thái ẩn bởi kiểm duyệt của Comment; không phải tác nhân của
  COM-002.

## Bối cảnh

Nền tảng mã nguồn hiện có (không phải bản triển khai của đặc tả này):

- Bảng `comments` trong `bkpractice_community` có `post_id` (khoá ngoại nội bộ tới `posts`,
  `ON DELETE CASCADE`), `author_id`, `parent_comment_id` (khoá ngoại nội bộ tới `comments`,
  `ON DELETE CASCADE`), `content` (text), `is_hidden` (mặc định `false`), `created_at`,
  `updated_at`. Chưa có dấu xoá mềm hay mốc chỉnh sửa, chưa có index ngoài khoá chính.
- `POST /api/community/posts/:id/comments` (trong module `posts`) tạo Comment 1 tới 5.000 ký tự, tuỳ
  chọn `parentCommentId`; từ chối khi Post bị ẩn hoặc không tồn tại (`404`), khi Comment cha không
  thuộc Post (`404`), và khi Comment cha đã là một trả lời (`422`).
- Chưa có API đọc, sửa, xoá hay khôi phục Comment.
- COM-001 thêm xoá mềm Post, trạng thái hiển thị và truy vấn "Post có nhận tương tác mới không"
  (COM-001-FR-013, FR-016).

## Yêu cầu chức năng

- **COM-002-FR-001 — Quyền sở hữu của Community:** Community MUST sở hữu mọi Comment. Không service
  nào khác lưu hay sửa Comment.
- **COM-002-FR-002 — Thuộc về một Post:** Mọi Comment MUST thuộc đúng một Post và MUST có định danh
  ổn định. Post và Comment cha của một Comment MUST bất biến sau khi tạo.
- **COM-002-FR-003 — Tạo Comment gốc:** Người dùng đã xác thực MUST có thể tạo Comment gốc trên Post
  đang nhận tương tác mới (COM-001-FR-016). Tác giả MUST lấy từ ngữ cảnh xác thực tin cậy.
- **COM-002-FR-004 — Trả lời một cấp:** Người dùng đã xác thực MUST có thể trả lời một Comment gốc
  đang hiển thị công khai của cùng Post. Trả lời vào một trả lời MUST bị từ chối; hệ thống MUST NOT tự
  chuyển nó thành trả lời của Comment gốc.
- **COM-002-FR-005 — Đọc luồng Comment gốc:** Người dùng mà Post hiển thị với họ MUST có thể liệt kê
  Comment gốc của Post đó, có phân trang, cũ nhất trước, mỗi mục kèm số trả lời hiển thị với người
  gọi.
- **COM-002-FR-006 — Đọc trả lời:** Người dùng mà Comment gốc hiển thị với họ MUST có thể liệt kê trả
  lời của Comment gốc đó, có phân trang, cũ nhất trước.
- **COM-002-FR-007 — Sửa Comment:** Tác giả MUST có thể sửa nội dung Comment chưa bị xoá mềm của
  chính mình khi Post còn hiển thị với họ. Lần sửa MUST ghi mốc chỉnh sửa gần nhất.
- **COM-002-FR-008 — Xoá mềm Comment:** Tác giả MUST có thể xoá mềm Comment của chính mình. Dữ liệu
  MUST được giữ lại. Xoá mềm Comment gốc MUST NOT xoá hay sửa các trả lời của nó; chúng chỉ không
  hiển thị theo FR-010 và hiện lại khi Comment gốc được khôi phục.
- **COM-002-FR-009 — Khôi phục Comment:** Tác giả MUST có thể khôi phục Comment đã xoá mềm của chính
  mình khi Post chưa bị xoá mềm. Khôi phục giữ nguyên trạng thái kiểm duyệt.
- **COM-002-FR-010 — Hiển thị trong luồng:** Luồng Comment MUST áp dụng đúng quy tắc hiển thị
  COM-005-FR-012: một Comment chỉ hiển thị với người gọi khi nó chưa bị xoá mềm, không bị ẩn bởi kiểm
  duyệt hoặc người gọi là tác giả của nó, Post chứa nó hiển thị với người gọi, và (nếu là trả lời)
  Comment gốc của nó cũng hiển thị với người gọi. Comment không hiển thị MUST bị bỏ khỏi danh sách, không
  để lại chỗ giữ chỗ, số đếm hay dấu vết nào.
- **COM-002-FR-011 — Comment của tôi:** Tác giả MUST có thể liệt kê Comment của chính mình, có phân
  trang, mới nhất trước, gồm cả Comment đã xoá mềm và bị ẩn bởi kiểm duyệt, kèm nội dung, Post chứa nó
  và trạng thái, để có thể khôi phục. Đây là luồng quản lý của tác giả, chỉ trả nội dung của chính
  người gọi.
- **COM-002-FR-012 — Không xoá cứng:** COM-002 MUST NOT cung cấp thao tác xoá cứng Comment.
- **COM-002-FR-013 — Theo hiển thị của Post:** Khi Post không hiển thị với người gọi, mọi thao tác
  Comment trên Post đó MUST bị từ chối như không tìm thấy. Khi Post hiển thị với người gọi nhưng
  không nhận tương tác mới, tạo Comment và trả lời MUST bị từ chối với lỗi trạng thái không hợp lệ.
- **COM-002-FR-014 — Hiển thị theo kiểm duyệt:** Comment bị ẩn bởi kiểm duyệt (trạng thái do COM-005 sở
  hữu và thay đổi) MUST NOT hiển thị với người không phải tác giả. Biểu diễn trả cho tác giả MUST kèm
  trạng thái kiểm duyệt theo COM-005-FR-013. Không thao tác nào của COM-002 được thay đổi trạng thái
  kiểm duyệt; sửa Comment bị ẩn không bỏ ẩn nó.
- **COM-002-FR-015 — Nội dung Markdown hạn chế:** Nội dung Comment là Markdown hạn chế, 1 tới 5.000 ký
  tự sau khi bỏ khoảng trắng đầu/cuối, theo cùng quy tắc HTML/script của COM-001-FR-014.
- **COM-002-FR-016 — Quy tắc nội dung mềm:** Quy tắc không đăng lời giải hoặc mã nguồn kèm đáp án
  áp dụng cho Comment như COM-001-FR-015: không kiểm tra tự động ở v1.
- **COM-002-FR-017 — Thông tin cho tính năng khác:** Community MUST cho COM-003 và COM-005 biết một
  Comment có tồn tại, có hiển thị với một người gọi, và có đang nhận tương tác mới hay không. Một
  Comment chỉ nhận tương tác mới khi nó, Post của nó và (nếu là trả lời) Comment gốc của nó đều đang
  hiển thị công khai.
- **COM-002-FR-018 — Retry xác định:** Thao tác bị từ chối hay thất bại MUST để nguyên Comment. Đọc lặp
  lại MUST NOT thay đổi state. Xoá mềm Comment đã xoá mềm và khôi phục Comment chưa bị xoá MUST bị từ
  chối với lỗi trạng thái không hợp lệ.

## Quy tắc nghiệp vụ

### Cấu trúc luồng

```text
Post
├── Comment gốc A
│   ├── Trả lời A1
│   └── Trả lời A2
└── Comment gốc B
```

- Comment gốc không có Comment cha. Trả lời có đúng một Comment cha là Comment gốc của cùng Post.
- Không có cấp thứ ba. Người dùng muốn đáp một trả lời thì trả lời vào Comment gốc của nó.
- Comment gốc và trả lời sắp theo thời điểm tạo tăng dần, hoà thì theo định danh.
- Kích thước trang mặc định 20, tối đa 50, cho cả Comment gốc và trả lời.

### Trạng thái của Comment

Như Post, Comment có hai trục độc lập: xoá mềm (tác giả, COM-002) và ẩn bởi kiểm duyệt (COM-005).
Comment **đang hiển thị công khai** khi chưa bị xoá mềm và không bị ẩn.

| Tình trạng Comment             | Người không phải tác giả trong luồng | Tác giả trong luồng     | Tác giả ở "Comment của tôi" | Sửa   | Xoá mềm | Khôi phục | Được trả lời / tương tác     |
| ------------------------------ | ------------------------------------ | ----------------------- | --------------------------- | ----- | ------- | --------- | ---------------------------- |
| Hiển thị công khai             | Thấy                                 | Thấy                    | Thấy                        | Có    | Có      | Không     | Có (nếu Post nhận tương tác) |
| Bị ẩn bởi kiểm duyệt, chưa xoá | Không thấy                           | Thấy, kèm trạng thái ẩn | Thấy, kèm trạng thái        | Có    | Có      | Không     | Không                        |
| Đã xoá mềm                     | Không thấy                           | Không thấy              | Thấy, kèm trạng thái xoá    | Không | Không   | Có        | Không                        |

- Hai cột "trong luồng" chỉ áp dụng khi Post hiển thị với người gọi (FR-013), và với trả lời, khi
  Comment gốc cũng hiển thị với người gọi (FR-010).
- Số trả lời của Comment gốc chỉ đếm trả lời hiển thị với người gọi.
- Xoá mềm hay khôi phục Post, hay Comment gốc, không thay đổi state của Comment khác.

### Dữ liệu của Comment

- **Nội dung:** Markdown hạn chế, 1 tới 5.000 ký tự.
- **Post:** định danh Post; bất biến.
- **Comment cha:** không có (gốc) hoặc định danh Comment gốc; bất biến.
- **Tác giả:** từ ngữ cảnh tin cậy; bất biến.
- **Mốc thời gian:** tạo, chỉnh sửa gần nhất, xoá mềm (chỉ tác giả thấy).

## Quy tắc phân quyền

- Mọi thao tác đòi hỏi người dùng đã xác thực qua định danh tin cậy do Gateway đặt; thiếu hoặc sai
  định dạng thì từ chối là chưa xác thực.
- COM-002 không định nghĩa mã quyền mới. Mọi người dùng đã xác thực được viết và đọc Comment theo
  hiển thị của Post; sở hữu là điều kiện duy nhất để sửa, xoá mềm, khôi phục.
- Tác giả Post, `ADMIN` và `LECTURER` không có thẩm quyền ngầm với Comment của người khác. Thẩm quyền
  kiểm duyệt thuộc COM-005 (`community:moderate`).
- Phạm vi quyền: theo hiển thị của Post cho tạo/đọc; phạm vi tài nguyên (sở hữu) cho
  sửa/xoá/khôi phục.
- Định danh MUST NOT lấy từ body, query, route hay header do client gửi.

## Đầu vào

Các thao tác dưới đây là thao tác ở mức khái niệm; route và DTO thuộc về `plan.md`.

- **Tạo Comment:** định danh Post, nội dung, định danh Comment cha tuỳ chọn. MUST NOT chấp nhận tác
  giả, mốc thời gian, trạng thái, vai trò hay quyền.
- **Sửa Comment:** định danh Comment, nội dung. MUST NOT chấp nhận Post, Comment cha, tác giả hay
  trạng thái.
- **Xoá mềm / khôi phục Comment:** định danh Comment.
- **Liệt kê Comment gốc:** định danh Post, trang, kích thước trang.
- **Liệt kê trả lời:** định danh Comment gốc, trang, kích thước trang.
- **Comment của tôi:** trang, kích thước trang.

## Đầu ra

- Tạo thành công trả về biểu diễn Comment gồm định danh ổn định.
- Biểu diễn Comment gồm định danh, định danh Post, định danh Comment cha, tác giả, nội dung, thời
  điểm tạo, thời điểm chỉnh sửa gần nhất; Comment gốc kèm số trả lời hiển thị với người gọi. Khi người
  gọi là tác giả, kèm trạng thái xoá mềm và trạng thái kiểm duyệt (COM-005-FR-013).
- Danh sách trả về một trang và thông tin phân trang; không tiết lộ số Comment không hiển thị của
  người khác.
- Biểu diễn Comment MAY được COM-003 và COM-005 bổ sung trường của riêng họ.
- COM-002 không phát domain event nào.

## Tình huống lỗi

| Trường hợp                                                           | Hành vi quan sát được                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| Thiếu hoặc sai xác thực, thiếu định danh tin cậy                     | `401`; không thay đổi state                               |
| Post không tồn tại hoặc không hiển thị với người gọi                 | `404`; không lộ sự tồn tại                                |
| Comment không tồn tại hoặc không hiển thị với người gọi              | `404`                                                     |
| Comment cha không thuộc Post, hoặc không hiển thị công khai          | `404`; không tạo Comment                                  |
| Comment cha là một trả lời                                           | Lỗi kiểm tra dữ liệu (`400`); không tạo Comment           |
| Post hiển thị với người gọi nhưng không nhận tương tác mới           | Lỗi trạng thái không hợp lệ (`409`); không tạo Comment    |
| Không phải tác giả khi sửa/xoá mềm/khôi phục Comment hiển thị với họ | `403`; không thay đổi state                               |
| Nội dung rỗng, quá dài, có HTML/script thô ngoài khối mã, trường lạ  | Lỗi kiểm tra dữ liệu (`400`)                              |
| Sửa/xoá mềm Comment đã xoá mềm; khôi phục Comment chưa xoá           | Lỗi trạng thái không hợp lệ (`409`); không thay đổi state |
| Tham số phân trang sai định dạng                                     | Lỗi kiểm tra dữ liệu (`400`)                              |
| Lỗi lưu trữ ngoài dự kiến                                            | Lỗi chuẩn hoá hiện có, không kèm dữ liệu nội bộ           |

COM-002 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Post có Comment rồi bị tác giả Post xoá mềm: Post đã xoá không hiển thị với ai qua chi tiết
  (COM-001), nên Comment của nó không đọc được với ai, kể cả tác giả Post; khi Post được khôi phục,
  Comment hiện lại như cũ.
- Tác giả Post đọc được Comment trên Post bị ẩn bởi kiểm duyệt của mình nhưng không ai tạo được
  Comment mới trên Post đó.
- Comment gốc bị xoá mềm trong lúc có người đang trả lời: nếu xoá thắng, lần trả lời bị từ chối
  `404`.
- Comment gốc có trả lời bị xoá mềm hoặc bị ẩn: trả lời không còn hiện với người khác (kể cả với tác
  giả trả lời, trừ khi họ cũng là tác giả Comment gốc bị ẩn), nhưng vẫn nằm trong "Comment của tôi"
  của tác giả trả lời; khôi phục Comment gốc làm chúng hiện lại theo trạng thái riêng.
- Tác giả một trả lời có Comment gốc đã bị xoá vẫn sửa, xoá mềm, khôi phục được trả lời của mình (tìm
  qua "Comment của tôi"), miễn Post còn hiển thị với họ; trả lời chỉ hiện lại trong luồng khi Comment
  gốc hiển thị trở lại.
- Trang vượt số trang thực tế trả về danh sách rỗng.

## Yêu cầu bảo mật

- **COM-002-SR-001 — Phân quyền phía server:** Community MUST thực thi xác thực, sở hữu, độ sâu và
  hiển thị tại ranh giới backend tin cậy.
- **COM-002-SR-002 — Ngữ cảnh tác nhân tin cậy:** Định danh MUST chỉ đến từ header do Gateway đặt.
- **COM-002-SR-003 — Chống gán hàng loạt:** Đầu vào MUST liệt kê tường minh trường được phép.
- **COM-002-SR-004 — Không lộ nội dung không công khai:** Nội dung và tác giả của Comment đã xoá mềm
  hoặc bị ẩn MUST NOT lộ với người không phải tác giả, kể cả qua số đếm hay thông báo lỗi; Comment của
  Post không hiển thị, và trả lời của Comment gốc không hiển thị, MUST NOT lộ.
- **COM-002-SR-005 — Nội dung an toàn:** Như COM-001-SR-005.
- **COM-002-SR-006 — Cách ly service/cơ sở dữ liệu:** Không truy vấn cơ sở dữ liệu của service khác.
- **COM-002-SR-007 — Ghi log an toàn:** Nội dung Comment, header xác thực và token MUST NOT được ghi
  vào log.

## Tiêu chí nghiệm thu

- **COM-002-AC-001:** Cho trước một Post đang hiển thị công khai, khi người dùng đã xác thực tạo
  Comment gốc hợp lệ, thì Comment được lưu với tác giả là người gọi và không có Comment cha.
- **COM-002-AC-002:** Cho trước một Comment gốc đang hiển thị công khai, khi người dùng trả lời nó,
  thì trả lời được lưu với Comment cha là Comment gốc đó.
- **COM-002-AC-003:** Cho trước một trả lời, khi người dùng trả lời vào trả lời đó, thì bị từ chối
  `400` và không có Comment nào được tạo.
- **COM-002-AC-004:** Cho trước Comment cha thuộc Post khác, khi tạo trả lời, thì bị từ chối `404`.
- **COM-002-AC-005:** Cho trước Post đã xoá mềm, hoặc bị ẩn mà người gọi không phải tác giả Post, khi
  tạo, đọc, sửa hay xoá Comment trên Post đó, thì nhận `404`.
- **COM-002-AC-006:** Cho trước Post bị ẩn bởi kiểm duyệt, khi chính tác giả Post tạo Comment, thì
  nhận `409`; khi tác giả Post liệt kê Comment, thì nhận luồng như thường.
- **COM-002-AC-007:** Cho trước request không có định danh tin cậy, khi gọi bất kỳ thao tác Comment
  nào, thì nhận `401`.
- **COM-002-AC-008:** Cho trước nội dung rỗng, trên 5.000 ký tự, hoặc có thẻ HTML/script ngoài khối
  mã, khi tạo hay sửa, thì bị từ chối `400`.
- **COM-002-AC-009:** Cho trước nhiều Comment gốc và trả lời, khi liệt kê Comment gốc, thì nhận trang
  cũ nhất trước, mặc định 20 mục, mỗi mục kèm số trả lời hiển thị với người gọi; khi liệt kê trả lời
  của một Comment gốc, thì nhận trả lời cũ nhất trước.
- **COM-002-AC-010:** Cho trước tác giả sửa Comment chưa xoá, khi lưu, thì nội dung và mốc chỉnh sửa
  được cập nhật, Post và Comment cha không đổi.
- **COM-002-AC-011:** Cho trước người không phải tác giả Comment (kể cả tác giả Post, `ADMIN`,
  `LECTURER`), khi sửa, xoá mềm hay khôi phục Comment đang hiển thị với họ, thì nhận `403`.
- **COM-002-AC-012:** Cho trước Comment gốc bị xoá mềm có trả lời, khi bất kỳ ai liệt kê luồng hoặc
  liệt kê trả lời của nó, thì cả Comment gốc lẫn các trả lời không xuất hiện (liệt kê trả lời trả
  `404`), không có chỗ giữ chỗ hay số đếm nào; khi tác giả khôi phục Comment gốc, thì các trả lời hiện
  lại theo trạng thái riêng.
- **COM-002-AC-013:** Cho trước một trả lời bị xoá mềm, khi bất kỳ ai liệt kê trả lời, thì nó không
  xuất hiện và số trả lời của Comment gốc không đếm nó.
- **COM-002-AC-014:** Cho trước tác giả có Comment đã xoá mềm và Comment bị ẩn, khi tác giả liệt kê
  "Comment của tôi", thì thấy cả hai kèm nội dung, Post chứa nó và trạng thái; khi khôi phục Comment
  đã xoá, thì nó hiển thị lại trong luồng.
- **COM-002-AC-015:** Cho trước Comment đã xoá mềm, khi tác giả sửa hoặc xoá lần nữa, thì nhận `409`;
  cho trước Comment chưa xoá, khi tác giả khôi phục, thì nhận `409`.
- **COM-002-AC-016:** Cho trước Comment gốc bị ẩn bởi kiểm duyệt có trả lời, khi người không phải tác
  giả Comment gốc liệt kê, thì Comment gốc và mọi trả lời của nó không xuất hiện; khi tác giả Comment
  gốc liệt kê, thì thấy nó kèm trạng thái ẩn; khi tác giả sửa, thì Comment vẫn bị ẩn.
- **COM-002-AC-017:** Cho trước Comment gốc bị ẩn hoặc đã xoá mềm, khi người dùng trả lời nó, thì bị
  từ chối và không có trả lời nào được tạo.
- **COM-002-AC-018:** Cho trước body chứa tác giả, Post khác, Comment cha khi sửa, hoặc trạng thái,
  khi kiểm tra dữ liệu, thì bị từ chối `400` và state không đổi.
- **COM-002-AC-019:** Cho trước Comment, Post của nó hoặc Comment gốc của nó không hiển thị công khai,
  khi một tính năng
  Community khác hỏi Comment có nhận tương tác mới không, thì câu trả lời là không.
- **COM-002-AC-020:** Cho trước phản hồi, lỗi và log của thao tác Comment, khi kiểm tra, thì không
  chứa header xác thực, token, hay nội dung của Comment không hiển thị với người gọi.

## Ngoài phạm vi

- Trả lời lồng sâu hơn một cấp
- Nhắc tên (mention), thông báo, theo dõi luồng, realtime
- Tác giả Post quản lý, ẩn hay xoá Comment của người khác
- Chỗ giữ chỗ cho Comment gốc đã xoá hoặc bị ẩn (trả lời ẩn theo Comment gốc, COM-005-FR-012)
- Đánh dấu Comment là câu trả lời được chấp nhận
- Sắp theo độ phổ biến, tìm kiếm Comment
- Số Comment trên bản tóm tắt Post
- Lịch sử phiên bản khi sửa, xoá cứng Comment
- Đính kèm file, ảnh
- Kiểm tra tự động lời giải/mã nguồn
- Reaction trên Comment (COM-003), báo cáo và kiểm duyệt Comment (COM-005)

## Phụ thuộc

- [Kiến trúc Community Service](../../../architecture/community-service.md)
- [Quy tắc phụ thuộc](../../../architecture/dependency-rules.md)
- [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [COM-001 Bài viết cộng đồng](../posts/spec.md): hiển thị Post, xoá mềm Post, COM-001-FR-014 (Markdown
  hạn chế), COM-001-FR-016 (Post nhận tương tác mới).
- [COM-005 Kiểm duyệt](../moderation/spec.md): sở hữu trạng thái ẩn của Comment, quy tắc hiển thị
  COM-005-FR-012 mà FR-010 áp dụng, và trạng thái cho tác giả COM-005-FR-013.
- COM-003 Reactions và COM-005 dùng COM-002-FR-017.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp ngày
2026-09-30:

1. **Ai được bình luận?** Mọi người dùng đã xác thực, trên Post đang nhận tương tác mới; không thêm mã
   quyền (FR-003).
2. **Độ sâu trả lời?** Một cấp; trả lời vào trả lời bị từ chối `400`, không tự chuyển lên Comment gốc
   (FR-004). Mã `422` hiện có đổi thành `400` cho đúng quy ước lỗi của hệ thống.
3. **Giới hạn nội dung?** Giữ 1 tới 5.000 ký tự hiện có, Markdown hạn chế như COM-001 (FR-015).
4. **Sửa?** Tác giả sửa nội dung, không giới hạn thời gian, ghi mốc chỉnh sửa, không lưu lịch sử
   (FR-007).
5. **Xoá?** Xoá mềm và khôi phục bởi tác giả; không xoá cứng (FR-008, FR-009, FR-012).
6. **Comment gốc bị xoá hoặc bị ẩn có trả lời?** Trả lời không hiển thị theo Comment gốc, giữ nguyên
   dữ liệu và hiện lại khi gốc được khôi phục; không có chỗ giữ chỗ. Chọn để khớp quy tắc hiển thị
   COM-005-FR-012 (Approved song song) thay vì định nghĩa quy tắc riêng (FR-008, FR-010).
7. **Tác giả Post có quyền với Comment của người khác?** Không ở v1; xử lý qua báo cáo COM-005.
8. **Thứ tự và phân trang?** Cũ nhất trước; Comment gốc và trả lời phân trang riêng, mặc định 20, tối
   đa 50; Comment gốc kèm số trả lời (FR-005, FR-006).
9. **Comment trên Post bị ẩn/đã xoá?** Theo hiển thị của Post: không hiển thị thì `404`; hiển thị
   nhưng không nhận tương tác thì không tạo mới được (`409`) (FR-013).
10. **Trạng thái kiểm duyệt Comment?** COM-005 sở hữu; COM-002 chỉ tôn trọng khi đọc (FR-014).
11. **Tác giả tìm lại Comment đã xoá thế nào?** Qua "Comment của tôi", một luồng quản lý chỉ trả
    Comment của chính người gọi kèm trạng thái (FR-011); trong luồng thông thường, Comment đã xoá mềm
    không hiện với ai theo COM-005-FR-012.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                        |
| ---------- | --------- | ----------------------------------- | -------------------------------------------------------------- |
| 2026-09-30 | 0.1       | DuongPham-Barca (cùng Claude Code)  | Đặc tả COM-002 ban đầu                                         |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Chốt 11 quyết định theo phương án đề xuất và phê duyệt COM-002 |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
