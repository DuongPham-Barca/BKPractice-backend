# COM-004 Bookmarks

## Trạng thái

Approved

Phiên bản `1.0`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu
duyệt trước các phương án đề xuất).

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho phép mọi người dùng đã xác thực lưu riêng tư các Post muốn đọc lại, bật hoặc tắt bookmark một
cách idempotent, và xem lại danh sách Post đã lưu của chính mình, mà không ai khác biết họ đã lưu gì
và không để lộ Post không còn hiển thị với họ.

## Tác nhân

- **Người dùng đã xác thực (`STUDENT`, `LECTURER`, `ADMIN`):** Bật/tắt bookmark của chính mình trên
  Post mình xem được và xem danh sách bookmark của chính mình.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ header định danh do client gửi, chuyển tiếp ngữ
  cảnh định danh, vai trò và quyền đã xác minh (ID-003 0.4).
- **Community Service:** Chủ sở hữu bookmark và chính sách của chúng.

## Bối cảnh

Post thuộc [COM-001](../posts/spec.md). COM-001 định nghĩa khi nào một Post hiển thị với một người
gọi (tác giả thấy Post chưa xoá của mình kể cả khi bị ẩn; người khác chỉ thấy Post hiển thị công khai)
và khi nào Post "nhận tương tác mới" (chỉ khi hiển thị công khai, COM-001-FR-016). Trạng thái ẩn bởi
kiểm duyệt thuộc COM-005.

Nền tảng hiện có trong `bkpractice_community` (migration `1700000002000-InitialCommunitySchema.ts`):

- Bảng `bookmarks` có `post_id` (bắt buộc, xoá theo Post), `user_id`, `created_at`, và ràng buộc duy
  nhất `(post_id, user_id)`. Entity `Bookmark` được đăng ký trong module `posts`.
- Chưa có route, use case hay cách nào để tạo, xoá hay đọc bookmark.

Mã nguồn hiện tại là hành vi nền tảng, không phải bản triển khai của đặc tả này.

## Yêu cầu chức năng

- **COM-004-FR-001 — Quyền sở hữu của Community:** Community MUST sở hữu mọi bookmark. Không service
  nào khác lưu hay sửa bookmark.
- **COM-004-FR-002 — Chỉ trên Post:** Ở v1, bookmark MUST chỉ gắn với một Post. Comment không
  bookmark được.
- **COM-004-FR-003 — Duy nhất:** Mỗi người dùng MUST có tối đa một bookmark trên mỗi Post.
- **COM-004-FR-004 — Bật bookmark idempotent:** Người dùng đã xác thực MUST có thể bookmark một Post
  theo FR-006. Bật khi đã có bookmark MUST thành công, không tạo bản ghi thứ hai và giữ nguyên thời
  điểm lưu ban đầu, miễn Post còn hiển thị với người gọi.
- **COM-004-FR-005 — Tắt bookmark idempotent:** Người dùng đã xác thực MUST có thể gỡ bookmark của
  chính mình khỏi một Post. Gỡ khi chưa có bookmark MUST thành công và không thay đổi state. Gỡ MUST
  thực hiện được cả khi Post không còn hiển thị với người gọi, và MUST NOT lộ việc Post có tồn tại hay
  không.
- **COM-004-FR-006 — Chỉ bookmark Post được phép:** Tạo bookmark mới MUST chỉ thực hiện được trên
  Post đang nhận tương tác mới (COM-001-FR-016). Post không hiển thị với người gọi MUST được xử lý như
  không tồn tại; Post hiển thị với người gọi (tác giả) nhưng không nhận tương tác mới MUST bị từ chối
  tạo bookmark mới với lỗi trạng thái.
- **COM-004-FR-007 — Danh sách bookmark của mình:** Người dùng đã xác thực MUST có thể liệt kê các Post
  mình đã bookmark, có phân trang, sắp theo thời điểm lưu mới nhất trước.
- **COM-004-FR-008 — Danh sách chỉ có Post xem được:** Danh sách bookmark MUST chỉ gồm Post đang hiển
  thị với người gọi theo COM-001. Bookmark của Post không còn hiển thị với người gọi (đã xoá mềm, hoặc
  bị ẩn mà người gọi không phải tác giả) MUST bị bỏ qua mà không bị xoá; khi Post hiển thị trở lại, nó
  xuất hiện lại ở đúng thời điểm lưu ban đầu.
