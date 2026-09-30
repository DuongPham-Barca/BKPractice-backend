# 2026-09-30 — Viết và phê duyệt bộ SDD COM-004 Bookmarks

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/05-community/bookmarks/spec.md`, `plan.md`, `tasks.md`. Không đụng
  source, cấu hình, dependency hay migration.

## Spec and plan

- Spec: `specs/05-community/bookmarks/spec.md` — COM-004 phiên bản 1.0
- Plan: `specs/05-community/bookmarks/plan.md` — Approved 2026-09-30
- Tasks: `specs/05-community/bookmarks/tasks.md` — Approved 2026-09-30
- Spec status at start: chưa tồn tại; kết thúc là `Approved` 1.0 (phê duyệt gộp)

Lý do không cần feature spec khác: đây là bước viết spec/plan/tasks (bước 1–2 của SDD), do người
dùng yêu cầu.

## Questions clarified

| Question                                | Conclusion                                                                                                                                                          | Source                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Có được tự chọn phương án và phê duyệt? | Có, trừ Submission và Judge                                                                                                                                         | Người dùng, 2026-09-30: "bro generate cả luôn đi, tôi approve đó, trừ submission và judge" |
| Phạm vi bookmark                        | Riêng tư, chỉ trên Post, bật/tắt idempotent                                                                                                                         | Brief điều phối (quyết định nền cho COM-004)                                               |
| Kiến trúc                               | Clean Architecture, module `bookmarks` riêng                                                                                                                        | ADR 0002; `docs/architecture/community-service.md`                                         |
| Bật lại giữ thời điểm lưu?              | Có                                                                                                                                                                  | Đề xuất (quyết định 3), phê duyệt gộp                                                      |
| Gỡ bookmark của Post không xem được     | Được, luôn `204`, không lộ Post tồn tại                                                                                                                             | Đề xuất (quyết định 4), phê duyệt gộp                                                      |
| Post ẩn/xoá mềm                         | Tạo mới chỉ khi Post nhận tương tác mới (tác giả trên Post bị ẩn của mình `409`); danh sách chỉ có Post còn hiển thị với người gọi theo COM-001, không xoá bookmark | Đề xuất (quyết định 5), phê duyệt gộp; COM-001-FR-016                                      |
| Thứ tự, giới hạn                        | Mới nhất trước, phân trang 1..50; tối đa 1.000 bookmark mỗi người                                                                                                   | Đề xuất (quyết định 6, 7), phê duyệt gộp                                                   |

## What was done

- Spec COM-004: 12 FR, 6 SR, 13 AC, bảng hành vi theo trạng thái Post, 8 quyết định.
- Plan: module `modules/bookmarks/`; tái dùng bảng `bookmarks` và ràng buộc duy nhất; migration
  `Com004Bookmarks` chỉ thêm index `(user_id, created_at DESC, id DESC)`; ba route; advisory lock theo
  người dùng để giữ giới hạn khi đồng thời; hỏi hiển thị qua `CheckPostInteraction`; danh sách lọc bằng
  điều kiện tương đương `Post.isVisibleTo` và ánh xạ bằng mapper tóm tắt của COM-001;
  `BookmarkFlagReader` để bổ sung `bookmarkedByMe` vào DTO Post.
- Tasks: 19 task (T001–T019) kèm Phụ thuộc, Truy vết và bảng độ phủ.

## Why these choices

- Khảo sát code: bảng và entity `Bookmark` đã có nhưng không có API; chỉ thiếu index để liệt kê theo
  người dùng, nên không thêm cột.
- Community không có bảng người dùng để `FOR UPDATE`, nên dùng `pg_advisory_xact_lock` theo `user_id`
  để giữ giới hạn 1.000 đúng khi đồng thời.
- Lọc hiển thị trong truy vấn (không lọc sau phân trang) để tổng số và trang không lộ Post bị ẩn.
- Biểu diễn Post lấy từ mapper tóm tắt của COM-001 để không nhân đôi cách hiển thị Post; điều kiện
  hiển thị trong SQL có test đối chiếu với `Post.isVisibleTo`.

## How the feature works

Chưa triển khai. Luồng dự kiến:

1. Người dùng gọi `PUT /api/community/posts/:postId/bookmark` qua Gateway.
2. Controller đọc principal tin cậy, gọi `BookmarkPost`.
3. Use case hỏi `CheckPostInteraction` (COM-001); đã có bookmark thì trả nguyên; chưa có thì cần Post
   nhận tương tác mới, khoá theo người dùng, kiểm 1.000, chèn.
4. Trả `{ bookmarked: true, bookmarkedAt }`.
5. `GET /api/community/bookmarks` trả trang Post đã lưu còn hiển thị, mới nhất trước.
   `DELETE .../bookmark` luôn `204`.
6. Post không hiển thị → `404`; tác giả tạo mới trên Post bị ẩn của mình hoặc vượt giới hạn → `409`;
   không định danh → `401`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `npx --no-install prettier --write` trên các file markdown đã tạo.
- Not verified: chưa có code; chưa đối chiếu với plan COM-001 đang viết song song.

## Remaining

- Not done: chưa commit; chưa triển khai.
- Risks: COM-001 cần export mapper tóm tắt Post; điều kiện hiển thị lặp lại trong SQL; vòng phụ thuộc
  module `posts` ⇄ `bookmarks` cần provider độc lập.
