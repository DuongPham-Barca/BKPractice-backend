# GW-001 Cấu trúc lớp API Gateway

## Trạng thái

Approved

Phiên bản `1.0`, được ghi lại sau khi việc chia lớp Gateway đã hoàn thành và được kiểm chứng ngày `2026-10-31`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

API Gateway là cổng vào công khai của BKPractice, chỉ phụ trách xác thực, định tuyến và truyền tải; không chứa quy tắc nghiệp vụ, thực thể hay cơ sở dữ liệu riêng. Đặc tả này chia Gateway thành ba tầng kỹ thuật thuần:

```text
presentation -> application -> infrastructure
```

đ Theo Kiến trúc Layered đã chọn trong ADR 0002, đồng thời giữ nguyên hành vi định tuyến, xác thực, cookie, giới hạn tần suất và realtime hiện tại.

## Tác nhân

- **Người dùng cuối:** Sinh viên, giảng viên truy cập qua trình duyệt hoặc ứng dụng di động.
- **API Gateway:** Cổng vào công khai, xác minh access token BKPractice, loại bỏ header định danh giả mạo và chuyển tiếp metadata đã tin cậy.
- **Identity Service:** Chủ sở hữu xác thực, session, token và metadata định danh; cung cấp endpoint `/internal/auth/session`.
- **Learning / Submission / Community Service:** Các dịch vụ nghiệp vụ nhận request được chuyển tiếp qua proxy.
- **NestJS / ioredis / Socket.IO:** Thư viện truyền tải và cơ sở hạ tầng dùng ở tầng infrastructure.

## Bối cảnh

Trước đây mã nguồn Gateway tổ chức theo các thư mục `auth`, `proxy`, `realtime` và được đánh giá là `ALIGNED` với kiến trúc Layered trong ADR 0002, nhưng chưa có spec riêng và các tầng kỹ thuật chưa được phân rõ theo Layered thuần. ADR 0002 chọn Layered Architecture cho API Gateway. Đặc tả này ghi nhận lại cấu trúc mục tiêu, phân rõ các tầng và ràng buộc chiều phụ thuộc, mà không thay đổi hành vi định tuyến hay xử lý realtime hiện tại.

## Yêu cầu chức năng

- **GW-001-FR-001:** Gateway MUST chia source thành ba thư mục `presentation/`, `application/` và `infrastructure/` nằm trong `apps/api-gateway/src/`.
- **GW-001-FR-002:** `presentation/` MUST chỉ chứa controller, middleware, guards và realtime gateway; nó MAY phụ thuộc `application/` nhưng KHÔNG được phụ thuộc trực tiếp `infrastructure/`.
- **GW-001-FR-003:** `application/` MUST chứa proxy forwarding, kiểm tra session và dispatch kết quả realtime; nó MAY phụ thuộc `infrastructure/`.
- **GW-001-FR-004:** `infrastructure/` MUST chứa Identity session HTTP client và Redis subscriber; nó MAY phụ thuộc các client transport/config của NestJS và contract chia sẻ.
- **GW-001-FR-005:** Gateway MUST NOT có tầng domain, entity, repository hoặc cơ sở dữ liệu của chính Gateway.
- **GW-001-FR-006:** Chiều phụ thuộc KHÔNG ĐƯỢC ngược lên; nó chỉ đi theo hướng `presentation -> application -> infrastructure`.
- **GW-001-FR-007:** Việc chia lớp KHÔNG được thay đổi route định tuyến, xác thực JWT/cookie, xử lý cookie, CSRF, giới hạn tần suất và hành vi realtime Socket.IO hiện tại.
- **GW-001-FR-008:** `api-gateway.module.ts` MUST là composition root, nối service theo đúng phân tầng trên.

## Quy tắc nghiệp vụ

- Gateway không chứa quy tắc nghiệp vụ của bất kỳ dịch vụ nào.
- Chỉ metadata định danh đã được xác minh từ access token BKPractice mới được suy ra và chuyển tiếp.
- Tầng presentation không được gọi trực tiếp hạ tầng (HTTP client, Redis, TypeORM, v.v.).
- Mọi adapter hạ tầng phải được gắn tại composition root của Gateway.

## Quy tắc phân quyền

- Người gọi công khai KHÔNG thể cung cấp header định danh/vai trò tin cậy; Gateway phải loại bỏ chúng và chỉ thay thế bằng dữ liệu từ access token đã xác minh.
- Xác thực thành công không đồng nghĩa với quyền truy cập mọi khoá học, lớp, bài tập hay thao tác quản trị; phân quyền tài nguyên vẫn thuộc về service sở hữu.

## Đầu vào

| Route                                                                       | Phương thức | Dịch vụ đích            |
| --------------------------------------------------------------------------- | ----------- | ----------------------- |
| `/api/auth`, `/api/users`, `/api/profile`, `/api/roles`, `/api/admin/users` | Tất cả      | Identity                |
| `/api/problems`, `/api/courses`, `/api/assignments`, `/api/classes`         | Tất cả      | Learning                |
| `/api/submissions`, `/api/run`                                              | Tất cả      | Submission              |
| `/api/community`                                                            | Tất cả      | Community               |
| `/health`, `/docs/{*path}`                                                  | Tất cả      | Bỏ qua xác thực Gateway |

