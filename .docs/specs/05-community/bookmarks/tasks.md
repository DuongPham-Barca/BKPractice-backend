# COM-004 Công việc triển khai Bookmarks

## Trạng thái

Approved — Sẵn sàng triển khai sau COM-001

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.0`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-30`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **COM-004-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.0 Approved,
      `plan.md` Approved, kiến trúc Community. Xác nhận COM-001 đã triển khai `common/auth`,
      `common/errors`, `common/pagination`, `CheckPostInteraction`, `Post.isVisibleTo` và mapper tóm tắt
      Post được export. Nếu chưa, **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; bước 1 của Thứ tự triển khai.

- [ ] **COM-004-T002 — Xác nhận ranh giới và loại trừ.** Ghi nhận: chỉ Post, không thư mục/nhãn,
      không chia sẻ, không số lượt bookmark công khai, không mã quyền mới.
      **Phụ thuộc:** COM-004-T001.
      **Truy vết:** Ngoài phạm vi của đặc tả; COM-004-FR-002, FR-009.

## Domain

- [ ] **COM-004-T003 — Khái niệm domain.** `MAX_BOOKMARKS_PER_USER = 1000`, `BookmarkPage`; lỗi dùng
      `common/errors/`. Không import NestJS/TypeORM.
      **Phụ thuộc:** COM-004-T001.
      **Truy vết:** COM-004-FR-006, FR-007, FR-011.

## Tầng application

- [ ] **COM-004-T004 — Định nghĩa port.** `BookmarkRepository`, `BookmarkFlagReader`,
      `PostInteractionReader` (bọc `CheckPostInteraction`). Không port nào khác.
      **Phụ thuộc:** COM-004-T003.
      **Truy vết:** Mục Port của plan.

- [ ] **COM-004-T005 — `BookmarkPost`.** Hỏi `PostInteractionReader`; bookmark đã có → trả nguyên thời
      điểm lưu; chưa có → cần `acceptsInteraction` (không có → `409`), khoá theo người dùng, kiểm 1.000,
      `insertIfAbsent`.
      **Phụ thuộc:** COM-004-T004.
      **Truy vết:** COM-004-FR-003, FR-004, FR-006, FR-011, FR-012; AC-001, AC-002, AC-004, AC-008, AC-013.

- [ ] **COM-004-T006 — `RemoveBookmark`.** `deleteIfPresent`, không kiểm Post; luôn cùng kết quả.
      **Phụ thuộc:** COM-004-T004.
      **Truy vết:** COM-004-FR-005; SR-003; AC-003, AC-012.

- [ ] **COM-004-T007 — `ListMyBookmarks`.** Trang theo thời điểm lưu giảm dần, lọc trong truy vấn bằng
      điều kiện tương đương `Post.isVisibleTo`, tổng số cùng điều kiện, ánh xạ Post bằng mapper tóm tắt
      của COM-001.
      **Phụ thuộc:** COM-004-T004.
      **Truy vết:** COM-004-FR-007, FR-008; AC-005, AC-013.

- [ ] **COM-004-T008 — Unit test application.** Port giả: idempotent, giới hạn và bật lại khi đủ, Post
      không hiển thị, tác giả tạo mới trên Post bị ẩn (`409`), gỡ không hỏi Post.
      **Phụ thuộc:** COM-004-T005 tới COM-004-T007.
      **Truy vết:** AC-002, AC-004, AC-008, AC-012, AC-013.

## Lưu trữ

- [ ] **COM-004-T009 — Chuyển entity.** Chuyển `Bookmark` sang `bookmarks/infrastructure/persistence/`;
      cập nhật `community.entities.ts`, bỏ `Bookmark` khỏi `posts.module.ts`.
      **Phụ thuộc:** COM-004-T001.
      **Truy vết:** Mục Lưu trữ của plan; SR-005.

- [ ] **COM-004-T010 — Adapter.** `TypeOrmBookmarkRepository` (`ON CONFLICT DO NOTHING`, xoá, đếm,
      `pg_advisory_xact_lock`, trang theo hiển thị), `TypeOrmBookmarkFlagReader` (provider độc lập để
      tránh vòng phụ thuộc với `posts`), `post-interaction.adapter.ts`.
      **Phụ thuộc:** COM-004-T004, COM-004-T009.
      **Truy vết:** COM-004-FR-003, FR-006, FR-008–FR-012; SR-002, SR-003.

- [ ] **COM-004-T011 — Integration test lưu trữ.** Hai lần bật đồng thời; giới hạn khi đồng thời; Post
      ẩn/xoá mềm biến khỏi trang và tổng số rồi hiện lại khi khôi phục; tác giả thấy Post ẩn của mình;
      điều kiện SQL khớp `Post.isVisibleTo` trên cùng dữ liệu.
      **Phụ thuộc:** COM-004-T010, COM-004-T012.
      **Truy vết:** AC-005, AC-011, AC-013; COM-004-FR-008, FR-012.

