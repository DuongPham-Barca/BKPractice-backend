# GW-001 Công việc triển khai cấu trúc lớp API Gateway

## Trạng thái

Approved — Hoàn tất và đã kiểm chứng

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.0`
Kế hoạch liên quan: [`./plan.md`](./plan.md)

Mọi công việc dưới đây đã hoàn thành và được kiểm chứng. Chỉ đánh dấu `[x]` khi hành vi lẫn phần kiểm chứng đã thoả mãn.

## Chuẩn bị

- [x] **GW-001-T001 — Khảo sát mã nguồn và trạng thái repository.** Khảo sát `apps/api-gateway/src` (`auth/`, `proxy/`, `realtime/`), `api-gateway.module.ts`, các spec hiện có, tài liệu kiến trúc Gateway và ADR 0002. Xác nhận không xung đột với đặc tả khác trước khi di chuyển code.  
      **Phụ thuộc:** Không có.  
      **Truy vết:** Chuẩn bị của SDD và Định nghĩa Hoàn thành.

## Tầng presentation

- [x] **GW-001-T002 — Tạo thư mục `presentation/controllers/` và di chuyển `GatewayProxyController`.** Giữ nguyên route `/api/{*path}` và hành vi bỏ qua Swagger; đổi import sang `@gateway/application/proxy/gateway-proxy.service`.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-002, GW-001-FR-007.

- [x] **GW-001-T003 — Tạo thư mục `presentation/middleware/` và di chuyển `GatewayAuthMiddleware`.** Giữ nguyên xác thực JWT/cookie, CSRF, origin kiểm tra và loại bỏ header giả mạo; inject `GatewaySessionService` thay vì `GatewaySessionVerifier`.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-002, GW-001-FR-007.

- [x] **GW-001-T004 — Tạo thư mục `presentation/guards/` và di chuyển `GatewayThrottling`.** Giữ nguyên cấu hình rate limit theo đường dẫn.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-002, GW-001-FR-007.

- [x] **GW-001-T005 — Tạo thư mục `presentation/realtime/` và viết lại `SubmissionRealtimeGateway`.** Chỉ là Socket.IO presentation adapter: xác thực token/cookie, join phòng `user:<id>`, inject `GatewaySessionService` và `SubmissionResultsService`, forward kết quả realtime.  
      **Phụ thuộc:** GW-001-T001, GW-001-T008, GW-001-T009.  
      **Truy vết:** GW-001-FR-002, GW-001-FR-007.

- [x] **GW-001-T006 — Di chuyển spec và integration test vào `presentation/`.** Cập nhật đường dẫn import trong `gateway-auth.middleware.spec.ts`, `gateway-throttling.spec.ts`, `submission-realtime.gateway.spec.ts` và `profile-cookie.integration.spec.ts`.  
      **Phụ thuộc:** GW-001-T002–GW-001-T005.  
      **Truy vết:** GW-001-AC-005.

## Tầng application

- [x] **GW-001-T007 — Tạo thư mục `application/proxy/` và di chuyển `GatewayProxyService`.** Giữ nguyên định tuyến theo prefix, forward request/phản hồi, xử lý cookie và redirect OAuth.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-003, GW-001-FR-007.

- [x] **GW-001-T008 — Tạo thư mục `application/auth/` và `GatewaySessionService`.** Use case kiểm tra session qua `IdentitySessionClient`; ném `ServiceUnavailableException` khi Identity không khả dụng.  
      **Phụ thuộc:** GW-001-T001, GW-001-T010.  
      **Truy vết:** GW-001-FR-003.

- [x] **GW-001-T009 — Tạo thư mục `application/realtime/`, `submission-result.parser.ts` và `submission-results.service.ts`.** Parser/whitelist envelope realtime và dispatch handler từ subscriber infra.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-003.

- [x] **GW-001-T010 — Viết spec cho tầng application.** `gateway-session.service.spec.ts`, `submission-result.parser.spec.ts`; bảo toàn kiểm thử parser và hành vi session từ spec cũ.  
      **Phụ thuộc:** GW-001-T008, GW-001-T009.  
      **Truy vết:** GW-001-AC-005.

## Tầng infrastructure

- [x] **GW-001-T011 — Tạo thư mục `infrastructure/identity/` và `IdentitySessionClient`.** Gọi HTTP GET tới `IDENTITY_SERVICE_URL/internal/auth/session`, map `204`/`401`/khác thành trạng thái session.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-004.

- [x] **GW-001-T012 — Tạo thư mục `infrastructure/redis/` và `SubmissionResultSubscriber`.** Kết nối ioredis, đăng ký `REDIS_CHANNELS.submissionResults`, quản lý vòng đời module và xử lý lỗi Redis.  
      **Phụ thuộc:** GW-001-T001.  
      **Truy vết:** GW-001-FR-004.

- [x] **GW-001-T013 — Viết spec cho tầng infrastructure.** `identity-session.client.spec.ts` bao phủ mapping trạng thái session và URL/header của request.  
      **Phụ thuộc:** GW-001-T011, GW-001-T012.  
      **Truy vết:** GW-001-AC-005.

## Thành phần hợp thành

- [x] **GW-001-T014 — Cập nhật `api-gateway.module.ts`.** Import thành phần qua alias `@gateway/*`, providers theo tầng (`presentation`, `application`, `infrastructure`), giữ `ThrottlerGuard` và `HealthModule`.  
      **Phụ thuộc:** GW-001-T002–GW-001-T013.  
      **Truy vết:** GW-001-FR-008.

## Kiểm thử

- [x] **GW-001-T015 — Chạy toàn bộ spec Gateway.** 8 suite, 39 test pass sau khi di chuyển và đổi tên đường dẫn import.  
      **Phụ thuộc:** GW-001-T006, GW-001-T010, GW-001-T013, GW-001-T014.  
      **Truy vết:** GW-001-AC-005.

- [x] **GW-001-T016 — Chạy các lệnh chất lượng repository.** `pnpm lint`, `pnpm typecheck`, `pnpm test` (119 suite pass, 0 fail) và `pnpm build` (cả 6 service) đều pass. Để đạt điều này, `test/account-import.integration.spec.ts` được cập nhật từ tên cột cũ `officialName`/`official_name` sang `displayName`/`display_name` cho khớp migration `1700000000006-InitializeImportedProfiles`.  
      **Phụ thuộc:** GW-001-T014.  
      **Truy vết:** Định nghĩa Hoàn thành.

## Tài liệu

- [x] **GW-001-T017 — Cập nhật tài liệu kiến trúc.** Sửa `api-gateway.md` (mô hình 3 tầng, cây thư mục mục tiêu, quy tắc phụ thuộc) và `dependency-rules.md` (quy tắc Gateway, chiều phụ thuộc).  
      **Phụ thuộc:** GW-001-T014.  
      **Truy vết:** Mục Tuân thủ kiến trúc của kế hoạch.

- [x] **GW-001-T018 — Ghi lại worked entry.** Tạo `.docs/worked/api-gateway/2026-10-31-gateway-layered-restructure.md` (bản tiếng Việt) ghi spec, plan, câu hỏi làm rõ, file đã thay đổi và kết quả kiểm chứng.  
      **Phụ thuộc:** GW-001-T015–GW-001-T017.  
      **Truy vết:** Quy trình SDD và Định nghĩa Hoàn thành.

## Xác minh cuối cùng

- [x] **GW-001-T019 — Đối chiếu triển khai với spec đã Approved.** Rà soát từng GW-001-FR-001–GW-001-FR-008 và GW-001-AC-001–GW-001-AC-007 với code, test và kết quả kiểm chứng; xác nhận không có hành vi Ngoài phạm vi nào được thêm vào.  
      **Phụ thuộc:** GW-001-T015–GW-001-T018.  
      **Truy vết:** Đặc tả đã Approved, Định nghĩa Hoàn thành, toàn bộ yêu cầu và tiêu chí nghiệm thu.

## Tuân thủ kiến trúc

- [x] **GW-001-T020 — Kiểm chứng chiều phụ thuộc và ranh giới service.** Xác nhận `presentation` không import `infrastructure`, `application` phụ thuộc `infrastructure`, không có domain/entity/repository của Gateway, và không import source internals của dịch vụ khác.  
      **Phụ thuộc:** GW-001-T014, GW-001-T019.  
      **Truy vết:** Mục Tuân thủ kiến trúc của kế hoạch.

## Bản sửa đổi

Không có.
