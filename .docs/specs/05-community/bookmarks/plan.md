# COM-004 Kế hoạch triển khai Bookmarks

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Kế hoạch này bám theo phiên bản `1.0` (Approved) của đặc tả COM-004. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả.

## Đặc tả liên quan

- [COM-004 Bookmarks](./spec.md)
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

- Tách module `modules/bookmarks/` vì bookmark có quy tắc riêng (riêng tư, giới hạn 1.000, danh sách
  theo hiển thị) và route riêng. Tầng `domain` chỉ gồm hằng số giới hạn và kiểu trang, không thêm
  aggregate khi không có bất biến cần.
- Domain không import NestJS/TypeORM.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- Entity `Bookmark` (`modules/posts/entities/bookmark.entity.ts`): `post` `ManyToOne` cascade,
  `userId`, `createdAt`, `@Index(['post','userId'], { unique: true })`. Bảng `bookmarks` có
  `UNIQUE ("post_id","user_id")`, không có index theo `user_id`.
- `PostsModule` đăng ký `Bookmark` trong `forFeature` nhưng không service hay route nào dùng nó.

### Nền tảng do COM-001 tạo (theo plan Approved của nó)

- `common/auth/`, `common/errors/`, `common/pagination/` (`PageResponseDto<T>`).
- `CheckPostInteraction` trả `{ postId, authorId, visibleToViewer, acceptsInteraction }` hoặc
  `NotFoundError`.
- Domain `Post.isVisibleTo(viewerId)`: chưa xoá mềm và (không bị ẩn hoặc người xem là tác giả).
- `PostSummaryResponseDto` (đoạn trích tối đa 300 ký tự) và phép chiếu tác giả kèm `deletedAt`,
  `moderation`.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Bảng `bookmarks` và ràng buộc duy nhất `(post_id, user_id)`; `CheckPostInteraction`; `common/auth`, `common/errors`, `common/pagination`; mapper `PostSummaryResponseDto` của COM-001                               |
| MODIFY    | Entity `Bookmark` (chuyển sang `bookmarks/infrastructure/persistence/`); `community.entities.ts`; `posts.module.ts` (bỏ `Bookmark`); DTO Post của COM-001 (bổ sung `bookmarkedByMe`); `community-service.module.ts` |
| CREATE    | Module `modules/bookmarks/`; migration `Com004Bookmarks` (index); `BookmarkFlagReader`; test                                                                                                                        |
| REMOVE    | File `posts/entities/bookmark.entity.ts` (chuyển chỗ, không mất bảng)                                                                                                                                               |

Không có hành vi hiện có nào cần giữ tương thích vì chưa có API bookmark.

## Thay đổi ở tầng domain

| Khái niệm                | Quy tắc                                         | Truy vết |
| ------------------------ | ----------------------------------------------- | -------- |
| `MAX_BOOKMARKS_PER_USER` | 1.000, đếm mọi bookmark đang lưu của người dùng | FR-011   |
| `BookmarkPage`           | `page` ≥ 1, `pageSize` 1..50                    | FR-007   |

Lỗi dùng `common/errors/`: không hiển thị → `NotFoundError`; tạo mới trên Post của mình không nhận
tương tác mới hoặc đạt giới hạn → `InvalidStateError` (`409`).

## Tầng application / Use case

| Use case                        | Quyền       | Luồng chính                                                                                                                                                                                                                                                                                 | Truy vết                               |
| ------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `BookmarkPost`                  | Đã xác thực | Hỏi `CheckPostInteraction` (`NotFoundError` giữ nguyên). Trong transaction: đã có bookmark → trả nó (giữ `createdAt`); chưa có: `!acceptsInteraction` → `InvalidStateError`; khoá theo người dùng, đếm, ≥ 1.000 → `InvalidStateError`; `insertIfAbsent`; trả `{ bookmarked, bookmarkedAt }` | FR-003, FR-004, FR-006, FR-011, FR-012 |
| `RemoveBookmark`                | Đã xác thực | `deleteIfPresent(postId, userId)`; không hỏi Post                                                                                                                                                                                                                                           | FR-005, SR-003, AC-012                 |
| `ListMyBookmarks`               | Đã xác thực | Trang bookmark của người gọi nối `posts` với điều kiện tương đương `Post.isVisibleTo(caller)`, sắp `(bookmarks.created_at DESC, bookmarks.id DESC)`, tổng số cùng điều kiện; ánh xạ mỗi Post bằng mapper tóm tắt của COM-001 (phép chiếu tác giả khi người gọi là tác giả)                  | FR-007, FR-008, AC-005, AC-013         |
| (truy vấn) `BookmarkFlagReader` | —           | Cho mapper Post: nhận danh sách ID Post và `callerId`, trả tập ID đã được người gọi bookmark                                                                                                                                                                                                | FR-010, AC-007                         |

