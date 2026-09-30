# COM-005 Công việc triển khai Moderation

## Trạng thái

Approved — Sẵn sàng triển khai sau COM-001, COM-002 và ID-003-T047/T048

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.1`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-30`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **COM-005-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.1 Approved,
      `plan.md` Approved, kiến trúc Community (Clean Architecture, ADR 0002). Xác nhận COM-001/COM-002
      đã triển khai `common/auth`, `common/errors`, `common/pagination`, `common/content`,
      `CheckPostInteraction`, `CheckCommentInteraction`, cột `deleted_at` và trường `moderation` trong
      phép chiếu tác giả, và bộ lọc hiển thị đọc `is_hidden`. Nếu khác plan, **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Quy trình SDD; bước 1 của Thứ tự triển khai.

- [ ] **COM-005-T002 — Xác nhận cơ chế quyền.** Xác nhận ID-003-T047 (migration danh mục quyền) và
      ID-003-T048 (Gateway đặt `x-auth-permissions`) đã có hoặc ghi rõ trạng thái. Không suy ra quyền
      từ `x-auth-roles`.
      **Phụ thuộc:** COM-005-T001.
      **Truy vết:** COM-005-SR-002; mục Phân quyền của plan; ID-003-FR-021, FR-022.

- [ ] **COM-005-T003 — Xác nhận ranh giới và loại trừ.** Ghi nhận: không kiểm duyệt bởi `LECTURER`,
      không kháng nghị/thông báo, không xoá báo cáo, không ẩn tự động, không realtime, không đổi cách
      COM-001/002 hiển thị nội dung ẩn, không truy cập CSDL xuyên service.
      **Phụ thuộc:** COM-005-T001.
      **Truy vết:** Ngoài phạm vi của đặc tả; COM-005-FR-012, FR-016; SR-007.

## Domain

- [ ] **COM-005-T004 — Value object và enum.** `ModerationReason`, `ReportNote` (≤ 500 ký tự, từ chối
      thẻ HTML/script bằng bộ kiểm tra của `common/content/`), `ContentRef`, `ResolutionDecision`. Không
      import NestJS/TypeORM.
      **Phụ thuộc:** COM-005-T001.
      **Truy vết:** COM-005-FR-003, FR-009; SR-005; AC-004.

- [ ] **COM-005-T005 — `ModerationState` và `Report`.** `hide`/`restore` idempotent, ghi người và thời
      điểm; `Report.resolve` chỉ từ `OPEN`, ngược lại `InvalidStateError`.
      **Phụ thuộc:** COM-005-T004.
      **Truy vết:** COM-005-FR-007, FR-008, FR-009, FR-011; AC-013, AC-016.

- [ ] **COM-005-T006 — `AuthorModerationView`.** Phần bổ sung `reason`, `hiddenAt` cho trường
      `moderation` của phép chiếu tác giả; không có người kiểm duyệt hay người báo cáo. Không định nghĩa
      quy tắc hiển thị (thuộc COM-001/002).
      **Phụ thuộc:** COM-005-T005.
      **Truy vết:** COM-005-FR-012, FR-013; SR-004; AC-010.

- [ ] **COM-005-T007 — Unit test domain.** Ghi chú, lý do, chuyển trạng thái báo cáo, ẩn/khôi phục
      idempotent, `AuthorModerationView` không có trường nhạy cảm.
      **Phụ thuộc:** COM-005-T004 tới COM-005-T006.
      **Truy vết:** AC-004, AC-010, AC-013, AC-016.

## Tầng application

- [ ] **COM-005-T008 — Định nghĩa port.** `ReportRepository`, `ModerationTargetRepository`,
      `ContentInteractionReader` (bọc `CheckPostInteraction`/`CheckCommentInteraction`),
      `TransactionRunner` (tái dùng nếu đã có). Không port nào khác.
      **Phụ thuộc:** COM-005-T005.
      **Truy vết:** Mục Port của plan.

