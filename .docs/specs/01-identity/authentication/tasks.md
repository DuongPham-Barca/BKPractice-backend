# ID-001 Công việc triển khai Authentication

## Trạng thái

Approved — Sẵn sàng triển khai

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-01`.

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `1.2`
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-01`

Mọi công việc triển khai và xác minh đều bắt đầu ở trạng thái chưa hoàn thành. Hãy làm theo thứ tự,
trừ khi một phụ thuộc tường minh cho phép làm song song. Chỉ đánh dấu một công việc là hoàn thành sau
khi cả hành vi lẫn phần kiểm chứng được liệt kê đều đã thoả mãn.

## Chuẩn bị

- [x] **ID-001-T001 — Xác nhận lại nền tảng triển khai.** Khảo sát trạng thái Git hiện tại, các
      module Auth/User/RBAC của Identity, phần auth/proxy/throttler của Gateway, datasource TypeORM
      và migration ban đầu, các thư viện cấu hình/contract, và các test hiện có. Xác nhận cả hai tài
      liệu nguồn vẫn ở trạng thái Approved và ghi lại mọi xung đột mới trước khi thay đổi code.  
      **Phụ thuộc:** Không có.  
      **Truy vết:** Phần chuẩn bị của SDD và Định nghĩa Hoàn thành.

- [x] **ID-001-T002 — Thêm các phụ thuộc, cấu hình và contract kỹ thuật đã phê duyệt.** Chỉ thêm
      `@azure/msal-node` bằng pnpm; thêm các thiết lập Microsoft/Redis của Identity và thiết lập giới
      hạn tần suất auth của Gateway, đều đã được kiểm chứng; thêm các kiểu claim access/refresh kỹ
      thuật dùng chung mà không chuyển một model domain của Identity vào `libs/`. Giữ các bí mật thật
      nằm ngoài hệ thống quản lý mã nguồn và thất bại sớm khi thiếu cấu hình Identity bắt buộc.  
      **Phụ thuộc:** ID-001-T001.  
      **Truy vết:** ID-001-FR-007, ID-001-FR-012, ID-001-FR-014;
      ID-001-SR-007, ID-001-SR-010, ID-001-SR-014.

## Domain

- [x] **ID-001-T003 — Thêm model domain và các port application của Authentication.** Định nghĩa các
      phép chiếu tài khoản xác thực độc lập với framework, tái dùng từ vựng trạng thái tài khoản hiện
      có, định nghĩa các kiểu/bất biến cho định danh Microsoft và họ refresh, định nghĩa các phân
      loại lỗi xác thực ổn định, và chỉ thêm bảy port mà kế hoạch đã phê duyệt: tài khoản, định danh
      ngoài, phiên refresh, bộ băm mật khẩu, dịch vụ token BK, nhà cung cấp Microsoft, và kho lưu
      luồng auth.  
      **Phụ thuộc:** ID-001-T001.  
      **Truy vết:** ID-001-FR-002, ID-001-FR-008–ID-001-FR-010,
      ID-001-FR-020–ID-001-FR-021, ID-001-FR-023, ID-001-FR-026;
      ID-001-SR-006, ID-001-SR-011, ID-001-SR-013, ID-001-SR-018.

- [ ] **ID-001-T004 — Kiểm thử các bất biến và lỗi của domain.** Bao phủ điều kiện được cấp token của
      trạng thái `ACTIVE`, việc từ chối `LOCKED/PENDING`, ngữ nghĩa duy nhất của liên kết Microsoft,
      tính cách ly giữa các họ, và đảm bảo đầu ra/lỗi của domain không chứa thông tin đăng nhập,
      token của nhà cung cấp, hay kiểu dữ liệu của tầng hạ tầng.  
      **Phụ thuộc:** ID-001-T003.  
      **Truy vết:** ID-001-AC-010, ID-001-AC-017, ID-001-AC-021–ID-001-AC-022.

## Lưu trữ

- [x] **ID-001-T005 — Mở rộng model lưu trữ User cho dữ liệu định danh được cấp.** Thêm `student_id`
      cho phép null để tương thích dữ liệu cũ, giữ cột `email` hiện tại làm `emailTruong` đã chuẩn
      hoá và được lưu, và chỉ phơi bày bản băm mật khẩu qua phép chiếu thông tin đăng nhập dùng cho
      việc đăng nhập cục bộ. Không thêm phần phân tích Excel, quyền sở hữu lớp, hay state bắt buộc
      đổi mật khẩu ở lần đăng nhập đầu.  
      **Phụ thuộc:** ID-001-T003.  
      **Truy vết:** ID-001-FR-002–ID-001-FR-004, ID-001-FR-008, ID-001-FR-020,
      ID-001-FR-022; ID-001-AC-019, ID-001-AC-024.

- [x] **ID-001-T006 — Thêm lớp lưu trữ định danh ngoài của Microsoft.** Tạo model lưu trữ TypeORM
      thuộc sở hữu của Identity và phần đăng ký entity cho nhà cung cấp, tenant ID, subject/object
      ID, username tại thời điểm liên kết, các mốc thời gian, khoá ngoại nội bộ tới User, và các ràng
      buộc duy nhất đã phê duyệt. Không tạo quan hệ xuyên service.  
      **Phụ thuộc:** ID-001-T003, ID-001-T005.  
      **Truy vết:** ID-001-FR-006–ID-001-FR-009; ID-001-SR-004, ID-001-SR-006;
      ID-001-AC-005–ID-001-AC-009.

