# SUB-003 Công việc triển khai

## Trạng thái

**Approved — 2026-09-30, chủ sở hữu sản phẩm phê duyệt trong hội thoại. Chưa triển khai.**

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản `1.0` ngày `2026-09-30`, trạng thái `Approved`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved 2026-09-30

Nguồn của yêu cầu này: mẫu [`specs/templates/tasks.template.md`](../../templates/tasks.template.md)
và [`docs/agent/working-agreement.md`](../../../docs/agent/working-agreement.md) bước 1.

Task code vẫn chưa hoàn thành; chỉ bước phê duyệt tài liệu đã được tích.

Đánh dấu các mục không áp dụng là `- [x] N/A — lý do`. Giữ danh sách này đồng bộ với bản triển khai
thực tế; tích một mục nghĩa là mục đó đã hoàn thành và đã được xác minh nếu có liên quan.

## Chuẩn bị

- [ ] Khảo sát mã nguồn hiện có và trạng thái repository.
- [x] Spec và plan Approved; chỉ Run có output thô, public ID riêng, trang 20/tối đa 100,
      tổng số chính xác, tiêu đề Problem có thể `null`.
- [x] Ghi kết luận câu hỏi mở trong worked entry phê duyệt SRS.
- [ ] Xác nhận kiến trúc Submission trong `docs/architecture/`.
- [ ] Xác nhận `plan.md` khớp với đặc tả sau khi sửa và không mở rộng phạm vi.

## Domain

- [ ] Tạo `SubmissionHistoryFilter` gồm loại bản ghi tuỳ chọn và `problemId` tuỳ chọn.
- [ ] Tạo `HistoryCursor` gồm `createdAt` và `publicId`; hai trường phải đi cùng nhau.
- [ ] Tạo `HistoryPage<T>` gồm `items`, `total`, `totalPages` và `nextCursor` cho phép `null`.
- [ ] Triển khai `matchesFilter` ở tầng domain.
- [ ] Bổ sung kiểm thử domain: bộ lọc rỗng khớp mọi bản ghi; bộ lọc sai trả tập rỗng.

## Application

- [ ] Tạo `ListSubmissionHistoryUseCase` trả về `HistoryPage`.
- [ ] Tạo `GetSubmissionDetailUseCase` trả về phản hồi giống hệt cho bản ghi không tồn tại và bản ghi
      thuộc về người khác.
- [ ] Tạo `SubmissionHistoryItemDto` và `SubmissionDetailDto` với **danh sách trường dương**.
- [ ] Xác minh danh sách không có output thô; chi tiết chỉ Run có `stdout`/`stderr`, Submit không có.
- [ ] Xác minh việc ánh xạ sang DTO nằm ở tầng application, không trả entity TypeORM ra ngoài.
- [ ] Chỉ dùng `SubmissionRepositoryPort`; không thêm port cho việc đọc lịch sử.

## Infrastructure

- [ ] N/A — tính năng này không cần adapter mới; dùng `TypeormSubmissionRepository` hiện có.

## Lưu trữ

- [ ] Bổ sung `listByOwner(ownerId, filter, cursor, limit, total)` vào repository port.
- [ ] Bổ sung `findByPublicIdAndOwner(publicId, ownerId)` vào repository port.
- [ ] Đặt `ownerId` là điều kiện bắt buộc, không bao giờ nằm trong nhánh tuỳ chọn.
- [ ] Viết điều kiện con trỏ dạng ghép: `created_at < $cursor OR (created_at = $cursor AND public_id <
$cursorId)`.
- [ ] Sắp xếp `createdAt DESC, publicId DESC` khi nhiều bản ghi trùng mốc thời gian.
- [ ] **Bỏ `relations: { result: true }` khỏi danh sách; chi tiết đọc result rồi ánh xạ dương theo kind.**
- [ ] Dùng `select` tường minh thay vì nạp toàn bộ cột.
- [ ] Xác minh không phát sinh truy cập cơ sở dữ liệu xuyên service.

## Cơ sở dữ liệu / Migration

- [ ] Tạo migration thêm `public_id` UUID UNIQUE, backfill bản ghi cũ bằng UUID khác khoá chính,
      đặt NOT NULL và index `(user_id, created_at DESC, public_id DESC)`.
- [ ] Không xoá public ID khi rollback đã phát ID đó ra API; ghi quy trình dữ liệu riêng.
- [ ] Chạy `pnpm migration:run:submission` ngoài giờ cao điểm vì index được tạo trên bảng có dữ liệu.
- [ ] Xác minh `EXPLAIN` dùng index mới cho truy vấn phân trang có con trỏ.
- [ ] Xác minh `synchronize` vẫn tắt và migration `InitialSubmissionSchema` không bị sửa.

## API

- [ ] Giữ nguyên `GET /api/submissions` và `GET /api/submissions/:publicId`.
- [ ] Thêm query `kind`, `problemId`, `cursor`, `cursorId`, `limit` vào controller.
- [ ] Phản hồi danh sách gồm `items`, `total`, `totalPages`, `nextCursor`; mặc định 20, tối đa 100.
- [ ] Phản hồi dùng `id = publicId`; URL ID cũ vẫn đọc được với owner check trong giai đoạn tương thích.
- [ ] Xác minh phản hồi chi tiết gồm đủ nhóm trường "Chi tiết" của `spec.md`.
- [ ] Bổ sung kiểm tra dữ liệu cho query: `@IsIn`, `@IsUUID`, `@IsISO8601`, `@IsInt`, `@Min`, `@Max`.
- [ ] Từ chối khi `cursor` và `cursorId` không xuất hiện cùng nhau, không âm thầm trả trang đầu.
- [ ] Xác minh phản hồi không chứa Test Case, kết quả mong đợi, harness, lệnh biên dịch hay tham số
      sandbox.
