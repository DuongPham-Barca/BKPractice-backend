# COM-003 Reactions

## Trạng thái

Approved

Phiên bản `1.1`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất). Bản 1.1 căn hành vi Comment gốc bị ẩn với COM-002-FR-010.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép mọi người dùng đã xác thực bày tỏ sự đồng tình với một Post hoặc một Comment bằng một phản
ứng `LIKE`, bật hoặc tắt một cách idempotent, và cho mọi người xem nội dung đó thấy số lượt `LIKE`
cùng việc chính họ đã `LIKE` hay chưa, trong khi Community vẫn sở hữu toàn bộ dữ liệu phản ứng và
không để lộ nội dung không hiển thị với người gọi.

## Tác nhân

- **Người dùng đã xác thực (`STUDENT`, `LECTURER`, `ADMIN`):** Bật/tắt `LIKE` của chính mình trên
  Post/Comment mà mình xem được, và thấy số đếm. Không vai trò nào có quyền đặc biệt với phản ứng.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ header định danh do client gửi, chuyển tiếp ngữ
  cảnh định danh, vai trò và quyền đã xác minh (ID-003 0.4).
- **Community Service:** Chủ sở hữu phản ứng, số đếm và chính sách của chúng.

## Bối cảnh

Post thuộc [COM-001](../posts/spec.md), Comment (gồm trả lời một cấp) thuộc
[COM-002](../comments/spec.md). Hai đặc tả đó định nghĩa khi nào nội dung hiển thị với một người gọi
và khi nào nó "nhận tương tác mới" (chỉ khi nội dung và Post của nó đang hiển thị công khai,
COM-001-FR-016, COM-002-FR-017). Trạng thái ẩn bởi kiểm duyệt thuộc COM-005. COM-003 chỉ định nghĩa
phản ứng trên các đối tượng đó.

Nền tảng hiện có trong `bkpractice_community` (migration `1700000002000-InitialCommunitySchema.ts`):

- Bảng `reactions` có `post_id` (bắt buộc, xoá theo Post), `user_id`, `type` (enum chỉ có `LIKE`, mặc
  định `LIKE`), `created_at`, và ràng buộc duy nhất `(post_id, user_id)`. Chưa có cách gắn phản ứng
  vào Comment.
- Route `POST /api/community/posts/:id/reactions/like` trong module `posts` **đảo trạng thái**: đã
  `LIKE` thì gỡ, chưa thì thêm. Gọi lặp lại vì retry sẽ lật trạng thái, tức không idempotent. Route
  không kiểm tra Post có bị ẩn hay không, và trả về `{ liked }` không kèm số đếm.
- Danh sách Post hiện có không trả về số lượt `LIKE` hay việc người gọi đã `LIKE`.

Mã nguồn hiện tại là hành vi nền tảng, không phải bản triển khai của đặc tả này.

## Yêu cầu chức năng

- **COM-003-FR-001 — Quyền sở hữu của Community:** Community MUST sở hữu mọi phản ứng. Không service
  nào khác lưu hay sửa phản ứng.
- **COM-003-FR-002 — Loại phản ứng:** v1 MUST chỉ có một loại phản ứng là `LIKE`. Loại khác MUST bị
  từ chối.
- **COM-003-FR-003 — Đối tượng phản ứng:** Phản ứng MUST gắn với đúng một đối tượng: một Post
  (COM-001) hoặc một Comment/trả lời (COM-002).
- **COM-003-FR-004 — Duy nhất:** Mỗi người dùng MUST có tối đa một `LIKE` trên mỗi đối tượng.
- **COM-003-FR-005 — Bật `LIKE` idempotent:** Người dùng đã xác thực MUST có thể bật `LIKE` trên một
  đối tượng mình xem được. Bật khi đã bật MUST thành công và không tạo bản ghi thứ hai.
- **COM-003-FR-006 — Tắt `LIKE` idempotent:** Người dùng đã xác thực MUST có thể tắt `LIKE` của chính
  mình trên một đối tượng mình xem được. Tắt khi chưa bật MUST thành công và không thay đổi state.
- **COM-003-FR-007 — Kết quả thao tác:** Bật/tắt MUST trả về trạng thái `LIKE` của người gọi sau thao
  tác và số lượt `LIKE` hiện tại của đối tượng.
- **COM-003-FR-008 — Số đếm trên biểu diễn nội dung:** Biểu diễn đầy đủ của Post và Comment mà
  COM-001/COM-002 trả cho người gọi MUST kèm số lượt `LIKE` của đối tượng và cờ cho biết người gọi đã
  `LIKE` hay chưa. Chỗ giữ chỗ của Comment (COM-002-FR-010) MUST NOT kèm số đếm hay cờ này.
