# ID-007 Đặt lại mật khẩu BKPractice bằng OTP email

## Trạng thái

Proposed — bản sửa đổi 1.1 ngày 2026-10-29, chờ review/phê duyệt việc chuyển OTP và reset grant sang PostgreSQL của Identity. Phiên bản 1.0 đã được phê duyệt ngày 2026-10-28; code hiện tại vẫn dùng Redis cho reset. Việc cấp hộp thư gửi và quyền Microsoft Graph vẫn là điều kiện cấu hình/kiểm thử chưa được xác minh trong worktree.

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
- **ID-007-FR-004 — Xác minh OTP:** OTP MUST gồm 6 chữ số, hết hạn sau 5 phút, gắn đúng account/email, chưa dùng và còn dưới 5 lần thử sai. OTP sai/hết hạn/đã dùng/vượt lượt thử không phát reset grant. Gửi lại chỉ sau ít nhất 60 giây và vô hiệu OTP cũ khi OTP mới được tạo.
- **ID-007-FR-005 — Reset grant:** Xác minh thành công MUST tiêu thụ OTP và trả `resetToken` mờ, hết hạn sau 5 phút, dùng một lần; chỉ FE báo “đã xác minh” hoặc gửi email/MSSV không đủ để đặt mật khẩu.
- **ID-007-FR-006 — Đặt mật khẩu:** Chỉ `resetToken` hợp lệ và `newPassword` dài 8–128 ký tự, khác mật khẩu hiện tại mới đổi credential. Identity lưu Argon2 hash, không trả password/hash.
- **ID-007-FR-007 — Một lần:** Reset thành công MUST tiêu thụ `resetToken`; dùng lại/gửi đồng thời không đặt mật khẩu lần hai.
- **ID-007-FR-008 — Phiên cũ:** Sau reset, mọi phiên BKPractice cũ MUST bị thu hồi để access token cũ bị Gateway từ chối ngay theo kiểm tra phiên hiện có; không phát hành phiên mới trong luồng reset.
- **ID-007-FR-009 — Bảo vệ public API:** Cả ba thao tác MUST có giới hạn tần suất/thử sai; không log OTP, resetToken, password hoặc email thô.
- **ID-007-FR-010 — Ranh giới:** Luồng chỉ sửa mật khẩu cục bộ đúng một User đã được cấp; không tạo User, đổi email/status/role/Profile/liên kết Microsoft hay mật khẩu Microsoft.
- **ID-007-FR-011 — Lưu trạng thái reset:** Identity MUST lưu trạng thái OTP, giới hạn thử/gửi lại và reset grant trong PostgreSQL do Identity sở hữu, thông qua migration. Không lưu OTP hoặc resetToken thô trong DB. Ba thao tác reset mật khẩu không phụ thuộc Redis; yêu cầu này không thay đổi Redis của OAuth/Gateway.

## Quy tắc nghiệp vụ và phân quyền

- Ba thao tác public ở HTTP vì người dùng có thể đã mất quyền đăng nhập; OTP/resetToken hợp lệ là điều kiện đổi credential.
- Email chuẩn hoá giống Identity hiện có; OTP chỉ gửi tới email lấy từ User, không dùng địa chỉ tuỳ ý do client gắn trong verify/reset.
- Chỉ User `ACTIVE` có role STUDENT hoặc LECTURER, không có role ADMIN, không phải tài khoản hệ thống và chưa xoá mềm được dùng. User `LOCKED`/`PENDING`/đã xoá, ADMIN và system không tự reset qua API này.
- Mỗi email chỉ có một OTP đang hiệu lực. Gửi lại sau 60 giây vô hiệu mã cũ; năm lần thử sai vô hiệu OTP hiện tại. Không dùng Entra External ID/SSPR OTP làm bằng chứng BKPractice.
- Bản ghi hết hạn trong PostgreSQL không được chấp nhận dù chưa được dọn khỏi bảng. Verify và reset đồng thời phải tiêu thụ OTP/grant đúng một lần; reset thất bại không được đổi mật khẩu hoặc thu hồi phiên một phần.
- Microsoft Graph dùng một hộp thư gửi được cấu hình và quyền `Mail.Send` giới hạn tới hộp thư đó. Quyền/hộp thư là điều kiện triển khai vận hành; không tuyên bố chúng đã tồn tại.

## Đầu vào và đầu ra

| Thao tác đề xuất | Đầu vào | Đầu ra đề xuất |
| --- | --- | --- |
| `POST /api/auth/password/send-otp` | `{ email }` | `202` phản hồi chung, không OTP. |
| `POST /api/auth/password/verify-otp` | `{ email, otp }` | `200` với `{ resetToken }` khi hợp lệ; OTP không hợp lệ trả cùng lỗi `400` không tiết lộ lý do. |
| `POST /api/auth/password/reset` | `{ resetToken, newPassword }` | `204` không body khi đổi thành công; token/password không hợp lệ trả `400`. |

