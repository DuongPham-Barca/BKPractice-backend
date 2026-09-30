# 2026-09-30 — Viết và phê duyệt spec, plan, tasks LRN-007 Gợi ý bài

- Author: DuongPham-Barca (thực hiện cùng Claude Code)
- Scope: Chỉ tài liệu. Tạo `specs/02-learning/recommendation/spec.md`, `plan.md`, `tasks.md`. Không
  đụng source, cấu hình, dependency hay migration; không sửa `specs/README.md` hay tài liệu của tính
  năng khác.

## Spec and plan

- Spec: `specs/02-learning/recommendation/spec.md` — LRN-007 phiên bản 1.0
- Plan: `specs/02-learning/recommendation/plan.md` — Approved 2026-09-30
- Tasks: `specs/02-learning/recommendation/tasks.md` — Approved 2026-09-30
- Spec status at start: chưa tồn tại (thư mục chỉ có `.gitkeep`); kết thúc là `Approved` 1.0

Lý do không cần feature spec khác: đây là bước viết spec, plan, tasks (bước 1–2 của SDD), do người
dùng yêu cầu.

## Questions clarified

Nguồn phê duyệt chung: người dùng (chủ sở hữu sản phẩm) nói ngày 2026-09-30: "bro generate cả luôn
đi, tôi approve đó, trừ submission và judge". Các quyết định dưới đây là phương án đề xuất được phê
duyệt gộp theo câu đó.

| Question                                                 | Conclusion                                                                                                               | Source                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Gợi ý kiểu gì?                                           | Theo luật cố định, không ML; luật 1 bài kế tiếp trong Course đang theo, luật 2 cùng Topic/Tag, độ khó bằng hoặc +1 bậc   | Quyết định nền LRN-007 trong brief điều phối; uỷ quyền |
| Bao nhiêu gợi ý, cho ai?                                 | Tối đa 10, chỉ cho chính người gọi; mọi người dùng đã xác thực                                                           | Brief; uỷ quyền                                        |
| Có quyền mới, có lưu lịch sử không?                      | Không quyền mới, không seed Identity; không lưu gợi ý hay lịch sử                                                        | Brief                                                  |
| Course đang theo là gì?                                  | Course hiển thị được có ≥ 1 Problem hiển thị được mà người học đã giải; tham gia Class không tính ở v1                   | Brief ("có tiến độ"); uỷ quyền                         |
| Bài kế tiếp, thứ tự giữa Course?                         | Problem hiển thị được chưa giải đầu tiên theo thứ tự Chapter rồi Problem; một bài mỗi Course; Course giải gần nhất trước | Uỷ quyền (phương án đề xuất)                           |
| Độ khó so với bài nào? Thứ tự luật 2?                    | So với chính bài nền có chung Topic/Tag; sắp theo số Topic/Tag chung, độ khó thấp trước, slug                            | Uỷ quyền (phương án đề xuất)                           |
| Bài đã giải nay bị ẩn? Người chưa có tiến độ?            | Không làm bài nền, không gợi ý; người mới nhận danh sách rỗng                                                            | Uỷ quyền; LRN-001-SR-003                               |
| Route nào?                                               | `GET /api/recommendations`, thêm tiền tố ở Gateway; tránh va chạm với `/api/problems/:idOrSlug` của LRN-001              | Khảo sát `gateway-proxy.service.ts`; plan LRN-001      |
| Đọc dữ liệu của `problems`/`courses`/`progress` thế nào? | Một port đọc, adapter SQL chỉ đọc trong cùng `bkpractice_learning`; không import code nội bộ module khác                 | `learning-service.md`; `database-strategy.md`          |
| Có microservice riêng không?                             | Không; module `recommendation` trong Learning                                                                            | `learning-service.md` ("must not be split")            |

## What was done

- Spec LRN-007 1.0: 15 FR, 6 SR, 17 AC, bảng thuật ngữ (hiển thị được, Course đang theo, bài nền,
  bậc độ khó), quy tắc nghiệp vụ dạng giả mã, tình huống biên, 13 quyết định đã chốt.
