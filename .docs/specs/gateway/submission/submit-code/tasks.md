# GW-009 Công việc Gateway — Định tuyến Submit qua API Gateway

Đặc tả liên quan: `./spec.md`
Kế hoạch liên quan: `./plan.md`

> GW-009 đã Approved; checklist theo dõi công việc triển khai Gateway.

## Chuẩn bị

- [x] Xác nhận spec Approved và các route khớp với SUB plan đã Approved.
- [x] Kiểm tra `git status`, giữ nguyên thay đổi sẵn có.
- [x] Rà soát proxy/controller/middleware và mapping Submission upstream.

## Định tuyến và transport

- [x] Xác nhận từng method/path của spec tới đúng Submission upstream.
- [x] Bảo toàn method, path, query, body, response status/body.
- [x] Đảm bảo POST trả response `202` nguyên trạng, không chờ kết quả Judge.
- [x] Không thêm route nội bộ, DTO nghiệp vụ, rewrite, cache hoặc persistence.

## Bảo mật

- [x] Xác minh request chưa xác thực bị chặn trước upstream.
- [x] Xác minh header định danh client bị loại bỏ và trusted metadata được đặt từ token.
- [x] Xác minh logging/lỗi không lộ token, cookie hoặc thông tin upstream.

## Kiểm thử và xác minh

- [x] Bổ sung/điều chỉnh test map tới FR/AC cho route, passthrough, auth và lỗi upstream.
- [x] Chạy test Gateway mục tiêu qua script có sẵn.
- [ ] Toàn bộ kiểm tra repo pass — đã chạy; lint/typecheck và một test suite bị chặn bởi lỗi `officialName` trong `test/account-import.integration.spec.ts`. Build Gateway, lint Gateway và tests Gateway pass.
- [x] Đối chiếu implementation với spec/plan; cập nhật tasks bằng bằng chứng thực tế.
- [x] Ghi worked entry và phần chưa xác minh.

## Không áp dụng

- [x] N/A — domain, database, migration, RabbitMQ và judge execution không thuộc thay đổi Gateway HTTP.

## Bằng chứng triển khai 2026-11-05

`gateway-proxy.service.spec.ts` kiểm tra bốn route, passthrough/status/error, cookie và route/path không an toàn. `gateway-auth.middleware.spec.ts` kiểm tra auth gate và thay header giả mạo, gồm caller LECTURER để bảo đảm không thêm RBAC Run/Submit. `pnpm build:gateway` và lint Gateway pass; toàn bộ test chạy ngoài sandbox đạt 931 tests, còn một suite không biên dịch vì `officialName` ngoài phạm vi. Không có thay đổi nghiệp vụ Submission.
