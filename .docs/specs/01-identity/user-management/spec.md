# ID-006 Xem và xoá mềm User cho Admin

## Trạng thái

Proposed — bản nháp 0.1 ngày 2026-10-28. Chưa được phê duyệt để triển khai.

## Mục tiêu

Cho phép Admin xem danh sách/chi tiết User và xoá mềm một User qua FE, giữ dữ liệu tham chiếu và ngăn User đã xoá tiếp tục xác thực. Route mới dùng tên tài nguyên `users` thay `accounts`.

## Tác nhân và bối cảnh

- ADMIN quản trị User bằng API được bảo vệ; STUDENT, LECTURER và khách không xem danh sách/chi tiết quản trị hoặc xoá User.
- Identity sở hữu User, credential, vai trò, Profile và phiên; service khác chỉ giữ `userId` như tham chiếu.
- ID-004 đã Approved riêng cho `POST /api/auth/accounts/import`; phần CRUD thủ công của ID-004 còn Proposed. Cần hoà giải hai bản nháp CRUD trước khi phê duyệt.
- ID-002 sở hữu hồ sơ công khai; `GET /api/users/:userId/profile` phục vụ xem người khác, không phải chi tiết tài khoản quản trị.

## Yêu cầu chức năng

- **ID-006-FR-001 — Danh sách User:** ADMIN MUST xem được danh sách User có phân trang/thứ tự ổn định, không trả toàn bảng trong một response.
- **ID-006-FR-002 — Chi tiết User:** ADMIN MUST xem một User theo `userId`. Projection cho phép gồm `userId`, `studentId`, `email`, `displayName`, `status`, `roles`, thời điểm tạo và trạng thái xoá mềm theo contract được duyệt.
- **ID-006-FR-003 — Giới hạn dữ liệu:** Danh sách/chi tiết MUST NOT trả password/hash, refresh token, secret, định danh Microsoft nội bộ hoặc dữ liệu Profile/học tập không cần thiết.
- **ID-006-FR-004 — Xoá mềm:** ADMIN MUST yêu cầu xoá mềm User bằng `userId`; giữ bản ghi và tham chiếu, lưu dấu xoá tách khỏi enum `ACTIVE`/`LOCKED`/`PENDING`.
- **ID-006-FR-005 — Hiệu lực xác thực:** User đã xoá mềm MUST không nhận token mới từ login cục bộ, Microsoft exchange hoặc refresh. Chính sách access token/phiên cũ phải chốt trước Approved.
- **ID-006-FR-006 — Hồ sơ công khai:** User đã xoá mềm MUST không xuất hiện trong tìm kiếm ID-005 hoặc hồ sơ công khai ID-002; phản hồi công khai không tiết lộ lý do xoá.
- **ID-006-FR-007 — Bảo toàn dữ liệu:** Xoá mềm MUST không cascade sang Learning/Submission/Community hoặc xoá hồ sơ, vai trò, bài nộp và dữ liệu lịch sử.
- **ID-006-FR-008 — Bảo vệ Admin:** Không được xoá Admin cuối cùng. Chính sách xoá chính mình, Admin khác/tài khoản hệ thống chờ chốt và phải kiểm tra tại backend.
- **ID-006-FR-009 — Tính lặp:** Xoá lặp cùng User MUST không tạo trạng thái xoá thứ hai hoặc khôi phục User.
- **ID-006-FR-010 — Quyền quản trị:** Danh sách/chi tiết/xoá MUST kiểm tra principal và quyền đã duyệt; `user:import` không tự cấp quyền đọc/xoá.

## Quy tắc nghiệp vụ và phân quyền

- Đề xuất ADMIN + `user:read` để đọc, ADMIN + `user:delete` để xoá; hai mã chưa có trong RBAC catalog, cần phê duyệt/seed qua ID-003.
- Người dùng thường xem hồ sơ qua ID-002/ID-005, không dùng projection quản trị.
- Không dùng `LOCKED` làm dấu xoá. User đã xoá giữ định danh để bảo toàn tham chiếu; chính sách import lại MSSV/email cần chốt.
- Giữ bất biến Admin cuối cùng của ID-003. Không tin role/quyền/actor từ body hoặc header client.

