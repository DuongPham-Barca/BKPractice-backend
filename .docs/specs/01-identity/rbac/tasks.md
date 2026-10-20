# ID-003 Công việc triển khai RBAC

## Trạng thái

Approved — Sẵn sàng triển khai

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-01`.

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `0.3`  
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-01`

Mọi công việc triển khai đều bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` sau khi cả phần
triển khai lẫn phần kiểm chứng được liệt kê đều hoàn tất. Giữ danh sách này đồng bộ với bản triển khai
thực tế; đừng đánh dấu hoàn thành chỉ vì một file đã tồn tại.

## Chuẩn bị / Phân tích tái sử dụng

- [ ] **ID-003-T001 — Xác nhận lại nền tảng triển khai.** Khảo sát trạng thái Git, spec/plan RBAC đã
      Approved, kiến trúc Identity, kiến trúc Gateway, các quy tắc phụ thuộc, các
      entity/datasource/migration Identity hiện tại, ngữ cảnh principal của Auth, việc định tuyến
      `/api/roles` ở Gateway và các test hiện có. Báo cáo mọi xung đột trước khi thay đổi mã nguồn.  
      **Phụ thuộc:** Không có.  
      **Truy vết:** Quy trình SDD; mục Ảnh hưởng tới mã nguồn hiện có của kế hoạch; Định nghĩa Hoàn thành.

- [ ] **ID-003-T002 — Xác nhận các tài liệu đã Approved và phạm vi.** Kiểm chứng rằng `spec.md` và
      `plan.md` đều ở trạng thái `Approved`, mục Câu hỏi mở đã trống, và không công việc triển khai
      nào đưa vào vai trò tuỳ biến, IAM động, CRUD vai trò, service audit, OAuth/MFA hay một
      microservice phân quyền khác.  
      **Phụ thuộc:** ID-003-T001.  
      **Truy vết:** ID-003-FR-002, ID-003-FR-016; mục Ngoài phạm vi; Định nghĩa Hoàn thành.

- [ ] **ID-003-T003 — Xác nhận các contract tái dùng được của Identity và Gateway.** Xác định ngữ
      cảnh principal/token đã xác minh của ID-001, phép kiểm tra trạng thái tài khoản, lớp lưu trữ
      `RoleName`/quyền hiện có, bootstrap kiểm tra dữ liệu/lỗi/Swagger toàn cục, việc làm sạch header
      và chuyển tiếp `/api/roles` ở Gateway. Tái dùng các thành phần tương thích và ghi lại mọi seam
      còn thiếu, thay vì tạo một cơ chế xác thực trùng lặp.  
      **Phụ thuộc:** ID-003-T001–ID-003-T002.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-005, ID-003-FR-011, ID-003-FR-013; ID-003-SR-002,
      ID-003-SR-007–ID-003-SR-008; mục Ảnh hưởng tới mã nguồn hiện có của kế hoạch.

- [ ] **ID-003-T004 — Xác nhận các ranh giới service và cơ sở dữ liệu.** Ghi nhận rằng vai trò, quyền
      và các phép gán vẫn nằm trong `bkpractice_identity`; Learning, Submission, Community và Profile
      giữ các quy tắc hành động/tài nguyên/sở hữu của riêng mình; không được đưa vào datasource, khoá
      ngoại, repository hay thực thể nghiệp vụ xuyên service nào.  
      **Phụ thuộc:** ID-003-T001.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-012, ID-003-FR-016; ID-003-SR-008; AC-013, AC-016.

## Định nghĩa chuẩn tắc về vai trò và quyền

- [ ] **ID-003-T005 — Thiết lập một định nghĩa vai trò chuẩn tắc duy nhất.** Tạo hoặc căn chỉnh kiểu
      vai trò độc lập với framework cho đúng `STUDENT`, `LECTURER` và `ADMIN`, và ánh xạ enum/model
      lưu trữ TypeORM hiện có sang nó mà không thay đổi enum trong cơ sở dữ liệu. Từ chối các vai trò
      nền tảng do người gọi tạo hoặc không xác định.  
      **Phụ thuộc:** ID-003-T003–ID-003-T004.  
      **Truy vết:** ID-003-FR-002; ID-003-SR-004, ID-003-SR-006; AC-014, AC-016.

- [ ] **ID-003-T006 — Thêm phần xử lý mã quyền ổn định.** Hiện thực ranh giới domain/kiểm tra tối
      thiểu cho quy ước định danh quyền `resource:action` đã phê duyệt. Giữ các định nghĩa quyền
      thuộc sở hữu của Identity và ở dạng tĩnh; không bịa ra một danh mục đầy đủ cho
      Learning/Submission/Community và không thêm CRUD vai trò/quyền lúc chạy.  
      **Phụ thuộc:** ID-003-T005.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-004; ID-003-SR-004; AC-001, AC-004, AC-014.

- [ ] **ID-003-T007 — Định nghĩa contract principal tin cậy.** Tái dùng contract của ID-001 khi có
      sẵn; nếu không, chỉ tạo hình dạng principal kỹ thuật cần dùng xuyên các ranh giới (`userId`,
      các vai trò tin cậy và ngữ cảnh trạng thái tài khoản đã phê duyệt). Loại trừ mật khẩu, token,
      claim của nhà cung cấp và các entity lưu trữ.  
      **Phụ thuộc:** ID-003-T003, ID-003-T005.  
      **Truy vết:** ID-003-FR-005, ID-003-FR-011; ID-003-SR-002, ID-003-SR-007, ID-003-SR-009.

## Quy tắc và bất biến của domain

- [ ] **ID-003-T008 — Hiện thực chính sách quyết định phân quyền.** Thêm chính sách độc lập với
      framework cho việc khớp vai trò/quyền tường minh, phép hợp khi có nhiều vai trò, đầu vào là
      chính sách của tính năng, quyền sở hữu như một mối quan tâm riêng của tính năng, và mặc định từ
      chối với chính sách bị thiếu/không xác định/mơ hồ.  
      **Phụ thuộc:** ID-003-T005–ID-003-T007.  
      **Truy vết:** ID-003-FR-003–ID-003-FR-008, ID-003-FR-012; ID-003-SR-003–ID-003-SR-004,
      ID-003-SR-006, ID-003-SR-010; AC-001–AC-006, AC-012, AC-014.

- [ ] **ID-003-T009 — Hiện thực chính sách gán vai trò.** Thực thi rằng chỉ một `ADMIN` có thẩm quyền
      mới được xem, gán hay thu hồi vai trò; các thao tác xuyên người dùng chỉ nhắm tới `STUDENT`
      hoặc `LECTURER`; không người gọi nào được tự nâng quyền; và dữ liệu request của Profile/Auth
      không thể thay đổi RBAC. Giữ các ánh xạ vai trò-quyền ở dạng tĩnh.  
      **Phụ thuộc:** ID-003-T005, ID-003-T007–ID-003-T008.  
      **Truy vết:** ID-003-FR-009–ID-003-FR-012, ID-003-FR-015; ID-003-SR-001–ID-003-SR-006;
      AC-007–AC-009, AC-012.

- [ ] **ID-003-T010 — Hiện thực tính idempotent và các bất biến về Admin cuối cùng.** Biến việc gán
      một vai trò đã có và việc thu hồi `STUDENT`/`LECTURER` vắng mặt thành các thao tác no-op thành
      công. Cho phép một Admin tự thu hồi vai trò `ADMIN` chỉ khi vẫn còn một Admin khác, và từ chối
      mọi thao tác sẽ gỡ Admin cuối cùng. Giữ bất biến này độc lập với mã DTO/controller.  
      **Phụ thuộc:** ID-003-T009.  
      **Truy vết:** ID-003-FR-010, ID-003-FR-010a; ID-003-SR-001, ID-003-SR-005a; AC-008a–AC-008d.

- [ ] **ID-003-T011 — Thêm test cho chính sách domain.** Kiểm thử các vai trò chuẩn tắc, việc kiểm
      tra mã quyền, phép hợp nhiều vai trò, mặc định từ chối, việc quản lý vai trò chỉ dành cho
      Admin, các phép cấp Admin bị cấm, các quy tắc tự thu hồi, việc bảo vệ Admin cuối cùng và các
      thao tác idempotent, không phụ thuộc framework hay lớp lưu trữ.  
      **Phụ thuộc:** ID-003-T006, ID-003-T008–ID-003-T010.  
      **Truy vết:** ID-003-FR-002–ID-003-FR-010a; ID-003-SR-001, ID-003-SR-004–ID-003-SR-006;
      AC-001–AC-008d, AC-014.

## Port và use case của tầng application

- [ ] **ID-003-T012 — Chỉ định nghĩa các port đã lập kế hoạch.** Thêm các port `RbacRepository`,
      `IdentityAccountContext`, `TransactionRunner` và `AuthorizationPrincipalProvider` (hoặc tái
      dùng các port tương thích của ID-001). Giữ các port không chứa TypeORM, NestJS, HTTP và các
      kiểu phản hồi của Gateway; không thêm trừu tượng hoá repository/CQRS chung chung.  
      **Phụ thuộc:** ID-003-T007–ID-003-T010.  
      **Truy vết:** Mục Tầng application / Use case và Tuân thủ kiến trúc của kế hoạch; ID-003-FR-001,
      ID-003-FR-004, ID-003-FR-011.

- [ ] **ID-003-T013 — Hiện thực `GetUserRoles`.** Điều phối việc phân quyền Admin, tra cứu user đích
      và đầu ra vai trò an toàn. Suy ra định danh tác nhân từ principal tin cậy, chỉ trả về `userId`
      đích và tên các vai trò, và ánh xạ hành vi không tìm thấy/bị từ chối qua các lỗi hiện có.  
      **Phụ thuộc:** ID-003-T009, ID-003-T012.  
      **Truy vết:** ID-003-FR-009–ID-003-FR-011; ID-003-SR-001–ID-003-SR-003; AC-008c, AC-012.

- [ ] **ID-003-T014 — Hiện thực `AssignRoleToUser`.** Điều phối việc phân quyền chỉ dành cho Admin,
      sự tồn tại của đích, danh sách cho phép `STUDENT`/`LECTURER`, chính sách không-cấp-Admin, việc
      lưu trữ idempotent và đầu ra state kết quả ở dạng an toàn. Không nhận các trường vai trò hay
      định danh của tác nhân từ request.  
      **Phụ thuộc:** ID-003-T009–ID-003-T012.  
      **Truy vết:** ID-003-FR-009–ID-003-FR-010; ID-003-SR-001, ID-003-SR-005, ID-003-SR-005a;
      AC-007–AC-008d.

- [ ] **ID-003-T015 — Hiện thực `RevokeRoleFromUser`.** Điều phối việc phân quyền chỉ dành cho Admin,
      việc kiểm tra đích và việc thu hồi idempotent `STUDENT`/`LECTURER` cho mọi đích, kể cả chính
      tác nhân. Chỉ cho phép tự thu hồi `ADMIN` qua ngoại lệ được kiểm soát, và từ chối việc gỡ Admin
      cuối cùng trước khi lớp lưu trữ thay đổi.  
      **Phụ thuộc:** ID-003-T009–ID-003-T012.  
      **Truy vết:** ID-003-FR-009–ID-003-FR-010a; ID-003-SR-001, ID-003-SR-005a; AC-008b–AC-008d.

- [ ] **ID-003-T016 — Hiện thực `EvaluateAuthorization` nội bộ.** Phơi bày một seam ở tầng application
      có kiểu rõ ràng, để đánh giá một principal tin cậy đối chiếu với một quyền ổn định và một kết
      quả sở hữu tuỳ chọn do tính năng cung cấp. Giữ nó ở dạng nội bộ; không tạo một endpoint
      `/authorize` công khai hay một lời gọi từ xa cho mọi request.  
      **Phụ thuộc:** ID-003-T008, ID-003-T012.  
      **Truy vết:** ID-003-FR-003–ID-003-FR-008, ID-003-FR-012; ID-003-SR-003–ID-003-SR-004;
      AC-001–AC-006, AC-012–AC-014.

## Lưu trữ

- [ ] **ID-003-T017 — Hiện thực adapter repository RBAC dùng TypeORM.** Tái dùng các model quan hệ
      Role, Permission và User hiện có để đọc vai trò/quyền hiệu lực và thực hiện các thao tác
      gán/thu hồi tường minh. Giữ mọi truy vấn trong `bkpractice_identity`; không spread body request
      vào entity và không import datasource của service khác.  
      **Phụ thuộc:** ID-003-T012–ID-003-T016.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-003–ID-003-FR-004, ID-003-FR-009–ID-003-FR-010;
      ID-003-SR-005, ID-003-SR-008; AC-001, AC-006, AC-008c–AC-008d, AC-016.

- [ ] **ID-003-T018 — Thêm cơ chế bảo vệ Admin cuối cùng trong transaction.** Hiện thực chiến lược
      transaction/khoá an toàn ở mức cơ sở dữ liệu cho việc Admin tự thu hồi và các thay đổi vai trò
      đồng thời. Đảm bảo phép đếm Admin cuối cùng được kiểm tra và thay đổi được commit một cách
      nguyên tử, có rollback khi thất bại.  
      **Phụ thuộc:** ID-003-T010, ID-003-T012, ID-003-T017.  
      **Truy vết:** ID-003-FR-010a; ID-003-SR-005a, ID-003-SR-010; AC-008b, AC-014.

- [ ] **ID-003-T019 — Thêm test lưu trữ và đồng thời.** Kiểm chứng các quan hệ schema hiện có, tính
      duy nhất tổ hợp, việc tra cứu vai trò-quyền hiệu lực, việc rollback khi không tìm thấy đích,
      các thao tác idempotent trên bảng nối, và việc bảo vệ Admin cuối cùng khi đồng thời. Xác nhận
      không đưa vào truy cập cơ sở dữ liệu xuyên service nào.  
      **Phụ thuộc:** ID-003-T017–ID-003-T018.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-003, ID-003-FR-010a, ID-003-FR-016;
      ID-003-SR-005a, ID-003-SR-008; AC-006, AC-008b–AC-008d, AC-016.

## Cơ sở dữ liệu / Migration

> **N/A cho ID-003 v1:** Kế hoạch đã Approved xác nhận rằng migration Identity hiện có đã tạo enum
> vai trò tĩnh, các bảng roles, permissions, `user_roles` và `role_permissions` cùng tính duy nhất và
> khoá ngoại nội bộ cần thiết. Không có kế hoạch cho migration schema, migration seed hay việc điền
> bù dữ liệu người dùng hiện có. Công việc kiểm chứng bên dưới xác nhận quyết định này khi triển khai.

- [ ] **ID-003-T020 — Kiểm chứng schema Identity hiện có và chiến lược migration.** Khảo sát
      migration nền tảng và một cơ sở dữ liệu cách ly để xác nhận các vai trò tĩnh được seed, tính
      duy nhất tổ hợp của phép gán, quyền sở hữu nội bộ và `synchronize: false`. Nếu phát hiện một
      ràng buộc còn thiếu, hãy dừng lại và báo cáo nhu cầu về một migration được rà soát riêng, thay
      vì âm thầm thay đổi schema.  
      **Phụ thuộc:** ID-003-T003–ID-003-T004, ID-003-T017.  
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu/Migration của kế hoạch; ID-003-FR-001, ID-003-FR-002,
      ID-003-FR-016; ID-003-SR-008; AC-016.

- [ ] **ID-003-T021 — Kiểm chứng danh mục tĩnh và các ranh giới cấp tài khoản.** Xác nhận ba vai trò
      tĩnh vẫn được seed, các định nghĩa quyền không phải CRUD lúc chạy, các sinh viên đã import nhận
      `STUDENT` qua luồng cấp tài khoản tin cậy của ID-001, và ID-003 không phân tích Excel, không
      tạo người dùng và không bootstrap tài khoản Admin qua một endpoint công khai.  
      **Phụ thuộc:** ID-003-T020.  
      **Truy vết:** ID-003-FR-001–ID-003-FR-002, ID-003-FR-016; mục Ngoài phạm vi; AC-016.

## Tích hợp Authentication

- [ ] **ID-003-T022 — Tái dùng principal đã xác thực của ID-001.** Gắn RBAC vào principal ID-001/
      Gateway đã xác minh và ngữ cảnh trạng thái tài khoản. Phân biệt việc xác thực bị thiếu/không
      hợp lệ (`401`) với việc phân quyền không đủ (`403`); không xây một luồng JWT, Microsoft hay
      refresh token thứ hai.  
      **Phụ thuộc:** ID-003-T003, ID-003-T007, ID-003-T012.  
      **Truy vết:** ID-003-FR-005, ID-003-FR-011, ID-003-FR-013–ID-003-FR-014;
      ID-003-SR-002, ID-003-SR-007, ID-003-SR-010; AC-003, AC-005, AC-010–AC-011, AC-013.

- [ ] **ID-003-T023 — Thêm tích hợp guard ngữ cảnh tin cậy ở phía Identity.** Tái dùng việc kiểm
      chứng token của ID-001 hoặc adapter ngữ cảnh đã phê duyệt của nó cho các route RBAC được bảo
      vệ. Từ chối các request trực tiếp hoặc định tuyến sai mà chỉ dựa vào `x-auth-user-id`,
      `x-auth-roles` hay metadata tương đương do client cung cấp.  
      **Phụ thuộc:** ID-003-T022.  
      **Truy vết:** ID-003-FR-006, ID-003-FR-011; ID-003-SR-002–ID-003-SR-003, ID-003-SR-010;
      AC-003, AC-005, AC-013–AC-014.

- [ ] **ID-003-T024 — Kiểm chứng ngữ nghĩa token khi đổi vai trò.** Xác nhận rằng việc gán/thu hồi
      vai trò không làm thay đổi các access token ID-001 đã phát hành, trong khi các token mới phát
      hành dùng state vai trò đã phê duyệt hiện tại và các quy tắc về trạng thái tài khoản. Không
      thêm danh sách đen phân tán.  
      **Phụ thuộc:** ID-003-T022–ID-003-T023.  
      **Truy vết:** ID-003-FR-013–ID-003-FR-014; ID-003-SR-007; AC-010–AC-011.

## API / Presentation

- [ ] **ID-003-T025 — Tạo các DTO và phần kiểm tra dữ liệu cho việc quản lý vai trò.** Thêm DTO
      request gán, phần ánh xạ vai trò trên đường dẫn, và các DTO phản hồi an toàn cho thao tác vai
      trò đã lập kế hoạch. Chỉ cho phép các giá trị vai trò chuẩn tắc, từ chối các trường lạ, và
      không bao giờ nhận định danh tác nhân, vai trò tác nhân, quyền, trạng thái tài khoản hay claim
      của token từ client.  
      **Phụ thuộc:** ID-003-T005–ID-003-T006, ID-003-T012.  
      **Truy vết:** ID-003-FR-002, ID-003-FR-006, ID-003-FR-009–ID-003-FR-011;
      ID-003-SR-002, ID-003-SR-009; AC-005, AC-014–AC-015.

- [ ] **ID-003-T026 — Hiện thực các route của controller RBAC.** Chỉ thêm các thao tác quản lý vai
      trò đã phê duyệt: `GET /api/roles/users/:userId`, `POST /api/roles/users/:userId` và
      `DELETE /api/roles/users/:userId/:role`. Gọi đúng một thao tác application cho mỗi request, suy
      ra tác nhân từ principal tin cậy, và giữ controller không chứa logic nghiệp vụ/lưu trữ.  
      **Phụ thuộc:** ID-003-T013–ID-003-T016, ID-003-T023, ID-003-T025.  
      **Truy vết:** ID-003-FR-006, ID-003-FR-009–ID-003-FR-011; ID-003-SR-001–ID-003-SR-003;
      AC-002–AC-005, AC-007–AC-008d, AC-012.

- [ ] **ID-003-T027 — Ánh xạ lỗi và các phản hồi an toàn.** Ánh xạ các lỗi domain/application về các
      quy ước `400`/`401`/`403`/`404`/xung đột hiện có của Identity/Gateway. Chỉ trả về state gán vai
      trò/người dùng ở dạng an toàn; bảo toàn thành công idempotent và không bao giờ phơi bày phần
      nội bộ của chính sách, mật khẩu, bản băm, dữ liệu nhà cung cấp hay token.  
      **Phụ thuộc:** ID-003-T013–ID-003-T016, ID-003-T025–ID-003-T026.  
      **Truy vết:** ID-003-FR-009–ID-003-FR-011; ID-003-SR-009–ID-003-SR-010;
      AC-002–AC-005, AC-008a–AC-008d, AC-014–AC-015.

- [ ] **ID-003-T028 — Nối dây module RBAC tại composition root của Identity.** Đăng ký các chính sách
      domain, các use case của tầng application, các adapter TypeORM, guard/ngữ cảnh principal và
      controller trong `IdentityServiceModule`/module RBAC. Bảo toàn các module Auth/Profile hiện có
      và tránh phụ thuộc vòng.  
      **Phụ thuộc:** ID-003-T012–ID-003-T027.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-016; mục Tuân thủ kiến trúc của kế hoạch; AC-016.

- [ ] **ID-003-T029 — Cập nhật metadata Swagger/OpenAPI.** Mô tả ba route quản lý vai trò, các yêu
      cầu Bearer/Admin, enum của request, hình dạng phản hồi an toàn và các mã lỗi liên quan, theo
      các quy ước Swagger hiện có của Identity. Không phơi bày các entity lưu trữ hay bí mật nào.  
      **Phụ thuộc:** ID-003-T025–ID-003-T028.  
      **Truy vết:** Phần tài liệu API của Định nghĩa Hoàn thành; ID-003-FR-009–ID-003-FR-010;
      ID-003-SR-009; AC-008c, AC-008d, AC-015.

## API Gateway và ngữ cảnh xuyên service

- [ ] **ID-003-T030 — Kiểm chứng phần tích hợp `/api/roles` ở Gateway.** Xác nhận route Gateway hiện
      có chuyển tiếp mọi thao tác RBAC tới Identity, bảo vệ chúng như các route không công khai, loại
      bỏ các header định danh giả mạo và chỉ chuyển tiếp ngữ cảnh đã xác minh. Chỉ sửa Gateway nếu
      phát hiện một vấn đề tương thích hẹp ở tầng truyền tải; không thêm logic nghiệp vụ về vai trò
      ở đó.  
      **Phụ thuộc:** ID-003-T023, ID-003-T026.  
      **Truy vết:** ID-003-FR-006, ID-003-FR-011; ID-003-SR-002–ID-003-SR-003; AC-003, AC-005, AC-013.

- [ ] **ID-003-T031 — Kiểm chứng contract principal kỹ thuật xuyên service.** Nếu contract ID-001 đã
      phê duyệt đòi hỏi, chỉ export hình dạng định danh principal/vai trò trung tính về ngữ cảnh từ
      `libs/contracts`. Xác nhận Learning, Submission và Community tiêu thụ ngữ cảnh tin cậy và giữ
      khâu thực thi hành động/tài nguyên/sở hữu cuối cùng ở phía mình; không import entity của
      Identity và không truy vấn `bkpractice_identity`.  
      **Phụ thuộc:** ID-003-T007, ID-003-T030.  
      **Truy vết:** ID-003-FR-011–ID-003-FR-012, ID-003-FR-016; ID-003-SR-003, ID-003-SR-008;
      AC-005, AC-013, AC-016.

## Kiểm chứng bảo mật và ranh giới

- [ ] **ID-003-T032 — Thêm test bảo mật về leo thang đặc quyền.** Kiểm chứng rằng Sinh viên không thể
      cấp Lecturer/Admin, Giảng viên không thể cấp Admin, Admin không thể cấp Admin cho một User
      khác, body/header của client không thể thay đổi vai trò của tác nhân, và các thao tác
      Profile/Auth không thể thay đổi RBAC.  
      **Phụ thuộc:** ID-003-T014–ID-003-T016, ID-003-T023, ID-003-T026.  
      **Truy vết:** ID-003-FR-009–ID-003-FR-011, ID-003-FR-015; ID-003-SR-001–ID-003-SR-003,
      ID-003-SR-005–ID-003-SR-006; AC-005, AC-007–AC-009, AC-012.

- [ ] **ID-003-T033 — Thêm test về bảo vệ Admin và tính idempotent.** Kiểm chứng rằng việc gỡ Admin
      cuối cùng bị từ chối, việc Admin tự thu hồi vai trò `ADMIN` chỉ thành công khi còn một Admin
      khác, Admin có thể thu hồi idempotent `STUDENT`/`LECTURER` khỏi một đích được phép, việc gán
      lặp lại không tạo bản trùng lặp, và việc thu hồi một vai trò vắng mặt là một no-op an toàn.  
      **Phụ thuộc:** ID-003-T018–ID-003-T019, ID-003-T026.  
      **Truy vết:** ID-003-FR-010–ID-003-FR-010a; ID-003-SR-005a, ID-003-SR-010;
      AC-008a–AC-008d.

- [ ] **ID-003-T034 — Kiểm chứng trạng thái tài khoản và các ranh giới thất bại.** Kiểm thử rằng hành
      vi `LOCKED`/`PENDING` vẫn do ID-001 quản lý, các principal không hợp lệ/bị thiếu thất bại theo
      hướng đóng, các request chưa xác thực nhận `401`, quyền không đủ nhận `403`, và không vai trò
      Admin nào đi vòng qua các quy tắc về trạng thái hay quyền sở hữu của tính năng.  
      **Phụ thuộc:** ID-003-T008, ID-003-T022–ID-003-T027.  
      **Truy vết:** ID-003-FR-005, ID-003-FR-007–ID-003-FR-008, ID-003-FR-013;
      ID-003-SR-004, ID-003-SR-006, ID-003-SR-010; AC-002–AC-004, AC-011–AC-014.

- [ ] **ID-003-T035 — Kiểm chứng đầu ra và log an toàn với dữ liệu nhạy cảm.** Kiểm tra các DTO phản
      hồi, phần ánh xạ lỗi và log để đảm bảo không mật khẩu/bản băm, JWT/refresh token, thông tin xác
      thực nhà cung cấp, header auth thô hay dữ liệu bảng quyền không cần thiết nào bị phơi bày.  
      **Phụ thuộc:** ID-003-T027–ID-003-T029.  
      **Truy vết:** ID-003-SR-009; AC-015.

## Kiểm thử

- [ ] **ID-003-T036 — Hoàn thiện độ phủ unit test và ánh xạ yêu cầu.** Hợp nhất các test domain và
      application cho từ vựng vai trò, việc đánh giá quyền, mặc định từ chối, việc gán chỉ dành cho
      Admin, chính sách Admin cuối cùng, tính idempotent và các tương tác với token/trạng thái. Liên
      kết mỗi test với mã FR/SR/AC của nó.  
      **Phụ thuộc:** ID-003-T011, ID-003-T013–ID-003-T016, ID-003-T032–ID-003-T034.  
      **Truy vết:** Mọi nhóm FR/SR/AC của ID-003 có liên quan trong ma trận truy vết bên dưới.

- [ ] **ID-003-T037 — Hoàn thiện test lưu trữ/integration.** Chạy repository RBAC trên một cơ sở dữ
      liệu PostgreSQL Identity cách ly, kiểm chứng các phép join vai trò/quyền và hành vi transaction,
      và xác nhận quyền sở hữu/tính duy nhất của schema với `synchronize: false`.  
      **Phụ thuộc:** ID-003-T019–ID-003-T021.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-003, ID-003-FR-010a, ID-003-FR-016; AC-006,
      AC-008b–AC-008d, AC-016.

- [ ] **ID-003-T038 — Hoàn thiện test API/Gateway và contract.** Thực thi các request quản lý vai trò
      được phép và bị từ chối qua Gateway, việc giả mạo header, hành vi phân biệt chưa-xác-thực với
      bị-cấm, các phản hồi an toàn, tính idempotent, và việc truyền principal tin cậy.  
      **Phụ thuộc:** ID-003-T026–ID-003-T031, ID-003-T035.  
      **Truy vết:** ID-003-FR-005–ID-003-FR-011; ID-003-SR-001–ID-003-SR-003,
      ID-003-SR-009–ID-003-SR-010; AC-002–AC-005, AC-007–AC-008d, AC-013–AC-015.

## Messaging / Realtime

> **N/A:** ID-003 không có event RabbitMQ, luồng Socket.IO hay state phân quyền trên Redis nào được
> phê duyệt. Không tạo công việc messaging/realtime nào. Các thay đổi vai trò là transaction đồng bộ
> của Identity và việc hết hạn token hiện có của ID-001 vẫn là quyết định.

## Kiểm chứng

- [ ] **ID-003-T039 — Chạy các lệnh kiểm chứng của repository bằng pnpm.** Sau khi triển khai, khảo
      sát `package.json` và chạy các script thật hiện có: `pnpm lint`, `pnpm typecheck`,
      `pnpm test` và `pnpm build`. Ghi lại các lỗi và hành vi chưa kiểm chứng được thay vì che lỗi.  
      **Phụ thuộc:** ID-003-T036–ID-003-T038.  
      **Truy vết:** Định nghĩa Hoàn thành; mục Chiến lược kiểm thử của kế hoạch.

- [ ] **ID-003-T040 — Rà soát Swagger và tài liệu vận hành.** Xác nhận tài liệu API quản lý vai trò,
      hành vi ghi log/correlation an toàn, điều kiện tiên quyết về bootstrap Admin, và các quyết định
      không-migration/không-messaging đều được ghi lại chính xác mà không thêm phạm vi tính năng mới.  
      **Phụ thuộc:** ID-003-T021, ID-003-T029, ID-003-T035, ID-003-T039.  
      **Truy vết:** Định nghĩa Hoàn thành; mục Khả năng quan sát/Rủi ro của kế hoạch.

## Tuân thủ kiến trúc

- [ ] **ID-003-T041 — Kiểm chứng tuân thủ Clean Architecture của Identity.** Rà soát mã nguồn cuối
      cùng đối chiếu với kế hoạch: presentation chỉ xử lý truyền tải, application điều phối các use
      case/port, domain sở hữu các bất biến của RBAC, infrastructure hiện thực các adapter
      TypeORM/auth, và không tầng nào import một hiện thực bị cấm.  
      **Phụ thuộc:** ID-003-T028, ID-003-T036–ID-003-T040.  
      **Truy vết:** ID-003-FR-001, ID-003-FR-016; ID-003-SR-003, ID-003-SR-008, ID-003-SR-010;
      AC-016; mục Tuân thủ kiến trúc của kế hoạch.

- [ ] **ID-003-T042 — Kiểm chứng tuân thủ ranh giới Gateway và service.** Xác nhận Gateway không chứa
      lớp lưu trữ/logic nghiệp vụ của RBAC, các service nghiệp vụ vẫn giữ khâu phân quyền hành
      động/tài nguyên/sở hữu cuối cùng, không tồn tại truy cập cơ sở dữ liệu xuyên service, và
      `libs/` không chứa thực thể nghiệp vụ hay repository nào của Identity.  
      **Phụ thuộc:** ID-003-T030–ID-003-T031, ID-003-T041.  
      **Truy vết:** ID-003-FR-006, ID-003-FR-011–ID-003-FR-012, ID-003-FR-016;
      ID-003-SR-003, ID-003-SR-008; AC-013, AC-016.

## Xác minh đặc tả cuối cùng

- [ ] **ID-003-T043 — Đối chiếu bản triển khai với đặc tả đã Approved.** Kiểm tra từng Yêu cầu chức
      năng, Yêu cầu bảo mật và Tiêu chí nghiệm thu; kiểm chứng mô hình ba vai trò tĩnh/nhiều vai trò,
      việc quản lý chỉ dành cho Admin, việc không cấp Admin cho người khác, việc bảo vệ Admin cuối
      cùng, tính idempotent, ngữ nghĩa token/trạng thái, hành vi lỗi, các loại trừ Ngoài phạm vi, các
      test và việc tuân thủ kiến trúc. Ghi lại các sai lệch hoặc điểm nghẽn; đừng viết lại đặc tả đã
      Approved để bản triển khai trông có vẻ tuân thủ.  
      **Phụ thuộc:** ID-003-T039–ID-003-T042.  
      **Truy vết:** Toàn bộ ID-003-FR-001–ID-003-FR-016, ID-003-SR-001–ID-003-SR-010 và
      ID-003-AC-001–ID-003-AC-016; Định nghĩa Hoàn thành.

- [ ] **ID-003-T044 — Đồng bộ trạng thái công việc và trạng thái review.** Chỉ đánh dấu `[x]` các
      công việc đã kiểm chứng, giữ các phần bị chặn/dở dang ở `[ ]`, ghi lại kết quả kiểm chứng và
      các rủi ro còn lại, và yêu cầu review có thẩm quyền trước khi đổi trạng thái đặc tả sang
      `Implemented` hoặc `Verified`.  
      **Phụ thuộc:** ID-003-T043.  
      **Truy vết:** Quy trình SDD; Định nghĩa Hoàn thành.

## Bản sửa đổi 0.4 — Truyền quyền hiệu lực

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-29`. Các task dưới đây dẫn xuất từ mục "Bổ sung cho
bản sửa đổi 0.4" của kế hoạch.