- [x] **ID-001-T007 — Mở rộng lớp lưu trữ refresh token cho các họ phiên.** Thêm `family_id`
      (non-null sau khi điền bù) và cột dấu vết thay thế cho phép null, đồng thời giữ lại bản băm
      token, thời hạn, việc thu hồi và quyền sở hữu của người dùng. Không thêm device fingerprint,
      bảng điều khiển quản lý phiên, hay việc lưu refresh token dạng thô.  
      **Phụ thuộc:** ID-001-T003.  
      **Truy vết:** ID-001-FR-015–ID-001-FR-018, ID-001-FR-023, ID-001-FR-026;
      ID-001-SR-008, ID-001-SR-018.

- [x] **ID-001-T008 — Hiện thực adapter TypeORM cho tài khoản xác thực.** Truy vấn theo MSSV đã chuẩn
      hoá, email trường đã chuẩn hoá, và user ID; nạp vai trò/trạng thái hiện tại; chỉ select
      `password_hash` cho việc kiểm tra thông tin đăng nhập cục bộ; từ chối các kết quả khớp nhập
      nhằng; không bao giờ đọc cơ sở dữ liệu của service khác.  
      **Phụ thuộc:** ID-001-T005.  
      **Truy vết:** ID-001-FR-002–ID-001-FR-005, ID-001-FR-008, ID-001-FR-010,
      ID-001-FR-025; ID-001-SR-012–ID-001-SR-013.

- [x] **ID-001-T009 — Hiện thực adapter TypeORM cho định danh ngoài.** Phân giải các liên kết đã
      thiết lập theo `MICROSOFT + tenantId + oid`; thực hiện việc đối sánh email lần đầu và tạo liên
      kết trong một transaction nguyên tử; chuyển các cuộc đua về tính duy nhất thành lỗi xung đột an
      toàn đã phê duyệt; không bao giờ tạo một User.  
      **Phụ thuộc:** ID-001-T006, ID-001-T008.  
      **Truy vết:** ID-001-FR-007–ID-001-FR-009; ID-001-SR-004, ID-001-SR-006;
      ID-001-AC-005–ID-001-AC-009.

- [x] **ID-001-T010 — Hiện thực adapter TypeORM cho phiên refresh.** Hỗ trợ việc tạo họ mới, tra cứu
      token, xoay vòng chỉ một bên thắng trong transaction, chèn bản thay thế, thu hồi họ một cách
      idempotent, và khoanh vùng khi bị dùng lại chỉ trong phạm vi một họ, bằng cập nhật có điều
      kiện/khoá dòng. Không bao giờ lưu một bearer token thô còn dùng được.  
      **Phụ thuộc:** ID-001-T007.  
      **Truy vết:** ID-001-FR-015–ID-001-FR-018, ID-001-FR-023, ID-001-FR-026;
      ID-001-SR-008, ID-001-SR-018; ID-001-AC-012–ID-001-AC-014,
      ID-001-AC-021–ID-001-AC-022.

## Cơ sở dữ liệu / Migration

- [x] **ID-001-T011 — Tạo migration TypeORM của Identity.** Thêm bước kiểm tra trước về email trùng
      nhau khi không phân biệt hoa thường, `users.student_id` cho phép null cùng partial unique
      index, functional unique index trên `LOWER(email)`, bảng `external_identities` cùng các ràng
      buộc nội bộ, các cột họ/dấu vết của refresh, việc điền bù ID họ duy nhất cho các dòng hiện có,
      bước chuyển sang non-null/thêm index cuối cùng, và một phần down theo thứ tự ngược lại. Không
      sửa migration nền tảng và không bật synchronize.  
      **Phụ thuộc:** ID-001-T005–ID-001-T007.  
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu/Migration của kế hoạch;
      ID-001-FR-008–ID-001-FR-009, ID-001-FR-016, ID-001-FR-023, ID-001-FR-026.

- [x] **ID-001-T012 — Thêm test integration cho migration và repository.** Kiểm chứng các ràng buộc
      schema, việc từ chối trùng lặp không phân biệt hoa thường, việc điền bù họ refresh cho dữ liệu
      cũ, liên kết Microsoft lần đầu nguyên tử, xoay vòng refresh chỉ một bên thắng, việc khoanh vùng
      khi bị dùng lại, và việc bảo toàn các họ độc lập, trên một cơ sở dữ liệu PostgreSQL Identity
      cách ly.  
      **Phụ thuộc:** ID-001-T008–ID-001-T011.  
      **Truy vết:** ID-001-AC-005, ID-001-AC-008, ID-001-AC-012,
      ID-001-AC-021–ID-001-AC-022, ID-001-AC-024.

## Infrastructure

- [x] **ID-001-T013 — Hiện thực adapter mật khẩu Argon2.** Tái dùng thư viện Argon2 đã cài đặt phía
      sau `PasswordHasher` cho các thao tác băm/kiểm tra an toàn, cung cấp đường dùng bản băm giả cố
      định và hợp lệ cần cho việc chống rò rỉ qua thời gian phản hồi với MSSV không tồn tại, và đảm
      bảo không mật khẩu/bản băm nào thoát khỏi adapter, khỏi phản hồi của tầng application, hay khỏi
      log an toàn.  
      **Phụ thuộc:** ID-001-T003.  
      **Truy vết:** ID-001-FR-005, ID-001-FR-020, ID-001-FR-022;
      ID-001-SR-001, ID-001-SR-002, ID-001-SR-003, ID-001-SR-012; ID-001-AC-003,
      ID-001-AC-017, ID-001-AC-019.

- [x] **ID-001-T014 — Hiện thực adapter JWT và bộ phát hành token của BKPractice.** Phát hành và kiểm
      chứng access/refresh token riêng biệt bằng các bí mật đã kiểm chứng và TTL cấu hình được; thực
      thi mục đích của token, issuer/audience/tính toàn vẹn/thời hạn; dùng claim access tối thiểu
      `sub, roles, type=access` và claim refresh `sub, jti, fid, type=refresh`; phối hợp việc lưu
      refresh đã băm mà không để lộ bí mật.  
      **Phụ thuộc:** ID-001-T002, ID-001-T003, ID-001-T010, ID-001-T013.  
      **Truy vết:** ID-001-FR-011–ID-001-FR-017, ID-001-FR-019–ID-001-FR-020,
      ID-001-FR-023; ID-001-SR-008–ID-001-SR-010, ID-001-SR-014;
      ID-001-AC-011–ID-001-AC-014.

