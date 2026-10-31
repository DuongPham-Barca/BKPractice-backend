# GW-001 Kế hoạch triển khai cấu trúc lớp API Gateway

## Trạng thái

Approved

## Đặc tả liên quan

- [GW-001 Cấu trúc lớp API Gateway](./spec.md)
- Phiên bản đã Approved: `1.0`
- Ngày phê duyệt: `2026-10-31`

Kế hoạch này triển khai đặc tả đã Approved mà không thay đổi yêu cầu của nó. Không có tính năng nghiệp vụ mới.

## Service đích

Service: API Gateway

## Kiến trúc service bắt buộc

Kiến trúc: Layered Architecture (theo [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md))

Chiều phụ thuộc bắt buộc:

```text
presentation -> application -> infrastructure
```

Gateway không có tầng domain, entity, repository hay cơ sở dữ liệu riêng.

## Ảnh hưởng tới mã nguồn hiện có

### Hiện trạng (trước thay đổi)

- `auth/` chứa `GatewayAuthMiddleware`, `GatewaySessionVerifier`, `GatewayThrottling` và các spec.
- `proxy/` chứa `GatewayProxyController` và `GatewayProxyService`.
- `realtime/` chứa `SubmissionRealtimeGateway` và spec.
- `api-gateway.module.ts` nối tất cả thành phần bằng đường dẫn tương đối theo thư mục cũ.

### Sau thay đổi (mục tiêu)

- `presentation/controllers/gateway-proxy.controller.ts`
- `presentation/middleware/gateway-auth.middleware.ts`
- `presentation/guards/gateway-throttling.ts`
- `presentation/realtime/submission-realtime.gateway.ts`
- `application/proxy/gateway-proxy.service.ts`
- `application/auth/gateway-session.service.ts`
- `application/realtime/submission-result.parser.ts`
- `application/realtime/submission-results.service.ts`
- `infrastructure/identity/identity-session.client.ts`
- `infrastructure/redis/submission-result.subscriber.ts`
- `api-gateway.module.ts` (composition root, import qua alias `@gateway/*`)

## Ảnh hưởng tới mã nguồn hiện có

Hành vi định tuyến, xác thực, cookie, CSRF, giới hạn tần suất và realtime Socket.IO giữ nguyên. Chỉ thay đổi vị trí file và cách nối dependency.

## Tầng domain

N/A — Gateway không có tầng domain theo đặc tả.

## Tầng application / Use case

- `GatewayProxyService`: định tuyến request tới upstream theo prefix và chuyển tiếp phản hồi.
- `GatewaySessionService`: kiểm tra session qua `IdentitySessionClient`, ném `ServiceUnavailableException` khi Identity không khả dụng.
- `SubmissionResultsService`: nhận message từ `SubmissionResultSubscriber`, parse qua whitelist parser và dispatch handler.
- `parseSubmissionRealtimeEnvelope`: parser và whitelist kiểm tra envelope realtime.

## Lưu trữ

N/A — Gateway không sở hữu lưu trữ.

## Thay đổi cơ sở dữ liệu

N/A.

## Migration

N/A.

## API

Route table không thay đổi (xem bảng trong spec.md).

## DTO / Kiểm tra dữ liệu

Không thay đổi.

## Phân quyền

Không thay đổi — Gateway vẫn chỉ suy ra metadata định danh từ access token đã xác minh.

## Messaging / Sự kiện

N/A — Gateway không dùng RabbitMQ.

## Realtime

- Socket.IO gateway ở `presentation/realtime/` nhận kết nối, xác thực token/cookie và join phòng `user:<id>`.
- `SubmissionResultSubscriber` ở `infrastructure/redis/` nghe `REDIS_CHANNELS.submissionResults` qua ioredis.
- `SubmissionResultsService` ở `application/realtime/` parse và dispatch kết quả tới gateway.

## Adapter hạ tầng

- `IdentitySessionClient`: gọi HTTP GET tới `IDENTITY_SERVICE_URL/internal/auth/session`, map `204`/`401`/khác.
- `SubmissionResultSubscriber`: kết nối ioredis, đăng ký kênh, quản lý vòng đời module.

## Xử lý lỗi

- Không có route upstream → `BadGatewayException`.
- Upstream không khả dụng → `BadGatewayException`.
- Lỗi session không khả dụng → `ServiceUnavailableException` từ tầng application.

## Bảo mật

Không thay đổi — JWT verify, loại bỏ header giả mạo, cookie, CSRF, origin kiểm tra giữ nguyên.

## Chiến lược kiểm thử

- Unit test cho từng tầng: middleware spec, proxy service spec, session service spec, client spec, parser spec, throttling spec, realtime gateway spec.
- Integration spec: `profile-cookie.integration.spec.ts` bao quát middleware + proxy.
- Chạy `pnpm test apps/api-gateway`.

## Khả năng quan sát

Không thay đổi — `RequestIdMiddleware` và cấu hình health/Swagger giữ nguyên.

## Thứ tự triển khai

1. Tạo thư mục `presentation/`, `application/`, `infrastructure/` và thư mục con.
2. Di chuyển controller, middleware, guards, realtime gateway vào `presentation/`.
3. Di chuyển proxy service vào `application/proxy/`.
4. Tách `GatewaySessionVerifier` thành `IdentitySessionClient` (infrastructure) và `GatewaySessionService` (application).
5. Tách Redis subscriber vào `infrastructure/redis/`, parser vào `application/realtime/`, dispatch vào `SubmissionResultsService`.
6. Viết lại `SubmissionRealtimeGateway` để chỉ là presentation adapter, inject `GatewaySessionService` và `SubmissionResultsService`.
7. Cập nhật `api-gateway.module.ts`: import qua `@gateway/*`, providers theo tầng.
8. Cập nhật spec và test để import đường dẫn mới.
9. Cập nhật `api-gateway.md` và `dependency-rules.md` ghi chiều phụ thuộc mới.
10. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test apps/api-gateway`, `pnpm build:gateway`.

## Rủi ro

- Việc thêm tầng `application/` là thay đổi kiến trúc đã được người dùng duyệt trực tiếp và đã ghi vào `api-gateway.md` / `dependency-rules.md`; công việc sau này phải giữ chiều phụ thuộc `presentation -> application -> infrastructure`.
- Không có thay đổi hành vi, do rủi ro hồi quy thấp; toàn bộ test Gateway đã pass.

## Tuân thủ kiến trúc

- `presentation` chỉ phụ thuộc `application`, không được import `infrastructure`.
- `application` phụ thuộc `infrastructure` và client transport/config của NestJS.
- Không có domain, entity, repository hay cơ sở dữ liệu của Gateway.
- Không import source internals, entity, repository, datasource hay migration của dịch vụ khác.
