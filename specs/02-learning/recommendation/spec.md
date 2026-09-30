# LRN-007 Gợi ý bài (Recommendation)

## Trạng thái

Approved

Phiên bản `1.0`, được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các phương án đề xuất).

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Cho người học đã xác thực một danh sách ngắn các Problem nên làm tiếp, tính theo luật cố định từ
tiến độ của chính họ và cấu trúc nội dung Learning: ưu tiên bài kế tiếp chưa giải trong Course họ
đang theo, sau đó là bài cùng Topic/Tag với bài đã giải ở độ khó vừa sức. Gợi ý không dùng học máy,
không dùng dữ liệu của người khác, không được lưu lại, và không bao giờ để lộ nội dung chưa công khai.

## Tác nhân

- **Người dùng đã xác thực (thường là STUDENT):** Xem gợi ý của chính mình. `LECTURER` và `ADMIN`
  cũng chỉ nhận gợi ý tính từ tiến độ của chính họ.
- **Khách chưa xác thực:** Không có quyền truy cập nào.
- **API Gateway:** Xác minh access token, loại bỏ header định danh do client gửi, chuyển tiếp ngữ
  cảnh định danh, vai trò và quyền đã xác minh (ID-003 0.4).
- **Learning Service:** Tính gợi ý từ dữ liệu nó sở hữu: Problem, Topic, Tag (LRN-001), Course và
  Chapter (LRN-003), tiến độ theo Problem (LRN-006).

## Bối cảnh

LRN-001-FR-016 ghi độ khó là metadata "phục vụ khám phá và Recommendation trong tương lai", và
LRN-003 đưa Recommendation vào mục Ngoài phạm vi. Kiến trúc Learning giữ Recommendation trong cùng
bounded context, không tách thành service riêng.

Nền tảng hiện có (khảo sát mã nguồn ngày 2026-09-30):

- Chưa có module, route hay bảng nào cho Recommendation.
- `problems` có `difficulty` (`EASY`, `MEDIUM`, `HARD`) và `publish_status`; liên kết nhiều-nhiều
  với `topics` và `tags` qua `problem_topics`, `problem_tags`. Dấu xoá mềm `deleted_at` và trạng
  thái `ON_HOLD` do LRN-001 bổ sung.
- `progress` có một dòng duy nhất cho mỗi `(user_id, problem_id)`, với `status`, `solved_at`. Dòng
  được ghi khi nhận `submission.accepted`; theo LRN-006, v1 chỉ có trạng thái đã giải.
- `courses` và `chapters` đã có; trạng thái Course và việc xếp Problem vào Chapter do LRN-003 bổ
  sung.

Mã nguồn hiện tại là hành vi nền tảng, không phải bản triển khai của đặc tả này.

## Thuật ngữ

- **Problem hiển thị được:** Problem `PUBLISHED` và chưa xoá mềm (LRN-001).
- **Course hiển thị được:** Course `PUBLISHED` và chưa xoá mềm (LRN-003).
- **Đã giải:** Người học có tiến độ đã giải cho Problem đó theo LRN-006.
- **Course đang theo:** Course hiển thị được mà người học đã giải ít nhất một Problem hiển thị được
  của nó.
- **Thứ tự Course:** Thứ tự Chapter trong Course, rồi thứ tự Problem trong Chapter (LRN-003).
- **Bài nền:** Problem hiển thị được mà người học đã giải; dùng làm căn cứ cho luật 2.
- **Bậc độ khó:** `EASY` < `MEDIUM` < `HARD`.

## Yêu cầu chức năng

- **LRN-007-FR-001 — Gợi ý cho chính mình:** Người dùng đã xác thực MUST có thể lấy danh sách gợi
  ý tính từ tiến độ của chính họ. Người gọi MUST NOT chỉ định được người dùng khác.
- **LRN-007-FR-002 — Tập ứng viên:** Mỗi gợi ý MUST là một Problem hiển thị được mà người gọi chưa
  giải.
- **LRN-007-FR-003 — Luật 1, bài kế tiếp trong Course đang theo:** Với mỗi Course đang theo, hệ
  thống MUST chọn Problem hiển thị được, chưa giải, đứng đầu tiên theo thứ tự Course. Mỗi Course góp
  tối đa một gợi ý. Course không còn Problem hiển thị được nào chưa giải thì không góp gợi ý.