- [ ] **COM-005-T009 — `ReportContent`.** Hỏi `ContentInteractionReader` (Comment phải trùng `postId`),
      cấm tự báo cáo, `!acceptsInteraction` → `404`, upsert báo cáo `OPEN`, trả báo cáo hiện có khi trùng.
      **Phụ thuộc:** COM-005-T008.
      **Truy vết:** COM-005-FR-002–FR-005, FR-017; AC-001–AC-005.

- [ ] **COM-005-T010 — `ListReports` và `GetReport`.** Kiểm `community:moderate` trước khi đọc; lọc,
      sắp, phân trang, đoạn trích 200 ký tự; chi tiết gồm nội dung đầy đủ, trạng thái ẩn và xoá mềm.
      **Phụ thuộc:** COM-005-T008.
      **Truy vết:** COM-005-FR-006; SR-001; AC-006, AC-007, AC-019.

- [ ] **COM-005-T011 — `ResolveReport`.** Transaction, khoá dòng báo cáo và đối tượng; `HIDE`/`DISMISS`
      áp cho mọi báo cáo `OPEN` của đối tượng; đã xử lý → `409`.
      **Phụ thuộc:** COM-005-T008.
      **Truy vết:** COM-005-FR-009, FR-011, FR-017; AC-011–AC-013, AC-020.

- [ ] **COM-005-T012 — `HideContent` và `RestoreContent`.** Idempotent; ẩn kết thúc báo cáo `OPEN`
      thành `REVIEWED`; khôi phục không mở lại báo cáo, không đụng Comment/phản ứng/bookmark.
      **Phụ thuộc:** COM-005-T008.
      **Truy vết:** COM-005-FR-007, FR-008, FR-010, FR-011, FR-015; AC-009, AC-014–AC-016.

- [ ] **COM-005-T013 — Unit test application.** Port giả: quyền (khẳng định/phủ định), tự báo cáo,
      trùng, xử lý mọi báo cáo mở, đã xử lý, ẩn kết thúc báo cáo, thất bại không để lại thay đổi dở.
      **Phụ thuộc:** COM-005-T009 tới COM-005-T012.
      **Truy vết:** AC-002, AC-003, AC-005, AC-006, AC-008, AC-011–AC-014.

## Lưu trữ

- [ ] **COM-005-T014 — Chuyển và cập nhật entity.** Chuyển `Report` sang
      `moderation/infrastructure/persistence/`; thêm `comment`, `reasonCode`, `details`, `reviewedAt`;
      thêm `hiddenReason`, `hiddenAt`, `hiddenBy` vào entity `Post`, `Comment`; cập nhật
      `community.entities.ts`, bỏ `Report` khỏi `posts.module.ts`. Không đưa entity vào `libs/`.
      **Phụ thuộc:** COM-005-T001.
      **Truy vết:** Mục Lưu trữ của plan; FR-012; SR-007.

- [ ] **COM-005-T015 — Adapter repository.** `TypeOrmReportRepository` (upsert `ON CONFLICT DO
NOTHING`, `resolveOpenForTarget` có điều kiện `status = 'OPEN'`), `TypeOrmModerationTargetRepository`
      (`FOR UPDATE`; ghi `is_hidden` và ba cột ẩn trong cùng một `UPDATE`), `TypeOrmTransactionRunner`
      (tái dùng nếu đã có).
      **Phụ thuộc:** COM-005-T008, COM-005-T014.
      **Truy vết:** COM-005-FR-005, FR-012, FR-017; AC-002, AC-020.

- [ ] **COM-005-T016 — Adapter kiểm tra tương tác.** `content-interaction.adapter.ts` gọi
      `CheckPostInteraction`/`CheckCommentInteraction` của COM-001/002; không tự đọc bảng để suy hiển
      thị.
      **Phụ thuộc:** COM-005-T008.
      **Truy vết:** COM-005-FR-002, FR-012; SR-003.

- [ ] **COM-005-T017 — Integration test lưu trữ.** Partial unique index, hai lần xử lý đồng thời, CHECK
      `is_hidden = (hidden_at IS NOT NULL)` giữ nhất quán.
      **Phụ thuộc:** COM-005-T015, COM-005-T018.
      **Truy vết:** AC-002, AC-020; COM-005-FR-012.

