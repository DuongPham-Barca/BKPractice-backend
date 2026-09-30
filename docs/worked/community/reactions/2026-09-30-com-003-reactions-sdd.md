# 2026-09-30 — Viết và phê duyệt bộ SDD COM-003 Reactions

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/05-community/reactions/spec.md`, `plan.md`, `tasks.md`. Không đụng
  source, cấu hình, dependency hay migration.

## Spec and plan

- Spec: `specs/05-community/reactions/spec.md` — COM-003 phiên bản 1.1
- Plan: `specs/05-community/reactions/plan.md` — Approved 2026-09-30
- Tasks: `specs/05-community/reactions/tasks.md` — Approved 2026-09-30
- Spec status at start: chưa tồn tại; kết thúc là `Approved` 1.1 (phê duyệt gộp)

Lý do không cần feature spec khác: đây là bước viết spec/plan/tasks (bước 1–2 của SDD), do người
dùng yêu cầu.

## Questions clarified

| Question                                | Conclusion                                                                                                                                                                                                         | Source                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Có được tự chọn phương án và phê duyệt? | Có, trừ Submission và Judge                                                                                                                                                                                        | Người dùng, 2026-09-30: "bro generate cả luôn đi, tôi approve đó, trừ submission và judge" |
| Loại phản ứng, đối tượng                | Chỉ `LIKE`, trên Post và Comment, tối đa một mỗi người mỗi đối tượng, bật/tắt idempotent, có số đếm                                                                                                                | Brief điều phối (quyết định nền đã phê duyệt cho COM-003)                                  |
| Kiến trúc                               | Clean Architecture, module `reactions` riêng                                                                                                                                                                       | ADR 0002; `docs/architecture/community-service.md`                                         |
| Route đảo trạng thái hiện có            | Thay bằng `PUT`/`DELETE` idempotent, gỡ route cũ                                                                                                                                                                   | Đề xuất trong spec (quyết định 3), phê duyệt gộp                                           |
| Hiện danh sách người đã `LIKE`?         | Không ở v1                                                                                                                                                                                                         | Đề xuất (quyết định 5), phê duyệt gộp                                                      |
| Nội dung ẩn/xoá mềm                     | Bật chỉ khi nội dung nhận tương tác mới theo COM-001-FR-016/COM-002-FR-017 (tác giả trên nội dung bị ẩn của mình nhận `409`); tắt được khi còn hiển thị với người gọi; người khác nhận `404`; phản ứng cũ được giữ | Đề xuất (quyết định 7), phê duyệt gộp; đặc tả COM-001/002 Approved                         |
| Dùng seam nào để hỏi hiển thị?          | `CheckPostInteraction`/`CheckCommentInteraction` của COM-001/002 (bản nháp đầu dùng `ContentVisibilityReader` của COM-005, đã bỏ)                                                                                  | Plan COM-001/002 Approved                                                                  |
| Mã quyền                                | Không cần                                                                                                                                                                                                          | Brief: mọi người đã xác thực                                                               |

## What was done

- Spec COM-003: 13 FR, 6 SR, 15 AC, bảng vòng đời phản ứng theo trạng thái đối tượng, 8 quyết định.
- Plan: module `modules/reactions/` theo Clean Architecture; migration `Com003Reactions` thêm
  `comment_id` vào `reactions` và thay ràng buộc duy nhất bằng hai partial unique index; bốn route
  `PUT`/`DELETE`; gỡ `POST .../reactions/like`; hỏi hiển thị qua `CheckPostInteraction`/
  `CheckCommentInteraction`; `ReactionCountReader` để bổ sung `likeCount`, `likedByMe` vào DTO
  Post/Comment còn hiển thị; Comment gốc bị xoá mềm/ẩn cùng cây trả lời không xuất hiện theo
  COM-002-FR-010.
- Tasks: 20 task (T001–T020) kèm Phụ thuộc, Truy vết và bảng độ phủ.

## Why these choices

- Khảo sát code cho thấy `toggleLike` đảo trạng thái (không idempotent, retry lật kết quả, có thể lỗi
  `500` khi đồng thời) và không kiểm `isHidden`; brief yêu cầu bật/tắt idempotent, nên thay bằng
  `PUT`/`DELETE` dùng `ON CONFLICT DO NOTHING`.
- Giữ `post_id` bắt buộc và thêm `comment_id` nullable để tái dùng bảng hiện có và cascade theo Post.
- Đếm bằng `COUNT(*)` gộp theo trang, không bộ đếm phi chuẩn hoá, vì đặc tả không cần và tránh lệch
  dữ liệu.
- Quy tắc hiển thị và "nhận tương tác mới" không định nghĩa lại mà hỏi COM-001/002, vì đặc tả Approved
  của chúng đã định nghĩa và export seam cho đúng mục đích này.

## How the feature works

Chưa triển khai. Luồng dự kiến:

1. Người dùng đã xác thực gọi `PUT /api/community/posts/:postId/reactions/like` (hoặc route của
   Comment) qua Gateway.
2. Controller của `reactions` đọc principal tin cậy, gọi `LikeContent`.
3. Use case hỏi `CheckPostInteraction`/`CheckCommentInteraction`; không hiển thị thì `404`; hiển thị
   với tác giả nhưng bị ẩn thì `409` khi bật.
4. Adapter chèn phản ứng nếu chưa có, đếm lại và trả `{ liked: true, likeCount }`.
5. `DELETE` tương tự với `UnlikeContent`. Danh sách Post/Comment của COM-001/002 lấy `likeCount`,
   `likedByMe` qua `ReactionCountReader`.
6. Gọi lặp lại không đổi kết quả; request thiếu định danh bị `401`; body lạ bị `400`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `npx --no-install prettier --write` trên các file markdown đã tạo.
- Not verified: chưa có code; hành vi Comment đã được đối chiếu với COM-002-FR-010.

## Remaining

- Not done: chưa commit; chưa triển khai.
- Risks: gỡ route cũ là thay đổi phá vỡ với frontend; plan COM-001 còn một dòng nói COM-003 dùng
  `ContentVisibilityReader` của COM-005 (bản nháp cũ), cần người điều phối cập nhật; down migration mất
  phản ứng trên Comment.