### Port

| Port                    | Trách nhiệm                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BookmarkRepository`    | `find(postId, userId)`, `insertIfAbsent(postId, userId)`, `deleteIfPresent(postId, userId)`, `countByUser(userId)`, `lockUser(userId)`, `pageVisibleForUser(userId, page)` |
| `BookmarkFlagReader`    | `bookmarkedPostIds(postIds, callerId)`                                                                                                                                     |
| `PostInteractionReader` | Bọc `CheckPostInteraction`; không định nghĩa lại quy tắc hiển thị                                                                                                          |

## Lưu trữ

- Chuyển entity sang `modules/bookmarks/infrastructure/persistence/bookmark.orm-entity.ts`, giữ
  ràng buộc duy nhất `(post_id, user_id)`.
- **Giới hạn đồng thời:** `lockUser` dùng `pg_advisory_xact_lock` với khoá suy ra từ `user_id`, giữ
  tới hết transaction, để hai lần bookmark mới đồng thời của cùng người không cùng vượt 1.000
  (FR-012). Community không có bảng người dùng nên không dùng `FOR UPDATE` được.
- **Idempotent:** `INSERT ... ON CONFLICT (post_id, user_id) DO NOTHING`, rồi đọc lại dòng để trả
  `createdAt` ban đầu (AC-002, AC-011).
- **Danh sách:** lọc trong truy vấn (không lọc sau khi phân trang) bằng
  `posts.deleted_at IS NULL AND (posts.is_hidden = false OR posts.author_id = :caller)`, đúng nghĩa
  `Post.isVisibleTo` của COM-001; có test đối chiếu hai đường trên cùng dữ liệu.
- Không có truy vấn nào đếm bookmark theo Post hay trả `user_id` của người khác (FR-009).

## Thay đổi cơ sở dữ liệu

Đích: `bkpractice_community`, bảng `bookmarks`: thêm index
`IDX_bookmarks_user_created (user_id, created_at DESC, id DESC)` cho danh sách và đếm theo người dùng.
Không thêm cột. Không có khoá ngoại xuyên service.

## Migration

`apps/community-service/src/database/migrations/<timestamp>-Com004Bookmarks.ts`, sau `Com001Posts`,
`synchronize: false`.

- **Up:** tạo `IDX_bookmarks_user_created`.
- **Down:** bỏ index. Không mất dữ liệu.
- Kiểm chứng `pnpm migration:run:community` / `pnpm migration:revert:community`.

## API

Tiền tố `/api/community`. Tất cả route cần Bearer token.

| Method + route                                 | Use case          | Phản hồi                                        |
| ---------------------------------------------- | ----------------- | ----------------------------------------------- |
| `PUT /api/community/posts/:postId/bookmark`    | `BookmarkPost`    | `200` `{ bookmarked: true, bookmarkedAt }`      |
| `DELETE /api/community/posts/:postId/bookmark` | `RemoveBookmark`  | `204`                                           |
| `GET /api/community/bookmarks`                 | `ListMyBookmarks` | `200` `PageResponseDto<{ post, bookmarkedAt }>` |

- Không route nào nhận định danh người dùng; `GET /bookmarks` luôn là của người gọi.
- `PostResponseDto`, `PostSummaryResponseDto` và phép chiếu tác giả bổ sung `bookmarkedByMe` (FR-010;
  COM-001 cho phép tính năng khác bổ sung trường).
- Swagger mô tả route mới và ghi rằng bookmark của Post tạm không hiển thị vẫn tính vào giới hạn.

## DTO / Kiểm tra dữ liệu

- `postId` qua `ParseUUIDPipe`.
- `ListBookmarksQueryDto`: `page` (int ≥ 1, mặc định 1), `pageSize` (int 1..50, mặc định 20).
- Không có body cho `PUT`/`DELETE`; body có trường bị `forbidNonWhitelisted` từ chối (AC-010).
- `BookmarkStateResponseDto`: `bookmarked`, `bookmarkedAt`. `BookmarkListItemDto`: `post`
  (`PostSummaryResponseDto` hoặc phép chiếu tác giả của COM-001), `bookmarkedAt`.

## Phân quyền

- `TrustedUserGuard` và `@TrustedPrincipal()` của `common/auth/`. Không cần mã quyền.
- `userId` của mọi truy vấn là principal; không có đường nào đọc bookmark của người khác, kể cả
  `ADMIN` hay người có `community:moderate`.
- Kiểm thử khẳng định (mọi vai trò) và phủ định (không header, cố đọc bookmark người khác qua query,
  Post không hiển thị, tác giả tạo bookmark mới trên Post bị ẩn của mình).

## Messaging / Sự kiện

N/A. Đặc tả không có sự kiện.

## Realtime

N/A.

## Adapter hạ tầng

- `infrastructure/persistence/bookmark.orm-entity.ts`, `typeorm-bookmark.repository.ts` (upsert, xoá,
  đếm, advisory lock, trang theo hiển thị), `typeorm-bookmark-flag.reader.ts`.
- `infrastructure/post-interaction.adapter.ts` gọi `CheckPostInteraction`.
- `bookmarks.module.ts` import `PostsModule`; `BookmarkFlagReader` là provider chỉ cần datasource,
  export để mapper của `posts` dùng mà không tạo vòng phụ thuộc.
- Không thêm adapter HTTP hay messaging.

## Cấu hình

No configuration change.

## Xử lý lỗi

| Điều kiện                                                     | Ánh xạ (qua `CommunityDomainErrorFilter`) |
| ------------------------------------------------------------- | ----------------------------------------- |
| Thiếu/sai token                                               | `401` qua Gateway                         |
| Thiếu hoặc sai `x-auth-user-id`                               | `401`                                     |
| ID sai định dạng, query sai, body lạ                          | `400`                                     |
| Post không hiển thị với người gọi                             | `404`                                     |
| Tạo mới trên Post của mình không nhận tương tác mới; đủ 1.000 | `409`                                     |
| Lỗi lưu trữ ngoài dự kiến                                     | `500` chuẩn hoá hiện có                   |

## Bảo mật

| Yêu cầu | Cách thực thi                                                                |
| ------- | ---------------------------------------------------------------------------- |
| SR-001  | `userId` chỉ từ principal tin cậy                                            |
| SR-002  | Không có truy vấn trả bookmark của người khác hay số lượt bookmark theo Post |
| SR-003  | Bật bookmark hỏi COM-001; danh sách lọc trong SQL; gỡ luôn trả `204`         |
| SR-004  | DTO danh sách cho phép + `forbidNonWhitelisted`                              |
| SR-005  | Chỉ datasource Community                                                     |
| SR-006  | Principal thiếu/sai → `401` trước mọi truy cập dữ liệu                       |

## Chiến lược kiểm thử

- **Unit (application, port giả):** bật idempotent giữ thời điểm (AC-002); giới hạn 1.000 và bật lại
  bookmark cũ khi đã đủ (AC-008); Post không hiển thị (AC-004); tác giả trên Post bị ẩn: tạo mới `409`,
  bật lại khi đã có thành công (AC-013); gỡ không hỏi Post (AC-012).
- **Integration (lưu trữ):** hai lần bật đồng thời (AC-011); advisory lock giữ giới hạn khi đồng thời;
  trang và tổng số bỏ Post bị ẩn/xoá mềm và hiện lại khi khôi phục (AC-005); tác giả thấy Post ẩn của
  mình (AC-013); điều kiện SQL khớp `Post.isVisibleTo`; migration up/down.
- **API/E2E:** bật, gỡ, liệt kê (AC-001, 003); `bookmarkedByMe` trên danh sách/chi tiết Post (AC-007);
  không lộ bookmark của người khác (AC-006); `401` (AC-009); trường lạ (AC-010).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID. Log mức debug cho bật/gỡ với `postId` và request ID; từ chối vì giới hạn log
  mức info. Không log nội dung Post hay header xác thực.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                            | Kiểm chứng                   |
| -------------- | ----------------------------------------------------------- | ---------------------------- |
| FR-001, FR-002 | Module `bookmarks`; chỉ `post_id`                           | Kiến trúc                    |
| FR-003, FR-004 | Ràng buộc duy nhất; `ON CONFLICT DO NOTHING`                | Integration; AC-002, 011     |
| FR-005         | `RemoveBookmark`                                            | API; AC-003, 012             |
| FR-006         | `CheckPostInteraction`                                      | API; AC-004, 013             |
| FR-007, FR-008 | `ListMyBookmarks`, điều kiện tương đương `Post.isVisibleTo` | Integration/API; AC-005, 013 |
| FR-009         | Không truy vấn chéo người dùng                              | Rà soát/API; AC-006          |
| FR-010         | `BookmarkFlagReader` + bổ sung DTO Post                     | API; AC-007                  |
| FR-011         | `MAX_BOOKMARKS_PER_USER`, advisory lock                     | Unit/integration; AC-008     |
| FR-012         | Transaction, upsert, advisory lock                          | Integration; AC-011          |
| SR-001–SR-006  | Mục Bảo mật                                                 | Test bảo mật; AC-009, 010    |

## Thứ tự triển khai

1. Xác nhận COM-001 đã triển khai (`common/`, `CheckPostInteraction`, `Post.isVisibleTo`, mapper tóm
   tắt).
2. Chuyển entity; migration `Com004Bookmarks`; kiểm chứng up/down.
3. Adapter và port; integration test.
4. Use case, controller, DTO, Swagger.
5. Bổ sung `bookmarkedByMe` vào DTO Post qua `BookmarkFlagReader`.
6. Test API/bảo mật; `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Phụ thuộc