- [x] **ID-003-T045 — Chính sách quyền hiệu lực.** Hoàn thiện `PermissionCode` theo mẫu và giới hạn 64
      ký tự; thêm `EffectivePermissions` (hợp không trùng, sắp xếp). Unit test.
      **Phụ thuộc:** các task domain của ID-003.
      **Truy vết:** ID-003-FR-017, FR-019; AC-017, AC-018, AC-019.

- [x] **ID-003-T046 — Port và adapter `EffectivePermissionReader`.** Đọc `user_roles` →
      `role_permissions` → `permissions` trong `bkpractice_identity`; export cho module `auth`.
      Integration test với User nhiều vai trò.
      **Phụ thuộc:** ID-003-T045.
      **Truy vết:** ID-003-FR-019; AC-019.

- [ ] **ID-003-T047 — Migration danh mục quyền.** Tạo `<timestamp>-Id003PermissionCatalog.ts`: chèn
      tám mã `problem:*` và phép gán cho `LECTURER`, idempotent; down xoá đúng những gì đã chèn.
      Kiểm chứng `pnpm migration:run:identity` / `pnpm migration:revert:identity`.
      **Phụ thuộc:** các task migration của ID-003.
      **Truy vết:** ID-003-FR-017, FR-018; AC-017, AC-018.

