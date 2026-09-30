# 2026-09-30 — Viết bản nháp spec JDG-001 Chấm bài chuẩn

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/04-judge/standard-judge/spec.md`. Không đụng source, cấu hình,
  dependency hay migration.

## Spec and plan

- Spec: `specs/04-judge/standard-judge/spec.md` — JDG-001 phiên bản 0.1
- Plan: chưa có, vì spec còn Proposed
- Tasks: chưa có
- Spec status at start: chưa tồn tại; kết thúc là `Proposed`

Lý do không cần feature spec khác: đây là bước viết spec (bước 1 của SDD), người dùng yêu cầu
"tiếp tục" sau khi JDG-001 được đề xuất là việc tiếp theo.

## Questions clarified

| Question                            | Conclusion                                                           | Source                             |
| ----------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| Làm gì tiếp sau sửa đổi quyền?      | JDG-001 Standard Judge                                               | Người dùng: "tiếp tục", 2026-09-30 |
| Dừng sớm và điểm                    | Đã chốt ở SUB-002: dừng ở test sai đầu tiên, điểm do Submission tính | SUB-002 quyết định 2               |
| Các quyết định sản phẩm của JDG-001 | Chưa chốt; ghi thành 8 câu hỏi mở kèm đề xuất                        | Chờ người dùng                     |

## What was done

Tạo spec JDG-001 ở trạng thái `Proposed`: 17 FR, 6 SR, 17 AC, thứ tự ưu tiên verdict, mục Ngoài
phạm vi tách JDG-002 tới JDG-005 và SUB-001, và 8 câu hỏi mở.

## Why these choices

Khảo sát `judge.engine.ts` và `docker-sandbox.executor.ts` cho thấy các điểm làm sai kết quả chấm,
nên được viết thành yêu cầu:

- Thời gian đo quanh cả `docker run`, tính cả khởi động container → FR-008, AC-007, Câu hỏi mở 1.
- Bộ Test Case rỗng trả `ACCEPTED` điểm 100 → FR-002, FR-017, AC-008, AC-017.
- Workspace đọc-ghi khi chạy Test Case → FR-007, AC-010, Câu hỏi mở 7.
- Biên dịch quá giờ báo TLE và dùng giới hạn bộ nhớ của Problem → Câu hỏi mở 5.
- Luôn trả `stdout`/`stderr` → FR-013, AC-009 (phòng thủ nhiều lớp cùng SUB-002).
- `memoryKb` không bao giờ được đo → FR-012, Câu hỏi mở 6.

## How the feature works

Chưa triển khai. Luồng dự kiến: Submission gửi `judge.request` → Judge kiểm tra yêu cầu → tạo
workspace → biên dịch trong sandbox với giới hạn biên dịch → chạy từng Test Case trong container
mới với file đã biên dịch chỉ đọc → so khớp output đã chuẩn hoá → dừng ở test sai đầu tiên → phát
`judge.result` không kèm output → dọn workspace.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `prettier --write` trên file markdown mới.
- Not verified: spec chưa được người dùng review.

## Remaining

- Not done: người dùng trả lời 8 câu hỏi mở; sau đó spec lên Approved, rồi viết `plan.md` và
  `tasks.md`.
- Risks: các sai lệch trên vẫn tồn tại trong code hiện tại cho tới khi JDG-001 được triển khai.
