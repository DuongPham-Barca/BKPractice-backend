# ID-004 Checklist import tài khoản — bản tái dựng

Nguồn: [spec](./spec.md), [plan](./plan.md). Bản ghi này phản ánh phần import đã có trước ID-006; không đánh dấu CRUD User ngoài phạm vi là đã làm.

- [x] Route `.xlsx` với quyền ADMIN + `user:import`, cookie/Bearer/CSRF.
- [x] Kiểm tra header, role, MSSV, tên/email, giới hạn file/dòng và trùng lặp.
- [x] Tạo User/Profile/role nguyên tử, dùng role đã seed; không import ADMIN.
- [x] Có unit/API/integration test cho phần import hiện có.
- [ ] Kiểm chứng lại phần import khi ID-006 thêm xoá mềm: email/MSSV của User đã xoá vẫn báo trùng; không đổi route hay transaction.
