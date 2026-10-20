# 2026-10-19 — Triển khai Identity Authentication ID-001

- Author: Codex
- Scope: Identity Authentication, phần kiểm tra token và throttling của API Gateway, cấu hình và claim contract dùng chung.

## Spec and plan

- Spec: `specs/01-identity/authentication/spec.md`, bản 1.1.
- Plan: `specs/01-identity/authentication/plan.md` và sáu phần trong `docs/pm/plan/identity/auth/`.
- Tasks: `specs/01-identity/authentication/tasks.md`; chỉ các mục đã có triển khai và kiểm chứng phù hợp mới được đánh dấu.
- Spec status at start: Approved.

## Questions clarified

| Question | Conclusion | Source |
| --- | --- | --- |
| Ai được tạo tài khoản? | Auth chỉ đăng nhập tài khoản đã được cấp; không có register công khai hay import Excel trong phạm vi này. | ID-001-FR-001–FR-004, Out of Scope |
| Microsoft có bắt buộc khi khởi động Identity? | Có. Tenant, client, secret và hai redirect là cấu hình bắt buộc; thiếu biến thì dừng sớm. File `.env` cũ cần được người vận hành cập nhật, không tự chèn secret mẫu. | `spec.md` bản 1.1, `plan.md` mục Cấu hình, `.env.example` |
| Quyền trong access token lấy ở đâu? | Đọc quyền hiệu lực từ RBAC của Identity ngay trước khi phát hành token; chỉ hiện thực reader tối thiểu cần cho ID-001. | ID-001-FR-012 bản 1.1, ID-003-T045–T046 |
| Redirect và mã Microsoft do ai quyết định? | Chỉ cấu hình phía server quyết định URL; callback phát mã ngắn hạn một lần, frontend đổi mã để nhận token BKPractice. | ID-001-FR-024, ID-001-SR-015–SR-017 |
| Có thể xác minh với tenant thật ngay không? | Chưa có cấu hình/ứng dụng staging được cung cấp. Test adapter dùng dữ liệu giả và chữ ký kiểm chứng; smoke test thật còn mở. | ID-001-T037 |

## What was done

Identity đã thay Auth controller và service cũ bằng bảy use case riêng, port ứng dụng và adapter TypeORM, Argon2, JWT, MSAL Node, Redis. Login nhận MSSV của tài khoản đã được cấp; Microsoft dùng tenant trường, liên kết email trường lần đầu rồi dùng `tid + oid` ở các lần sau. Refresh token thuộc từng họ phiên và chỉ bản băm được lưu. Logout thu hồi họ được gửi lên; `/me` trả thông tin xác thực tối thiểu. Register công khai đã bị gỡ.

Migration Identity thêm MSSV, bảng liên kết Microsoft, metadata họ refresh và ràng buộc email/MSSV. Migration điền bù họ riêng cho các refresh token cũ. RBAC cung cấp reader quyền hiệu lực để access token chứa `permissions`. Gateway kiểm tra loại access token, loại bỏ header định danh do client giả mạo, chuyển tiếp redirect Microsoft an toàn và áp dụng rate limit theo route. Contract claim, cấu hình mẫu, README và tài liệu trong `docs/pm/plan/identity/auth/README.md` đã được cập nhật.

| Phần plan | Phần việc đã làm | Tệp chính và kết quả quan sát được |
| --- | --- | --- |
| 01 — Foundation/storage | Cấu hình, claim contract, entity User/Refresh/ExternalIdentity, migration và repository test. | `libs/config/src/environment.ts`, `libs/contracts/src/auth.contracts.ts`, `apps/identity-service/src/database/migrations/1700000000001-AddStudentMicrosoftAuthentication.ts`: Identity kiểm tra cấu hình và lưu được tài khoản/liên kết/họ phiên. |
| 02 — Student login/session | Port, use case MSSV, JWT/Argon2, refresh, logout và `/me`. | `apps/identity-service/src/modules/auth/application/` và `infrastructure/security/`: tài khoản `ACTIVE` nhận token; refresh xoay vòng và logout thu hồi đúng họ. |
| 03 — Microsoft login | MSAL Node, kiểm chứng ID token, Redis state/nonce/PKCE và mã đăng nhập dùng một lần. | `apps/identity-service/src/modules/auth/infrastructure/microsoft/`, `infrastructure/redis/`, `infrastructure/persistence/typeorm-external-identity.repository.ts`: callback chỉ liên kết tài khoản đã cấp và bàn giao mã cho frontend. |
| 04 — HTTP/Gateway | Bảy endpoint, DTO/Swagger, proxy redirect, loại bỏ header giả và throttling theo route. | `apps/identity-service/src/modules/auth/presentation/`, `apps/api-gateway/src/auth/`, `apps/api-gateway/src/proxy/`: client không còn register công khai; logout và `/me` cần access token. |
| 05 — Permission claim | RBAC reader, claim `permissions` khi cấp access token và header quyền tin cậy ở Gateway. | `apps/identity-service/src/modules/rbac/`, `apps/identity-service/src/modules/auth/application/auth-token-issuer.ts`, `apps/api-gateway/src/auth/gateway-auth.middleware.ts`: token mới lấy quyền hiện tại; token cũ giữ ảnh chụp cũ. Danh mục quyền ID-003-T047 và E2E độ tươi ID-003-T049 còn mở. |
| 06 — Verification/handoff | Test trọng tâm, migration trên database test, checklist và nhật ký này. | `specs/01-identity/authentication/tasks.md`, `specs/01-identity/rbac/tasks.md`: chỉ đánh dấu các mục đã có bằng chứng; các gate và smoke test còn mở được ghi ở dưới. |

