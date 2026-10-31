# Tổng quan hệ thống SDD BKPractice

## Mục đích

Phần này ghi lại các ràng buộc ở cấp hệ thống mà mọi đặc tả tính năng, kế hoạch và danh sách công
việc của BKPractice đều phải tuân theo. Đây là phần quản trị SDD, không thay thế tài liệu kiến trúc
có thẩm quyền nằm tại [`.docs/architecture`](../../architecture/system-architecture.md).

## Quy trình phát triển bắt buộc

```text
Yêu cầu -> spec.md -> Review -> Approved -> plan.md -> tasks.md
        -> Triển khai -> Kiểm thử -> Đối chiếu đặc tả và kiến trúc
```

Ba tài liệu của một tính năng có trách nhiệm tách bạch:

- `spec.md`: hành vi nào được YÊU CẦU và hành vi nào bị loại trừ.
- `plan.md`: hành vi đã Approved sẽ được lắp vào service sở hữu và kiến trúc của nó NHƯ THẾ NÀO.
- `tasks.md`: danh sách kiểm tra triển khai và xác minh, dẫn xuất từ kế hoạch.

Việc triển khai bị chặn cho tới khi đặc tả đạt trạng thái Approved và cả ba tài liệu nhất quán với
nhau. Không được sửa các yêu cầu đã Approved chỉ vì tiện cho việc triển khai.

## Thẩm quyền

Ràng buộc kiến trúc hệ thống và một đặc tả tính năng đã Approved là bắt buộc. Kế hoạch không được
mở rộng đặc tả; công việc không được mở rộng kế hoạch; giả định khi viết code không được phủ quyết
bất kỳ tài liệu nào. Khi đặc tả và kiến trúc có vẻ mâu thuẫn, hãy báo cáo xung đột để có quyết định
tường minh, thay vì âm thầm thay đổi một ranh giới.

## Tài liệu tham chiếu hệ thống

- [Tham chiếu kiến trúc](./architecture-reference.md)
- [Ranh giới service](./service-boundaries.md)
- [Vai trò và quyền](./roles-permissions.md)
- [Chiến lược cơ sở dữ liệu](./database-strategy.md)
- [Giao tiếp](./communication.md)
- [Bảo mật Judge](./judge-security.md)
- [Định nghĩa Hoàn thành](./definition-of-done.md)
- [Quy trình agent và mã tính năng](../README.md)