- **COM-003-FR-009 — Chỉ trên nội dung được phép:** Bật `LIKE` MUST chỉ thực hiện được trên đối
  tượng đang nhận tương tác mới theo COM-001-FR-016/COM-002-FR-017. Tắt `LIKE` MUST thực hiện được trên
  đối tượng hiển thị với người gọi theo COM-001/COM-002, kể cả khi nó không còn nhận tương tác mới.
  Đối tượng không hiển thị với người gọi MUST được xử lý như không tồn tại; đối tượng hiển thị với
  người gọi (tác giả) nhưng không nhận tương tác mới MUST bị từ chối bật `LIKE` với lỗi trạng thái.
- **COM-003-FR-010 — Số đếm đếm mọi phản ứng còn lưu:** Số lượt `LIKE` MUST bằng số bản ghi `LIKE`
  hiện có của đối tượng. Ẩn, xoá mềm hay khôi phục đối tượng MUST NOT xoá hay tạo phản ứng; khi đối
  tượng hiển thị trở lại, số đếm phản ánh các phản ứng đã có.
- **COM-003-FR-011 — Không lộ danh tính:** v1 MUST NOT trả danh sách người đã `LIKE` một đối tượng;
  chỉ trả số đếm và cờ của chính người gọi.
- **COM-003-FR-012 — Thay thế hành vi đảo trạng thái:** Hành vi đảo trạng thái hiện có MUST được thay
  bằng hai thao tác bật và tắt tường minh. Không còn thao tác nào mà gọi lặp lại làm lật trạng thái.
- **COM-003-FR-013 — Retry xác định:** Một thao tác thất bại (xác thực, kiểm tra dữ liệu, không tìm
  thấy) MUST để nguyên state. Hai thao tác bật đồng thời của cùng người trên cùng đối tượng MUST để lại
  đúng một phản ứng.

## Quy tắc nghiệp vụ

### Đối tượng và hiển thị

- Một đối tượng hợp lệ là một Post, hoặc một Comment thuộc một Post. Định danh Comment trong thao tác
  MUST thuộc đúng Post trong đường dẫn; không khớp thì xử lý như không tồn tại.
- "Hiển thị với người gọi" và "nhận tương tác mới" lấy đúng từ COM-001/COM-002; COM-003 không định
  nghĩa lại. Chỗ giữ chỗ của Comment gốc không nhận tương tác mới.
- Tác giả MAY `LIKE` nội dung của chính mình.

### Vòng đời của phản ứng

| Tình trạng đối tượng với người gọi                                 | Bật `LIKE` | Tắt `LIKE` | Số đếm hiển thị                 |
| ------------------------------------------------------------------ | ---------- | ---------- | ------------------------------- |
| Nhận tương tác mới                                                 | Có         | Có         | Có                              |
| Hiển thị với người gọi (tác giả) nhưng bị ẩn hoặc Post bị ẩn       | `409`      | Có         | Có, trong biểu diễn của tác giả |
| Không hiển thị với người gọi (bị ẩn, xoá mềm, Post không hiển thị) | `404`      | `404`      | Không                           |
| Trở lại nhận tương tác mới (hết ẩn hoặc được khôi phục)            | Có         | Có         | Gồm cả phản ứng cũ              |

Phản ứng không có trạng thái riêng; nó tồn tại hoặc không.

## Quy tắc phân quyền

- Mọi người dùng đã xác thực được bật/tắt `LIKE` của chính mình. Không cần mã quyền; COM-003 không
  thêm mã quyền mới.
- Người dùng MUST chỉ bật/tắt phản ứng của chính mình. Định danh người dùng MUST lấy từ ngữ cảnh
  Gateway đã xác minh, không bao giờ từ body, query, route hay header do client gửi.
- `ADMIN` và người có `community:moderate` (COM-005) không có thẩm quyền sửa hay xoá phản ứng của
  người khác.
- Khách chưa xác thực bị từ chối với `401`.
- Ngữ cảnh định danh thiếu hoặc sai định dạng MUST bị từ chối theo hướng đóng.

## Đầu vào

Các thao tác dưới đây là thao tác ở mức khái niệm; route và DTO thuộc về `plan.md`.

- **Bật `LIKE`:** định danh Post, và định danh Comment khi đối tượng là Comment. Không chấp nhận người
  dùng, loại phản ứng khác `LIKE`, số đếm hay mốc thời gian từ client.
- **Tắt `LIKE`:** như trên.

## Đầu ra

- Bật/tắt thành công trả về `liked` (trạng thái của người gọi sau thao tác) và `likeCount`.
- Biểu diễn Post/Comment của COM-001/COM-002 bổ sung `likeCount` và `likedByMe`.
- COM-003 không phát ra domain event, message hay thông báo realtime.

