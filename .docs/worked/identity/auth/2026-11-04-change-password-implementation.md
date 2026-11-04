# 2026-11-04 — Đổi mật khẩu tự phục vụ

- Người thực hiện: Codex
- Phạm vi: Chỉ Identity Auth. Không sửa API Gateway, dịch vụ khác, cấu hình runtime, dependency hoặc schema cơ sở dữ liệu.

## Spec và kế hoạch

- Spec: [ID-008 đổi mật khẩu](../../../specs/01-identity/change-password/spec.md), phiên bản 1.0 được chủ sản phẩm duyệt ngày 2026-11-04.
- Kế hoạch: [Kế hoạch triển khai ID-008](../../../specs/01-identity/change-password/plan.md), đã duyệt.
- Tasks: [Danh sách công việc ID-008](../../../specs/01-identity/change-password/tasks.md).
- Trạng thái spec lúc bắt đầu: Proposed; được duyệt sau khi chủ sản phẩm chốt chính sách phiên đăng nhập và quyền chỉ đổi tài khoản của chính mình.

## Các câu hỏi đã được làm rõ

| Câu hỏi                                       | Kết luận                                                                                                                    | Nguồn                                                                                |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Sau khi đổi mật khẩu, phiên nào còn hiệu lực? | Giữ family của phiên hiện tại; thu hồi tất cả family khác và refresh token liên quan cùng transaction cập nhật mật khẩu.    | Chỉ dẫn của người dùng trong cuộc trò chuyện; ID-008 spec 1.0, FR-008/AC-007.        |
| Người gọi được đổi tài khoản nào?             | Chỉ tài khoản được xác định bởi access token đã xác minh. Kể cả ADMIN cũng không thể đổi thông tin xác thực của người khác. | Chỉ dẫn của người dùng trong cuộc trò chuyện; ID-008 spec 1.0, FR-001/FR-007/AC-008. |
| Có cần sửa Gateway hoặc schema không?         | Không. `/api/auth` đã được proxy và mặc định được bảo vệ; các bảng User/session hiện tại đáp ứng được chức năng.            | Hành vi middleware/proxy của Gateway và schema Identity; kế hoạch ID-008.            |

## Công việc đã thực hiện

Đã duyệt ID-008 và triển khai `POST /api/auth/password/change` trong Identity Auth. Request gồm `currentPassword` và `newPassword`; user ID cùng session ID hiện tại lấy từ BKPractice access token hợp lệ, đã xác minh và còn hiệu lực. Mật khẩu được quản lý trong BKPractice; response rỗng với mã `204`.

Application xác minh mật khẩu cũ, áp dụng giới hạn 8–128 ký tự và từ chối dùng lại mật khẩu hiện tại. Persistence adapter khóa User và session hiện tại, kiểm tra hash thông tin xác thực chưa thay đổi kể từ lúc xác minh, cập nhật Argon2 hash, rồi thu hồi các session family khác cùng refresh token trong một database transaction. Family hiện tại tiếp tục dùng được.

## Lý do chọn cách triển khai

- Chức năng nằm trong `apps/identity-service/src/modules/auth/` vì Identity quản lý thông tin xác thực, đăng nhập và trạng thái session.
- Tái sử dụng Argon2, password hash của User, `sessions` và `refresh_tokens` đang có; không cần migration hoặc dependency mới.
- Gộp cập nhật hash và thu hồi session vào cùng transaction để lỗi không thể khiến mật khẩu đã đổi nhưng các phiên cũ vẫn còn hoạt động.
- Không sửa Gateway: hành vi `/api/auth` hiện có đã bảo vệ route không công khai, kiểm tra Origin/CSRF cho request ghi dùng cookie và chuyển tiếp Bearer identity tới Identity.

## Luồng hoạt động

1. Client đã đăng nhập gửi mật khẩu hiện tại và mật khẩu mới tới `/api/auth/password/change`.
2. Middleware auth hiện tại của API Gateway yêu cầu BKPractice access token; request ghi trên trình duyệt dùng cookie cũng phải qua kiểm tra Origin/CSRF hiện có.
3. `AuthController` của Identity xác minh session còn hiệu lực và chỉ chuyển token subject, session family ID cùng dữ liệu mật khẩu vào `ChangePassword`.
4. `ChangePassword` tải Argon2 hash nội bộ, xác minh mật khẩu hiện tại, áp dụng chính sách mật khẩu mới rồi tạo hash thay thế.
5. `TypeormPasswordChangeRepository` khóa User và family hiện tại, xác nhận hash cũ vẫn còn hiện hành, cập nhật mật khẩu, sau đó thu hồi mọi family khác và refresh token liên quan trong cùng transaction.
6. Identity trả `204`. Session hiện tại tiếp tục hoạt động và có thể refresh; các session khác không vượt qua bước kiểm tra trạng thái session hiện có. Thông tin xác thực không hợp lệ sẽ không làm thay đổi dữ liệu đã lưu.

## Cấu hình

Không thay đổi cấu hình.

## Kiểm chứng

- Các lệnh đã chạy và kết quả:
  - `pnpm exec eslint` trên các file TypeScript Identity đã sửa: đạt.
  - `pnpm exec tsc --noEmit -p apps/identity-service/tsconfig.app.json`: đạt.
  - Test tập trung cho Auth use case/repository: 26 test đạt.
  - Test HTTP contract của Auth controller: 7 test đạt (chạy ngoài sandbox vì bind localhost bị sandbox chặn với lỗi `EPERM`).
  - `pnpm build` toàn repo: đạt.
  - `pnpm test` toàn repo: 702 test đạt, 54 bỏ qua; một suite không biên dịch được do `test/account-import.integration.spec.ts` tham chiếu `officialName` không có trong `ProfileAccount` và `PreparedImportAccount`.
  - `pnpm lint` và `pnpm typecheck` toàn repo: cùng lỗi không liên quan tại `test/account-import.integration.spec.ts`. Lint/typecheck trong phạm vi Identity đạt.
- Chưa kiểm chứng: Test concurrency/migration với PostgreSQL thật; không có thay đổi schema. Các lệnh chạy bằng Node `20.19.6`, thấp hơn phiên bản `>=22` repo khai báo nên có cảnh báo engine.

## Việc còn lại

- Chưa đạt: Các bước lint, typecheck và test toàn repo vẫn bị chặn bởi lỗi kiểu dữ liệu `officialName` không liên quan trong test account-import.
- Rủi ro: Session hiện tại được giữ hiệu lực sau khi đổi mật khẩu theo đúng chính sách đã duyệt. Chạy lại các bước kiểm tra toàn repo sau khi sửa lỗi `officialName` và dùng phiên bản Node phù hợp.
