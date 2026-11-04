# GW-002 Kế hoạch triển khai định tuyến và bảo vệ Problem qua API Gateway

## Trạng thái

Đã rà soát — đặc tả Approved

> Đặc tả GW-002 đã được phê duyệt theo chỉ đạo người dùng; kế hoạch này đã được rà soát với đặc tả và kiến trúc Gateway.

## Đặc tả liên quan

- [GW-002 Định tuyến và bảo vệ Problem qua API Gateway](./spec.md)
- Phiên bản: `0.1`
- Trạng thái đặc tả: `Approved`
- Ngày đề xuất: `2026-11-03`

Kế hoạch này triển khai đặc tả GW-002 mà không thay đổi yêu cầu của nó. Không có tính năng nghiệp
vụ Problem mới.

## Dịch vụ đích

Dịch vụ: API Gateway

## Kiến trúc dịch vụ bắt buộc

Kiến trúc: Kiến trúc phân tầng (theo [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md)
và [api-gateway.md](../../../../architecture/api-gateway.md))

Chiều phụ thuộc bắt buộc:

```text
presentation -> application -> infrastructure
```

Gateway không có tầng domain, entity, repository hay cơ sở dữ liệu riêng.

## Ảnh hưởng tới mã nguồn hiện có

### Hiện trạng (trước thay đổi)

- `apps/api-gateway/src/application/proxy/gateway-proxy.service.ts` khớp upstream bằng
  `request.path.startsWith(prefix)` với prefix `/api/problems`; dựng URL bằng
  `${target.baseUrl}${request.originalUrl}`; loại bỏ `host`, `content-length` và `cookie` (trừ các
  route auth được whitelist).
- `apps/api-gateway/src/presentation/middleware/gateway-auth.middleware.ts` chạy cho mọi route
  `/api/`; route Problem không nằm trong danh sách public nên bắt buộc xác thực; middleware xoá
  `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`, `x-client-ip` và đặt lại từ token đã xác
  minh; với cookie + method không an toàn kiểm tra Origin/Referer và CSRF.
- `apps/api-gateway/src/presentation/controllers/gateway-proxy.controller.ts` chỉ ánh xạ
  `@Controller('api')` + `@All('{*path}')`, nên route `internal/...` không đi qua controller này.
- `libs/common/src/http/request-id.middleware.ts` sinh hoặc giữ `x-request-id`, trả lại trên phản hồi.
- `apps/api-gateway/src/presentation/guards/gateway-throttling.ts` cấu hình giới hạn tần suất mặc định cho mọi
  route; route Problem không có đường vòng riêng.
- Test hiện có: `gateway-proxy.service.spec.ts`, `gateway-auth.middleware.spec.ts`,
  `gateway-session.service.spec.ts`, `gateway-throttling.spec.ts`,
  `profile-cookie.integration.spec.ts`, `identity-session.client.spec.ts`,
  `submission-result.parser.spec.ts`, `submission-realtime.gateway.spec.ts`.

### Sau thay đổi (mục tiêu)

- Không thêm module hay tầng mới.
- `GatewayProxyService` khớp họ route Problem theo ranh giới path segment.
- Gateway từ chối an toàn path có dot segment/backslash có thể thoát khỏi họ route, và chỉ chuyển
  tiếp path đã được khớp.
- `GatewayAuthMiddleware` (hoặc proxy, nếu phù hợp hơn với ranh giới hiện có) loại bỏ header tin cậy
  nội bộ như `x-internal-service-secret` khỏi request công khai.
- Bổ sung kiểm thử hồi quy cho họ route Problem, xác thực, header giả mạo, cookie/CSRF, phản hồi
  chuyển tiếp nguyên trạng, request-id và giới hạn tần suất.
- Không thay đổi route công khai, DTO, contract Problem hay nghiệp vụ Learning.

## Thay đổi ở tầng domain

Không áp dụng — API Gateway không có tầng domain theo GW-001 và ADR 0002.

## Tầng ứng dụng / Trường hợp sử dụng

