# ID-007 Công việc đặt lại mật khẩu BKPractice bằng OTP

Đặc tả: [spec.md](./spec.md) (Proposed 0.1)  
Kế hoạch: [plan.md](./plan.md) (bản nháp)

Chưa triển khai code. Không tích ô nào trước khi spec Approved và câu hỏi mở được giải quyết.

## Chuẩn bị

- [ ] Chốt mailbox/quyền Graph, đối tượng reset, OTP/grant TTL/lượt thử/gửi lại, password policy và phiên cũ.
- [ ] Review/Approved ID-007; đối chiếu ID-001, ID-004, ID-006, kiến trúc Identity/plan/tasks.
- [ ] Kiểm tra git status, Auth/Gateway, schema credential/phiên, Redis và template cấu hình.

## Triển khai

- [ ] Thêm domain/application và ba use case send/verify/reset, ports thực sự cần.
- [ ] Thêm Redis adapter lưu OTP/grant hash có TTL, đếm thử/tiêu thụ nguyên tử.
- [ ] Thêm Microsoft Graph mail adapter với quyền/phạm vi duyệt và xử lý lỗi an toàn.
- [ ] Thêm Argon2 hash update/thu hồi phiên theo transaction/chính sách; không đổi password Microsoft.
- [ ] Thêm DTO/controller ba public route, Gateway allowlist/throttling/Origin, Swagger và `.env.example` sau chốt cấu hình.

## Xác minh và bàn giao

- [ ] Test unit/integration/API FR-001–FR-010, AC-001–AC-007: dò account, replay/race, lỗi Graph/Redis/DB, login cũ/mới/phiên cũ.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`), đối chiếu kiến trúc/Out of Scope; smoke Graph staging nếu được cấp.
- [ ] Cập nhật FE/API docs, checklist/worked entry; chuyển trạng thái qua review SDD có thẩm quyền.
