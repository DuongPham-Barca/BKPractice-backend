# 2026-11-04 — GW-002 Gateway problems

- Author: Codex
- Scope: API Gateway transport cho Learning/problems; phần hardening dùng chung GW-002–GW-007.

## Spec and plan

- Spec: [GW-002 spec](../../../../specs/gateway/learning/problems/spec.md).
- Plan: [plan](../../../../specs/gateway/learning/problems/plan.md).
- Tasks: [tasks](../../../../specs/gateway/learning/problems/tasks.md).
- Spec status at start: Approved; người dùng phê duyệt toàn bộ `.docs/specs/gateway/learning`.
- Không sửa nội dung spec Approved hoặc các thay đổi tài liệu có sẵn trong worktree.

## Questions clarified

| Question                                                | Conclusion                                                                                                                                                                         | Source                                                                   |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Mở cả prefix hay chỉ các cặp method/path?               | Chỉ bảng route đã duyệt; bảng spec thắng mô tả prefix chung trong plan. Không có route upstream dùng lỗi 502 hiện hữu.                                                             | GW-002 Đầu vào; GW-002 FR-001/FR-012; working agreement Sources of truth |
| Ai kiểm tra quyền và sở hữu?                            | Learning sở hữu toàn bộ nghiệp vụ; Gateway chỉ xác thực và đặt principal.                                                                                                          | GW-002 Quy tắc phân quyền; ADR 0002; architecture/api-gateway.md         |
| Header nội bộ nào cần chặn?                             | Guard Learning dùng x-internal-service-secret. Proxy loại cả họ x-internal-* để client không đặt metadata nội bộ; middleware xoá cả họ x-auth-* và đặt lại metadata đã kiểm chứng. | GW-002 FR-006–008, SR-002/SR-008; Learning internal-service.guard.ts     |
| Cookie, CSRF, permissions và correlation xử lý thế nào? | Giữ contract hiện có; permissions thiếu/sai kiểu thành rỗng; giữ ID do Gateway sinh/nhận thay vì thay bằng ID upstream.                                                            | GW-002 FR và Đầu ra; GW-002 FR-007/009/013; RequestIdMiddleware          |
| Có thêm cấu hình, persistence, module hay alias không?  | Không; dùng LEARNING_SERVICE_URL hiện có. Không thêm import local mới hoặc module mới; giữ aliases hiện hữu. Không có .codegraph nên không khởi tạo index.                         | Plan; working agreement; trạng thái repository                           |

## What was done

Problem, các thao tác lifecycle, Test Case và harness chỉ được mở theo đúng bảng route. Route judge-package nội bộ không có trong allowlist.

`GatewayProxyService` có allowlist transport tĩnh cho đủ 70 cặp method/path Learning, trong đó 21 cặp thuộc GW-002.
Nó thay việc mở mọi method trên prefix Learning bằng khớp method/path đầy đủ, thêm Progress và Recommendation,
kiểm tra path gốc khớp path đã chọn, từ chối dot segment/backslash và dạng encoding nguy hiểm trước HTTP client.
Query giữ nguyên byte encoding và thứ tự/lặp key; body JSON giữ nguyên object và được chuyển cả trên GET Learning.
Các prefix Identity/Submission/Community giữ cách chọn route hiện hữu.

`GatewayAuthMiddleware` xoá cả họ x-auth-* trước khi đặt lại user/roles/permissions và client IP từ transport.
Nó xác minh kiểu string của sub/sid/jti và yêu cầu exp, cùng chữ ký, hạn dùng, type, roles và session hiện có.
Proxy xoá x-internal-* khỏi mọi request công khai. Response giữ status/body và allowlist header cũ;
Cookie/Set-Cookie không đi qua biên Learning. Log Learning chỉ chứa requestId và status.

Các test được thêm vào `gateway-proxy.service.spec.ts`, `profile-cookie.integration.spec.ts`
và `gateway-throttling.spec.ts`, không thêm controller/module production hoặc dependency.

## Why these choices

- Dùng proxy và middleware sẵn có theo chiều presentation → application → infrastructure; không cần abstraction nghiệp vụ mới.
- Allowlist là cấu hình API ở biên theo bảng spec, không kiểm tra DTO, quyền, ownership hoặc state của Learning.
- Từ chối path nguy hiểm thay vì rewrite để HTTP client không chọn đích khác và query vẫn giữ nguyên.
- Giữ policy 120 requests/phút mặc định, response filtering, session verification và CSRF thay vì tạo cơ chế mới.
- Kiểm thử route matrix và trường hợp không gọi upstream được thêm trước sửa proxy: 43 test thất bại xác nhận lỗ hổng, sau sửa đều pass.

