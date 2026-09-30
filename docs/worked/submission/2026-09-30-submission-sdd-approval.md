# 2026-09-30 — Phê duyệt SUB-001 đến SUB-004

- Author: Codex; chủ sở hữu sản phẩm phê duyệt trong hội thoại.
- Scope: Chỉ tài liệu SRS, plan và tasks của Submission. Không sửa source, cấu hình, migration, Judge hay Learning.

## Spec and plan

- Spec: `specs/03-submission/{run-code,submit-code,submission-history,realtime-result}/spec.md`, phiên bản 1.0, Approved 2026-09-30.
- Plan: bốn `plan.md` cùng thư mục, Approved 2026-09-30.
- Tasks: bốn `tasks.md` cùng thư mục; task triển khai vẫn chưa làm.
- Spec status at start: cả bốn `Proposed` 0.1 ngày 2026-09-29.

## Questions clarified

| Question                                                         | Conclusion                                                                                                                                                                                          | Source                                                        |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Run thành công, giới hạn, quyền, `problemId`, retry/quota?       | `EXECUTED`; 3000 ms/256 MB cố định; mọi tài khoản xác thực; UUID tùy chọn không tra Learning; mỗi lần gửi là bản ghi mới, không quota.                                                              | Người dùng chọn các gói mặc định, 2026-09-30; SUB-001 v1.0.   |
| Run/Submit treo?                                                 | Watchdog 10 phút cho `PENDING`/`QUEUED`, chuyển có điều kiện sang `INTERNAL_ERROR`; kết quả muộn không ghi đè.                                                                                      | Người dùng chọn, 2026-09-30.                                  |
| Kiểm tra trạng thái/ngôn ngữ Submit và hiệu lực snapshot?        | Gói nội bộ theo `problemId + language` chỉ được Learning cấp cho Problem `PUBLISHED`, chưa xoá mềm và ngôn ngữ bật; job giữ snapshot đã cấp. Cùng `404` cho nhiều nguyên nhân nên không đoán lý do. | LRN-002-FR-015 và plan LRN-002; người dùng chọn giữ contract. |
| Điểm Judge thiếu, điểm ACCEPTED bằng 0, điểm Assignment?         | Điểm Judge thiếu là `null`; event ACCEPTED luôn có `score: 100`, kể cả Judge trả 0/null; không có điểm Assignment trong bản ghi Submission.                                                         | Người dùng chọn; LRN-006 contract.                            |
| Event tiến độ có thể mất hoặc giao trùng?                        | Outbox cùng transaction với verdict, relay at-least-once với `eventId` cố định; Learning áp dụng một lần theo `eventId`. Không hứa broker giao vật lý đúng một lần.                                 | Người dùng chọn; LRN-006-FR-004.                              |
| Lỗi lấy gói, lỗi phát job, trạng thái trung gian, request trùng? | Lỗi Learning trước tạo bản ghi; lỗi phát Judge job sau tạo kết thúc `INTERNAL_ERROR`; không dùng `RUNNING`; request trùng tạo bản ghi mới.                                                          | Người dùng chọn; SUB-002 v1.0.                                |
| Quyền Run/Submit/History?                                        | Mọi vai trò xác thực được thao tác với dữ liệu của chính mình; không thêm `submission:*`.                                                                                                           | Người dùng chọn, 2026-09-30.                                  |
| ID lịch sử, link cũ, phân trang và bộ lọc?                       | `publicId` UUID tách khóa DB, backfill; alias đọc URL ID cũ với owner check. Cursor `createdAt + publicId`; trang 20/tối đa 100, COUNT chính xác; chỉ lọc kind/problemId.                           | Người dùng chọn, 2026-09-30.                                  |
| Output, điểm chưa có, tiêu đề, retention/attempt?                | Chỉ chi tiết Run có stdout/stderr; Submit không có output thô. Điểm thiếu `null`; tiêu đề Problem có thể `null`, không gọi Learning; không tự xoá và không attempt number.                          | Người dùng chọn và SUB-003 v1.0.                              |
| Kênh realtime, payload, polling, đa instance?                    | Socket.IO qua Redis Pub/Sub, fan-out best-effort tới Gateway subscriber đang hoạt động. Payload chỉ public ID/kind/status/ready, không điểm/output; polling 5 giây khi còn chờ.                     | Kiến trúc giao tiếp, code Gateway, người dùng chọn.           |
| Vòng đời realtime, logout/khóa tài khoản?                        | Tối đa 5 socket mỗi user toàn cụm; đóng khi access token hết hạn. Logout/khóa không thu hồi access token còn hạn.                                                                                   | Người dùng chọn; ID-001-FR-019.                               |

## What was done

Rà soát, giải quyết câu hỏi mở và đổi bốn đặc tả Submission sang Approved 1.0. Đồng bộ plan/tasks với các contract đã chốt, bỏ các câu chặn triển khai không còn đúng và sửa liên kết Markdown. Task mã nguồn vẫn để chưa hoàn thành.

## Why these choices

Run và Submit dùng cùng lưu trữ nhưng khác ý nghĩa tiến độ; `EXECUTED` tránh hiểu Run là giải đúng. Outbox tránh mất sự kiện tại cửa sổ crash mà cơ chế đánh dấu trước khi phát không thể khép kín. Public ID riêng giữ khóa DB ngoài API; alias đọc giữ bookmark cũ. Output Submit có thể chứa dữ liệu Test Case ẩn nên không trả thô. Realtime chỉ báo đọc lại PostgreSQL, khớp Redis Pub/Sub best-effort và access token stateless đã Approved.

## How the feature works

Chưa triển khai tính năng. Theo contract tương lai: Gateway xác thực → Submission tạo Run hoặc lấy gói Judge rồi tạo Submit → Judge trả verdict → Submission ghi kết quả bền vững; với Submit ACCEPTED ghi outbox cùng transaction → relay phát event cho Learning → Gateway phát tín hiệu realtime tối thiểu → client đọc chi tiết/lịch sử và polling nếu mất tín hiệu. Lỗi lấy gói thất bại trước ghi; lỗi phát job hoặc timeout kết thúc `INTERNAL_ERROR`; event outbox thử lại cùng `eventId`.

## Configuration

No configuration change.

## Verification

- Commands run and their results: `codegraph status .` xác nhận index hiện hành; kiểm tra link Markdown nội bộ bằng Node đọc-only đạt; `pnpm exec prettier --check` cho 13 tài liệu đạt; `git diff --check` đạt.
- Not verified: hành vi runtime, migration, broker confirm, Redis lease và kiểm thử ứng dụng vì chưa triển khai.

## Remaining

- Not done: toàn bộ task triển khai, kiểm thử code và rollout trong bốn `tasks.md`.
- Risks: watchdog 10 phút có thể kết thúc job thật chạy lâu; public ID cần backfill an toàn; outbox có thể giao lại cùng event; frontend cần dùng payload realtime tối thiểu và polling.
