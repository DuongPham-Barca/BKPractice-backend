# ID-007 Công việc đặt lại mật khẩu BKPractice bằng OTP

Đặc tả: [spec.md](./spec.md) (bản sửa đổi 1.1 Proposed; 1.0 đã Approved)

Kế hoạch: [plan.md](./plan.md) (bản sửa đổi 1.1 chờ review)

Code hiện tại dùng Redis theo 1.0. Các ô đã hoàn thành dưới đây ghi lại phần việc cũ; mọi mục chuyển sang PostgreSQL của 1.1 giữ mở cho đến khi được phê duyệt, triển khai và kiểm chứng.

## Chuẩn bị

- [x] Chốt đối tượng reset, OTP/grant TTL/lượt thử/gửi lại, password policy và phiên cũ trong spec 1.0.
- [x] Chủ sở hữu Approved spec 1.0 và review plan/tasks ngày 2026-10-28.
- [ ] Review/phê duyệt spec 1.1 và plan/tasks chuyển kho reset sang PostgreSQL trước khi thay code.
- [ ] Xác nhận mailbox Microsoft 365 và quyền Graph `Mail.Send` giới hạn tới mailbox gửi; đối chiếu bản sao ID-004 đã có trước khi thay code.
- [x] Kiểm tra git status, Auth/Gateway, schema credential/phiên, Redis và template cấu hình. Bản sao ID-004 đã có tại `.docs/specs/01-identity/student-provisioning/`; mailbox/quyền thực tế vẫn chờ kiểm chứng trên tenant.

## Triển khai

- [x] Thêm domain/application và ba use case send/verify/reset, ports thực sự cần.
- [x] Đã thêm Redis adapter lưu OTP/grant hash theo 1.0; adapter này còn trong code, sẽ được thay sau khi 1.1 Approved.
- [ ] Tạo TypeORM migration và entity challenge/grant thuộc Identity; đăng ký trong datasource, khoá/unique/index và cách dọn bản ghi hết hạn, không lưu OTP/resetToken thô.
- [ ] Thay Redis adapter reset bằng TypeORM: HMAC OTP, hạn 5 phút, 5 lần sai, cooldown 60 giây, gửi lại vô hiệu OTP cũ; verify và cấp grant nguyên tử bằng transaction/khóa hàng.
- [ ] Sửa port/use case/repository và AuthModule để tiêu thụ grant cùng transaction cập nhật Argon2 hash và thu hồi phiên; xử lý đồng thời/rollback; giữ Redis OAuth/Gateway nguyên trạng.
- [x] Thêm Microsoft Graph mail adapter dùng app credential, mailbox cấu hình và xử lý lỗi an toàn; quyền tenant cần smoke test.
- [x] Thêm Argon2 hash update/thu hồi phiên theo transaction/chính sách; không đổi password Microsoft.
- [x] Thêm DTO/controller ba public route, Gateway allowlist/throttling/Origin, Swagger và `.env.example`.

## Xác minh và bàn giao

- [ ] Test unit/integration/API FR-001–FR-011, AC-001–AC-009: migration PostgreSQL, TTL/cooldown/lượt sai, replay/race, rollback, dò account, lỗi Graph/DB, login cũ/mới/phiên cũ; smoke ba route trực tiếp tại Identity khi Redis không kết nối.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`), đối chiếu kiến trúc/Out of Scope; smoke Graph staging nếu được cấp.
- [ ] Cập nhật FE/API docs, checklist/worked entry; chuyển trạng thái qua review SDD có thẩm quyền.

Theo 1.0 đã có test unit use case, Graph adapter, transaction và Gateway; `pnpm test` từng pass. Bản sửa đổi 1.1 chỉ là tài liệu: chưa có migration, entity, adapter PostgreSQL hoặc kiểm thử mới. Integration PostgreSQL và Graph staging chưa được xác minh. Các pnpm gates cũ của toàn repo từng bị chặn bởi dòng `heheh` tại `apps/learning-service/src/database/data-source.ts:14` trong HEAD; cần chạy lại khi triển khai 1.1. FE nằm ngoài phạm vi backend.