- Plan: module mới `recommendation` bốn tầng; domain `DifficultyLadder`, value object lý do và tóm
  tắt, domain service `RecommendationPolicy`; use case `GetMyRecommendations`; port
  `RecommendationCandidateReader` với hai câu SQL (luật 1, luật 2); migration chỉ thêm hai index;
  route `GET /api/recommendations`; một thay đổi ở Gateway; bảng truy vết; rủi ro.
- Tasks: 26 task `LRN-007-T001`–`T026` cộng 4 mục N/A (seed quyền Identity, messaging, realtime),
  mỗi task có Phụ thuộc và Truy vết; bảng độ phủ.

## Why these choices

- **Module riêng trong Learning:** `learning-service.md` liệt kê `recommendation/` trong bố cục và
  cấm tách Recommendation Service. Domain có luật thật (bậc độ khó, ưu tiên, loại trùng, giới hạn)
  nên đủ lý do có bốn tầng.
- **SQL chỉ đọc qua một port:** xếp hạng cần phép tập hợp trên ba nguồn dữ liệu cùng CSDL; ghép qua
  ba reader trong bộ nhớ sẽ tải nhiều và dễ N+1. Port giữ domain/application độc lập với SQL.
- **Luật bậc một nguồn:** `DifficultyLadder` truyền thứ tự bậc vào SQL để luật không nằm ở hai nơi.
- **Không `LIMIT` ở luật 1:** loại trùng phải xảy ra trước khi cắt, để luật 1 luôn đứng trước luật 2.
- **Route mới ở Gateway:** `/api/problems/recommendations` có thể va chạm slug do giảng viên đặt.
- **Index `topic_id`/`tag_id`:** schema hiện tại chỉ có khoá chính `(problem_id, …)`, không phục vụ
  truy vấn ngược từ Topic/Tag.

## How the feature works

Chưa triển khai. Luồng dự kiến:

1. Người dùng đã xác thực gọi `GET /api/recommendations` qua Gateway; Gateway xác minh token và đặt
   lại `x-auth-user-id`.
2. `RecommendationsController` của Learning nhận request; tham số lạ bị `ValidationPipe` chặn (`400`).
3. `GetMyRecommendations` lấy principal; thiếu định danh thì `401`.
4. Reader chạy SQL luật 1: Course đang theo và bài chưa giải đầu tiên của mỗi Course, Course giải gần
   nhất trước. Policy loại trùng; nếu chưa đủ 10, reader chạy SQL luật 2 loại trừ các bài đã có.
5. Policy gộp, cắt 10; controller trả `200 { items }`, mỗi phần tử có tóm tắt Problem và lý do.
6. Không ghi gì. Không có gợi ý thì `items: []`. Lỗi CSDL trả lỗi máy chủ, không danh sách một phần.

## Configuration

No configuration change. (Plan dự kiến thêm tiền tố `/api/recommendations` trong
`apps/api-gateway/src/proxy/gateway-proxy.service.ts` khi triển khai; đây là mã, không phải biến môi
trường.)

## Verification

- Commands run and their results: `npx --no-install prettier --write` trên bốn file markdown mới.
- Not verified: chưa review bởi người thứ hai; tên bảng/cột của LRN-003 (`chapter_problems`,
  `courses.status`) và LRN-006 lấy từ kế hoạch/brief, chưa có trong code.

## Remaining

- Not done: chưa commit; `specs/README.md` chưa có dòng LRN-007 (người điều phối sửa); chưa triển
  khai.
- Risks: SQL lặp quy tắc hiển thị của LRN-001/LRN-003; phụ thuộc schema của LRN-003/LRN-006 đang
  được viết song song; nhất quán sau khi `submission.accepted` chưa được xử lý; sinh viên mới tham
  gia Class chưa có luật 1 (ghi chú không chặn trong plan).