`email` được trim/lowercase; `otp` là chuỗi đúng 6 chữ số; `newPassword` không bị trim hoặc tự sửa. `resetToken` không ở URL. API gửi OTP trả `202` chung kể cả khi email không đủ điều kiện hoặc Graph gửi thất bại; lỗi vận hành được ghi nhận riêng, không xác nhận email tồn tại.

## Tình huống lỗi và biên

- Email sai hình dạng, OTP sai/hết hạn/đã dùng, token sai/hết hạn/dùng lại, password không đạt chính sách đều bị từ chối mà không đổi credential.
- Gửi lại, verify/reset đồng thời không được tạo đường dùng lại OTP/grant; OTP cũ mất hiệu lực khi gửi lại thành công.
- Graph gửi mail lỗi không đổi phản hồi chung `202`; log lỗi vận hành an toàn. Lỗi PostgreSQL của Identity được ánh xạ thành lỗi dependency không phân biệt email có account hay không. Lỗi Redis ở Gateway/OAuth thuộc luồng riêng. Graph nhận request chưa bảo đảm email đã tới hộp thư.
- User đổi trạng thái/xoá mềm trước khi hoàn tất thì không được đặt lại credential cho account không đủ điều kiện.

## Tiêu chí nghiệm thu

- **ID-007-AC-001:** User đủ điều kiện yêu cầu OTP; email gửi tới địa chỉ đã lưu từ hộp thư Microsoft 365, response không có mã.
- **ID-007-AC-002:** Email không tồn tại nhận cùng phản hồi công khai và không tạo email tới địa chỉ attacker chọn.
- **ID-007-AC-003:** OTP 6 số còn hạn được xác minh một lần/trả resetToken hạn 5 phút; mã sai/hết hạn, năm lần thử sai hoặc mã cũ sau gửi lại không trả token.
- **ID-007-AC-004:** Reset grant hợp lệ cập nhật duy nhất Argon2 hash của mật khẩu BKPractice; token cũ không reset lần nữa.
- **ID-007-AC-005:** Mật khẩu cũ không login được, mật khẩu mới 8–128 ký tự và khác mật khẩu cũ login được; mọi phiên cũ bị thu hồi và access token cũ bị từ chối ngay; mật khẩu Microsoft không đổi.
- **ID-007-AC-006:** Log/response/URL không lộ OTP, grant, password/hash hoặc bí mật Microsoft.
- **ID-007-AC-007:** Race, gửi lại trước 60 giây và lỗi Graph/PostgreSQL không tạo reset trái phép hoặc rò account; Graph lỗi vẫn trả `202` chung.
- **ID-007-AC-008:** ADMIN, tài khoản hệ thống, User không ACTIVE hoặc đã xoá mềm không nhận OTP/reset grant có hiệu lực.
- **ID-007-AC-009:** Migration Identity tạo được kho OTP/grant trong PostgreSQL; không có mã/token thô trong bảng. Khi Redis không kết nối nhưng PostgreSQL và các phụ thuộc cần thiết vẫn hoạt động, ba thao tác reset trực tiếp tại Identity vẫn tuân theo AC-001–AC-008.

## Ngoài phạm vi

Đổi mật khẩu khi đang đăng nhập bằng mật khẩu cũ, reset mật khẩu Microsoft/Entra, MFA, SMS OTP, đăng ký/cấp User, quản trị User/role, đổi email và FE. Không thay route Microsoft ID-001.

## Phụ thuộc

- [ID-001 Auth](../authentication/spec.md), [ID-004 cấp User](../student-provisioning/spec.md), [ID-003 RBAC](../rbac/spec.md), [ID-006 xoá mềm](../user-management/spec.md).
- [Kiến trúc Identity](../../../architecture/identity-service.md), [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md).
- PostgreSQL `bkpractice_identity` do Identity sở hữu; schema thay đổi bằng TypeORM migration, không dùng `synchronize`.
- Microsoft Graph [`sendMail`](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0), quyền [`Mail.Send`](https://learn.microsoft.com/en-us/graph/permissions-reference#mail-send); cần hộp thư và quyền trường cấp.

## Câu hỏi mở

Không còn câu hỏi hành vi cho bản đề xuất 1.1: người dùng đã chọn PostgreSQL cho OTP/grant của reset, không yêu cầu bỏ Redis khỏi OAuth/Gateway. Bản sửa đổi cần review/phê duyệt trước khi thay code. Mailbox/quyền `Mail.Send` vẫn phải được cấp và kiểm chứng trước smoke test; cần đối chiếu bản sao ID-004 trước triển khai.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-10-28 | 0.1 | Codex / chờ review | Ba endpoint OTP để đặt lại mật khẩu BKPractice qua Microsoft 365. |
| 2026-10-28 | 1.0 | Chủ sở hữu sản phẩm | Chốt đối tượng, OTP/grant, password, phiên và lỗi gửi mail; Approved. |
| 2026-10-29 | 1.1 | Codex / chờ review | Đề xuất chuyển kho OTP và reset grant của ID-007 từ Redis sang PostgreSQL Identity; giữ nguyên API và chính sách thời hạn/lượt thử. |
