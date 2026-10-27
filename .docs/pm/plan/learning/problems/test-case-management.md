# LRN-002 — Quản lý Test Case: ghi chú triển khai

Tài liệu này ghi các điểm vận hành và rủi ro của LRN-002. Đặc tả đã phê duyệt vẫn là nguồn chân lý
về hành vi; tài liệu này không thay đổi `spec.md`, `plan.md` hay `tasks.md`.

## Migration

Lệnh hiện có trong repository:

```bash
pnpm migration:run:learning
pnpm migration:revert:learning
```

Up migration tạo `problem_harnesses`, chép harness từ `starter_codes.hidden_harness` sang bảng mới,
rồi bỏ cột cũ. Chỉ các giá trị không `NULL` và không rỗng được chép.

**Cảnh báo down migration:** down chỉ chép ngược harness về dòng `starter_codes` cùng
`(problem_id, language)`. Harness không có dòng starter code tương ứng sẽ **mất** khi revert. Trước
khi revert trên dữ liệu thật, phải sao lưu `problem_harnesses`.

Migration chưa được chạy trên PostgreSQL cách ly trong môi trường hiện tại vì không có
`TEST_DATABASE_URL` và không có phạm vi cho phép thao tác database. Vì vậy T021/T023 vẫn chưa được
đánh dấu hoàn thành.

## Route judge-package

Route nội bộ giữ nguyên `InternalServiceGuard` và `@ApiExcludeEndpoint`, nhưng hành vi đã đổi:

- Chỉ cấp gói cho Problem `PUBLISHED`, chưa xoá mềm và ngôn ngữ đang bật; các trường hợp còn lại trả
  `404`.
- Problem `FUNCTION`/`OOP` thiếu harness của ngôn ngữ được yêu cầu trả `409`.
- Gói chứa cả Test Case `SAMPLE` và `HIDDEN`, theo `(display_order, id)`.

Submission hiện bọc mọi lỗi của route này thành `503`. Việc phân biệt lỗi `404`/`409` thuộc SUB-002;
LRN-002 không sửa Submission.

## Chỉnh sửa tại chỗ khi Problem đã xuất bản

Test Case và harness được sửa tại chỗ khi Problem `PUBLISHED`, miễn là Problem vẫn giữ đủ điều kiện
sẵn sàng. Không có versioning và không chấm lại Submission đã có. Hệ quả vận hành:

- Submission đã chấm giữ nguyên kết quả.
- Lần lấy gói judge tiếp theo thấy ngay bộ Test Case/harness mới.
- Gỡ Test Case `HIDDEN` cuối cùng, đưa tổng điểm về 0, hoặc gỡ harness của ngôn ngữ đang bật sẽ bị
  từ chối và không ghi thay đổi.

## Giới hạn và quyền riêng tư

- Mỗi trường đầu vào, kết quả mong đợi và harness tối đa 1 MiB UTF-8.
- Mỗi Problem tối đa 100 Test Case và tổng dữ liệu Test Case + harness tối đa 8 MiB.
- Phản hồi công khai và preview chỉ trả Test Case `SAMPLE`; preview không trả `testSuiteSummary`, nên
  không lộ số lượng Test Case `HIDDEN`.
- Body JSON của Gateway và Learning được nâng lên 4 MiB để chứa payload hợp lệ gần trần 8 MiB sau khi
  qua các lớp transport.

## Quan sát và log

Plan đề xuất log kết quả thao tác kèm `problemId`, `testCaseId`, request ID và kích thước byte. Bản
triển khai hiện chưa thêm log mới; đổi lại không có nội dung Test Case/harness nào bị ghi log. Nếu bổ
sung sau, chỉ log metadata và kích thước, không log `input`, `expectedOutput` hay `source`.

## Kiểm chứng

Đã chạy ngày 2026-10-27:

- `pnpm lint` — pass.
- `pnpm typecheck` — pass.
- `pnpm test --runInBand` — 50 suite pass, 1 suite integration skip (18 test skip), 357 test pass.
- `pnpm build` — pass cho cả 6 service.

Chưa xác minh: migration trên PostgreSQL thật, chuyển tiếp request khoảng 2 MiB qua API Gateway trong
timeout 15 giây, và kiểm thử tích hợp đồng thời cần database cách ly.