## Đầu vào và đầu ra

- Route đề xuất: `GET /api/admin/users`, `GET /api/admin/users/:userId`, `DELETE /api/admin/users/:userId`. Route import ID-004 hiện có không đổi.
- `userId` là UUID Identity; danh sách nhận phân trang/bộ lọc được duyệt, không truy vấn không giới hạn.
- Danh sách trả trang projection quản trị; chi tiết trả một projection. Xoá thành công đề xuất `204` không body.
- Bộ lọc/phân trang, hiển thị User đã xoá và phản hồi xoá lặp cần chốt.

## Tình huống lỗi và biên

- Thiếu/sai token: `401`; thiếu role/quyền: `403`; UUID sai: `400`; User không có: đề xuất `404`.
- Xoá Admin cuối cùng hoặc tài khoản được bảo vệ bị từ chối, dữ liệu giữ nguyên.
- Xoá đồng thời với login/refresh, import và hai lần xoá phải không phát token mới cho User đã xoá hoặc mất dữ liệu.
- ID tham chiếu cũ trong service khác tiếp tục ổn định.

## Tiêu chí nghiệm thu

- **ID-006-AC-001:** ADMIN có quyền xem trang User và chi tiết; chỉ nhận projection cho phép.
- **ID-006-AC-002:** STUDENT, LECTURER/khách không xem dữ liệu quản trị hoặc xoá User.
- **ID-006-AC-003:** Xoá thành công giữ bản ghi/tham chiếu, đánh dấu một lần; lặp không khôi phục.
- **ID-006-AC-004:** User đã xoá không login/refresh để lấy token mới và không xuất hiện trong profile công khai/search.
- **ID-006-AC-005:** Xoá Admin cuối cùng bị chặn; dữ liệu/role không đổi.
- **ID-006-AC-006:** Danh sách/chi tiết không lộ hash, token, secret hay định danh Microsoft nội bộ.
- **ID-006-AC-007:** Learning/Submission/Community không bị cascade/sửa bởi thao tác xoá mềm Identity.

## Ngoài phạm vi

Tạo/cập nhật User thủ công, khôi phục, xoá cứng, đổi/quên mật khẩu, sửa Profile, thay vai trò, import Excel hoặc đổi route import ID-004. Không cấp Admin hay thay catalog ngoài mã quyền được phê duyệt riêng.

## Phụ thuộc

- ID-004 import (`student-provisioning/spec.md` hiện thiếu trong worktree), [ID-003 RBAC](../rbac/spec.md), [ID-001 Auth](../authentication/spec.md), [ID-002 Profile](../profile/spec.md), [ID-005 tìm kiếm](../profile-discovery/spec.md).
- [Kiến trúc Identity](../../../architecture/identity-service.md), [ADR 0002](../../../adr/0002-revised-service-internal-architectures.md), [ranh giới service](../../00-system/service-boundaries.md).

## Câu hỏi mở — chặn Approved

1. Phê duyệt `user:read`/`user:delete` chỉ cho ADMIN hay chính sách khác? Đồng bộ RBAC catalog/seed và token cũ thế nào?
2. Danh sách mặc định ẩn User đã xoá hay cho Admin lọc/xem lại; bộ lọc, thứ tự, giới hạn trang/schema là gì?
3. Xoá mềm dùng `deletedAt` hay cờ khác; email/MSSV unique và import lại cùng định danh xử lý thế nào?
4. Khi xoá, thu hồi refresh session/chặn access token ngay hay để hết hạn theo ID-001/Gateway?
5. Admin có thể xoá chính mình, Admin khác hoặc tài khoản hệ thống không; điều kiện nào ngoài Admin cuối cùng?
6. Dữ liệu lịch sử có User đã xoá hiển thị thế nào cho client khác?
7. Phần CRUD Proposed ID-004 được rút về feature này, giữ cho đợt khác hay sửa ID-004 trước Approved ID-006?
8. Khôi phục tài liệu ID-004 `student-provisioning` đang thiếu khỏi worktree trước khi đối chiếu và phê duyệt ID-006.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-10-28 | 0.1 | Codex / chờ review | Tách quản trị User khỏi tìm kiếm Profile, dùng route `users`. |