- **COM-004-FR-009 — Riêng tư:** Bookmark MUST chỉ hiện với chính người sở hữu. Không ai khác, kể cả
  tác giả Post, `ADMIN` hay người kiểm duyệt, đọc được bookmark của người khác hay số lượt bookmark
  của một Post.
- **COM-004-FR-010 — Cờ trên biểu diễn Post:** Biểu diễn Post mà COM-001 trả cho người gọi MUST kèm
  cờ cho biết chính người gọi đã bookmark Post đó hay chưa.
- **COM-004-FR-011 — Giới hạn:** Mỗi người dùng MUST có tối đa 1.000 bookmark (đếm mọi bookmark đang
  lưu, kể cả của Post tạm không hiển thị). Bật bookmark thứ 1.001 MUST bị từ chối; bật lại bookmark đã
  có không tính là thêm.
- **COM-004-FR-012 — Retry xác định:** Một thao tác thất bại MUST để nguyên state. Hai thao tác bật
  đồng thời của cùng người trên cùng Post MUST để lại đúng một bookmark; thao tác đồng thời MUST NOT
  làm vượt giới hạn FR-011.

## Quy tắc nghiệp vụ

| Tình trạng Post với người gọi                       | Tạo bookmark mới | Bật lại khi đã có | Gỡ bookmark | Trong danh sách bookmark |
| --------------------------------------------------- | ---------------- | ----------------- | ----------- | ------------------------ |
| Nhận tương tác mới                                  | Có               | Có                | Có          | Có                       |
| Bị ẩn, người gọi là tác giả                         | `409`            | Có                | Có          | Có, kèm trạng thái ẩn    |
| Bị ẩn, người gọi không phải tác giả                 | `404`            | `404`             | Có          | Không                    |
| Đã xoá mềm                                          | `404`            | `404`             | Có          | Không                    |
| Hiển thị trở lại sau khi hết ẩn hoặc được khôi phục | Có               | Có                | Có          | Có, ở thời điểm lưu cũ   |

- Bookmark không có trạng thái riêng; nó tồn tại hoặc không, kèm thời điểm lưu.
- Ẩn, xoá mềm hay khôi phục Post MUST NOT tạo hay xoá bookmark.
- Mỗi mục trong danh sách dùng bản tóm tắt Post của COM-001 (với tác giả: kèm trạng thái bị ẩn như
  COM-001 trả cho tác giả) cộng thời điểm lưu bookmark.

## Quy tắc phân quyền

- Mọi người dùng đã xác thực được bật/tắt và liệt kê bookmark của chính mình. Không cần mã quyền;
  COM-004 không thêm mã quyền mới.
- Người dùng MUST chỉ thao tác và đọc bookmark của chính mình. Định danh MUST lấy từ ngữ cảnh Gateway
  đã xác minh, không bao giờ từ body, query, route hay header do client gửi. Không có thao tác nào
  nhận định danh người dùng khác.
- `ADMIN` và người có `community:moderate` không có thẩm quyền đọc hay sửa bookmark của người khác.
- Khách chưa xác thực bị từ chối với `401`.
- Ngữ cảnh định danh thiếu hoặc sai định dạng MUST bị từ chối theo hướng đóng.

## Đầu vào

Các thao tác dưới đây là thao tác ở mức khái niệm; route và DTO thuộc về `plan.md`.

- **Bật bookmark:** định danh Post.
- **Gỡ bookmark:** định danh Post.
- **Liệt kê bookmark:** trang và kích thước trang. Không nhận định danh người dùng.

Không chấp nhận người dùng, thời điểm lưu hay số đếm từ client.

## Đầu ra

- Bật bookmark trả về `bookmarked = true` và thời điểm lưu.
- Gỡ bookmark trả về thành công không kèm nội dung.
- Danh sách bookmark trả về trang các mục gồm bản tóm tắt Post và thời điểm lưu, cùng thông tin phân
  trang.
- Biểu diễn Post của COM-001 bổ sung `bookmarkedByMe`.
- COM-004 không phát ra domain event, message hay thông báo realtime.

