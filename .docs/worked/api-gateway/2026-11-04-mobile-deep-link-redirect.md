# 2026-11-04 — Cho phép deep link mobile đi qua Gateway

- Author: Agent
- Scope: `api-gateway` proxy và cấu hình môi trường; không thay đổi Identity, schema hay dependency.

## Spec và kế hoạch

- Spec: [ID-001 Authentication](../../specs/01-identity/authentication/spec.md), Approved 1.2.
- Plan: [ID-001 plan](../../specs/01-identity/authentication/plan.md).
- Tasks: [ID-001 tasks](../../specs/01-identity/authentication/tasks.md), mục ID-001-T029.
- Trạng thái spec lúc bắt đầu: ID-001 Approved. [ID-009 mobile Microsoft login](../../specs/01-identity/mobile-microsoft-login/spec.md)
  vẫn là Proposed và **không** được triển khai trong lượt này.

## Câu hỏi đã làm rõ

| Câu hỏi | Kết luận | Nguồn |
| ------- | -------- | ----- |
| Vì sao callback Microsoft trả `502 Invalid authentication redirect`? | Gateway chỉ chấp nhận `Location` có protocol `http:`/`https:`, nên deep link `bkpracticemobile:///auth/callback` bị từ chối. | `apps/api-gateway/src/proxy/gateway-proxy.service.ts`; lỗi quan sát được khi test. |
| Có được mở toàn bộ scheme lạ không? | Không. Chỉ chấp nhận `Location` trùng chính xác scheme, host và path của `AUTH_MOBILE_LOGIN_REDIRECT_URL` đã cấu hình. | ID-001 FR-024 yêu cầu redirect về frontend đã cấu hình, không dùng redirect do người gọi cung cấp; gateway vẫn phải chặn bearer token trong URL. |
| Gateway có đọc được biến cấu hình này không? | Trước đây không, vì schema `api-gateway` không khai báo `AUTH_MOBILE_LOGIN_REDIRECT_URL`; Zod loại bỏ key lạ. | `libs/config/src/environment.ts`. |
| Giá trị deep link lấy từ đâu? | Scheme `bkpracticemobile` trong `app.json` của mobile và route `/auth/callback`. | Repo mobile; biến `EXPO_PUBLIC_AUTH_MOBILE_REDIRECT_URL`. |

## Đã làm gì

Gateway hiện chuyển tiếp được phản hồi `302` của Identity về deep link mobile sau khi Microsoft
callback thành công, thay vì trả `502`. Cụ thể:

- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` đọc `AUTH_MOBILE_LOGIN_REDIRECT_URL` khi
  khởi tạo và chỉ cho phép một `Location` không phải HTTP(S) khi protocol, host và path của nó trùng
  với URL mobile đã cấu hình. Các kiểm tra cũ vẫn giữ: không userinfo, không `access_token`,
  `refresh_token` hay `id_token` trong query/hash, và chỉ áp dụng cho hai route Microsoft.
- `libs/config/src/environment.ts` khai báo `AUTH_MOBILE_LOGIN_REDIRECT_URL` là URL tùy chọn trong
  schema `api-gateway`, để `ConfigService` thực sự nhận được giá trị.
- `apps/api-gateway/src/proxy/gateway-proxy.service.spec.ts` thêm test chuyển tiếp deep link đã cấu
  hình và từ chối deep link khác host/path.
- `.env.example` bổ sung key mẫu để người triển khai biết cần cấu hình.
- `.docs/specs/01-identity/authentication/tasks.md` ghi rõ phạm vi deep link mobile của ID-001-T029.

Sau thay đổi, luồng mobile có thể nhận `bkpracticemobile:///auth/callback?loginCode=...` qua Gateway;
trước đó Gateway luôn trả `502` ở bước này.

## Vì sao chọn cách này

- Chỉ mở đúng một URL đã cấu hình, không mở toàn bộ custom scheme. Điều này giữ nguyên tinh thần
  ID-001-FR-024: redirect đích do hệ thống cấu hình, người gọi không truyền vào.
