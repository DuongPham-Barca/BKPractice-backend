# GW-009 Kế hoạch Gateway — Định tuyến Submit qua API Gateway

## Đặc tả liên quan

- [Spec](./spec.md), phiên bản `0.3`, trạng thái `Approved`.
- Nguồn nghiệp vụ/route: [SUB-002 Nộp bài chính thức spec](../../../03-submission/submit-code/spec.md) và [plan](../../../03-submission/submit-code/plan.md), đều Approved.

## Service đích

Service: API Gateway

## Kiến trúc service bắt buộc

Kiến trúc: Layered Architecture theo ADR 0002. Chiều phụ thuộc `presentation -> application -> infrastructure`; không có domain, repository hay database Gateway.

## Ảnh hưởng tới mã nguồn hiện có

- Route proxy hiện có ở `apps/api-gateway/src/application/proxy/gateway-proxy.service.ts`, controller ở `presentation/controllers/gateway-proxy.controller.ts`.
- Authentication/header handling nằm ở `presentation/middleware/gateway-auth.middleware.ts`; giữ nguyên route behavior khác.
- Gateway đã có Submission proxy route theo GW-001 và Submission plan; xác minh cấu hình hiện tại trước khi sửa.
- Chỉ đổi transport nếu một yêu cầu của spec chưa được đáp ứng; không đổi Submission code cho tài liệu Gateway này.

## Thay đổi ở tầng domain / Lưu trữ / Database / Migration

N/A — Gateway không có domain hoặc business persistence.

## Tầng application / Use case

Dùng proxy forwarding hiện có. Không tạo use case Run/Submit/History trong Gateway, không gọi Judge/Learning và không cache response.

## API

Dùng chính xác method/path trong [spec](./spec.md). Body/query/DTO và response do Submission định nghĩa. Không rewrite `202` hay chờ kết quả xử lý bất đồng bộ.

## Phân quyền

Tận dụng `GatewayAuthMiddleware`, session verification và cơ chế trusted header hiện có theo GW-001. Submission vẫn tự quyết định ownership và trạng thái. Không thêm quyền `submission:run`, `submission:submit` hay quyền history.

## Messaging / Realtime

N/A — phần HTTP không sửa Redis, RabbitMQ, Socket.IO hay realtime.

## Adapter hạ tầng

Tái sử dụng HTTP proxy và cấu hình Submission upstream hiện có. Không thêm HTTP client mới.

## Xử lý lỗi

Auth thất bại chặn trước upstream; response Submission giữ nguyên status/body. Lỗi kết nối/timeout theo ánh xạ Gateway hiện tại, không rò rỉ upstream detail.

## Bảo mật

Kiểm thử header spoofing, auth gate, route boundary, body/query passthrough và không truy cập route nội bộ. Log không chứa token/cookie/body nhạy cảm.

## Chiến lược kiểm thử

- Proxy tests cho từng route/method: upstream, method/path/query/body và status/body.
- Auth tests: thiếu/sai token không gọi upstream; metadata client bị loại bỏ.
- Test response upstream errors và outage.
- Kiểm tra không có rule/persistence Submission trong Gateway.
- Sau phê duyệt, chỉ chạy scripts đã có trong `package.json`; map bằng chứng tới FR/AC và cập nhật tasks.

## Khả năng quan sát

Giữ request/correlation ID và logging an toàn theo Gateway hiện có.

## Thứ tự triển khai

1. Xác nhận spec Approved và worktree.
2. Rà soát proxy mapping, upstream config và middleware hiện tại.
3. Sửa tối thiểu transport thiếu (nếu có).
4. Bổ sung test cho route/auth/passthrough/error cases.
5. Chạy kiểm tra Gateway, đối chiếu FR/AC và ghi worked entry.

## Rủi ro

Không tạo rate limit riêng theo người dùng cho Submit. Giữ cơ chế rate limit mặc định hiện có của Gateway; không biến nó thành chính sách nghiệp vụ mới.

## Tuân thủ kiến trúc

Thay đổi giới hạn ở Gateway presentation/application/infrastructure. Không import Submission internals, truy cập database, hay chuyển nghiệp vụ vào Gateway.
