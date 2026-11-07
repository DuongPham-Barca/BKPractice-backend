# 2026-11-07 — Căn chỉnh pattern Course và Progress

- Author: Codex
- Scope: Learning Service, module Course và luồng ghi Progress; Swagger Course.

## Spec and plan

- Spec: [LRN-003 Course](../../specs/02-learning/courses/spec.md), [LRN-006 Progress](../../specs/02-learning/progress/spec.md), [LRN-008 tự học](../../specs/02-learning/self-study/spec.md).
- Plan: [Course](../../specs/02-learning/courses/plan.md), [Progress](../../specs/02-learning/progress/plan.md).
- Tasks: [Course](../../specs/02-learning/courses/tasks.md), [Progress](../../specs/02-learning/progress/tasks.md).
- Spec status at start: Approved. LRN-008 thay thế những phần Class, Assignment và quyền LECTURER cũ.

## Questions clarified

| Question                                 | Conclusion                                                                                                                    | Source                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Pattern nào là đích?                     | DDD + Hexagonal: controller/consumer gọi inbound use case port; aggregate repository port ở domain; TypeORM ở infrastructure. | `.docs/architecture/learning-service.md`, ADR 0002.                                            |
| Phạm vi mục Progress trong lần sửa này?  | Căn chỉnh luồng ghi sự kiện `submission.accepted`; phần API đọc cá nhân và Recommendation còn là feature riêng.               | Suy ra từ yêu cầu sửa các điểm 2, 3, 4 của review; các task đọc của LRN-006 và LRN-007 vẫn mở. |
| Luồng ghi Progress phải giữ quy tắc nào? | Biên nhận `eventId`, giao dịch nguyên tử, `bestScore` cao nhất và `solvedAt` sớm nhất.                                        | LRN-006-FR-003 tới FR-010.                                                                     |

## What was done

`CourseRepository` được chuyển từ `application/ports/out` sang `domain/repositories`. Controller Course nhận 18 inbound port có hợp đồng `execute` riêng, được nối bằng token `useExisting` tới các use case trong `CoursesModule`. Các use case giữ nguyên hành vi; lớp triển khai khai báo `implements` để TypeScript kiểm tra hợp đồng. Swagger Course không còn mô tả quyền chủ sở hữu hay chặn xoá vì Class/Assignment.

Progress giờ có `AcceptedSubmission` kiểm tra payload, aggregate `ProblemProgress` áp dụng điểm cao nhất và thời điểm sớm nhất, `ApplyAcceptedSubmissionUseCase`, `ProgressRepository` port và adapter TypeORM. Consumer trong `presentation/messaging` chỉ đăng ký queue và chuyển payload vào inbound port. Repository ghi biên nhận và tiến độ trong một transaction, dùng `ON CONFLICT` và khoá dòng để xử lý sự kiện trùng hoặc đồng thời. Bảng biên nhận đã tồn tại từ migration LRN-006; entity mới được đăng ký trong Learning.

## Why these choices

Inbound port tách controller khỏi lớp use case cụ thể theo đúng quy ước đã dùng ở Problem, không thêm facade chỉ để chuyển tiếp. Repository của Course làm việc với aggregate nên thuộc domain. Progress dùng port transaction chung của Learning và một adapter transaction TypeORM riêng cho module; domain không biết RabbitMQ hay TypeORM. Biên nhận `eventId` thay cho so `lastEventId` gần nhất vì sự kiện cũ có thể tới lại sau sự kiện mới.

## How the feature works

1. Request Course vào controller, được chuyển tới use case qua inbound port; use case dùng domain và repository port, TypeORM adapter lưu/đọc aggregate.
2. RabbitMQ đưa `submission.accepted` tới `ProgressConsumer`; consumer gọi `ApplyAcceptedSubmissionUseCase` với payload gốc.
3. Domain kiểm tra payload. Use case mở transaction, ghi biên nhận; `eventId` đã có trả `DUPLICATE` mà không sửa tiến độ.
4. Với sự kiện mới, repository chèn tiến độ nếu cặp người dùng–Problem chưa có; nếu đã có, khoá dòng, aggregate lấy điểm cao nhất và thời gian sớm nhất rồi lưu. Adapter ánh xạ hàng `ATTEMPTED` cũ thành chưa giải; use case chuyển thành `SOLVED` khi có sự kiện hợp lệ.
5. Payload sai hoặc lỗi ghi được ném lại để cơ chế retry/DLQ của RabbitMQ xử lý; transaction rollback cả biên nhận và tiến độ.

## Configuration

No configuration change.

## Verification

- `pnpm build:learning`: qua.
- Course API E2E dùng in-memory adapter: 34 test qua; module integration cần PostgreSQL nên bị skip.
- Progress unit: domain, use case, consumer đều qua.
- Progress integration: 3 test qua trên PostgreSQL 15 tạm, riêng trên `127.0.0.1`, với schema tạo bởi migration Learning; kiểm tra sự kiện đồng thời, sự kiện trùng, rollback rồi thử lại và hàng `ATTEMPTED` cũ. Container đã dừng và tự xoá sau test.
- Toàn bộ test Learning: 60 suite/524 test qua, 6 suite/51 test bị skip do thiếu `TEST_DATABASE_URL` ở lần chạy toàn bộ.
- `pnpm typecheck`, `pnpm lint` toàn repo vẫn lỗi trong `test/account-import.integration.spec.ts` của Identity: trường `officialName` không còn trong kiểu hiện hành. Không có lỗi mới của Learning.
- `git diff --check` và `codegraph sync .`: qua. ESLint/Prettier riêng các file TypeScript thay đổi được kiểm tra độc lập.

## Remaining

- Not done: API đọc tiến độ cá nhân và Recommendation chưa được triển khai; các task tương ứng của LRN-006/LRN-007 vẫn mở.
- Risks: Luồng Progress mới cần migration LRN-006 đã chạy để có bảng `progress_event_receipts`. Không áp dụng migration lên dữ liệu thật trong lần sửa này. Cổng Learning trực tiếp vẫn cần được giới hạn truy cập như đã nêu ở review trước; mục đó không thuộc yêu cầu sửa lần này.
