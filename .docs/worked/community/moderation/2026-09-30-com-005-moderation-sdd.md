# 2026-09-30 — Viết và phê duyệt bộ SDD COM-005 Moderation

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/05-community/moderation/spec.md`, `plan.md`, `tasks.md`. Không đụng
  source, cấu hình, dependency hay migration (kể cả migration seed quyền ở Identity, mới chỉ được lập
  kế hoạch).

## Spec and plan

- Spec: `specs/05-community/moderation/spec.md` — COM-005 phiên bản 1.1
- Plan: `specs/05-community/moderation/plan.md` — Approved 2026-09-30
- Tasks: `specs/05-community/moderation/tasks.md` — Approved 2026-09-30
- Spec status at start: chưa tồn tại; kết thúc là `Approved` 1.1 (phê duyệt gộp)

Lý do không cần feature spec khác: đây là bước viết spec/plan/tasks (bước 1–2 của SDD), do người
dùng yêu cầu.

## Questions clarified

| Question                                | Conclusion                                                                                                                                     | Source                                                                                     |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Có được tự chọn phương án và phê duyệt? | Có, trừ Submission và Judge                                                                                                                    | Người dùng, 2026-09-30: "bro generate cả luôn đi, tôi approve đó, trừ submission và judge" |
| Ai kiểm duyệt                           | Người có `community:moderate`, seed cho `ADMIN` ở Identity; `LECTURER` không kiểm duyệt v1                                                     | Brief điều phối (quyết định nền cho COM-005)                                               |
| Nội dung ẩn hiện với ai                 | Không hiện với người khác; tác giả thấy kèm trạng thái                                                                                         | Brief điều phối                                                                            |
| Danh sách lý do                         | `SPAM`, `HARASSMENT`, `INAPPROPRIATE`, `SOLUTION_SPOILER`, `OTHER` + ghi chú ≤ 500 ký tự                                                       | Đề xuất (quyết định 2), phê duyệt gộp                                                      |
| Báo cáo trùng, tự báo cáo               | Một báo cáo `OPEN` mỗi người mỗi đối tượng (idempotent); cấm tự báo cáo                                                                        | Đề xuất (quyết định 3, 4), phê duyệt gộp                                                   |
| Xử lý báo cáo                           | `HIDE`/`DISMISS` áp cho mọi báo cáo `OPEN` của đối tượng; ẩn trực tiếp cũng kết thúc báo cáo mở                                                | Đề xuất (quyết định 5), phê duyệt gộp                                                      |
| Hệ quả hiển thị của việc ẩn thuộc ai?   | COM-001/002 (đã Approved: Post ẩn `404`; Comment gốc ẩn thì cả cây trả lời không xuất hiện); COM-005 chỉ sở hữu một cờ ẩn duy nhất `is_hidden` | Đặc tả COM-001/002 Approved; đề xuất (quyết định 7), phê duyệt gộp                         |
| Quyền đọc từ đâu                        | Chỉ `x-auth-permissions`; thiếu → rỗng → `403`                                                                                                 | ID-003 0.4 (FR-021, FR-022)                                                                |
| Kiến trúc                               | Clean Architecture, module `moderation` riêng; COM-001/002 sở hữu quy tắc hiển thị                                                             | ADR 0002; `docs/architecture/community-service.md`                                         |

## What was done

- Spec COM-005: 17 FR, 9 SR, 24 AC, máy trạng thái kiểm duyệt và báo cáo, một cờ ẩn duy nhất
  (FR-012) mà COM-001–004 đọc, 10 quyết định.
- Plan: module `modules/moderation/`; hỏi hiển thị qua `CheckPostInteraction`/`CheckCommentInteraction`;
  migration Community `Com005Moderation` (enum lý do, sửa `reports`, thêm `hidden_reason`, `hidden_at`,
  `hidden_by` cạnh `is_hidden`); migration Identity `Com005CommunityModeratePermission` seed
  `community:moderate` cho `ADMIN`; chín route; bổ sung `reason`, `hiddenAt` vào trường `moderation`
  của phép chiếu tác giả COM-001/002; mục "Điểm phối hợp đã giải quyết".
- Tasks: 32 task (T001–T032), trong đó COM-005-T019 là task seed quyền ở Identity.

## Why these choices

- Khảo sát code: `reports.reason` là văn bản tự do, chỉ gắn Post, không có index hay API; `is_hidden`
  có sẵn nhưng danh sách lọc ẩn cả với tác giả. Plan giữ bảng và enum trạng thái hiện có, thêm cột
  thay vì tạo bảng mới, và backfill dữ liệu cũ sang `OTHER`.
- Bản nháp đầu đặt quy tắc hiển thị trong `moderation`; bản cuối để quy tắc ở COM-001/002 và COM-005
  chỉ sở hữu cờ ẩn. Theo COM-002-FR-010, Comment gốc bị xoá mềm/ẩn kéo theo cây trả lời không xuất
  hiện trong luồng thông thường.
- Kiểm quyền theo mã `community:moderate`, không theo tên vai trò, đúng ID-003 0.4 và mặc định từ chối.
- Khoá dòng báo cáo và đối tượng để hai người kiểm duyệt không cùng xử lý một báo cáo.

## How the feature works

Chưa triển khai. Luồng dự kiến:

1. Người dùng gọi `POST /api/community/posts/:postId/reports` (hoặc route Comment) với lý do.
2. Controller đọc principal tin cậy, gọi `ReportContent`; use case kiểm nội dung hiển thị với người
   gọi và không phải của chính họ, rồi upsert báo cáo `OPEN`.
3. `ADMIN` có `community:moderate` gọi `GET /api/community/moderation/reports` để xem hàng đợi và chi
   tiết (kể cả nội dung đã ẩn).
4. `ADMIN` gọi `.../reports/:id/resolve` với `HIDE` hoặc `DISMISS`; use case khoá dòng, cập nhật
   trạng thái ẩn và mọi báo cáo `OPEN` của đối tượng.
5. Người khác không còn thấy nội dung bị ẩn; tác giả thấy kèm `moderationStatus = HIDDEN`, lý do,
   thời điểm. `.../restore` bỏ ẩn.
6. Thiếu quyền → `403`; báo cáo đã xử lý → `409`; tự báo cáo → `400`; nội dung không hiển thị → `404`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `npx --no-install prettier --write` trên các file markdown đã tạo.
- Not verified: chưa có code; hành vi Comment đã được đối chiếu với COM-002-FR-010.

## Remaining

- Not done: chưa commit; chưa triển khai; chưa tạo migration seed ở Identity.
- Risks: kiểm duyệt phụ thuộc ID-003-T048 (Gateway đặt `x-auth-permissions`); migration down xoá dữ
  liệu báo cáo trên Comment. Câu chữ ID-003-AC-017/018 và nguồn quy tắc hiển thị đã được căn chỉnh.
