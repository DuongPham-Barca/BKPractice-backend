# 2026-10-28 — Tách bản nháp tìm kiếm Profile và quản trị User

- Author: Codex
- Scope: Tài liệu hai feature Identity; không thay đổi code, runtime hay database.

## Spec and plan

- Spec: [ID-005](../../specs/01-identity/profile-discovery/spec.md), [ID-006](../../specs/01-identity/user-management/spec.md).
- Plan: [ID-005](../../specs/01-identity/profile-discovery/plan.md), [ID-006](../../specs/01-identity/user-management/plan.md).
- Tasks: [ID-005](../../specs/01-identity/profile-discovery/tasks.md), [ID-006](../../specs/01-identity/user-management/tasks.md).
- Spec status at start: Chưa có hai spec này; ID-002 Profile Approved, ID-004 mới Approved phần import, CRUD còn Proposed. Hai spec mới giữ Proposed; plan/tasks là bản nháp review.

## Questions clarified

| Question | Conclusion | Source |
| --- | --- | --- |
| Search tên và xem hồ sơ cần bao nhiêu thao tác? | Search một API; khi mở kết quả dùng API profile theo `userId` đã có. | Trao đổi ngày 2026-10-28; ID-002. |
| Student có dùng danh sách User của Admin không? | Tách Profile công khai khỏi User quản trị. | Trao đổi ngày 2026-10-28; ID-002 projection. |
| Tên tài nguyên quản trị? | Route mới dùng `users`; route import ID-004 Approved giữ nguyên. | Trao đổi ngày 2026-10-28; ID-004. |
| OTP có ở hai bộ này không? | OTP thuộc Authentication riêng ID-007. | ID-001 Out of Scope; trao đổi ba endpoint OTP. |
| Quyền, khớp tên, phân trang, xoá/phiên chốt chưa? | Chưa; ghi Câu hỏi mở chặn Approved. | ID-004, ID-003, ID-001. |

## What was done

Tạo hai bộ `spec.md`, `plan.md`, `tasks.md` tại `.docs/specs/01-identity/`: ID-005 tìm Profile theo tên và ID-006 cho Admin xem danh sách/chi tiết, xoá mềm User. ID-005 tái dùng route xem chi tiết; ID-006 dùng route `users` và giữ import Approved. Mỗi spec ghi FR, AC, phân quyền, contract, lỗi và câu hỏi cần review. Plan/tasks chỉ dùng sau Approved.

## Why these choices

ID-002 sở hữu `Profile.displayName` và dữ liệu công khai; Identity/User sở hữu credential/phiên/quản trị. Tách hai feature tránh đưa dữ liệu quản trị vào search. ID-004 Proposed CRUD phải được hoà giải trước khi ID-006 Approved.

## How the feature works

Đây là tài liệu, chưa có runtime mới. Theo ID-005, FE gửi tên, nhận kết quả có `userId`, mở route profile hiện có. Theo ID-006, Admin đọc trang/chi tiết hoặc yêu cầu xoá mềm; Identity kiểm tra quyền, cập nhật dấu xoá và xử lý phiên sau khi chính sách được chốt. Luồng chỉ có hiệu lực sau Approved/triển khai.

## Configuration

No configuration change.

## Verification

- Commands run and their results: kiểm tra sự hiện diện file, liên kết nội bộ và khoảng trắng Markdown sau khi khôi phục.
- Not verified: không chạy lint/typecheck/test/build, runtime hay migration vì chỉ soạn tài liệu.

## Remaining

- Not done: review/Approved hai spec, giải quyết Câu hỏi mở, hoà giải CRUD ID-004 và triển khai riêng.
- Risks: quyền `user:read`/`user:delete`, phân trang, khớp tên, User thiếu Profile, uniqueness khi xoá mềm và token/phiên cũ chưa chốt. Tài liệu ID-004 `student-provisioning` ngoài phạm vi khôi phục này hiện thiếu trong worktree.
