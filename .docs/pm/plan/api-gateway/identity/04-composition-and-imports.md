# GW-001 / 4 — Composition root và import

- Nguồn: [spec](../../../../specs/gateway/identity/spec.md), [plan](../../../../specs/gateway/identity/plan.md), [tasks](../../../../specs/gateway/identity/tasks.md).
- Task: GW-001-T006, GW-001-T014.
- Phụ thuộc: [phần 1](01-presentation-layer.md), [phần 2](02-application-layer.md), [phần 3](03-infrastructure-layer.md).

## Trình tự thực hiện

1. Cập nhật `api-gateway.module.ts` để import mọi thành phần qua alias `@gateway/*`, nhóm provider theo tầng (presentation, application, infrastructure).
2. Đăng ký đủ provider: `GatewayProxyService`, `GatewaySessionService`, `SubmissionResultsService`, `IdentitySessionClient`, `SubmissionResultSubscriber`, `GatewayAuthMiddleware`, `SubmissionRealtimeGateway`; giữ `ThrottlerGuard` (APP_GUARD) và `HealthModule`.
3. Cập nhật `test/account-import.integration.spec.ts`: import theo đường dẫn mới và provide `GatewaySessionService` cùng `IdentitySessionClient`.
4. Rà soát không còn import theo đường dẫn cũ `auth/`, `proxy/`, `realtime/`.

## Bàn giao và kiểm chứng

- Chỉ module là nơi nối dependency; các tầng không tự `new` adapter.
- `pnpm build:gateway` thành công; `pnpm test apps/api-gateway` xanh.
- Truy vết: GW-001-FR-008; GW-001-AC-004, GW-001-AC-005, GW-001-AC-006.
