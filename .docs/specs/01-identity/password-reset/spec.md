# ID-007 Đặt lại mật khẩu BKPractice bằng OTP email

## Trạng thái

Proposed — bản nháp 0.1 ngày 2026-10-28. Chưa được phê duyệt để triển khai.

## Mục tiêu

Cho phép người dùng quên mật khẩu đăng nhập cục bộ BKPractice nhận OTP tại email trường đã lưu, xác minh OTP và đặt mật khẩu BKPractice mới qua đúng ba thao tác. Mật khẩu Microsoft của trường không đổi.

## Tác nhân và bối cảnh

- Người dùng được cấp account BKPractice có email trường và mật khẩu cục bộ.
- Khách chưa xác thực bắt đầu luồng nhưng không được biết email nào có account.
- Identity sở hữu credential, OTP/reset grant và phiên. Microsoft 365 chuyển email qua Graph `sendMail`; Microsoft không tạo/xác minh OTP BKPractice.
- ID-001 Approved đặt forgot/reset password ngoài phạm vi; ID-007 là feature mới và không sửa ID-001.

## Yêu cầu chức năng

- **ID-007-FR-001 — Gửi OTP:** Identity MUST nhận yêu cầu gửi OTP tới email trường đã lưu của account đủ điều kiện. Identity tạo OTP; client không chọn địa chỉ nhận khác.
- **ID-007-FR-002 — Gửi qua Microsoft:** OTP MUST được gửi từ hộp thư Microsoft 365 cấu hình qua Graph. Đăng nhập Entra hiện có không tự cấp quyền gửi mail và OTP không reset mật khẩu Microsoft.
- **ID-007-FR-003 — Chống dò account:** Yêu cầu gửi MUST có phản hồi công khai giống nhau dù email có account đủ điều kiện hay không. Không trả trạng thái, role, OTP hoặc lỗi tiết lộ email tồn tại.
- **ID-007-FR-004 — Xác minh OTP:** OTP MUST gắn đúng account/email, còn hạn, chưa dùng, chưa vượt giới hạn thử; sai/hết hạn/đã dùng không phát reset grant.
- **ID-007-FR-005 — Reset grant:** Xác minh thành công MUST trả `resetToken` mờ, ngắn hạn, dùng một lần; chỉ FE báo “đã xác minh” hoặc gửi email/MSSV không đủ để đặt mật khẩu.
- **ID-007-FR-006 — Đặt mật khẩu:** Chỉ `resetToken` hợp lệ và `newPassword` đạt chính sách đã duyệt mới đổi credential; Identity lưu Argon2 hash, không trả password/hash.
- **ID-007-FR-007 — Một lần:** Reset thành công MUST tiêu thụ `resetToken`; dùng lại/gửi đồng thời không đặt mật khẩu lần hai.
- **ID-007-FR-008 — Phiên cũ:** Sau reset, các phiên BKPractice cũ MUST bị thu hồi theo chính sách được chốt; không phát hành phiên mới trong luồng reset.
- **ID-007-FR-009 — Bảo vệ public API:** Cả ba thao tác MUST có giới hạn tần suất/thử sai; không log OTP, resetToken, password hoặc email thô.
- **ID-007-FR-010 — Ranh giới:** Luồng chỉ sửa mật khẩu cục bộ đúng một User đã được cấp; không tạo User, đổi email/status/role/Profile/liên kết Microsoft hay mật khẩu Microsoft.

## Quy tắc nghiệp vụ và phân quyền

- Ba thao tác public ở HTTP vì người dùng có thể đã mất quyền đăng nhập; OTP/resetToken hợp lệ là điều kiện đổi credential.
- Email chuẩn hoá giống Identity hiện có; OTP chỉ gửi tới email lấy từ User, không dùng địa chỉ tuỳ ý do client gắn trong verify/reset.
- Đề xuất chỉ User `ACTIVE` có mật khẩu cục bộ được dùng. Chính sách `LOCKED`/`PENDING`, Admin/tài khoản hệ thống còn chờ chốt.
- Thời hạn OTP/reset grant, số lần thử và gửi lại cần duyệt; không dùng Entra External ID/SSPR OTP làm bằng chứng BKPractice.

## Đầu vào và đầu ra