- **LRN-007-FR-004 — Thứ tự giữa các Course:** Gợi ý của luật 1 MUST sắp theo thời điểm người học
  giải gần nhất một Problem hiển thị được trong Course đó, mới nhất trước; bằng nhau thì theo định
  danh Course tăng dần.
- **LRN-007-FR-005 — Luật 2, cùng Topic/Tag:** Một Problem MUST được coi là ứng viên của luật 2 khi
  nó có chung ít nhất một Topic hoặc Tag với một bài nền, và độ khó của nó bằng hoặc cao hơn đúng
  một bậc so với độ khó của chính bài nền đó (`EASY` → `EASY`/`MEDIUM`; `MEDIUM` → `MEDIUM`/`HARD`;
  `HARD` → `HARD`).
- **LRN-007-FR-006 — Thứ tự trong luật 2:** Ứng viên luật 2 MUST sắp theo số Topic và Tag khác nhau
  mà nó chung với các bài nền thoả điều kiện độ khó ở FR-005 (nhiều trước), rồi độ khó (thấp trước),
  rồi slug tăng dần.
- **LRN-007-FR-007 — Ưu tiên và gộp:** Danh sách MUST gồm các gợi ý luật 1 trước, sau đó bổ sung
  gợi ý luật 2. Mỗi Problem MUST xuất hiện tối đa một lần, giữ lý do của lần xuất hiện có ưu tiên cao
  hơn.
- **LRN-007-FR-008 — Giới hạn:** Danh sách MUST có tối đa 10 gợi ý. Khi luật 1 đã cho đủ 10 thì
  không bổ sung luật 2.
- **LRN-007-FR-009 — Lý do gợi ý:** Mỗi gợi ý MUST kèm lý do: với luật 1 là Course đang theo đã
  sinh ra nó; với luật 2 là các Topic và Tag nó chung với bài nền thoả điều kiện.
- **LRN-007-FR-010 — Tóm tắt công khai:** Mỗi gợi ý MUST chỉ chứa thông tin tóm tắt công khai của
  Problem theo LRN-001 (định danh, slug, tiêu đề, loại, độ khó) và của Course theo LRN-003 (định
  danh, slug, tiêu đề).
- **LRN-007-FR-011 — Tính theo state hiện tại, không lưu:** Gợi ý MUST được tính lại ở mỗi yêu cầu
  từ state hiện tại của Learning. Hệ thống MUST NOT lưu danh sách gợi ý, lịch sử gợi ý hay lịch sử
  yêu cầu xem gợi ý.
- **LRN-007-FR-012 — Xác định:** Với cùng một state, hai yêu cầu MUST trả cùng danh sách theo cùng
  thứ tự.
- **LRN-007-FR-013 — Rỗng là thành công:** Khi không có gợi ý nào, kết quả MUST là danh sách rỗng
  thành công, không phải lỗi.
- **LRN-007-FR-014 — Chỉ dùng dữ liệu của người gọi:** Việc tính MUST chỉ dựa trên tiến độ của
  người gọi và metadata nội dung hiển thị được. Nó MUST NOT dùng tiến độ, hành vi hay độ phổ biến
  giữa những người dùng khác, và MUST NOT dùng mô hình học máy.
- **LRN-007-FR-015 — Chỉ đọc:** Việc lấy gợi ý MUST NOT thay đổi tiến độ, Problem, Course hay bất kỳ
  state nào khác.

## Quy tắc nghiệp vụ

```text
bài nền    = Problem hiển thị được mà người gọi đã giải
luật 1     = với mỗi Course đang theo (mới hoạt động nhất trước):
               Problem hiển thị được, chưa giải, đầu tiên theo thứ tự Course
luật 2     = Problem hiển thị được, chưa giải, chung >= 1 Topic/Tag với một bài nền B
               và độ khó thuộc { độ khó B, độ khó B + 1 bậc }
kết quả    = luật 1 ++ (luật 2 trừ các Problem đã có), cắt còn 10
```

- Chỉ Problem hiển thị được mới làm bài nền. Problem người học đã giải nhưng nay `ON_HOLD` hoặc đã
  xoá mềm không làm bài nền, không làm Course trở thành đang theo, và không được gợi ý.
- Course `DRAFT`, `ON_HOLD` hoặc đã xoá mềm không bao giờ là Course đang theo.
- Problem không có Topic hay Tag nào không bao giờ là ứng viên luật 2, nhưng vẫn có thể là gợi ý
  luật 1.
