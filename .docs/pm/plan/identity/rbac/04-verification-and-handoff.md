# ID-003 / 4 — Kiểm chứng RBAC và bàn giao

- Nguồn: [spec](../../../../specs/01-identity/rbac/spec.md), [plan](../../../../specs/01-identity/rbac/plan.md), [tasks](../../../../specs/01-identity/rbac/tasks.md).
- Task: ID-003-T036–T044; đối chiếu T050 của [bản sửa đổi 0.4](03-permission-catalog-and-claims.md) sau khi tích hợp Auth/Gateway xong.

## Trình tự thực hiện

1. Tổng hợp test domain/use case, repository/transaction, API/Gateway, principal tin cậy, bảo vệ Admin, idempotence và role nhiều giá trị. Kiểm tra thông tin nhạy cảm không xuất hiện trong response/log.
2. Kiểm thử catalog permission, reader, migration và quyền trong token cùng [Auth claim](../auth/05-permission-claim.md). Token thiếu claim quyền từ chối theo mặc định; quyền trong token không miễn kiểm tra sở hữu của service tính năng.
3. Rà Swagger, điều kiện tiên quyết cho Admin ban đầu và tài liệu vận hành. Chạy `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` khi code đã triển khai; kiểm tra `synchronize: false`, không có SQL xuyên service hoặc entity nghiệp vụ trong `libs/`.
4. Đối chiếu từng FR/SR/AC của ID-003 **0.4**, đặc biệt các điều cấm leo thang đặc quyền và bản bổ sung claim. Cập nhật `tasks.md` đúng thực tế, ghi sai lệch/chưa kiểm chứng và viết worked entry theo module.

## Điều kiện hoàn thành

Không kết luận RBAC hoàn thành chỉ vì ba route quản lý role hoạt động: catalog tám quyền, claim Auth, header Gateway, test độ tươi và các ranh giới của service tiêu thụ đều cần bằng chứng theo task/spec tương ứng.
