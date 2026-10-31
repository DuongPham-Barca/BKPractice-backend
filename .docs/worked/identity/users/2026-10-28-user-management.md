# 2026-10-28 — ID-006 xem và xoá mềm User

- Author: Codex
- Scope: Identity `modules/users`, Auth/Profile/RBAC liên quan, Gateway proxy và tài liệu ID-004.

## Spec and plan

- Spec: [ID-006 Approved 1.0](../../../specs/01-identity/user-management/spec.md)
- Plan: [ID-006 plan](../../../specs/01-identity/user-management/plan.md)
- Tasks: [ID-006 tasks](../../../specs/01-identity/user-management/tasks.md)
- Spec status at start: Approved 1.0. Bản sao [ID-004 import](../../../specs/01-identity/student-provisioning/spec.md) thiếu trong worktree đã được tái dựng theo yêu cầu chủ sở hữu từ tài liệu Auth/RBAC và code; không phải bản gốc nguyên văn.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| ID-004 import dùng contract nào? | Giữ `POST /api/auth/accounts/import`, `.xlsx` với `mssv,name,email,role`, chỉ STUDENT/LECTURER và transaction tạo User/Profile/role; User đã xoá vẫn chiếm email/MSSV. | [Bản tái dựng ID-004](../../../specs/01-identity/student-provisioning/spec.md), [ID-006](../../../specs/01-identity/user-management/spec.md) FR-007 và quy tắc uniqueness. |
| User đã xoá có đổi enum status không? | Không; `deletedAt` tách khỏi ACTIVE/LOCKED/PENDING, giữ dữ liệu/tham chiếu. | [ID-006](../../../specs/01-identity/user-management/spec.md), FR-004/FR-007. |
| Quyền nào và ai được xoá? | Đọc cần ADMIN + `user:read`; xoá cần ADMIN + `user:delete`; từ chối xoá mọi Admin và tài khoản hệ thống. | [ID-006](../../../specs/01-identity/user-management/spec.md), FR-008/FR-010. |
| Cách chặn token trong lúc xoá? | Khóa hàng User khi tạo/rotate phiên, kiểm tra `deletedAt`; thao tác xoá khóa User rồi đánh dấu và thu hồi sessions/refresh tokens cùng transaction Identity. | [ID-006 plan](../../../specs/01-identity/user-management/plan.md), xử lý đồng thời; Auth session repository hiện có. |
| Cần sửa service khác hoặc cấu hình runtime? | Không; Gateway chỉ chuyển tiếp, Identity giữ User/phiên. Cần áp dụng migration và chạy seed RBAC đã có trước khi dùng API trên DB thật. | [ID-006](../../../specs/01-identity/user-management/spec.md), Ngoài phạm vi; [kiến trúc Identity](../../../architecture/identity-service.md). |

## What was done

Tái dựng `student-provisioning/spec.md`, `plan.md`, `tasks.md` để khôi phục nguồn đối chiếu import. Thêm migration `users.deleted_at`, entity và module `users` với use case, repository, controller, DTO allowlist và lọc lỗi cho ba route quản trị. Repository đọc trang/chi tiết và xoá mềm trong transaction; xoá không đụng Profile, role hoặc service khác. RBAC catalog thêm `user:read`/`user:delete` chỉ cho ADMIN. Auth lookup, Microsoft matching, tạo/rotate phiên và Profile public/search loại User đã xoá. Gateway chuyển `/api/admin/users` về Identity. Thêm unit, HTTP/Gateway và bài PostgreSQL có điều kiện; ghi [contract FE/API](../../../pm/plan/identity/users/01-user-management-api.md).

## Why these choices

User và phiên cùng nằm trong Identity nên transaction xoá và thu hồi phiên ở TypeORM adapter Identity, không cần message hay DB xuyên service. Use case giữ kiểm tra role/quyền; controller chỉ xử lý HTTP và principal đã xác minh. Projection được dựng bằng allowlist thay vì trả User entity, tránh lộ hash/secret. Dấu xoá riêng giữ enum trạng thái và uniqueness cũ. Migration down từ chối chạy khi đã có User xoá để không vô tình kích hoạt lại tài khoản.

## How the feature works

1. ADMIN gọi route `/api/admin/users` với access cookie hoặc Bearer. Gateway kiểm tra token/phiên, kiểm tra CSRF cho DELETE bằng cookie rồi chuyển đến Identity.
2. Identity xác minh lại phiên; use case yêu cầu role ADMIN cùng quyền `user:read` hoặc `user:delete`. Query page/limit/includeDeleted và UUID được kiểm tra ở HTTP/use case.
3. Đọc danh sách lấy tối đa `limit + 1` User để tính `hasMore`, sắp theo `createdAt`/`userId` giảm dần; mặc định bỏ User có `deletedAt`. Chi tiết đọc theo ID kể cả đã xoá. Cả hai trả đúng tám trường được duyệt.
4. DELETE khóa hàng User, chặn Admin/system, đặt `deletedAt` một lần rồi revoke mọi session/refresh token trong cùng transaction; lặp lại trả `204`.
5. Auth lookup và Microsoft exchange không tìm User đã xoá. Tạo/rotate phiên khóa User để không cấp phiên mới trong cuộc đua với DELETE; session cũ đã revoke nên Gateway từ chối. Profile công khai/search không hiện User đã xoá.
6. Thiếu token trả `401`, thiếu role/quyền hoặc xoá Admin/system `403`, input sai `400`, User không tồn tại `404`; lỗi không trả credential hay dữ liệu nội bộ.

## Configuration

- `apps/identity-service/src/modules/users/infrastructure/persistence/user-management.repository.integration.spec.ts`: `USER_MANAGEMENT_TEST_DATABASE_URL` chỉ dùng cho bài PostgreSQL; test chỉ chạy với DB cô lập `127.0.0.1:55432/bkpractice_user_management_test_v06`.
- Không đổi cấu hình runtime hoặc secret.

## Verification

- Commands run and their results: `pnpm test` pass (36 suites, 157 tests; 7 suites skip theo điều kiện môi trường); `pnpm build:identity`, `pnpm build:gateway` pass; `pnpm lint --ignore-pattern apps/learning-service/src/database/data-source.ts` pass. Test mới kiểm tra quyền, HTTP/CSRF, Swagger, session guard và migration guard.
- Not verified: Bài PostgreSQL ID-006 chưa chạy vì không có DB test cô lập. Chưa chạy migration hoặc seed RBAC trên DB triển khai. `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo thất bại tại dòng `heheh` có sẵn trong `apps/learning-service/src/database/data-source.ts:14`, ngoài phạm vi ID-006.

## Remaining

- Not done: Áp dụng migration và seed RBAC trên môi trường đích theo quy trình triển khai; chạy PostgreSQL integration/concurrency test và các gate toàn repo sau khi có DB test và sửa lỗi nền Learning; review SDD có thẩm quyền trước khi đổi trạng thái spec.
- Risks: Transaction/concurrency và query pagination mới chưa được chạy với PostgreSQL thực; trước migration/seed, API quản trị chưa dùng được trên DB thật. Bản ID-004 là bản tái dựng có nguồn, không phải bản gốc nguyên văn.