- Người học chưa giải Problem hiển thị được nào thì nhận danh sách rỗng; v1 không có gợi ý khởi đầu.
- Việc tham gia Class (LRN-004) hay được giao Assignment (LRN-005) không tự làm Course trở thành
  đang theo ở v1.

## Quy tắc phân quyền

- Thao tác cần người dùng đã xác thực, với định danh lấy từ header Gateway tin cậy
  (`x-auth-user-id`).
- Không cần mã quyền nào; không thêm quyền mới ở Identity.
- Người gọi chỉ nhận gợi ý của chính mình. Không vai trò nào, kể cả `LECTURER` hay `ADMIN`, xem được
  gợi ý của người khác qua tính năng này.
- Định danh thiếu hoặc mơ hồ thì từ chối.

## Đầu vào

- Ngữ cảnh định danh tin cậy của người gọi.
- Không có tham số nào khác. Tham số không được phép (ví dụ định danh người dùng, số lượng) bị từ
  chối.

Route cụ thể thuộc `plan.md`.

## Đầu ra

- Danh sách theo thứ tự, tối đa 10 phần tử. Mỗi phần tử gồm:
  - tóm tắt Problem: định danh, slug, tiêu đề, loại, độ khó;
  - lý do: loại `NEXT_IN_COURSE` kèm tóm tắt Course (định danh, slug, tiêu đề), hoặc loại
    `SIMILAR_TOPIC_TAG` kèm danh sách Topic và Tag chung (định danh, tên).
- Không có nội dung đề, Test Case, harness, trạng thái vòng đời, người tạo, số đếm nội dung ẩn hay
  thông tin tiến độ của người khác.
- Không phát domain event; không thay đổi state.

## Tình huống lỗi

| Trường hợp                                | Hành vi quan sát được                                          |
| ----------------------------------------- | -------------------------------------------------------------- |
| Thiếu hoặc sai xác thực                   | `401`; không trả dữ liệu                                       |
| Định danh tin cậy thiếu hoặc không hợp lệ | `401`; không trả dữ liệu                                       |
| Có tham số không được phép                | Lỗi kiểm tra dữ liệu (`400`); không trả gợi ý                  |
| Không có gợi ý nào                        | Thành công với danh sách rỗng                                  |
| Lỗi hạ tầng khi đọc dữ liệu Learning      | Lỗi máy chủ theo quy ước hiện có; không trả danh sách một phần |

LRN-007 không đưa vào cấu trúc lỗi mới.

## Tình huống biên

- Người học mới, chưa có tiến độ: danh sách rỗng.
- Người học đã giải hết mọi Problem hiển thị được của một Course: Course đó không góp gợi ý.
- Một Problem là bài kế tiếp của hai Course đang theo: chỉ xuất hiện một lần, với Course đứng trước.
- Một Problem vừa là gợi ý luật 1 vừa là ứng viên luật 2: chỉ xuất hiện một lần với lý do
  `NEXT_IN_COURSE`.
- Bài nền `HARD`: luật 2 chỉ gợi ý Problem `HARD`.
- Bài kế tiếp trong Course bị tạm giữ: bỏ qua, chọn Problem hiển thị được, chưa giải kế tiếp.
- Người học vừa giải một Problem nhưng sự kiện `submission.accepted` chưa được Learning xử lý:
  Problem đó có thể vẫn được gợi ý cho tới khi tiến độ được ghi (nhất quán sau).
- Topic hoặc Tag bị gỡ khỏi Problem: lần tính sau không còn dùng liên kết đó.
- Tiêu đề tiếng Việt có dấu hiển thị nguyên vẹn; thứ tự theo slug không phụ thuộc tiêu đề.

## Yêu cầu bảo mật

- **LRN-007-SR-001 — Định danh tin cậy:** Người dùng được tính gợi ý MUST lấy từ header Gateway đã
  xác minh, không bao giờ từ tham số, body hay header do client đặt.
- **LRN-007-SR-002 — Không lộ dữ liệu người khác:** Kết quả, lỗi và log MUST NOT chứa tiến độ hay gợi
  ý của người dùng khác.
- **LRN-007-SR-003 — Không lộ nội dung chưa công khai:** Problem và Course không hiển thị được MUST
  NOT xuất hiện, kể cả gián tiếp qua lý do, số đếm hay thứ tự.
