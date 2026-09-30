# LRN-007 Công việc triển khai Gợi ý bài (Recommendation)

## Trạng thái

Approved — Sẵn sàng triển khai sau LRN-001, LRN-003 và LRN-006

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất).

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.0`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-30`

Mọi công việc bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` khi cả phần triển khai lẫn
phần kiểm chứng đã xong. Các mục N/A là những mục duy nhất được tích sẵn có chủ đích. Danh sách này
không thêm hành vi ngoài `spec.md` và không thay đổi `plan.md`.

## Chuẩn bị

- [ ] **LRN-007-T001 — Xác nhận nền tảng.** Khảo sát trạng thái Git, `spec.md` 1.0 Approved,
      `plan.md` Approved, kiến trúc Learning (DDD + Hexagonal, ADR 0002). Xác nhận đã triển khai:
      LRN-001 (`PrincipalProvider`, `problems.deleted_at`, `ON_HOLD`), LRN-003 (`courses.status`,
      `courses.deleted_at`, `chapter_problems` với `display_order`), LRN-006 (đã giải = `solved_at`
      khác null). Ghi lại tên bảng/cột thật; kiểm xem LRN-001 đã tạo index theo `topic_id`/`tag_id`
      chưa. Thiếu phụ thuộc nào thì **DỪNG và BÁO CÁO**.
      **Phụ thuộc:** Không có.
      **Truy vết:** Mục Phụ thuộc và Thứ tự triển khai bước 1 của kế hoạch.

- [ ] **LRN-007-T002 — Xác nhận ranh giới và loại trừ.** Ghi nhận: không ML, không dùng dữ liệu người
      khác, không lưu gợi ý/lịch sử, không gợi ý khởi đầu, không dựa Class/Assignment, không realtime,
      không quyền mới, không microservice, không truy cập CSDL xuyên service.
      **Phụ thuộc:** LRN-007-T001.
      **Truy vết:** Mục Ngoài phạm vi của đặc tả; LRN-007-FR-011, FR-014; SR-006.

## Domain

- [ ] **LRN-007-T003 — Hiện thực `DifficultyLadder`.** Thứ tự `EASY` < `MEDIUM` < `HARD`,
      `maxStepUp = 1`, `allowsFor(basis, candidate)`, và phương thức xuất mảng thứ tự bậc để truyền
      vào SQL. Không import NestJS/TypeORM.
      **Phụ thuộc:** LRN-007-T001.
      **Truy vết:** LRN-007-FR-005; AC-005, AC-006.

- [ ] **LRN-007-T004 — Hiện thực value object.** `RecommendedProblem` (`id`, `slug`, `title`,
      `problemType`, `difficulty`), `RecommendationReason` (`NEXT_IN_COURSE` kèm Course;
      `SIMILAR_TOPIC_TAG` kèm ít nhất một Topic/Tag), `Recommendation`. Bất biến, kiểm tra khi khởi
      tạo.
      **Phụ thuộc:** LRN-007-T001.
      **Truy vết:** LRN-007-FR-009, FR-010; AC-015, AC-016.

- [ ] **LRN-007-T005 — Hiện thực `RecommendationPolicy`.** `compose(nextInCourse, similar)`: giữ thứ
      tự đầu vào, luật 1 trước, loại Problem trùng (giữ lần đầu), cắt còn 10. Kèm hàm loại trùng
      riêng cho luật 1 để use case tính số chỗ còn lại.
      **Phụ thuộc:** LRN-007-T004.
      **Truy vết:** LRN-007-FR-003, FR-007, FR-008, FR-012; AC-007, AC-008.

- [ ] **LRN-007-T006 — Unit test domain.** Đủ 9 cặp độ khó; lý do `SIMILAR_TOPIC_TAG` rỗng bị từ
      chối; gộp, loại trùng, cắt 10, đầu vào rỗng, giữ thứ tự. Chạy không cần PostgreSQL.
      **Phụ thuộc:** LRN-007-T003 tới LRN-007-T005.
      **Truy vết:** AC-005, AC-006, AC-007, AC-008, AC-011.

## Tầng application

- [ ] **LRN-007-T007 — Định nghĩa port `RecommendationCandidateReader`.** Hai phương thức
      `findNextInFollowedCourses(userId)` và
      `findSimilarCandidates(userId, { excludeProblemIds, limit, ladder })`, trả value object domain.
      Không port nào khác ngoài `PrincipalProvider` của LRN-001.
      **Phụ thuộc:** LRN-007-T004.
      **Truy vết:** Mục Port của kế hoạch.

- [ ] **LRN-007-T008 — Hiện thực `GetMyRecommendations`.** Lấy principal; thiếu `userId` thì
      `Unauthenticated` và không gọi reader. Gọi luật 1, loại trùng; nếu còn chỗ thì gọi luật 2 với
      `excludeProblemIds` và `limit = 10 − n`; `compose`; trả danh sách. Không ghi, không mở
      transaction ghi; lỗi reader được ném tiếp.
      **Phụ thuộc:** LRN-007-T005, LRN-007-T007.
      **Truy vết:** LRN-007-FR-001, FR-007, FR-008, FR-011, FR-013, FR-015; SR-001, SR-005.

- [ ] **LRN-007-T009 — Unit test application.** Port giả: principal thiếu (AC-001); luật 1 đủ 10
      thì không gọi luật 2 (AC-008); tham số `excludeProblemIds`/`limit` đúng; `userId` lấy từ
      principal (AC-013); lỗi reader không trả danh sách một phần.
      **Phụ thuộc:** LRN-007-T008.
      **Truy vết:** AC-001, AC-008, AC-011, AC-013; SR-005.

## Lưu trữ

- [ ] **LRN-007-T010 — Hiện thực `TypeOrmRecommendationCandidateReader`.** Dùng `DataSource` của
      Learning, SQL có tham số theo mục Lưu trữ của kế hoạch: luật 1 với `DISTINCT ON` theo thứ tự
      Chapter rồi Problem, sắp `last_solved_at DESC, course_id ASC`, không `LIMIT`; luật 2 với
      `basis_refs`, điều kiện bậc `IN (0, 1)`, `score`, danh sách Topic/Tag chung, sắp
      `score DESC, bậc ASC, slug ASC LIMIT $limit`. Điều kiện hiển thị được cho Problem và Course ở
      mọi nhánh, kể cả bài nền. Chỉ chọn cột tóm tắt; không join bảng Test Case/starter code/harness.
      Không dùng entity hay repository của module khác.
      **Phụ thuộc:** LRN-007-T003, LRN-007-T007.
      **Truy vết:** LRN-007-FR-002 tới FR-006, FR-014; SR-002, SR-003, SR-004, SR-006.

- [ ] **LRN-007-T011 — Integration test adapter.** Trên PostgreSQL cách ly với dữ liệu mẫu nhiều
      trạng thái: bài kế tiếp đúng thứ tự (AC-002), bỏ bài tạm giữ (AC-003), thứ tự Course (AC-004),
      bậc độ khó (AC-005, AC-006), không dòng ẩn nào ở bất kỳ nhánh (AC-009), bài nền bị ẩn (AC-010),
      Topic/Tag chung đúng (AC-015), Course hết bài (AC-017), hai người dùng (AC-013), không có câu
      ghi nào (AC-014).
      **Phụ thuộc:** LRN-007-T010, LRN-007-T013.
      **Truy vết:** AC-002 tới AC-006, AC-009, AC-010, AC-013 tới AC-015, AC-017.

## Cơ sở dữ liệu / Migration

- [ ] **LRN-007-T012 — Viết migration index.** Tạo
      `apps/learning-service/src/database/migrations/<timestamp>-Lrn007RecommendationIndexes.ts`, sau
      migration LRN-001/LRN-003/LRN-006, `synchronize: false`. Up: `IDX_problem_topics_topic_id`,
      `IDX_problem_tags_tag_id`. Down: bỏ hai index. Nếu T001 thấy LRN-001 đã có index tương đương,
      đánh dấu N/A kèm lý do.
      **Phụ thuộc:** LRN-007-T001.
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu và Migration của kế hoạch.

- [ ] **LRN-007-T013 — Kiểm chứng vòng đời migration.** Trên `bkpractice_learning` cách ly:
      `pnpm migration:run:learning`, kiểm index, `pnpm migration:revert:learning`, kiểm đã bỏ, chạy
      lại up.
      **Phụ thuộc:** LRN-007-T012.
      **Truy vết:** Định nghĩa Hoàn thành; chiến lược cơ sở dữ liệu.

## API / Presentation

- [ ] **LRN-007-T014 — Tạo DTO.** `GetRecommendationsQueryDto` rỗng (mọi tham số bị
      `forbidNonWhitelisted` từ chối); `RecommendationResponseDto` với `problem` và `reason` theo mục
      DTO của kế hoạch; mapper tường minh từ value object.
      **Phụ thuộc:** LRN-007-T004.
      **Truy vết:** LRN-007-FR-009, FR-010; SR-001, SR-003, SR-004; AC-012, AC-016.

- [ ] **LRN-007-T015 — Hiện thực `RecommendationsController`.** `GET /api/recommendations` gọi đúng
      `GetMyRecommendations`, trả `200 { items }`; ánh xạ `Unauthenticated` → `401`. Controller chỉ
      lo transport.
      **Phụ thuộc:** LRN-007-T008, LRN-007-T014.
      **Truy vết:** LRN-007-FR-001, FR-013; AC-001, AC-011.

- [ ] **LRN-007-T016 — Cập nhật Swagger.** Mô tả route, DTO phản hồi (hai loại lý do), yêu cầu
      Bearer, mã `401`/`400`. Ví dụ không chứa dữ liệu thật hay nội dung ẩn.
      **Phụ thuộc:** LRN-007-T015.
      **Truy vết:** Định nghĩa Hoàn thành; SR-003.

- [ ] **LRN-007-T017 — Nối dây module.** Tạo `recommendation.module.ts`: gắn port với adapter,
      đăng ký use case, controller, import `PrincipalProvider` như LRN-001 export. Nạp
      `RecommendationModule` trong `learning-service.module.ts`. Không đổi module khác.
      **Phụ thuộc:** LRN-007-T008, LRN-007-T010, LRN-007-T015.
      **Truy vết:** Mục Adapter hạ tầng và Tuân thủ kiến trúc của kế hoạch.

## Cấu hình

- [ ] **LRN-007-T018 — Thêm tiền tố định tuyến ở Gateway.** Trong
      `apps/api-gateway/src/proxy/gateway-proxy.service.ts`, thêm `'/api/recommendations'` vào nhóm
      `LEARNING_SERVICE_URL`. Không thêm biến môi trường, không đổi `.env.example` hay Docker. Xác
      nhận middleware xác thực của Gateway áp dụng cho route mới.
      **Phụ thuộc:** LRN-007-T015.
      **Truy vết:** Mục Cấu hình và API của kế hoạch; AC-001.

## Phân quyền

- [x] **N/A — Seed quyền ở Identity.** LRN-007 không có mã quyền mới (quyết định 3 của đặc tả);
      không cần migration trong `apps/identity-service`.

## Messaging

- [x] **N/A — LRN-007 không phát và không tiêu thụ event.** Contract `submission.accepted` không đổi.

## Realtime

- [x] **N/A — Không có yêu cầu realtime.**

## Kiểm thử và bảo mật

- [ ] **LRN-007-T019 — Test API/E2E qua Gateway.** `401` khi thiếu token (AC-001); `400` với
      `?userId=` và tham số lạ (AC-012); người mới nhận `items: []` (AC-011); hai lần gọi giống nhau
      (AC-014); đủ 10 khi nhiều ứng viên (AC-008); người dùng `STUDENT`, `LECTURER`, `ADMIN` đều chỉ
      nhận gợi ý của mình (AC-013).
      **Phụ thuộc:** LRN-007-T017, LRN-007-T018.
      **Truy vết:** AC-001, AC-008, AC-011 tới AC-014.

- [ ] **LRN-007-T020 — Rà soát bảo mật tập trung.** Phản hồi, lỗi, log, Swagger không chứa nội dung
      đề, Test Case, harness, trạng thái, người tạo, tiến độ người khác hay header xác thực; SQL chỉ
      dùng tham số ràng buộc; không truy cập CSDL xuyên service.
      **Phụ thuộc:** LRN-007-T019.
      **Truy vết:** LRN-007-SR-001 tới SR-006; AC-009, AC-016.

## Khả năng quan sát

- [ ] **LRN-007-T021 — Log vận hành.** Mỗi yêu cầu một dòng info: request ID, số gợi ý luật 1, số
      gợi ý luật 2, thời gian tính. Không log danh sách Problem hay header xác thực.
      **Phụ thuộc:** LRN-007-T008.
      **Truy vết:** Mục Khả năng quan sát của kế hoạch; SR-002.

## Tài liệu và kiểm chứng

- [ ] **LRN-007-T022 — Cập nhật tài liệu triển khai.** Ghi rằng `recommendation` đọc các cột hiển thị
      của `problems`, `courses`, `chapter_problems`, `progress`, để LRN-001/LRN-003/LRN-006 biết khi
      đổi schema; ghi route Gateway mới; ghi rủi ro nhất quán sau.
      **Phụ thuộc:** LRN-007-T013, LRN-007-T016, LRN-007-T018.
      **Truy vết:** Mục Rủi ro của kế hoạch; Định nghĩa Hoàn thành.

- [ ] **LRN-007-T023 — Chạy lệnh kiểm chứng.** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
      `pnpm build`. Chỉ sửa lỗi thuộc phạm vi; không che lỗi bằng `any`, `@ts-ignore` hay tắt lint.
      **Phụ thuộc:** LRN-007-T006, LRN-007-T009, LRN-007-T011, LRN-007-T019, LRN-007-T020.
      **Truy vết:** Định nghĩa Hoàn thành.

- [ ] **LRN-007-T024 — Kiểm chứng tuân thủ kiến trúc.** Domain không import NestJS/TypeORM; use case
      chỉ phụ thuộc domain và port; controller chỉ lo transport; adapter gắn ở composition root;
      `recommendation` không import entity/repository/use case của module khác; không gì trong
      `libs/`.
      **Phụ thuộc:** LRN-007-T017, LRN-007-T023.
      **Truy vết:** ADR 0002; `dependency-rules.md`; mục Tuân thủ kiến trúc của kế hoạch.

- [ ] **LRN-007-T025 — Đối chiếu với đặc tả.** Rà từng LRN-007-FR-001 tới FR-015, SR-001 tới SR-006,
      AC-001 tới AC-017 với code, test, migration và Swagger. Xác nhận không có hành vi Ngoài phạm vi.
      Báo cáo sai lệch và rủi ro còn lại; không sửa đặc tả để khớp code.
      **Phụ thuộc:** LRN-007-T023, LRN-007-T024.
      **Truy vết:** Đặc tả 1.0; Định nghĩa Hoàn thành.

- [ ] **LRN-007-T026 — Bàn giao theo SDD.** Cập nhật ô đánh dấu trung thực, viết worked entry, lấy
      review của con người, chỉ chuyển đặc tả sang `Implemented` rồi `Verified` qua quy trình SDD.
      **Phụ thuộc:** LRN-007-T025.
      **Truy vết:** Quy trình SDD.

## Bảng tổng hợp độ phủ

| Yêu cầu               | Công việc triển khai chính | Kiểm thử/xác minh      |
| --------------------- | -------------------------- | ---------------------- |
| LRN-007-FR-001        | T008, T014, T015, T018     | T009, T019             |
| LRN-007-FR-002        | T010                       | T011                   |
| LRN-007-FR-003–FR-004 | T005, T010                 | T006, T011             |
| LRN-007-FR-005–FR-006 | T003, T010                 | T006, T011             |
| LRN-007-FR-007–FR-008 | T005, T008                 | T006, T009, T019       |
| LRN-007-FR-009–FR-010 | T004, T014                 | T011, T019, T020       |
| LRN-007-FR-011        | T002, T008                 | T011, T025             |
| LRN-007-FR-012        | T005, T010                 | T006, T019             |
| LRN-007-FR-013        | T008, T015                 | T006, T019             |
| LRN-007-FR-014        | T002, T010                 | T011, T025             |
| LRN-007-FR-015        | T008                       | T011, T025             |
| LRN-007-SR-001–SR-006 | T008, T010, T014, T021     | T020, T025             |
| LRN-007-AC-001–AC-017 | —                          | T006, T009, T011, T019 |

> File này là danh sách kiểm tra triển khai, không phải đặc tả. Không thêm yêu cầu và không âm thầm
> thay đổi `spec.md` hay `plan.md` đã Approved trong lúc thực hiện.
