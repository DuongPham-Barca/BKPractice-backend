# ID-003 / 3 — Danh mục quyền, quyền hiệu lực và Gateway

- Nguồn: [ID-003 0.4](../../../../specs/01-identity/rbac/spec.md#bản-sửa-đổi-04--truyền-quyền-hiệu-lực), [plan bổ sung](../../../../specs/01-identity/rbac/plan.md#bổ-sung-cho-bản-sửa-đổi-04), [tasks](../../../../specs/01-identity/rbac/tasks.md#bản-sửa-đổi-04--truyền-quyền-hiệu-lực), [ID-001 1.1](../../../../specs/01-identity/authentication/spec.md#bản-sửa-đổi-11--claim-quyền).
- Task: ID-003-T045–T050; phối hợp ID-001-T045–T047 ở [Auth claim](../auth/05-permission-claim.md).

## Trình tự thực hiện

1. Chính sách `PermissionCode` kiểm tra `resource:action`, chữ thường, tối đa 64 ký tự. `EffectivePermissions` hợp quyền từ mọi role, bỏ trùng và sắp xếp; test role đơn/nhiều role và tập rỗng.
2. `EffectivePermissionReader.readForUser(userId)` là port của RBAC; adapter TypeORM đọc `user_roles → role_permissions → permissions` trong `bkpractice_identity`, export qua module cho Auth. Không cho service khác đọc trực tiếp database Identity.
3. Migration Identity **mới** `<timestamp>-Id003PermissionCatalog.ts` chèn tám mã `problem:create`, `problem:read-managed`, `problem:update`, `problem:publish`, `problem:hold`, `problem:republish`, `problem:delete`, `problem:restore`; chỉ gán cho `LECTURER`. Up bỏ qua dòng đã có; down chỉ gỡ các dòng do migration đưa vào theo plan. Test run/revert/run trên database cách ly. `ADMIN` và `STUDENT` không được gán quyền `problem:*` ở migration này.
4. Sau khi Auth thêm claim `permissions`, Gateway xoá `x-auth-permissions` do client gửi trước khi xác minh và đặt lại từ mảng claim đã kiểm chứng; thiếu/sai kiểu thì chuỗi rỗng. Service tiêu thụ coi token cũ thiếu claim là không có quyền và tiếp tục kiểm tra sở hữu tài nguyên.
5. Tích hợp Auth reader khi phát hành token mới và E2E độ tươi: token cũ giữ ảnh chụp, token mới sau khi gán `LECTURER` mang quyền mới. Đối chiếu FR-017–FR-023, SR-010–SR-011, AC-017–AC-022.

## Ranh giới

Phần “Migration: N/A” trong plan RBAC ban đầu chỉ nói về schema role management; mục bổ sung 0.4 yêu cầu migration **dữ liệu permission**. Không seed danh mục quyền cho các tính năng chưa Approved, không thêm CRUD quyền, endpoint tra cứu quyền hay thu hồi access token tức thời.
