# 2026-10-19 — Chia kế hoạch triển khai Identity theo phần việc

- Author: Codex
- Scope: Tài liệu kế hoạch cho Identity Authentication, Profile và RBAC; không triển khai mã nguồn.

## Spec and plan

- Spec: [ID-001 Authentication 1.1](../../specs/01-identity/authentication/spec.md), [ID-002 Profile 0.4](../../specs/01-identity/profile/spec.md), [ID-003 RBAC 0.4](../../specs/01-identity/rbac/spec.md).
- Plan: Các `plan.md` đã Approved của [Authentication](../../specs/01-identity/authentication/plan.md), [Profile](../../specs/01-identity/profile/plan.md), [RBAC](../../specs/01-identity/rbac/plan.md); kết quả phân rã bắt đầu tại [Identity plan index](../../pm/plan/identity/README.md).
- Tasks: Checklist hiện có của [Authentication](../../specs/01-identity/authentication/tasks.md), [Profile](../../specs/01-identity/profile/tasks.md), [RBAC](../../specs/01-identity/rbac/tasks.md).
- Spec status at start: Cả ba spec là `Approved`.

## Questions clarified

| Question                                                                  | Conclusion                                                                                                                                | Source                                                                                    |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Tài liệu kế hoạch mới đặt ở đâu?                                          | Theo module code: `identity/auth`, `identity/profiles`, `identity/rbac`; một index Identity chỉ dẫn đường, không gộp kế hoạch các module. | `docs/agent/working-agreement.md` mục Documentation by module; `docs/pm/plan/README.md`   |
| Tài liệu nào quyết định hành vi?                                          | Kiến trúc và spec Approved có ưu tiên cao nhất; các kế hoạch nhỏ chỉ phân rã plan/tasks hiện có.                                          | `docs/agent/working-agreement.md` mục Sources of truth                                    |
| Bản sửa đổi quyền có cần migration dù phần RBAC cũ ghi N/A?               | Có: bổ sung RBAC 0.4 yêu cầu migration dữ liệu tám quyền `problem:*`; phần N/A cũ chỉ áp dụng cho schema role management ban đầu.         | `specs/01-identity/rbac/spec.md` FR-017–FR-018; `plan.md` mục Bổ sung cho bản sửa đổi 0.4 |
| Có thay đổi code, cấu hình hoặc chạy migration trong công việc này không? | Không. Người dùng yêu cầu viết kế hoạch vào `docs/pm/plan`; các việc triển khai và kiểm chứng runtime vẫn nằm trong checklist tương ứng.  | Yêu cầu người dùng; `docs/agent/working-agreement.md` mục Documentation-only work         |

## What was done

Đã thêm một index Identity và 13 kế hoạch nhỏ dưới `docs/pm/plan/identity/`: sáu phần cho Authentication, ba phần cho Profile, bốn phần cho RBAC. Mỗi tài liệu nêu nguồn Approved, task ID, điều kiện đầu vào, trình tự thực hiện, ranh giới và cách kiểm chứng. `docs/pm/plan/README.md` được nối tới index để người triển khai tìm được toàn bộ chuỗi. Các spec/plan/tasks gốc không bị thay đổi và chưa task nào được đánh dấu hoàn thành.

## Why these choices

Authentication được tách theo các luồng nền tảng, phiên sinh viên, Microsoft, HTTP/Gateway, claim quyền và xác minh vì chúng có phụ thuộc và phép kiểm thử khác nhau. Profile tách model/lưu trữ, avatar/use case, API/kiểm chứng để giữ riêng ranh giới R2. RBAC tách chính sách/gán vai trò khỏi API quản lý và bản bổ sung quyền 0.4; nhờ vậy migration permission không bị nhầm với kết luận không cần migration schema của bản ban đầu. Thư mục theo module và liên kết task giữ nguyên quy ước feature-first của kiến trúc Identity.

## How the feature works

Đây là thay đổi tài liệu, không phải tính năng sản phẩm. Người triển khai bắt đầu ở index, chọn một phần việc, đọc spec/plan/tasks gốc được liên kết, kiểm tra lại các điều kiện tiên quyết, rồi thực hiện các task theo thứ tự phụ thuộc. Khi Auth và RBAC cần cùng quyền hiệu lực, index chỉ rõ điểm nối reader, claim và header Gateway. Mỗi phần có điều kiện kiểm chứng; nếu điều kiện tiên quyết thực tế thiếu hoặc một contract mâu thuẫn, người triển khai phải giải quyết theo working agreement trước khi sửa code. Người dùng cuối chưa thấy hành vi API nào thay đổi từ công việc tài liệu này.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `pnpm exec prettier --check` pass cho 16 file Markdown; `git diff --check` pass; kiểm tra 16 file thấy 0 link cục bộ bị hỏng; đối chiếu dòng `Task:` thấy đủ ID-001-T001–T047, ID-002-T001–T042 và ID-003-T001–T050. `git status --short` xác nhận chỉ có tài liệu vừa thêm/sửa cùng thay đổi `.husky/_/.gitignore` đã tồn tại trước công việc này.
- Not verified: Không chạy lint/typecheck/test/build, migration, Docker hoặc smoke test, vì không sửa code/runtime.

## Remaining

- Not done: Chưa triển khai bất kỳ task nào của ID-001, ID-002 hay ID-003; các kế hoạch nhỏ không thay thế việc review spec/plan/tasks trước khi triển khai.
- Risks: Tích hợp claim quyền phụ thuộc reader RBAC và Auth; Profile phụ thuộc tên chính thức từ luồng cấp tài khoản; Microsoft/R2 cần cấu hình và môi trường kiểm thử thật ở giai đoạn triển khai.