- [x] **ID-001-T015 — Hiện thực adapter Microsoft Entra.** Dùng Authorization Code Flow của MSAL Node
      theo tenant cụ thể kèm PKCE; chỉ dựng các vị trí redirect đã cấu hình; kiểm chứng kết quả của
      nhà cung cấp, tenant, audience, nonce, mục đích token, thời hạn, `preferred_username`, `tid` và
      `oid`; chỉ trả về các claim định danh đã xác minh; không lưu/ghi log token của nhà cung cấp và
      không gọi Graph.  
      **Phụ thuộc:** ID-001-T002, ID-001-T003.  
      **Truy vết:** ID-001-FR-006–ID-001-FR-009, ID-001-FR-014;
      ID-001-SR-004–ID-001-SR-007, ID-001-SR-009, ID-001-SR-014–ID-001-SR-015;
      ID-001-AC-005, ID-001-AC-006, ID-001-AC-007, ID-001-AC-008, ID-001-AC-009,
      ID-001-AC-017–ID-001-AC-018.

- [x] **ID-001-T016 — Hiện thực adapter luồng auth trên Redis.** Lưu state, nonce và metadata PKCE
      của OAuth theo namespace trong 300 giây; phát hành mã đăng nhập ngẫu nhiên về mặt mật mã chỉ
      ánh xạ tới `userId` trong đúng 60 giây; tiêu thụ state/mã một cách nguyên tử đúng một lần qua
      `GETDEL` hoặc tương đương; không bao giờ lưu bearer token của Microsoft/BKPractice.  
      **Phụ thuộc:** ID-001-T002, ID-001-T003.  
      **Truy vết:** ID-001-FR-024; ID-001-SR-009, ID-001-SR-015, ID-001-SR-017;
      ID-001-AC-018, ID-001-AC-020.

- [x] **ID-001-T017 — Nối dây use case và adapter tại composition root của Auth.** Sau khi hoàn thành
      ID-001-T018–ID-001-T024, đăng ký cả bảy use case của tầng application làm provider của Nest,
      gắn bảy port của tầng application với các adapter TypeORM, Argon2, JWT, MSAL và Redis của
      chúng, và chỉ phơi bày những provider mà tầng presentation cần. Chỉ đăng ký các provider vòng
      đời ở nơi thực sự cần; giữ phần nối dây module không chứa hành vi nghiệp vụ và không có trừu
      tượng hoá trùng lặp.  
      **Phụ thuộc:** ID-001-T008–ID-001-T010, ID-001-T013–ID-001-T016,
      ID-001-T018–ID-001-T024.  
      **Truy vết:** Mục Adapter hạ tầng và Tuân thủ kiến trúc của kế hoạch.

## Application

- [x] **ID-001-T018 — Hiện thực `LoginWithStudentId`.** Kiểm chứng việc tra cứu tài khoản đã được
      cấp, thực hiện kiểm tra Argon2 thật hoặc giả, phơi bày đúng một lỗi chung cho MSSV không tồn
      tại/mật khẩu sai/trạng thái không hoạt động, nạp vai trò hiện tại, và tạo một họ refresh độc
      lập mới khi thành công.  
      **Phụ thuộc:** ID-001-T008, ID-001-T013–ID-001-T014.  
      **Truy vết:** ID-001-FR-002–ID-001-FR-005, ID-001-FR-010–ID-001-FR-012,
      ID-001-FR-020, ID-001-FR-022–ID-001-FR-023; ID-001-AC-002–ID-001-AC-004,
      ID-001-AC-010–ID-001-AC-011, ID-001-AC-019, ID-001-AC-021.

- [x] **ID-001-T019 — Hiện thực `StartMicrosoftLogin`.** Sinh state, nonce và dữ liệu PKCE; lưu giao
      dịch dùng một lần; yêu cầu URL uỷ quyền single-tenant đã cấu hình; không nhận định danh của
      người gọi hay redirect tuỳ ý.  
      **Phụ thuộc:** ID-001-T015–ID-001-T016.  
      **Truy vết:** ID-001-FR-006–ID-001-FR-007, ID-001-FR-024;
      ID-001-SR-004–ID-001-SR-007, ID-001-SR-015–ID-001-SR-017.

- [x] **ID-001-T020 — Hiện thực `CompleteMicrosoftLogin`.** Tiêu thụ state một cách nguyên tử, đổi mã
      của nhà cung cấp kèm PKCE, kiểm chứng các claim đã xác minh, phân giải liên kết ổn định hoặc
      đối sánh nguyên tử `emailTruong` đã chuẩn hoá, từ chối các tài khoản không khớp/nhập
      nhằng/xung đột/không hoạt động mà không tạo người dùng, và chỉ trả về URL frontend cố định kèm
      một mã đăng nhập mờ.  
      **Phụ thuộc:** ID-001-T008–ID-001-T009, ID-001-T015–ID-001-T016.  
      **Truy vết:** ID-001-FR-002, ID-001-FR-006–ID-001-FR-010, ID-001-FR-024;
      ID-001-SR-004–ID-001-SR-007, ID-001-SR-012–ID-001-SR-017;
      ID-001-AC-005–ID-001-AC-010, ID-001-AC-018, ID-001-AC-020.

