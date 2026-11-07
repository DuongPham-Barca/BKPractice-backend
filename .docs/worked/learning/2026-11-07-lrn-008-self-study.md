# 2026-11-07 — Learning tự học do ADMIN quản lý

- Author: Codex
- Scope: Learning Problem, Test Case, Course; Identity RBAC; API Gateway; tài liệu và migration.

## Spec and plan

- Spec: [LRN-008](../../specs/02-learning/self-study/spec.md)
- Plan: [LRN-008 plan](../../specs/02-learning/self-study/plan.md)
- Tasks: [LRN-008 tasks](../../specs/02-learning/self-study/tasks.md)
- Spec status at start: Approved theo quyết định trực tiếp của chủ sở hữu ngày 2026-11-07.

## Questions clarified

| Question                                                     | Conclusion                                                                        | Source                                                        |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Các ADMIN có quản lý Problem/Course do ADMIN khác tạo không? | Có, nếu có mã quyền tương ứng. `created_by` chỉ dùng để truy vết.                 | Chủ sở hữu xác nhận trong phiên làm việc; LRN-008-FR-001/002. |
| Gợi ý xét Course nào?                                        | Mọi Course công khai (`PUBLISHED`, chưa xoá mềm).                                 | Chủ sở hữu xác nhận trong phiên làm việc; LRN-008-FR-006.     |
| Vai trò `LECTURER` của Identity có bị xoá không?             | Phạm vi thay đổi là Learning; Identity vẫn giữ vai trò nền tảng cho phạm vi khác. | Yêu cầu bỏ teacher trong Learning; LRN-008 ngoài phạm vi.     |

## What was done

Learning chuyển chính sách quản lý Problem, Test Case và Course sang `ADMIN` cộng mã quyền tương ứng. Use case, port và TypeORM repository không còn lọc theo người tạo khi đọc danh sách quản lý, sửa, xoá hoặc khôi phục. Một ADMIN có thể gắn Problem do ADMIN khác tạo vào Course theo trạng thái cho phép; `created_by` vẫn được ghi khi tạo nội dung.

Class, Enrollment và Assignment được bỏ khỏi danh sách entity và luồng xử lý Learning. Course không còn kiểm tra tham chiếu Class/Assignment khi xoá. Migration Learning mới gỡ các bảng cũ; migration lịch sử được giữ nguyên. API Gateway ngừng chuyển tiếp các route Class/Assignment và tiến độ theo lớp, giữ route tiến độ cá nhân và gợi ý. Danh mục quyền Identity gán `problem:*`/`course:*` cho ADMIN, không còn cấp `class:*`/`assignment:*`; migration Identity chuyển dữ liệu quyền đã seed. Tài liệu Learning, Gateway, Identity và kiến trúc được đánh dấu phạm vi mới LRN-008 để các mô tả cũ không còn là yêu cầu hiện hành.

## Why these choices

Learning giữ use case/domain/port/adapter như kiến trúc DDD + Hexagonal hiện có. Bỏ điều kiện sở hữu ở cả policy và truy vấn persistence để ADMIN quản lý chéo nhất quán, không chỉ qua một endpoint. Gateway chỉ thay allowlist route vì nghiệp vụ vẫn thuộc Learning. Identity giữ mô hình role/permission và thêm migration dữ liệu để token mới không giữ quyền cũ sau khi nâng cấp. Migration Learning mới xử lý schema đã triển khai mà không sửa lịch sử migration.

## How the feature works

1. Client gửi request quản lý Problem/Course qua Gateway; Gateway xác thực và chuyển principal đã xác minh sang Learning.
2. Controller gọi use case. Authorization yêu cầu role `ADMIN` cùng mã quyền của thao tác; không đối chiếu `created_by`.
3. Repository đọc hoặc ghi nội dung theo ID/trạng thái. Danh sách quản lý gồm nội dung của mọi ADMIN; khi tạo mới, `created_by` là ID người gọi.
4. Người học đọc nội dung công khai như trước. Consumer `submission.accepted` tiếp tục ghi tiến độ Problem cá nhân. Hợp đồng gợi ý tương lai xét mọi Course công khai và tiến độ của chính người gọi.
5. Request Class/Assignment hoặc tiến độ lớp không khớp allowlist Gateway và không được chuyển tới Learning. Người thiếu ADMIN hoặc thiếu quyền tương ứng nhận `403` ở đường quản lý.

## Configuration

No configuration change.

## Verification

- `pnpm build`: qua cả sáu service.
- Test tập trung Learning Problem/Course và Identity permission catalog: 58 suite, 509 test qua; 5 suite/48 test PostgreSQL bị bỏ qua vì thiếu `TEST_DATABASE_URL`.
- Test Gateway và Identity RBAC: 6 suite, 171 test qua; 1 suite/5 test bị bỏ qua.
- `pnpm test --silent`: 130 suite/1026 test qua, 12 suite/78 test bị bỏ qua; 1 suite `test/account-import.integration.spec.ts` không biên dịch do tham chiếu `officialName` không có trong kiểu hiện hành, ngoài phạm vi LRN-008.
- `pnpm typecheck` và `pnpm lint`: lỗi chỉ còn ở cùng test `account-import.integration.spec.ts` của Identity. `git diff --check` qua; `codegraph sync .` hoàn tất.
- `pnpm format:check`: chưa qua vì 94 file chưa theo Prettier trên toàn repo; các file source thay đổi trong đợt này đã được format.
- Not verified: Chưa chạy hai migration hoặc test TypeORM tích hợp trên PostgreSQL cách ly; không có `TEST_DATABASE_URL`.

## Remaining

- Not done: LRN-006 vẫn thiếu API đọc tiến độ cá nhân đầy đủ; LRN-007 chưa có module tính gợi ý. LRN-008 chỉ cập nhật hợp đồng và giữ các route dự kiến, không xây mới hai tính năng này.
- Risks: Migration Learning xoá dữ liệu Class, Enrollment và Assignment vĩnh viễn khi chạy. Cần sao lưu, kiểm tra dữ liệu và chạy thử trên CSDL cách ly trước khi triển khai. Migration Identity phải được áp dụng trước khi seed lại quyền theo danh mục mới.
