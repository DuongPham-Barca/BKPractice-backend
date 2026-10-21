# ID-001 / 6 — Kiểm thử, xác minh và bàn giao

- Nguồn: [spec](../../../../specs/01-identity/authentication/spec.md), [plan](../../../../specs/01-identity/authentication/plan.md), [tasks](../../../../specs/01-identity/authentication/tasks.md).
- Task: ID-001-T033–T044 theo thứ tự phụ thuộc trong checklist; bắt đầu khi [các phần 1–5](../README.md) đã có hành vi tương ứng.

## Trình tự thực hiện

1. Thêm unit test domain/use case, test adapter Argon2/JWT/MSAL/Redis/TypeORM, test Gateway và API/E2E cho bảy thao tác. Bao phủ lỗi chung, tài khoản không hoạt động, liên kết nguyên tử, mã dùng một lần, refresh đồng thời và thu hồi đúng họ.
2. Smoke test Microsoft trên tenant staging theo plan, không lưu bí mật trong fixture; kiểm tra log/redirect/token claim và giới hạn tần suất. Test migration run/revert/run trên database Identity **cách ly**, kiểm tra dữ liệu trước/sau và không chạy revert trên dữ liệu đang dùng.
3. Chỉ sau khi test thay thế pass, gỡ controller/service/DTO đăng ký cũ theo T038; cập nhật Swagger và tài liệu auth theo T039. Rà soát không còn public register hay đường phát token cho tài khoản chưa cấp.
4. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; đối chiếu toàn bộ FR/SR/AC của bản spec **1.1**, kiến trúc, ranh giới Gateway/Identity và mục Ngoài phạm vi. Cập nhật `tasks.md` đúng trạng thái và viết worked entry theo working agreement.

## Điều kiện báo cáo

Ghi rõ trường hợp chưa kiểm chứng được do tenant staging, dữ liệu cấp tài khoản hoặc phụ thuộc RBAC; không đánh dấu task hoàn thành khi mới có code mà chưa có bằng chứng kiểm thử. Không chạy migration hay smoke test thật chỉ để xác minh tài liệu kế hoạch này.
