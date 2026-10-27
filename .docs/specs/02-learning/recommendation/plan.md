# LRN-007 Kế hoạch triển khai Gợi ý bài (Recommendation)

## Trạng thái

Approved

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-30` (phê duyệt gộp: chủ sở hữu duyệt trước các
phương án đề xuất trong kế hoạch này).

Kế hoạch này bám theo phiên bản `1.0` (Approved) của đặc tả LRN-007. Nó là tài liệu thiết kế, không
triển khai code và không thay đổi đặc tả. Các quyết định lúc lập kế hoạch nằm ở mục
[Quyết định đã phê duyệt](#quyết-định-đã-phê-duyệt).

## Đặc tả liên quan

- [LRN-007 Gợi ý bài](./spec.md)
- Trạng thái: `Approved`
- Phiên bản: `1.0`
- Ngày phê duyệt: `2026-09-30`

Kế hoạch không thêm luật, tham số, quyền hay dữ liệu lưu trữ nào ngoài đặc tả.

## Service đích

Service: Learning Service, module mới `recommendation`
(`apps/learning-service/src/modules/recommendation/`), trong `bkpractice_learning`. Không tạo
microservice mới (kiến trúc Learning giữ Recommendation trong cùng bounded context).

Ngoài Learning, chỉ có một thay đổi: thêm tiền tố `/api/recommendations` vào danh sách định tuyến
Learning của API Gateway. Không có thay đổi ở Identity (không có quyền mới), Submission hay Judge.

## Kiến trúc service bắt buộc

Kiến trúc: **DDD + Hexagonal Architecture** (theo
[ADR 0002](../../../adr/0002-revised-service-internal-architectures.md) và
[`learning-service.md`](../../../architecture/learning-service.md)).

```text
presentation -> application -> domain
infrastructure ----implements----^ các port của application/domain
```

- Domain chứa các luật thật: bậc độ khó, gộp theo ưu tiên, loại trùng, giới hạn 10. Vì có bất biến
  thật nên module có đủ bốn tầng; không tạo thư mục rỗng.
- Chỉ dùng DDD tactical. Không aggregate nào vì tính năng chỉ đọc và không có bất biến ghi. Không
  CQRS bus, không event store, không base repository chung.
- Module `recommendation` không import code nội bộ (entity, repository, use case) của `problems`,
  `courses` hay `progress`; nó chỉ đọc dữ liệu qua một port của chính nó.

## Ảnh hưởng tới mã nguồn hiện có

### Nền tảng hiện tại (kết quả khảo sát)

- `apps/learning-service/src/modules/` có `problems`, `courses`, `assignments`, `progress`,
  `learning.entities.ts`. Không có thư mục `recommendation` trong code; `specs/02-learning/recommendation/`
  chỉ có `.gitkeep`.
- `problems.entity.ts`: enum `Difficulty` (`EASY`, `MEDIUM`, `HARD`), enum `PublishStatus` hiện là
  `DRAFT`/`PUBLISHED`/`ARCHIVED`; `Problem` quan hệ nhiều-nhiều với `Topic` và `Tag` qua
  `problem_topics(problem_id, topic_id)` và `problem_tags(problem_id, tag_id)`. Chưa có `deleted_at`.
  LRN-001 thêm `ON_HOLD` và `deleted_at`.
- Migration `1700000003000-InitialLearningSchema.ts`: `problem_topics` và `problem_tags` chỉ có khoá
  chính `(problem_id, topic_id)` / `(problem_id, tag_id)`, không có index theo `topic_id` hay
  `tag_id`. `progress` có `UNIQUE (user_id, problem_id)`.
- `progress.entity.ts` + `ProgressConsumer`: ghi `status = SOLVED`, `solved_at` lần đầu từ
  `occurredAt`, idempotent theo `last_event_id`. LRN-006 chuẩn hoá lại luồng này.
- `course.entity.ts`: `Course` chưa có trạng thái; `Chapter` có `display_order`; chưa có bảng xếp
  Problem vào Chapter. Kế hoạch LRN-003 thêm `courses.status`, `courses.deleted_at` và bảng
  `chapter_problems(id, chapter_id, course_id, problem_id, display_order)`.
- `ProblemsController` hiện có route `GET api/problems` và route judge-package nội bộ. LRN-001 thêm
  route tra theo định danh/slug dưới `/api/problems/:idOrSlug`.
- `apps/api-gateway/src/proxy/gateway-proxy.service.ts` chuyển `/api/problems`, `/api/courses`,
  `/api/assignments`, `/api/classes` tới Learning; `gateway-auth.middleware.ts` bắt xác thực cho mọi
  `/api/*` trừ ba route auth công khai.
- `libs/common/src/bootstrap.ts` bật `ValidationPipe` toàn cục (`whitelist`,
  `forbidNonWhitelisted`, `transform`) và Swagger; `request-id.middleware.ts` cấp correlation ID.

### Phân loại thay đổi

| Phân loại | Nội dung                                                                                                                                                                                                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REUSE     | Bảng `problems`, `topics`, `tags`, `problem_topics`, `problem_tags`, `progress`, `courses`, `chapters`, `chapter_problems` (chỉ đọc); cơ chế principal tin cậy (`@TrustedPrincipal()`/`TrustedPrincipalGuard`) của LRN-001; `ValidationPipe`, Swagger, correlation ID dùng chung |
| MODIFY    | `learning-service.module.ts` (nạp `RecommendationModule`); `apps/api-gateway/src/proxy/gateway-proxy.service.ts` (thêm tiền tố `/api/recommendations` vào nhóm Learning)                                                                                                         |
| CREATE    | Module `recommendation` (domain, application, infrastructure, presentation); migration `Lrn007RecommendationIndexes`; test unit/integration/API                                                                                                                                  |
| REMOVE    | Không có                                                                                                                                                                                                                                                                         |

Hành vi cần giữ tương thích: mọi route và bảng hiện có không đổi; migration chỉ thêm index.

## Thay đổi ở tầng domain

Thư mục `modules/recommendation/domain/`, không import NestJS hay TypeORM.

| Thành phần             | Loại           | Trách nhiệm                                                                                                                            | Truy vết                               |
| ---------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `DifficultyLadder`     | Value object   | Thứ tự bậc `EASY` < `MEDIUM` < `HARD`; `maxStepUp = 1`; `allowsFor(basis, candidate)` đúng khi `0 ≤ bậc(candidate) − bậc(basis) ≤ 1`   | FR-005; AC-005, AC-006                 |
| `RecommendedProblem`   | Value object   | Tóm tắt công khai: `id`, `slug`, `title`, `problemType`, `difficulty`                                                                  | FR-010                                 |
| `RecommendationReason` | Value object   | Hợp `NEXT_IN_COURSE { course: id, slug, title }` hoặc `SIMILAR_TOPIC_TAG { topics[], tags[] }`; loại sau yêu cầu ít nhất một Topic/Tag | FR-009; AC-015                         |
| `Recommendation`       | Value object   | Cặp (`RecommendedProblem`, `RecommendationReason`)                                                                                     | FR-009, FR-010                         |
| `RecommendationPolicy` | Domain service | `compose(nextInCourse, similar)`: giữ thứ tự đầu vào, luật 1 trước, loại Problem trùng (giữ lần đầu), cắt còn `LIMIT = 10`             | FR-003, FR-007, FR-008; AC-007, AC-008 |

`RecommendationPolicy` không tự sắp xếp lại: thứ tự trong từng luật do adapter trả theo FR-004 và
FR-006, và policy giữ nguyên thứ tự đó (xác định theo FR-012).

## Tầng application / Use case

| Use case               | Quyền               | Luồng chính                                                                                                                                                                                                                                                                                                            | Truy vết                     |
| ---------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `GetMyRecommendations` | Chỉ cần đã xác thực | 1. Lấy principal từ decorator/guard tin cậy; thiếu `userId` hợp lệ thì `Unauthenticated`. 2. `reader.findNextInFollowedCourses(userId)`. 3. `policy` loại trùng luật 1; nếu còn chỗ, `reader.findSimilarCandidates(userId, { excludeProblemIds, limit: 10 − n, ladder })`. 4. `policy.compose(...)`. 5. Trả danh sách. | FR-001–FR-015; AC-001–AC-017 |

- Use case không ghi gì và không mở transaction ghi (FR-011, FR-015).
- Hai lần đọc chạy tuần tự, không chung snapshot. Chấp nhận được vì tính năng chỉ đọc và đặc tả đã
  chấp nhận nhất quán sau (tình huống biên về sự kiện chưa xử lý); với state không đổi, kết quả vẫn
  xác định (FR-012).
- Lỗi của reader được ném tiếp; use case không trả danh sách một phần (SR-005).

### Port

| Port                            | Trách nhiệm                                                                                                                                                                                                                                                                                   | Adapter                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `RecommendationCandidateReader` | `findNextInFollowedCourses(userId)`: một ứng viên mỗi Course đang theo, sắp theo FR-004. `findSimilarCandidates(userId, { excludeProblemIds, limit, ladder })`: ứng viên luật 2 đã lọc độ khó và sắp theo FR-006, kèm Topic/Tag chung. Cả hai chỉ trả Problem/Course hiển thị được, chưa giải | Adapter truy vấn đọc TypeORM trong `recommendation/infrastructure` |

Không thêm port nào khác. Không có port ghi, port cache hay port event. Principal tin cậy không
phải port: controller dùng `@TrustedPrincipal()`/`TrustedPrincipalGuard` của LRN-001 và truyền
`Principal` vào use case.

## Lưu trữ

- Không có bảng, cột hay entity mới; không lưu gợi ý hay lịch sử (FR-011).
- `TypeOrmRecommendationCandidateReader` dùng `DataSource` của Learning để chạy hai câu SQL chỉ
  đọc, có tham số. Nó không dùng entity hay repository của module khác.
- Quy tắc hiển thị được lặp lại tường minh trong SQL, đúng như LRN-001 và LRN-003 định nghĩa:
  - Problem: `publish_status = 'PUBLISHED' AND deleted_at IS NULL`;
  - Course: `status = 'PUBLISHED' AND deleted_at IS NULL`;
  - Đã giải: `progress.user_id = $userId AND progress.solved_at IS NOT NULL` (theo LRN-006).
- Bậc độ khó truyền vào SQL từ `DifficultyLadder` dưới dạng mảng tham số
  (`array_position($ladder::text[], p.difficulty::text)`), để luật bậc chỉ có một nguồn.

### Truy vấn luật 1 (`findNextInFollowedCourses`)

```sql
WITH solved AS (           -- bài nền: đã giải và hiển thị được
  SELECT pr.problem_id, pr.solved_at
  FROM progress pr JOIN problems p ON p.id = pr.problem_id
  WHERE pr.user_id = $1 AND pr.solved_at IS NOT NULL
    AND p.publish_status = 'PUBLISHED' AND p.deleted_at IS NULL),
visible AS (               -- Problem hiển thị được trong Course hiển thị được, kèm thứ tự Course
  SELECT cp.course_id, cp.problem_id, ch.display_order AS ch_order, ch.id AS ch_id,
         cp.display_order AS cp_order, cp.id AS cp_id
  FROM chapter_problems cp
  JOIN chapters ch ON ch.id = cp.chapter_id
  JOIN courses c ON c.id = cp.course_id AND c.status = 'PUBLISHED' AND c.deleted_at IS NULL
  JOIN problems p ON p.id = cp.problem_id
   AND p.publish_status = 'PUBLISHED' AND p.deleted_at IS NULL),
followed AS (              -- Course đang theo + lần giải gần nhất
  SELECT v.course_id, MAX(s.solved_at) AS last_solved_at
  FROM visible v JOIN solved s ON s.problem_id = v.problem_id GROUP BY v.course_id),
next_problem AS (          -- Problem chưa giải đầu tiên theo thứ tự Course
  SELECT DISTINCT ON (v.course_id) v.course_id, v.problem_id
  FROM visible v JOIN followed f ON f.course_id = v.course_id
  WHERE NOT EXISTS (SELECT 1 FROM solved s WHERE s.problem_id = v.problem_id)
  ORDER BY v.course_id, v.ch_order, v.ch_id, v.cp_order, v.cp_id)
SELECT ... -- tóm tắt Problem và Course
FROM next_problem n JOIN followed f USING (course_id) ...
ORDER BY f.last_solved_at DESC, n.course_id ASC;
```

- Không đặt `LIMIT` ở luật 1: số dòng bị chặn bởi số Course đang theo, và loại trùng phải xảy ra
  trước khi cắt, để một Course xếp sau vẫn góp được bài khác trước khi dùng tới luật 2 (FR-007).
- "Chưa giải" so với mọi dòng tiến độ đã giải của người gọi; vì ứng viên luôn hiển thị được nên
  dùng tập `solved` là đủ.

### Truy vấn luật 2 (`findSimilarCandidates`)

- CTE `basis` như `solved` ở trên, cộng bậc độ khó.
- `basis_refs`: hợp của `(kind = 'TOPIC', ref_id = topic_id, basis_rank)` từ `problem_topics` và
  `(kind = 'TAG', ref_id = tag_id, basis_rank)` từ `problem_tags` của các bài nền.
- `matches`: Problem `p` hiển thị được, chưa giải, không nằm trong `$excludeProblemIds`, có
  `(kind, ref_id)` trùng `basis_refs` và `bậc(p) − basis_rank IN (0, 1)`.
- Nhóm theo `p`, `score = COUNT(DISTINCT (kind, ref_id))`, gom danh sách Topic/Tag chung (định
  danh, tên) chỉ từ các cặp thoả điều kiện độ khó (AC-015).
- `ORDER BY score DESC, bậc(p) ASC, p.slug ASC LIMIT $limit`.

Không truy vấn N+1: mỗi yêu cầu tối đa hai câu SQL.

## Thay đổi cơ sở dữ liệu

Chỉ thêm index để truy vấn ngược từ Topic/Tag sang Problem không quét cả bảng nối:

- `CREATE INDEX "IDX_problem_topics_topic_id" ON "problem_topics" ("topic_id")`
- `CREATE INDEX "IDX_problem_tags_tag_id" ON "problem_tags" ("tag_id")`

Truy vấn theo người dùng dùng lại `UNIQUE (user_id, problem_id)` của `progress`; truy vấn Course dùng
index `(chapter_id, display_order)` và `(problem_id)` trên `chapter_problems` do LRN-003 tạo. Không
đổi dữ liệu, không đổi cột.

## Migration

- File: `apps/learning-service/src/database/migrations/<timestamp>-Lrn007RecommendationIndexes.ts`,
  timestamp sau migration của LRN-001, LRN-003 và LRN-006. `synchronize` vẫn tắt.
- Up: tạo hai index trên. Nếu migration LRN-001 đã tạo index tương đương (xác nhận ở LRN-007-T001),
  bỏ migration này và ghi N/A trong `tasks.md`.
- Down: `DROP INDEX "IDX_problem_tags_tag_id"`, `DROP INDEX "IDX_problem_topics_topic_id"`.
- Hoàn tác an toàn: chỉ index, không mất dữ liệu; truy vấn vẫn đúng khi không có index, chỉ chậm hơn.

## API

| Method + route             | Use case               | Phản hồi                                                     |
| -------------------------- | ---------------------- | ------------------------------------------------------------ |
| `GET /api/recommendations` | `GetMyRecommendations` | `200` `{ items: RecommendationResponseDto[] }`, 0–10 phần tử |

- Route cần Bearer token; Gateway trả `401` khi thiếu/sai token.
- Không dùng `/api/problems/recommendations` vì LRN-001 dùng `/api/problems/:idOrSlug`, và một
  Problem có slug `recommendations` sẽ va chạm. Tiền tố mới được thêm vào nhóm Learning ở Gateway.
- Không nhận path param, query hay body. Không phân trang (tối đa 10).
- Swagger mô tả route, DTO phản hồi, yêu cầu Bearer, mã `401`/`400`.
- Tương thích: route mới, không đổi route cũ.

## DTO / Kiểm tra dữ liệu

- `GetRecommendationsQueryDto`: lớp rỗng gắn vào `@Query()`; `ValidationPipe` toàn cục
  (`whitelist`, `forbidNonWhitelisted`) từ chối mọi tham số, kể cả `userId`, `limit` (AC-012,
  SR-001).
- `RecommendationResponseDto`: `problem` (`id`, `slug`, `title`, `problemType`, `difficulty`) và
  `reason`:
  - `{ type: 'NEXT_IN_COURSE', course: { id, slug, title } }`;
  - `{ type: 'SIMILAR_TOPIC_TAG', topics: [{ id, name }], tags: [{ id, name }] }`.
- Mapper tường minh từ value object domain sang DTO; không trả entity hay dòng SQL thô (SR-003,
  SR-004, AC-016).

## Phân quyền

- Principal từ `@TrustedPrincipal()`/`TrustedPrincipalGuard` của LRN-001 tại presentation (header
  `x-auth-user-id` do Gateway đặt lại).
- Không kiểm mã quyền; không thêm quyền. **Không có task seed quyền ở Identity** vì LRN-007 không
  có quyền mới (quyết định 3 của đặc tả).
- `userId` truyền cho reader luôn là `principal.userId`; không có đường nào khác cấp giá trị này
  (SR-001, AC-013).
- Thiếu hoặc sai định dạng `x-auth-user-id` ở Learning thì `401`, trước khi đọc dữ liệu (SR-005).
- Kiểm thử khẳng định: người dùng đã xác thực với mọi vai trò nhận gợi ý của chính mình. Kiểm thử
  phủ định: chưa xác thực, header định danh thiếu, tham số `userId`.

## Messaging / Sự kiện

N/A. LRN-007 không phát và không tiêu thụ event. Nó đọc tiến độ mà LRN-006 ghi từ
`submission.accepted`; contract đó không đổi.

## Realtime

N/A. Đặc tả loại trừ đẩy gợi ý realtime.

## Adapter hạ tầng

- `TypeOrmRecommendationCandidateReader` (driven): hiện thực `RecommendationCandidateReader` bằng
  `DataSource.query` với tham số, ánh xạ dòng sang value object domain.
- `RecommendationsController` (driving): gọi `GetMyRecommendations`, ánh xạ sang DTO.
- `RecommendationModule`: composition root, gắn port với adapter, dùng
  `@TrustedPrincipal()`/`TrustedPrincipalGuard` của LRN-001. Không export gì ra module khác.

## Cấu hình

- `apps/api-gateway/src/proxy/gateway-proxy.service.ts`: thêm `'/api/recommendations'` vào mảng
  `prefixes` của nhóm `LEARNING_SERVICE_URL`. Đây là thay đổi mã, không phải biến môi trường.
- Không thêm biến môi trường; không đổi `.env.example`, Docker, RabbitMQ hay Redis.

## Xử lý lỗi

| Điều kiện                             | Ánh xạ                                                          |
| ------------------------------------- | --------------------------------------------------------------- |
| Thiếu/sai token                       | `401` qua Gateway                                               |
| Thiếu/sai `x-auth-user-id` ở Learning | `401`                                                           |
| Có query/tham số không được phép      | `400` từ `ValidationPipe`                                       |
| Không có gợi ý                        | `200` với `items: []`                                           |
| Lỗi CSDL khi đọc                      | `500` theo xử lý mặc định hiện có; không trả danh sách một phần |

Không có `403` hay `404` vì không có tài nguyên theo định danh và không có mã quyền. Không đưa vào
cấu trúc lỗi mới.

## Bảo mật

| Yêu cầu | Cách thực thi                                                                                                                                 |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| SR-001  | `userId` chỉ từ decorator/guard tin cậy của LRN-001; DTO query rỗng chặn `userId`                                                             |
| SR-002  | Mọi SQL lọc `progress.user_id = $principal`; log không chứa danh sách Problem hay tiến độ                                                     |
| SR-003  | Điều kiện hiển thị được cho cả Problem và Course nằm trong mọi nhánh SQL, kể cả bài nền; lý do chỉ gồm Course/Topic/Tag từ dòng hiển thị được |
| SR-004  | SQL chỉ chọn cột tóm tắt; không join `test_cases`, `starter_codes`, `problem_harnesses`                                                       |
| SR-005  | Principal thiếu → `401` trước khi đọc; lỗi reader → lỗi, không một phần                                                                       |
| SR-006  | Chỉ `DataSource` của Learning; không gọi REST hay CSDL của service khác                                                                       |

SQL chỉ dùng tham số ràng buộc, không nối chuỗi từ đầu vào.

## Chiến lược kiểm thử

- **Unit (domain, không cần PostgreSQL):** `DifficultyLadder.allowsFor` cho đủ 9 cặp (AC-005,
  AC-006); `RecommendationReason` từ chối `SIMILAR_TOPIC_TAG` rỗng; `RecommendationPolicy.compose`:
  luật 1 trước, loại trùng giữ lần đầu (AC-007), cắt 10 (AC-008), đầu vào rỗng (AC-011), giữ thứ tự
  (FR-012).
- **Unit (application, port giả):** principal thiếu → `Unauthenticated` và reader không được gọi
  (AC-001, SR-005); luật 1 đủ 10 thì không gọi luật 2; `excludeProblemIds` và `limit` truyền đúng;
  `userId` truyền cho reader là của principal (AC-013); lỗi reader được ném tiếp.
- **Integration (PostgreSQL, adapter):** dữ liệu mẫu có Course `PUBLISHED`/`DRAFT`/`ON_HOLD`/đã xoá,
  Problem `PUBLISHED`/`DRAFT`/`ON_HOLD`/đã xoá, nhiều Chapter: bài kế tiếp đúng thứ tự Chapter rồi
  Problem (AC-002), bỏ qua bài tạm giữ (AC-003), thứ tự giữa Course (AC-004), bài nền bị ẩn (AC-010),
  không có dòng ẩn nào ở bất kỳ nhánh (AC-009), điểm và thứ tự luật 2 cùng danh sách Topic/Tag chung
  (AC-015), Course hết bài (AC-017), hai người dùng khác nhau (AC-013); không có câu `INSERT`/`UPDATE`
  nào (AC-014). Migration up/down.
- **API/E2E qua Gateway:** `401` khi thiếu token (AC-001); `400` với `?userId=` (AC-012); hai lần gọi
  cho cùng kết quả (AC-014); soi phản hồi không có trường cấm (AC-016); danh sách rỗng cho người mới
  (AC-011).
- Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

## Khả năng quan sát

- Giữ correlation ID hiện có.
- Mỗi yêu cầu log một dòng mức info: request ID, số gợi ý luật 1, số gợi ý luật 2, thời gian tính
  (ms). Không log `userId` kèm danh sách Problem, không log header xác thực.
- Không thêm hạ tầng metric mới.

## Truy vết yêu cầu

| Yêu cầu        | Đường triển khai                                                 | Kiểm chứng                               |
| -------------- | ---------------------------------------------------------------- | ---------------------------------------- |
| FR-001         | `GetMyRecommendations` + decorator/guard tin cậy; DTO query rỗng | API; AC-001, AC-012, AC-013              |
| FR-002         | Điều kiện hiển thị được + chưa giải trong cả hai SQL             | Integration; AC-009, AC-010              |
| FR-003, FR-004 | SQL luật 1 (`DISTINCT ON`, `ORDER BY last_solved_at`)            | Integration; AC-002–AC-004, AC-017       |
| FR-005, FR-006 | `DifficultyLadder` + SQL luật 2                                  | Unit/Integration; AC-005, AC-006, AC-015 |
| FR-007, FR-008 | `RecommendationPolicy.compose`                                   | Unit; AC-007, AC-008                     |
| FR-009, FR-010 | `RecommendationReason`, `RecommendedProblem`, mapper DTO         | API; AC-015, AC-016                      |
| FR-011, FR-015 | Không có bảng/port ghi                                           | Integration; AC-014                      |
| FR-012         | Thứ tự toàn phần trong SQL (có tie-break) + policy giữ thứ tự    | Unit/API; AC-014                         |
| FR-013         | `items: []`                                                      | API; AC-011                              |
| FR-014         | SQL chỉ đọc tiến độ của principal; không mô hình                 | Rà soát; AC-013                          |
| SR-001–SR-006  | Mục Bảo mật                                                      | Test bảo mật; AC-012, AC-016             |

## Thứ tự triển khai

1. Xác nhận LRN-001 (`@TrustedPrincipal()`/`TrustedPrincipalGuard`, `deleted_at`, `ON_HOLD`), LRN-003
   (`courses.status`, `courses.deleted_at`, `chapter_problems`) và LRN-006 (định nghĩa đã giải) đã
   triển khai.
2. Domain: `DifficultyLadder`, value object, `RecommendationPolicy`; unit test.
3. Port `RecommendationCandidateReader` và use case `GetMyRecommendations`; unit test.
4. Migration index; kiểm chứng up/down.
5. Adapter SQL; integration test trên PostgreSQL.
6. DTO, controller, module, nạp vào `learning-service.module.ts`; Swagger.
7. Thêm tiền tố ở Gateway; test API/E2E và bảo mật.
8. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; đối chiếu đặc tả.

## Phụ thuộc

- **LRN-001 đã triển khai:** cơ chế `@TrustedPrincipal()`/`TrustedPrincipalGuard`, cột `deleted_at`,
  trạng thái `ON_HOLD`, liên kết Topic/Tag.
- **LRN-003 đã triển khai:** trạng thái và dấu xoá của Course, bảng `chapter_problems` với thứ tự.
  Nếu tên bảng/cột trong bản triển khai LRN-003 khác kế hoạch LRN-003 hiện tại, cập nhật SQL theo bản
  thật, không đổi luật.
- **LRN-006 đã triển khai:** "đã giải" = dòng `progress` có `solved_at` khác null. Nếu LRN-006 đổi
  cách biểu diễn, cập nhật điều kiện SQL theo LRN-006, không đổi luật.
- **API Gateway:** thêm một tiền tố định tuyến.

## Rủi ro

- **Lặp quy tắc hiển thị:** SQL của Recommendation lặp điều kiện hiển thị của LRN-001/LRN-003. Nếu
  hai tính năng đó đổi quy tắc mà quên LRN-007, nội dung ẩn có thể lộ. Giảm thiểu: integration test
  AC-009/AC-010 phủ mọi trạng thái; ghi chú trong tài liệu của hai module kia rằng LRN-007 phụ thuộc
  các cột này.
- **Đọc chéo bảng của module khác trong cùng service:** hợp lệ theo ranh giới CSDL (cùng
  `bkpractice_learning`), nhưng khiến `recommendation` phụ thuộc schema của `problems`, `courses`,
  `progress`. Được chọn vì xếp hạng cần phép tập hợp trên ba nguồn; ghép qua ba reader trong bộ nhớ
  sẽ tải nhiều dữ liệu và dễ N+1. Adapter là điểm duy nhất chứa sự phụ thuộc này.
- **Hiệu năng:** luật 2 join qua bảng nối Topic/Tag; giảm thiểu bằng hai index mới và `LIMIT`.
  Người học đã giải rất nhiều bài làm `basis_refs` lớn; chấp nhận ở v1, đo lại khi có dữ liệu thật.
- **Nhất quán sau:** bài vừa giải có thể còn được gợi ý cho tới khi `submission.accepted` được xử lý;
  đặc tả đã chấp nhận.

## Vấn đề cần chủ sở hữu xem lại

Không có vấn đề chặn. Một ghi chú không chặn để xem lại sau v1: theo quyết định 4 của đặc tả, sinh
viên vừa tham gia Class nhưng chưa giải bài nào của Course sẽ không nhận gợi ý luật 1. Nếu muốn tính
Course của Class đã tham gia là "đang theo", cần sửa đặc tả (phụ thuộc thêm LRN-004).

## Quyết định đã phê duyệt

Phương án đề xuất, được chủ sở hữu sản phẩm phê duyệt gộp ngày 2026-09-30:

1. **Module:** Module mới `recommendation` trong Learning, đủ bốn tầng; không microservice.
2. **Route:** `GET /api/recommendations`, thêm tiền tố ở Gateway; không đặt dưới `/api/problems`.
3. **Đọc dữ liệu:** Một port đọc `RecommendationCandidateReader` hiện thực bằng SQL chỉ đọc trên các
   bảng Learning; không import code nội bộ của module khác.
4. **Luật bậc độ khó:** Một nguồn duy nhất trong domain, truyền vào SQL bằng tham số.
5. **Index:** Thêm index `problem_topics(topic_id)` và `problem_tags(tag_id)`; bỏ nếu LRN-001 đã có.
6. **Không snapshot chung** cho hai lần đọc; chấp nhận nhất quán sau.
7. **Không quyền mới, không seed Identity.**

## Tuân thủ kiến trúc

- Chiều phụ thuộc: `presentation` → `application` → `domain`; `infrastructure` hiện thực port của
  application. Domain không import NestJS/TypeORM.
- Controller chỉ lo transport và gọi đúng một use case.
- Quyền sở hữu CSDL: chỉ `bkpractice_learning`; không truy vấn Identity, Submission, Community; không
  khoá ngoại mới.
- Không đặt entity, use case hay luật gợi ý nào trong `libs/`.
- Recommendation ở trong bounded context Learning như `learning-service.md` quy định.

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved.
