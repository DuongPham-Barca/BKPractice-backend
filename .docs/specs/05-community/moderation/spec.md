# COM-005 Moderation

## Trạng thái

Approved

Phiên bản `1.1`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất). Bản 1.1 căn hành vi Comment gốc bị ẩn với COM-002-FR-010.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép người dùng đã xác thực báo cáo Post hoặc Comment vi phạm với lý do từ một danh sách cố
định, và cho người kiểm duyệt có quyền `community:moderate` xem báo cáo, ẩn hoặc khôi phục nội dung,
và kết thúc báo cáo, sao cho nội dung bị ẩn không còn hiện với người khác nhưng tác giả vẫn thấy nội
dung của mình kèm trạng thái kiểm duyệt.

## Tác nhân

- **Người dùng đã xác thực (`STUDENT`, `LECTURER`, `ADMIN`):** Báo cáo Post/Comment của người khác
  đang hiển thị công khai.
- **Tác giả nội dung:** Thấy nội dung của chính mình kể cả khi bị ẩn, kèm trạng thái, lý do và thời
  điểm ẩn. Không thấy ai đã báo cáo.
- **Người kiểm duyệt:** Người dùng có quyền `community:moderate` trong ngữ cảnh Gateway đã xác minh.
  Ở v1 quyền này chỉ được seed cho `ADMIN`. Xem và xử lý báo cáo, ẩn và khôi phục nội dung.
- **`LECTURER`:** Không kiểm duyệt ở v1, kể cả với nội dung gắn Problem/Course của chính mình.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ header định danh và quyền do client gửi, đặt lại
  `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions` (ID-003 0.4).
- **Identity Service:** Seed mã quyền `community:moderate` và phép gán cho `ADMIN` (ID-003-FR-017).
- **Community Service:** Chủ sở hữu báo cáo và trạng thái ẩn bởi kiểm duyệt.

## Bối cảnh

Post thuộc [COM-001](../posts/spec.md), Comment (gồm trả lời một cấp) thuộc
[COM-002](../comments/spec.md). Cả hai đặc tả đã định nghĩa hai trục trạng thái độc lập: xoá mềm (do
tác giả) và ẩn bởi kiểm duyệt (do COM-005), cách mỗi trục ảnh hưởng tới việc đọc (Post bị ẩn trả
`404` cho người không phải tác giả; Comment gốc bị ẩn kéo theo cây trả lời không xuất hiện), và điều
kiện "nhận tương tác mới" (chỉ khi nội dung và Post của nó đang hiển thị công khai, COM-001-FR-016,
COM-002-FR-017). COM-005 sở hữu **trạng thái ẩn bởi kiểm duyệt** và cách nó được đặt, bỏ; COM-001 và
COM-002 sở hữu cách hiển thị nội dung theo trạng thái đó.

Nền tảng hiện có trong `bkpractice_community` (migration `1700000002000-InitialCommunitySchema.ts`):

- `posts.is_hidden` và `comments.is_hidden` (boolean, mặc định `false`). Không có API nào đặt cột
  này. Plan COM-001/COM-002 dùng nó làm cờ ẩn bởi kiểm duyệt do COM-005 ghi.
- Bảng `reports` có `post_id` (bắt buộc, xoá theo Post), `reporter_id`, `reason` (văn bản tự do tối
  đa 500 ký tự), `status` (`OPEN`, `REVIEWED`, `DISMISSED`, mặc định `OPEN`), `reviewed_by`,
  `created_at`. Chưa có cách báo cáo Comment, chưa có mốc thời gian xử lý, chưa có API nào.
- Không có mã quyền kiểm duyệt nào trong Identity; Gateway hiện chưa đặt `x-auth-permissions`
  (ID-003-T048 chưa triển khai).

Mã nguồn hiện tại là hành vi nền tảng, không phải bản triển khai của đặc tả này.

## Yêu cầu chức năng

- **COM-005-FR-001 — Quyền sở hữu của Community:** Community MUST sở hữu báo cáo và trạng thái ẩn bởi
  kiểm duyệt. Identity chỉ sở hữu mã quyền và phép gán vai trò.
- **COM-005-FR-002 — Báo cáo nội dung:** Người dùng đã xác thực MUST có thể báo cáo một Post hoặc
  Comment đang nhận tương tác mới (COM-001-FR-016, COM-002-FR-017), với một mã lý do từ danh sách cố
  định và ghi chú tuỳ chọn. Nội dung không nhận tương tác mới MUST được xử lý như không tồn tại với
  người không phải tác giả.
