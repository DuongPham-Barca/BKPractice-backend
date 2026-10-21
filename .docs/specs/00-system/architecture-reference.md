# Tham chiếu kiến trúc cho SDD

## Nguồn có thẩm quyền

Các quyết định có thẩm quyền vẫn nằm tại:

- [`system-architecture.md`](../../architecture/system-architecture.md)
- [`service-architectures.md`](../../architecture/service-architectures.md)
- [`dependency-rules.md`](../../architecture/dependency-rules.md)
- tài liệu riêng của service liên quan trong [`docs/architecture`](../../docs/architecture/)
- các ADR đã được chấp nhận trong [`docs/adr`](../../docs/adr/)

File này là chỉ mục lập kế hoạch và bản tóm tắt tuân thủ ngắn gọn. Nếu câu chữ có khác biệt, các tài
liệu kiến trúc và ADR đã chấp nhận được ưu tiên.

Quyết định hiện hành là [ADR 0002](../../adr/0002-revised-service-internal-architectures.md),
thay thế ADR 0001.

## Kiến trúc bắt buộc theo từng đích

| Đích        | Kiến trúc bắt buộc                                   | Tài liệu phải đọc trước khi viết plan.md                                         |
| ----------- | ---------------------------------------------------- | -------------------------------------------------------------------------------- |
| API Gateway | Layered Architecture                                 | `api-gateway.md`, `dependency-rules.md`                                          |
| Identity    | Clean Architecture                                   | `identity-service.md`, `dependency-rules.md`                                     |
| Learning    | DDD + Hexagonal Architecture                         | `learning-service.md`, `dependency-rules.md`                                     |
| Submission  | Clean Architecture + Event-Driven Architecture       | `submission-service.md`, `dependency-rules.md`                                   |
| Judge       | Hexagonal Architecture (Ports & Adapters) + Pipeline | `judge-service.md`, `dependency-rules.md`, `judge-security.md` trong thư mục này |
| Community   | Clean Architecture                                   | `community-service.md`, `dependency-rules.md`                                    |

Mọi `plan.md` phải chép kiến trúc áp dụng vào mục **Kiến trúc service bắt buộc** của nó và giải
thích mức độ tuân thủ ở mục **Tuân thủ kiến trúc** cuối tài liệu.

## Ràng buộc khi lập kế hoạch

- Chỉ phân tầng theo hướng feature-first khi thực sự có hành vi biện minh cho nó. Điều này áp dụng
  như nhau cho các service Clean Architecture và Hexagonal Architecture.
- Không tạo port, use case hay thư mục rỗng chỉ để sơ đồ cho cân xứng.
- Giữ mô hình nghiệp vụ bên trong service sở hữu nó; thư viện trong monorepo chỉ mang tính kỹ thuật.
- Giữ Gateway không có tầng domain/repository/database.
- Với Learning, chỉ dùng DDD ở mức tactical (aggregate, value object, domain service, repository)
  bên trong một bounded context duy nhất. Một aggregate phải được biện minh bởi một bất biến, không
  phải tạo cho mỗi bảng. DDD strategic nằm ngoài phạm vi.
- Giữ Judge ở dạng hexagonal/pipeline và ban đầu là stateless. Judge không có aggregate, entity,
  repository hay cơ sở dữ liệu nghiệp vụ; không thêm các khối DDD vào một phép biến đổi stateless.
- Bảo toàn quyền sở hữu cơ sở dữ liệu và các ranh giới giao tiếp.
- Xử lý các vùng đang ở trạng thái `PARTIALLY ALIGNED` một cách tiệm tiến; một kế hoạch tính năng
  không được đề xuất viết lại cấu trúc thư mục trên diện rộng trừ khi việc đó được phê duyệt riêng
  như một hạng mục công việc kiến trúc.

Việc lựa chọn kiến trúc là bắt buộc và không thể thay đổi bên trong một kế hoạch tính năng. Việc
thay đổi lựa chọn kiến trúc đòi hỏi một ADR mới.
