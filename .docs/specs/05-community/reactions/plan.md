# COM-003 Kế hoạch triển khai Reactions

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.1` (Approved) của đặc tả COM-003. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả.

## Đặc tả liên quan

- [COM-003 Reactions](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`

## Service đích

Service: Community Service (`apps/community-service`), cơ sở dữ liệu `bkpractice_community`. Không
đổi Identity, Gateway hay service khác.

## Kiến trúc service bắt buộc

Kiến trúc: **Clean Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md) và
[`community-service.md`](../../../architecture/community-service.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- Tách module `modules/reactions/` vì phản ứng nay áp cho cả Post lẫn Comment, có quy tắc duy nhất và
  idempotent riêng. Module nhỏ: `domain`, `application`, `infrastructure`, `presentation`, không thêm
  tầng rỗng.
- Domain không import NestJS/TypeORM.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- Entity `Reaction` (`modules/posts/entities/reaction.entity.ts`): `post` `ManyToOne` cascade,
  `userId`, `type` (`ReactionType.Like`), `createdAt`, `@Index(['post','userId'], { unique: true })`.
  Migration khởi tạo tạo ràng buộc `UNIQUE ("post_id","user_id")` không đặt tên (tên mặc định của
  PostgreSQL là `reactions_post_id_user_id_key`), enum `reactions_type_enum ('LIKE')`.
- `PostsController.like` → `PostsService.toggleLike`: tìm phản ứng theo `(post, userId)`; có thì xoá
  và trả `{ liked: false }`, không thì kiểm Post tồn tại (không kiểm `isHidden`) rồi lưu và trả
  `{ liked: true }`. Không có transaction; hai request đồng thời có thể lỗi ràng buộc duy nhất thành
  `500`.
- `PostsService.list` không trả số đếm.

### Nền tảng do COM-001/COM-002 tạo (theo plan Approved của chúng)

- `common/auth/` (`TrustedUserGuard`, `@TrustedPrincipal()`), `common/errors/` (lỗi chung +
  `CommunityDomainErrorFilter`).
- `CheckPostInteraction` và `CheckCommentInteraction` trả `{ ..., authorId, visibleToViewer,
acceptsInteraction }` hoặc `NotFoundError`.
- COM-001 tạm giữ `toggleLike` và route cũ "cho tới COM-003".
- `PostResponseDto`, `PostSummaryResponseDto`, `CommentResponseDto` và phép chiếu tác giả. Comment
  gốc bị xoá mềm hoặc bị ẩn cùng các trả lời của nó không xuất hiện trong luồng thông thường theo
  COM-002-FR-010.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                 |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| REUSE     | Bảng `reactions`, enum `reactions_type_enum`; `CheckPostInteraction`, `CheckCommentInteraction`; `common/auth`, `common/errors`                                                                                                                                          |
| MODIFY    | Entity `Reaction` (chuyển sang `reactions/infrastructure/persistence/`, thêm `comment`); `community.entities.ts`; `posts.module.ts` (bỏ `Reaction`); mapper/DTO Post và Comment đầy đủ của COM-001/002 (bổ sung `likeCount`, `likedByMe`); `community-service.module.ts` |
| CREATE    | Module `modules/reactions/`; migration `Com003Reactions`; `ReactionCountReader`; test                                                                                                                                                                                    |
| REMOVE    | Route `POST /api/community/posts/:id/reactions/like`, `PostsController.like`, `PostsService.toggleLike` (FR-012, AC-014)                                                                                                                                                 |

**Tương thích:** gỡ route đảo trạng thái là thay đổi phá vỡ với client đang gọi nó. Frontend phải
chuyển sang `PUT`/`DELETE` cùng lúc triển khai.

## Thay đổi ở tầng domain

| Khái niệm        | Quy tắc                                                                | Truy vết |
| ---------------- | ---------------------------------------------------------------------- | -------- |
| `ReactionType`   | Chỉ `LIKE`                                                             | FR-002   |
| `ReactionTarget` | `{ kind: 'POST', postId }` \| `{ kind: 'COMMENT', postId, commentId }` | FR-003   |
| `ReactionState`  | `{ liked: boolean, likeCount: number }`                                | FR-007   |

Lỗi dùng `common/errors/`: không hiển thị / Comment sai Post → `NotFoundError`; bật trên nội dung của
mình không nhận tương tác mới → `InvalidStateError`. Không có aggregate: bất biến duy nhất (một
`LIKE` mỗi người mỗi đối tượng) được đảm bảo bởi ràng buộc duy nhất và thao tác idempotent.

## Tầng application / Use case

| Use case                         | Quyền       | Luồng chính                                                                                                                                                                      | Truy vết                               |
| -------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `LikeContent`                    | Đã xác thực | Hỏi `ContentInteractionReader`; Comment phải có `postId` trùng route; `NotFoundError` giữ nguyên; `!acceptsInteraction` → `InvalidStateError`; `insertIfAbsent`; đọc `likeCount` | FR-004, FR-005, FR-007, FR-009, FR-013 |
| `UnlikeContent`                  | Đã xác thực | Hỏi `ContentInteractionReader`; cần `visibleToViewer` (không cần `acceptsInteraction`); `deleteIfPresent`; đọc `likeCount`                                                       | FR-006, FR-007, FR-009, FR-013         |
| (truy vấn) `ReactionCountReader` | —           | Cho mapper Post/Comment: nhận danh sách ID Post hoặc Comment và `callerId`, trả `likeCount`, `likedByMe` mỗi ID bằng một truy vấn gộp                                            | FR-008, FR-010, AC-010                 |

Bật/tắt không cần khoá dòng: `INSERT ... ON CONFLICT DO NOTHING` và `DELETE ... WHERE` tự idempotent
và an toàn đồng thời. `likeCount` đọc sau khi ghi, trong cùng transaction.

### Port

| Port                       | Trách nhiệm                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------- |
| `ReactionRepository`       | `insertIfAbsent(target, userId)`, `deleteIfPresent(target, userId)`, `countFor(target)`     |
| `ReactionCountReader`      | `countsForPosts(ids, callerId)`, `countsForComments(ids, callerId)`                         |
| `ContentInteractionReader` | Bọc `CheckPostInteraction`/`CheckCommentInteraction`; không định nghĩa lại quy tắc hiển thị |

## Lưu trữ

- Chuyển entity sang `modules/reactions/infrastructure/persistence/reaction.orm-entity.ts`; thêm
  `comment` (`ManyToOne` tới `Comment`, nullable, cascade). Bỏ `@Index(['post','userId'])` khỏi entity
  (thay bằng partial unique index khai báo trong migration).
- Phản ứng trên Post: `comment_id IS NULL`. Phản ứng trên Comment: `post_id` = Post chứa Comment,
  `comment_id` = Comment.
- Số đếm dùng `COUNT(*)` theo `post_id WHERE comment_id IS NULL` hoặc theo `comment_id`, gộp bằng
  `GROUP BY` cho một trang. Không lưu bộ đếm phi chuẩn hoá (Ngoài phạm vi).
- Không có phương thức nào trả danh sách `user_id` ra ngoài adapter (FR-011).

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_community`, bảng `reactions`:

- thêm `comment_id` uuid NULL, FK nội bộ tới `comments(id)` `ON DELETE CASCADE`;
- bỏ ràng buộc duy nhất cũ `(post_id, user_id)`;
- tạo `UQ_reactions_post_user (post_id, user_id) WHERE comment_id IS NULL`;
- tạo `UQ_reactions_comment_user (comment_id, user_id) WHERE comment_id IS NOT NULL`;
- tạo `IDX_reactions_comment_id (comment_id)`.

Dữ liệu cũ đều là phản ứng trên Post nên thoả index mới. Không có khoá ngoại xuyên service; `user_id`
là UUID thuần.

## Migration

`apps/community-service/src/database/migrations/<timestamp>-Com003Reactions.ts`, sau `Com001Posts` và
`Com002Comments`, `synchronize: false`.

- **Up:** thêm cột → bỏ ràng buộc cũ → tạo index mới. Tên ràng buộc cũ tra qua `pg_constraint` thay
  vì giả định.
- **Down:** xoá phản ứng có `comment_id IS NOT NULL` (mất dữ liệu, ghi cảnh báo trong tài liệu triển
  khai); bỏ index mới; thêm lại `UNIQUE (post_id, user_id)`; bỏ `comment_id`.
- Kiểm chứng `pnpm migration:run:community` / `pnpm migration:revert:community` trên CSDL cách ly có
  phản ứng mẫu.

## API

Tiền tố `/api/community`. Tất cả route cần Bearer token.

| Method + route                                                           | Use case        | Phản hồi                            |
| ------------------------------------------------------------------------ | --------------- | ----------------------------------- |
| `PUT /api/community/posts/:postId/reactions/like`                        | `LikeContent`   | `200` `{ liked: true, likeCount }`  |
| `DELETE /api/community/posts/:postId/reactions/like`                     | `UnlikeContent` | `200` `{ liked: false, likeCount }` |
| `PUT /api/community/posts/:postId/comments/:commentId/reactions/like`    | `LikeContent`   | `200` `{ liked: true, likeCount }`  |
| `DELETE /api/community/posts/:postId/comments/:commentId/reactions/like` | `UnlikeContent` | `200` `{ liked: false, likeCount }` |

- Gỡ `POST /api/community/posts/:id/reactions/like`.
- `DELETE` trả `200` kèm body (không phải `204`) vì FR-007 yêu cầu trả số đếm.
- `PostResponseDto`, `PostSummaryResponseDto`, `CommentResponseDto` và phép chiếu tác giả bổ sung
  `likeCount`, `likedByMe` (FR-008; COM-001/002 cho phép tính năng khác bổ sung trường).
  `CommentPlaceholderResponseDto` không đổi.
- Swagger mô tả route mới và ghi route cũ đã bị gỡ.

## DTO / Kiểm tra dữ liệu

- Không có body. `postId`, `commentId` qua `ParseUUIDPipe` (sai → `400`).
- Body có trường bị `forbidNonWhitelisted` từ chối (không DTO nào khai báo trường) — kiểm AC-012 bằng
  test gửi `userId`, `type`, `likeCount`.
- `ReactionStateResponseDto`: `liked` (boolean), `likeCount` (int ≥ 0).

## Phân quyền

- `TrustedUserGuard` và `@TrustedPrincipal()` của `common/auth/`. Không cần mã quyền; không đọc
  `x-auth-roles` hay `x-auth-permissions`.
- Người dùng chỉ thao tác phản ứng của chính mình vì `userId` luôn là principal.
- Kiểm thử khẳng định (mọi vai trò đã xác thực) và phủ định (không header, header sai định dạng, đối
  tượng không hiển thị, tác giả trên nội dung bị ẩn của mình).

## Messaging / Sự kiện

N/A. Đặc tả không có sự kiện hay thông báo.

## Realtime

N/A. Cập nhật số đếm realtime là Ngoài phạm vi.

## Adapter hạ tầng

- `infrastructure/persistence/reaction.orm-entity.ts`, `typeorm-reaction.repository.ts` (upsert/xoá
  idempotent, đếm), `typeorm-reaction-count.reader.ts` (truy vấn gộp theo danh sách ID).
- `infrastructure/content-interaction.adapter.ts` gọi `CheckPostInteraction`/`CheckCommentInteraction`.
- `reactions.module.ts` import `PostsModule`, `CommentsModule`. `ReactionCountReader` là provider chỉ
  cần datasource, được export để mapper của `posts`/`comments` dùng mà không tạo vòng phụ thuộc Nest
  (đặt ở provider độc lập hoặc dùng `forwardRef` nếu cần).
- Không thêm adapter HTTP hay messaging.

## Cấu hình

No configuration change.

## Xử lý lỗi

| Điều kiện                                           | Ánh xạ (qua `CommunityDomainErrorFilter`) |
| --------------------------------------------------- | ----------------------------------------- |
| Thiếu/sai token                                     | `401` qua Gateway                         |
| Thiếu hoặc sai `x-auth-user-id`                     | `401`                                     |
| ID sai định dạng, body có trường                    | `400`                                     |
| Không hiển thị với người gọi, Comment sai Post      | `404`                                     |
| Bật trên nội dung của mình không nhận tương tác mới | `409`                                     |
| Lỗi lưu trữ ngoài dự kiến                           | `500` chuẩn hoá hiện có                   |

Vi phạm ràng buộc duy nhất không còn xảy ra nhờ `ON CONFLICT DO NOTHING`, nên không còn `500` khi bật
đồng thời.

## Bảo mật

| Yêu cầu | Cách thực thi                                                                 |
| ------- | ----------------------------------------------------------------------------- |
| SR-001  | `userId` chỉ từ principal tin cậy                                             |
| SR-002  | Hỏi COM-001/002 trước khi ghi hay đọc số đếm; nội dung không hiển thị → `404` |
| SR-003  | Không DTO body; `forbidNonWhitelisted`                                        |
| SR-004  | Adapter không có phương thức trả danh sách người dùng                         |
| SR-005  | Chỉ datasource Community                                                      |
| SR-006  | Principal thiếu/sai → `401` trước mọi truy cập dữ liệu                        |

## Chiến lược kiểm thử

- **Unit (application, port giả):** bật/tắt idempotent (AC-002, AC-003); không hiển thị, đã xoá mềm,
  Comment sai Post (AC-005, 006, 008); tác giả trên nội dung bị ẩn của mình: bật `409`, tắt được
  (AC-007).
- **Integration (lưu trữ):** partial unique index; hai lần bật đồng thời để lại một dòng (AC-013); số
  đếm sau ẩn/khôi phục (AC-009); `ReactionCountReader` gộp đúng `likedByMe` (AC-010); migration up/down.
- **API/E2E:** bật/tắt trên Post và Comment (AC-001, 004); `likeCount`, `likedByMe` trên danh sách/chi
  tiết, và Comment gốc bị xoá mềm/ẩn cùng cây trả lời không xuất hiện (AC-008, 010); `401` (AC-011);
  body lạ `400` (AC-012); route cũ không còn (AC-014); không phản hồi nào có danh sách người dùng
  (AC-015).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID. Log mức debug cho bật/tắt kèm loại/ID đối tượng và request ID; không log header
  xác thực. Không cần metric riêng.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                   | Kiểm chứng                |
| -------------- | -------------------------------------------------- | ------------------------- |
| FR-001         | Module `reactions` trong Community                 | Kiến trúc                 |
| FR-002, FR-003 | `ReactionType`, `ReactionTarget`, cột `comment_id` | Unit; AC-004              |
| FR-004         | Partial unique index                               | Integration; AC-002, 013  |
| FR-005–FR-007  | `LikeContent`, `UnlikeContent`                     | API; AC-001–004           |
| FR-008, FR-010 | `ReactionCountReader` + bổ sung DTO Post/Comment   | API; AC-009, 010          |
| FR-009         | `ContentInteractionReader` (COM-001/002)           | Unit/API; AC-005–008      |
| FR-011         | Không có truy vấn trả người dùng                   | Rà soát; AC-015           |
| FR-012         | Gỡ route cũ                                        | API; AC-014               |
| FR-013         | `ON CONFLICT DO NOTHING`, transaction              | Integration; AC-013       |
| SR-001–SR-006  | Mục Bảo mật                                        | Test bảo mật; AC-011, 012 |

## Thứ tự triển khai

1. Xác nhận COM-001/002 đã triển khai (`common/`, `CheckPostInteraction`, `CheckCommentInteraction`).
2. Migration `Com003Reactions`, chuyển entity; kiểm chứng up/down.
3. Adapter và port; integration test.
4. Use case, controller, gỡ route cũ, Swagger.
5. Bổ sung `likeCount`, `likedByMe` vào DTO Post/Comment qua `ReactionCountReader`.
6. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **COM-001, COM-002** (Approved): `common/`, `CheckPostInteraction`, `CheckCommentInteraction`, DTO
  Post/Comment. COM-001 tạm giữ `toggleLike` cho tới khi COM-003 gỡ.
- **COM-005:** ghi `is_hidden` mà COM-001/002 đọc. COM-003 không phụ thuộc trực tiếp module
  `moderation`.
- Frontend chuyển sang route `PUT`/`DELETE`.

## Rủi ro

- **Thay đổi phá vỡ route cũ**: triển khai đồng bộ với frontend.
- **Down migration** mất phản ứng trên Comment.
- **Đếm bằng `COUNT(*)`** có thể chậm với danh sách lớn: truy vấn gộp theo ID của một trang, dùng
  partial index; bộ đếm phi chuẩn hoá cần đặc tả mới.
- **Tên ràng buộc cũ** khác giữa môi trường: tra `pg_constraint`.
- **Vòng phụ thuộc module** `posts`/`comments` ⇄ `reactions`: giải bằng provider `ReactionCountReader`
  độc lập.

## Tuân thủ kiến trúc

- Controller chỉ dịch transport; use case gọi port; adapter TypeORM trong `infrastructure`.
- Phản ứng chỉ trong `bkpractice_community`; `user_id` là UUID thuần; không gọi service khác.
- Phụ thuộc giữa module cùng service chỉ qua use case/provider được export.
- Không có ngoại lệ kiến trúc.

## Vấn đề cần chủ sở hữu xem lại

Không có vấn đề chặn. Lưu ý phối hợp: bản nháp đầu của plan này dùng `ContentVisibilityReader` của
COM-005; bản cuối dùng `CheckPostInteraction`/`CheckCommentInteraction` của COM-001/002. Plan COM-001
dòng "COM-003/COM-004 dùng `ContentVisibilityReader` của COM-005" cần được người điều phối cập nhật.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.1). Danh sách công việc dẫn xuất từ kế hoạch này nằm ở
> [`tasks.md`](./tasks.md).
