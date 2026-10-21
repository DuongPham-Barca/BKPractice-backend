# COM-002 Kế hoạch triển khai Bình luận và trả lời (Comments)

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.0` (Approved) của đặc tả COM-002. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả.

## Đặc tả liên quan

- [COM-002 Bình luận và trả lời](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`
- Phụ thuộc trực tiếp: [COM-001 Bài viết cộng đồng](../posts/spec.md) 1.0 và
  [plan COM-001](../posts/plan.md) (seam `CheckPostInteraction`, nền `common/`);
  [COM-005 Kiểm duyệt](../moderation/spec.md) (quy tắc hiển thị COM-005-FR-012, trạng thái cho tác
  giả COM-005-FR-013).

## Service đích

Service: Community Service

COM-002 tạo module mới `apps/community-service/src/modules/comments/` trong `bkpractice_community` và
chuyển hành vi bình luận ra khỏi module `posts`. Không tạo microservice mới. Không đổi Gateway: tiền
tố `/api/community` đã được chuyển tới Community.

Lý do tách module: `community-service.md` cho phép giữ hành vi nhỏ trong `posts` "cho tới khi nó có đủ
policy hoặc endpoint", và liệt kê `comments/` là một module đích. COM-002 thêm bảy endpoint cùng quy
tắc độ sâu, sở hữu, xoá mềm và hiển thị theo Comment gốc, tức đã đủ để tách. Worked entry của COM-002
vì thế nằm ở `docs/worked/community/comments/`.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md) và
[community-service.md](../../../architecture/community-service.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- Module `comments` có `domain`, `application`, `infrastructure`, `presentation`, dùng lại `common/`
  (guard/decorator principal, lỗi domain + filter, `RestrictedMarkdown`, phân trang) do COM-001 tạo.
- Module `comments` hỏi Posts qua use case `CheckPostInteraction` mà `PostsModule` export, bọc sau
  một port của application; không đọc thẳng repository của Posts.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `comments` (migration `1700000002000-InitialCommunitySchema.ts`): `id` uuid, `post_id` uuid NOT
  NULL FK nội bộ `posts(id)` `ON DELETE CASCADE`, `author_id` uuid NOT NULL, `parent_comment_id` uuid
  FK nội bộ `comments(id)` `ON DELETE CASCADE`, `content` text NOT NULL, `is_hidden` boolean mặc định
  `false`, `created_at`, `updated_at`. Entity có `@Index()` trên `author_id` nhưng migration không
  tạo index đó; không có index nào khác.
- Entity `Comment` ở `modules/posts/entities/comment.entity.ts`, quan hệ `ManyToOne` tới `Post` và
  tới chính nó; được đăng ký trong `community.entities.ts` và `TypeOrmModule.forFeature` của
  `PostsModule`. Không entity nào khác tham chiếu `Comment` (plan COM-003 sẽ thêm `comment_id` vào
  `reactions`).
- `PostsService.comment`: nạp Post với `isHidden: false` (`404`), nạp Comment cha kèm `post` và
  `parentComment`, sai Post → `404`, cha đã là trả lời → `422 UnprocessableEntityException`, lưu
  `content.trim()`.
- `CreateCommentDto`: `content` 1..5.000, `parentCommentId?` UUID.
- Route `POST /api/community/posts/:id/comments` trong `PostsController`, đọc `x-auth-user-id`. Sau
  COM-001, controller có `TrustedUserGuard` và route này vẫn gọi `PostsService.comment`.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REUSE     | Bảng `comments`, FK nội bộ, cột `is_hidden` làm cờ ẩn bởi kiểm duyệt (COM-005 ghi); `common/` của COM-001; `CheckPostInteraction`; đường dẫn `POST /api/community/posts/:postId/comments`                                                                                            |
| MODIFY    | Entity `Comment` (thêm `editedAt`, `deletedAt`; chuyển file sang `modules/comments/entities/`); `community.entities.ts` (đổi import); `posts.module.ts` (bỏ `Comment` khỏi `forFeature`); `PostsController` (bỏ route comment); `community-service.module.ts` (nạp `CommentsModule`) |
| CREATE    | `modules/comments/` với domain `Comment`, `CommentFactory`; use case; port `CommentRepository`, `PostInteractionReader`; adapter TypeORM và adapter Posts; `CommentsController`, DTO; migration `Com002Comments`; test                                                               |
| REMOVE    | `PostsService.comment`, `posts/dto/create-comment.dto.ts`; mã lỗi `422` cho trả lời lồng (thay bằng `400`)                                                                                                                                                                           |

Thay đổi contract có chủ đích: trả lời vào một trả lời trả `400` thay vì `422`; Post bị ẩn mà người
gọi là tác giả Post trả `409` thay vì `404` khi tạo Comment.

## Thay đổi ở tầng domain

Đặt trong `modules/comments/domain/`, không import NestJS hay TypeORM.

| Khái niệm        | Quy tắc                                                                                                                                                                                      | Truy vết               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `Comment`        | `id`, `postId`, `parentId` (null nếu gốc), `authorId`, `content` (`RestrictedMarkdown` 1..5.000), `createdAt`, `editedAt`, `deletedAt`, `hiddenByModeration` (chỉ đọc)                       | FR-001, FR-002, FR-015 |
| `CommentFactory` | `createRoot(postId, authorId, content)`; `createReply(parent, postId, authorId, content)`: cha khác Post hoặc không hiển thị công khai → `NotFoundError`; cha là trả lời → `ValidationError` | FR-003, FR-004         |

Hành vi của `Comment`:

- `isPubliclyVisible()`: chưa xoá và không bị ẩn.
- `isVisibleTo(viewerId, root?)`: đúng COM-005-FR-012 ở mức Comment: chưa xoá, (không bị ẩn hoặc
  `authorId === viewerId`), và nếu là trả lời thì `root.isVisibleTo(viewerId)`. Điều kiện "Post hiển
  thị với người gọi" do use case kiểm trước qua `PostInteractionReader`.
- `edit(actorId, content, now)`: tác giả; chưa xoá (ngược lại `InvalidStateError`); đặt `editedAt`;
  không đổi `hiddenByModeration`.
- `softDelete(actorId, now)`, `restore(actorId)`: tác giả; đúng trạng thái; không đụng Comment khác.
- `acceptsInteraction(postAccepts, root?)`: `isPubliclyVisible() && postAccepts &&
(root == null || root.isPubliclyVisible())` (FR-017).
- Kiểm tra sở hữu cho thao tác ghi: người gọi là tác giả → áp quy tắc trạng thái (`409`), không cần
  Comment gốc hiển thị (đặc tả, Tình huống biên); không phải tác giả → `ForbiddenError` nếu Comment
  hiển thị với người gọi, ngược lại `NotFoundError`.

## Tầng application / Use case

Đặt trong `modules/comments/application/`. Mọi use case trong luồng thông thường bắt đầu bằng
`PostInteractionReader.check(postId, actorId)`; Post không hiển thị với người gọi → `NotFoundError`
(FR-013).

| Use case                  | Luồng chính                                                                                                                          | Truy vết                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `CreateComment`           | Kiểm Post; `!acceptsInteraction` → `InvalidStateError`; có `parentCommentId` thì nạp cha, `createReply`, ngược lại `createRoot`; lưu | FR-003, FR-004, FR-013, AC-001–006, 017       |
| `ListRootComments`        | Kiểm Post; trang Comment gốc hiển thị với người xem, kèm `visibleReplyCount` (chỉ đếm trả lời hiển thị với người xem)                | FR-005, FR-010, FR-014, AC-009, 012, 016      |
| `ListReplies`             | Nạp Comment gốc (phải là gốc); kiểm Post; gốc không hiển thị với người gọi → `NotFoundError`; trang trả lời hiển thị với người gọi   | FR-006, FR-010, AC-009, 012, 013, 016         |
| `ListMyComments`          | Không kiểm Post; trang Comment có `author_id = actorId`, mới nhất trước, gồm đã xoá và bị ẩn, kèm `postId`, trạng thái               | FR-011, AC-014                                |
| `UpdateComment`           | Nạp Comment; kiểm Post; kiểm sở hữu; `edit`; lưu có điều kiện `deleted_at IS NULL`                                                   | FR-007, FR-014, FR-018, AC-010, 011, 015, 016 |
| `DeleteComment`           | Như trên; `softDelete`                                                                                                               | FR-008, FR-018, AC-011, 015                   |
| `RestoreComment`          | Nạp Comment; kiểm Post (Post đã xoá → `404` theo FR-013); tác giả; `restore`; lưu có điều kiện `deleted_at IS NOT NULL`              | FR-009, FR-018, AC-014, 015                   |
| `CheckCommentInteraction` | Cho COM-003/COM-005: trả `{ commentId, postId, authorId, visibleToViewer, acceptsInteraction }` hoặc `NotFoundError`                 | FR-017, AC-019                                |

`CheckCommentInteraction` được `CommentsModule` export. Plan COM-003/COM-005 hiện dùng
`ContentVisibilityReader` của COM-005 cho cùng quy tắc; hai đường phải cho cùng kết quả (xem Vấn đề
cần chủ sở hữu xem lại).

### Port

| Port                    | Trách nhiệm                                                                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CommentRepository`     | `findById`; `insert`; `saveIfState(comment, expectDeleted)` trả số dòng đổi; `listRootsForViewer(postId, viewerId, page)`, `listRepliesForViewer(rootId, viewerId, page)`, `listByAuthor(authorId, page)`, đều trả `{ items, total }` |
| `PostInteractionReader` | `check(postId, viewerId)` → `{ authorId, acceptsInteraction }` hoặc `NotFoundError`; seam giữa hai module, cho phép test không cần Posts                                                                                              |

Không thêm port nào khác.

## Lưu trữ

- Chỉ datasource Community.
- Entity `Comment` chuyển sang `modules/comments/entities/comment.entity.ts`; `community.entities.ts`
  đổi import. Quan hệ `ManyToOne` tới `Post` giữ nguyên vì là FK nội bộ trong cùng cơ sở dữ liệu.
  Các cột ẩn COM-005 thêm (`hidden_reason`, `hidden_at`, `hidden_by`) chỉ do COM-005 ghi.
- `deletedAt` dùng `@Column` thường, không `@DeleteDateColumn`.
- Điều kiện "hiển thị với người xem" cho một alias `c`:
  `c.deleted_at IS NULL AND (c.is_hidden = false OR c.author_id = $viewer)`.
- `listRootsForViewer`: `post_id = $1 AND parent_comment_id IS NULL AND <hiển thị với người xem>`,
  kèm `visible_reply_count` là subquery đếm trả lời thoả cùng điều kiện; sắp `(created_at ASC, id
ASC)`; `total` theo cùng điều kiện.
- `listRepliesForViewer`: `parent_comment_id = $1 AND <hiển thị với người xem>`; use case đã kiểm
  Comment gốc hiển thị trước khi gọi.
- `listByAuthor`: `author_id = $1`, sắp `(created_at DESC, id DESC)`, không lọc trạng thái.
- Lưu có điều kiện `UPDATE comments SET ... WHERE id = $1 AND deleted_at IS [NOT] NULL`; 0 dòng →
  `InvalidStateError`.
- Độ sâu một cấp kiểm ở domain; `parent_comment_id` bất biến nên không có đua về độ sâu.
- Khi COM-005 có `visible-content.predicate`, điều kiện trên được thay bằng predicate đó (cùng nghĩa).

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_community`, bảng `comments`.

- Thêm `edited_at timestamptz NULL`, `deleted_at timestamptz NULL`.
- Thêm `CONSTRAINT "CHK_comments_not_self_parent" CHECK (parent_comment_id IS NULL OR
parent_comment_id <> id)`.
- Thêm index `IDX_comments_post_roots` trên `(post_id, created_at, id) WHERE parent_comment_id IS
NULL`, `IDX_comments_parent` trên `(parent_comment_id, created_at, id) WHERE parent_comment_id IS
NOT NULL`, và `IDX_comments_author_created` trên `(author_id, created_at DESC, id DESC)`.
- Giữ `is_hidden` (COM-005 ghi) và FK nội bộ hiện có.

## Migration

`apps/community-service/src/database/migrations/<timestamp>-Com002Comments.ts`, chạy sau
`Com001Posts`, `synchronize: false`.

- **Up:** kiểm tra dữ liệu cũ vi phạm (trả lời lồng hai cấp, cha khác Post, tự làm cha); nếu có, ném
  lỗi nêu số dòng và dừng. Sau đó thêm cột, CHECK, ba index.
- **Down:** bỏ ba index, CHECK, `deleted_at`, `edited_at`. Comment đã xoá mềm sẽ hiện lại khi down;
  ghi cảnh báo trong tài liệu triển khai.
- Kiểm chứng bằng `pnpm migration:run:community` / `pnpm migration:revert:community` trên cơ sở dữ
  liệu cách ly.

## API

`CommentsController` với `@Controller('api/community')`, `TrustedUserGuard` ở mức controller.

| Method + route                                    | Use case           | Phản hồi                                             |
| ------------------------------------------------- | ------------------ | ---------------------------------------------------- |
| `POST /api/community/posts/:postId/comments`      | `CreateComment`    | `201` Comment (phép chiếu tác giả)                   |
| `GET /api/community/posts/:postId/comments`       | `ListRootComments` | `200` `{ items, page, pageSize, total }` Comment gốc |
| `GET /api/community/comments/mine`                | `ListMyComments`   | `200` trang Comment của người gọi kèm trạng thái     |
| `GET /api/community/comments/:commentId/replies`  | `ListReplies`      | `200` trang trả lời                                  |
| `PATCH /api/community/comments/:commentId`        | `UpdateComment`    | `200` Comment                                        |
| `DELETE /api/community/comments/:commentId`       | `DeleteComment`    | `204`                                                |
| `POST /api/community/comments/:commentId/restore` | `RestoreComment`   | `200` Comment                                        |

- Route `POST .../posts/:postId/comments` chuyển từ `PostsController` sang `CommentsController`, giữ
  nguyên đường dẫn và body (`content`, `parentCommentId?`).
- `GET /comments/mine` khai báo trước các route có `:commentId`. `ParseUUIDPipe` cho `:postId`,
  `:commentId`.
- Swagger: `@ApiTags('community')`, `@ApiBearerAuth()`, DTO, mã lỗi.

## DTO / Kiểm tra dữ liệu

- `CreateCommentRequestDto`: `content` (string, `MaxLength` thô 5.001), `parentCommentId?` (UUID).
- `UpdateCommentRequestDto`: `content` (bắt buộc).
- Query danh sách: `PageQueryDto` của `common/pagination/`.
- `forbidNonWhitelisted` toàn cục chặn `authorId`, `postId` trong body, `parentCommentId` khi sửa,
  `isHidden`, `deletedAt` (SR-003, AC-018).
- Độ dài chính xác và HTML/script do `RestrictedMarkdown` kiểm.
- Response: `CommentResponseDto` (`id`, `postId`, `parentCommentId`, `authorId`, `content`,
  `createdAt`, `editedAt`, `replyCount?` cho gốc); `AuthorCommentResponseDto` thêm `deletedAt` và
  `moderation` (`AuthorModerationView` của COM-005-FR-013; trước COM-005 chỉ có `status` suy từ
  `is_hidden`). Ánh xạ tường minh, không trả entity.

## Phân quyền

- `TrustedUserGuard` và `@TrustedPrincipal()` của COM-001; thiếu/sai định danh → `401`.
- Không mã quyền mới, không dùng `permissions`. Không có task seed quyền ở Identity.
- Sở hữu kiểm trong domain (`authorId === actorId`); tác giả Post, `ADMIN`, `LECTURER` không có nhánh
  riêng.
- Hiển thị của Post lấy từ `CheckPostInteraction` (COM-001), không tự suy.

## Messaging / Sự kiện

N/A. COM-002 không phát hay tiêu thụ event; thông báo là Ngoài phạm vi.

## Realtime

N/A. Không có yêu cầu realtime.

## Adapter hạ tầng

- `modules/comments/infrastructure/typeorm-comment.repository.ts`: adapter `CommentRepository`.
- `modules/comments/infrastructure/posts-interaction.adapter.ts`: adapter `PostInteractionReader`,
  gọi `CheckPostInteraction` do `PostsModule` export.
- Composition root: `comments.module.ts` import `PostsModule`, `TypeOrmModule.forFeature([Comment])`,
  gắn hai port, export `CheckCommentInteraction`; `community-service.module.ts` nạp `CommentsModule`.

## Cấu hình

No configuration change.

## Xử lý lỗi

Dùng lỗi domain chung và `CommunityDomainErrorFilter` của COM-001; không cấu trúc lỗi mới.

| Điều kiện                                                         | Ánh xạ                                  |
| ----------------------------------------------------------------- | --------------------------------------- |
| Thiếu/sai token hoặc `x-auth-user-id`                             | `401`                                   |
| Post/Comment không tồn tại hoặc không hiển thị với người gọi      | `404`                                   |
| Comment cha khác Post hoặc không hiển thị công khai               | `404`                                   |
| Comment cha là trả lời; nội dung/trường/phân trang không hợp lệ   | `400`                                   |
| Không phải tác giả, Comment hiển thị với người gọi                | `403`                                   |
| Post không nhận tương tác mới; sai trạng thái xoá; đua trạng thái | `409`                                   |
| Lỗi lưu trữ ngoài dự kiến                                         | `500` chuẩn, không kèm SQL hay nội dung |

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                                                                                     |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-001  | Sở hữu, độ sâu, hiển thị kiểm trong domain/use case                                                                                                               |
| SR-002  | `TrustedUserGuard`                                                                                                                                                |
| SR-003  | DTO danh sách cho phép + `forbidNonWhitelisted`                                                                                                                   |
| SR-004  | Điều kiện hiển thị trong truy vấn; `ListReplies` từ chối gốc không hiển thị; `total`, `replyCount` cùng điều kiện; `ListMyComments` chỉ trả Comment của người gọi |
| SR-005  | `RestrictedMarkdown` dùng chung                                                                                                                                   |
| SR-006  | Chỉ datasource Community; hỏi Posts qua use case trong process                                                                                                    |
| SR-007  | Không log body hay header xác thực                                                                                                                                |

## Chiến lược kiểm thử

- **Unit domain:** `createReply` (cha là trả lời, khác Post, không công khai; AC-003, 004, 017);
  chuyển trạng thái (AC-010, 015, 016); `isVisibleTo` với gốc xoá/ẩn và tác giả gốc (AC-012, 016);
  `acceptsInteraction` (AC-019).
- **Unit application (port giả):** Post không hiển thị → `404` cho mọi use case luồng thông thường
  (AC-005); Post hiển thị nhưng không nhận tương tác → `409` (AC-006); sở hữu `403`/`404` (AC-011);
  `ListReplies` với gốc không hiển thị → `404` (AC-012); `saveIfState` 0 dòng → `409`.
- **Integration (PostgreSQL cách ly):** ba truy vấn danh sách, đếm trả lời theo người xem, thứ tự và
  phân trang (AC-009, 013, 014), CHECK, migration up/down. Khi COM-005 có, test đối chiếu điều kiện
  với `ContentVisibilityPolicy`.
- **API:** `@nestjs/testing` + `fetch` của Node: `401` (AC-007), `400` nội dung/trường lạ (AC-008,
  018), luồng tạo/trả lời/sửa/xoá/khôi phục, "Comment của tôi", route cũ `POST posts/:id/comments`
  giữ đường dẫn, lỗi và log sạch (AC-020).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ `x-request-id`.
- Log mức info cho tạo/sửa/xoá/khôi phục kèm `commentId`, `postId`, `actorId`, request ID; không log
  nội dung.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                       | Kiểm chứng                      |
| -------------- | ------------------------------------------------------ | ------------------------------- |
| FR-001, FR-002 | Module `comments`; `parent_comment_id` bất biến        | Kiến trúc, unit                 |
| FR-003, FR-004 | `CreateComment`, `CommentFactory`                      | Unit/API; AC-001–004, 017       |
| FR-005, FR-006 | `ListRootComments`, `ListReplies`, index mới           | Integration; AC-009             |
| FR-007–FR-009  | `UpdateComment`, `DeleteComment`, `RestoreComment`     | Unit/API; AC-010, 011, 014, 015 |
| FR-010         | `isVisibleTo`, điều kiện hiển thị trong truy vấn       | Unit/Integration; AC-012, 013   |
| FR-011         | `ListMyComments`                                       | API; AC-014                     |
| FR-012         | Không route xoá cứng                                   | Rà soát                         |
| FR-013         | `PostInteractionReader`                                | Unit/API; AC-005, 006           |
| FR-014         | `hiddenByModeration` chỉ đọc; `moderation` cho tác giả | Unit/API; AC-016                |
| FR-015, FR-016 | `RestrictedMarkdown`; không kiểm tra tự động           | Unit; AC-008                    |
| FR-017         | `CheckCommentInteraction` export                       | Unit; AC-019                    |
| FR-018         | Lưu có điều kiện                                       | Unit/Integration; AC-015        |
| SR-001–SR-007  | Mục Bảo mật                                            | API/rà soát; AC-007, 018, 020   |

## Thứ tự triển khai

1. Xác nhận COM-001 đã triển khai (`common/`, `CheckPostInteraction`, migration `Com001Posts`) và
   quyết định của người điều phối về nơi đặt quy tắc hiển thị.
2. Domain `comments`; unit test.
3. Chuyển entity, migration `Com002Comments`; kiểm chứng up/down.
4. Adapter `TypeOrmCommentRepository`, `PostsInteractionAdapter`; integration test.
5. Use case, `CheckCommentInteraction`; unit test.
6. DTO, `CommentsController`; gỡ route comment khỏi `PostsController`, bỏ `PostsService.comment`;
   nối dây module; Swagger.
7. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **COM-001 đã triển khai**, vì COM-002 dùng `common/`, `CheckPostInteraction` và chạy migration sau
  `Com001Posts`.
- **COM-005:** sở hữu `comments.is_hidden` và các cột ẩn bổ sung; quy tắc COM-005-FR-012 mà FR-010 áp
  dụng; `AuthorModerationView`.
- **COM-003:** thêm `reactions.comment_id` và phản ứng trên Comment theo plan của mình.

## Rủi ro

- **Đổi mã lỗi:** `422` → `400` cho trả lời lồng; client cũ (nếu có) cần cập nhật.
- **Trả lời biến mất theo Comment gốc:** tác giả trả lời không thấy trả lời của mình trong luồng khi
  gốc bị xoá/ẩn (theo COM-005-FR-012); giảm thiểu bằng "Comment của tôi".
- **Truy vấn luồng** có subquery đếm trả lời; `IDX_comments_parent` giữ chi phí thấp, trang tối đa 50.
- **Migration dừng** nếu dữ liệu cũ vi phạm độ sâu hay Post; code cũ đã chặn nên rủi ro thấp.
- **Phụ thuộc thứ tự** với COM-001 và COM-005 (xem dưới).

## Vấn đề cần chủ sở hữu xem lại

1. **Nơi đặt quy tắc hiển thị.** Giống ý 1 ở plan COM-001: plan COM-005 coi
   `ContentVisibilityPolicy`/`visible-content.predicate` là nguồn duy nhất nhưng COM-005 triển khai sau
   COM-001/002. Plan này hiện thực cùng quy tắc trong domain `Comment` và điều kiện SQL, rồi chuyển
   sang dùng policy của COM-005 khi có. Cần người điều phối xác nhận.
2. **Hai seam cho cùng câu hỏi.** `CheckCommentInteraction` (plan này, theo COM-002-FR-017) và
   `ContentVisibilityReader` (plan COM-005, được COM-003 dùng) cùng trả lời "Comment có hiển thị/nhận
   tương tác không". Nên giữ một; đề xuất `CheckCommentInteraction` gọi `ContentVisibilityPolicy` khi
   COM-005 có, để hai đường không lệch nhau.

## Tuân thủ kiến trúc

- Chiều phụ thuộc: `CommentsController` → use case → domain; adapter hiện thực `CommentRepository`,
  `PostInteractionReader`; domain không import framework.
- Ranh giới module: `comments` chỉ biết Posts qua `CheckPostInteraction`; không truy vấn bảng `posts`
  ngoài FK nội bộ đã có.
- Quyền sở hữu dữ liệu: chỉ `bkpractice_community`; không gọi service khác.
- Không entity hay use case Comment trong `libs/`.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.0). Danh sách công việc nằm ở [`tasks.md`](./tasks.md).
