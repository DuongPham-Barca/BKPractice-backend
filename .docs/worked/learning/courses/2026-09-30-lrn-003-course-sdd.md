# 2026-09-30 — Viết và phê duyệt spec, plan, tasks LRN-003 Quản lý Course

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo và phê duyệt bộ `spec.md`, `plan.md`, `tasks.md` của LRN-003; đánh số lại
  mã Learning trong `specs/README.md`. Không đụng source, cấu hình, dependency hay migration.

## Spec and plan

- Spec: `specs/02-learning/courses/spec.md` — LRN-003 phiên bản 1.0
- Plan: `specs/02-learning/courses/plan.md` — Approved 2026-09-30 (phê duyệt gộp)
- Tasks: `specs/02-learning/courses/tasks.md` — Approved, T001–T030 chưa làm
- Spec status at start: chưa tồn tại; kết thúc là `Approved` 1.0

Lý do không cần feature spec khác: đây là bước viết spec/plan/tasks (bước 1–2 của SDD), do người dùng
yêu cầu.

## Questions clarified

| Question                  | Conclusion                                                                                                                                                                                                                                                                                                                                                                                                    | Source                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Làm phần nào tiếp?        | Tiếp trong Learning; Submission đã có người khác làm                                                                                                                                                                                                                                                                                                                                                          | Người dùng, 2026-09-30                                                                     |
| Course và Class là gì?    | Course = khung nội dung của môn, dùng lại qua nhiều kỳ; Class = lớp học phần của một kỳ                                                                                                                                                                                                                                                                                                                       | Người dùng chọn, 2026-09-30                                                                |
| Phạm vi LRN-003?          | Course + Chapter + xếp Problem vào Chapter; Class + Enrollment tách thành LRN-004                                                                                                                                                                                                                                                                                                                             | Người dùng chọn, 2026-09-30                                                                |
| Mã Learning sau đó?       | LRN-004 Class & Enrollment, LRN-005 Assignment, LRN-006 Progress                                                                                                                                                                                                                                                                                                                                              | Suy ra từ quyết định phạm vi; README tự ghi các mã là ví dụ                                |
| File SUB-002 chưa commit? | Giữ nguyên trong working tree, chưa commit                                                                                                                                                                                                                                                                                                                                                                    | Người dùng chọn, 2026-09-30                                                                |
| 10 câu hỏi mở của LRN-003 | Chấp nhận toàn bộ đề xuất: quyền `course:*` cho `LECTURER`; vòng đời như LRN-001 cộng xoá hẳn nháp không bị tham chiếu; mọi người đã xác thực xem được; Chapter chỉ có tiêu đề, mô tả, Problem; thêm Problem `PUBLISHED` hoặc nháp của chính mình; xuất bản cần ≥1 Chapter và ≥1 Problem `PUBLISHED`; mỗi Problem một lần mỗi Course; 50/50 và 20.000/5.000 ký tự; slug bất biến; sửa tại chỗ khi đã xuất bản | Người dùng: "approve", 2026-09-30                                                          |
| Phê duyệt plan và tasks   | Phê duyệt gộp các phương án đề xuất: aggregate Course gồm Chapter và tham chiếu Problem; bảng `chapter_problems` với FK kép và `UNIQUE (course_id, problem_id)`; đọc Problem qua `ProblemReferenceReader` do module `problems` export; xoá hẳn nháp kiểm tham chiếu trong transaction có khoá; Course cũ nhận `DRAFT`; migration seed `course:*` ở Identity                                                   | Người dùng: "bro generate cả luôn đi, tôi approve đó, trừ submission và judge", 2026-09-30 |

## What was done

- Tạo spec LRN-003, chốt 10 câu hỏi mở rồi phê duyệt bản 1.0: 19 FR, 8 SR, 20 AC, mô hình Course → Chapter → Problem,
  bảng vòng đời đề xuất, mục Ngoài phạm vi, và danh sách 10 quyết định.
- Tạo plan Approved bám DDD + Hexagonal Architecture: aggregate Course, port đọc Problem, migration
  Learning/Identity, API, kiểm thử, thứ tự triển khai và mục Tuân thủ kiến trúc tường minh.
- Tạo 30 task có dependency/truy vết từ chuẩn bị tới migration, API, kiểm thử và bàn giao.
- Sửa bảng mã trong `specs/README.md`.

## Why these choices

- Tái dùng quyết định của LRN-001 (sở hữu, `ADMIN` không có thẩm quyền ngầm, slug, Markdown hạn chế,
  vòng đời) để Learning nhất quán.
- Quyền `course:*` đi qua cơ chế claim `permissions` vừa được phê duyệt ở ID-003 0.4.
- Schema hiện có chưa có quan hệ Chapter–Problem, chưa có trạng thái Course; spec ghi rõ khoảng cách
  này ở mục Bối cảnh.

## How the feature works

Chưa triển khai. Luồng dự kiến: Giảng viên tạo Course nháp → thêm Chapter → xếp Problem vào Chapter
→ xuất bản khi đủ điều kiện → người học đã xác thực xem cấu trúc Course, chỉ thấy Problem đang
`PUBLISHED`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `prettier --write` trên các file markdown; kiểm tra cấu trúc/link
  và Prettier đều pass ở lượt rà soát SRS ngày 2026-09-30.
- Not verified: không chạy kiểm chứng code vì đây là thay đổi chỉ tài liệu.

## Remaining

- Not done: chưa commit; chưa triển khai.
- Risks: xoá hẳn Course nháp gặp FK `ON DELETE CASCADE` của `classes`, nên LRN-004 phải khoá `FOR SHARE` khi tạo Class; Course hiện có chuyển thành `DRAFT` sau migration. Seed `course:*` là LRN-003-T003.
