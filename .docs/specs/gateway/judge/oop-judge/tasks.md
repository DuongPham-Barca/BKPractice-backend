# GW-015 Công việc Gateway — OOP Judge

Đặc tả liên quan: `./spec.md`  
Kế hoạch liên quan: `./plan.md`

> GW-015 đã Approved; checklist theo dõi công việc triển khai Gateway.

## Chuẩn bị

- [x] Xác nhận spec Approved và đọc lại architecture/SUB/GW dependencies.
- [x] Kiểm tra worktree, proxy mapping, upstream config, imports và realtime path.
- [x] Xác nhận phần JDG-004 vẫn không định nghĩa public API Judge.

## Kiểm tra ranh giới

- [x] Xác nhận không có route/controller/upstream Gateway trực tiếp tới Judge cho chấm oop.
- [x] Xác nhận Run/Submit đi tới Submission; không có path/header/query rewrite tới Judge.
- [x] Xác nhận không có payload/contract chấm oop nội bộ trong public DTO, Swagger hoặc logs.
- [x] Xác nhận realtime chỉ chuyển notification allowlist theo GW-011.
- [x] Xác nhận không có Judge imports/config/database/persistence trong Gateway.

## Xử lý sai lệch và xác minh

- [x] N/A — Không phát hiện public exposure; không cần sửa code hoặc thêm test hồi quy theo plan.
- [x] Ghi N/A cho code/test change: proxy chỉ có Identity/Learning/Submission/Community; parser dựng lại notification allowlist. Xem bằng chứng bên dưới.
- [x] N/A — Không đổi source/config nên không chạy lint/typecheck/build toàn repo; đã chạy 4 suite liên quan và kiểm tra hành vi trong bộ nhớ. Không chạy migration.
- [x] Đối chiếu FR/AC và ghi kết quả thật vào worked entry.

## Không áp dụng

- [x] N/A — Judge API, pipeline implementation, runner/sandbox code, database/migration và RabbitMQ adapter trong Gateway không thuộc kiến trúc.

## Bằng chứng xác minh — 2026-11-05

- `gateway-proxy.constants.ts` và `GatewayProxyService.forward`: Run/Submit tới `SUBMISSION_SERVICE_URL`; không có Judge upstream, URL đích không lấy từ client, không follow redirect.
- `GatewayProxyController`, `ApiGatewayModule`, `main.ts` và schema `api-gateway` trong `libs/config/src/environment.ts`: không đăng ký Judge API/DTO/config/persistence; Socket.IO chỉ có namespace `/submissions`, không có handler gọi Judge.
- `parseSubmissionRealtimeEnvelope` dựng notification chỉ gồm `submissionId/kind/status/ready`; gateway chỉ emit notification cho owner. Log proxy chỉ có request ID/status; log realtime không chứa payload.
- 4 suite hiện có (proxy, auth middleware, realtime parser, realtime gateway): pass. Kiểm tra trong bộ nhớ: 84 request Judge bị route miss, 2 request Run/Submit giả chọn upstream vẫn tới Submission, 3 path không an toàn bị chặn; notification RUN/SUBMIT bỏ dữ liệu nội bộ và từ chối raw result.
- [Worked entry và đối chiếu FR/SR/AC](../../../../worked/api-gateway/oop-judge/2026-11-05-verify-gateway-judge-boundary.md). Chỉ xác minh boundary của GW-015; không kết luận toàn bộ GW-011 hoặc JDG-004 đã hoàn tất.