## Why these choices

- Các use case và port nằm trong Auth theo kiến trúc Identity của ADR 0001; adapter giữ Nest, TypeORM, Redis, JWT và Microsoft ngoài domain/application.
- MSAL Node thực hiện Authorization Code Flow; adapter xác minh thêm chữ ký và claim ID token trước khi dùng email, tenant và object ID. Redis giữ state/nonce/PKCE trong 300 giây và mã đăng nhập trong 60 giây bằng thao tác tiêu thụ nguyên tử.
- PostgreSQL của Identity giữ tài khoản, liên kết và họ phiên. Khoá duy nhất và transaction bảo vệ việc liên kết Microsoft cùng xoay vòng refresh khi có nhiều request đồng thời.
- Access token chứa quyền hiệu lực tại thời điểm phát hành theo bản sửa đổi 1.1; refresh token vẫn chỉ chứa các claim phiên tối thiểu.

## How the feature works

1. Client gọi Gateway hoặc Identity qua một trong bảy route `/api/auth`.
2. Controller kiểm tra DTO và Bearer cho logout hoặc `/me`, rồi gọi đúng use case tương ứng.
3. Login MSSV kiểm tra Argon2 và trạng thái `ACTIVE`; Microsoft start lưu state/nonce/PKCE, callback xác minh kết quả Microsoft rồi liên kết đúng một tài khoản đã được cấp. Callback chuyển hướng tới frontend với mã dùng một lần; exchange tiêu thụ mã và nạp lại tài khoản.
4. Khi cấp token, Identity đọc vai trò và quyền hiệu lực, tạo access token và refresh token mới, lưu bản băm refresh cùng family ID. Refresh xoay vòng trong transaction; dùng lại token đã thu hồi sẽ thu hồi riêng họ đó. Logout thu hồi họ được gửi lên.
5. Client nhận cặp token qua JSON hoặc `/me` tối thiểu. Gateway chỉ chuyển tiếp request được bảo vệ sau khi kiểm tra access token hợp lệ.
6. Sai mật khẩu, tài khoản không hoạt động, Microsoft không khớp và refresh không hợp lệ trả lỗi xác thực chung; hỏng phụ thuộc xác thực trả 503. Thiếu cấu hình Microsoft làm Identity dừng khi khởi động.

## Configuration

- `.env.example`: `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` xác định ứng dụng/tenant trường; `MICROSOFT_REDIRECT_URI` là callback qua Gateway; `AUTH_WEB_LOGIN_REDIRECT_URL` là URL frontend nhận mã đăng nhập.
- `.env.example`: `REDIS_URL` là kho state và mã ngắn hạn của Identity; `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL` là thời hạn token.
- `.env.example`: `AUTH_RATE_LIMIT_TTL_MS`, `AUTH_PASSWORD_LOGIN_RATE_LIMIT`, `AUTH_OAUTH_RATE_LIMIT` cấu hình giới hạn route auth ở Gateway.
- `libs/config/src/environment.ts`: kiểm tra các biến bắt buộc, thứ tự TTL và HTTPS cho redirect production. File `.env` thực tế không được đọc hoặc sửa trong công việc này.

## Verification

- `pnpm build:identity`, `pnpm build:gateway`: pass.
- Unit test use case, Argon2, JWT, MSAL claims/chữ ký, Redis TTL/one-time, RBAC policy, cấu hình và Gateway middleware/proxy: pass.
- Identity controller HTTP, OpenAPI bảy route/Bearer/mã 60 giây, Gateway throttling HTTP: pass khi chạy ngoài sandbox (sandbox không cho tiến trình test listen trên localhost).
- Migration và repository integration: pass trên PostgreSQL test riêng, gồm run/revert/run migration, backfill, liên kết ổn định, xoay vòng đồng thời và cách ly họ. Test composition của AuthModule cũng pass trên database test này; container tạm đã dừng và xoá.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: bị chặn bởi dòng `heheh` đã có sẵn tại `apps/learning-service/src/database/data-source.ts:14`; không sửa vì ngoài phạm vi Auth.
- `pnpm test` ngoài sandbox: exit 0, 13 suite/38 test pass; 2 suite/7 test bị skip vì không có `TEST_IDENTITY_DATABASE_URL` trong lần chạy toàn bộ. Trước đó migration và AuthModule integration đã pass riêng trên database test cách ly.
- `git diff --check`: pass.
- Not verified: Microsoft tenant staging thật, Redis thật trong luồng end-to-end, toàn bộ acceptance test API, hai suite integration trong lần chạy toàn bộ và migration qua các script CLI của repository.

## Remaining

- Cần người vận hành bổ sung năm biến Microsoft vào `.env` hiện có bằng giá trị ứng dụng/tenant/redirect thực tế; `pnpm env:setup` không cập nhật file đã tồn tại. Giá trị mẫu không dùng để xác thực Microsoft thật.
- Chạy smoke test tenant staging, end-to-end với tài khoản đã được cấp, Redis thật và các script migration trên database test trước khi xác nhận ID-001 Verified.
- Hoàn tất các mục checklist còn mở, rà soát bảo mật cuối cùng, sửa lỗi nền Learning độc lập và chạy lại quality gates; review của con người theo quy trình SDD.
- RBAC permission catalogue/seed đầy đủ thuộc ID-003; khi chưa có dữ liệu quyền, claim `permissions` có thể là mảng rỗng.