- [x] **ID-001-T021 — Hiện thực `ExchangeMicrosoftLoginCode`.** Tiêu thụ nguyên tử đúng một mã hợp lệ
      trong 60 giây, từ chối các mã muộn/đã dùng bằng lỗi chung, nạp lại trạng thái/vai trò hiện tại,
      yêu cầu `ACTIVE`, và phát hành một họ refresh BKPractice độc lập mới cùng cặp token.  
      **Phụ thuộc:** ID-001-T014, ID-001-T016, ID-001-T020.  
      **Truy vết:** ID-001-FR-010–ID-001-FR-012, ID-001-FR-023–ID-001-FR-024;
      ID-001-SR-010, ID-001-SR-013–ID-001-SR-014, ID-001-SR-017;
      ID-001-AC-010–ID-001-AC-011, ID-001-AC-020–ID-001-AC-021.

- [x] **ID-001-T022 — Hiện thực `RefreshSession`.** Kiểm chứng các claim/bản băm refresh có phân
      loại, nạp lại trạng thái tài khoản và vai trò hiện tại, từ chối các token không hợp lệ/hết
      hạn/đã thu hồi/không tồn tại/đã dùng lại bằng lỗi chung, xoay vòng trong transaction bên trong
      cùng một họ, và chỉ thu hồi đúng họ bị ảnh hưởng khi phát hiện dùng lại.  
      **Phụ thuộc:** ID-001-T008, ID-001-T010, ID-001-T014.  
      **Truy vết:** ID-001-FR-010, ID-001-FR-014–ID-001-FR-017, ID-001-FR-026;
      ID-001-SR-008–ID-001-SR-014, ID-001-SR-018;
      ID-001-AC-010–ID-001-AC-013, ID-001-AC-022.

- [x] **ID-001-T023 — Hiện thực `LogoutCurrentSession`.** Yêu cầu định danh access đã xác thực, kiểm
      chứng mục đích và quyền sở hữu chủ thể của refresh token, thu hồi một cách idempotent chỉ họ đã
      gửi lên, giữ nguyên các thiết bị khác, không trả về chi tiết phiên, và không thêm danh sách đen
      access token.  
      **Phụ thuộc:** ID-001-T010, ID-001-T014.  
      **Truy vết:** ID-001-FR-018–ID-001-FR-019, ID-001-FR-023;
      ID-001-SR-009–ID-001-SR-011, ID-001-SR-014; ID-001-AC-014,
      ID-001-AC-017, ID-001-AC-021.

- [x] **ID-001-T024 — Hiện thực `GetCurrentAuthenticatedUser`.** Phân giải người dùng đã xác thực từ
      chủ thể của access token đã xác minh và trả về đúng `userId`, `studentId`, vai trò và trạng
      thái; không phơi bày chi tiết nào về Profile, thông tin đăng nhập, phiên, hay nhà cung cấp
      Microsoft.  
      **Phụ thuộc:** ID-001-T008, ID-001-T014.  
      **Truy vết:** ID-001-FR-013–ID-001-FR-014, ID-001-FR-020–ID-001-FR-021,
      ID-001-FR-025; ID-001-SR-009–ID-001-SR-011, ID-001-SR-014;
      ID-001-AC-015–ID-001-AC-017, ID-001-AC-023.

## API

- [x] **ID-001-T025 — Thêm các DTO của tầng presentation và danh sách trường cho phép ở phản hồi.**
      Hiện thực các DTO đã phê duyệt cho login, callback/exchange Microsoft, refresh, cặp
      token/người dùng đã xác thực/người dùng hiện tại, với các trường bắt buộc, giới hạn độ dài,
      hành vi whitelist toàn cục, chỉ cắt khoảng trắng của MSSV, và không tự bịa biểu thức chính quy
      cho MSSV cũng như không có trường định danh/vai trò/nhà cung cấp/redirect do người gọi điều
      khiển.  
      **Phụ thuộc:** ID-001-T003.  
      **Truy vết:** ID-001-FR-004, ID-001-FR-011, ID-001-FR-020–ID-001-FR-021,
      ID-001-FR-024–ID-001-FR-025; ID-001-SR-001, ID-001-SR-009–ID-001-SR-012;
      ID-001-AC-004, ID-001-AC-011, ID-001-AC-017, ID-001-AC-023.

- [x] **ID-001-T026 — Thay thế controller Auth bằng các thao tác đã phê duyệt.** Chỉ phơi bày login,
      Microsoft start/callback/exchange, refresh, logout được bảo vệ, và `/me` được bảo vệ; gọi đúng
      một use case của tầng application cho mỗi thao tác; ánh xạ các phản hồi/lỗi đã phê duyệt; gỡ bỏ
      register công khai; thêm việc kiểm chứng Bearer ở phía Identity cho các route auth được bảo vệ
      và việc đối chiếu chủ thể khi đăng xuất.  
      **Phụ thuộc:** ID-001-T017–ID-001-T025.  
      **Truy vết:** ID-001-FR-001, ID-001-FR-003, ID-001-FR-006,
      ID-001-FR-013–ID-001-FR-018, ID-001-FR-024–ID-001-FR-025;
      ID-001-AC-001–ID-001-AC-018, ID-001-AC-020, ID-001-AC-023.

- [x] **ID-001-T027 — Cập nhật Swagger/OpenAPI cho contract của Authentication.** Mô tả bảy thao tác
      đã phê duyệt, các schema DTO, yêu cầu Bearer, các redirect, việc đổi mã trong 60 giây, các
      phản hồi thành công, và các mã lỗi công khai đã chuẩn hoá; không phơi bày trường lưu trữ/bảo
      mật nào và không mô tả endpoint Ngoài phạm vi nào.  
      **Phụ thuộc:** ID-001-T025–ID-001-T026.  
      **Truy vết:** Mục API/DTO của kế hoạch; phần tài liệu API của Định nghĩa Hoàn thành.

## Tích hợp API Gateway

