# 2026-10-31 — Chia lại API Gateway theo Layered Architecture

- Author: opencode
- Scope: Chia lại `apps/api-gateway` theo kiến trúc layered thuần:
  `presentation -> application -> infrastructure`.

## Spec and plan

- Spec: Không có feature spec. Đây là việc thay đổi kiến trúc do người dùng yêu cầu trực tiếp.
- Plan: [ADR 0002](../../adr/0002-revised-service-internal-architectures.md),
  [API Gateway Architecture](../../architecture/api-gateway.md) và
  [Dependency Rules](../../architecture/dependency-rules.md).
- Tasks: Không có `tasks.md` nào áp dụng.
- Spec status at start: N/A; không mở hay sửa feature spec nào.

## Questions clarified

| Câu hỏi                                                      | Kết luận                                                                                                 | Nguồn                                                      |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Chia gateway theo transport-only folders hay layered thuần?  | Layered thuần ba tầng `presentation/application/infrastructure`.                                         | Người dùng trả lời, 2026-10-31.                            |
| Gateway có thêm tầng domain không?                           | Không. Gateway không sở hữu business rule, entity hay database nào.                                      | `.docs/architecture/api-gateway.md`, mục Responsibilities. |
| HTTP tới upstream và Redis nằm ở đâu?                        | `infrastructure/`, để `presentation` không import trực tiếp.                                             | Yêu cầu layered thuần của người dùng; chiều phụ thuộc.     |
| Tài liệu nào phải sửa?                                       | `api-gateway.md` và `dependency-rules.md`. ADR 0002 đã chọn Layered Architecture nên không phải sửa ADR. | Working agreement bước 4; ADR 0002.                        |
| Có phải sửa đường dẫn cũ trong các plan/tasks lịch sử không? | Không. Chúng ghi lại quyết định trong quá khứ và không phải chỉ dẫn thực thi.                            | Working agreement, Documentation by module.                |

## What was done

Cây source của Gateway giờ được tổ chức theo tầng kỹ thuật:

```text
apps/api-gateway/src/
├── main.ts
├── api-gateway.module.ts
├── presentation/
│   ├── controllers/gateway-proxy.controller.ts
│   ├── middleware/gateway-auth.middleware.ts
│   ├── guards/gateway-throttling.ts
│   └── realtime/submission-realtime.gateway.ts
├── application/
│   ├── auth/gateway-session.service.ts
│   ├── proxy/gateway-proxy.service.ts
│   └── realtime/
│       ├── submission-result.parser.ts
│       └── submission-results.service.ts
└── infrastructure/
    ├── identity/identity-session.client.ts
    └── redis/submission-result.subscriber.ts
```

Các file được di chuyển, không đổi hành vi:

- `proxy/gateway-proxy.controller.ts` → `presentation/controllers/`.
- `auth/gateway-auth.middleware.ts` → `presentation/middleware/`.
- `auth/gateway-throttling.ts` → `presentation/guards/`.
- `realtime/submission-realtime.gateway.ts` → `presentation/realtime/`.
- `proxy/gateway-proxy.service.ts` → `application/proxy/`.
- `auth/gateway-session-verifier.ts` → tách thành
  `infrastructure/identity/identity-session.client.ts` (gọi HTTP và map trạng thái) và
  `application/auth/gateway-session.service.ts` (use case và lỗi khi không kiểm tra được session).
- Phần Redis của realtime chuyển sang `infrastructure/redis/submission-result.subscriber.ts`;
  parse envelope chuyển sang `application/realtime/submission-result.parser.ts`; dispatch handler
  chuyển sang `application/realtime/submission-results.service.ts`. Socket.IO gateway vẫn là
  presentation adapter.
- `api-gateway.module.ts` vẫn là composition root, nối application service với infrastructure
  adapter.
- `test/account-import.integration.spec.ts` import file Gateway theo đường dẫn mới và provide
  `GatewaySessionService` cùng `IdentitySessionClient`.