## Cơ sở dữ liệu / Migration

- [ ] **COM-004-T012 — Migration `Com004Bookmarks`.** Tạo `IDX_bookmarks_user_created (user_id,
created_at DESC, id DESC)`; down bỏ index. Kiểm chứng `pnpm migration:run:community` /
      `pnpm migration:revert:community`; `synchronize` vẫn tắt.
      **Phụ thuộc:** COM-004-T009.
      **Truy vết:** Mục Thay đổi CSDL và Migration của plan.

## API

- [ ] **COM-004-T013 — Controller và DTO.** Ba route của plan; `ParseUUIDPipe`; `ListBookmarksQueryDto`;
      response DTO; lỗi qua `CommunityDomainErrorFilter`; `TrustedUserGuard`.
      **Phụ thuộc:** COM-004-T005 tới COM-004-T007.
      **Truy vết:** COM-004-FR-004, FR-005, FR-007; SR-001, SR-004, SR-006; AC-009, AC-010.

- [ ] **COM-004-T014 — Swagger và gắn module.** Mô tả route; ghi rằng bookmark của Post tạm không
      hiển thị vẫn tính vào giới hạn; `BookmarksModule` import `PostsModule`, export `BookmarkFlagReader`;
      import trong `community-service.module.ts`.
      **Phụ thuộc:** COM-004-T010, COM-004-T013.
      **Truy vết:** Mục Adapter và API của plan.

## Phần bổ sung vào COM-001

- [ ] **COM-004-T015 — Bổ sung cờ vào biểu diễn Post.** Sửa mapper `PostResponseDto`,
      `PostSummaryResponseDto` và phép chiếu tác giả để thêm `bookmarkedByMe` qua `BookmarkFlagReader`
      (một truy vấn gộp mỗi trang). Không đổi hành vi khác của COM-001.
      **Phụ thuộc:** COM-004-T014.
      **Truy vết:** COM-004-FR-010; AC-007.

## Messaging

- [x] N/A — Đặc tả không có sự kiện.

## Realtime

- [x] N/A — Đặc tả không có realtime.

## Phân quyền

- [ ] **COM-004-T016 — Test phân quyền và riêng tư.** Khẳng định: mọi vai trò thao tác bookmark của
      mình. Phủ định: không header, header sai, cố đọc bookmark người khác, `ADMIN`/người kiểm duyệt
      không thấy bookmark người khác, không phản hồi nào có số lượt bookmark.
      **Phụ thuộc:** COM-004-T013.
      **Truy vết:** COM-004-FR-009; SR-001, SR-002, SR-006; AC-006, AC-009.

## Kiểm thử

- [ ] **COM-004-T017 — Test API/E2E.** Bật, gỡ, liệt kê, idempotent, giới hạn, Post ẩn/xoá mềm,
      `bookmarkedByMe`, trường lạ.
      **Phụ thuộc:** COM-004-T012, COM-004-T014, COM-004-T015.
      **Truy vết:** AC-001 tới AC-013.

## Tài liệu và kiểm chứng

- [ ] **COM-004-T018 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`.
      **Phụ thuộc:** COM-004-T016, COM-004-T017.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **COM-004-T019 — Kiểm chứng kiến trúc, đối chiếu đặc tả và bàn giao.** Chiều phụ thuộc đúng; rà
      FR-001–FR-012, SR-001–SR-006, AC-001–AC-013; cập nhật ô đánh dấu; viết worked entry; chỉ chuyển
      trạng thái đặc tả qua quy trình SDD.
      **Phụ thuộc:** COM-004-T018.
      **Truy vết:** ADR 0002; Đặc tả 1.0; Định nghĩa Hoàn thành.

## Bảng tổng hợp độ phủ

| Yêu cầu               | Công việc triển khai chính | Kiểm thử/xác minh      |
| --------------------- | -------------------------- | ---------------------- |
| COM-004-FR-001–FR-002 | T002, T009                 | T019                   |
| COM-004-FR-003–FR-004 | T005, T010                 | T008, T011, T017       |
| COM-004-FR-005        | T006                       | T008, T017             |
| COM-004-FR-006        | T005                       | T008, T017             |
| COM-004-FR-007–FR-008 | T007, T010                 | T011, T017             |
| COM-004-FR-009        | T010                       | T016                   |
| COM-004-FR-010        | T010, T015                 | T017                   |
| COM-004-FR-011–FR-012 | T003, T005, T010           | T008, T011             |
| COM-004-SR-001–SR-006 | T010, T013                 | T016, T019             |
| COM-004-AC-001–AC-013 | —                          | T008, T011, T016, T017 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