- **LRN-007-SR-004 — Không lộ dữ liệu judge:** Kết quả MUST NOT chứa Test Case, harness hay dữ liệu
  judge.
- **LRN-007-SR-005 — Thất bại an toàn:** Ngữ cảnh thiếu hoặc mơ hồ thì từ chối; lỗi đọc dữ liệu
  không trả danh sách một phần.
- **LRN-007-SR-006 — Cách ly service:** Không truy vấn CSDL của service khác; chỉ dùng dữ liệu trong
  `bkpractice_learning`.

## Tiêu chí nghiệm thu

- **LRN-007-AC-001:** Cho trước người chưa xác thực, khi yêu cầu gợi ý, thì nhận `401`.
- **LRN-007-AC-002:** Cho trước người học đã giải Problem đầu tiên của một Course đang `PUBLISHED`,
  khi yêu cầu gợi ý, thì phần tử đầu là Problem hiển thị được, chưa giải, kế tiếp theo thứ tự Course,
  với lý do `NEXT_IN_COURSE` và tóm tắt Course đó.
- **LRN-007-AC-003:** Cho trước bài kế tiếp theo thứ tự Course đang `ON_HOLD` hoặc đã xoá mềm, khi
  yêu cầu gợi ý, thì nó bị bỏ qua và Problem hiển thị được, chưa giải sau nó được gợi ý.
- **LRN-007-AC-004:** Cho trước người học theo hai Course, khi yêu cầu gợi ý, thì gợi ý của Course có
  lần giải gần nhất đứng trước, và mỗi Course góp tối đa một gợi ý luật 1.
- **LRN-007-AC-005:** Cho trước người học đã giải một bài nền `EASY` có Topic T, khi yêu cầu gợi ý,
  thì có thể có Problem `EASY` hoặc `MEDIUM` chưa giải có Topic T, và không có Problem `HARD` chỉ liên
  quan qua bài nền đó.
- **LRN-007-AC-006:** Cho trước bài nền duy nhất là `HARD`, khi yêu cầu gợi ý, thì mọi gợi ý luật 2
  đều là `HARD`.
- **LRN-007-AC-007:** Cho trước một Problem thoả cả luật 1 và luật 2, khi yêu cầu gợi ý, thì nó xuất
  hiện đúng một lần với lý do `NEXT_IN_COURSE`.
- **LRN-007-AC-008:** Cho trước có hơn 10 ứng viên, khi yêu cầu gợi ý, thì nhận đúng 10 gợi ý, luật
  1 trước luật 2.
- **LRN-007-AC-009:** Cho trước ứng viên `DRAFT`, `ON_HOLD`, đã xoá mềm, hoặc Course không hiển thị
  được, khi yêu cầu gợi ý, thì chúng không xuất hiện ở bất kỳ phần nào của phản hồi.
- **LRN-007-AC-010:** Cho trước Problem người học đã giải nay bị tạm giữ, khi yêu cầu gợi ý, thì nó
  không được gợi ý, không làm bài nền và không làm Course của nó trở thành đang theo.
- **LRN-007-AC-011:** Cho trước người học chưa giải Problem hiển thị được nào, khi yêu cầu gợi ý, thì
  nhận danh sách rỗng thành công.
- **LRN-007-AC-012:** Cho trước request kèm định danh người dùng khác hoặc tham số lạ, khi kiểm tra,
  thì bị từ chối bằng lỗi kiểm tra dữ liệu và không trả gợi ý của ai.
- **LRN-007-AC-013:** Cho trước hai người học có tiến độ khác nhau, khi mỗi người yêu cầu gợi ý, thì
  mỗi kết quả chỉ phụ thuộc tiến độ của chính người đó.
- **LRN-007-AC-014:** Cho trước state không đổi, khi yêu cầu gợi ý hai lần, thì hai kết quả giống
  hệt nhau, và không có bản ghi nào được tạo hay sửa.
- **LRN-007-AC-015:** Cho trước một gợi ý luật 2, khi kiểm tra, thì lý do chỉ liệt kê các Topic/Tag
  mà Problem đó thực sự chung với bài nền thoả điều kiện độ khó.
