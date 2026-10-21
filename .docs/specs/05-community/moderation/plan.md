# COM-005 Kế hoạch triển khai Moderation

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.1` (Approved) của đặc tả COM-005. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả.

## Đặc tả liên quan

- [COM-005 Moderation](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`

Đặc tả là nguồn chân lý cho báo cáo, lý do cố định, ẩn/khôi phục, trạng thái ẩn duy nhất và quyền
`community:moderate`. Hệ quả hiển thị của trạng thái ẩn thuộc [COM-001](../posts/spec.md) và
[COM-002](../comments/spec.md). Kế hoạch này không thêm hành vi nào ngoài đặc tả.

## Service đích

Service: Community Service (`apps/community-service`), cơ sở dữ liệu `bkpractice_community`.

Thêm một migration seed quyền ở Identity Service (`apps/identity-service`) theo ID-003-FR-017. Không
đổi API Gateway ngoài việc phụ thuộc ID-003-T048 (đặt `x-auth-permissions`). Không tạo microservice
mới.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md) và
[`community-service.md`](../../../architecture/community-service.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- Moderation có chính sách riêng (vòng đời báo cáo, trạng thái ẩn, quyền kiểm duyệt) nên tách thành
  `modules/moderation/` với `domain`, `application`, `infrastructure`, `presentation`, đúng hướng
  "tách module khi hành vi đủ ý nghĩa" của tài liệu kiến trúc.
- Domain không import NestJS, TypeORM hay client của Identity/Learning.
- Không thêm CQRS, event store hay base repository chung.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `modules/community.entities.ts` đăng ký `Post`, `Comment`, `Reaction`, `Bookmark`, `Report`; cả
  `data-source.ts` và `community-service.module.ts` dùng danh sách này.
- `modules/posts/` là module duy nhất hiện có; entity nằm ở `posts/entities/`; định danh đọc thẳng từ
  `@Headers('x-auth-user-id')`, không đọc quyền.
- `Post.isHidden`, `Comment.isHidden` có sẵn, không có route đặt chúng.
- Entity `Report` (`posts/entities/report.entity.ts`): `post` (`ManyToOne`, cascade), `reporterId`,
  `reason` varchar(500), `status` (`OPEN`/`REVIEWED`/`DISMISSED`), `reviewedBy`, `createdAt`. Không
  service nào dùng nó. Bảng `reports` không có index nào ngoài khoá chính.
- `libs/common` bật `ValidationPipe` toàn cục với `whitelist`, `forbidNonWhitelisted`, `transform`.
- Gateway (`gateway-auth.middleware.ts`) hiện chỉ xoá/đặt `x-auth-user-id`, `x-auth-roles`; chưa có
  `x-auth-permissions` (ID-003-T048). Tiền tố `/api/community` đã được chuyển tới Community.
- Identity: bảng `permissions`, `role_permissions` đã có; vai trò `STUDENT`, `LECTURER`, `ADMIN` đã
  được seed ở migration khởi tạo; chưa có quyền nào được seed.

### Nền tảng do COM-001/COM-002 tạo (theo plan Approved của chúng)

- `src/common/auth/`: `TrustedUserGuard` và `@TrustedPrincipal()` trả
  `Principal { userId, permissions }`, `permissions` tách từ `x-auth-permissions`, thiếu thì rỗng.
- `src/common/errors/`: `ValidationError`, `NotFoundError`, `ForbiddenError`, `InvalidStateError` và
  `CommunityDomainErrorFilter`. `src/common/pagination/`: `PageResponseDto<T>`.
- `src/common/content/`: bộ kiểm tra HTML/Markdown hạn chế.
- `CheckPostInteraction` (COM-001) và `CheckCommentInteraction` (COM-002) trả
  `{ ..., authorId, visibleToViewer, acceptsInteraction }` hoặc `NotFoundError`.
- Cột `deleted_at` trên `posts`, `comments`; `is_hidden` được giữ làm cờ ẩn do COM-005 ghi; phép chiếu
  tác giả có trường `moderation` (`AuthorModerationView`), trước COM-005 chỉ có `status`.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Bảng `reports`, enum `reports_status_enum`; cột `posts.is_hidden`, `comments.is_hidden` làm cờ ẩn duy nhất; `common/auth`, `common/errors`, `common/pagination`, `common/content` của COM-001; `CheckPostInteraction`, `CheckCommentInteraction`; bảng `permissions`/`role_permissions` của Identity                            |
| MODIFY    | Entity `Report` (chuyển sang `moderation/infrastructure/persistence/`, thêm cột); entity `Post`, `Comment` (thêm `hiddenReason`, `hiddenAt`, `hiddenBy`); mapper `AuthorModerationView` của COM-001/002 (bổ sung `reason`, `hiddenAt`); `community.entities.ts`; `posts.module.ts` (bỏ `Report`); `community-service.module.ts` |
| CREATE    | Module `modules/moderation/`; migration Community `Com005Moderation`; migration Identity `Com005CommunityModeratePermission`; test                                                                                                                                                                                              |
| REMOVE    | File `posts/entities/report.entity.ts` (chuyển chỗ, không mất bảng); tên cột `reports.reason` (đổi thành `details`, down khôi phục)                                                                                                                                                                                             |

Hành vi phải giữ tương thích: bảng `reports` giữ dữ liệu cũ; Post/Comment đang `is_hidden = true`
vẫn bị ẩn sau migration; bộ lọc hiển thị của COM-001/002 vẫn đọc `is_hidden` và không phải đổi.

## Thay đổi ở tầng domain

Thư mục `modules/moderation/domain/`, không import framework.

| Khái niệm              | Quy tắc                                                                                                                                      | Truy vết               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `ModerationReason`     | `SPAM` \| `HARASSMENT` \| `INAPPROPRIATE` \| `SOLUTION_SPOILER` \| `OTHER`; parse từ chối giá trị lạ                                         | FR-003, FR-007         |
| `ReportNote`           | Văn bản thuần tuỳ chọn, cắt khoảng trắng hai đầu, ≤ 500 ký tự, từ chối thẻ HTML/script bằng bộ kiểm tra của `common/content/`                | FR-003, SR-005         |
| `ContentRef`           | `{ kind: 'POST', postId }` \| `{ kind: 'COMMENT', postId, commentId }`                                                                       | FR-002                 |
| `ModerationState`      | `VISIBLE` \| `HIDDEN{ reason, hiddenAt, hiddenBy }`; `hide(reason, by, at)` idempotent khi đã `HIDDEN`; `restore()` idempotent khi `VISIBLE` | FR-007, FR-008, FR-011 |
| `Report`               | `status` `OPEN` → `REVIEWED`/`DISMISSED`; `resolve(decision, by, at)` chỉ từ `OPEN`, ngược lại `InvalidStateError`                           | FR-009, FR-011         |
| `ResolutionDecision`   | `HIDE` (bắt buộc `ModerationReason`) \| `DISMISS`                                                                                            | FR-009                 |
| `AuthorModerationView` | Phần bổ sung của COM-005 cho phép chiếu tác giả: `reason`, `hiddenAt` khi `HIDDEN`; không có `hiddenBy`                                      | FR-013, SR-004         |

Lỗi dùng lớp chung của `common/errors/`: tự báo cáo, lý do/ghi chú sai → `ValidationError`; báo cáo đã
xử lý → `InvalidStateError`; không tìm thấy → `NotFoundError`; thiếu quyền → `ForbiddenError`.

COM-005 không định nghĩa quy tắc hiển thị. Việc nội dung có hiển thị với người gọi hay nhận tương tác
mới được hỏi qua `CheckPostInteraction` / `CheckCommentInteraction` (FR-012).

## Tầng application / Use case

Thư mục `modules/moderation/application/`. Mọi use case nhận `Principal { userId, permissions }`.

| Use case         | Quyền                | Luồng chính                                                                                                                                                                                                                                                                             | Truy vết                                 |
| ---------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `ReportContent`  | Đã xác thực          | Hỏi `CheckPostInteraction`/`CheckCommentInteraction` (Comment phải có `postId` trùng route, khác → `NotFoundError`); `authorId` = người gọi → `ValidationError`; `!acceptsInteraction` → `NotFoundError`; upsert báo cáo `OPEN` "không làm gì khi trùng" rồi trả báo cáo `OPEN` hiện có | FR-002–FR-005, FR-017, AC-001–005        |
| `ListReports`    | `community:moderate` | Lọc `status` (mặc định `OPEN`), `targetType`; sắp `(created_at DESC, id DESC)`; phân trang; kèm tác giả, trạng thái ẩn hiện tại và đoạn trích 200 ký tự của đối tượng                                                                                                                   | FR-006, AC-007                           |
| `GetReport`      | `community:moderate` | Trả báo cáo cùng nội dung đầy đủ, trạng thái ẩn và xoá mềm của đối tượng, đọc trực tiếp qua `ModerationTargetRepository` (không qua bộ lọc hiển thị)                                                                                                                                    | FR-006, AC-019                           |
| `ResolveReport`  | `community:moderate` | Transaction: khoá dòng báo cáo (`FOR UPDATE`), không `OPEN` → `InvalidStateError`; khoá dòng đối tượng; `HIDE` → `ModerationState.hide`; chuyển **mọi** báo cáo `OPEN` của đối tượng sang `REVIEWED`/`DISMISSED`                                                                        | FR-009, FR-011, FR-017, AC-011–013, 020  |
| `HideContent`    | `community:moderate` | Transaction: khoá dòng đối tượng (kể cả đã xoá mềm); `hide` idempotent; chuyển mọi báo cáo `OPEN` của đối tượng sang `REVIEWED`                                                                                                                                                         | FR-007, FR-010, FR-011, AC-009, 014, 016 |
| `RestoreContent` | `community:moderate` | Transaction: khoá dòng đối tượng; `restore` idempotent; không đụng báo cáo, xoá mềm hay dữ liệu con                                                                                                                                                                                     | FR-008, FR-011, FR-015, AC-015, 016      |

Kiểm tra `community:moderate` đặt đầu mỗi use case kiểm duyệt, trước khi đọc dữ liệu (SR-001, SR-009).
Luồng thông thường của COM-001–004 không có nhánh nào cho `community:moderate` (FR-014).

### Port

| Port                         | Trách nhiệm                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReportRepository`           | `insertOpenIfAbsent`, `findOpenByReporterAndTarget`, `loadForUpdate(reportId)`, `resolveOpenForTarget(target, status, by, at)`, `list(filter, page)`, `getWithTarget` |
| `ModerationTargetRepository` | `loadForUpdate(ContentRef)` trả `ModerationState` + tác giả + dấu xoá mềm + nội dung; `saveState(ContentRef, ModerationState)` ghi `is_hidden` và ba cột ẩn cùng lúc  |
| `ContentInteractionReader`   | Bọc `CheckPostInteraction`/`CheckCommentInteraction` của COM-001/002 (seam test, không định nghĩa lại quy tắc)                                                        |
| `TransactionRunner`          | Chạy một hàm trong một transaction của datasource Community (tái dùng nếu COM-001/002 đã có)                                                                          |

Không thêm port nào khác.

## Lưu trữ

- Chuyển entity `Report` sang `modules/moderation/infrastructure/persistence/report.orm-entity.ts`,
  đăng ký lại trong `community.entities.ts`; mapper chuyển sang domain `Report`.
- Thêm `hiddenReason`, `hiddenAt`, `hiddenBy` vào entity `Post` và `Comment`. Chỉ adapter của COM-005
  ghi `is_hidden` và ba cột này, luôn cùng một câu `UPDATE` (FR-012).
- Loại đối tượng suy ra từ `comment_id`: `NULL` là Post, khác `NULL` là Comment. `post_id` luôn có để
  lọc và cascade.
- Danh sách báo cáo dùng index `(status, created_at DESC, id DESC)`.
- Chỉ dùng datasource Community; không truy vấn Identity để lấy tên người dùng (trả `userId` thuần).

### Đồng thời

- Báo cáo trùng: partial unique index trên báo cáo `OPEN` + `INSERT ... ON CONFLICT DO NOTHING`, rồi
  đọc lại báo cáo `OPEN` hiện có (FR-005, FR-017).
- Xử lý báo cáo và ẩn/khôi phục: `SELECT ... FOR UPDATE` trên dòng báo cáo và dòng `posts`/`comments`
  trong cùng transaction; cập nhật báo cáo có điều kiện `status = 'OPEN'`, nên người thứ hai thấy báo
  cáo đã kết thúc và nhận `409` (AC-020).

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_community`.

- Tạo enum `moderation_reason_enum` (`SPAM`, `HARASSMENT`, `INAPPROPRIATE`, `SOLUTION_SPOILER`,
  `OTHER`).
- `reports`:
  - thêm `comment_id` uuid NULL, FK nội bộ tới `comments(id)` `ON DELETE CASCADE`;
  - thêm `reason_code moderation_reason_enum`, backfill `OTHER` cho dòng cũ rồi đặt NOT NULL;
  - đổi tên `reason` → `details`, cho phép NULL (giữ varchar(500));
  - thêm `reviewed_at` timestamptz NULL;
  - partial unique index `UQ_reports_open_post (reporter_id, post_id) WHERE status = 'OPEN' AND
comment_id IS NULL` và `UQ_reports_open_comment (reporter_id, comment_id) WHERE status = 'OPEN' AND
comment_id IS NOT NULL`;
  - index `IDX_reports_status_created (status, created_at DESC, id DESC)`, `IDX_reports_post_id`,
    `IDX_reports_comment_id`.
- `posts` và `comments`: thêm `hidden_reason moderation_reason_enum` NULL, `hidden_at` timestamptz
  NULL, `hidden_by` uuid NULL; backfill dòng `is_hidden = true` với `hidden_reason = 'OTHER'`,
  `hidden_at = updated_at`; thêm `CHECK (is_hidden = (hidden_at IS NOT NULL))`.

`is_hidden` giữ nguyên là cờ ẩn duy nhất mà COM-001–004 đọc. Không có khoá ngoại hay truy vấn xuyên
service; `reporter_id`, `reviewed_by`, `hidden_by` là UUID thuần.

Thay đổi ở `bkpractice_identity`: chèn một dòng `permissions` (`community:moderate`) và một dòng
`role_permissions` gán cho `ADMIN`. Không đổi schema.

## Migration

### Community

`apps/community-service/src/database/migrations/<timestamp>-Com005Moderation.ts`, chạy sau
`Com001Posts` và `Com002Comments`, `synchronize: false`.

- **Up:** kiểm tra trước không có hai báo cáo `OPEN` trùng `(reporter_id, post_id)` (chưa có API tạo
  báo cáo nên kỳ vọng rỗng; nếu có thì giữ bản mới nhất `OPEN`, chuyển bản còn lại sang `DISMISSED`);
  tạo enum; sửa `reports` theo thứ tự ở trên; thêm cột ẩn, backfill và CHECK trên `posts`, `comments`.
- **Down:** bỏ CHECK và ba cột ẩn trên `posts`, `comments` (giữ `is_hidden`); xoá báo cáo có
  `comment_id IS NOT NULL` (mất dữ liệu, ghi cảnh báo trong tài liệu triển khai); đổi `details` →
  `reason` với `COALESCE(details, reason_code::text)` rồi đặt NOT NULL; bỏ `reason_code`,
  `reviewed_at`, `comment_id`, các index; bỏ enum.
- Kiểm chứng bằng `pnpm migration:run:community` / `pnpm migration:revert:community` trên CSDL cách
  ly có dữ liệu mẫu (báo cáo cũ, Post đang ẩn).

### Identity (task seed quyền)

`apps/identity-service/src/database/migrations/<timestamp>-Com005CommunityModeratePermission.ts`, chạy
sau migration danh mục quyền của ID-003 (ID-003-T047).

- **Up:** `INSERT INTO permissions (code, description) VALUES ('community:moderate', 'Moderate
Community content and reports') ON CONFLICT (code) DO NOTHING`; chèn `role_permissions` cho vai trò
  `ADMIN` với `ON CONFLICT DO NOTHING`. Không gán cho `STUDENT` hay `LECTURER`.
- **Down:** xoá phép gán `ADMIN`–`community:moderate` rồi xoá dòng `permissions` đó.
- Kiểm chứng bằng `pnpm migration:run:identity` / `pnpm migration:revert:identity`.

## API

Tiền tố `/api/community` đã được Gateway chuyển tới Community. Tất cả route cần Bearer token.

| Method + route                                                  | Use case         | Phản hồi                                              |
| --------------------------------------------------------------- | ---------------- | ----------------------------------------------------- |
| `POST /api/community/posts/:postId/reports`                     | `ReportContent`  | `201` báo cáo mới; `200` báo cáo `OPEN` đã có         |
| `POST /api/community/posts/:postId/comments/:commentId/reports` | `ReportContent`  | Như trên                                              |
| `GET /api/community/moderation/reports`                         | `ListReports`    | `200` `PageResponseDto<ModerationReportResponseDto>`  |
| `GET /api/community/moderation/reports/:reportId`               | `GetReport`      | `200` báo cáo + nội dung đầy đủ đối tượng             |
| `POST /api/community/moderation/reports/:reportId/resolve`      | `ResolveReport`  | `200` báo cáo sau xử lý + trạng thái ẩn của đối tượng |
| `POST /api/community/moderation/posts/:postId/hide`             | `HideContent`    | `200` `{ status, reason, hiddenAt }`                  |
| `POST /api/community/moderation/posts/:postId/restore`          | `RestoreContent` | `200` `{ status: 'VISIBLE' }`                         |
| `POST /api/community/moderation/comments/:commentId/hide`       | `HideContent`    | Như ẩn Post                                           |
| `POST /api/community/moderation/comments/:commentId/restore`    | `RestoreContent` | Như khôi phục Post                                    |

- Không đổi route nào của `posts`/`comments`. Phần bổ sung `reason`, `hiddenAt` đi vào trường
  `moderation` sẵn có trong phép chiếu tác giả của COM-001/002 (FR-013).
- Swagger mô tả mọi route; ví dụ không chứa nội dung thật hay định danh người báo cáo thật.

## DTO / Kiểm tra dữ liệu

- `CreateReportRequestDto`: `reasonCode` (`IsEnum(ModerationReason)`, bắt buộc), `note` (string, tuỳ
  chọn, `MaxLength(500)`); kiểm tra HTML ở `ReportNote`.
- `ListReportsQueryDto`: `status` (`OPEN` \| `REVIEWED` \| `DISMISSED`, mặc định `OPEN`),
  `targetType` (`POST` \| `COMMENT`, tuỳ chọn), `page` (int ≥ 1, mặc định 1), `pageSize` (int 1..50,
  mặc định 20).
- `ResolveReportRequestDto`: `decision` (`HIDE` \| `DISMISS`), `reasonCode` (`ValidateIf` bắt buộc
  khi `HIDE`; khi `DISMISS` giá trị này không được dùng và không được lưu).
- `HideContentRequestDto`: `reasonCode` bắt buộc. Khôi phục: không body.
- Tham số route `postId`, `commentId`, `reportId` qua `ParseUUIDPipe`.
- `forbidNonWhitelisted` chặn `reporterId`, `status`, `reviewedBy`, mốc thời gian trong body
  (SR-006, AC-024).
- Response DTO ánh xạ tường minh: `ReportResponseDto` (cho người báo cáo: `id`, `targetType`,
  `postId`, `commentId?`, `reasonCode`, `status`, `createdAt`), `ModerationReportResponseDto` (thêm
  `reporterId`, `note`, `targetAuthorId`, `excerpt`, `targetModerationStatus`, `reviewedBy`,
  `reviewedAt`), `ModerationReportDetailResponseDto` (thêm `content`, `targetDeleted`),
  `ModerationStateResponseDto`.

## Phân quyền

- Dùng `TrustedUserGuard` và `@TrustedPrincipal()` của `common/auth/` (COM-001): `x-auth-user-id`
  phải là UUID, thiếu hoặc sai → `401`; `permissions` từ `x-auth-permissions`, thiếu → rỗng. Không
  đọc `x-auth-roles`.
- Use case kiểm duyệt kiểm `principal.permissions.has('community:moderate')`; không có →
  `ForbiddenError` (`403`).
- Báo cáo chỉ cần principal hợp lệ.
- **Seed quyền ở Identity:** migration ở mục Migration, gán `community:moderate` **chỉ cho `ADMIN`**.
- Kiểm thử khẳng định (`ADMIN` có quyền) và phủ định (`STUDENT`, `LECTURER`, `ADMIN` có token thiếu
  claim, header quyền giả mạo bị Gateway loại bỏ).

## Messaging / Sự kiện

N/A. COM-005 không phát hay tiêu thụ event; đặc tả không có nhu cầu bất đồng bộ.

## Realtime

N/A. Hàng đợi báo cáo realtime là Ngoài phạm vi.

## Adapter hạ tầng

- `infrastructure/persistence/report.orm-entity.ts`, `typeorm-report.repository.ts`.
- `infrastructure/persistence/typeorm-moderation-target.repository.ts`: đọc/ghi cột ẩn của `posts`,
  `comments` với khoá pessimistic.
- `infrastructure/content-interaction.adapter.ts`: gọi `CheckPostInteraction` / `CheckCommentInteraction`.
- `moderation.module.ts` import `PostsModule`, `CommentsModule` (lấy use case kiểm tra tương tác), gắn
  adapter vào port tại composition root.
- Không thêm adapter HTTP hay messaging; không gọi Identity lúc chạy.

## Cấu hình

No configuration change. Không thêm biến môi trường; không đổi `.env.example`, Docker hay Gateway
proxy.

## Xử lý lỗi

| Điều kiện                                                                   | Ánh xạ (qua `CommunityDomainErrorFilter`) |
| --------------------------------------------------------------------------- | ----------------------------------------- |
| Thiếu/sai token                                                             | `401` qua Gateway                         |
| Thiếu hoặc sai `x-auth-user-id` ở Community                                 | `401`                                     |
| Thiếu `community:moderate`                                                  | `403`                                     |
| Đối tượng/báo cáo không tồn tại, không nhận tương tác mới, Comment sai Post | `404`                                     |
| Tự báo cáo; lý do/ghi chú/quyết định sai; body lạ                           | `400`                                     |
| Báo cáo đã xử lý                                                            | `409`                                     |
| Lỗi lưu trữ ngoài dự kiến                                                   | `500` chuẩn hoá hiện có                   |

Không đưa vào cấu trúc lỗi mới; thông báo lỗi không chứa nội dung bài hay ghi chú.

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                                   |
| ------- | --------------------------------------------------------------------------------------------------------------- |
| SR-001  | Kiểm quyền trong use case, không ở controller hay frontend                                                      |
| SR-002  | Quyền chỉ từ `x-auth-permissions` qua `@TrustedPrincipal()`; không suy ra từ `x-auth-roles`                     |
| SR-003  | `ReportContent` trả `404` khi không nhận tương tác mới; nội dung ẩn chỉ trả ở route `moderation/*` có quyền     |
| SR-004  | `reporterId` chỉ có trong DTO kiểm duyệt; phần bổ sung `AuthorModerationView` không có người kiểm duyệt/báo cáo |
| SR-005  | `ReportNote` từ chối HTML/script và > 500 ký tự                                                                 |
| SR-006  | DTO danh sách cho phép + `forbidNonWhitelisted`                                                                 |
| SR-007  | Chỉ datasource Community; ID người dùng là UUID thuần                                                           |
| SR-008  | Log chỉ ghi `reportId`, loại/ID đối tượng, quyết định, request ID                                               |
| SR-009  | Principal thiếu/sai → `401`; quyền thiếu → `403` trước khi đọc dữ liệu                                          |

## Chiến lược kiểm thử

- **Unit (domain):** `ModerationReason`; `ReportNote` (500 ký tự, thẻ HTML, chuỗi rỗng);
  `ModerationState` hide/restore idempotent; `Report.resolve` chỉ từ `OPEN`.
- **Unit (application, port giả):** `ReportContent` tự báo cáo, trùng, không nhận tương tác mới
  (AC-002, 003, 005); `ResolveReport` áp cho mọi báo cáo `OPEN` (AC-011, 012), đã xử lý (AC-013);
  `HideContent` kết thúc báo cáo mở (AC-014); kiểm quyền (AC-006, 008).
- **Integration (lưu trữ):** partial unique index và upsert; khoá dòng cho hai lần xử lý đồng thời
  (AC-020); `is_hidden` và cột ẩn ghi cùng lúc, CHECK giữ nhất quán; migration Community và Identity
  up/down.
- **API/E2E (cùng COM-001/002):** mọi route với `ADMIN` có quyền, `STUDENT`, `LECTURER`, `ADMIN` thiếu
  claim (AC-006–008); ẩn Post → người khác và người kiểm duyệt khác nhận `404` ở COM-001, tác giả thấy
  `moderation` có `reason`, `hiddenAt` (AC-009, 010); ẩn Post → Comment của người khác `404`, khôi phục
  đọc lại được (AC-017); ẩn Comment gốc còn trả lời → cả cây không xuất hiện, khôi phục thì hiện lại
  theo trạng thái riêng (AC-018); khôi phục giữ dữ liệu con
  (AC-015); chi tiết báo cáo nội dung ẩn/xoá mềm (AC-019); không lộ người báo cáo (AC-021); token
  `ADMIN` chứa `community:moderate` (AC-022); `401` (AC-023); trường lạ (AC-024).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID hiện có.
- Log mức info cho tạo báo cáo, xử lý báo cáo, ẩn, khôi phục: `reportId`, `targetType`, `postId`,
  `commentId`, quyết định, `moderatorId`, request ID. Không log nội dung, ghi chú hay header xác thực.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                              | Kiểm chứng                     |
| -------------- | ------------------------------------------------------------- | ------------------------------ |
| FR-001         | Module `moderation` trong Community; seed quyền ở Identity    | Kiến trúc                      |
| FR-002–FR-005  | `ReportContent`, `ReportNote`, partial unique index           | Unit/API; AC-001–005, 024      |
| FR-006         | `ListReports`, `GetReport`                                    | API; AC-007, 019               |
| FR-007, FR-010 | `HideContent`, `ModerationState.hide`                         | API; AC-009, 014, 016          |
| FR-008, FR-015 | `RestoreContent`                                              | API; AC-015, 016, 017          |
| FR-009         | `ResolveReport`                                               | Unit/API; AC-011–013           |
| FR-011         | Cột `hidden_by/at`, `reviewed_by/at`                          | Integration                    |
| FR-012         | `is_hidden` là cờ duy nhất, chỉ adapter COM-005 ghi           | Rà soát/integration; AC-018    |
| FR-013         | Bổ sung `reason`, `hiddenAt` vào `moderation` của COM-001/002 | API; AC-010                    |
| FR-014         | Không nhánh `community:moderate` trong luồng thông thường     | API; AC-009                    |
| FR-016         | Không có route xoá báo cáo                                    | Rà soát                        |
| FR-017         | Transaction, khoá dòng, upsert                                | Integration; AC-020            |
| SR-001–SR-009  | Mục Bảo mật                                                   | Test bảo mật; AC-006, 008, 021 |

## Thứ tự triển khai

1. Xác nhận COM-001/COM-002 đã triển khai (`common/`, `CheckPostInteraction`,
   `CheckCommentInteraction`, `deleted_at`, trường `moderation`); ID-003-T047/T048 đã có.
2. Domain moderation và unit test.
3. Migration Community `Com005Moderation`, chuyển entity `Report`, thêm cột ẩn vào entity; kiểm chứng
   up/down.
4. Migration Identity seed `community:moderate` cho `ADMIN`; kiểm chứng up/down.
5. Adapter lưu trữ và adapter kiểm tra tương tác; integration test.
6. Use case, DTO, controller, Swagger.
7. Bổ sung `reason`, `hiddenAt` vào `moderation` của phép chiếu tác giả COM-001/002.
8. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **COM-001, COM-002** (Approved): `common/`, `CheckPostInteraction`, `CheckCommentInteraction`, cột
  `deleted_at`, bộ lọc hiển thị đọc `is_hidden`, trường `moderation` trong phép chiếu tác giả.
- **ID-003-T047** (migration danh mục quyền) và **ID-003-T048** (Gateway đặt `x-auth-permissions`).
  Chưa có T048 thì mọi thao tác kiểm duyệt trả `403` đúng theo hướng đóng.

## Rủi ro

- **Plan COM-001/002 còn tham chiếu bản nháp cũ của plan này** (`ContentVisibilityPolicy`,
  `visible-content.predicate`, `ContentVisibilityReader`, "quy tắc hiển thị COM-005-FR-012"). Bản cuối
  không cung cấp các thành phần đó; COM-001/002 tự giữ quy tắc hiển thị như đặc tả của chúng. Xem mục
  dưới.
- **Down migration** xoá báo cáo trên Comment.
- **Header quyền chưa được Gateway đặt**: kiểm duyệt không dùng được cho tới ID-003-T048.
- **Danh mục quyền tăng theo feature:** đã được ID-003-AC-017/018 diễn đạt theo tập quyền của từng
  vai trò, nên việc thêm `community:moderate` không còn mâu thuẫn.

## Tuân thủ kiến trúc

- Chiều phụ thuộc: controller → use case → domain; adapter TypeORM hiện thực port; domain không import
  NestJS/TypeORM.
- Quyền sở hữu: báo cáo và trạng thái ẩn chỉ trong `bkpractice_community`; Identity chỉ sở hữu mã
  quyền và phép gán; Community không truy vấn Identity.
- Module `moderation` gọi `posts`/`comments` qua use case được export trong cùng service; không có gì
  vào `libs/`.
- Không có ngoại lệ kiến trúc nào.

## Điểm phối hợp đã giải quyết

1. **Danh mục quyền:** ID-003-AC-017/018 đã được làm rõ ngày 2026-09-30: token chứa hợp các quyền mà
   các đặc tả Approved gán cho từng vai trò. Vì vậy `ADMIN` nhận `community:moderate`, còn
   `STUDENT`/`LECTURER` không nhận quyền này, đúng COM-005-AC-022.
2. **Chỗ đặt quy tắc hiển thị.** Bản nháp đầu của plan này đề xuất `ContentVisibilityPolicy` trong
   `modules/moderation/` làm nguồn duy nhất, và plan COM-001/002 đã ghi sẽ chuyển sang dùng nó. Bản
   cuối bỏ đề xuất đó, vì đặc tả Approved của COM-001/002 đã định nghĩa quy tắc hiển thị và cung cấp
   `CheckPostInteraction`/`CheckCommentInteraction`. Quy tắc trong domain `Post`/`Comment` là nguồn
   duy nhất; `is_hidden` là cờ ẩn duy nhất, còn ba cột `hidden_reason`, `hidden_at`, `hidden_by` là
   bổ sung chỉ COM-005 ghi.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.1). Danh sách công việc dẫn xuất từ kế hoạch này nằm ở
> [`tasks.md`](./tasks.md).
