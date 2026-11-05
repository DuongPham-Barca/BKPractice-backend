# 2026-11-05 — Implement Submission Gateway transport

- Author: Codex
- Scope: GW-008–GW-011; áp dụng ponytail ultra, tái sử dụng HTTP proxy và Redis subscriber. GW-011 còn một quyết định xác thực chờ người dùng.

## Spec and plan

- Spec: `.docs/specs/gateway/submission/{run-code,submit-code,submission-history,realtime-result}/spec.md`, đều Approved 0.3 khi bắt đầu.
- Plan: `plan.md` trong bốn thư mục trên; Gateway Layered Architecture theo ADR 0002.
- Tasks: `tasks.md` tương ứng, cập nhật theo bằng chứng và giữ các mục chưa xác minh.
- Spec status at start: Approved. Không sửa spec trong lượt triển khai này.

## Questions clarified

| Question | Conclusion | Source |
| -------- | ---------- | ------ |
| Phạm vi là Gateway hay nghiệp vụ Submission? | Gateway theo bốn spec vừa được duyệt; không thay DTO, database hoặc use case Submission. | GW-008–GW-011 và plan |
| Có cần thêm HTTP client, rate limit theo user, dependency hoặc cấu hình không? | Không; proxy, middleware, throttler và ioredis hiện có đáp ứng. | GW-008–GW-010 FR-007, plan |
| Owner và payload realtime lấy từ đâu? | Owner từ token/envelope đã kiểm tra; payload chỉ notification allowlist hiện có. | GW-011 FR-003/004/006/007; parser và shared contracts |
| Token còn hạn có ngừng nhận khi logout/khóa không? | Chưa chốt: FR-011/SR-005 và SUB-004 nói không thu hồi tức thời; bảng lỗi GW-011 có thêm một dòng yêu cầu ngừng khi khóa. Đã hỏi người dùng theo Step 3; giữ session check baseline cho tới khi được chốt. | GW-011, ID-001, SUB-004; working-agreement |
| Kiểm tra Redis có ảnh hưởng HTTP không? | Lease nằm riêng trong realtime; HTTP không dùng Redis. | Gateway proxy và composition root |

## What was done

HTTP Submission nay dùng allowlist đúng bốn method/path: POST `/api/run`, POST `/api/submissions`, GET `/api/submissions`, GET `/api/submissions/:publicId`. Các route cùng prefix nhưng không được duyệt bị chặn. Kiểm tra traversal/encoded slash/backslash hiện có của Learning được tái sử dụng cho Submission. Method/path/query/body, status/body upstream và request ID được giữ; cookie và header nội bộ không được chuyển tiếp. Logging chỉ ghi request ID và status. Tests bổ sung kiểm tra caller đã xác thực, header giả mạo, response lỗi và boundary.

Realtime được bổ sung từ chối danh tính/room client chọn qua auth/query, kiểm tra exp, đóng socket đúng hạn và giải phóng tài nguyên. Adapter `SubmissionSocketLeases` dùng Redis sorted set theo owner, Lua nguyên tử với Redis TIME, tối đa 5 lease, TTL 60 giây. Gateway gia hạn mỗi 10 giây và kiểm tra lease trước emit; lease lỗi/mất thì đóng socket. Mỗi lease dùng UUID riêng; disconnect giải phóng, process chết thì TTL dọn suất. Kết nối mới bị từ chối nếu Redis không ready. Redis subscriber bắt lỗi subscribe/connect, log chung không chứa lỗi/payload nhạy cảm và đóng bằng disconnect để không treo shutdown khi Redis unavailable.

Parser notification allowlist được giữ nguyên; Redis vẫn chỉ truyền tin best-effort, không replay. Gateway dùng map kết nối local để quản lý timer/lease và gửi chỉ tới owner tương ứng, mỗi instance nhận qua subscriber riêng. Session check baseline vẫn được giữ vì mâu thuẫn spec còn chờ trả lời; GW-011 chưa hoàn tất toàn bộ contract.

## Why these choices

Dùng allowlist và cùng bộ kiểm tra path để chặn route nội bộ mà không tạo controller/use case nghiệp vụ. Lua làm việc cấp/gia hạn suất nguyên tử giữa các process; Redis TIME tránh khác đồng hồ giữa Gateway. TTL thu hồi suất của process chết. Ioredis đã có sẵn; không thêm package. Lease là trạng thái transport kỹ thuật, không lưu kết quả nghiệp vụ. Presentation chỉ gọi application service, application gọi Redis adapter đúng chiều kiến trúc.

## How the feature works

1. HTTP đi qua middleware xác thực có sẵn, bỏ header định danh giả mạo và đặt trusted context.
2. Proxy kiểm tra đường dẫn, chọn đúng Submission upstream từ method/path rồi chuyển request nguyên dạng; giữ response hoặc trả lỗi Gateway chung khi kết nối upstream lỗi.
3. Socket kiểm tra auth/query, token và origin nếu dùng cookie, rồi xin lease cho subject đã xác minh. Không có lease thì từ chối.
4. Socket join room owner, có timer đóng lúc exp và heartbeat gia hạn lease. Disconnect/expiry giải phóng lease. Redis lỗi chỉ ảnh hưởng realtime.
5. Subscriber kiểm tra envelope qua parser hiện có; Gateway chỉ phát notification tới kết nối đúng owner còn hạn/còn lease. Không lưu hoặc phát lại notification; client vẫn dùng History.
6. Nhánh session-revocation vẫn là baseline, chờ chốt xung đột GW-011 trước khi đổi.

## Configuration

Không đổi biến môi trường, port, Docker hoặc runtime config. Dùng `REDIS_URL` và `JWT_ACCESS_SECRET` hiện có. `tsconfig.json`/`jest.config.ts` thêm mapping chính xác cho hai barrel Gateway `@/infrastructure/redis` và `@/application/realtime`, giữ mapping Identity hiện tại. Barrels được thêm tại các folder source sửa đổi.

## Verification

- HTTP mục tiêu: 149 tests pass (proxy + auth middleware).
- Realtime gateway: 11 tests pass; parser tests hiện có pass trong toàn bộ suite.
- Redis lease/subscriber: 3 tests pass; có kiểm tra initial outage/reconnect, từ chối lease lỗi và release.
- `pnpm build:gateway`: pass; webpack xử lý alias thành công.
- Lint riêng Gateway thay đổi: pass.
- `pnpm lint`: fail tại 2 lỗi `officialName` trong `test/account-import.integration.spec.ts`, ngoài thay đổi này.
- `pnpm typecheck`: fail tại 5 lỗi `officialName` cùng file trên; không có lỗi ở Gateway.
- `pnpm test`: sandbox chặn localhost bằng EPERM; chạy lại với quyền mở localhost: 122 suites pass, 931 tests pass; 9 suites/54 tests skipped; một suite account-import không biên dịch vì lỗi `officialName` nêu trên.
- `git diff --check`: pass.
- Not verified: Redis thật/nhiều process Gateway, end-to-end polling với Submission/database. Môi trường chạy Node 20.19.6 trong khi package yêu cầu Node >=22.

## Remaining

- Not done: Chốt mâu thuẫn vòng đời token GW-011, cập nhật nhánh session và tests theo lựa chọn được duyệt; xác minh Redis thật và polling có database. Không đánh dấu GW-011 hoàn tất.
- Risks: Code realtime hiện còn session check trước emit nên chưa khớp yêu cầu không thu hồi tức thời ở FR-011/SR-005. Kiểm tra toàn repo còn lỗi account-import ngoài phạm vi; không sửa các thay đổi không liên quan.