- [x] **ID-003-T048 — Gateway truyền quyền.** Trong `gateway-auth.middleware.ts`, xoá
      `x-auth-permissions` trước khi xác minh; đặt lại từ claim `permissions` (thiếu hoặc sai kiểu thì
      chuỗi rỗng). Test header giả mạo và token thiếu claim.
      **Phụ thuộc:** ID-001-T045.
      **Truy vết:** ID-003-FR-021, FR-022; SR-010; AC-020, AC-021.

- [ ] **ID-003-T049 — E2E độ tươi của quyền.** Gán `LECTURER` cho một User: token cũ không có quyền
      `problem:*`, token phát hành sau đó thì có.
      **Phụ thuộc:** ID-003-T046 tới ID-003-T048, ID-001-T046.
      **Truy vết:** ID-003-FR-023; AC-022.

- [ ] **ID-003-T050 — Đối chiếu bản sửa đổi.** Rà FR-017 tới FR-023, SR-010, SR-011, AC-017 tới
      AC-022 với code và test; ghi lại việc LRN-001-T002 và LRN-002-T002 đã có seam.
      **Phụ thuộc:** ID-003-T045 tới ID-003-T049.
      **Truy vết:** ID-003 bản sửa đổi 0.4.

## Bảng tổng hợp độ phủ yêu cầu

