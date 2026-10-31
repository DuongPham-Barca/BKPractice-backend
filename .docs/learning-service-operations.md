# Learning Service — Ghi chú triển khai LRN-001 / LRN-002

Tài liệu này ghi lại các điểm cần biết khi triển khai Problem Management (LRN-001) và Test Case
Management (LRN-002). Nội dung chỉ mô tả những gì đã hiện thực; các tính năng ngoài phạm vi (ví dụ
versioning nội dung problem) không được mô tả như thể đã có.

## 1. Swagger

- `ManagedProblemsController`, `PublicProblemsController`, `ManagedTestCasesController` và
  `ProblemsController` đã có decorator Swagger cho route, DTO và mã lỗi.
- Route nội bộ `GET /internal/problems/:id/judge-package/:language` được đánh dấu
  `@ApiExcludeEndpoint()` và không xuất hiện trong Swagger công khai.
- Swagger chỉ phản ánh hình dạng request/response. Việc thực thi quyền, sở hữu, vòng đời và chính
  sách trường nằm ở use case/domain, không phải ở DTO.
- Khi đổi route hoặc DTO, cập nhật decorator Swagger trong cùng thay đổi.

## 2. Cơ chế truyền quyền `problem:*`

- Learning đọc ngữ cảnh tin cậy từ các header đơn trị do Gateway/service gửi:
  `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`.
- `ProblemAuthorizationService` yêu cầu role `LECTURER` và đúng mã quyền cần thiết:
  `problem:create`, `problem:read-managed`, `problem:update`, `problem:publish`, `problem:hold`,
  `problem:republish`, `problem:delete`, `problem:restore`.
- Quyền sở hữu luôn suy ra từ `x-auth-user-id`; body/query không thể đặt `createdBy`, trạng thái
  xuất bản, mốc thời gian hay quyền.
- Header trùng lặp, sai định dạng hoặc thiếu `x-auth-user-id` trả `401`; thiếu role/quyền trả `403`.
  Không có fallback theo vai trò và không có chế độ "cho qua" khi thiếu quyền (fail-closed).
- **Tình trạng seam:** Gateway hiện chỉ gắn `x-auth-user-id` và `x-auth-roles`, chưa gắn
  `x-auth-permissions` (LRN-001-T002 và LRN-001-T039 đang mở). Vì vậy, khi đi qua Gateway, các thao
  tác quản lý problem sẽ nhận `403` cho tới khi seam quyền được hoàn tất. Không thêm phương án tạm
  ánh xạ vai trò sang quyền.
- **Rủi ro bảo mật còn lại:** `GatewayAuthMiddleware` xoá `x-auth-user-id` và `x-auth-roles` do
  client gửi nhưng chưa xoá `x-auth-permissions`. Nếu Gateway tiếp tục chuyển tiếp header này,
  client có thể tự gắn quyền. Phải xử lý trong LRN-001-T002/T039 trước khi mở route qua Gateway;
  không coi cấu hình hiện tại là an toàn cho production.
- Route nội bộ dùng `x-internal-service-secret` (`INTERNAL_SERVICE_SECRET`), không dùng
  `problem:*`, và không cấp quyền quản lý problem.

## 3. Migration

Xem [Migration Guide](./migration_guide.md) để biết lệnh và quy ước. Các điểm riêng cho LRN-001 và
LRN-002:

- `1700000004000-Lrn001ProblemManagement.ts`
  - `up` dừng nếu dữ liệu cũ vi phạm: `problem_type` ngoài `STANDARD|FUNCTION|OOP`, giới hạn thực thi
    ngoài khoảng cho phép, hoặc `starter_codes` trùng `(problem_id, language)`.
  - `up` đổi enum `publish_status` và ánh xạ `ARCHIVED -> ON_HOLD`; sau đó `ARCHIVED` không còn hợp lệ.
  - `down` ánh xạ `ON_HOLD -> ARCHIVED` và **xoá `deleted_at` cùng `type_config`** — mất dấu xoá mềm
    và cấu hình theo loại problem. Sao lưu trước khi revert.
- `1700000007000-Lrn002TestCaseManagement.ts`
  - `up` tạo `problem_harnesses`, chép từ `starter_codes.hidden_harness`, rồi xoá cột nguồn.
  - `down` chỉ chép ngược các hàng có starter code khớp `(problem_id, language)`; harness không khớp
    sẽ mất khi bảng bị xoá.
  - Chạy sau LRN-001.
- Chưa có kiểm thử migration tự động với PostgreSQL trong CI. Chạy thử trên cơ sở dữ liệu cách ly
  trước khi áp dụng production.

## 4. Rủi ro chỉnh sửa tại chỗ nội dung đã xuất bản

- Sau khi `PUBLISHED`, các trường được chỉnh sửa tại chỗ: metadata hiển thị, các phần đề bài, độ khó,
  ví dụ, ràng buộc, ngôn ngữ đang bật, starter code và giới hạn thực thi.
- `problemType` và `slug` bất biến sau khi xuất bản. Problem `ON_HOLD` hoặc đã xoá mềm không chỉnh sửa
  được. Cập nhật problem `PUBLISHED` phải giữ mức sẵn sàng xuất bản.
- Không có versioning nội dung trong v1. Submission và Judge tham chiếu Problem bằng ID ổn định; gói
  judge tạo sau một lần chỉnh sửa có thể khác gói đã dùng cho submission trước đó. Learning không sửa
  lịch sử Submission, nhưng không bảo đảm tái lập lịch sử theo nội dung cũ.
- Giảm thiểu: chuyển `ON_HOLD` trước khi sửa nội dung lớn; phối hợp với chủ sở hữu Submission/Judge.
  Nếu cần tái lập chính xác, phải mở spec versioning mới (ngoài phạm vi LRN-001).
- Xoá mềm không phá huỷ bản ghi; khôi phục giữ nguyên trạng thái xuất bản trước khi xoá.

## 5. Giới hạn đã biết

- Seam quyền `problem:*` phía Gateway chưa hoàn tất (LRN-001-T002, LRN-001-T039).
- Kiểm thử API hiện dùng adapter in-memory ở ranh giới HTTP, chưa có E2E với PostgreSQL thật.
- Các spec Judge đang ở trạng thái `Proposed` và chưa được hiện thực.
