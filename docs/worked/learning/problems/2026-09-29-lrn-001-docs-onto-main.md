# 2026-09-29 — Đưa bộ tài liệu LRN-001 lên main

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. `specs/02-learning/problems/{spec,plan,tasks}.md`. Không đụng source, cấu hình
  runtime, dependency hay migration.

## Spec and plan

- Spec: `specs/02-learning/problems/spec.md` — LRN-001 phiên bản 1.1
- Plan: `specs/02-learning/problems/plan.md`
- Tasks: `specs/02-learning/problems/tasks.md`
- Spec status at start: trên `main` là `Proposed` (0.1, còn 15 câu hỏi mở); trên branch
  `docs/lrn-001-tasks` là `Approved` (1.1).

Lý do không cần feature spec mới: người dùng yêu cầu làm tiếp phần viết specs cho Problem, đây là
thay đổi chỉ tài liệu (working agreement, bước 1).

## Questions clarified

| Question                                                                  | Conclusion                                                                                             | Source                                         |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| Người dùng đang code hay đang viết specs?                                 | Đang viết specs, chưa code                                                                             | Người dùng trả lời 2026-09-29                  |
| Làm trên branch nào?                                                      | `main`                                                                                                 | Người dùng trả lời 2026-09-29                  |
| Cơ chế quyền `problem:*`, trần giới hạn thực thi, độ dài Markdown         | Người dùng bỏ qua ở bước này; để lại cho giai đoạn triển khai (LRN-001-T002)                           | Người dùng trả lời 2026-09-29; `tasks.md` T002 |
| Bản 1.1 và các quyết định cho 15 câu hỏi mở có phải của người dùng không? | Có. Commit `21cad82` trên `docs/lrn-001-tasks` do chính người dùng tạo; lần này không sửa nội dung nào | `git log docs/lrn-001-tasks`                   |

## What was done

Trên `main`, bộ tài liệu Problem đang lệch nhau: `spec.md` vẫn là bản 0.1 Proposed, trong khi
`plan.md` đã tham chiếu spec 1.1 Approved, và chưa có `tasks.md`. Bản hoàn chỉnh (spec 1.1 Approved,
plan Approved, tasks Approved) chỉ nằm trên branch `docs/lrn-001-tasks`. Branch này đi sau `main`
(chưa có working agreement, `docs/pm`, `docs/worked`), nên không merge cả branch.

Chỉ lấy đúng ba file từ `docs/lrn-001-tasks` đưa vào working tree của `main`
(`git checkout docs/lrn-001-tasks -- <3 file>`) và giữ nguyên nội dung. Kết quả: `main` giờ có bộ
spec/plan/tasks LRN-001 khớp nhau, và LRN-001 có thể sang giai đoạn triển khai sau khi xử lý các
điểm lệch ghi ở mục Remaining.

## Why these choices

- Chỉ checkout ba file thay vì merge branch: merge sẽ xoá working agreement và các README đã có trên
  `main`, vì branch được tạo trước những thay đổi đó.
- Không sửa nội dung đã Approved: working agreement cấm sửa `spec.md` Approved khi chưa có chỉ đạo
  tường minh.

## How the feature works

Đây không phải tính năng sản phẩm. Quy trình SDD cho LRN-001 giờ chạy như sau trên `main`:
spec 1.1 Approved → plan Approved → tasks Approved (T001–T048, tất cả chưa làm) → triển khai bắt
đầu từ T001/T002.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `git status --short` cho thấy `spec.md`, `plan.md` đã sửa và
  `tasks.md` được thêm; `prettier --write` trên các file markdown đã sửa. Không chạy lint/test/build vì đây là thay đổi chỉ tài liệu.
- Not verified: chưa có con người review lại sau khi đưa về `main`.

## Remaining

- Not done: chưa commit và chưa push.
- Đã sửa sau khi người dùng duyệt ("approve đi", 2026-09-29):
  1. **Tính bất biến của loại Problem.** Spec cho phép đổi loại khi còn `DRAFT` và chỉ khoá sau khi
     xuất bản, nhưng `plan.md` (UpdateProblem) và `tasks.md` T014 cấm đổi `problemType` ở mọi trạng
     thái. Theo thứ tự nguồn chân lý (spec > plan > tasks), đã sửa plan và T014: `problemType` đổi
     được khi `DRAFT`, trạng thái khác trả `InvalidProblemState`, `type_config` phải khớp loại mới.
     Spec không đổi.
  2. Bổ sung ADR 0002 vào mục Phụ thuộc của `spec.md`, thêm một dòng lịch sử sửa đổi; không đổi yêu
     cầu và không đổi số phiên bản.
  3. Xoá dòng rác `adanjdjđk` cuối `specs/00-system/judge-security.md`.
- Risks: cơ chế truyền quyền `problem:*` vẫn là phụ thuộc chặn (T002), vì token Identity hiện chỉ
  mang `sub`, `roles`, `type`. Phải chốt trước khi bắt đầu code.