| Độ phủ                                                            | Ánh xạ công việc                                                               |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Quyền sở hữu vai trò, từ vựng tĩnh và không tách service vai trò  | ID-003-T004–T006, ID-003-T017, ID-003-T020–T021, ID-003-T028, ID-003-T041–T043 |
| Hợp nhiều vai trò, đánh giá quyền và mặc định từ chối             | ID-003-T006, ID-003-T008, ID-003-T011, ID-003-T016, ID-003-T036                |
| Gán chỉ dành cho Admin, không cấp Admin và bảo vệ Admin cuối cùng | ID-003-T009–T010, ID-003-T014–T015, ID-003-T018–T019, ID-003-T032–T033         |
| Ngữ cảnh xác thực tin cậy và ngữ nghĩa token/trạng thái           | ID-003-T007, ID-003-T022–T024, ID-003-T030–T031, ID-003-T034, ID-003-T038      |
| Ranh giới Profile/Auth và quyền sở hữu của service tính năng      | ID-003-T004, ID-003-T009, ID-003-T031–T032, ID-003-T042–T043                   |
| Hành vi API an toàn, lỗi và việc xử lý dữ liệu nhạy cảm           | ID-003-T025–T029, ID-003-T035, ID-003-T038                                     |
| Quyền sở hữu lớp lưu trữ, tính duy nhất và kiểm chứng migration   | ID-003-T017–T021, ID-003-T037, ID-003-T042                                     |
| Kiểm chứng cuối cùng về chất lượng/kiến trúc/đặc tả               | ID-003-T039–T044                                                               |
| Danh mục và cách tính quyền hiệu lực của bản sửa đổi 0.4          | ID-003-T045–T047                                                               |
| Truyền quyền, kiểm chứng độ tươi và đối chiếu bản sửa đổi 0.4     | ID-003-T048–T050                                                               |

> Danh sách này chỉ mô tả công việc triển khai. Nó không thêm hành vi vượt ngoài `spec.md` đã
> Approved, và nó không hiện thực RBAC ở giai đoạn này.