## How the feature works

1. Client gọi route Learning; RequestIdMiddleware giữ/sinh ID và đặt trên response.
2. GatewayAuthMiddleware bỏ metadata giả, xác minh JWT và session qua Identity, rồi kiểm tra Origin/CSRF nếu dùng cookie với method unsafe.
3. Proxy so path đã khớp với raw path, kiểm tra các lớp encoding, chọn đúng method/path trong allowlist tới LEARNING_SERVICE_URL.
4. Proxy bỏ header nội bộ và cookie, giữ method/path/query/body và chuyển metadata đã xác minh.
5. Learning quyết định nghiệp vụ; proxy trả nguyên status/body, chỉ chuyển các header response cho phép và giữ correlation ID Gateway.
6. Thiếu/sai/hết hạn/thu hồi token trả 401; Identity unavailable 503; cookie Origin/CSRF sai 403;
   traversal 400; route không được công bố hoặc upstream outage/timeout 502. Các nhánh bị chặn không gọi Learning.
   Vượt default rate limit trả 429. Lỗi Gateway không chứa thông tin nội bộ.

## Configuration

No configuration change.

## Verification

- Baseline `pnpm test apps/api-gateway`: 8 suites / 42 tests pass khi chạy ngoài sandbox hạn chế localhost.
- Test trước sửa proxy: 43 failed / 73 passed; sau triển khai: `pnpm test apps/api-gateway` có 8 suites / 196 tests pass.
- `pnpm exec eslint apps/api-gateway/src`: pass.
- `pnpm exec tsc --noEmit -p apps/api-gateway/tsconfig.app.json`: pass.
- `pnpm build:gateway`: pass.
- `pnpm lint`: fail ở test/account-import.integration.spec.ts:238,241 do officialName không còn trong type.
- `pnpm typecheck`: fail 5 lỗi officialName trong cùng file (236,238,241,348,383), không thuộc diff Gateway.
- `pnpm test`: 120 suites pass, 1 fail khi biên dịch file account-import trên, 9 suites skipped;
  898 tests pass / 54 skipped. Không tuyên bố toàn repo xanh.
- Test socket ban đầu bị sandbox EPERM; chạy lại với quyền localhost và pass, không sửa production để né sandbox.
- Runtime hiện tại Node 20.19.6, package yêu cầu >=22; pnpm 10.33.0 phát cảnh báo engine.
- Không có migration, dependency, secret, runtime env, business persistence hoặc import source Learning được thêm.
- Chưa kiểm chứng: smoke test với các service thật; môi trường Node >=22; các suite integration đang skipped sẵn.

Đối chiếu yêu cầu:

| Phạm vi                                                             | Bằng chứng                                                                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route, segment boundary, query/body, response (GW-002 FR transport) | Matrix 21 route trong proxy spec; rejected methods/paths; status 200/302/400/401/403/404/409/500/503 và header filtering                                |
| Token/session/principal, cookie/CSRF, header trust (GW-002 SR)      | Test ghép RequestId + auth + proxy: JWT thật; invalid/expired/revoked/malformed/no-expiry; Identity 503; cookie unsafe methods; metadata và permissions |
| Path nội bộ, traversal, upstream failure                            | Test raw/matched mismatch; dot/backslash/encoded và nested encoding cho sáu họ path; không gọi upstream; ECONNREFUSED/ETIMEDOUT → 502                   |
| Request ID, logging, default rate limit                             | Test giữ/sinh ID; log chỉ requestId/status; 120 request thành công, request 121 trả 429 trên mỗi họ Learning với policy thật                            |
| Kiến trúc và không có business rule                                 | Rà soát diff: chỉ proxy/auth technical layers và tests; không persistence, DTO nghiệp vụ, RBAC/state/cache hoặc import Learning                         |
| DoD/quality toàn repo                                               | Chưa đạt do lỗi account-import và chưa smoke test stack thật; không đổi spec sang Verified                                                              |

## Remaining

- Not done: sửa lỗi account-import ngoài phạm vi; smoke test stack thật; xác minh lại với Node >=22.
- Risks: các endpoint Learning được kiểm thử qua HTTP stub, chưa xác nhận deployment thật.
  Middleware dùng chung nay từ chối JWT thiếu exp hoặc claim định danh sai kiểu; token do Identity phát đúng contract vẫn tương thích.