## Tình huống lỗi

| Trường hợp                                               | Hành vi quan sát được                               |
| -------------------------------------------------------- | --------------------------------------------------- |
| Thiếu hoặc sai xác thực                                  | `401`; không thay đổi state                         |
| Định danh Post sai định dạng; tham số trang sai          | `400`; không thay đổi state                         |
| Bật bookmark trên Post không tồn tại hoặc không xem được | `404`; không lộ sự tồn tại; không thay đổi state    |
| Tạo bookmark mới trên Post bị ẩn của chính mình          | `409`; không thay đổi state                         |
| Đã đạt 1.000 bookmark khi bật bookmark mới               | `409`; không thay đổi state                         |
| Request có trường không được phép                        | `400`; không thay đổi state                         |
| Lỗi lưu trữ ngoài dự kiến                                | Lỗi chuẩn hoá hiện có; không để lại bản ghi dở dang |

COM-004 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Người dùng chưa có bookmark nào nhận danh sách rỗng.
- Bật hai lần liên tiếp giữ đúng một bookmark với thời điểm lưu của lần đầu.
- Gỡ bookmark của Post không tồn tại trả thành công, giống hệt khi Post tồn tại nhưng chưa được lưu.
- Post bị ẩn sau khi người dùng (không phải tác giả) đã lưu: biến khỏi danh sách của họ nhưng vẫn tính vào giới hạn 1.000;
  người dùng vẫn gỡ được nếu biết định danh.
- Trang vượt quá số mục trả danh sách rỗng kèm tổng số đúng.
- Tổng số trong thông tin phân trang chỉ đếm bookmark của Post đang hiển thị với người gọi.

## Yêu cầu bảo mật

- **COM-004-SR-001 — Định danh tin cậy:** Chủ sở hữu bookmark MUST chỉ đến từ ngữ cảnh Gateway đã
  xác minh.
- **COM-004-SR-002 — Riêng tư:** Bookmark và số lượt bookmark MUST NOT xuất hiện trong phản hồi, lỗi
  hay log hướng tới người khác.
- **COM-004-SR-003 — Không lộ nội dung ẩn:** Bật bookmark, danh sách bookmark và thông tin phân trang
  MUST NOT xác nhận sự tồn tại hay nội dung của Post không hiển thị với người gọi. Gỡ bookmark trả cùng
  kết quả bất kể Post có tồn tại hay không.
- **COM-004-SR-004 — Chống gán hàng loạt:** Đầu vào MUST liệt kê tường minh các trường được phép.
- **COM-004-SR-005 — Cách ly service/cơ sở dữ liệu:** Bookmark chỉ nằm trong `bkpractice_community`;
  `userId` là định danh ngoài, không có khoá ngoại xuyên service.
- **COM-004-SR-006 — Thất bại an toàn:** Ngữ cảnh định danh thiếu hoặc sai định dạng MUST thất bại
  theo hướng đóng và giữ nguyên state.

## Tiêu chí nghiệm thu

- **COM-004-AC-001:** Cho trước một người dùng đã xác thực và một Post hiển thị, khi họ bookmark, thì
  phản hồi có `bookmarked = true` và Post xuất hiện đầu danh sách bookmark của họ.
- **COM-004-AC-002:** Cho trước Post đã được người dùng bookmark, khi họ bookmark lại, thì chỉ có một
  bookmark và thời điểm lưu không đổi.
- **COM-004-AC-003:** Cho trước Post đã được bookmark, khi người dùng gỡ, thì Post không còn trong danh
  sách; gỡ thêm lần nữa vẫn thành công.
- **COM-004-AC-004:** Cho trước một Post bị ẩn hoặc đã xoá mềm, khi người không phải tác giả bookmark
  nó, thì nhận `404`.
- **COM-004-AC-005:** Cho trước một Post đã được bookmark rồi bị ẩn, khi người dùng (không phải tác
  giả) liệt kê bookmark, thì Post không có trong danh sách và tổng số không đếm nó; khi Post được khôi
  phục, nó xuất hiện lại ở đúng vị trí theo thời điểm lưu ban đầu.
