# Identity — kế hoạch triển khai theo phần việc

Các tài liệu dưới đây **phân rã công việc**, không thay thế `spec.md`, `plan.md` và `tasks.md` đã Approved trong `specs/01-identity/`. Trước mỗi phần việc, đọc lại ba tài liệu gốc và [working agreement](../../../agent/working-agreement.md). Chỉ đánh dấu task gốc hoàn thành sau khi đã triển khai và kiểm chứng; việc viết các kế hoạch này chưa hoàn thành task nào.

| Module trong code | Đặc tả                                                                        | Các phần việc theo thứ tự                                                                                                                                                                                                                                                                                                            |
| ----------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `auth`            | [ID-001 Authentication](../../../../specs/01-identity/authentication/spec.md) | [1. Nền tảng và lưu trữ](auth/01-foundation-and-storage.md) → [2. Đăng nhập và phiên](auth/02-student-login-and-sessions.md) → [3. Microsoft](auth/03-microsoft-login.md) → [4. HTTP và Gateway](auth/04-http-and-gateway.md) → [5. Claim quyền](auth/05-permission-claim.md) → [6. Kiểm chứng](auth/06-verification-and-handoff.md) |
| `profiles`        | [ID-002 Profile](../../../../specs/01-identity/profile/spec.md)               | [1. Domain và lưu trữ](profiles/01-domain-and-storage.md) → [2. Avatar và use case](profiles/02-avatar-and-use-cases.md) → [3. API và kiểm chứng](profiles/03-api-and-verification.md)                                                                                                                                               |
| `rbac`            | [ID-003 RBAC](../../../../specs/01-identity/rbac/spec.md)                     | [1. Chính sách và repository](rbac/01-domain-and-repository.md) → [2. API quản lý vai trò](rbac/02-role-management-api.md) → [3. Danh mục quyền và claim](rbac/03-permission-catalog-and-claims.md) → [4. Kiểm chứng](rbac/04-verification-and-handoff.md)                                                                           |

## Điểm nối giữa các module

1. Profile và RBAC tái dùng principal/ngữ cảnh tài khoản đã kiểm chứng của ID-001; không tự tạo hệ thống xác thực thứ hai. Phần tên chính thức để khởi tạo Profile phụ thuộc vào ranh giới cấp tài khoản riêng được nêu trong ID-002.
2. ID-003-T045–T047 tạo chính sách, reader và migration quyền. ID-001-T045 thêm hình dạng claim; ID-001-T046 chỉ nối reader khi ID-003-T046 đã sẵn sàng. ID-003-T048 xử lý header ở Gateway; sau đó ID-001-T047 và ID-003-T049–T050 kiểm chứng token và độ tươi. Không coi một phần riêng lẻ là hoàn tất tính năng quyền hiệu lực.
3. Migration, datasource, entity và dữ liệu nghiệp vụ ở Identity; Gateway chỉ xử lý biên HTTP/JWT/header. Mỗi phần triển khai giữ chiều phụ thuộc `presentation → application → domain`, còn infrastructure hiện thực port. Không tạo tầng rỗng hoặc chuyển entity của Identity vào `libs/`.

## Cách dùng

- Mỗi file chỉ là kế hoạch cho một lát cắt, với task ID, phụ thuộc và điều kiện kiểm chứng. Thứ tự chi tiết và tiêu chí hoàn thành vẫn theo `tasks.md` của feature.
- Khi bắt đầu thực hiện, kiểm tra lại trạng thái spec, plan, code, cấu hình và các câu hỏi mở theo working agreement. Nếu một điều kiện tiên quyết thực tế chưa có, ghi nhận và xử lý theo tài liệu gốc, không tự đổi contract.
- Sau khi triển khai từng phần, chạy kiểm thử liên quan. Trước khi kết luận feature hoàn thành, thực hiện toàn bộ bước xác minh bắt buộc của [Definition of Done](../../../../specs/00-system/definition-of-done.md) và viết worked entry theo module.