## Tình huống lỗi

| Trường hợp                                                   | Hành vi quan sát được                                |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| Thiếu hoặc sai xác thực                                      | `401`; không thay đổi state                          |
| Định danh Post/Comment sai định dạng                         | `400`; không thay đổi state                          |
| Post/Comment không tồn tại hoặc không hiển thị với người gọi | `404`; không lộ sự tồn tại; không thay đổi state     |
| Bật `LIKE` trên nội dung của mình không nhận tương tác mới   | `409`; không thay đổi state                          |
| Comment không thuộc Post trong đường dẫn                     | `404`; không thay đổi state                          |
| Request có trường không được phép                            | `400`; không thay đổi state                          |
| Lỗi lưu trữ ngoài dự kiến                                    | Lỗi chuẩn hoá hiện có; không để lại phản ứng dở dang |

COM-003 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Bật hai lần liên tiếp (hoặc retry do mạng) để lại đúng một `LIKE` và cùng một `likeCount`.
- Tắt khi chưa từng bật trả `liked = false` và số đếm không đổi.
- Hai request bật đồng thời của cùng người: đúng một bản ghi được lưu, cả hai request thành công.
- Đối tượng bị ẩn sau khi người dùng đã `LIKE`: phản ứng vẫn lưu, người khác không thấy đối tượng;
  khi được khôi phục, `likeCount` và `likedByMe` hiện lại như cũ.
- Đối tượng chưa có phản ứng nào có `likeCount = 0`.
- Post bị xoá hẳn theo cách mà COM-001 cho phép (nếu có) kéo theo phản ứng của Post và các Comment
  của nó.

## Yêu cầu bảo mật

- **COM-003-SR-001 — Định danh tin cậy:** Người dùng của phản ứng MUST chỉ đến từ ngữ cảnh Gateway
  đã xác minh.
- **COM-003-SR-002 — Không lộ nội dung ẩn:** Thao tác và phản hồi MUST NOT xác nhận sự tồn tại, số đếm
  hay nội dung của đối tượng không hiển thị với người gọi.
- **COM-003-SR-003 — Chống gán hàng loạt:** Đầu vào MUST liệt kê tường minh các trường được phép;
  người dùng, số đếm và mốc thời gian không thể bị đặt qua request.
- **COM-003-SR-004 — Riêng tư của người phản ứng:** Danh tính những người đã `LIKE` MUST NOT xuất hiện
  trong phản hồi, lỗi hay log hướng tới người dùng khác.
- **COM-003-SR-005 — Cách ly service/cơ sở dữ liệu:** Phản ứng chỉ nằm trong `bkpractice_community`;
  `userId` là định danh ngoài, không có khoá ngoại xuyên service.
- **COM-003-SR-006 — Thất bại an toàn:** Ngữ cảnh định danh thiếu hoặc sai định dạng MUST thất bại
  theo hướng đóng và giữ nguyên state.

## Tiêu chí nghiệm thu

- **COM-003-AC-001:** Cho trước một người dùng đã xác thực và một Post hiển thị, khi họ bật `LIKE`,
  thì phản hồi có `liked = true` và `likeCount` tăng 1.
- **COM-003-AC-002:** Cho trước người dùng đã `LIKE` một Post, khi họ bật `LIKE` lần nữa, thì phản hồi
  có `liked = true`, `likeCount` không đổi và chỉ có một bản ghi.
- **COM-003-AC-003:** Cho trước người dùng đã `LIKE` một Post, khi họ tắt `LIKE`, thì phản hồi có
  `liked = false` và `likeCount` giảm 1; tắt thêm lần nữa vẫn trả `liked = false` và số đếm không đổi.
- **COM-003-AC-004:** Cho trước một Comment hoặc trả lời hiển thị, khi người dùng bật rồi tắt `LIKE`,
  thì kết quả giống AC-001 và AC-003 với số đếm của riêng Comment đó.
- **COM-003-AC-005:** Cho trước một Comment thuộc Post khác Post trong đường dẫn, khi bật `LIKE`, thì
  nhận `404` và không có phản ứng nào được tạo.
- **COM-003-AC-006:** Cho trước một Post bị ẩn bởi COM-005, khi một người không phải tác giả bật hoặc
  tắt `LIKE`, thì nhận `404` và phản hồi không có số đếm.
- **COM-003-AC-007:** Cho trước một Post bị ẩn, khi tác giả của nó xem Post, thì thấy `likeCount` và
  `likedByMe`; khi tác giả bật `LIKE`, thì nhận `409`; khi tác giả tắt `LIKE` đã có, thì thành công.