- [x] **ID-001-T028 — Căn chỉnh việc định tuyến Authentication và xử lý định danh tin cậy ở Gateway.**
      Gỡ register khỏi danh sách công khai; thêm chính xác các route công khai login/Microsoft/
      refresh; giữ logout và `/me` được bảo vệ; chỉ chấp nhận access token BKPractice hợp lệ và đúng
      loại; tiếp tục loại bỏ các header định danh/vai trò giả mạo và suy ra các giá trị tin cậy từ
      các claim đã xác minh.  
      **Phụ thuộc:** ID-001-T002, ID-001-T026.  
      **Truy vết:** ID-001-FR-001, ID-001-FR-013–ID-001-FR-014;
      ID-001-SR-010–ID-001-SR-011, ID-001-SR-014; ID-001-AC-001,
      ID-001-AC-015–ID-001-AC-016.

- [x] **ID-001-T029 — Chuyển tiếp các redirect OAuth an toàn qua proxy của Gateway.** Bảo toàn header
      `Location` của upstream cho các phản hồi 302 đã phê duyệt, đồng thời tiếp tục bỏ `set-cookie`
      và các header không an toàn, và đảm bảo không bearer token nào xuất hiện trong URL chuyển
      hướng.  
      **Phụ thuộc:** ID-001-T026.  
      **Truy vết:** ID-001-FR-024; ID-001-SR-009, ID-001-SR-015, ID-001-SR-017;
      ID-001-AC-018, ID-001-AC-020.

- [x] **ID-001-T030 — Thêm cơ chế throttling xác thực theo đường dẫn, cấu hình được.** Mở rộng
      throttler Nest hiện có mà không thêm logic nghiệp vụ của Identity: giữ mặc định 120/phút, áp
      dụng 5/phút/IP cho đăng nhập bằng mật khẩu, và 30/phút/IP cho Microsoft start/callback/exchange
      và refresh, dùng TTL/giới hạn một phút cấu hình được và đã kiểm chứng.  
      **Phụ thuộc:** ID-001-T002, ID-001-T028.  
      **Truy vết:** ID-001-SR-003, ID-001-SR-016.

## Messaging

- [x] **N/A — ID-001 không có message, queue, exchange, retry, ACK/NACK hay hành vi DLQ nào của
      RabbitMQ được phê duyệt.** Việc uỷ quyền Microsoft vẫn là HTTPS đồng bộ qua adapter của nó.

## Realtime

- [x] **N/A — ID-001 không có hành vi Socket.IO nào được phê duyệt.** Redis chỉ lưu state OAuth tạm
      thời và các mã dùng một lần; PostgreSQL vẫn là nguồn chân lý cho phiên lưu bền.

## Phân quyền và Bảo mật

- [ ] **ID-001-T031 — Hiện thực việc xử lý lỗi xác thực chuẩn hoá và khả năng quan sát an toàn.**
      Giữ lỗi ở tầng domain/application độc lập với framework; ánh xạ lỗi kiểm tra dữ liệu về mã 400
      hiện có, các thất bại về thông tin đăng nhập/tài khoản/nhà cung cấp/liên kết/refresh về hành vi
      401 chung không cho phép dò tìm, sự cố nhà cung cấp/Redis về 503 an toàn, và các lỗi ngoài dự
      kiến về 500 chuẩn hoá kèm request ID. Bảo toàn tính idempotent của đăng xuất và chỉ ghi log kết
      quả thô, không kèm phần thân request auth hay giá trị nhạy cảm.  
      **Phụ thuộc:** ID-001-T018–ID-001-T030.  
      **Truy vết:** ID-001-FR-005, ID-001-FR-010, ID-001-FR-017–ID-001-FR-020;
      ID-001-SR-001, ID-001-SR-005, ID-001-SR-007, ID-001-SR-009,
      ID-001-SR-012–ID-001-SR-015; ID-001-AC-003, ID-001-AC-009–ID-001-AC-010,
      ID-001-AC-013–ID-001-AC-014, ID-001-AC-017–ID-001-AC-018.

- [ ] **ID-001-T032 — Thực hiện rà soát tập trung về phân quyền và bảo mật của bản triển khai.** Kiểm
      chứng rằng đầu vào công khai không thể tạo tài khoản, gán vai trò/trạng thái, liên kết định
      danh nhà cung cấp tuỳ ý, chọn URL chuyển hướng, hay chèn header tin cậy; chỉ người dùng
      `ACTIVE` nhận token mới; các thao tác được bảo vệ đòi hỏi token đúng mục đích access; token
      refresh/nhà cung cấp không truy cập được API; cấu hình/truyền tải ở production là an toàn;
      access token hết hạn tự nhiên mà không cần danh sách đen.  
      **Phụ thuộc:** ID-001-T013–ID-001-T031.  
      **Truy vết:** Toàn bộ ID-001-SR-001–ID-001-SR-018; ID-001-FR-001–ID-001-FR-026.

## Kiểm thử

- [ ] **ID-001-T033 — Thêm unit test cho tầng application và domain.** Kiểm thử mọi use case đã phê
      duyệt qua các port được mock/in-memory: đăng nhập sinh viên thành công/lỗi chung/bản băm
      giả/trạng thái/họ phiên, các nhánh state và liên kết của Microsoft, việc đổi mã một lần, xoay
      vòng/dùng lại/cách ly của refresh, quyền sở hữu/tính idempotent của logout, và `/me` tối thiểu;
      khẳng định không có lời gọi adapter ngoài ý muốn nào sau khi thất bại.  
      **Phụ thuộc:** ID-001-T004, ID-001-T018–ID-001-T024.  
      **Truy vết:** ID-001-AC-002–ID-001-AC-014, ID-001-AC-020–ID-001-AC-023.

