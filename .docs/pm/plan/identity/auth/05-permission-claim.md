# ID-001 / 5 — Claim quyền hiệu lực trong access token

- Nguồn: [ID-001 1.1](../../../../specs/01-identity/authentication/spec.md#bản-sửa-đổi-11--claim-quyền), [plan Authentication](../../../../specs/01-identity/authentication/plan.md#bổ-sung-cho-bản-sửa-đổi-11), [tasks](../../../../specs/01-identity/authentication/tasks.md#bản-sửa-đổi-11--claim-quyền), [ID-003 0.4](../../../../specs/01-identity/rbac/spec.md#bản-sửa-đổi-04--truyền-quyền-hiệu-lực).
- Task: ID-001-T045–T047; phụ thuộc ID-003-T046 của [RBAC reader](../rbac/03-permission-catalog-and-claims.md).

## Trình tự thực hiện

1. T045: thêm `permissions: string[]` vào contract access và adapter JWT. Access token giữ `sub`, `roles`, `permissions`, `type`, `iat`, `exp`; refresh token giữ hình dạng riêng, không mang quyền.
2. Sau khi `EffectivePermissionReader` của RBAC có adapter/test, T046 nối nó vào **cả** đăng nhập MSSV, Microsoft exchange và refresh. Nạp quyền hiện tại trước mỗi lần phát hành access token; danh sách có thể rỗng, đã sắp xếp và không trùng.
3. T047: kiểm thử claim tối thiểu, quyền cập nhật ở token mới, token cũ giữ ảnh chụp ban đầu; `/auth/me` vẫn trả đúng dữ liệu ID-001, không thêm `permissions` vào phản hồi đó.

## Điểm tích hợp

ID-003-T045–T047 cung cấp chính sách/reader/migration danh mục quyền; ID-003-T048 làm sạch và truyền header qua Gateway. ID-003-T049 kiểm thử độ tươi end-to-end sau khi T046 nối xong. Không thêm endpoint tra quyền hay thu hồi access token tức thời.