- `GatewayProxyService`: thêm khớp route theo path segment và xử lý path an toàn trước khi chuyển
  tiếp. Không thêm trường hợp sử dụng Problem, không đọc/ghi trạng thái Problem.
- `GatewaySessionService`: giữ nguyên; tiếp tục là trường hợp sử dụng kiểm tra phiên qua
  `IdentitySessionClient` và ném `ServiceUnavailableException` khi Identity không khả dụng.
- Không thêm dịch vụ tầng ứng dụng mới. Việc loại bỏ header tin cậy nội bộ là một bước truyền tải ở
  middleware/proxy, không phải trường hợp sử dụng nghiệp vụ.

## Lưu trữ

Không áp dụng — Gateway không sở hữu lưu trữ.

## Thay đổi cơ sở dữ liệu

Không áp dụng.

## Di trú cơ sở dữ liệu

Không áp dụng.

## API

Không thay đổi hợp đồng route. Bảng route trong [`./spec.md`](./spec.md) là nguồn cho kiểm thử và
tài liệu; route vẫn do Learning sở hữu.

Các điểm cần giữ tương thích:

- `/api/problems` và `/api/problems/...` vẫn được chuyển tới Learning.
- `/api/problemsX` không còn bị coi là route Problem.
- Query string vẫn được giữ nguyên khi chuyển tiếp.
- Route `internal/problems/:id/judge-package/:language` vẫn không có mặt trên bề mặt công khai.

## DTO / Kiểm tra dữ liệu

Không thêm DTO Problem ở Gateway. Gateway không kiểm tra hoặc lọc trường nội dung Problem; việc kiểm
tra DTO vẫn thuộc Learning. Gateway chỉ loại bỏ header truyền tải/định danh/nội bộ và giữ nguyên nội
dung.

## Phân quyền

- Gateway chỉ xác thực access token và kiểm tra phiên; không thực thi RBAC Problem.
- `STUDENT`, `LECTURER`, `ADMIN` đều đi qua cùng một cơ chế; Learning quyết định `problem:*` và quyền
  sở hữu.
- Khách chưa xác thực bị từ chối tại Gateway cho mọi route Problem.
- Không thêm đường vòng cho Admin hay bất kỳ vai trò nào.

## Nhắn tin / Sự kiện

Không áp dụng — GW-002 không thêm exchange, queue, routing key, retry, ACK/NACK hay DLQ.

## Thời gian thực

Không áp dụng — GW-002 không thay đổi Socket.IO/Redis hay realtime của Submission.

## Bộ chuyển đổi hạ tầng

- Giữ nguyên `IdentitySessionClient` cho kiểm tra phiên; không thêm bộ chuyển đổi mới.
- Giữ nguyên máy khách HTTP của NestJS (`HttpService`) trong `GatewayProxyService`.
- Không thêm kết nối cơ sở dữ liệu, cache hay trình nhắn tin.

## Xử lý lỗi

- Không có route upstream hoặc Learning không khả dụng/timeout → `BadGatewayException` (`502`).
- Token thiếu/sai/hết hạn/thu hồi → `UnauthorizedException` (`401`).
- Origin/CSRF không hợp lệ → `ForbiddenException` (`403`).
- Kiểm tra phiên không khả dụng → `ServiceUnavailableException` (`503`).
- Path không an toàn → `BadRequestException` (`400`) trước khi gọi upstream.
- Mã trạng thái và nội dung của Learning được giữ nguyên, bao gồm `400`, `401`, `403`, `404`, `409`
  và `5xx`.
- Không đưa token, cookie, bí mật nội bộ hay chi tiết nội bộ vào thông điệp lỗi.

## Bảo mật

- Loại bỏ header định danh giả mạo và header tin cậy nội bộ trước khi chuyển tiếp.
- Chỉ đặt `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions` từ token đã xác minh.
- Không suy ra quyền từ vai trò; token thiếu `permissions` coi như không có quyền.
- Không chuyển tiếp raw `Cookie` trên route Problem; không chuyển tiếp `Set-Cookie` của Learning.
- Kiểm tra Origin/Referer và CSRF khi xác thực bằng cookie với method không an toàn.
- Chặn path traversal/dot segment và mọi nỗ lực chạm route judge-package nội bộ.
- Không ghi log Authorization, cookie, mật khẩu hay bí mật nội bộ.