## Đầu ra

- Yêu cầu được chuyển tiếp tới dịch vụ đích với metadata định danh đã xác minh; phản hồi của upstream được trả về kèm header và cookie đã duyệt.
- Kết quả realtime của submission được phát qua Socket.IO namespace `/submissions` sau khi kiểm chứng session của từng socket.
- Lỗi định tuyến hay dịch vụ đích không khả dụng trả về `BadGatewayException`, không rò rỉ token hay credential.

## Tình huống lỗi

| Trường hợp                                              | Hành vi quan sát được                                      |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Không có route upstream được cấu hình cho đường dẫn     | Trả về `BadGatewayException`                               |
| Dịch vụ đích không khả dụng hoặc lỗi kết nối            | Trả về `BadGatewayException`                               |
| Access token thiếu, hết hạn, sai loại hoặc không hợp lệ | Gateway từ chối, không chuyển tiếp metadata định danh      |
| Header định danh/vai trò giả mạo do người gọi gửi       | Được loại bỏ và thay thế bằng dữ liệu từ token đã xác minh |
| Message realtime sai định dạng hoặc không đạt whitelist | Bỏ qua, không phát tới socket                              |

## Tình huống biên

- Các kết nối Socket.IO đồng thời tạo các session socket độc lập theo `user:<userId>`.
- Redis không khả dụng được ghi log một lần cho tới khi kết nối lại, không làm gián đoạn HTTP.
- Việc đăng xuất qua cookie là idempotent và không khôi phục phiên đã thu hồi.

## Yêu cầu bảo mật

- Access token, refresh token, mã uỷ quyền, bí mật ký và header Authorization KHÔNG được xuất hiện trong log.
- Gateway KHÔNG chuyển tiếp header Cookie thô hay `Set-Cookie` tuỳ ý của upstream tới client hay service đích.
- Chỉ `Set-Cookie` do Identity phát hành trên phản hồi thành công của login, Microsoft exchange, refresh và logout mới được chuyển tiếp.
- Các lỗi xác thực không phân biệt giữa tài khoản không tồn tại, mật khẩu sai hay email nhà cung cấp không khớp.

## Tiêu chí nghiệm thu

- **GW-001-AC-001:** Cho trước mã nguồn Gateway sau thay đổi, thì thư mục `presentation/`, `application/` và `infrastructure/` tồn tại theo cây mục tiêu trong mục Mục tiêu.
- **GW-001-AC-002:** Cho trước bất kỳ file trong `presentation/`, thì file đó KHÔNG import trực tiếp từ `infrastructure/`.
- **GW-001-AC-003:** Cho trước bất kỳ file trong `application/`, thì file đó KHÔNG chứa quy tắc nghiệp vụ của dịch vụ khác và chỉ phụ thuộc `infrastructure/` hoặc contract chia sẻ.
- **GW-001-AC-004:** Cho trước `api-gateway.module.ts`, thì nó phải nối `IdentitySessionClient` (infrastructure) với `GatewaySessionService` (application), và nối cả hai với middleware/realtime gateway (presentation).
- **GW-001-AC-005:** Cho trước các test Gateway hiện có, thì toàn bộ 8 suite/39 test phải pass sau khi di chuyển và đổi tên đường dẫn import.
- **GW-001-AC-006:** Cho trước `pnpm build:gateway`, thì build phải thành công.
- **GW-001-AC-007:** Cho trước tài liệu kiến trúc sau thay đổi, thì `api-gateway.md` và `dependency-rules.md` phải ghi chiều phụ thuộc `presentation -> application -> infrastructure` và cam kết không có tầng domain/repository.

## Ngoài phạm vi

- Tầng domain, entity, repository, cơ sở dữ liệu hoặc business entity của Gateway.
- Quy tắc nghiệp vụ của Identity, Learning, Submission hay Community nằm trong Gateway.
- Thay đổi route, contract API hoặc hành vi định tuyến hiện tại.
- Truy cập cơ sở dữ liệu hoặc source internals của dịch vụ khác.

## Phụ thuộc

- [Kiến trúc hệ thống BKPractice](../../../architecture/system-architecture.md)
- [Kiến trúc API Gateway](../../../architecture/api-gateway.md)
- [Ma trận kiến trúc service](../../../architecture/service-architectures.md)
- [Quy tắc phụ thuộc](../../../architecture/dependency-rules.md)
- [ADR 0002: Kiến trúc nội bộ riêng theo từng dịch vụ](../../../adr/0002-revised-service-internal-architectures.md)
- [Quy trình SDD](../../README.md)
- [Tham chiếu kiến trúc cho SDD](../../00-system/architecture-reference.md)
- [Ranh giới service](../../00-system/service-boundaries.md)
- [Định nghĩa Hoàn thành](../../00-system/definition-of-done.md)

## Câu hỏi mở

Không còn.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác nhân              | Tóm tắt                                                                                |
| ---------- | --------- | --------------------- | -------------------------------------------------------------------------------------- |
| 2026-10-31 | 1.0       | opencode / người dùng | Ghi lại cấu trúc layered thuần của API Gateway sau khi đã di chuyển code và kiểm chứng |