## Cơ sở dữ liệu / Migration

- [ ] **COM-005-T018 — Migration Community `Com005Moderation`.** Enum `moderation_reason_enum`; sửa
      `reports` (`comment_id`, `reason_code` backfill `OTHER`, `reason` → `details`, `reviewed_at`,
      partial unique index, index); cột ẩn + backfill + CHECK trên `posts`, `comments`. Down theo plan,
      có cảnh báo mất báo cáo trên Comment.
      **Phụ thuộc:** COM-005-T014.
      **Truy vết:** Mục Thay đổi CSDL và Migration của plan.

- [ ] **COM-005-T019 — Seed quyền ở Identity.** Tạo
      `apps/identity-service/src/database/migrations/<timestamp>-Com005CommunityModeratePermission.ts`:
      chèn mã `community:moderate` và gán **chỉ cho vai trò `ADMIN`**, idempotent
      (`ON CONFLICT DO NOTHING`); down xoá đúng phép gán và mã đó. Chạy sau ID-003-T047.
      **Phụ thuộc:** COM-005-T002.
      **Truy vết:** ID-003-FR-017; COM-005 Quy tắc phân quyền; AC-022.

- [ ] **COM-005-T020 — Kiểm chứng migration.** `pnpm migration:run:community` /
      `pnpm migration:revert:community` và `pnpm migration:run:identity` /
      `pnpm migration:revert:identity` trên CSDL cách ly có dữ liệu mẫu; xác nhận `synchronize` vẫn tắt.
      **Phụ thuộc:** COM-005-T018, COM-005-T019.
      **Truy vết:** Định nghĩa Hoàn thành; AC-022.

## API

- [ ] **COM-005-T021 — Principal tin cậy.** Tái dùng `TrustedUserGuard` và `@TrustedPrincipal()` của
      `common/auth/` (COM-001); xác nhận `permissions` lấy từ `x-auth-permissions`, thiếu → rỗng; không
      đọc `x-auth-roles`.
      **Phụ thuộc:** COM-005-T001.
      **Truy vết:** COM-005-SR-002, SR-009; AC-008, AC-023.

- [ ] **COM-005-T022 — DTO.** Request/response DTO theo plan; `ParseUUIDPipe` cho tham số route;
      `ValidateIf` cho `reasonCode` khi `HIDE`.
      **Phụ thuộc:** COM-005-T004.
      **Truy vết:** COM-005-SR-006; AC-004, AC-024.

- [ ] **COM-005-T023 — Controller và ánh xạ lỗi.** Chín route của plan; lỗi qua
      `CommunityDomainErrorFilter` sang `400`/`403`/`404`/`409`; không đổi route của `posts`/`comments`.
      **Phụ thuộc:** COM-005-T009 tới COM-005-T012, COM-005-T021, COM-005-T022.
      **Truy vết:** Mục API và Xử lý lỗi của plan.

- [ ] **COM-005-T024 — Swagger.** Mô tả mọi route; ví dụ không có nội dung hay định danh thật.
      **Phụ thuộc:** COM-005-T023.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **COM-005-T025 — Gắn module.** `ModerationModule` import `PostsModule`, `CommentsModule`, gắn
      adapter vào port; import trong `community-service.module.ts`.
      **Phụ thuộc:** COM-005-T015, COM-005-T016, COM-005-T023.
      **Truy vết:** Mục Adapter của plan.

## Phần bổ sung vào COM-001/COM-002

- [ ] **COM-005-T026 — Bổ sung lý do và thời điểm ẩn cho tác giả.** Sửa mapper phép chiếu tác giả của
      COM-001/002 để trường `moderation` có thêm `reason`, `hiddenAt` từ ba cột ẩn khi `HIDDEN` (COM-001/002
      cho phép tính năng khác bổ sung trường). Không đổi bộ lọc hiển thị hay hành vi khác của COM-001/002.
      **Phụ thuộc:** COM-005-T014, COM-005-T025.
      **Truy vết:** COM-005-FR-013; AC-010, AC-021.