- [ ] Cập nhật Swagger cho hai route.
- [ ] N/A — không thêm route mới, không thêm route sửa hoặc xoá bản ghi.

## Messaging

- [x] N/A — lịch sử là chế độ chỉ đọc, không phát và không tiêu thụ sự kiện nào (SUB-003-FR-015,
      SUB-003-SR-011).

## Realtime

- [x] N/A cho phần ghi — tính năng này chỉ đọc. Realtime thuộc `SUB-004`.
- [ ] Xác minh lịch sử đọc được khi Redis không sẵn sàng, vì đường đọc không import ioredis.

## Phân quyền

- [ ] Xác minh chủ sở hữu chỉ đến từ header tin cậy `x-auth-user-id`.
- [ ] Xác minh không có tham số truy vấn nào chỉ định chủ sở hữu khác.
- [ ] Xác minh phản hồi 404 cho bản ghi không tồn tại và bản ghi của người khác giống hệt nhau.
- [ ] Xác minh khóa tài khoản không thu hồi access token còn hạn; token hết hạn bị từ chối theo ID-001.
- [ ] Xác minh không có quyền `submission:history:read` riêng trong v1.

## Kiểm thử

- [ ] Kiểm thử hai người học, mỗi người chỉ thấy bản ghi của chính mình.
- [ ] Kiểm thử danh sách gồm cả Run và Submit, mỗi bản ghi nêu rõ loại.
- [ ] Kiểm thử lọc theo loại và theo Problem, tập trả về vẫn giới hạn trong sở hữu.
- [ ] Kiểm thử nhiều bản ghi trùng `created_at` → lật trang không lặp và không bỏ sót.
- [ ] Kiểm thử thêm bản ghi mới giữa lúc lật trang → bản ghi cũ không bị bỏ sót hay lặp lại.
- [ ] Kiểm thử `cursor` thiếu `cursorId` hoặc ngược lại → `400`.
- [ ] Kiểm thử `limit` vượt tối đa → `400`, phản hồi giữ kích thước đã phê duyệt.
- [ ] Kiểm thử chi tiết có đủ nhóm trường "Chi tiết".
- [ ] Kiểm thử chi tiết Run có `stdout`/`stderr`; Submit không có output thô, Test Case, kết quả
      mong đợi, harness, lệnh biên dịch hay tham số sandbox.
- [ ] Kiểm thử public ID riêng, backfill, URL ID cũ với owner check, `totalPages` và COUNT chính xác.
- [ ] Kiểm thử bản ghi chưa có phán quyết → trường kết quả là `null`, không phải `0`.
- [ ] Kiểm thử bản ghi `INTERNAL_ERROR` vẫn xuất hiện và việc xem lịch sử không phát sự kiện nào.
- [ ] Kiểm thử tra cứu bản ghi của người khác → phản hồi không cho phân biệt với không tồn tại.
- [ ] Kiểm thử tham số cố mở rộng phạm vi → không thu được bản ghi ngoài sở hữu.
- [ ] Kiểm thử bản ghi của Problem đã bị gỡ → vẫn đọc được, kết quả không đổi.
- [ ] Kiểm thử Redis dừng → lịch sử vẫn đọc được.
- [ ] Kiểm thử danh sách rỗng → `200` với `total = 0`, không phải lỗi.
- [ ] Kiểm thử tài khoản bị khoá nhưng token cũ còn hạn vẫn đọc được; token hết hạn → `401`.
- [ ] Chạy `pnpm lint`.
- [ ] Chạy `pnpm typecheck`.
- [ ] Chạy `pnpm test`.
- [ ] Chạy `pnpm build:submission`.

## Tài liệu

- [ ] Ghi chú index mới và lý do thêm vào tài liệu vận hành.
- [ ] Ghi lại rằng lịch sử không phụ thuộc Learning và không phụ thuộc Redis.
- [ ] N/A — không có thay đổi hợp đồng sự kiện.

## Xác minh

- [ ] Đối chiếu bản triển khai với `FR-001` … `FR-020`, `SR-001` … `SR-013` và `AC-001` …
      `AC-021` của `spec.md`.
- [ ] Xác minh bằng kiểm thử rằng output Submit không lọt ra ở cả hai route; output Run chỉ ở chi tiết.
- [ ] Xác nhận không có hành vi Ngoài phạm vi nào được thêm vào, đặc biệt là xoá bản ghi, xuất dữ
      liệu và quyền quản trị.
- [ ] Chỉ cập nhật trạng thái đặc tả sang `Implemented` thông qua quy trình review đã được phê duyệt.
- [ ] Ghi lại kết quả kiểm chứng và các hành vi chưa được xác minh.

## Tuân thủ kiến trúc

- [ ] Xác minh chiều phụ thuộc `controller → use case → domain port ← adapter`.
- [ ] Xác minh đường đọc lịch sử không chứa HTTP client nào, nên không phụ thuộc Learning.
- [ ] Xác minh đường đọc lịch sử không import ioredis.
- [ ] Xác minh tầng domain không import TypeORM, NestJS hay bất kỳ framework nào.
- [ ] Xác minh bản triển khai khớp với mục Tuân thủ kiến trúc của `plan.md`.
