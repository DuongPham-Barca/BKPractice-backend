# ID-005 Công việc tìm kiếm hồ sơ công khai

Đặc tả: [spec.md](./spec.md) (Proposed 0.1)  
Kế hoạch: [plan.md](./plan.md) (bản nháp, chưa được review)

Chưa triển khai code. Không tích ô nào trước khi spec Approved và câu hỏi mở được giải quyết.

## Chuẩn bị

- [ ] Chốt quyền search, quy tắc khớp tên, ngưỡng `q`, phân trang và hành vi User chưa có Profile.
- [ ] Review/Approved spec; xác nhận plan/tasks bám spec và kiến trúc Identity.
- [ ] Kiểm tra git status, code Profile/Gateway và dữ liệu/migration hiện có.

## Triển khai

- [ ] Thêm use case và port truy vấn trong `profiles`; giữ route chi tiết ID-002.
- [ ] Thêm truy vấn TypeORM có giới hạn, thứ tự ổn định, lọc User không công khai; đánh giá index.
- [ ] Thêm DTO/controller `GET /api/profiles/search`, projection công khai và ký avatar theo ID-002.
- [ ] Kiểm tra Gateway, xác thực và Swagger theo quyền đã chốt.

## Xác minh và bàn giao

- [ ] Test unit/integration cho FR-001–FR-006, AC-001–AC-006, gồm dữ liệu nhạy cảm, trạng thái và phân trang.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`); đối chiếu kiến trúc/Out of Scope.
- [ ] Cập nhật tài liệu FE/API, checklist và worked entry; chuyển trạng thái qua review SDD có thẩm quyền.