Trong bước xác minh, test này vẫn dùng tên trường cũ `officialName`/`official_name` sau khi migration
`1700000000006-InitializeImportedProfiles` đổi cột thành `display_name` (entity `User`, repository,
`AccountImportRow` và `ProfileAccount` đều dùng `displayName`). Đã cập nhật test sang
`displayName`/`display_name` để khớp schema hiện tại, nhờ đó `pnpm typecheck` và `pnpm test` xanh
toàn repo.

Các import nội bộ của application giờ dùng alias `@gateway/*` có sẵn. Không cần thêm alias mới.

## Why these choices

- Layered thuần là yêu cầu trực tiếp; các thư mục `auth/proxy/realtime` trước đây trộn boundary,
  orchestration và IO trong cùng một chỗ.
- Không tạo tầng domain vì Gateway chỉ xác thực, route và chuyển tiếp dữ liệu transport. Thêm entity
  hay repository abstraction sẽ là ceremony mà kiến trúc cấm.
- HTTP tới Identity và Redis subscription là infrastructure concern. Giữ chúng ở đó giúp
  `presentation` chỉ có đúng một chiều phụ thuộc xuống: `application`.
- Session và dispatch kết quả là application service vì chúng điều phối infrastructure adapter và
  được dùng chung bởi cả HTTP lẫn Socket.IO boundary.
- Hành vi, bảng route, kiểm tra token, xử lý cookie, rate limit và whitelist message được giữ
  nguyên; chỉ thay đổi vị trí file và cách nối dependency.

## How the feature works

Luồng HTTP:

1. Client gọi Gateway.
2. `RequestIdMiddleware` và `GatewayAuthMiddleware` chạy ở tầng presentation.
3. Auth middleware xác minh access token và hỏi `GatewaySessionService` xem session còn active
   không; service này gọi `IdentitySessionClient`, nơi sở hữu request tới Identity
   `/internal/auth/session` và map `204`/`401`/các status khác.
4. Request đến `GatewayProxyController`, controller giao cho `GatewayProxyService`.
5. `GatewayProxyService` chọn upstream theo prefix route, chuyển tiếp request rồi copy các response
   header, cookie và redirect được duyệt.
6. Caller nhận response từ upstream qua Gateway.

Luồng realtime:

1. Socket.IO client kết nối tới namespace `/submissions`.
2. `SubmissionRealtimeGateway` xác minh token, kiểm tra session và join `user:<id>`.
3. `SubmissionResultSubscriber` nhận message từ `REDIS_CHANNELS.submissionResults`.
4. `SubmissionResultsService` whitelist-parse từng message và dispatch envelope hợp lệ.
5. Gateway kiểm tra lại session của từng socket rồi emit `submission.result`; socket inactive bị
   ngắt kết nối.

Hành vi lỗi giữ nguyên: token thiếu hoặc sai bị từ chối, kiểm tra session không khả dụng thì fail
closed, route không có upstream trả `BadGatewayException`, message realtime sai bị bỏ và Redis
không khả dụng chỉ log một lần cho tới khi reconnect.

## Configuration

Không thay đổi cấu hình.

## Verification

- `pnpm test apps/api-gateway`: 8 suite, 39 test pass.
- `pnpm eslint "apps/api-gateway/**/*.ts"`: pass.
- `pnpm build:gateway`: pass.
- `pnpm lint`: pass toàn repo.
- `pnpm typecheck`: pass toàn repo.
- `pnpm test`: 119 suite pass, 10 skip, 0 fail; 727 test pass, 62 skip.
- `pnpm build`: cả 6 service build thành công.
- Chưa kiểm chứng: các service upstream Identity/Learning/Submission/Community thật. Môi trường
  đang chạy Node 20.19.6 trong khi repository yêu cầu Node 22 trở lên.

## Remaining

- Chưa làm: các file `plan.md`/`tasks.md` lịch sử vẫn nhắc đường dẫn cũ `auth/`, `proxy/` và
  `realtime/`. Không sửa vì chúng ghi lại công việc trong quá khứ.
- Rủi ro: Gateway giờ có tầng `application/`. Đây là kiến trúc người dùng yêu cầu và đã được ghi
  trong `api-gateway.md` và `dependency-rules.md`; công việc Gateway sau này phải giữ phụ thuộc
  theo hướng `presentation -> application -> infrastructure`.