- [ ] **ID-001-T034 — Thêm test cho các adapter hạ tầng.** Kiểm thử việc băm/kiểm tra Argon2 và đường
      dùng bản băm giả, các claim JWT tối thiểu có phân loại/mục đích/TTL, việc kiểm chứng
      tenant/audience/state/nonce/claim của MSAL, TTL 300/60 giây và việc dùng một lần nguyên tử của
      Redis, việc chuyển đổi xung đột của TypeORM, và sự vắng mặt của thông tin đăng nhập thô/token
      nhà cung cấp trong lớp lưu trữ hay log.  
      **Phụ thuộc:** ID-001-T008–ID-001-T016.  
      **Truy vết:** ID-001-SR-001–ID-001-SR-018; ID-001-AC-003,
      ID-001-AC-005–ID-001-AC-013, ID-001-AC-017–ID-001-AC-020.

- [x] **ID-001-T035 — Thêm test unit/integration cho Gateway.** Bao phủ chính xác các đường công khai
      và được bảo vệ, việc register không còn khả dụng, việc từ chối token bị thiếu/sai định dạng/hết
      hạn/sai mục đích, việc loại bỏ header giả mạo, việc suy ra header tin cậy, các giới hạn theo
      đường dẫn, việc chuyển tiếp `Location`, và sự vắng mặt của bearer token trong URL chuyển hướng.  
      **Phụ thuộc:** ID-001-T028–ID-001-T031.  
      **Truy vết:** ID-001-AC-001, ID-001-AC-015–ID-001-AC-018.

- [ ] **ID-001-T036 — Thêm test API/E2E cho Identity.** Bao phủ cả bảy thao tác đã phê duyệt và các
      nhóm kịch bản nghiệm thu: không có register công khai; việc kiểm tra dữ liệu và lỗi chung khi
      đăng nhập bằng MSSV; việc khớp/liên kết/dùng lại/từ chối Microsoft chỉ trong phạm vi trường;
      các trạng thái tài khoản; các claim tối thiểu; việc xoay vòng/từ chối refresh; đăng xuất theo
      họ hiện tại; mã dùng một lần; cách ly nhiều thiết bị; khoanh vùng khi bị dùng lại; `/me` tối
      thiểu; và việc ánh xạ MSSV/email đã được cấp bằng fixture thay vì hiện thực phần import Excel.  
      **Phụ thuộc:** ID-001-T012, ID-001-T026–ID-001-T035.  
      **Truy vết:** Toàn bộ ID-001-AC-001–ID-001-AC-024.

- [ ] **ID-001-T037 — Chạy smoke test trên tenant staging của Microsoft.** Với cấu hình thật không
      đưa vào mã nguồn, kiểm chứng redirect URI/việc đăng ký ứng dụng, việc đăng nhập bằng tenant của
      trường, lần liên kết `emailTruong` đầu tiên, việc tra cứu `tid + oid` ổn định ở các lần sau,
      việc đổi mã mờ, việc từ chối sai tenant, và mức độ sạch của bí mật nhà cung cấp/log; ghi lại
      mọi hành vi chưa kiểm chứng được vì phụ thuộc môi trường.  
      **Phụ thuộc:** ID-001-T020–ID-001-T021, ID-001-T026, ID-001-T029,
      ID-001-T031, ID-001-T036.  
      **Truy vết:** ID-001-FR-006–ID-001-FR-009, ID-001-FR-024;
      ID-001-AC-005–ID-001-AC-009, ID-001-AC-018, ID-001-AC-020.

- [ ] **ID-001-T038 — Gỡ bỏ mã Authentication cũ đã bị thay thế, sau khi các test thay thế đã pass.**
      Xoá DTO/handler register công khai, các DTO đăng nhập bằng email/refresh cũ sau khi các bản
      thay thế đã được nối dây, và `AuthService` nguyên khối chỉ sau khi hành vi tương đương đã phê
      duyệt được bao phủ; kiểm chứng không module nào khác import chúng và không còn đường đăng ký
      công khai nào.  
      **Phụ thuộc:** ID-001-T033–ID-001-T036.  
      **Truy vết:** ID-001-FR-001; ID-001-AC-001; phân loại REMOVE của kế hoạch.

## Tài liệu

- [ ] **ID-001-T039 — Cập nhật tài liệu authentication hướng tới việc triển khai.** Giữ Swagger đồng
      bộ; mô tả các biến môi trường Microsoft/Redis/giới hạn tần suất bắt buộc, cách giao refresh
      token qua JSON, hành vi đăng xuất/dùng lại theo họ hiện tại, cảnh báo về việc áp dụng/hoàn tác
      migration, quy trình smoke test trên staging, và rủi ro còn lại đã được chấp nhận của `123456`.
      Không mô tả các tính năng Ngoài phạm vi như thể đã có sẵn.  
      **Phụ thuộc:** ID-001-T027, ID-001-T030–ID-001-T038.  
      **Truy vết:** Định nghĩa Hoàn thành; mục Khả năng quan sát/Rủi ro của kế hoạch.

## Kiểm chứng

- [ ] **ID-001-T040 — Kiểm chứng việc áp dụng/hoàn tác/áp dụng lại migration.** Trên một cơ sở dữ
      liệu Identity cách ly, chạy `pnpm migration:run:identity`, kiểm tra schema/dữ liệu đã điền bù,
      chạy `pnpm migration:revert:identity`, kiểm chứng phần down, chạy lại migration, và xác nhận
      `synchronize` vẫn đang tắt. Ghi lại các hệ quả phá huỷ dữ liệu của việc revert và mọi trường
      hợp chưa kiểm chứng được.  
      **Phụ thuộc:** ID-001-T011–ID-001-T012, ID-001-T038.  
      **Truy vết:** Chiến lược cơ sở dữ liệu và Định nghĩa Hoàn thành.

