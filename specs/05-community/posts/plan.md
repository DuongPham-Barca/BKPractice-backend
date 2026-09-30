# COM-001 Kế hoạch triển khai Bài viết cộng đồng (Posts)

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.0` (Approved) của đặc tả COM-001. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả.

## Đặc tả liên quan

- [COM-001 Bài viết cộng đồng](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`

## Service đích

Service: Community Service

Post nằm trong module `posts` hiện có (`apps/community-service/src/modules/posts/`), trong
`bkpractice_community`. Không tạo microservice mới. Không đổi Gateway: tiền tố `/api/community` đã
được chuyển tới Community.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture** (theo
[ADR 0002](../../../docs/adr/0002-revised-service-internal-architectures.md) và
[community-service.md](../../../docs/architecture/community-service.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- COM-001 là tính năng đầu tiên của Community có quy tắc sở hữu và vòng đời, nên nó tách module
  `posts` thành `domain`, `application`, `infrastructure`, `presentation` đúng như
  `community-service.md` cho phép khi module "có đủ policy". Không tạo thư mục rỗng cho Reactions,
  Bookmarks hay Moderation.
- Controller chỉ lo transport; use case giữ quy tắc sở hữu và hiển thị; TypeORM chỉ ở
  infrastructure.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `community-service.module.ts` nạp `PostsModule`, `HealthModule`, TypeORM với
  `communityEntities` (`Post`, `Comment`, `Reaction`, `Bookmark`, `Report`).
- `database/data-source.ts` dùng `COMMUNITY_DATABASE_URL`, `synchronize: false`, migration trong
  `database/migrations/`. Chỉ có `1700000002000-InitialCommunitySchema.ts`.
- `posts` (migration đầu): `id` uuid, `author_id` uuid NOT NULL, `scope` enum
  `posts_scope_enum` (`GLOBAL`,`PROBLEM`,`COURSE`), `content` text NOT NULL, `problem_id`,
  `course_id` uuid null, `is_pinned`, `is_hidden` boolean mặc định `false`, `created_at`,
  `updated_at`. Index trên `author_id`, `problem_id`, `course_id`. Không có CHECK nào.
- `comments`, `reactions`, `bookmarks`, `reports` có khoá ngoại nội bộ tới `posts(id)`
  `ON DELETE CASCADE`.
- `PostsService` gộp `list`, `create`, `comment` (COM-002), `toggleLike` (COM-003), dùng thẳng
  `Repository<T>` của TypeORM.
- `PostsController` (`api/community/posts`): `GET /`, `POST /`, `POST /:id/comments`,
  `POST /:id/reactions/like`; đọc `@Headers('x-auth-user-id')` không kiểm tra.
- `CreatePostDto`: `scope` enum, `content` 1..10.000, `problemId`/`courseId` UUID theo
  `ValidateIf`.
- `configureHttpApp` (libs/common) bật `ValidationPipe` toàn cục `whitelist`,
  `forbidNonWhitelisted`, `transform`.
- Gateway (`gateway-auth.middleware.ts`) xoá và đặt lại `x-auth-user-id`, `x-auth-roles` từ token đã
  xác minh; mọi route `/api/*` trừ đăng ký/đăng nhập/làm mới đều cần Bearer.
- Chưa có test nào trong Community.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Bảng `posts`, enum `posts_scope_enum`, cột `is_hidden` làm cờ ẩn bởi kiểm duyệt (COM-005 ghi); các index hiện có; `ValidationPipe` toàn cục; `HealthModule`; tiền tố Gateway `/api/community`                                                                                                                                                         |
| MODIFY    | Entity `Post` (thêm `title`, `editedAt`, `deletedAt`); `CreatePostDto` (thêm `title`, từ chối phạm vi/đích không khớp); `PostsController` (route Post mới, guard định danh); `PostsService` (bỏ `list`, `create`; tạm giữ `comment` cho tới COM-002 và `toggleLike` cho tới COM-003); `posts.module.ts` (nối dây use case, export truy vấn tương tác) |
| CREATE    | `posts/domain/` (model `Post`, `PostTitle`, `PostTarget`, lỗi domain); `common/content/restricted-markdown.ts`; `common/auth/` (guard + decorator principal); `common/errors/` (lỗi domain chung + exception filter); `common/pagination/`; use case; port `PostRepository`; adapter TypeORM; DTO response/query; migration `Com001Posts`; test       |
| REMOVE    | `PostsService.list` và `PostsService.create` (thay bằng use case). Sắp theo `is_pinned` (ghim là Ngoài phạm vi). Không xoá bảng hay cột nào                                                                                                                                                                                                           |

Hành vi phải giữ tương thích: route `POST /api/community/posts/:id/comments` và
`POST /api/community/posts/:id/reactions/like` tiếp tục hoạt động như cũ cho tới khi COM-002 và
COM-003 thay chúng; chỉ khác là guard định danh mới trả `401` khi thiếu header tin cậy.

Thay đổi contract có chủ đích: `POST /api/community/posts` bắt buộc `title` và từ chối `400` khi phạm
vi/đích không khớp; `GET /api/community/posts` trả dạng trang thay vì mảng.

## Thay đổi ở tầng domain

Đặt trong `modules/posts/domain/`, không import NestJS hay TypeORM.

| Khái niệm            | Quy tắc                                                                                                                                                    | Truy vết       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `Post`               | Model có `id`, `authorId`, `target`, `title`, `content`, `createdAt`, `editedAt`, `deletedAt`, `hiddenByModeration` (chỉ đọc với COM-001)                  | FR-001, FR-005 |
| `PostTitle`          | Bỏ khoảng trắng đầu/cuối; 1..200 ký tự; văn bản thuần: từ chối thẻ HTML, xuống dòng và ký tự điều khiển                                                    | FR-014         |
| `PostTarget`         | `GLOBAL` (không id) \| `PROBLEM` (đúng `problemId`) \| `COURSE` (đúng `courseId`); UUID; tổ hợp khác là lỗi kiểm tra dữ liệu                               | FR-003, FR-004 |
| `RestrictedMarkdown` | Dùng chung trong service (`common/content/`): bỏ khoảng trắng đầu/cuối, độ dài tối thiểu/tối đa theo tham số, từ chối HTML/script ngoài khối mã (xem dưới) | FR-014, SR-005 |

Hành vi của `Post`:

- `edit(actorId, title?, content?, now)`: tác giả; chưa xoá mềm (ngược lại `InvalidStateError`); đặt
  `editedAt = now`; không đổi `hiddenByModeration`.
- `softDelete(actorId, now)`: tác giả; chưa xoá mềm; đặt `deletedAt = now`.
- `restore(actorId)`: tác giả; đã xoá mềm; đặt `deletedAt = null`; không đổi `hiddenByModeration`.
- `isVisibleTo(viewerId)`: tác giả luôn `true` với Post chưa xoá; người khác chỉ khi chưa xoá và
  không bị ẩn. Post đã xoá chỉ hiện với tác giả qua `ListMyPosts` (và là đích của `RestorePost`),
  đúng bảng trạng thái của đặc tả.
- `acceptsInteraction()`: `true` chỉ khi chưa xoá và không bị ẩn (FR-016).
- Kiểm tra sở hữu so `authorId` với principal. Không phải tác giả: `ForbiddenError` nếu Post hiển thị
  với người gọi, ngược lại `NotFoundError` (không lộ sự tồn tại).

### Bộ kiểm tra Markdown hạn chế

1. Tạm bỏ khối mã rào (` ``` ` hoặc `~~~`, kể cả khối chưa đóng tới hết văn bản) và đoạn mã
   inline (chuỗi backtick cân bằng).
2. Trên phần còn lại, từ chối nếu có: thẻ HTML mở/đóng (`<tên ...>`, `</tên>`), chú thích `<!--`,
   `<!DOCTYPE`, `<?`, hoặc đích liên kết/ảnh Markdown dùng lược đồ `javascript:`, `vbscript:`,
   `data:`.
3. Không biến đổi nội dung được lưu ngoài việc bỏ khoảng trắng đầu/cuối.

Kết quả: `#include <stdio.h>` trong khối mã hợp lệ (AC-007); cùng chuỗi đó ngoài khối mã bị từ chối
như thẻ HTML, người dùng cần đặt mã trong khối mã.

## Tầng application / Use case

Đặt trong `modules/posts/application/`. Mọi use case nhận `actorId` đã xác minh từ presentation.

| Use case               | Luồng chính                                                                                                                                               | Truy vết                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `CreatePost`           | Dựng `PostTitle`, `RestrictedMarkdown(1..10.000)`, `PostTarget`; `authorId = actorId`; lưu                                                                | FR-002–FR-004, AC-001–003, 006, 007   |
| `GetPost`              | Nạp theo id; không tồn tại hoặc `!isVisibleTo(actorId)` → `NotFoundError`; phép chiếu tác giả kèm trạng thái khi người gọi là tác giả                     | FR-006, FR-013, AC-012, 015           |
| `ListPosts`            | Trang Post chưa xoá, không bị ẩn, lọc `scope`/`problemId`/`courseId`, sắp `(created_at DESC, id DESC)`                                                    | FR-007, AC-008, 009                   |
| `ListMyPosts`          | Trang Post có `author_id = actorId`, gồm đã xoá và bị ẩn, kèm trạng thái                                                                                  | FR-008, AC-016                        |
| `UpdatePost`           | Nạp; kiểm tra hiển thị/sở hữu; `post.edit`; lưu có điều kiện `deleted_at IS NULL` (0 dòng → `InvalidStateError`)                                          | FR-009, FR-017, AC-010, 011, 014, 018 |
| `DeletePost`           | Nạp; kiểm tra; `post.softDelete`; lưu có điều kiện `deleted_at IS NULL`                                                                                   | FR-010, FR-017, AC-012, 014           |
| `RestorePost`          | Nạp (kể cả đã xoá, chỉ khi người gọi là tác giả; người khác → `NotFoundError`); `post.restore`; lưu có điều kiện `deleted_at IS NOT NULL`                 | FR-011, AC-013, 014                   |
| `CheckPostInteraction` | Truy vấn cho module Community khác: trả `{ postId, authorId, visibleToViewer, acceptsInteraction }` hoặc `NotFoundError` nếu không hiển thị với người hỏi | FR-016, AC-019                        |

Quy tắc chung cho `UpdatePost`, `DeletePost`, `RestorePost`: nếu người gọi là tác giả thì Post luôn
được nạp (kể cả đã xoá) và lỗi trạng thái trả `409` (AC-014); nếu không phải tác giả thì Post không
hiển thị với họ trả `404`, Post hiển thị với họ trả `403`.

`CheckPostInteraction` được `PostsModule` export để COM-002 dùng trong cùng process (COM-003/COM-004
dùng `ContentVisibilityReader` của COM-005, cùng quy tắc). Đây là seam ứng dụng giữa các module trong
Community, không phải truy cập xuyên service. Quy tắc `isVisibleTo` trùng COM-005-FR-012 và sẽ gọi
`ContentVisibilityPolicy` khi COM-005 được triển khai (xem Vấn đề cần chủ sở hữu xem lại).

### Port

| Port             | Trách nhiệm                                                                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PostRepository` | `findById`; `insert`; `saveIfState(post, expectDeleted)` trả số dòng đổi; `listVisible(filter, page)`; `listByAuthor(authorId, page)`; cả hai trả `{ items, total }` |

Không thêm port nào khác. Thời gian lấy từ `new Date()` trong use case; không có port `Clock` vì
không có nhu cầu kiểm thử phụ thuộc thời gian ngoài việc có mặt mốc.

## Lưu trữ

- Chỉ datasource Community (`bkpractice_community`).
- Adapter `TypeOrmPostRepository` ánh xạ entity `Post` ↔ model domain; entity vẫn ở
  `modules/posts/entities/post.entity.ts` để không phải sửa import của `Comment`, `Reaction`,
  `Bookmark`, `Report` (trạng thái chuyển tiếp đã được `dependency-rules.md` chấp nhận).
- `deletedAt` dùng `@Column` thường, **không** dùng `@DeleteDateColumn`, để TypeORM không tự lọc và
  `ListMyPosts`/`RestorePost` vẫn đọc được Post đã xoá.
- Truy vấn công khai luôn kèm `deleted_at IS NULL AND is_hidden = false`.
- Lưu có điều kiện: `UPDATE posts SET ... WHERE id = $1 AND deleted_at IS NULL` (hoặc `IS NOT NULL`
  khi khôi phục); 0 dòng → `InvalidStateError`. Cách này xử lý đua sửa/xoá mà không cần khoá dòng.
- `total` của danh sách chỉ đếm Post trong cùng điều kiện lọc hiển thị, nên không lộ số Post bị ẩn.

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_community`, bảng `posts`.

- Thêm `title varchar(200) NOT NULL` (điền từ dữ liệu cũ, xem Migration).
- Thêm `edited_at timestamptz NULL`, `deleted_at timestamptz NULL`.
- Thêm `CONSTRAINT "CHK_posts_scope_target" CHECK (
(scope = 'GLOBAL' AND problem_id IS NULL AND course_id IS NULL) OR
(scope = 'PROBLEM' AND problem_id IS NOT NULL AND course_id IS NULL) OR
(scope = 'COURSE' AND course_id IS NOT NULL AND problem_id IS NULL))`.
- Thêm index `IDX_posts_feed` trên `(created_at DESC, id DESC) WHERE deleted_at IS NULL AND
is_hidden = false`, và `IDX_posts_author_created` trên `(author_id, created_at DESC, id DESC)`.
- Giữ `is_pinned` (không đọc, không ghi trong COM-001) và `is_hidden` (COM-005 ghi).

Không có khoá ngoại hay truy vấn xuyên service.

## Migration

`apps/community-service/src/database/migrations/<timestamp>-Com001Posts.ts`, timestamp lớn hơn
`1700000002000`, `synchronize: false`.

- **Up:**
  1. Kiểm tra dòng vi phạm quy tắc phạm vi/đích; nếu có, ném lỗi nêu số dòng và dừng (không tự sửa
     dữ liệu nghiệp vụ). Riêng `GLOBAL` có id thừa thì đặt id về `NULL`, vì code cũ vốn đã bỏ các id
     này khi tạo.
  2. Thêm `title` cho phép null; điền `left(btrim(regexp_replace(content, '\s+', ' ', 'g')), 200)`;
     chuỗi rỗng thì điền `'(không tiêu đề)'`; đặt `NOT NULL`.
  3. Thêm `edited_at`, `deleted_at`, CHECK, hai index.
- **Down:** bỏ hai index, CHECK, `deleted_at`, `edited_at`, `title`. Dữ liệu tiêu đề và dấu xoá mềm
  mất khi down; Post đã xoá mềm sẽ hiện lại. Ghi cảnh báo này trong tài liệu triển khai.
- Kiểm chứng bằng `pnpm migration:run:community` / `pnpm migration:revert:community` trên cơ sở dữ
  liệu cách ly có dữ liệu mẫu.

## API

Tất cả route dưới `/api/community/posts`, cần Bearer ở Gateway và guard định danh ở Community.

| Method + route                          | Use case      | Phản hồi                                                       |
| --------------------------------------- | ------------- | -------------------------------------------------------------- |
| `POST /api/community/posts`             | `CreatePost`  | `201` Post (phép chiếu tác giả)                                |
| `GET /api/community/posts`              | `ListPosts`   | `200` `{ items, page, pageSize, total }` bản tóm tắt công khai |
| `GET /api/community/posts/mine`         | `ListMyPosts` | `200` trang bản tóm tắt kèm `deletedAt`, `moderation`          |
| `GET /api/community/posts/:id`          | `GetPost`     | `200` Post; kèm trạng thái khi người gọi là tác giả            |
| `PATCH /api/community/posts/:id`        | `UpdatePost`  | `200` Post                                                     |
| `DELETE /api/community/posts/:id`       | `DeletePost`  | `204`                                                          |
| `POST /api/community/posts/:id/restore` | `RestorePost` | `200` Post                                                     |

- `GET /mine` khai báo trước `GET /:id`. `:id` kiểm bằng `ParseUUIDPipe` (sai định dạng → `400`).
- `POST /:id/comments` (COM-002) và `POST /:id/reactions/like` (COM-003) giữ nguyên hành vi.
- Swagger: `@ApiTags('community')`, `@ApiBearerAuth()`, mô tả DTO và mã lỗi; ví dụ không chứa dữ liệu
  thật.

## DTO / Kiểm tra dữ liệu

- `CreatePostRequestDto`: `title` (string, bắt buộc), `content` (string, bắt buộc), `scope`
  (`PostScope`), `problemId?`, `courseId?` (UUID). DTO chỉ kiểm kiểu và `MaxLength` thô (201 /
  10.001) để chặn sớm; quy tắc chính xác và tổ hợp phạm vi/đích nằm ở value object domain.
- `UpdatePostRequestDto`: `title?`, `content?`; ít nhất một trường, ngữ nghĩa `PATCH`.
- `ListPostsQueryDto`: `page` (int ≥ 1, mặc định 1), `pageSize` (int 1..50, mặc định 20), `scope?`,
  `problemId?`, `courseId?` (UUID). `problemId` kèm `scope` khác `PROBLEM` hoặc `courseId` kèm `scope`
  khác `COURSE` → `400`.
- `PageQueryDto` dùng chung (`common/pagination/`) cho `page`/`pageSize`.
- `forbidNonWhitelisted` toàn cục chặn `authorId`, `isHidden`, `isPinned`, `deletedAt`, vai trò,
  quyền (SR-003, AC-005).
- Response: `PostResponseDto` (`id`, `authorId`, `scope`, `problemId`, `courseId`, `title`,
  `content`, `createdAt`, `editedAt`), `AuthorPostResponseDto` mở rộng thêm `deletedAt` và
  `moderation` (phép chiếu `AuthorModerationView` của COM-005-FR-013: `status` `VISIBLE` \| `HIDDEN`;
  trước khi COM-005 có, chỉ có `status` suy từ `is_hidden`; COM-005 bổ sung `reason`, `hiddenAt`);
  `PostSummaryResponseDto` (không có `content` đầy đủ, chỉ tối đa 300 ký tự
  đầu làm đoạn trích); `PageResponseDto<T>`. Ánh xạ tường minh, không trả entity.

## Phân quyền

- `TrustedUserGuard` và decorator `@TrustedPrincipal()` (`common/auth/trusted-principal.decorator.ts`,
  đúng đường dẫn mà plan COM-005 dự kiến tái dùng): đọc `x-auth-user-id` do Gateway đặt, thiếu hoặc
  không phải UUID → `401`; trả `Principal { userId, permissions }`, với `permissions` tách từ
  `x-auth-permissions`, thiếu thì tập rỗng (ID-003-FR-022). COM-001 chỉ dùng `userId`. Áp ở mức
  controller.
- Không mã quyền mới, không đọc `x-auth-permissions` trong COM-001. Không có task seed quyền ở
  Identity.
- Sở hữu kiểm trong domain (`authorId === actorId`). `ADMIN`/`LECTURER` không có nhánh riêng.
- Kiểm duyệt (COM-005) sẽ tự đọc `community:moderate`; COM-001 không có đường ghi `is_hidden`.

## Messaging / Sự kiện

N/A. COM-001 không phát hay tiêu thụ event; không có nhu cầu bất đồng bộ.

## Realtime

N/A. Không có yêu cầu realtime.

## Adapter hạ tầng

- `modules/posts/infrastructure/typeorm-post.repository.ts`: adapter `PostRepository`.
- Không adapter HTTP tới Learning (FR-004), không adapter messaging.
- Composition root: `posts.module.ts` gắn `PostRepository` → `TypeOrmPostRepository`, đăng ký use
  case, export `CheckPostInteraction`.

## Cấu hình

No configuration change. Không thêm biến môi trường, không đổi `.env.example`, Docker hay Gateway.

## Xử lý lỗi

Lỗi domain chung trong `common/errors/` (`ValidationError`, `NotFoundError`, `ForbiddenError`,
`InvalidStateError`), được `CommunityDomainErrorFilter` ánh xạ sang exception chuẩn của NestJS, giữ
nguyên hình dạng lỗi hiện có (`statusCode`, `message`, `error`).

| Điều kiện                                                    | Ánh xạ                                  |
| ------------------------------------------------------------ | --------------------------------------- |
| Thiếu/sai token (Gateway) hoặc thiếu/sai `x-auth-user-id`    | `401`                                   |
| Không phải tác giả, Post hiển thị với người gọi              | `403`                                   |
| Post không tồn tại / không hiển thị với người gọi            | `404`                                   |
| Tiêu đề, nội dung, phạm vi/đích, phân trang không hợp lệ     | `400`                                   |
| Trường lạ trong body/query                                   | `400`                                   |
| Sửa/xoá Post đã xoá; khôi phục Post chưa xoá; đua trạng thái | `409`                                   |
| Lỗi lưu trữ ngoài dự kiến                                    | `500` chuẩn, không kèm SQL hay nội dung |

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                                  |
| ------- | -------------------------------------------------------------------------------------------------------------- |
| SR-001  | Sở hữu và hiển thị kiểm trong domain/use case, không ở controller                                              |
| SR-002  | `TrustedUserGuard`; Gateway đã xoá header do client gửi                                                        |
| SR-003  | DTO danh sách cho phép + `forbidNonWhitelisted`                                                                |
| SR-004  | Truy vấn công khai lọc `deleted_at`/`is_hidden`; người không phải tác giả nhận `404`; `total` theo cùng bộ lọc |
| SR-005  | `RestrictedMarkdown`; backend không render                                                                     |
| SR-006  | Chỉ datasource Community; không gọi Learning                                                                   |
| SR-007  | Không log body, không log header xác thực                                                                      |

## Chiến lược kiểm thử

- **Unit domain (không cần PostgreSQL):** `PostTitle`, `PostTarget` (mọi tổ hợp phạm vi/đích,
  AC-003), `RestrictedMarkdown` (thẻ ngoài/trong khối mã, khối chưa đóng, `javascript:`, AC-006,
  AC-007), chuyển trạng thái `Post` (AC-010, 013, 014, 018), `isVisibleTo`/`acceptsInteraction`
  (AC-015, 019).
- **Unit application (port giả):** sở hữu `403` so với `404` (AC-011, 017), `ListMyPosts` (AC-016),
  lưu có điều kiện trả 0 dòng → `409`.
- **Integration (PostgreSQL cách ly):** adapter lọc/sắp/phân trang (AC-008, 009, 012), `total` không
  đếm Post ẩn, CHECK phạm vi/đích, migration up/down có dữ liệu cũ.
- **API:** khởi động app bằng `@nestjs/testing` trên cổng ngẫu nhiên, gọi bằng `fetch` của Node (không
  thêm dependency): `401` khi thiếu header (AC-004), trường lạ `400` (AC-005), vòng đời đầy đủ, route
  comment/like cũ vẫn chạy, lỗi và log không chứa header (AC-020).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ `x-request-id` hiện có.
- Log mức info cho tạo/sửa/xoá/khôi phục kèm `postId`, `actorId`, request ID; không log tiêu đề hay
  nội dung.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                     | Kiểm chứng                    |
| -------------- | ---------------------------------------------------- | ----------------------------- |
| FR-001, FR-005 | Model `Post` trong Community; UUID                   | Kiến trúc, unit               |
| FR-002–FR-004  | `CreatePost`, `PostTarget`                           | Unit/API; AC-001–003          |
| FR-006, FR-013 | `GetPost`, `isVisibleTo`                             | API; AC-012, 015              |
| FR-007         | `ListPosts`, `IDX_posts_feed`                        | Integration; AC-008, 009      |
| FR-008         | `ListMyPosts`                                        | API; AC-016                   |
| FR-009         | `UpdatePost`                                         | Unit/API; AC-010, 011, 018    |
| FR-010–FR-012  | `DeletePost`, `RestorePost`; không route xoá cứng    | API; AC-012–014               |
| FR-014         | `RestrictedMarkdown`, `PostTitle`                    | Unit; AC-006, 007             |
| FR-015         | Không có kiểm tra tự động; frontend hiển thị quy tắc | Rà soát                       |
| FR-016         | `CheckPostInteraction` export                        | Unit; AC-019                  |
| FR-017         | Lưu có điều kiện                                     | Unit/Integration; AC-014      |
| SR-001–SR-007  | Mục Bảo mật                                          | API/rà soát; AC-004, 005, 020 |

## Thứ tự triển khai

1. Xác nhận spec/plan Approved; khảo sát lại module `posts`.
2. `common/` (guard định danh, lỗi domain + filter, `RestrictedMarkdown`, phân trang); unit test.
3. Domain `posts`; unit test.
4. Migration `Com001Posts` + entity; kiểm chứng up/down.
5. Adapter `TypeOrmPostRepository`; integration test.
6. Use case, `CheckPostInteraction`; unit test.
7. DTO, controller, nối dây module, thu gọn `PostsService`; Swagger.
8. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- ID-003/Gateway: header `x-auth-user-id` tin cậy (đã có). COM-001 không cần `x-auth-permissions`.
- COM-002 dùng `CheckPostInteraction`. Plan COM-003/COM-004 dùng `ContentVisibilityReader` của COM-005
  cho cùng quy tắc.
- COM-005 (plan song song) giữ `is_hidden` làm cờ ẩn, thêm `hidden_reason`, `hidden_at`, `hidden_by`
  do riêng COM-005 ghi, và coi `ContentVisibilityPolicy` của nó là nguồn duy nhất của quy tắc hiển
  thị (COM-005-FR-012). COM-001 không ghi các cột đó (xem Vấn đề cần chủ sở hữu xem lại).

## Rủi ro

- **Đổi contract API:** `title` bắt buộc và danh sách dạng trang làm client cũ (nếu có) hỏng; chưa có
  frontend nào được ghi nhận trong repo.
- **Migration dữ liệu cũ:** tiêu đề sinh từ nội dung có thể xấu; migration dừng nếu có Post
  `PROBLEM`/`COURSE` thiếu đích.
- **Không kiểm tra đích:** Post có thể gắn `problemId`/`courseId` không tồn tại hoặc chưa công khai;
  frontend chỉ hiển thị nhóm bài theo đích ở trang Problem/Course mà người dùng đã xem được, nên
  không lộ dữ liệu Learning.
- **Route legacy:** `toggleLike` hiện không kiểm tra Post đã xoá mềm; COM-003 thay nó và kiểm hiển
  thị theo plan của mình.
- **Bộ kiểm tra Markdown** là heuristic; frontend vẫn phải làm sạch khi render.

## Vấn đề cần chủ sở hữu xem lại

1. **Thứ tự triển khai và nơi đặt quy tắc hiển thị.** Plan COM-005 đặt `ContentVisibilityPolicy` và
   `visible-content.predicate` trong `modules/moderation/` và yêu cầu COM-001/002 dùng chúng, nhưng
   COM-005 lại cần entity và cột xoá mềm của COM-001/002 có trước. Đề xuất: COM-001 hiện thực quy tắc
   (trùng COM-005-FR-012) trong domain `Post` và bộ lọc SQL của adapter; khi COM-005 được triển khai,
   hai chỗ này chuyển sang gọi `ContentVisibilityPolicy`/`visible-content.predicate` (bước 7 của plan
   COM-005), có test đối chiếu. Không đổi đặc tả nào. Cần người điều phối xác nhận thứ tự này, hoặc
   chọn đặt quy tắc ở `src/common/visibility/` do COM-001 tạo để COM-005 tái dùng.
2. **Chủ sở hữu cột ẩn.** Xác nhận theo yêu cầu của plan COM-005: COM-001 không ghi `is_hidden`,
   `hidden_reason`, `hidden_at`, `hidden_by`; chỉ đọc `is_hidden` để lọc và để chiếu `moderation` cho
   tác giả.

## Tuân thủ kiến trúc

- Chiều phụ thuộc: controller → use case → domain; `TypeOrmPostRepository` hiện thực port
  `PostRepository`; domain và `common/content` không import framework.
- Quyền sở hữu dữ liệu: chỉ `bkpractice_community`; `problemId`/`courseId` là UUID thuần, không gọi
  Learning, không khoá ngoại xuyên service.
- Seam giữa module (`CheckPostInteraction`) là use case trong cùng service; không module nào khác đọc
  thẳng repository của Posts.
- Không đưa entity hay use case Post vào `libs/`.
- Ngoại lệ chuyển tiếp: entity TypeORM vẫn ở `modules/posts/entities/`; `PostsService` tạm giữ
  `comment`/`toggleLike` cho tới COM-002/COM-003.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.0). Danh sách công việc nằm ở [`tasks.md`](./tasks.md).
