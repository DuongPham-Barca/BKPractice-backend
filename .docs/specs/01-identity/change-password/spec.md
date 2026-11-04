# ID-008 Đổi mật khẩu BKPractice khi đã đăng nhập

## Trạng thái

Approved — chủ sở hữu sản phẩm phê duyệt ngày `2026-11-04` sau khi chốt chính sách phiên và quyền
tự đổi.

Phiên bản `1.0`.

## Mục tiêu

Cho phép người dùng đã đăng nhập tự đổi mật khẩu BKPractice bằng cách xác minh mật khẩu hiện tại
và đặt mật khẩu mới. Luồng này chỉ thay credential cục bộ của BKPractice.

## Tác nhân

- Người dùng BKPractice đã được xác thực bằng access token BKPractice hợp lệ.
- Identity Service, chủ sở hữu thông tin xác thực và phiên.
- API Gateway, xác minh access token và chuyển tiếp request đã xác thực.

## Bối cảnh

ID-001 Authentication ghi việc đổi mật khẩu tự nguyện là một tính năng riêng. ID-007 xử lý đặt lại
mật khẩu khi người dùng không đăng nhập được và loại trừ việc đổi mật khẩu bằng mật khẩu cũ. ID-008
bao phủ luồng tự phục vụ khi người dùng đang đăng nhập; không thay đổi luồng reset OTP của ID-007.

## Yêu cầu chức năng

- **ID-008-FR-001 — Chỉ người dùng đã xác thực:** Hệ thống MUST yêu cầu access token BKPractice hợp
  lệ và MUST chỉ đổi mật khẩu cho đúng người dùng được xác định từ principal đã xác minh.
- **ID-008-FR-002 — Xác minh credential hiện tại:** Request MUST có mật khẩu hiện tại và mật khẩu
  mới. Identity MUST xác minh mật khẩu hiện tại trước khi thay đổi credential.
- **ID-008-FR-003 — Chính sách mật khẩu mới:** Mật khẩu mới MUST dài từ 8 đến 128 ký tự và MUST
  khác mật khẩu hiện tại. Hệ thống MUST giữ nguyên chuỗi mật khẩu, không trim hoặc âm thầm chuẩn
  hoá.
- **ID-008-FR-004 — Lưu credential:** Khi đổi thành công, Identity MUST chỉ lưu bản băm Argon2 của
  mật khẩu mới; mật khẩu thô và hash MUST NOT xuất hiện trong response hoặc log.
- **ID-008-FR-005 — Chỉ đổi mật khẩu BKPractice:** Thao tác MUST NOT đổi mật khẩu Microsoft/Entra,
  email, hồ sơ, trạng thái, vai trò hoặc liên kết định danh Microsoft.
- **ID-008-FR-006 — An toàn khi lỗi:** Mật khẩu hiện tại sai, mật khẩu mới không hợp lệ hoặc tài
  khoản không đủ điều kiện MUST không làm thay đổi credential.
- **ID-008-FR-007 — Bảo vệ request:** Gateway MUST yêu cầu xác thực cho endpoint đổi mật khẩu; Identity
  MUST lấy user ID từ ngữ cảnh đã xác minh, không nhận user ID mục tiêu do client chỉ định.
- **ID-008-FR-008 — Phiên sau khi đổi:** Khi đổi mật khẩu thành công, Identity MUST giữ nguyên phiên
  hiện tại và thu hồi toàn bộ phiên khác của cùng user trong cùng transaction cập nhật password.
  Refresh token thuộc phiên hiện tại tiếp tục dùng được; access token/refresh token thuộc phiên khác
  MUST bị từ chối theo kiểm tra phiên hiện có.

## Quy tắc nghiệp vụ

- Thao tác này dành cho người dùng tự đổi mật khẩu của chính mình, không phải thao tác quản trị.
- Tài khoản đăng nhập được phép đổi password chỉ cho chính user được xác định bởi access token; không
  giới hạn theo role. Kể cả ADMIN chỉ được đổi credential của chính account mình.
- Credential Microsoft/Entra không được quản lý hoặc thay đổi bởi Identity.
- Chính sách độ dài 8–128 ký tự phù hợp với ID-007; mật khẩu không bị trim hoặc biến đổi.
- Việc thu hồi/giữ các phiên BKPractice sau khi đổi thành công còn chờ chủ sở hữu chốt (xem Câu hỏi
  mở). Plan/tasks là bản nháp và không chọn chính sách phiên thay cho chủ sở hữu.

## Quy tắc phân quyền

- Chỉ principal đã được xác minh qua access token BKPractice được gọi thao tác.
- User ID đích lấy từ principal; body không có trường `userId`.
- Không có vai trò nào được phép đổi mật khẩu cho một người dùng khác trong ID-008.