- So khớp cả `protocol`, `host` và `pathname` để `bkpracticemobile://evil/auth/callback` hoặc
  `bkpracticemobile:///auth/other` vẫn bị chặn.
- Khai báo biến trong schema `api-gateway` thay vì đọc thẳng `process.env`, để giữ quy ước cấu hình
  tập trung và kiểm tra kiểu của repo.
- Không đụng `identity-service`: phía Identity đã tạo đúng `loginCode` và redirect mobile; lỗi nằm ở
  lớp proxy của Gateway.
- Không triển khai ID-009 (MSAL native) vì spec còn Proposed. Thay đổi này chỉ mở đường cho contract
  bàn giao mobile đã có trong mã nguồn hiện tại.

## Luồng hoạt động

1. Mobile gọi `GET /api/auth/microsoft` qua Gateway với `X-Client-Type: mobile` và
   `X-Mobile-Code-Challenge`.
2. Gateway chuyển tiếp tới Identity; Identity trả `302` tới Microsoft, Gateway giữ `Location` HTTP(S)
   như cũ.
3. Người dùng đăng nhập Microsoft; Microsoft gọi lại `GET /api/auth/microsoft/callback` qua Gateway.
4. Identity đổi mã Microsoft, tạo `loginCode` dùng một lần và trả `302` tới
   `AUTH_MOBILE_LOGIN_REDIRECT_URL` kèm `loginCode`.
5. Gateway kiểm tra `Location`: HTTP(S) như trước, hoặc deep link khớp đúng URL mobile đã cấu hình.
   Nếu hợp lệ, Gateway gửi `302` và header `Location` cho mobile.
6. Mobile mở app qua deep link, đọc `loginCode`, rồi gọi `POST /api/auth/microsoft/exchange` để đổi
   lấy token BKPractice.
7. Nhánh lỗi: URL mobile sai host/path, có userinfo, hoặc chứa bearer token trong query/hash vẫn trả
   `502 Invalid authentication redirect`.

## Cấu hình

- `.env.example`: thêm `AUTH_MOBILE_LOGIN_REDIRECT_URL` với giá trị deep link mẫu của app mobile.
- `apps/api-gateway`: đọc `AUTH_MOBILE_LOGIN_REDIRECT_URL` từ `ConfigService`; đây là URL duy nhất
  được phép dùng scheme ngoài HTTP(S).
- `identity-service`: không đổi; vẫn dùng cùng key để tạo redirect mobile.
- File `.env` thật của môi trường chạy cần có key này; giá trị phải khớp scheme/path của app mobile.
  Không ghi giá trị runtime vào tài liệu này.

## Kiểm chứng

- `pnpm jest apps/api-gateway/src/proxy/gateway-proxy.service.spec.ts libs/config/src/environment.spec.ts --silent`:
  pass, 21 test.
- `pnpm exec eslint` trên ba file thay đổi: pass.
- `pnpm build:gateway`: pass.
- `curl` vào Gateway đang chạy: `GET /api/auth/microsoft` với header mobile trả `302` và `Location`
  trỏ tới `login.microsoftonline.com`.
- `pnpm lint` và `pnpm typecheck` toàn repo: fail ở `test/account-import.integration.spec.ts` vì
  `ProfileAccount.officialName` không tồn tại. Lỗi này có sẵn, không liên quan thay đổi này.
- Chưa kiểm chứng bằng một lượt đăng nhập Microsoft thật trên thiết bị, vì cần tài khoản trường và
  callback hợp lệ.

## Còn lại

- Chưa chạy full end-to-end trên thiết bị thật sau khi Gateway restart.
- `libs/config/src/environment.ts` vẫn bắt `AUTH_MOBILE_LOGIN_REDIRECT_URL` phải bắt đầu bằng
  `https://` khi `NODE_ENV=production`. Deep link mobile dùng custom scheme nên điều kiện này sẽ chặn
  triển khai production; cần xử lý riêng nếu triển khai môi trường production.
- ID-009 (MSAL native) vẫn Proposed; không nằm trong phạm vi thay đổi này.