- [ ] **ID-001-T041 — Chạy các lệnh kiểm chứng bắt buộc của repository.** Chạy `pnpm lint`,
      `pnpm typecheck`, `pnpm test` và `pnpm build`; chỉ sửa các lỗi thuộc phạm vi, chạy lại cho tới
      khi pass, và ghi lại kết quả chính xác cùng mọi lỗi có sẵn không liên quan.  
      **Phụ thuộc:** ID-001-T037–ID-001-T040.  
      **Truy vết:** Các kiểm tra chất lượng của Định nghĩa Hoàn thành.

## Tuân thủ kiến trúc

- [ ] **ID-001-T042 — Kiểm chứng kiến trúc và quyền sở hữu của service.** Xác nhận tầng Presentation
      chỉ xử lý truyền tải, tầng Application điều phối use case, tầng Domain không phụ thuộc
      NestJS/TypeORM/Redis/JWT/MSAL/HTTP, tầng Infrastructure hiện thực các port cục bộ, module Auth
      chỉ là một composition root, mọi dữ liệu lưu bền đều thuộc `bkpractice_identity`,
      `libs/contracts` chỉ chứa các claim kỹ thuật, và Gateway không chứa logic domain/cơ sở dữ liệu
      của Identity.  
      **Phụ thuộc:** ID-001-T038–ID-001-T041.  
      **Truy vết:** Kiến trúc Identity, các quy tắc phụ thuộc, chiến lược cơ sở dữ liệu, mục Tuân thủ
      kiến trúc của kế hoạch.

## Xác minh cuối cùng

- [ ] **ID-001-T043 — Đối chiếu bản triển khai với đặc tả đã Approved.** Rà soát từng
      ID-001-FR-001–ID-001-FR-026, ID-001-SR-001–ID-001-SR-018 và
      ID-001-AC-001–ID-001-AC-024 với code, test, migration, Swagger và các kết quả kiểm chứng đã ghi
      lại; xác nhận không có hành vi Ngoài phạm vi nào được thêm vào, như đăng nhập Google/người
      ngoài trường, import Excel, Đổi mật khẩu, MFA, OAuth broker, quản lý thiết bị, danh sách đen,
      CQRS; báo cáo mọi sai lệch hoặc hành vi chưa kiểm chứng được.  
      **Phụ thuộc:** ID-001-T039–ID-001-T042.  
      **Truy vết:** Đặc tả đã Approved, Định nghĩa Hoàn thành, toàn bộ yêu cầu và tiêu chí nghiệm thu.

- [ ] **ID-001-T044 — Hoàn tất bàn giao theo SDD.** Cập nhật mọi ô đánh dấu có liên quan một cách
      trung thực, giữ lại các mục N/A đã được biện minh, đính kèm bằng chứng kiểm
      chứng/migration/smoke test, có được sự review của con người, và chỉ chuyển trạng thái đặc tả
      sang `Implemented` rồi `Verified` thông qua quy trình SDD đã phê duyệt.  
      **Phụ thuộc:** ID-001-T043.  
      **Truy vết:** Quy trình SDD và Định nghĩa Hoàn thành.