## Messaging

- [x] N/A — COM-005 không phát hay tiêu thụ event (mục Messaging của plan).

## Realtime

- [x] N/A — Realtime là Ngoài phạm vi.

## Kiểm thử

- [ ] **COM-005-T027 — Test API/E2E.** Mọi route với `ADMIN` có quyền, `STUDENT`, `LECTURER`, `ADMIN`
      thiếu claim; ẩn Post → người khác và người kiểm duyệt khác nhận `404` ở COM-001, tác giả thấy
      `moderation` đủ trường; ẩn Post → Comment của người khác `404`; ẩn Comment gốc còn trả lời → chỗ giữ
      chỗ; khôi phục giữ dữ liệu con; chi tiết báo cáo nội dung ẩn/xoá mềm; không lộ người báo cáo;
      token `ADMIN` chứa `community:moderate`; `401`; trường lạ.
      **Phụ thuộc:** COM-005-T020, COM-005-T025, COM-005-T026.
      **Truy vết:** AC-001 tới AC-024.

- [ ] **COM-005-T028 — Rà soát bảo mật.** Log không chứa nội dung/ghi chú/header; quyền chỉ từ
      `x-auth-permissions`; nội dung ẩn không lộ qua số đếm hay lỗi; không truy cập CSDL xuyên service.
      **Phụ thuộc:** COM-005-T027.
      **Truy vết:** COM-005-SR-001 tới SR-009; AC-021.

## Tài liệu và kiểm chứng

- [ ] **COM-005-T029 — Tài liệu triển khai.** Ghi cảnh báo down migration; ghi phụ thuộc ID-003-T048;
      ghi thứ tự chạy migration Identity sau ID-003-T047.
      **Phụ thuộc:** COM-005-T020.
      **Truy vết:** Mục Rủi ro của plan.

- [ ] **COM-005-T030 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`. Không che lỗi bằng `any`, `@ts-ignore` hay tắt lint.
      **Phụ thuộc:** COM-005-T027, COM-005-T028, COM-005-T029.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **COM-005-T031 — Kiểm chứng tuân thủ kiến trúc.** Domain không import NestJS/TypeORM; use case
      chỉ phụ thuộc domain và port; controller chỉ lo transport; không có gì trong `libs/`.
      **Phụ thuộc:** COM-005-T030.
      **Truy vết:** ADR 0002; `dependency-rules.md`.

- [ ] **COM-005-T032 — Đối chiếu với đặc tả và bàn giao.** Rà FR-001–FR-017, SR-001–SR-009,
      AC-001–AC-024; cập nhật ô đánh dấu trung thực; viết worked entry; chỉ chuyển đặc tả sang
      `Implemented`/`Verified` qua quy trình SDD.
      **Phụ thuộc:** COM-005-T031.
      **Truy vết:** Đặc tả 1.0; Định nghĩa Hoàn thành.

## Bảng tổng hợp độ phủ

| Yêu cầu               | Công việc triển khai chính   | Kiểm thử/xác minh      |
| --------------------- | ---------------------------- | ---------------------- |
| COM-005-FR-001        | T014, T019, T025             | T031, T032             |
| COM-005-FR-002–FR-005 | T004, T009, T015, T016, T018 | T013, T017, T027       |
| COM-005-FR-006        | T010                         | T013, T027             |
| COM-005-FR-007–FR-011 | T005, T011, T012, T015       | T007, T013, T027       |
| COM-005-FR-012        | T014, T015, T016             | T017, T027             |
| COM-005-FR-013        | T006, T026                   | T007, T027             |
| COM-005-FR-014        | T003, T010                   | T027                   |
| COM-005-FR-015–FR-016 | T012, T003                   | T027, T032             |
| COM-005-FR-017        | T011, T015                   | T017                   |
| COM-005-SR-001–SR-009 | T002, T004, T010, T021, T022 | T028, T032             |
| COM-005-AC-001–AC-024 | —                            | T007, T013, T017, T027 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
