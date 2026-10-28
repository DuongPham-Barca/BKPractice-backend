# ID-004 Cấp tài khoản bằng import Excel — bản tái dựng

## Trạng thái và nguồn

Approved cho **giai đoạn import**. Bản ghi này được tái dựng ngày 2026-10-28 theo yêu cầu trực tiếp của chủ sở hữu vì bản sao trước đó bị discard; đây không phải bản gốc nguyên văn. Contract được đối chiếu với phần làm rõ ID-004 trong [ID-001](../authentication/spec.md), [ID-003](../rbac/spec.md), controller/import hiện có và test tích hợp.

## Mục tiêu và phạm vi

ADMIN có role `ADMIN` và quyền `user:import` import tài khoản BKPractice từ một file `.xlsx`. Tạo User, Profile ban đầu và gán role đã seed trong một transaction. Không tạo/cập nhật User thủ công, không xoá User, không cấp ADMIN qua Excel và không tạo danh mục role/permission.

## Contract đã chốt

- `POST /api/auth/accounts/import`, multipart field `file`; cookie access web kèm Origin/CSRF hoặc Bearer access token app.
- Một sheet, header đúng thứ tự `mssv`, `name`, `email`, `role`; tối đa 5 MiB và 1.000 dòng dữ liệu.
- Role từng dòng chỉ `STUDENT` hoặc `LECTURER`. STUDENT bắt buộc có MSSV; LECTURER để trống MSSV. `name` là tên chính thức/khởi tạo Profile; email được chuẩn hoá. Không có lớp hoặc ghi danh.
- File không tạo role/permission; role phải có sẵn từ seed. Mỗi dòng hợp lệ tạo User ACTIVE, Profile có tên ban đầu tương ứng và gán đúng role trong cùng transaction.
- File sai, dòng sai hoặc trùng email/MSSV trong file hay database làm toàn bộ import thất bại; không tạo một phần. Email/MSSV của User đã xoá mềm theo ID-006 vẫn giữ uniqueness và tiếp tục báo trùng.
- Thành công trả `201` với `totalRows` và `created`; lỗi theo contract HTTP hiện có gồm `400`, `401`, `403`, `409`, `413`, `503`, chỉ trả vị trí/mã lỗi hàng, không trả credential hoặc giá trị ô nhạy cảm.

## Ranh giới với ID-006

ID-006 chỉ thêm API đọc/xoá mềm User; giữ nguyên route và contract import ở trên. Không tái cấp định danh của User đã xoá, không sửa cách cấp credential hoặc vai trò trong import.

## Lịch sử

| Ngày | Trạng thái | Ghi chú |
| --- | --- | --- |
| 2026-10-25 | Approved trước đó | Phần import giai đoạn 1 được ghi nhận trong ID-001/ID-003 và code/test. |
| 2026-10-28 | Tái dựng theo yêu cầu chủ sở hữu | Khôi phục bản tham chiếu cho ID-006; không coi là bản gốc nguyên văn. |
