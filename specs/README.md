# Phát triển hướng đặc tả (SDD) cho BKPractice

Thư mục này định nghĩa quy trình Phát triển hướng đặc tả (Spec-Driven Development — SDD) cho các
công việc tiếp theo của BKPractice. Nó không thay thế tài liệu kiến trúc có thẩm quyền trong
[`docs/architecture`](../docs/architecture/system-architecture.md).

## Trách nhiệm của từng tài liệu

```text
Yêu cầu
    |
    v
spec.md (CÁI GÌ)
    |
    v
Review -> Approved
    |
    v
plan.md (NHƯ THẾ NÀO)
    |
    v
tasks.md (danh sách kiểm tra triển khai)
    |
    v
Triển khai -> Kiểm thử -> Đối chiếu với spec.md và kiến trúc
```

- `spec.md` định nghĩa hành vi được yêu cầu, các quy tắc, đầu vào, đầu ra, tình huống lỗi, tiêu chí
  nghiệm thu và những loại trừ tường minh. Một đặc tả đã Approved là nguồn chân lý của tính năng.
- `plan.md` giải thích đặc tả đã Approved sẽ được triển khai như thế nào bên trong kiến trúc đã chọn
  của service đích. Nó không được thêm yêu cầu hay mở rộng phạm vi.
- `tasks.md` là danh sách công việc có thứ tự, cập nhật được, dẫn xuất từ kế hoạch. Nó không được
  thay đổi kế hoạch hay đặc tả.

Khi các chỉ dẫn mâu thuẫn, áp dụng thứ tự ưu tiên sau:

```text
Ràng buộc kiến trúc hệ thống + spec.md đã Approved
    > plan.md
    > tasks.md
    > giả định khi triển khai
```

Một đặc tả mâu thuẫn với kiến trúc không được phê duyệt hay triển khai một cách âm thầm. Hãy báo cáo
xung đột và có được quyết định tường minh về kiến trúc/đặc tả. Agent triển khai không được sửa một
đặc tả đã Approved trừ khi được chỉ đạo tường minh là phải sửa đổi đặc tả.

## Vòng đời trạng thái

Các trạng thái hợp lệ của đặc tả là `Proposed`, `Approved`, `Implemented` và `Verified`.

1. `Proposed`: đang mở để rà soát và chỉnh sửa yêu cầu; việc triển khai bị chặn.
2. `Approved`: đã được rà soát, là nguồn chân lý; có thể tiến hành lập kế hoạch và triển khai.
3. `Implemented`: các công việc và kiểm thử liên quan đã hoàn tất, đang chờ xác minh cuối cùng.
4. `Verified`: bản triển khai đã được đối chiếu với tiêu chí nghiệm thu và kiến trúc.

Chỉ người rà soát có thẩm quyền mới được phê duyệt hoặc sửa đổi yêu cầu. Việc đã triển khai không
đồng nghĩa với việc đã được phê duyệt.

## Quy trình cho agent

Trước khi triển khai, agent BẮT BUỘC phải:

1. Đọc các tài liệu hệ thống và tài liệu của service đích trong `docs/architecture/`.
2. Đọc `spec.md` của tính năng.
3. Xác nhận `Status = Approved`.
4. Đọc `plan.md`.
5. Đọc `tasks.md`.
6. Khảo sát mã nguồn hiện có và trạng thái hiện tại của repository.

Trong khi triển khai, agent BẮT BUỘC phải:

7. Tuân theo kiến trúc đã chọn của service và các quy tắc phụ thuộc.
8. Làm việc tuần tự theo `tasks.md`.
9. Không thay đổi các yêu cầu đã được phê duyệt.
10. Không thêm chức năng Ngoài phạm vi.
11. Không đưa ra thay đổi kiến trúc khi chưa có phê duyệt tường minh.
12. Giữ `tasks.md` luôn cập nhật, đánh dấu các mục đã hoàn thành và các mục N/A một cách trung thực.

Sau khi triển khai, agent BẮT BUỘC phải:

13. Chạy các kiểm thử liên quan.
14. Chạy các lệnh kiểm chứng mà tính năng yêu cầu.
15. So sánh bản triển khai với `spec.md`.
16. So sánh bản triển khai với kiến trúc của service và các quy tắc phụ thuộc.
17. Báo cáo các sai lệch, hành vi chưa được xác minh và rủi ro còn lại.

Nếu bất kỳ tài liệu bắt buộc nào bị thiếu, mâu thuẫn, hoặc mơ hồ theo cách làm thay đổi hành vi,
agent phải dừng hướng triển khai đó và báo cáo vấn đề thay vì tự bịa ra một yêu cầu.

## Vị trí đặt tính năng và mã định danh

Mỗi tính năng nằm trong thư mục service/domain đã định sẵn và cuối cùng sẽ chứa:

```text
<feature>/
├── spec.md
├── plan.md
└── tasks.md
```

| Tiền tố | Service sở hữu | Ví dụ                                                                                                                  |
| ------- | -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `ID-*`  | Identity       | `ID-001 Authentication`, `ID-002 Profile`, `ID-003 RBAC`                                                               |
| `LRN-*` | Learning       | `LRN-001 Problem Management`, `LRN-002 Course Management`, `LRN-003 Assignment Management`, `LRN-004 Progress`         |
| `SUB-*` | Submission     | `SUB-001 Run Code`, `SUB-002 Submit Code`, `SUB-003 Submission History`, `SUB-004 Realtime Result`                     |
| `JDG-*` | Judge          | `JDG-001 Standard Judge`, `JDG-002 Language Runners`, `JDG-003 Function Judge`, `JDG-004 OOP Judge`, `JDG-005 Sandbox` |
| `COM-*` | Community      | `COM-001 Posts`, `COM-002 Comments`, `COM-003 Reactions`, `COM-004 Bookmarks`, `COM-005 Moderation`                    |

Mã định danh là cố định sau khi được phê duyệt và không được tái sử dụng. Các ví dụ trên chỉ giữ chỗ
cho quy ước đặt tên; chúng không phải là các đặc tả tính năng đã được triển khai hay đã Approved.

## Ví dụ: ID-001 Authentication

Bắt đầu bằng cách chép [`spec.template.md`](./templates/spec.template.md) sang
`01-identity/authentication/spec.md`, đặt mã tính năng là `ID-001`, và chỉ mô tả các yêu cầu về xác
thực. Kiến trúc bắt buộc của nó là **Identity Service: Clean Architecture**.

Sau khi review chuyển trạng thái đặc tả sang `Approved`, tạo `plan.md` từ mẫu plan. Kế hoạch ánh xạ
các yêu cầu vào domain/application port và infrastructure adapter của Identity mà không mở rộng phạm
vi. Sau đó tạo `tasks.md`; việc triển khai chỉ được bắt đầu khi cả ba tài liệu nhất quán với nhau.

Quy tắc tương tự áp dụng cho các tiền tố khác:

- `LRN-*`: DDD + Hexagonal Architecture.
- `SUB-*`: Clean Architecture + Event-Driven Architecture.
- `JDG-*`: Hexagonal Architecture (Ports & Adapters) + Pipeline.
- `COM-*`: Clean Architecture.

Ma trận service đầy đủ nằm trong [`00-system/architecture-reference.md`](./00-system/architecture-reference.md).
