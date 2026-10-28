# ID-006 Công việc xem và xoá mềm User

Đặc tả: [spec.md](./spec.md) (Proposed 0.1)  
Kế hoạch: [plan.md](./plan.md) (bản nháp)

Chưa triển khai code. Không tích ô nào trước khi spec Approved và câu hỏi mở được giải quyết.

## Chuẩn bị

- [ ] Chốt quyền, projection, phân trang, uniqueness/import lại, phiên/token cũ và xoá Admin/system.
- [ ] Hoà giải phần CRUD Proposed ID-004; review/Approved ID-006 và quyền mới ID-003 nếu có.
- [ ] Kiểm tra git status, schema/migration, query User/Auth/Profile/Gateway và kiến trúc Identity.

## Triển khai

- [ ] Thêm chính sách domain/application đọc User/xoá mềm, bảo vệ Admin cuối cùng.
- [ ] Thêm migration TypeORM và repository transaction/truy vấn phân trang Identity.
- [ ] Thêm ba route `/api/admin/users`, DTO allowlist, guard và Swagger.
- [ ] Cập nhật Auth, Microsoft matching, refresh, Profile/search và import theo chính sách User đã xoá.
- [ ] Cập nhật RBAC catalog/seed và Gateway cookie/CSRF nếu contract yêu cầu.

## Xác minh và bàn giao

- [ ] Test unit/integration/API cho FR-001–FR-010, AC-001–AC-007, gồm bảo mật, đồng thời, migration và dữ liệu xuyên service.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`); đối chiếu Out of Scope/kiến trúc.
- [ ] Cập nhật tài liệu FE/API, checklist/worked entry; chuyển trạng thái qua review SDD có thẩm quyền.