- **COM-001** (Approved): `common/`, `CheckPostInteraction`, `Post.isVisibleTo`, mapper
  `PostSummaryResponseDto`/phép chiếu tác giả được export để dùng lại.
- **COM-005:** ghi `is_hidden` mà điều kiện hiển thị đọc. COM-004 không phụ thuộc trực tiếp module
  `moderation`.

## Rủi ro

- **Điều kiện hiển thị lặp lại trong SQL** của danh sách bookmark: giảm thiểu bằng test đối chiếu với
  `Post.isVisibleTo`.
- **Vòng phụ thuộc module** `posts` ⇄ `bookmarks`: giải bằng provider `BookmarkFlagReader` độc lập.
- **Advisory lock** theo hash của `user_id` có thể trùng khoá giữa hai người khác nhau; chỉ làm tuần tự
  hoá thừa, không sai kết quả.
- **Bookmark của Post ẩn vẫn tính vào 1.000**: đúng theo FR-011; ghi vào tài liệu API.

## Tuân thủ kiến trúc

- Controller chỉ dịch transport; use case gọi port; adapter TypeORM trong `infrastructure`.
- Bookmark chỉ trong `bkpractice_community`; `user_id` là UUID thuần; không gọi service khác.
- Phụ thuộc giữa module cùng service chỉ qua use case/provider được export.
- Không có ngoại lệ kiến trúc.

## Vấn đề cần chủ sở hữu xem lại

Không có vấn đề chặn. Lưu ý phối hợp: mapper tóm tắt Post của COM-001 cần được export để danh sách
bookmark dùng lại; plan COM-001 dòng "COM-003/COM-004 dùng `ContentVisibilityReader` của COM-005" cần
được người điều phối cập nhật thành `CheckPostInteraction`.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved (phiên bản 1.0). Danh sách công việc dẫn xuất từ kế hoạch này nằm ở
> [`tasks.md`](./tasks.md).
