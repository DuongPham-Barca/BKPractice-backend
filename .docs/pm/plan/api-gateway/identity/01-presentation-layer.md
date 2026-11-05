# GW-001 / 1 — Tầng presentation

- Nguồn: [spec](../../../../specs/gateway/identity/spec.md), [plan](../../../../specs/gateway/identity/plan.md), [tasks](../../../../specs/gateway/identity/tasks.md).
- Task: GW-001-T002–T006.
- Phụ thuộc: các use case ở [phần 2](02-application-layer.md) phải tồn tại để middleware và realtime gateway inject được.

## Trình tự thực hiện

1. Tạo `presentation/controllers/`, `presentation/middleware/`, `presentation/guards/`, `presentation/realtime/`.
2. Di chuyển `GatewayProxyController` vào `presentation/controllers/`; giữ route `/api/{*path}`, bỏ qua Swagger; import `GatewayProxyService` qua `@gateway/application/proxy/gateway-proxy.service`.
3. Di chuyển `GatewayAuthMiddleware` vào `presentation/middleware/`; giữ nguyên xác thực Bearer/cookie, CSRF, kiểm tra origin và việc xoá header định danh giả mạo; thay `GatewaySessionVerifier` bằng `GatewaySessionService`.
4. Di chuyển `GatewayThrottling` vào `presentation/guards/`; giữ nguyên giới hạn theo đường dẫn.
5. Viết lại `SubmissionRealtimeGateway` trong `presentation/realtime/` thành boundary Socket.IO thuần: xác thực token/cookie, join `user:<id>`, inject `GatewaySessionService` và `SubmissionResultsService`, forward kết quả realtime. Không còn ioredis hay parser trong file này.
6. Di chuyển các spec (`gateway-auth.middleware.spec.ts`, `gateway-throttling.spec.ts`, `submission-realtime.gateway.spec.ts`) và `profile-cookie.integration.spec.ts` vào `presentation/`, cập nhật import.

## Bàn giao và kiểm chứng

- Presentation KHÔNG import trực tiếp `infrastructure/`; mọi truy cập IO đi qua application.
- Hành vi định tuyến, xác thực, cookie, CSRF, throttling và realtime không đổi.
- Test: `gateway-auth.middleware.spec.ts`, `gateway-throttling.spec.ts`, `submission-realtime.gateway.spec.ts`, `profile-cookie.integration.spec.ts` pass.
- Truy vết: GW-001-FR-002, GW-001-FR-007; GW-001-AC-002, GW-001-AC-005.
