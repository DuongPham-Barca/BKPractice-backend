# ID-002 / 3 — API Profile, Gateway và xác minh

- Nguồn: [spec](../../../../../specs/01-identity/profile/spec.md), [plan](../../../../../specs/01-identity/profile/plan.md), [tasks](../../../../../specs/01-identity/profile/tasks.md).
- Task: ID-002-T025–T033, T036–T042; T034–T035 đã được đánh dấu N/A có lý do trong checklist gốc.
- Phụ thuộc: [phần 1](01-domain-and-storage.md), [phần 2](02-avatar-and-use-cases.md) và các ranh giới ID-001/ID-003 đã duyệt.

## Trình tự thực hiện

1. DTO request chỉ nhận `displayName`, tham chiếu avatar và `bio` theo ngữ nghĩa patch; DTO/mapper phản hồi riêng tư và công khai dùng allowlist tách biệt. Controller gọi use case, không truy cập TypeORM/R2. Nối `ProfileModule` tại Identity composition root và mô tả Swagger.
2. Chỉ mở công khai đúng `GET /api/users/:userId/profile` ở Gateway; `/api/profile/me`, thao tác upload intent và các route Admin vẫn yêu cầu Bearer. Xác nhận proxy `/api/profile` và `/api/users` giữ phản hồi/header đúng quy ước.
3. Ánh xạ 401/403/404/400/lỗi phụ thuộc theo plan; ngăn gán hàng loạt vào trường tài khoản/RBAC. Log chỉ ghi thông tin vận hành an toàn, không chứa token, thông tin R2, signed URL hay dữ liệu tài khoản nhạy cảm.
4. Chạy test use case, API/Gateway, persistence/migration/R2, riêng tư và đồng thời; rà soát tài liệu/Swagger. Khi triển khai xong, chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; đối chiếu mọi FR/SR/AC và kiến trúc rồi cập nhật `tasks.md`/worked entry.

## Ranh giới

Profile không thay đổi auth, vai trò/quyền, email/MSSV, tài khoản, dữ liệu Learning/Submission/Community hay nhà cung cấp avatar khác Cloudflare R2. Nếu chưa có tên chính thức từ ranh giới cấp tài khoản, báo rõ luồng khởi tạo chưa thể kiểm chứng end-to-end.
