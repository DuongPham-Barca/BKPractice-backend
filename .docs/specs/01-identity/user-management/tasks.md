# ID-006 Công việc xem và xoá mềm User

Đặc tả: [spec.md](./spec.md) (Approved 1.0)

Kế hoạch: [plan.md](./plan.md) (đã review)

Code ID-006 đã được triển khai; các xác minh chưa chạy được giữ mở bên dưới.

## Chuẩn bị

- [x] Chốt quyền, projection, phân trang, uniqueness/import lại, phiên/token cũ và chặn xoá Admin/system trong spec 1.0.
- [x] Chủ sở hữu Approved spec 1.0 và review plan/tasks ngày 2026-10-28; ID-006 thay phần đọc/xoá mềm Proposed của ID-004.
- [x] Tái dựng bản sao ID-004 `student-provisioning` từ contract Auth/RBAC và code hiện có theo yêu cầu chủ sở hữu; ghi rõ không phải bản gốc nguyên văn.
- [x] Kiểm tra git status, schema/migration, query User/Auth/Profile/Gateway và kiến trúc Identity.

## Triển khai

- [x] Thêm chính sách domain/application đọc User/xoá mềm; từ chối xoá mọi Admin và tài khoản hệ thống.
- [x] Thêm migration TypeORM và repository transaction/truy vấn phân trang Identity.
- [x] Thêm ba route `/api/admin/users`, DTO allowlist, xác thực/quyền và Swagger.
- [x] Cập nhật Auth, Microsoft matching, refresh, Profile/search; giữ import và uniqueness của User đã xoá.
- [x] Cập nhật RBAC catalog/seed và Gateway proxy; Gateway/Identity dùng CSRF hiện có cho DELETE bằng cookie.

## Xác minh và bàn giao

- [ ] Test unit/integration/API cho FR-001–FR-010, AC-001–AC-007, gồm bảo mật, đồng thời, migration và dữ liệu xuyên service. Unit/HTTP/Gateway pass; bài PostgreSQL được thêm nhưng skip vì chưa có `USER_MANAGEMENT_TEST_DATABASE_URL` trỏ DB test cô lập. Không chạy migration/seed trên DB thật trong lượt này.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`); đối chiếu Out of Scope/kiến trúc. `pnpm test` pass (157 tests); build Identity/Gateway và lint khi loại file Learning lỗi nền pass. `lint`, `typecheck`, `build` toàn repo bị chặn bởi dòng `heheh` đã có tại `apps/learning-service/src/database/data-source.ts:14`.
- [ ] Cập nhật tài liệu FE/API, checklist/worked entry; chuyển trạng thái qua review SDD có thẩm quyền. Tài liệu FE/API và worked entry đã cập nhật; chưa chuyển trạng thái khi các gate trên còn mở.
