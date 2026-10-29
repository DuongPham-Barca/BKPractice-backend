# 2026-10-29 — Chuyển reset OTP sang PostgreSQL

- Author: Codex
- Scope: ID-007 Identity auth, migration, adapter trạng thái reset và kiểm thử.

## Spec and plan

- Spec: `.docs/specs/01-identity/password-reset/spec.md` v1.1 Approved theo chỉ đạo triển khai của chủ sở hữu ngày 2026-10-29.
- Plan: `.docs/specs/01-identity/password-reset/plan.md` v1.1 đã review.
- Tasks: `.docs/specs/01-identity/password-reset/tasks.md`.
- Spec status at start: bản sửa đổi 1.1 Proposed; yêu cầu triển khai theo bản sửa đổi của người dùng được ghi nhận là phê duyệt trước khi sửa code.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| PostgreSQL thay Redis ở phạm vi nào? | Chỉ OTP, cooldown/lượt thử và grant của ba route reset thuộc Identity. Redis AuthFlow của OAuth và Gateway vẫn giữ. | Spec ID-007 FR-011 và yêu cầu người dùng ngày 2026-10-29. |
| Có giữ fallback hai kho không? | Không. Một kho PostgreSQL cho reset tránh hai nguồn trạng thái không đồng bộ. | Plan ID-007 1.1 mục lưu trữ; yêu cầu chuyển khi Redis riêng chưa kết nối. |
| Contract API và chính sách cũ có thay không? | Không đổi 202/200/204, OTP 6 số/5 phút, 5 lần sai, cooldown 60 giây, grant 5 phút/một lần, Graph và thu hồi phiên. | Spec ID-007 FR-001–FR-010, AC-001–AC-008. |
| Có chạy migration trên DB môi trường người dùng không? | Không. Chưa có URL database test cách ly và chạy migration/seed trên DB thật không phải bước kiểm thử an toàn. | Working agreement mục repository tooling and safety; plan ID-007 1.1 mục kiểm thử. |

## What was done

Thêm migration `AddPasswordResetState1700000000008` và hai entity `PasswordResetChallenge`, `PasswordResetGrant` trong `modules/auth/infrastructure/persistence`, đăng ký với datasource Identity. Thay Redis adapter reset bằng `TypeormPasswordResetRepository`, nối cùng một instance cho port account và store tại `AuthModule`; xóa adapter Redis dành riêng cho reset. Sửa port/use case reset để adapter tiêu thụ grant trong cùng transaction với đổi mật khẩu và thu hồi phiên. Thêm unit test cho HMAC OTP, giới hạn sai, cooldown, hash grant, transaction và lỗi DB; thêm bộ integration test có chốt DB test cách ly cho migration, TTL, race, replay và rollback. Ba controller/API và Graph mail adapter giữ contract hiện có.

## Why these choices

Identity đã sở hữu PostgreSQL của User, credential và phiên, nên giữ grant và cập nhật credential trong một transaction tránh mất grant khi cập nhật DB thất bại. Bảng challenge theo User giữ đúng một OTP hiện hành; bảng grant riêng giữ grant đã cấp độc lập với OTP gửi sau. HMAC email chuẩn hoá cùng OTP dùng secret ngoài DB và SHA-256 của resetToken ngẫu nhiên không lưu mã/token thô. Khóa User trước challenge xử lý hai request gửi đầu tiên; khóa challenge/grant khi verify/reset xử lý dùng một lần. Bản ghi hết hạn bị từ chối theo thời gian khi đọc, còn việc dọn bảng được thử mỗi phút khi có lượt gửi OTP.

## How the feature works

1. Client gọi `send-otp`; Identity kiểm tra bảng reset sẵn sàng trước khi tra email, rồi chỉ User đủ điều kiện mới tạo OTP. Adapter khóa User/challenge, áp cooldown và lưu HMAC cùng thời hạn trong PostgreSQL. Graph gửi mã tới email đã lưu; phản hồi send vẫn là 202 chung.
2. Client gọi `verify-otp`; adapter khóa User/challenge, so HMAC, tăng số lần sai hoặc tiêu thụ OTP và lưu hash grant trong một transaction. Chỉ mã đúng còn hạn được trả resetToken mờ; sai/hết hạn nhận lỗi 400 chung.
3. Client gọi `reset`; adapter khóa grant/User, kiểm tra điều kiện User và mật khẩu mới, băm Argon2, cập nhật mật khẩu, thu hồi session/refresh token và xóa grant trong cùng transaction. Request lặp không tìm thấy grant; lỗi DB rollback toàn bộ và trả lỗi dependency chung.
4. Redis của OAuth/Gateway không tham gia ba thao tác reset trực tiếp tại Identity.

## Configuration

Không đổi biến runtime. Adapter tiếp tục dùng `JWT_REFRESH_SECRET` hiện có làm khóa HMAC; xoay khóa làm OTP chưa hết hạn mất hiệu lực. Integration test chỉ chạy khi có `PASSWORD_RESET_TEST_DATABASE_URL` trỏ tới DB test cách ly có tên kết thúc `_password_reset_test`; không đọc hay ghi giá trị URL vào tài liệu.

## Verification

- Commands run and their results: unit/use case/HTTP tests pass; `pnpm test` pass (182 tests, 38 skipped); `pnpm build:identity`, TypeScript typecheck Identity, eslint các file Identity thay đổi và `git diff --check` pass.
- Not verified: bộ integration PostgreSQL bị skip vì `PASSWORD_RESET_TEST_DATABASE_URL` chưa có; migration chưa chạy trên DB test/thật, chưa smoke route Identity khi Redis hỏng và chưa gửi Graph staging. `pnpm lint`, `pnpm typecheck`, `pnpm build` toàn repo bị chặn bởi dòng `heheh` có sẵn tại `apps/learning-service/src/database/data-source.ts:14`.

## Remaining

- Not done: chạy migration trên DB test cách ly, integration/race/rollback và smoke test sau đó mới cân nhắc áp dụng trên DB mục tiêu; xác nhận mailbox/quyền Graph.
- Risks: code mới yêu cầu migration trước khi gọi ba endpoint; nếu chưa migrate, lỗi dependency 503 là dự kiến. Gateway/OAuth vẫn cần Redis. Dọn bản ghi hết hạn xảy ra khi có lượt gửi OTP, nên bản ghi vô hiệu có thể ở lại nếu không có traffic.