## Bản sửa đổi 1.1 — Claim quyền

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-29`.

- [x] **ID-001-T045 — Claim `permissions` trong access token.** `JwtBkTokenService` và contract claim
      trong `libs/contracts` thêm `permissions: string[]`; refresh token không đổi.
      **Phụ thuộc:** các task token của ID-001.
      **Truy vết:** ID-001-FR-012, SR-010 (bản 1.1); ID-003-FR-020.

- [x] **ID-001-T046 — Nạp quyền khi phát hành.** Đăng nhập bằng mật khẩu, Microsoft và làm mới phiên
      gọi `EffectivePermissionReader` (ID-003-T046) và đưa kết quả vào claim.
      **Phụ thuộc:** ID-001-T045, ID-003-T046.
      **Truy vết:** ID-001 bản 1.1; ID-003-FR-019, FR-023.

- [x] **ID-001-T047 — Test claim tối thiểu.** Access token chỉ chứa `sub`, `roles`, `permissions`,
      `type`, `iat`, `exp`; không chứa thông tin đăng nhập hay token nhà cung cấp.
      **Phụ thuộc:** ID-001-T046.
      **Truy vết:** ID-001-AC-011 (bản 1.1).

## Bản sửa đổi 1.2 — Cookie access token

- [x] **ID-001-T048 — Cập nhật giao token của Identity.** Login, Microsoft exchange và refresh đặt
      access cookie đã Approved; JSON chỉ giữ userId/refreshToken hoặc refreshToken. Logout xoá
      cookie. Cập nhật DTO/Swagger và giữ use case phát hành token không đổi. Truy vết: FR-027,
      FR-029, SR-019–SR-020, AC-025–AC-026, AC-028.
- [x] **ID-001-T049 — Bảo vệ/ủy quyền cookie ở Gateway.** Chấp nhận cookie hoặc Bearer, kiểm chứng
      token, ưu tiên Bearer tường minh, xoá Cookie thô và chuyển Bearer đã kiểm chứng tới upstream.
      Chỉ forward `Set-Cookie` của route Auth thành công đã duyệt. Truy vết: FR-028, SR-019–SR-020,
      AC-027, AC-030.
- [x] **ID-001-T050 — Chống CSRF cho cookie.** Kiểm tra Origin/Referer theo CORS_ORIGINS cho
      mutation dùng cookie và POST phát hành cookie; test nguồn sai/thiếu và luồng Bearer tường minh.
      Truy vết: FR-030, AC-029.
- [x] **ID-001-T051 — Kiểm thử và bàn giao.** Test login, Microsoft exchange, refresh, logout,
      `/me`, API được bảo vệ, CORS/cookie flags, lỗi/token sai và log; chạy các script pnpm áp dụng,
      đối chiếu spec, cập nhật worked entry. Truy vết: AC-025–AC-030 và Định nghĩa Hoàn thành.
- [x] **ID-001-T052 — Căn chỉnh realtime.** Cho phép Socket.IO xác thực bằng cùng access cookie
      với origin frontend đã cấu hình, giữ token handshake cũ và kiểm tra kết nối sai/hết hạn/sai
      loại. Truy vết: FR-031, AC-031.

## Bảng tổng hợp độ phủ

### Yêu cầu chức năng

| Yêu cầu                     | Công việc triển khai chính                                                              | Công việc kiểm thử/xác minh chính                             |
| --------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| ID-001-FR-001–ID-001-FR-005 | ID-001-T005, ID-001-T008, ID-001-T013, ID-001-T018, ID-001-T026, ID-001-T028            | ID-001-T033, ID-001-T035–ID-001-T036, ID-001-T043             |
| ID-001-FR-006–ID-001-FR-010 | ID-001-T006, ID-001-T009, ID-001-T015–ID-001-T021                                       | ID-001-T033–ID-001-T034, ID-001-T036–ID-001-T037, ID-001-T043 |
| ID-001-FR-011–ID-001-FR-014 | ID-001-T002, ID-001-T014, ID-001-T018, ID-001-T021–ID-001-T022, ID-001-T028             | ID-001-T033–ID-001-T036, ID-001-T043                          |
| ID-001-FR-015–ID-001-FR-019 | ID-001-T007, ID-001-T010, ID-001-T014, ID-001-T022–ID-001-T023                          | ID-001-T012, ID-001-T033–ID-001-T036, ID-001-T043             |
| ID-001-FR-020–ID-001-FR-023 | ID-001-T005, ID-001-T013–ID-001-T014, ID-001-T018, ID-001-T021, ID-001-T023–ID-001-T025 | ID-001-T033–ID-001-T036, ID-001-T043                          |
| ID-001-FR-024–ID-001-FR-026 | ID-001-T010, ID-001-T016, ID-001-T020–ID-001-T024, ID-001-T029                          | ID-001-T012, ID-001-T033–ID-001-T037, ID-001-T043             |

### Yêu cầu bảo mật

| Yêu cầu                     | Công việc triển khai và xác minh                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| ID-001-SR-001–ID-001-SR-003 | ID-001-T013, ID-001-T018, ID-001-T025, ID-001-T030–ID-001-T036, ID-001-T043                                       |
| ID-001-SR-004–ID-001-SR-007 | ID-001-T002, ID-001-T006, ID-001-T009, ID-001-T015, ID-001-T019–ID-001-T020, ID-001-T031–ID-001-T037, ID-001-T043 |
| ID-001-SR-008–ID-001-SR-010 | ID-001-T007, ID-001-T010, ID-001-T014, ID-001-T016, ID-001-T022–ID-001-T026, ID-001-T031–ID-001-T036, ID-001-T043 |
| ID-001-SR-011–ID-001-SR-014 | ID-001-T003, ID-001-T008, ID-001-T014, ID-001-T018–ID-001-T026, ID-001-T028, ID-001-T031–ID-001-T036, ID-001-T043 |
| ID-001-SR-015–ID-001-SR-018 | ID-001-T010, ID-001-T015–ID-001-T016, ID-001-T019–ID-001-T023, ID-001-T029–ID-001-T037, ID-001-T043               |

### Tiêu chí nghiệm thu

| Tiêu chí nghiệm thu         | Công việc xác minh                                                          |
| --------------------------- | --------------------------------------------------------------------------- |
| ID-001-AC-001–ID-001-AC-004 | ID-001-T033, ID-001-T035–ID-001-T036, ID-001-T043                           |
| ID-001-AC-005–ID-001-AC-009 | ID-001-T012, ID-001-T033–ID-001-T037, ID-001-T043                           |
| ID-001-AC-010–ID-001-AC-014 | ID-001-T012, ID-001-T033–ID-001-T036, ID-001-T043                           |
| ID-001-AC-015–ID-001-AC-018 | ID-001-T034–ID-001-T037, ID-001-T043                                        |
| ID-001-AC-019–ID-001-AC-020 | ID-001-T013, ID-001-T016, ID-001-T033–ID-001-T037, ID-001-T043              |
| ID-001-AC-021–ID-001-AC-022 | ID-001-T010, ID-001-T012, ID-001-T033–ID-001-T036, ID-001-T043              |
| ID-001-AC-023–ID-001-AC-024 | ID-001-T005, ID-001-T008, ID-001-T024–ID-001-T026, ID-001-T036, ID-001-T043 |

## Tham chiếu Định nghĩa Hoàn thành

ID-001 chỉ Hoàn thành khi mọi mục có liên quan trong
[`specs/00-system/definition-of-done.md`](../../00-system/definition-of-done.md) đều được thoả mãn,
ID-001-T001–ID-001-T044 đã hoàn thành hoặc được đánh dấu N/A một cách hợp lệ, mọi bằng chứng kiểm
chứng đã được ghi lại, và quy trình SDD được con người phê duyệt đã chuyển trạng thái đặc tả. Chỉ
hoàn thành phần code là chưa đủ.

## Bổ sung Lecturer login ngày 2026-10-25

- [x] Đổi use case thành LoginWithPassword, thêm repository findLecturerByEmail và cập nhật tất cả caller/barrel/test.
- [x] DTO/Swagger/HTTP nhận đúng một studentId hoặc email; giữ web/mobile và login Student.
- [x] E2E PostgreSQL kiểm chứng Lecturer email/password, Student MSSV, Student bị từ chối ở nhánh email, XOR identifier và Lecturer LOCKED. Toàn suite 132 tests pass/2 skip; full quality gates vẫn bị chặn bởi lỗi Learning data-source ngoài phạm vi.
