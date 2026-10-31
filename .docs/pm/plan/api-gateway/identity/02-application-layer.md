# GW-001 / 2 — Tầng application

- Nguồn: [spec](../../../../specs/gateway/identity/spec.md), [plan](../../../../specs/gateway/identity/plan.md), [tasks](../../../../specs/gateway/identity/tasks.md).
- Task: GW-001-T007–T010.
- Phụ thuộc: adapter ở [phần 3](03-infrastructure-layer.md) cho session và subscriber.

## Trình tự thực hiện

1. Tạo `application/proxy/` và di chuyển `GatewayProxyService` nguyên hành vi: chọn upstream theo prefix, forward request/phản hồi, xử lý cookie và redirect OAuth.
2. Tạo `application/auth/gateway-session.service.ts`: use case kiểm tra session qua `IdentitySessionClient`; ném `ServiceUnavailableException` khi Identity không khả dụng, trả `true/false` cho trạng thái active/inactive.
3. Tạo `application/realtime/submission-result.parser.ts` (tách parser + whitelist envelope khỏi gateway cũ) và `application/realtime/submission-results.service.ts` (nhận message từ subscriber, parse và dispatch handler).
4. Viết spec tương ứng: `gateway-session.service.spec.ts`, `submission-result.parser.spec.ts`; bảo toàn các ca kiểm thử parser đã có.

## Bàn giao và kiểm chứng

- Application chỉ phụ thuộc `infrastructure/` và contract chia sẻ; không chứa quy tắc nghiệp vụ của dịch vụ khác.
- Session fail-closed khi Identity không khả dụng; message realtime sai bị bỏ, không phát tới socket.
- Test: `gateway-session.service.spec.ts`, `submission-result.parser.spec.ts` pass.
- Truy vết: GW-001-FR-003; GW-001-AC-003, GW-001-AC-005.
