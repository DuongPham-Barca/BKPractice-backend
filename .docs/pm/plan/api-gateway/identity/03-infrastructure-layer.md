# GW-001 / 3 — Tầng infrastructure

- Nguồn: [spec](../../../../specs/gateway/identity/spec.md), [plan](../../../../specs/gateway/identity/plan.md), [tasks](../../../../specs/gateway/identity/tasks.md).
- Task: GW-001-T011–T013.
- Phụ thuộc: không có; đây là tầng thấp nhất.

## Trình tự thực hiện

1. Tạo `infrastructure/identity/identity-session.client.ts`: HTTP GET tới `IDENTITY_SERVICE_URL/internal/auth/session` với `authorization: Bearer <token>`, timeout ngắn; map `204` → active, `401` → inactive, lỗi/khác → unavailable.
2. Tạo `infrastructure/redis/submission-result.subscriber.ts`: kết nối ioredis, đăng ký `REDIS_CHANNELS.submissionResults`, quản lý vòng đời `OnModuleInit`/`OnApplicationShutdown`, log một lần khi Redis không khả dụng và phục hồi khi reconnect.
3. Viết `identity-session.client.spec.ts`: bao phủ mapping trạng thái, URL và header của request.

## Bàn giao và kiểm chứng

- Adapter không rò rỉ token hay credential vào log; không sở hữu quy tắc nghiệp vụ.
- `SubmissionResultSubscriber` chỉ chuyển message thô cho application xử lý.
- Test: `identity-session.client.spec.ts` pass.
- Truy vết: GW-001-FR-004; GW-001-AC-005.