- **LRN-007-AC-016:** Cho trước phản hồi bất kỳ, khi kiểm tra, thì không chứa nội dung đề, Test Case,
  harness, trạng thái vòng đời, người tạo hay dữ liệu của người khác.
- **LRN-007-AC-017:** Cho trước người học vừa giải xong Problem cuối cùng chưa giải của một Course,
  khi tiến độ đã được ghi và yêu cầu gợi ý, thì Course đó không còn góp gợi ý.

## Ngoài phạm vi

- Học máy, lọc cộng tác, độ phổ biến, điểm tương đồng học được
- Gợi ý khởi đầu cho người học chưa có tiến độ
- Lưu gợi ý, lịch sử gợi ý, phản hồi "không quan tâm", ẩn gợi ý
- Tuỳ chỉnh số lượng, bộ lọc hay luật gợi ý theo người dùng
- Gợi ý dựa trên Class, Enrollment hay Assignment
- Giảng viên xem hoặc chỉnh gợi ý của sinh viên
- Thông báo, email hay realtime đẩy gợi ý
- Gợi ý dựa trên bài nộp không đạt (không có sự kiện ở v1, xem LRN-006)
- Microservice Recommendation riêng

## Phụ thuộc

- [Kiến trúc Learning Service](../../../docs/architecture/learning-service.md)
- [Quy tắc phụ thuộc](../../../docs/architecture/dependency-rules.md)
- [ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Vai trò và quyền](../../00-system/roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](../../00-system/database-strategy.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)
- [LRN-001 Quản lý Problem](../problems/spec.md): trạng thái hiển thị, độ khó, Topic/Tag, phép chiếu
  công khai.
- [LRN-003 Quản lý Course](../courses/spec.md): Course hiển thị được, thứ tự Chapter và Problem.
- LRN-006 Progress (`../progress/spec.md`): định nghĩa "đã giải" và thời điểm giải.
- [ID-003 RBAC](../../01-identity/rbac/spec.md) bản 0.4: header định danh tin cậy do Gateway đặt.

## Câu hỏi mở

Không còn. Các quyết định dưới đây là phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp ngày
2026-09-30:

1. **Cách gợi ý:** Theo luật cố định, không học máy (FR-014).
2. **Ai nhận gợi ý:** Mọi người dùng đã xác thực, chỉ cho chính mình; không xem được của người khác
   (FR-001).
3. **Quyền:** Không có mã quyền mới; chỉ cần xác thực.
4. **Thế nào là Course đang theo:** Course hiển thị được có ít nhất một Problem hiển thị được mà
   người học đã giải; tham gia Class không tính ở v1.
5. **Bài kế tiếp:** Problem hiển thị được, chưa giải, đầu tiên theo thứ tự Course; một gợi ý mỗi
   Course (FR-003).
6. **Thứ tự giữa các Course:** Lần giải gần nhất trong Course, mới trước (FR-004).
7. **Độ khó ở luật 2:** Bằng hoặc cao hơn một bậc so với chính bài nền có chung Topic/Tag (FR-005).
8. **Thứ tự trong luật 2:** Số Topic/Tag chung, rồi độ khó thấp trước, rồi slug (FR-006).
9. **Số lượng:** Tối đa 10, luật 1 trước (FR-007, FR-008).
10. **Lưu trữ:** Không lưu gợi ý hay lịch sử; tính lại mỗi yêu cầu (FR-011).
11. **Bài đã giải nay bị ẩn:** Không làm bài nền, không được gợi ý.
12. **Người chưa có tiến độ:** Danh sách rỗng, không có gợi ý khởi đầu.
13. **Lý do gợi ý:** Trả kèm loại lý do và Course hoặc Topic/Tag liên quan (FR-009).

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review                | Tóm tắt                                                        |
| ---------- | --------- | ----------------------------------- | -------------------------------------------------------------- |
| 2026-09-30 | 0.1       | DuongPham-Barca (cùng Claude Code)  | Đặc tả Recommendation ban đầu                                  |
| 2026-09-30 | 1.0       | Chủ sở hữu sản phẩm (phê duyệt gộp) | Chốt 13 quyết định theo phương án đề xuất và phê duyệt LRN-007 |

> `spec.md` mô tả CÁI GÌ. Chi tiết thư mục, class, cách hiện thực repository và thứ tự thực thi
> thuộc về `plan.md`, trừ khi một ràng buộc kiến trúc bắt buộc phải nêu ở đây.
