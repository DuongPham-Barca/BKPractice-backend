# GW-002 Công việc triển khai định tuyến và bảo vệ Problem qua API Gateway

> **Cập nhật LRN-008 (2026-11-07):** `ADMIN` có quyền tương ứng quản lý mọi Problem, không giới hạn người tạo; mọi câu trái ngược bên dưới đã ngừng áp dụng. Xem [Learning tự học](../../../02-learning/self-study/spec.md).

## Trạng thái

Đã phê duyệt — chờ triển khai

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản `0.1`, hiện ở trạng thái `Approved`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — đã rà soát

> GW-002 đã được phê duyệt theo chỉ đạo trực tiếp của người dùng. Mọi mục bên dưới đang ở trạng thái
> chưa hoàn thành, trừ các mục không áp dụng đã được biện minh bởi phạm vi.

Mọi công việc triển khai đều bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` sau khi cả
phần triển khai lẫn phần kiểm chứng được liệt kê đều hoàn tất.

## Chuẩn bị

- [ ] **GW-002-T001 — Xác nhận điều kiện tiên quyết và mốc cơ sở.** Xác nhận `spec.md` GW-002 đã
      được phê duyệt (`Trạng thái: Approved`), `plan.md` khớp đặc tả, `git status` sạch hoặc các
      thay đổi không liên quan được bảo toàn. Đọc lại GW-001, LRN-001, ID-001/ID-003 và kiến trúc
      Gateway. Chạy mốc cơ sở `pnpm test apps/api-gateway` trước khi sửa. Nếu đặc tả chưa được
      duyệt, DỪNG và báo cáo.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; Định nghĩa Hoàn thành; GW-002 mục Trạng thái.

- [ ] **GW-002-T002 — Chốt danh mục route Problem.** Đối chiếu bảng route trong `spec.md` với
      `PublicProblemsController`, `ManagedProblemsController`, `ManagedTestCasesController` và
      `ProblemsController` của Learning. Ghi nhận route nội bộ
      `internal/problems/:id/judge-package/:language` không thuộc bề mặt công khai. Báo cáo mọi sai
      lệch trước khi viết test.
      **Phụ thuộc:** GW-002-T001.
      **Truy vết:** GW-002-FR-001, GW-002-FR-011, GW-002-AC-001, GW-002-AC-009.

- [ ] **GW-002-T003 — Xác nhận ranh giới kiến trúc phân tầng và phạm vi.** Xác nhận thay đổi chỉ nằm trong
      `presentation`/`application`, không thêm domain/entity/repository/migration, không import
      source internals của Learning, và không thêm nghiệp vụ Problem vào Gateway.
      **Phụ thuộc:** GW-002-T001.
      **Truy vết:** GW-002-FR-015, GW-002-SR-005, GW-002-AC-012.

## Kiểm thử trước khi sửa

- [ ] **GW-002-T004 — Thêm kiểm thử ma trận route Problem trong proxy.** Mở rộng
      `gateway-proxy.service.spec.ts` để chứng minh `GET`, `POST`, `PATCH`, `PUT`, `DELETE` trên các
      path `/api/problems`, `/api/problems/:idOrSlug`, `/api/problems/managed`,
      `/api/problems/managed/:id`, các path vòng đời và một path test-case/harness đều được gửi tới
      `LEARNING_SERVICE_URL`. Khẳng định query string được giữ nguyên.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-001, GW-002-FR-016, GW-002-AC-001.

- [ ] **GW-002-T005 — Thêm kiểm thử ranh giới path segment và path traversal.** Chứng minh
      `/api/problems` và `/api/problems/...` khớp họ route; `/api/problemsX`, `/api/problems-old`
      không khớp. Chứng minh path chứa `.`/`..`/`%2e`/`%2f`/`\` có thể chuẩn hoá ra ngoài họ route
      bị từ chối (`400`) và `HttpService.request` không được gọi.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-002, GW-002-FR-003, GW-002-AC-002, GW-002-AC-003.

- [ ] **GW-002-T006 — Thêm kiểm thử header giả mạo và header tin cậy nội bộ.** Trong
      `gateway-auth.middleware.spec.ts` và/hoặc `gateway-proxy.service.spec.ts`, chứng minh
      `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`, `x-client-ip` và
      `x-internal-service-secret` do client gửi bị loại bỏ; metadata đã xác minh được đặt lại;
      token thiếu/sai kiểu `permissions` cho ra `x-auth-permissions` rỗng.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-006, GW-002-FR-007, GW-002-FR-008, GW-002-SR-002, GW-002-SR-008,
      GW-002-AC-006.

- [ ] **GW-002-T007 — Thêm kiểm thử xác thực và phiên cho route Problem.** Chứng minh thiếu token,
      token sai/hết hạn/đã thu hồi trả `401` và không gọi upstream; Identity không khả dụng trả
      `503`; route Problem không có ngoại lệ ẩn danh.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-004, GW-002-FR-005, GW-002-AC-004, GW-002-AC-005.

- [ ] **GW-002-T008 — Thêm kiểm thử cookie, Origin và CSRF cho route Problem.** Chứng minh cookie + method
      không an toàn với Origin/Referer sai hoặc CSRF sai trả `403`; trường hợp hợp lệ chuyển tiếp
      `Authorization: Bearer` và không chuyển tiếp `Cookie`; đường Bearer không yêu cầu CSRF.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-009, GW-002-SR-003, GW-002-SR-006, GW-002-AC-007.

- [ ] **GW-002-T009 — Thêm kiểm thử chuyển tiếp phản hồi.** Chứng minh mã trạng thái/nội dung `400`, `403`, `404`,
      `409`, `5xx` của Learning được giữ nguyên; chỉ các header `content-type`, `content-length`,
      `etag`, `last-modified` được chuyển; `Set-Cookie` và header tuỳ ý không được chuyển trên route
      Problem.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-010, GW-002-SR-003, GW-002-AC-008.

- [ ] **GW-002-T010 — Thêm kiểm thử request-id, giới hạn tần suất và lỗi biên.** Chứng minh `x-request-id` được
      sinh/giữ, trả lại phản hồi và chuyển tiếp tới Learning; route Problem chịu giới hạn tần suất mặc định
      và không có đường vòng; không có route upstream/Learning không khả dụng trả `502`.
      **Phụ thuộc:** GW-002-T002.
      **Truy vết:** GW-002-FR-012, GW-002-FR-013, GW-002-FR-014, GW-002-AC-010, GW-002-AC-011.

- [ ] **GW-002-T011 — Thêm kiểm thử tích hợp middleware + proxy.** Ghép `RequestIdMiddleware` +
      `GatewayAuthMiddleware` + `GatewayProxyService` với `HttpService` giả cho các route đại diện:
      liệt kê/chi tiết, tạo, cập nhật, xoá, một test-case và một harness. Khẳng định URL upstream,
      metadata đã xác minh, không có `Cookie`, không có `x-internal-service-secret`, không có
      `Set-Cookie` trong phản hồi.
      **Phụ thuộc:** GW-002-T004, GW-002-T005, GW-002-T006, GW-002-T007, GW-002-T008, GW-002-T009.
      **Truy vết:** GW-002-AC-001, GW-002-AC-006, GW-002-AC-007, GW-002-AC-008, GW-002-AC-010.

## Triển khai

- [ ] **GW-002-T012 — Khớp họ route Problem theo path segment.** Sửa `GatewayProxyService` để dùng
      quy tắc so khớp `path === prefix` hoặc `path` bắt đầu bằng `prefix + '/'` (hoặc helper tương
      đương) thay cho `startsWith(prefix)` thô. Chỉ áp dụng cho việc khớp route; không đổi prefix của
      các dịch vụ khác.
      **Phụ thuộc:** GW-002-T004, GW-002-T005.
      **Truy vết:** GW-002-FR-001, GW-002-FR-002, GW-002-AC-001, GW-002-AC-002.

- [ ] **GW-002-T013 — Chuẩn hoá/từ chối path không an toàn.** Thêm bước kiểm tra path trước khi
      chuyển tiếp: từ chối `400` nếu path chứa dot segment/backslash hoặc dạng percent-encoded có thể
      chuẩn hoá ra ngoài họ `/api/problems`; chỉ chuyển tiếp path đã được khớp. Không dùng
      `originalUrl` thô nếu nó có thể chuẩn hoá khác `request.path`. Giữ query string.
      **Phụ thuộc:** GW-002-T005, GW-002-T012.
      **Truy vết:** GW-002-FR-003, GW-002-FR-011, GW-002-SR-004, GW-002-AC-003, GW-002-AC-009.

- [ ] **GW-002-T014 — Loại bỏ header tin cậy nội bộ.** Xoá `x-internal-service-secret` (và các header
      tin cậy nội bộ khác nếu có) khỏi request công khai tại điểm xử lý header tập trung
      (middleware hoặc proxy). Bảo đảm việc xoá không ảnh hưởng các header do Gateway tự đặt từ token
      đã xác minh.
      **Phụ thuộc:** GW-002-T006.
      **Truy vết:** GW-002-FR-008, GW-002-SR-008, GW-002-AC-006.

- [ ] **GW-002-T015 — Rà soát và giữ nguyên các hành vi không đổi.** Xác nhận không thêm RBAC/quyền
      sở hữu/vòng đời Problem vào Gateway; không thêm giới hạn tần suất riêng/đường vòng; không đổi route, DTO,
      thời gian chờ, giới hạn nội dung hay CORS; không đổi hành vi các prefix khác.
      **Phụ thuộc:** GW-002-T012, GW-002-T013, GW-002-T014.
      **Truy vết:** GW-002-FR-014, GW-002-FR-015, GW-002-FR-016, GW-002-AC-012.

## Kiểm chứng

- [ ] **GW-002-T016 — Chạy kiểm thử Gateway mục tiêu.** Chạy `pnpm test apps/api-gateway`; toàn bộ bộ kiểm thử
      cũ và mới phải vượt qua, không có kiểm thử bị bỏ qua không lý do.
      **Phụ thuộc:** GW-002-T011, GW-002-T012, GW-002-T013, GW-002-T014, GW-002-T015.
      **Truy vết:** GW-002-AC-001 tới GW-002-AC-011.

- [ ] **GW-002-T017 — Chạy các lệnh chất lượng kho mã.** Chạy `pnpm lint`, `pnpm typecheck`,
      `pnpm test` và `pnpm build:gateway` (hoặc `pnpm build` nếu cần kiểm chứng toàn bộ). Chỉ dùng
      các script có trong `package.json`. Ghi lại kết quả chính xác, gồm mọi lỗi có sẵn không liên
      quan.
      **Phụ thuộc:** GW-002-T016.
      **Truy vết:** GW-002-AC-013; Định nghĩa Hoàn thành.

- [ ] **GW-002-T018 — Kiểm thử nhanh thủ công với Gateway + Learning.** Nếu môi trường cho phép, chạy
      Gateway và Learning thật; kiểm tra: không token → `401`; token hợp lệ → route Problem theo
      hành vi Learning; header định danh giả mạo bị bỏ qua; `x-internal-service-secret` không được
      chuyển tiếp; path traversal không chạm route nội bộ; Learning `403/404/409` được giữ nguyên. Nếu
      không chạy được, ghi rõ "chưa kiểm chứng" và lý do.
      **Phụ thuộc:** GW-002-T016, GW-002-T017.
      **Truy vết:** GW-002-AC-003, GW-002-AC-004, GW-002-AC-006, GW-002-AC-008, GW-002-AC-009.

- [ ] **GW-002-T019 — Đối chiếu đặc tả và cập nhật bằng chứng.** Rà soát từng
      `GW-002-FR-001` tới `GW-002-FR-016`, `GW-002-SR-001` tới `GW-002-SR-008` và
      `GW-002-AC-001` tới `GW-002-AC-013` với mã nguồn, kiểm thử, kết quả lệnh và kiểm thử nhanh. Cập nhật
      `tasks.md` trung thực; không đánh dấu hoàn tất nếu chưa có bằng chứng. Ghi bằng chứng để đóng
      `LRN-001-T039`, nhưng không sửa `spec.md` LRN-001 đã Approved.
      **Phụ thuộc:** GW-002-T017, GW-002-T018.
      **Truy vết:** Toàn bộ yêu cầu và tiêu chí nghiệm thu; Định nghĩa Hoàn thành.

- [ ] **GW-002-T020 — Ghi nhật ký công việc.** Tạo `.docs/worked/api-gateway/learning/problems/YYYY-MM-DD-*` ghi
      đặc tả/kế hoạch đã dùng, câu hỏi đã làm rõ, file thay đổi, cách luồng chạy, cấu hình (nếu có), lệnh
      đã chạy, kết quả và phần chưa kiểm chứng. Không ghi token, cookie, bí mật hay giá trị `.env`.
      **Phụ thuộc:** GW-002-T019.
      **Truy vết:** Quy trình SDD bước 6; Định nghĩa Hoàn thành.

## Tuân thủ kiến trúc

- [ ] **GW-002-T021 — Kiểm chứng kiến trúc phân tầng và ranh giới dịch vụ.** Xác nhận `presentation` không import
      `infrastructure`, `application` chỉ phụ thuộc `infrastructure`/phần truyền tải/cấu hình, không có
      domain/entity/repository/di trú/cơ sở dữ liệu Gateway, không import mã nguồn nội bộ của
      Learning, và không có quy tắc nghiệp vụ Problem trong Gateway.
      **Phụ thuộc:** GW-002-T015, GW-002-T019.
      **Truy vết:** GW-002-AC-012; ADR 0002; `api-gateway.md`; `dependency-rules.md`.

## Mục không áp dụng đã biện minh

- [x] **Không áp dụng — Domain:** Gateway không có tầng domain theo GW-001 và ADR 0002.
- [x] **Không áp dụng — Lưu trữ/cơ sở dữ liệu/di trú:** Gateway không sở hữu lưu trữ; không có di trú.
- [x] **Không áp dụng — Nhắn tin:** GW-002 không thêm exchange/queue/routing key/retry/DLQ.
- [x] **Không áp dụng — Thời gian thực:** GW-002 không thay đổi Socket.IO/Redis hay realtime của Submission.
- [x] **Không áp dụng — DTO/kiểm tra dữ liệu Problem:** Gateway không thêm DTO và không kiểm tra body Problem;
      Learning sở hữu việc này.

## Bảng tổng hợp độ phủ

### Yêu cầu chức năng

| Yêu cầu              | Công việc triển khai chính               | Công việc kiểm thử/xác minh chính  |
| -------------------- | ---------------------------------------- | ---------------------------------- |
| GW-002-FR-001        | T012                                     | T004, T011, T016, T018             |
| GW-002-FR-002–FR-003 | T012, T013                               | T004, T005, T011, T016, T018       |
| GW-002-FR-004–FR-005 | Không thay đổi (hành vi hiện có)         | T007, T011, T016, T018             |
| GW-002-FR-006–FR-009 | T014 cho header; giữ nguyên phần còn lại | T006, T007, T008, T011, T016, T018 |
| GW-002-FR-010–FR-012 | T013, T015; giữ nguyên phần còn lại      | T009, T010, T011, T016, T017, T018 |
| GW-002-FR-013–FR-014 | Không thay đổi (hành vi hiện có)         | T010, T016, T018                   |
| GW-002-FR-015–FR-016 | T012, T015                               | T004, T016, T021                   |

### Yêu cầu bảo mật

| Yêu cầu              | Công việc triển khai và xác minh               |
| -------------------- | ---------------------------------------------- |
| GW-002-SR-001–SR-004 | T006, T008, T009, T010, T013, T014, T018, T019 |
| GW-002-SR-005–SR-008 | T003, T006, T011, T014, T018, T019, T021       |

### Tiêu chí nghiệm thu

| Tiêu chí nghiệm thu  | Công việc xác minh                       |
| -------------------- | ---------------------------------------- |
| GW-002-AC-001–AC-005 | T004, T005, T007, T011, T016, T018       |
| GW-002-AC-006–AC-010 | T006, T008, T009, T010, T011, T016, T018 |
| GW-002-AC-011–AC-013 | T010, T015, T016, T017, T019, T021       |

## Tham chiếu Định nghĩa Hoàn thành

GW-002 chỉ Hoàn thành khi đặc tả được phê duyệt, mọi mục liên quan trong
[`specs/00-system/definition-of-done.md`](../../../00-system/definition-of-done.md) được thoả mãn,
`pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build:gateway` vượt qua, mọi FR/SR/AC đã được đối
chiếu, và nhật ký công việc đã được ghi. Chỉ sửa mã nguồn mà chưa kiểm chứng thì chưa đủ.

> File này là một danh sách kiểm tra triển khai, không phải một đặc tả. Không thêm yêu cầu và không
> âm thầm thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện các công việc này.
