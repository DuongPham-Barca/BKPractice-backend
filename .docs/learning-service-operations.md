# Learning Service — Ghi chú triển khai LRN-001 / LRN-002 / LRN-008

Tài liệu này ghi lại các điểm cần biết khi triển khai Problem Management (LRN-001) và Test Case
Management (LRN-002) và thay đổi phân quyền LRN-008. Nội dung chỉ mô tả những gì đã hiện thực; các tính năng ngoài phạm vi (ví dụ
versioning nội dung problem) không được mô tả như thể đã có.

## 1. Swagger

- `ManagedProblemsController`, `PublicProblemsController`, `ManagedTestCasesController` và
  `ProblemsController` đã có decorator Swagger cho route, DTO và mã lỗi.
- Route nội bộ `GET /internal/problems/:id/judge-package/:language` được đánh dấu
  `@ApiExcludeEndpoint()` và không xuất hiện trong Swagger công khai.
- Swagger chỉ phản ánh hình dạng request/response. Việc thực thi quyền, vòng đời và chính
  sách trường nằm ở use case/domain, không phải ở DTO.
- Khi đổi route hoặc DTO, cập nhật decorator Swagger trong cùng thay đổi.

## 2. Cơ chế truyền quyền `problem:*`

- Learning đọc ngữ cảnh tin cậy từ các header đơn trị do Gateway/service gửi:
  `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`.
- `ProblemAuthorizationService` yêu cầu role `ADMIN` và đúng mã quyền cần thiết:
  `problem:create`, `problem:read-managed`, `problem:update`, `problem:publish`, `problem:hold`,
  `problem:republish`, `problem:delete`, `problem:restore`.
- `createdBy` được suy ra từ `x-auth-user-id` khi tạo để truy vết; mọi `ADMIN` có quyền tương ứng
  được quản lý Problem do `ADMIN` khác tạo. Body/query không thể đặt `createdBy`, trạng thái xuất bản,
  mốc thời gian hay quyền.
- Header trùng lặp, sai định dạng hoặc thiếu `x-auth-user-id` trả `401`; thiếu role/quyền trả `403`.
  Không có fallback theo vai trò và không có chế độ "cho qua" khi thiếu quyền (fail-closed).
- Gateway xoá mọi header `x-auth-*` do client gửi và đặt lại `x-auth-user-id`, `x-auth-roles`,
  `x-auth-permissions` từ access token đã xác minh; không suy quyền từ vai trò. Token thiếu claim
  quyền tạo danh sách quyền rỗng, nên thao tác quản lý bị từ chối.
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

- Tiến độ cá nhân mới có consumer ghi nhận sự kiện; API đọc đầy đủ và module gợi ý vẫn chờ LRN-006/007.
- Kiểm thử API hiện dùng adapter in-memory ở ranh giới HTTP, chưa có E2E với PostgreSQL thật.
- Các spec Judge đang ở trạng thái `Proposed` và chưa được hiện thực.