- **COM-004-AC-006:** Cho trước người dùng A đã bookmark một Post, khi người dùng B, tác giả Post hoặc
  một `ADMIN` đọc Post hoặc gọi bất kỳ thao tác nào, thì không có cách nào biết A đã bookmark, và
  không phản hồi nào có số lượt bookmark.
- **COM-004-AC-007:** Cho trước danh sách hoặc chi tiết Post của COM-001, khi người dùng đọc, thì mỗi
  Post có `bookmarkedByMe` đúng với người gọi.
- **COM-004-AC-008:** Cho trước người dùng có 1.000 bookmark, khi bookmark một Post mới, thì nhận `409`;
  bookmark lại một Post đã lưu vẫn thành công.
- **COM-004-AC-009:** Cho trước một tác nhân chưa xác thực, khi gọi bất kỳ thao tác bookmark nào, thì
  nhận `401` và không có thay đổi state.
- **COM-004-AC-010:** Cho trước request chứa định danh người dùng, thời điểm lưu hay trường lạ, khi kiểm
  tra dữ liệu chạy, thì bị từ chối và state không đổi.
- **COM-004-AC-011:** Cho trước hai request bookmark đồng thời của cùng người trên cùng Post, khi cả hai
  hoàn tất, thì cả hai thành công và chỉ có một bookmark.
- **COM-004-AC-012:** Cho trước gỡ bookmark với định danh Post không tồn tại, khi thao tác chạy, thì
  phản hồi giống hệt gỡ bookmark của một Post tồn tại mà người gọi chưa lưu.
- **COM-004-AC-013:** Cho trước tác giả đã bookmark Post của chính mình và Post đó bị ẩn, khi tác giả
  liệt kê bookmark, thì Post vẫn có trong danh sách kèm trạng thái bị ẩn; khi một tác giả chưa
  bookmark Post bị ẩn của mình thử bookmark nó, thì nhận `409`.

## Ngoài phạm vi

- Bookmark Comment, Problem, Course hay đối tượng khác ngoài Post
- Thư mục, nhãn, ghi chú cá nhân hay sắp xếp tuỳ chỉnh cho bookmark
- Chia sẻ hay công khai danh sách bookmark
- Số lượt bookmark của một Post, xếp hạng theo bookmark
- Thông báo khi Post đã lưu thay đổi
- Xuất/nhập danh sách bookmark
- Tìm kiếm trong bookmark

## Phụ thuộc

- [Kiến trúc Community Service](../../../docs/architecture/community-service.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [COM-001 Posts](../posts/spec.md): Post, hiển thị, FR-016 (nhận tương tác mới), bản tóm tắt Post
  (MAY được bổ sung trường của COM-004).
- [COM-005 Moderation](../moderation/spec.md): trạng thái ẩn bởi kiểm duyệt.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) bản 0.4: ngữ cảnh định danh tin cậy qua Gateway.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp
ngày 2026-09-30:

1. **Bookmark trên đối tượng nào?** Chỉ Post ở v1 (COM-004-FR-002).
2. **Ai thấy bookmark?** Chỉ chính chủ; không có số lượt bookmark công khai (COM-004-FR-009).
3. **Bật/tắt như thế nào?** Hai thao tác idempotent; bật lại giữ thời điểm lưu ban đầu (COM-004-FR-004,
   FR-005).
4. **Gỡ bookmark của Post không còn xem được?** Được, và không lộ Post có tồn tại hay không
   (COM-004-FR-005).
5. **Post bị ẩn/xoá mềm?** Tạo bookmark mới chỉ khi Post nhận tương tác mới (tác giả trên Post bị ẩn
   của mình nhận `409`). **Trong danh sách?** Chỉ Post còn hiển thị với người gọi theo COM-001 (tác giả thấy Post bị ẩn của mình kèm trạng thái); không xoá bookmark; hiện lại khi khôi phục
   (COM-004-FR-008).
6. **Thứ tự danh sách?** Thời điểm lưu mới nhất trước, có phân trang (COM-004-FR-007).
7. **Giới hạn số bookmark?** 1.000 mỗi người (COM-004-FR-011).
8. **Cần mã quyền không?** Không; chỉ cần đã xác thực.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                                      |
| ---------- | --------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Đặc tả Bookmarks ban đầu, chốt 8 quyết định theo phương án đề xuất, Approved |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
