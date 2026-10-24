# Identity Authentication — triển khai ID-001

Các phần việc [1–6](../README.md) dùng [spec ID-001 1.1](../../../../specs/01-identity/authentication/spec.md), [plan](../../../../specs/01-identity/authentication/plan.md) và [tasks](../../../../specs/01-identity/authentication/tasks.md) làm nguồn chính. Tài liệu này ghi cách cấu hình và kiểm chứng bản triển khai.

Kết quả đã thực hiện, bằng chứng test và các mục còn mở được ghi tại [worked entry của Authentication](../../../../worked/identity/auth/2026-10-19-identity-authentication.md).

## API

Identity công khai `POST /api/auth/login` (MSSV và mật khẩu), `GET /api/auth/microsoft`, `GET /api/auth/microsoft/callback`, `POST /api/auth/microsoft/exchange` (mã dùng một lần), và `POST /api/auth/refresh`. `POST /api/auth/logout` cùng `GET /api/auth/me` cần access token Bearer BKPractice hợp lệ. Không có thao tác đăng ký công khai. Login và exchange trả `userId`, `accessToken`, `refreshToken`; refresh trả cặp token; logout trả `204`; `/me` chỉ trả `userId`, `studentId`, `roles`, `status`.

Mỗi login tạo một họ refresh riêng. Refresh token được giao qua JSON và chỉ bản băm được lưu. Refresh xoay vòng trong transaction; dùng lại token đã tiêu thụ thu hồi họ đó. Logout thu hồi họ được gửi lên, không ảnh hưởng phiên trên thiết bị khác. Access token đã phát hành có hiệu lực đến khi hết hạn. Access token mới có ảnh chụp quyền hiệu lực hiện tại từ RBAC; token cũ thiếu claim quyền được Gateway truyền thành tập quyền rỗng.

## Cấu hình

Xem [.env.example](../../../../../.env.example) để biết tên biến, không dùng giá trị mẫu trong môi trường thật. Identity yêu cầu `IDENTITY_DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_REDIRECT_URI`, `AUTH_WEB_LOGIN_REDIRECT_URL`. TTL access/refresh là `JWT_ACCESS_TTL` và `JWT_REFRESH_TTL`. Redirect Microsoft và frontend phải dùng HTTPS trong production. Redirect URI cần trùng với cấu hình của ứng dụng trên tenant trường.

Gateway dùng `AUTH_RATE_LIMIT_TTL_MS` (mặc định 60000), `AUTH_PASSWORD_LOGIN_RATE_LIMIT` (mặc định 5), `AUTH_OAUTH_RATE_LIMIT` (mặc định 30). Giới hạn tính theo IP và đường dẫn; giới hạn chung vẫn là 120/phút. Gateway xác minh access token, xoá các header định danh/quyền do client gửi, và chỉ chuyển tiếp `Location` của hai route redirect Microsoft nếu URL an toàn. Nó không chuyển tiếp `set-cookie`.

## Schema và kiểm chứng

Migration `AddStudentMicrosoftAuthentication` cần chạy **sau** migration nền tảng Identity. Nó từ chối email trùng không phân biệt hoa thường/khoảng trắng, thêm MSSV cho phép null để giữ tài khoản cũ, liên kết Microsoft, và metadata họ refresh. Nó điền bù một ID họ riêng cho từng refresh token cũ. `down` xoá liên kết và metadata họ; chỉ thử run/revert/run trên database test cách ly. Test migration có chốt an toàn: `TEST_IDENTITY_DATABASE_URL` phải trỏ tới database có tên kết thúc bằng `_test`.

Test tự động dùng provider Microsoft giả và kho dữ liệu test. Smoke test tenant staging cần kiểm tra URI callback, tenant đúng/sai, lần liên kết email đầu tiên, tra cứu `tid + oid` sau đổi email, mã 60 giây, redirect không chứa bearer, và log không chứa bí mật. Không đưa giá trị bí mật vào fixture hoặc báo cáo. Luồng import Excel là tính năng riêng; để kiểm chứng end-to-end với dữ liệu thật, ranh giới cấp tài khoản phải cung cấp MSSV và email trường duy nhất cùng bản băm Argon2 của mật khẩu ban đầu đã duyệt.

Mật khẩu ban đầu dùng chung `123456` là rủi ro đã được chủ sở hữu chấp nhận. Authentication không bắt đổi mật khẩu lần đầu; Argon2, lỗi chung, không đăng ký công khai và throttling là các biện pháp giảm thiểu đã được duyệt.
