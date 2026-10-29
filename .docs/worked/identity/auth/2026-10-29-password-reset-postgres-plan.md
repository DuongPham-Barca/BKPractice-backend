# 2026-10-29 — Đề xuất lưu OTP reset trong PostgreSQL

- Author: Codex
- Scope: Tài liệu ID-007 tại `.docs/specs/01-identity/password-reset/`; không sửa code hoặc cấu hình chạy.

## Spec and plan

- Spec: `spec.md` ID-007 1.0 Approved tại đầu việc; bản sửa đổi 1.1 được ghi Proposed để chờ review.
- Plan: `plan.md` 1.0 đã review tại đầu việc; bản sửa đổi 1.1 chờ review.
- Tasks: `tasks.md` ghi rõ phần Redis đã có theo 1.0 và các việc PostgreSQL còn mở.
- Spec status at start: Approved 1.0; người dùng yêu cầu cập nhật spec/plan/tasks cho phương án lưu OTP trong DB.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Kho OTP/reset grant mới thay hay bổ sung cho Redis? | Bản đề xuất 1.1 dùng PostgreSQL Identity cho ba thao tác reset để chúng không cần Redis; không tạo fallback hai kho. | Yêu cầu người dùng ngày 2026-10-29 sau khi Redis riêng chưa kết nối; spec ID-007 FR-011. |
| Redis của OAuth/Gateway có bị bỏ không? | Không. Phạm vi chỉ là reset mật khẩu; các luồng khác giữ cấu hình hiện có. | Kiến trúc Identity, `auth.module.ts`, spec FR-010/FR-011. |
| Contract và chính sách bảo mật có đổi không? | Không đổi ba endpoint, 202/200/204, OTP/grant 5 phút, cooldown 60 giây, tối đa 5 lần sai, một lần dùng và thu hồi phiên. | Spec ID-007 1.0 FR-001–FR-010, AC-001–AC-008. |
| Có thể triển khai ngay theo tài liệu mới không? | Chưa. Bản sửa đổi 1.1 Proposed cần review/phê duyệt; code hiện tại vẫn dùng Redis. | `specs/README.md` về vòng đời SDD; working agreement bước 1–4. |

## What was done

Sửa `spec.md` để yêu cầu trạng thái OTP, lượt thử/cooldown và grant ở PostgreSQL do Identity sở hữu, không lưu mã/token thô, và thêm tiêu chí nghiệm thu khi Redis không kết nối. Sửa `plan.md` để mô tả migration/entity challenge và grant, thao tác transaction/khóa hàng, tiêu thụ grant cùng cập nhật mật khẩu/thu hồi phiên, và kiểm thử race/rollback. Sửa `tasks.md` để tách phần Redis đã có theo 1.0 khỏi các việc chuyển DB chưa làm. Đây là bản đề xuất tài liệu; người dùng chưa có hành vi runtime mới.

## Why these choices

PostgreSQL Identity đã là kho credential và phiên, nên có thể giữ trạng thái reset và giao dịch đổi mật khẩu trong cùng ranh giới dữ liệu. Challenge và grant tách biệt để grant đã cấp không bị vô hiệu chỉ vì có yêu cầu OTP mới, giống hành vi Redis hiện tại. HMAC của OTP kết hợp email, hash của grant và hạn kiểm tra khi đọc tránh lưu bí mật thô hoặc phụ thuộc vào lịch dọn bảng. Khóa hàng và transaction phục vụ quy tắc một lần dùng và chống reset một phần của spec.

## How the feature works

1. Sau khi 1.1 được phê duyệt và triển khai, client gọi ba endpoint public hiện có qua Identity/Gateway.
2. Use case gửi OTP yêu cầu adapter TypeORM tạo/thay challenge theo cooldown trong PostgreSQL, rồi Graph gửi mã tới email User đã lưu; client vẫn thấy phản hồi chung.
3. Use case verify khóa challenge, đếm sai hoặc tiêu thụ OTP và tạo grant trong transaction; chỉ mã hợp lệ nhận resetToken.
4. Use case reset khóa grant/User rồi tiêu thụ grant, băm mật khẩu và thu hồi phiên trong cùng transaction; lỗi DB rollback, token không dùng lại được sau thành công.
5. Những thao tác trên vẫn chưa có trong code; adapter Redis hiện tại tiếp tục chạy cho đến khi triển khai bản sửa đổi.

## Configuration

No configuration change. `REDIS_URL`/`AUTH_FLOW_STORE` vẫn phục vụ OAuth/Gateway; `MICROSOFT_MAIL_SENDER` và credential Graph giữ nguyên.

## Verification

- Commands run and their results: `git diff --check` pass; đọc đối chiếu spec/plan/tasks với kiến trúc Identity và code hiện có.
- Not verified: không chạy test, migration hay pnpm gates vì đây chỉ là thay đổi tài liệu; PostgreSQL adapter và smoke test chưa có.

## Remaining

- Not done: review/phê duyệt 1.1; migration/entity/adapter/transaction; integration tests; xác nhận mailbox/quyền Graph và smoke test.
- Risks: code Redis hiện tại không đáp ứng FR-011/AC-009 của bản Proposed; Gateway/OAuth vẫn cần Redis cho luồng riêng; PostgreSQL cần dọn bản ghi hết hạn để tránh tích luỹ dữ liệu.
