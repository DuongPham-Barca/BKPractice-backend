# ID-005 Công việc tìm kiếm hồ sơ công khai

Đặc tả: [spec.md](./spec.md) (Approved 1.1)

Kế hoạch: [plan.md](./plan.md) (đã review)

Đã triển khai ID-005; các kiểm tra chưa chạy được vẫn giữ mở bên dưới.

## Chuẩn bị

- [x] Chốt quyền search, quy tắc khớp tên, ngưỡng `q` 1–100 ký tự, phân trang và hành vi User chưa có Profile trong spec 1.1.
- [x] Chủ sở hữu cập nhật và Approved spec 1.1 ngày 2026-10-28.
- [x] Kiểm tra git status, code Profile/Gateway và dữ liệu/migration hiện có.

## Triển khai

- [x] Thêm use case và port truy vấn trong `profiles`; giữ route chi tiết ID-002.
- [x] Thêm truy vấn TypeORM có giới hạn, thứ tự ổn định, lọc User không công khai; đánh giá index. Không thêm index khi chưa có kế hoạch truy vấn PostgreSQL để đo.
- [x] Thêm DTO/controller `GET /api/profiles/search`, projection công khai và ký avatar theo ID-002; chấp nhận `q` một ký tự.
- [x] Kiểm tra Gateway, xác thực và Swagger theo quyền đã chốt.

## Xác minh và bàn giao

- [ ] Test unit/integration cho FR-001–FR-006, AC-001–AC-006, gồm dữ liệu nhạy cảm, trạng thái và phân trang. Test `q` một ký tự, unit và HTTP/Gateway pass; bài PostgreSQL được thêm nhưng bị skip vì chưa có `PROFILE_TEST_DATABASE_URL` trỏ vào DB test cô lập.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`); đối chiếu kiến trúc/Out of Scope. `pnpm test` pass; build Identity/Gateway pass; `lint`, `typecheck`, `build` toàn repo bị chặn bởi dòng `heheh` đã có trong `apps/learning-service/src/database/data-source.ts:14`. `lint` khi bỏ qua file đó pass.
- [ ] Cập nhật tài liệu FE/API, checklist và worked entry; chuyển trạng thái qua review SDD có thẩm quyền. Tài liệu FE/API và worked entry đã cập nhật; chưa chuyển trạng thái khi các gate trên còn mở.