- **COM-005-FR-003 — Danh sách lý do cố định:** Lý do báo cáo MUST là một trong: `SPAM`,
  `HARASSMENT`, `INAPPROPRIATE`, `SOLUTION_SPOILER`, `OTHER`. Ghi chú tuỳ chọn là văn bản thuần tối đa
  500 ký tự, không chứa HTML/script thô.
- **COM-005-FR-004 — Không tự báo cáo:** Người dùng MUST NOT báo cáo nội dung do chính mình viết.
- **COM-005-FR-005 — Một báo cáo mở mỗi người mỗi đối tượng:** Mỗi người dùng MUST có tối đa một báo
  cáo `OPEN` trên mỗi đối tượng. Báo cáo lặp lại khi đã có báo cáo `OPEN` MUST thành công và trả về
  báo cáo hiện có, không tạo bản ghi mới.
- **COM-005-FR-006 — Xem báo cáo:** Người kiểm duyệt MUST có thể liệt kê báo cáo có phân trang, lọc
  theo trạng thái và loại đối tượng, mới nhất trước; và xem chi tiết một báo cáo gồm nội dung đầy đủ
  của đối tượng bị báo cáo kể cả khi nó đã bị ẩn hoặc xoá mềm.
- **COM-005-FR-007 — Ẩn nội dung:** Người kiểm duyệt MUST có thể ẩn một Post hoặc Comment với một mã
  lý do từ danh sách ở FR-003. Ẩn nội dung đang bị ẩn MUST thành công và không đổi state.
- **COM-005-FR-008 — Khôi phục nội dung:** Người kiểm duyệt MUST có thể bỏ ẩn một Post hoặc Comment.
  Khôi phục nội dung không bị ẩn MUST thành công và không đổi state. Khôi phục MUST NOT mở lại báo cáo
  đã xử lý.
- **COM-005-FR-009 — Xử lý báo cáo:** Người kiểm duyệt MUST có thể xử lý một báo cáo `OPEN` bằng một
  trong hai quyết định: `HIDE` (ẩn đối tượng với mã lý do đã chọn) hoặc `DISMISS` (không vi phạm).
  Quyết định áp dụng cho mọi báo cáo `OPEN` của cùng đối tượng: `HIDE` chuyển chúng sang `REVIEWED`,
  `DISMISS` chuyển chúng sang `DISMISSED`. Báo cáo đã xử lý MUST NOT được xử lý lại.
- **COM-005-FR-010 — Ẩn trực tiếp kết thúc báo cáo mở:** Khi người kiểm duyệt ẩn một đối tượng qua
  FR-007, mọi báo cáo `OPEN` của đối tượng đó MUST chuyển sang `REVIEWED`.
- **COM-005-FR-011 — Ghi nhận xử lý:** Mọi lần ẩn, khôi phục và xử lý báo cáo MUST ghi lại người kiểm
  duyệt và thời điểm thực hiện.
- **COM-005-FR-012 — Một trạng thái ẩn duy nhất:** Trạng thái ẩn bởi kiểm duyệt của Post và Comment
  MUST là trạng thái duy nhất mà COM-001 tới COM-004 đọc để áp dụng quy tắc hiển thị và "nhận tương
  tác mới" của mình. Chỉ COM-005 được thay đổi trạng thái này.
- **COM-005-FR-013 — Tác giả thấy trạng thái:** Biểu diễn nội dung mà COM-001/COM-002 trả cho tác giả
  MUST kèm, khi nội dung bị ẩn, mã lý do ẩn và thời điểm ẩn. Nó MUST NOT kèm danh tính người kiểm
  duyệt hay người báo cáo.
- **COM-005-FR-014 — Người kiểm duyệt trong luồng thông thường:** Trong luồng đọc thông thường của
  COM-001 tới COM-004, người kiểm duyệt MUST được đối xử như mọi người dùng khác; họ chỉ thấy nội dung
  bị ẩn của người khác qua luồng kiểm duyệt ở FR-006.
- **COM-005-FR-015 — Ẩn không xoá dữ liệu:** Ẩn và khôi phục MUST NOT xoá hay sửa nội dung, Comment,
  phản ứng, bookmark hay báo cáo khác liên quan, và MUST NOT đổi trạng thái xoá mềm. Ẩn một Post MUST
  NOT đổi trạng thái ẩn riêng của các Comment trong Post đó.
