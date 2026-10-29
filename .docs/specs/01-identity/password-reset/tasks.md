# ID-007 Công việc đặt lại mật khẩu BKPractice bằng OTP

Đặc tả: [spec.md](./spec.md) (bản sửa đổi 1.4 Approved; bản 1.1 là nền PostgreSQL)

Kế hoạch: [plan.md](./plan.md) (bản sửa đổi 1.4 được chủ sở hữu review qua chỉ đạo đổi tên hiển thị)

Trước bản sửa đổi này, code reset dùng PostgreSQL theo 1.1 và Microsoft Graph để gửi mail; 1.3 đã chuyển mail adapter sang Brevo API HTTPS. Gmail SMTP 1.2 dừng trước khi triển khai. Migration và tích hợp PostgreSQL thật chưa được chạy. Các ô hoàn thành bên dưới ghi lại phần việc cũ, không có nghĩa 1.3 đã hoàn thành.

## Bản sửa đổi 1.3 — Brevo

- [x] Chủ sở hữu chọn Brevo làm kênh gửi OTP, Approved spec 1.3 và review plan/tasks ngày 2026-10-29.
- [x] Thay Graph mail adapter dành riêng cho reset bằng Brevo API HTTPS và timeout hữu hạn, giữ port `PasswordResetMailer` và response `202` chống dò account; không sửa Microsoft OAuth của ID-001.
- [x] Cập nhật `.env.example`/validation cho `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`; bỏ `MICROSOFT_MAIL_SENDER` của reset sau khi chuyển; giữ các biến Microsoft dùng cho OAuth.
- [x] Test adapter với `fetch` giả cho gửi thành công/lỗi, kiểm tra redaction và status public; chạy test toàn repo (184 pass, 38 skip), typecheck/lint scoped và build Identity.
- [ ] Tạo API key, xác minh sender trong Brevo và smoke email thật tới email trường, kiểm tra Inbox/Junk/trạng thái giao thư. Không ghi API key vào Git/log.
- [ ] Các gate lint/typecheck/build toàn repo còn bị chặn bởi `heheh` trong Learning Service; tích hợp PostgreSQL từ 1.1 còn chờ DB test cách ly.
- [x] Viết worked entry triển khai 1.3; không đánh dấu Verified khi tích hợp PostgreSQL và giao thư thật còn thiếu.

## Bản sửa đổi 1.4 — Tên hiển thị người gửi

- [x] Chủ sở hữu yêu cầu đổi tên hiển thị để không hiện tên cá nhân; spec/plan được cập nhật.
- [x] Thêm `BREVO_SENDER_NAME` có mặc định `BKPractice`, dùng cho `sender.name`; giữ email gửi đã xác minh riêng.
- [x] Test giá trị tên cấu hình trong payload, mặc định và cấu hình rỗng; 12 test liên quan, typecheck/lint scoped và build Identity pass.
- [x] Viết worked entry và ghi rõ giới hạn: tên hiển thị không che địa chỉ gửi.

## Công việc 1.1 còn mở và lịch sử triển khai

## Chuẩn bị

- [x] Chốt đối tượng reset, OTP/grant TTL/lượt thử/gửi lại, password policy và phiên cũ trong spec 1.0.
- [x] Chủ sở hữu Approved spec 1.0 và review plan/tasks ngày 2026-10-28.
- [x] Chủ sở hữu chỉ đạo triển khai theo spec 1.1 và plan/tasks chuyển kho reset sang PostgreSQL ngày 2026-10-29.
- [x] N/A: quyền Graph `Mail.Send` của bản 1.1 không còn áp dụng vì bản 1.3 gửi qua Brevo; bản sao ID-004 đã được đối chiếu.
- [x] Kiểm tra git status, Auth/Gateway, schema credential/phiên, Redis và template cấu hình. Bản sao ID-004 đã có tại `.docs/specs/01-identity/student-provisioning/`; mailbox/quyền thực tế vẫn chờ kiểm chứng trên tenant.

## Triển khai

- [x] Thêm domain/application và ba use case send/verify/reset, ports thực sự cần.
- [x] Redis adapter của reset theo 1.0 đã được gỡ khỏi wiring và source; Redis OAuth/Gateway giữ nguyên.
- [ ] Tạo TypeORM migration và entity challenge/grant thuộc Identity; đăng ký trong datasource, khoá/unique/index và cách dọn bản ghi hết hạn, không lưu OTP/resetToken thô. Code đã viết, chờ chạy migration trên DB test cách ly.
- [ ] Thay Redis adapter reset bằng TypeORM: HMAC OTP, hạn 5 phút, 5 lần sai, cooldown 60 giây, gửi lại vô hiệu OTP cũ; verify và cấp grant nguyên tử bằng transaction/khóa hàng. Unit pass; integration PostgreSQL chờ DB test.
- [ ] Sửa port/use case/repository và AuthModule để tiêu thụ grant cùng transaction cập nhật Argon2 hash và thu hồi phiên; xử lý đồng thời/rollback; giữ Redis OAuth/Gateway nguyên trạng. Code/build/unit pass; race/rollback PostgreSQL chờ DB test.
- [x] Thêm Microsoft Graph mail adapter dùng app credential, mailbox cấu hình và xử lý lỗi an toàn; quyền tenant cần smoke test.
- [x] Thêm Argon2 hash update/thu hồi phiên theo transaction/chính sách; không đổi password Microsoft.
- [x] Thêm DTO/controller ba public route, Gateway allowlist/throttling/Origin, Swagger và `.env.example`.

## Xác minh và bàn giao

- [ ] Test unit/integration/API FR-001–FR-011, AC-001–AC-009: unit/HTTP đã pass; integration migration, TTL/cooldown/lượt sai, replay/race/rollback PostgreSQL và smoke trực tiếp Identity khi Redis không kết nối vẫn chờ DB test.
- [ ] Chạy script pnpm áp dụng (`lint`, `typecheck`, `test`, `build`), đối chiếu kiến trúc/Out of Scope; smoke Brevo khi có cấu hình. `pnpm test` pass (184 tests, 38 skipped); build/typecheck/lint Identity pass. Các gate toàn repo `lint`, `typecheck`, `build` còn lỗi nền `heheh` ở Learning Service.
- [ ] Cập nhật FE/API docs, checklist/worked entry; chuyển trạng thái qua review SDD có thẩm quyền.

Theo 1.1 đã có migration, entity, adapter TypeORM và unit/integration test mới (integration có chốt chỉ chạy với `PASSWORD_RESET_TEST_DATABASE_URL` có tên DB kết thúc `_password_reset_test`). Chưa áp dụng migration trên DB thật. Graph gửi OTP thực tế trả 403; ảnh cấu hình cho thấy `Mail.Send` chưa được tenant trường chấp thuận. Bản 1.3 thay kênh gửi bằng Brevo. `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo từng bị chặn bởi dòng `heheh` tại `apps/learning-service/src/database/data-source.ts:14` trong HEAD; build/typecheck/lint Identity đã pass ở lần kiểm thử trước. FE nằm ngoài phạm vi backend.
