# ID-006 — API quản trị User

Contract triển khai theo [spec ID-006 Approved 1.0](../../../../specs/01-identity/user-management/spec.md). Identity sở hữu dữ liệu User; Gateway xác thực/chuyển tiếp. Tài liệu ID-004 import đã được [tái dựng để đối chiếu](../../../../specs/01-identity/student-provisioning/spec.md); route import giữ nguyên.

## Route và quyền

| Route | Quyền | Kết quả |
| --- | --- | --- |
| `GET /api/admin/users?page=1&limit=20&includeDeleted=false` | `ADMIN` + `user:read` | `{ items, page, limit, hasMore }`; mặc định ẩn User đã xoá. |
| `GET /api/admin/users/:userId` | `ADMIN` + `user:read` | Một User, kể cả đã xoá. |
| `DELETE /api/admin/users/:userId` | `ADMIN` + `user:delete` | `204`, kể cả xoá lặp; từ chối Admin và tài khoản hệ thống. |

Web gửi access cookie; DELETE bằng cookie cần Origin và CSRF. App gửi Bearer token. `page` là số nguyên ≥ 1, `limit` từ 1 đến 50; `includeDeleted` chỉ nhận `true`/`false`. Danh sách sắp theo `createdAt` mới nhất rồi `userId` giảm dần.

Projection của mỗi User gồm đúng `userId`, `studentId`, `email`, `displayName`, `status`, `roles`, `createdAt`, `deletedAt`. Không có credential, token, định danh Microsoft, Profile hoặc dữ liệu học tập. UUID/query sai trả `400`, thiếu/sai phiên `401`, thiếu role/quyền hoặc xoá Admin/system `403`, User không tồn tại `404`.

## Hiệu lực xoá mềm

Xoá chỉ gắn `deletedAt` và thu hồi tất cả phiên trong cùng transaction; User/Profile/role và tham chiếu lịch sử được giữ. Local login, Microsoft exchange và refresh không phát token mới cho User đã xoá. Search Profile và route hồ sơ công khai không hiển thị User đó. Email/MSSV vẫn giữ ràng buộc duy nhất, nên import lại cùng định danh báo trùng.

Trước khi dùng API trên database đang chạy, áp dụng migration Identity thêm `users.deleted_at`, sau đó chạy seed RBAC để cấp `user:read` và `user:delete` cho ADMIN. Token cũ chỉ nhận quyền mới sau login hoặc refresh. Không tự chạy migration/seed trong request.