## Đầu vào và đầu ra

Route đề xuất: `POST /api/auth/password/change`.

| Trường            | Bắt buộc | Yêu cầu                                   |
| ----------------- | -------- | ----------------------------------------- |
| `currentPassword` | Có       | Chuỗi không rỗng, giữ nguyên khi kiểm tra |
| `newPassword`     | Có       | Chuỗi 8–128 ký tự, khác mật khẩu hiện tại |

Đổi thành công trả `204` không body. Không trả mật khẩu, hash, token mới hoặc dữ liệu credential.

## Tình huống lỗi

- Thiếu/sai access token: lỗi xác thực theo contract Identity/Gateway hiện tại.
- Mật khẩu hiện tại sai: request bị từ chối với lỗi credential chung, không đổi hash.
- Mật khẩu mới sai chính sách hoặc trùng mật khẩu hiện tại: request bị từ chối, không đổi hash.
- User không còn tồn tại/không còn trạng thái được phép thao tác: request bị từ chối, không đổi hash.
- Lỗi lưu trữ: lỗi dependency theo quy ước hiện tại; không trả thành công nếu transaction chưa hoàn tất.

## Tình huống biên

- Hai request đổi mật khẩu đồng thời không được làm mất cập nhật một cách im lặng; kết quả phải nhất
  quán với credential đã xác minh và lưu.
- Password Unicode, khoảng trắng đầu/cuối và ký tự đặc biệt được xử lý nguyên trạng; chỉ độ dài và
  việc so sánh credential áp dụng theo chính sách đã chốt.
- User đăng nhập Microsoft vẫn cần có credential BKPractice cục bộ để dùng thao tác này, vì luồng
  yêu cầu xác minh mật khẩu hiện tại.

## Tiêu chí nghiệm thu

- **ID-008-AC-001:** User đã xác thực gửi đúng mật khẩu hiện tại và mật khẩu mới hợp lệ thì Identity
  cập nhật hash Argon2; response `204` không có body.
- **ID-008-AC-002:** Request không xác thực hoặc principal không hợp lệ không đổi credential.
- **ID-008-AC-003:** Mật khẩu hiện tại sai không đổi credential và không tiết lộ hash/password.
- **ID-008-AC-004:** Mật khẩu mới ngắn hơn 8, dài hơn 128 hoặc trùng mật khẩu hiện tại bị từ chối và
  không đổi credential.
- **ID-008-AC-005:** Sau đổi thành công, mật khẩu cũ không đăng nhập được và mật khẩu mới đăng nhập
  được bằng luồng BKPractice; mật khẩu Microsoft không đổi.
- **ID-008-AC-006:** Request không thể chọn user ID khác; mọi response/log được kiểm tra không chứa
  mật khẩu thô hoặc hash.
- **ID-008-AC-007:** Sau đổi thành công, phiên hiện tại còn hoạt động và refresh được; mọi phiên khác
  của cùng user đã bị thu hồi, access token của chúng bị Gateway từ chối ngay.
- **ID-008-AC-008:** User có bất kỳ role nào, kể cả ADMIN, chỉ có thể đổi credential của principal
  hiện tại; request không thể tác động tới user khác.

## Ngoài phạm vi

Đặt lại mật khẩu khi quên (ID-007), đổi password Microsoft/Entra, MFA, gửi email/OTP, thay email,
quản trị credential của user khác, UI/mobile UI, thay đổi role/profile/status và quy trình cấp account.

## Phụ thuộc

- [ID-001 Authentication](../authentication/spec.md) — principal và phiên BKPractice.
- [ID-007 Password reset](../password-reset/spec.md) — chính sách độ dài mật khẩu và ranh giới reset.
- [Identity Service architecture](../../../architecture/identity-service.md), [Dependency rules](../../../architecture/dependency-rules.md), [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md).
- Identity sở hữu credential trong `bkpractice_identity`; thay schema (nếu cần) phải qua TypeORM migration, không bật `synchronize`.

## Câu hỏi mở

Không còn câu hỏi hành vi. Chủ sở hữu xác nhận giữ phiên hiện tại, thu hồi các phiên khác và chỉ cho
user đổi credential của chính account được access token xác định; không có thao tác Admin đổi
credential cho user khác.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review | Tóm tắt                                                                                            |
| ---------- | --------- | -------------------- | -------------------------------------------------------------------------------------------------- |
| 2026-11-04 | 0.1       | Codex / chờ review   | Đề xuất đổi mật khẩu tự phục vụ khi đã đăng nhập.                                                  |
| 2026-11-04 | 1.0       | Chủ sở hữu sản phẩm  | Phê duyệt đổi mật khẩu tự phục vụ; giữ phiên hiện tại, thu hồi phiên khác, không đổi hộ user khác. |