## Chiến lược kiểm thử

### Kiểm thử đơn vị

- `gateway-proxy.service.spec.ts`
  - Route Problem cho `GET`, `POST`, `PATCH`, `PUT`, `DELETE` tới `LEARNING_SERVICE_URL`.
  - Query string được giữ nguyên.
  - `/api/problems` và `/api/problems/...` khớp; `/api/problemsX`, `/api/problems-old` không khớp.
  - Path chứa `.`/`..`/`%2e`/`%2f`/`\` bị từ chối và không gọi `HttpService.request`.
  - `Set-Cookie` từ Learning không được chuyển tiếp; chỉ header được cho phép mới được chuyển.
  - Mã trạng thái và nội dung `400/403/404/409/5xx` được giữ nguyên.
- `gateway-auth.middleware.spec.ts`
  - Route Problem không có token → `401`, `next` không được gọi.
  - Token sai/hết hạn/đã thu hồi → `401`; `GatewaySessionService` ném lỗi khả dụng → `503`.
  - Header `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`, `x-client-ip` giả mạo bị xoá và
    được đặt lại từ claim đã xác minh.
  - Token thiếu `permissions` → `x-auth-permissions` rỗng; `permissions` sai kiểu → rỗng.
  - Cookie + method không an toàn: Origin/Referer sai → `403`; CSRF sai → `403`; hợp lệ → chuyển
    tiếp `Authorization`, không chuyển tiếp `Cookie`.
  - Header `x-internal-service-secret` do client gửi bị xoá.
- `gateway-throttling.spec.ts`
  - Route Problem vẫn dùng giới hạn tần suất mặc định; không có đường vòng riêng.
- `request-id` (qua kiểm thử tích hợp hoặc đặc tả middleware)
  - `x-request-id` được sinh nếu thiếu, giữ nếu có, trả lại phản hồi và chuyển tiếp tới Learning.

### Kiểm thử tích hợp

- Mở rộng `profile-cookie.integration.spec.ts` hoặc thêm một đặc tả tích hợp riêng cho Problem,
  ghép `RequestIdMiddleware` + `GatewayAuthMiddleware` + `GatewayProxyService` với `HttpService`
  giả:
  - `GET /api/problems` và `GET /api/problems/:idOrSlug`.
  - `POST /api/problems`, `PATCH /api/problems/:id`, `DELETE /api/problems/:id`.
  - Một route test-case và một route harness đại diện.
  - Khẳng định URL upstream, `Authorization`, `x-auth-*`, `x-request-id`, không có `Cookie`, không
    có `x-internal-service-secret`, không có `Set-Cookie` trong phản hồi.
- Bảo đảm các kiểm thử hiện có của Gateway vẫn vượt qua.

### Kiểm chứng thủ công (sau khi đặc tả được duyệt)

- Chạy Gateway + Learning thật trong môi trường phát triển.
- Không token → `401`.
- Token STUDENT → catalogue/chi tiết theo hành vi Learning hiện có.
- Token LECTURER có quyền → tạo/cập nhật/xoá mềm theo Learning.
- Gửi header `x-auth-user-id` giả mạo → Learning nhận ID từ token, không nhận header giả.
- Gửi `x-internal-service-secret` → không được chuyển tiếp.
- Gọi `internal/problems/...` qua Gateway → không chạm route nội bộ.
- Learning trả `403`/`404`/`409` → Gateway giữ nguyên.

## Khả năng quan sát

- Giữ `RequestIdMiddleware` và `x-request-id` hiện có.
- Không thêm số liệu hay ghi log nghiệp vụ mới.
- Ghi log an toàn, không chứa token/cookie/bí mật.
- Có thể ghi log route đích và mã trạng thái upstream như hành vi hiện có, nhưng không ghi nội dung
  nhạy cảm.

## Thứ tự triển khai

1. Xác nhận đặc tả GW-002 đã được phê duyệt (`Trạng thái: Approved`) trước khi sửa mã nguồn.
2. Khảo sát lại `git status`, mã nguồn Gateway và chạy kiểm thử Gateway hiện có để có mốc cơ sở.
3. Thêm kiểm thử thất bại cho ranh giới path segment, path traversal và header tin cậy nội bộ.
4. Thêm kiểm thử cho ma trận route Problem và metadata đã xác minh.
5. Sửa `GatewayProxyService` để khớp theo path segment và xử lý path an toàn.
6. Sửa middleware/proxy để loại bỏ header tin cậy nội bộ (`x-internal-service-secret`).
7. Bổ sung kiểm thử tích hợp ghép middleware + proxy cho các route Problem đại diện.
8. Xác nhận `Set-Cookie` không bị chuyển tiếp và mã trạng thái/nội dung Learning được giữ nguyên.
9. Chạy `pnpm test apps/api-gateway`, `pnpm lint`, `pnpm typecheck`, `pnpm build:gateway`.
10. Chạy kiểm thử nhanh thủ công nếu môi trường cho phép.
11. Đối chiếu từng FR/SR/AC, cập nhật `tasks.md` và ghi nhật ký công việc.
12. Ghi bằng chứng để đóng `LRN-001-T039`; không sửa `spec.md` LRN-001 đã Approved.

## Rủi ro

- **Thay đổi khớp route có thể ảnh hưởng route khác:** chỉ thay đổi cách khớp cho họ `/api/problems`;
  các prefix `/api/auth`, `/api/users`, `/api/profile`, `/api/roles`, `/api/admin/users`,
  `/api/courses`, `/api/assignments`, `/api/classes`, `/api/submissions`, `/api/run`, `/api/community`
  phải giữ nguyên hành vi.
- **Path traversal:** nếu chỉ dựa vào `request.path` mà không kiểm tra URL thực gửi upstream, request
  có thể chạm route nội bộ. Kiểm thử phải khẳng định `HttpService.request` không được gọi với path
  nội bộ.
- **Header tin cậy nội bộ:** nếu chỉ xoá ở proxy nhưng middleware vẫn giữ, cần thống nhất một điểm
  xử lý và kiểm thử cả hai đường.
- **Xác thực dùng chung:** middleware phục vụ mọi dịch vụ; thay đổi phải hẹp, không làm hồi quy
  Identity/Submission/Community.
- **Môi trường kiểm thử:** không có Learning thật trong kiểm thử đơn vị; kiểm thử tích hợp dùng stub
  `HttpService`. Kiểm thử nhanh thật phụ thuộc môi trường và phải ghi rõ nếu chưa chạy.
- **Đặc tả chưa được duyệt:** mọi thay đổi mã nguồn bị chặn cho tới khi có phê duyệt.
- **Giới hạn tần suất:** không thêm chính sách riêng; nếu kiểm thử phát hiện route Problem bị miễn
  trừ ngoài ý muốn, sửa cấu hình thay vì thêm đặc tả mới.

## Tuân thủ kiến trúc

- `presentation` chỉ phụ thuộc `application`; không import trực tiếp `infrastructure`.
- `application` phụ thuộc `infrastructure` và phần truyền tải/cấu hình của NestJS.
- Không thêm domain, entity, repository, di trú hay cơ sở dữ liệu cho Gateway.
- Không import entity/repository/datasource/di trú hay mã nguồn nội bộ của Learning.
- Không thêm trường hợp sử dụng nghiệp vụ Problem vào Gateway; mọi quyết định `problem:*`, quyền sở
  hữu và vòng đời vẫn ở Learning.
- Route judge-package nội bộ tiếp tục là bề mặt nội bộ của Learning, không được Gateway công khai
  hoá.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved. Kế hoạch này chỉ có hiệu lực triển khai sau khi GW-002 được phê duyệt.
