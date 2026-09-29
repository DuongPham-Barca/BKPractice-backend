# 2026-09-29 — Viết và phê duyệt spec, plan, tasks LRN-002 Quản lý Test Case

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/02-learning/test-cases/spec.md` và sửa bảng mã tính năng trong
  `specs/README.md`. Không đụng source, cấu hình, dependency hay migration.

## Spec and plan

- Spec: `specs/02-learning/test-cases/spec.md` — LRN-002 phiên bản 0.1
- Plan: `specs/02-learning/test-cases/plan.md` — Approved 2026-09-29
- Tasks: `specs/02-learning/test-cases/tasks.md` — Approved, T001–T038 chưa làm
- Spec status at start: chưa tồn tại; kết thúc là `Approved` 1.1

Lý do không cần feature spec khác: đây chính là bước viết spec (bước 1 của SDD), do người dùng yêu
cầu.

## Questions clarified

| Question                                                                          | Conclusion                                                                                                                    | Source                                                                                                           |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Làm tính năng nào tiếp sau LRN-001?                                               | LRN-002 Quản lý Test Case                                                                                                     | Người dùng đồng ý đề xuất ("oke"), 2026-09-29                                                                    |
| Mã LRN-002 là Test Case hay Course?                                               | Test Case. `specs/README.md` được đánh số lại: LRN-003 Course, LRN-004 Assignment, LRN-005 Progress                           | Người dùng đồng ý đề xuất; README tự ghi các mã ở đó chỉ là ví dụ; LRN-001 spec/plan đã gọi Test Case là LRN-002 |
| Import hàng loạt (câu 10)                                                         | v1 chỉ nhập từng Test Case                                                                                                    | Người dùng: "phase hiện tại thì nhập từng cái đã", 2026-09-29                                                    |
| Test Case mẫu (câu 2)                                                             | Có chế độ `SAMPLE` người học xem được                                                                                         | Người dùng: "cái này là có nhé", 2026-09-29                                                                      |
| Câu 1, 2a–2c, 3–9                                                                 | Chấp nhận toàn bộ đề xuất; spec lên 1.0 Approved                                                                              | Người dùng: "approve đi bro", 2026-09-29                                                                         |
| Tổng dung lượng gói judge, chỗ lưu harness, danh sách quản lý (3 vấn đề của plan) | Trần tổng 8 MiB mỗi Problem (spec lên 1.1, thêm AC-024); harness sang bảng `problem_harnesses`; danh sách trả đầy đủ nội dung | Người dùng: "approve", 2026-09-29                                                                                |

## What was done

- Tạo `specs/02-learning/test-cases/spec.md` từ `specs/templates/spec.template.md`, trạng thái
  `Proposed` với 10 câu hỏi mở, rồi chốt dần theo trả lời của người dùng. Bản 1.0 Approved gồm 19 FR,
  9 SR, 23 AC, mục Ngoài phạm vi và danh sách 10 quyết định đã phê duyệt.
- Sửa `specs/README.md`: bảng mã tính năng dùng `LRN-002 Test Case Management` và dời các mã
  Learning còn lại lên một số.

## Why these choices

- Test Case được làm trước Course/Assignment vì LRN-001 đã hoãn tường minh phần Test Case sang
  LRN-002, và luồng Submit/Judge cần Test Case mới chạy được.
- Test Case vẫn nằm trong khu vực Problems của Learning, theo `docs/architecture/learning-service.md`
  ("Test cases ... belong to Problems").
- Những gì chưa có quyết định sản phẩm được ghi thành câu hỏi mở thay vì viết thành MUST, theo
  working agreement bước 3 (không tự điền khoảng trống bằng giả định).
- Spec mô tả đúng nền tảng hiện có (bảng `test_cases`, harness nằm cạnh starter code, route
  judge-package không kiểm tra trạng thái, Judge dừng ở test sai đầu tiên) để người review thấy
  khoảng cách với hành vi mong muốn.

## How the feature works

Chưa phải tính năng đã triển khai. Luồng dự kiến theo spec:

1. Giảng viên sở hữu Problem thêm, sửa, sắp xếp hoặc gỡ Test Case qua API quản lý của Learning.
2. Khi xuất bản, kiểm tra xuất bản của LRN-001 chạy thêm điều kiện Test Case (Câu hỏi mở 1).
3. Khi sinh viên nộp bài, Submission gọi route nội bộ để lấy gói judge; Learning chỉ cấp khi Problem
   đủ điều kiện và ngôn ngữ đang bật.
4. Judge chấm theo gói đó; người học không bao giờ thấy dữ liệu Test Case ẩn.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `prettier --write` trên hai file markdown đã sửa.
- Not verified: spec chưa được người dùng review.

## Remaining

- Not done: chưa commit. Chưa triển khai; LRN-002 chỉ bắt đầu được sau khi LRN-001 đã triển khai.
- Risks: LRN-002 sửa hành vi hiện có ở ba chỗ khi triển khai: `PublishValidator` của LRN-001 thêm
  điều kiện Test Case; route judge-package chặn Problem chưa xuất bản; harness chuyển khỏi
  `starter_codes`, nên down migration mất harness không có starter code tương ứng. Giới hạn body JSON
  của Gateway và Learning phải nâng lên. Phụ thuộc quyền `problem:*` (LRN-001-T002) vẫn chưa giải
  quyết.