- **COM-003-AC-008:** Cho trước một Post đã xoá mềm, khi người không phải tác giả bật hoặc tắt `LIKE`,
  thì nhận `404`; khi một Comment gốc bị xoá mềm hoặc bị ẩn, Comment đó và các trả lời của nó không
  xuất hiện trong luồng thông thường, và bật hoặc tắt `LIKE` trên nội dung không hiển thị nhận `404`.
- **COM-003-AC-009:** Cho trước một Post có 3 `LIKE` bị ẩn rồi khôi phục, khi xem lại, thì
  `likeCount = 3` và `likedByMe` đúng với người gọi.
- **COM-003-AC-010:** Cho trước danh sách hoặc chi tiết Post/Comment của COM-001/COM-002, khi người
  dùng đọc, thì mỗi mục có `likeCount` và `likedByMe` đúng với người gọi.
- **COM-003-AC-011:** Cho trước một tác nhân chưa xác thực, khi gọi bật hoặc tắt `LIKE`, thì nhận
  `401` và không có thay đổi state.
- **COM-003-AC-012:** Cho trước một request chứa người dùng khác, loại phản ứng khác hay số đếm trong
  body, khi kiểm tra dữ liệu chạy, thì bị từ chối và state không đổi.
- **COM-003-AC-013:** Cho trước hai request bật `LIKE` đồng thời của cùng người trên cùng Post, khi cả
  hai hoàn tất, thì cả hai thành công và chỉ có một bản ghi.
- **COM-003-AC-014:** Cho trước route đảo trạng thái cũ, khi triển khai xong, thì route đó không còn và
  không thao tác nào lật trạng thái khi gọi lặp lại.
- **COM-003-AC-015:** Cho trước bất kỳ phản hồi nào của COM-003, khi kiểm tra, thì không chứa danh
  sách định danh người đã `LIKE`.

## Ngoài phạm vi

- Loại phản ứng khác `LIKE` (emoji, dislike, vote lên/xuống)
- Danh sách người đã `LIKE` một đối tượng
- Thông báo cho tác giả khi được `LIKE`
- Điểm uy tín, xếp hạng hay sắp xếp theo số `LIKE`
- Bộ đếm phi chuẩn hoá lưu sẵn trên Post/Comment
- Realtime cập nhật số đếm
- Phản ứng trên đối tượng ngoài Post/Comment (Problem, Course, Submission)
- Giới hạn tần suất riêng cho phản ứng

## Phụ thuộc

- [Kiến trúc Community Service](../../../docs/architecture/community-service.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [COM-001 Posts](../posts/spec.md): Post, hiển thị, FR-016 (nhận tương tác mới), biểu diễn Post
  (MAY được bổ sung trường của COM-003).
- [COM-002 Comments](../comments/spec.md): Comment, quy tắc ẩn cả cây trả lời theo Comment gốc
  (FR-010), FR-017 (nhận tương tác mới), biểu diễn Comment.
- [COM-005 Moderation](../moderation/spec.md): trạng thái ẩn bởi kiểm duyệt.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) bản 0.4: ngữ cảnh định danh tin cậy qua Gateway.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp
ngày 2026-09-30:

1. **Loại phản ứng ở v1?** Chỉ `LIKE` (COM-003-FR-002).
2. **Phản ứng trên đối tượng nào?** Post và Comment, kể cả trả lời một cấp (COM-003-FR-003).
3. **Bật/tắt như thế nào?** Hai thao tác idempotent tường minh (bật, tắt), thay route đảo trạng thái
   hiện có (COM-003-FR-005, FR-006, FR-012).
4. **Trả gì sau thao tác?** `liked` và `likeCount` (COM-003-FR-007).
5. **Có hiện ai đã `LIKE` không?** Không ở v1; chỉ số đếm và cờ của người gọi (COM-003-FR-011).
6. **Tác giả tự `LIKE` được không?** Được.
7. **Nội dung bị ẩn/xoá mềm?** Bật chỉ khi nhận tương tác mới theo COM-001/COM-002 (tác giả trên nội
   dung bị ẩn của mình nhận `409`); tắt được khi còn hiển thị với người gọi; người không xem được nhận
   `404`; phản ứng cũ được giữ và hiện lại khi khôi phục (COM-003-FR-009, FR-010).
8. **Cần mã quyền không?** Không; chỉ cần đã xác thực.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                                      |
| ---------- | --------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Đặc tả Reactions ban đầu, chốt 8 quyết định theo phương án đề xuất, Approved |
| 2026-09-30 | 1.1       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Căn AC-008 và tài liệu phụ thuộc với quy tắc ẩn cây trả lời của COM-002      |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