- **COM-005-FR-016 — Không xoá báo cáo:** v1 MUST NOT có thao tác xoá báo cáo.
- **COM-005-FR-017 — Retry xác định:** Một thao tác thất bại MUST để nguyên state. Hai thao tác đồng
  thời trên cùng đối tượng hay cùng báo cáo MUST để lại một kết quả nhất quán: không có hai báo cáo
  `OPEN` của cùng người trên cùng đối tượng, và một báo cáo chỉ được xử lý một lần.

## Quy tắc nghiệp vụ

### Trạng thái kiểm duyệt của nội dung

```text
VISIBLE --ẩn (FR-007) hoặc xử lý báo cáo HIDE (FR-009)--> HIDDEN
HIDDEN  --khôi phục (FR-008)-----------------------------> VISIBLE
```

- Trạng thái kiểm duyệt độc lập với xoá mềm của COM-001/COM-002. Người kiểm duyệt MAY ẩn nội dung đã
  xoá mềm, để nếu tác giả khôi phục thì nó vẫn bị ẩn (COM-001: "khôi phục Post đang bị ẩn thì Post vẫn
  bị ẩn").
- Tác giả không thể tự bỏ ẩn. Sửa nội dung bị ẩn không làm nó hiện lại (COM-001-AC-018,
  COM-002-AC-016).
- Hệ quả hiển thị của trạng thái `HIDDEN` do COM-001/COM-002 định nghĩa; COM-005 không định nghĩa lại.

### Vòng đời báo cáo

```text
OPEN --HIDE hoặc ẩn trực tiếp--> REVIEWED
OPEN --DISMISS-----------------> DISMISSED
```

`REVIEWED` và `DISMISSED` là trạng thái kết thúc. Sau khi mọi báo cáo `OPEN` của một đối tượng đã
kết thúc và đối tượng còn nhận tương tác mới, người dùng MAY báo cáo lại, tạo báo cáo `OPEN` mới.

### Đối tượng được báo cáo

| Tình trạng đối tượng với người gọi                                  | Báo cáo được không           |
| ------------------------------------------------------------------- | ---------------------------- |
| Nhận tương tác mới, người gọi không phải tác giả                    | Có                           |
| Người gọi là tác giả                                                | Không (lỗi kiểm tra dữ liệu) |
| Không nhận tương tác mới (bị ẩn, xoá mềm hoặc Post không công khai) | Không tồn tại (`404`)        |

Báo cáo `OPEN` đã tồn tại trước khi đối tượng bị tác giả xoá mềm vẫn giữ `OPEN` và người kiểm duyệt
vẫn xử lý được.

### Lý do

| Mã                 | Ý nghĩa                                                       |
| ------------------ | ------------------------------------------------------------- |
| `SPAM`             | Quảng cáo, nội dung lặp, liên kết rác                         |
| `HARASSMENT`       | Quấy rối, xúc phạm, công kích cá nhân                         |
| `INAPPROPRIATE`    | Nội dung không phù hợp khác với môi trường học tập            |
| `SOLUTION_SPOILER` | Đăng lời giải hoặc mã nguồn kèm đáp án (quy tắc nội dung mềm) |
| `OTHER`            | Lý do khác; nên kèm ghi chú                                   |

## Quy tắc phân quyền

- Báo cáo: mọi người dùng đã xác thực, không cần mã quyền.
- Xem báo cáo, xem chi tiết báo cáo, ẩn, khôi phục, xử lý báo cáo: đòi hỏi mã quyền
  `community:moderate` trong header `x-auth-permissions` do Gateway đặt. Thiếu quyền trả `403`.
- `community:moderate` là quyền phạm vi toàn nền tảng, được Identity seed qua migration và chỉ gán
  cho `ADMIN` ở v1. `STUDENT` và `LECTURER` không có quyền này.
- Kiểm tra theo mã quyền, không theo tên vai trò: một `ADMIN` có token thiếu claim `permissions` bị
  từ chối (ID-003-FR-022).
- Người kiểm duyệt MAY ẩn/khôi phục nội dung của chính mình; COM-005 không cấm.
- Định danh người báo cáo và người kiểm duyệt MUST lấy từ ngữ cảnh Gateway đã xác minh.
- Khách chưa xác thực bị từ chối với `401`. Phân quyền thiếu hoặc mơ hồ mặc định là từ chối.

## Đầu vào

Các thao tác dưới đây là thao tác ở mức khái niệm; route và DTO thuộc về `plan.md`.

- **Báo cáo:** định danh Post (và định danh Comment khi báo cáo Comment), mã lý do, ghi chú tuỳ chọn.
  Không chấp nhận người báo cáo, trạng thái hay người xử lý từ client.
- **Liệt kê báo cáo:** trạng thái (mặc định `OPEN`), loại đối tượng (`POST`, `COMMENT`, tuỳ chọn),
  trang và kích thước trang.
- **Xem chi tiết báo cáo:** định danh báo cáo.
- **Xử lý báo cáo:** định danh báo cáo, quyết định (`HIDE` hoặc `DISMISS`), mã lý do ẩn (bắt buộc khi
  `HIDE`).
- **Ẩn nội dung:** định danh Post hoặc Comment, mã lý do ẩn.
- **Khôi phục nội dung:** định danh Post hoặc Comment.

## Đầu ra

- Báo cáo thành công trả về định danh, đối tượng, mã lý do, trạng thái và thời điểm tạo của báo cáo
  (mới hoặc đang `OPEN` sẵn).
- Danh sách báo cáo cho người kiểm duyệt: mỗi báo cáo gồm định danh, loại và định danh đối tượng, tác
  giả đối tượng, người báo cáo, mã lý do, ghi chú, trạng thái, thời điểm tạo, người và thời điểm xử
  lý, trạng thái kiểm duyệt hiện tại của đối tượng và đoạn trích nội dung.
- Chi tiết báo cáo bổ sung nội dung đầy đủ của đối tượng và trạng thái xoá mềm của nó.
- Ẩn/khôi phục trả về trạng thái kiểm duyệt mới của đối tượng.
- Biểu diễn nội dung cho tác giả của COM-001/COM-002 bổ sung mã lý do và thời điểm ẩn theo FR-013.
- COM-005 không phát ra domain event, message hay thông báo realtime.

## Tình huống lỗi

| Trường hợp                                                             | Hành vi quan sát được       |
| ---------------------------------------------------------------------- | --------------------------- |
| Thiếu hoặc sai xác thực                                                | `401`; không thay đổi state |
| Thiếu `community:moderate` ở thao tác kiểm duyệt                       | `403`; không thay đổi state |
| Đối tượng không tồn tại hoặc không nhận tương tác mới (người báo cáo)  | `404`; không lộ sự tồn tại  |
| Comment không thuộc Post trong đường dẫn                               | `404`                       |
| Đối tượng cần ẩn/khôi phục không tồn tại                               | `404`                       |
| Báo cáo không tồn tại                                                  | `404`                       |
| Tự báo cáo nội dung của mình                                           | `400`; không tạo báo cáo    |
| Mã lý do ngoài danh sách, ghi chú vượt 500 ký tự hoặc chứa HTML/script | `400`; không thay đổi state |
| `HIDE` thiếu mã lý do; quyết định ngoài `HIDE`/`DISMISS`               | `400`; không thay đổi state |
| Xử lý báo cáo đã `REVIEWED`/`DISMISSED`                                | `409`; không thay đổi state |
| Request có trường không được phép                                      | `400`; không thay đổi state |

Tác giả báo cáo nội dung bị ẩn của chính mình nhận `400` (tự báo cáo), không lộ gì thêm vì tác giả đã
thấy nội dung đó. COM-005 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Nhiều người báo cáo cùng một đối tượng: mỗi người một báo cáo `OPEN`; một quyết định kết thúc tất
  cả.
- Người dùng báo cáo lại khi báo cáo `OPEN` của mình còn đó: trả về báo cáo cũ, không tạo mới.
- Hai người kiểm duyệt xử lý cùng báo cáo đồng thời: một người thành công, người kia nhận `409`.
- Ẩn Post: theo COM-002-FR-013, Comment của Post không đọc được với người không phải tác giả Post;
  trạng thái ẩn riêng của Comment không đổi; khôi phục Post làm chúng đọc được lại theo trạng thái
  riêng.
- Ẩn Comment gốc có trả lời: theo COM-002-FR-010, Comment gốc và toàn bộ cây trả lời không xuất hiện
  trong luồng thông thường; dữ liệu vẫn được giữ và hiện lại khi Comment gốc được khôi phục, theo
  trạng thái riêng của từng trả lời.
- Tác giả xoá mềm nội dung đang có báo cáo `OPEN`: báo cáo vẫn trong hàng đợi; người kiểm duyệt thấy
  nội dung kèm trạng thái xoá mềm.
- Hàng đợi báo cáo rỗng trả danh sách rỗng.
- Báo cáo dữ liệu cũ (lý do văn bản tự do trước COM-005) hiển thị với mã `OTHER` và lý do cũ làm ghi
  chú.
- Nội dung đang bị ẩn từ trước COM-005 (cờ ẩn đã đặt nhưng chưa có lý do) hiển thị với tác giả mã
  `OTHER`.

## Yêu cầu bảo mật

- **COM-005-SR-001 — Phân quyền phía server:** Community MUST kiểm tra `community:moderate` cho mọi
  thao tác kiểm duyệt tại ranh giới backend, không dựa vào frontend.
- **COM-005-SR-002 — Quyền từ header tin cậy:** Quyền MUST chỉ đọc từ `x-auth-permissions` do
  Gateway đặt; header thiếu được coi là không có quyền. Không suy ra quyền từ tên vai trò.
- **COM-005-SR-003 — Không lộ nội dung ẩn:** Luồng kiểm duyệt là luồng duy nhất của COM-005 trả nội
  dung bị ẩn của người khác; thao tác báo cáo và thông báo lỗi MUST NOT xác nhận sự tồn tại hay nội
  dung của đối tượng không nhận tương tác mới.
- **COM-005-SR-004 — Ẩn danh người báo cáo:** Danh tính người báo cáo MUST chỉ hiện với người kiểm
  duyệt; tác giả và người dùng khác không thấy ai đã báo cáo hay số báo cáo.
- **COM-005-SR-005 — Nội dung người dùng soạn:** Ghi chú báo cáo MUST bị từ chối nếu chứa HTML/script
  thô và MUST được kiểm độ dài; frontend làm sạch khi hiển thị.
- **COM-005-SR-006 — Chống gán hàng loạt:** Đầu vào MUST liệt kê tường minh các trường được phép;
  người báo cáo, trạng thái báo cáo, người xử lý và mốc thời gian không thể bị đặt qua request.
- **COM-005-SR-007 — Cách ly service/cơ sở dữ liệu:** Báo cáo và trạng thái ẩn chỉ nằm trong
  `bkpractice_community`; định danh người dùng là định danh ngoài, không có khoá ngoại xuyên service.
- **COM-005-SR-008 — Ghi log an toàn:** Log MUST NOT chứa nội dung bài viết, ghi chú báo cáo hay header
  xác thực; chỉ định danh và kết quả thao tác.
- **COM-005-SR-009 — Thất bại an toàn:** Ngữ cảnh định danh hoặc quyền thiếu, sai định dạng MUST thất
  bại theo hướng đóng và giữ nguyên state.

## Tiêu chí nghiệm thu

- **COM-005-AC-001:** Cho trước một người dùng đã xác thực và một Post hiển thị công khai của người
  khác, khi họ báo cáo với lý do `SPAM`, thì một báo cáo `OPEN` được tạo với người báo cáo lấy từ ngữ
  cảnh tin cậy.
- **COM-005-AC-002:** Cho trước người dùng đã có báo cáo `OPEN` trên một Comment, khi họ báo cáo lại
  Comment đó, thì nhận lại đúng báo cáo cũ và không có bản ghi mới.
- **COM-005-AC-003:** Cho trước người dùng là tác giả của Post, khi họ báo cáo Post đó, thì nhận `400`
  và không có báo cáo nào.
- **COM-005-AC-004:** Cho trước mã lý do ngoài danh sách, hoặc ghi chú dài hơn 500 ký tự hay chứa thẻ
  HTML, khi báo cáo, thì nhận `400` và không có báo cáo nào.
- **COM-005-AC-005:** Cho trước một Post bị ẩn hoặc đã xoá mềm, hoặc một Comment không xuất hiện do
  Comment gốc bị ẩn/xoá mềm, khi người không phải tác giả báo cáo nó, thì nhận `404`.
- **COM-005-AC-006:** Cho trước một `STUDENT` hoặc `LECTURER`, khi gọi bất kỳ thao tác kiểm duyệt nào,
  thì nhận `403` và state không đổi.
- **COM-005-AC-007:** Cho trước một `ADMIN` có token chứa `community:moderate`, khi liệt kê báo cáo
  `OPEN`, thì nhận danh sách phân trang mới nhất trước, mỗi mục có người báo cáo, lý do và đoạn trích
  nội dung.
- **COM-005-AC-008:** Cho trước một `ADMIN` có token không chứa claim `permissions`, khi gọi thao tác
  kiểm duyệt, thì nhận `403`.
- **COM-005-AC-009:** Cho trước người kiểm duyệt ẩn một Post với lý do `HARASSMENT`, khi một người
  không phải tác giả (kể cả một người kiểm duyệt khác) liệt kê hoặc xem chi tiết Post qua COM-001, thì
  Post không có trong danh sách và chi tiết trả `404`.
- **COM-005-AC-010:** Cho trước một Post bị ẩn, khi tác giả xem "bài của tôi" hoặc chi tiết Post, thì
  thấy Post kèm trạng thái bị ẩn, lý do `HARASSMENT` và thời điểm ẩn, không kèm người kiểm duyệt hay
  người báo cáo.
- **COM-005-AC-011:** Cho trước một Post có ba báo cáo `OPEN`, khi người kiểm duyệt xử lý một báo cáo
  bằng `HIDE`, thì Post bị ẩn và cả ba báo cáo chuyển sang `REVIEWED` kèm người và thời điểm xử lý.
- **COM-005-AC-012:** Cho trước một Comment có hai báo cáo `OPEN`, khi người kiểm duyệt xử lý bằng
  `DISMISS`, thì Comment giữ nguyên trạng thái và cả hai báo cáo chuyển sang `DISMISSED`.
- **COM-005-AC-013:** Cho trước một báo cáo đã `REVIEWED` hoặc `DISMISSED`, khi xử lý lại, thì nhận
  `409` và state không đổi.
- **COM-005-AC-014:** Cho trước người kiểm duyệt ẩn trực tiếp một Post có báo cáo `OPEN`, khi thao tác
  hoàn tất, thì Post bị ẩn và các báo cáo đó chuyển sang `REVIEWED`.
- **COM-005-AC-015:** Cho trước một Post bị ẩn, khi người kiểm duyệt khôi phục nó, thì Post hiện lại
  với mọi người, Comment/phản ứng/bookmark cũ còn nguyên, và báo cáo đã xử lý không mở lại.
- **COM-005-AC-016:** Cho trước ẩn một nội dung đang bị ẩn hoặc khôi phục một nội dung không bị ẩn,
  khi thao tác chạy, thì thành công và state không đổi.
- **COM-005-AC-017:** Cho trước một Post bị ẩn có Comment của người khác, khi tác giả Comment đó (không
  phải tác giả Post) đọc Comment của Post, thì nhận `404`; khi Post được khôi phục, Comment đọc được
  lại với trạng thái ẩn riêng không đổi.
- **COM-005-AC-018:** Cho trước một Comment gốc có trả lời bị ẩn, khi người không phải tác giả Comment
  gốc đọc luồng, thì Comment gốc và các trả lời không xuất hiện; khi Comment gốc được khôi phục, cây
  trả lời xuất hiện lại theo trạng thái riêng của từng Comment.
- **COM-005-AC-019:** Cho trước người kiểm duyệt xem chi tiết một báo cáo mà đối tượng đã bị ẩn hoặc
  xoá mềm, khi đọc, thì nhận nội dung đầy đủ của đối tượng kèm trạng thái ẩn và xoá mềm.
- **COM-005-AC-020:** Cho trước hai người kiểm duyệt xử lý cùng một báo cáo đồng thời, khi cả hai hoàn
  tất, thì đúng một thành công và người kia nhận `409`.
- **COM-005-AC-021:** Cho trước tác giả hoặc người dùng khác đọc nội dung đã bị báo cáo, khi kiểm tra
  phản hồi, thì không có danh tính người báo cáo hay số báo cáo.
- **COM-005-AC-022:** Cho trước Identity sau khi chạy migration seed, khi một `ADMIN` đăng nhập, thì
  access token chứa `community:moderate`; token của `STUDENT` và `LECTURER` không chứa.
- **COM-005-AC-023:** Cho trước một tác nhân chưa xác thực, khi gọi bất kỳ thao tác COM-005 nào, thì
  nhận `401` và không có thay đổi state.
- **COM-005-AC-024:** Cho trước một request báo cáo chứa người báo cáo, trạng thái hay người xử lý
  trong body, khi kiểm tra dữ liệu chạy, thì bị từ chối và state không đổi.

## Ngoài phạm vi

- Kiểm duyệt bởi `LECTURER` hay kiểm duyệt theo phạm vi Course/Class
- Kháng nghị của tác giả, thông báo cho tác giả hay người báo cáo
- Người báo cáo xem lại danh sách báo cáo của mình
- Xoá hẳn nội dung bởi người kiểm duyệt; xoá báo cáo
- Khoá tài khoản, cấm đăng bài, giới hạn tần suất báo cáo
- Kiểm duyệt tự động, lọc từ khoá, phát hiện lời giải/mã nguồn tự động
- Ẩn tự động khi đạt ngưỡng số báo cáo
- Nhật ký kiểm duyệt đầy đủ ngoài người và thời điểm xử lý gần nhất
- Ghim bài (`is_pinned`) và các thao tác quản trị Post khác
- Thay đổi cách COM-001/COM-002 hiển thị nội dung bị ẩn
- Realtime cho hàng đợi báo cáo

## Phụ thuộc

- [Kiến trúc Community Service](../../../docs/architecture/community-service.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [COM-001 Posts](../posts/spec.md): Post, xoá mềm, FR-013 (hiển thị theo kiểm duyệt), FR-016 (nhận
  tương tác mới), biểu diễn tác giả.
- [COM-002 Comments](../comments/spec.md): Comment, quy tắc ẩn cả cây trả lời theo Comment gốc
  (FR-010), FR-014 (hiển thị theo kiểm duyệt), FR-017 (nhận tương tác mới).
- [COM-003 Reactions](../reactions/spec.md) và [COM-004 Bookmarks](../bookmarks/spec.md): đọc trạng
  thái ẩn qua COM-001/COM-002.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) bản 0.4: claim `permissions`, header
  `x-auth-permissions`, seed quyền qua migration (FR-017), mặc định từ chối (FR-022).

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp
ngày 2026-09-30:

1. **Ai kiểm duyệt?** Người có `community:moderate`, seed chỉ cho `ADMIN`; `LECTURER` không kiểm
   duyệt ở v1.
2. **Danh sách lý do?** `SPAM`, `HARASSMENT`, `INAPPROPRIATE`, `SOLUTION_SPOILER`, `OTHER`, kèm ghi chú
   tuỳ chọn ≤ 500 ký tự (COM-005-FR-003).
3. **Báo cáo trùng?** Một báo cáo `OPEN` mỗi người mỗi đối tượng; báo cáo lại trả về báo cáo cũ
   (COM-005-FR-005).
4. **Tự báo cáo?** Không cho phép (COM-005-FR-004).
5. **Quyết định xử lý?** `HIDE` hoặc `DISMISS`, áp dụng cho mọi báo cáo `OPEN` của cùng đối tượng; ẩn
   trực tiếp cũng kết thúc báo cáo mở (COM-005-FR-009, FR-010).
6. **Tác giả thấy gì khi bị ẩn?** Nội dung kèm trạng thái bị ẩn, mã lý do và thời điểm ẩn; không thấy
   người kiểm duyệt hay người báo cáo (COM-005-FR-013).
7. **Ai định nghĩa hệ quả hiển thị của việc ẩn?** COM-001/COM-002 (đã Approved: `404` cho Post; ẩn
   Comment gốc thì cả cây trả lời không xuất hiện); COM-005 chỉ sở hữu một trạng thái ẩn duy nhất
   (COM-005-FR-012).
8. **Người kiểm duyệt thấy nội dung ẩn ở đâu?** Chỉ qua luồng kiểm duyệt (COM-005-FR-014).
9. **Ẩn/khôi phục lặp lại?** Idempotent (COM-005-FR-007, FR-008).
10. **Ẩn tự động theo ngưỡng?** Không ở v1.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                                        |
| ---------- | --------- | ----------------------------------- | ------------------------------------------------------------------------------ |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Đặc tả Moderation ban đầu, chốt 10 quyết định theo phương án đề xuất, Approved |
| 2026-09-30 | 1.1       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Căn AC-005/018 và mô tả hiển thị với quy tắc ẩn cây trả lời của COM-002        |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