| Thao tác đề xuất | Đầu vào | Đầu ra đề xuất |
| --- | --- | --- |
| `POST /api/auth/password/send-otp` | `{ email }` | `202` phản hồi chung, không OTP. |
| `POST /api/auth/password/verify-otp` | `{ email, otp }` | `200` với `{ resetToken }` khi hợp lệ. |
| `POST /api/auth/password/reset` | `{ resetToken, newPassword }` | `204` không body khi đổi thành công. |

Route là đề xuất. `resetToken` không ở URL. Shape lỗi, định dạng OTP, chính sách password/TTL cần chốt trước Approved.

## Tình huống lỗi và biên

- Email sai hình dạng, OTP sai/hết hạn/đã dùng, token sai/hết hạn/dùng lại, password không đạt chính sách đều bị từ chối mà không đổi credential.
- Gửi lại, verify/reset đồng thời không được tạo đường dùng lại OTP/grant. Chính sách OTP cũ khi gửi lại cần chốt.
- Graph/Redis/DB lỗi không được làm phản hồi lộ account tồn tại; log lỗi vận hành an toàn. Graph nhận request chưa bảo đảm email đã tới hộp thư.
- User đổi trạng thái/xoá mềm trước khi hoàn tất thì không được đặt lại credential cho account không đủ điều kiện.

## Tiêu chí nghiệm thu

- **ID-007-AC-001:** User đủ điều kiện yêu cầu OTP; email gửi tới địa chỉ đã lưu từ hộp thư Microsoft 365, response không có mã.
- **ID-007-AC-002:** Email không tồn tại nhận cùng phản hồi công khai và không tạo email tới địa chỉ attacker chọn.
- **ID-007-AC-003:** OTP hợp lệ xác minh một lần/trả resetToken; OTP sai/hết hạn/vượt lượt thử không trả token.
- **ID-007-AC-004:** Reset grant hợp lệ cập nhật duy nhất Argon2 hash của mật khẩu BKPractice; token cũ không reset lần nữa.
- **ID-007-AC-005:** Mật khẩu cũ không login được, mật khẩu mới login được; phiên cũ xử lý theo chính sách; mật khẩu Microsoft không đổi.
- **ID-007-AC-006:** Log/response/URL không lộ OTP, grant, password/hash hoặc bí mật Microsoft.
- **ID-007-AC-007:** Race, gửi lại và lỗi Graph/Redis/DB không tạo reset trái phép hoặc rò account.

## Ngoài phạm vi

Đổi mật khẩu khi đang đăng nhập bằng mật khẩu cũ, reset mật khẩu Microsoft/Entra, MFA, SMS OTP, đăng ký/cấp User, quản trị User/role, đổi email và FE. Không thay route Microsoft ID-001.

## Phụ thuộc

- [ID-001 Auth](../authentication/spec.md), ID-004 cấp User (`student-provisioning/spec.md` hiện thiếu trong worktree), [ID-003 RBAC](../rbac/spec.md), [ID-006 xoá mềm](../user-management/spec.md).
- [Kiến trúc Identity](../../../architecture/identity-service.md), [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md).
- Microsoft Graph [`sendMail`](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0), quyền [`Mail.Send`](https://learn.microsoft.com/en-us/graph/permissions-reference#mail-send); cần hộp thư và quyền trường cấp.

## Câu hỏi mở — chặn Approved

1. Trường có hộp thư Microsoft 365 gửi OTP và quyền Graph `Mail.Send` giới hạn phạm vi không? Dùng app Entra hiện tại hay app mail riêng?
2. STUDENT/LECTURER/ADMIN/system nào được reset; `LOCKED`/`PENDING`/xoá mềm xử lý thế nào?
3. OTP độ dài, TTL, số lần thử/gửi lại, vô hiệu OTP cũ và thời hạn resetToken bao nhiêu?
4. Chính sách password mới (độ dài/ký tự/cấm trùng cũ) và mã lỗi là gì?
5. Access token cũ bị chặn ngay sau reset hay hết hạn tự nhiên? Đối chiếu ID-001/Gateway.
6. Graph lỗi trả `202` chung cho mọi email hay contract khác vẫn chống dò account?
7. Khôi phục tài liệu ID-004 `student-provisioning` đang thiếu khỏi worktree để đối chiếu chính sách cấp User trước Approved.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-10-28 | 0.1 | Codex / chờ review | Ba endpoint OTP để đặt lại mật khẩu BKPractice qua Microsoft 365. |
