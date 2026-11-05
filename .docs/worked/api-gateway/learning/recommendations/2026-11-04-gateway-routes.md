# 2026-11-04 — GW-007 Gateway Recommendation

- Author: Codex
- Scope: API Gateway transport cho Learning/recommendations.

## Spec and plan

- Spec: [GW-007 spec](../../../../specs/gateway/learning/recommendations/spec.md).
- Plan: [plan](../../../../specs/gateway/learning/recommendations/plan.md).
- Tasks: [tasks](../../../../specs/gateway/learning/recommendations/tasks.md).
- Spec status at start: Approved; người dùng phê duyệt toàn bộ Gateway/Learning.

## Questions clarified

| Question                               | Conclusion                                                                                | Source                                             |
| -------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Mở mọi method trên prefix?             | Chỉ 1 method/path trong bảng spec; spec thắng mô tả prefix chung của plan.                | GW-007 Đầu vào; working agreement Sources of truth |
| Gateway có kiểm tra quyền/state không? | Chỉ xác thực; Learning sở hữu toàn bộ nghiệp vụ, quyền và principal target.               | GW-007 Quy tắc phân quyền; ADR 0002                |
| Có thay auth/config không?             | Dùng hợp đồng biên GW-002, LEARNING_SERVICE_URL và policy hiện có; không có cấu hình mới. | GW-007 FR-004–010; plan                            |

## What was done

Bổ sung GET /api/recommendations riêng, tránh va chạm slug Problem; không mở route ghi hoặc route chọn người dùng mục tiêu.

`GatewayProxyService` có allowlist method/path cho Learning, chuyển đúng upstream và giữ method/path/query/body/status.
Test matrix trong `gateway-proxy.service.spec.ts` kiểm tra đủ 1 route của GW-007, trong tổng 70 route Learning.
Hardening dùng chung gồm path traversal, x-internal-*, metadata JWT, cookie/CSRF, response filtering và log an toàn.
Chi tiết source và toàn bộ bằng chứng bảo mật ở [worked GW-002](../problems/2026-11-04-gateway-routes.md).

## Why these choices

Dùng proxy, auth middleware và HTTP client sẵn có theo Layered Architecture; không thêm controller, module,
DTO nghiệp vụ, cache, persistence hoặc dependency. Allowlist mô tả surface transport, Learning giữ quyền và state.
Các prefix Identity/Submission/Community giữ cách chọn route hiện hữu.

## How the feature works

1. Client gọi một route được duyệt; RequestIdMiddleware giữ/sinh ID và trả header về client.
2. GatewayAuthMiddleware bỏ x-auth-* giả, xác minh JWT/session qua Identity và Origin/CSRF cho cookie unsafe methods.
3. Proxy từ chối path gốc khác path đã khớp, dot/backslash/encoding nguy hiểm; chọn method/path đúng allowlist.
4. Proxy bỏ cookie/x-internal-*, giữ nguyên query/body, gửi metadata đã xác minh tới LEARNING_SERVICE_URL.
5. Learning quyết định nghiệp vụ; Gateway giữ status/body và header allowlist, giữ correlation ID của Gateway.
6. Token lỗi trả 401, Identity unavailable 503, cookie Origin/CSRF sai 403, traversal 400;
   không có route hoặc upstream outage/timeout 502; default rate limit 429. Nhánh bị chặn không gọi Learning.

## Configuration

No configuration change.

## Verification

- `pnpm test apps/api-gateway`: 8 suites / 196 tests pass; baseline trước sửa: 42 tests pass.
- `pnpm exec eslint apps/api-gateway/src`, `pnpm exec tsc --noEmit -p apps/api-gateway/tsconfig.app.json`, `pnpm build:gateway`: pass.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: chưa pass do lỗi officialName có sẵn trong test/account-import.integration.spec.ts;
  toàn suite có 898 tests pass / 54 skipped / 1 suite lỗi biên dịch. Chi tiết lệnh và vị trí lỗi: worked GW-002.
- FR-001–003/007: route matrix, rejected methods/paths, query lặp/rỗng và response allowlist/status.
- FR-004–006 và SR-001–003: test ghép RequestId/auth/proxy với JWT thật, session stub, cookie/CSRF và header giả mạo.
- FR-008: traversal/nested encoding/internal paths không gọi upstream; FR-009: ID/log chỉ requestId/status,
  policy mặc định trên HTTP localhost thật, request 121 trả 429 cho mỗi họ Learning.
- FR-010/SR-004–005: diff không có business policy, persistence, source import Learning hoặc lọc/tổng hợp dữ liệu.
- AC chất lượng toàn repo/DoD chưa đạt; giữ spec Approved. Test không bỏ qua các kiểm tra để báo xanh.
- Chưa kiểm chứng deployment thật; transport integration dùng HTTP stub, throttling dùng controller test với policy thật.

## Remaining

- Not done: smoke test Gateway + Learning + Identity thật, kiểm thử Node >=22, sửa account-import ngoài phạm vi.
- Risks: môi trường hiện tại Node 20.19.6 thấp hơn engine yêu cầu; các suite integration skipped sẵn chưa được xác minh.
  Auth middleware dùng chung nay từ chối JWT thiếu exp hoặc claim định danh sai kiểu, theo contract token Identity.
