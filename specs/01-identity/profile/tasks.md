# ID-002 Công việc triển khai Profile

## Trạng thái

Approved — Sẵn sàng triển khai

Được chủ sở hữu sản phẩm phê duyệt ngày `2026-09-01`.

Đặc tả liên quan: [`./spec.md`](./spec.md) — phiên bản Approved `0.4`  
Kế hoạch liên quan: [`./plan.md`](./plan.md) — Approved ngày `2026-09-01`

Mọi công việc triển khai đều bắt đầu ở trạng thái chưa hoàn thành. Chỉ đánh dấu `[x]` sau khi cả phần
triển khai lẫn phần kiểm chứng được liệt kê đều hoàn tất. Các mục N/A là những mục duy nhất được tích
sẵn một cách có chủ đích.

## Chuẩn bị / Phân tích tái sử dụng

- [ ] **ID-002-T001 — Xác nhận lại nền tảng triển khai.** Khảo sát trạng thái Git, spec/plan Profile
      đã Approved, kiến trúc Identity, các quy tắc phụ thuộc, các entity Identity hiện tại,
      datasource, migration, phần composition của module, middleware auth/proxy của Gateway và các
      test hiện có. Xác nhận không thay đổi mã nguồn nào trước khi bắt đầu triển khai.  
      **Phụ thuộc:** Không có.  
      **Truy vết:** Quy trình SDD; Định nghĩa Hoàn thành.

- [ ] **ID-002-T002 — Xác nhận các contract thượng nguồn của Identity.** Kiểm chứng rằng ID-001 phơi
      bày ngữ cảnh User ID/trạng thái tài khoản đã xác thực, và rằng ranh giới cấp tài khoản đã phê
      duyệt có thể cung cấp `họ tên` chính thức đã import cần cho việc khởi tạo trễ. Xác nhận ranh
      giới RBAC của ID-003 cho các thao tác của Admin. Hãy báo cáo điểm nghẽn thay vì bịa ra một
      phương án dự phòng, nếu bất kỳ contract nào chưa sẵn sàng.  
      **Phụ thuộc:** ID-002-T001.  
      **Truy vết:** ID-002-FR-002, ID-002-FR-010–ID-002-FR-011; AC-002, AC-010–AC-011.

- [ ] **ID-002-T003 — Xác nhận nền tảng lưu trữ và truyền tải có thể tái dùng.** Tái dùng quan hệ
      `Profile`/`User` hiện có, tính duy nhất của `profiles.user_id`, datasource/registry entity của
      Identity, bootstrap kiểm tra dữ liệu/Swagger toàn cục, các tiền tố route Identity của Gateway,
      và ngữ cảnh auth của ID-001. Không tạo entity User/Profile trùng lặp, hệ thống xác thực khác,
      hay một cây repository.  
      **Phụ thuộc:** ID-002-T001.  
      **Truy vết:** Mục Ảnh hưởng tới mã nguồn hiện có của kế hoạch; ID-002-FR-001, ID-002-FR-014.

- [ ] **ID-002-T004 — Xác nhận các loại trừ theo ranh giới service.** Ghi nhận rằng MSSV/email, vai
      trò, quyền, trạng thái tài khoản, lớp/khoa, tiến độ Learning, lịch sử Submission và nội dung
      Community đều nằm ngoài state của Profile. Đảm bảo không công việc nào đưa vào khoá ngoại, truy
      vấn cơ sở dữ liệu hay thực thể nghiệp vụ dùng chung xuyên service.  
      **Phụ thuộc:** ID-002-T001.  
      **Truy vết:** ID-002-FR-006, ID-002-FR-014; ID-002-SR-003, ID-002-SR-008; AC-006, AC-014.

## Domain

- [ ] **ID-002-T005 — Thêm đối tượng domain Profile độc lập với framework.** Tạo model domain Profile
      tối thiểu cho `profileId`, `userId`, `displayName`, tham chiếu avatar cho phép null và `bio`
      cho phép null; giữ hành vi của Profile bên trong Identity và ngoài `libs/`.  
      **Phụ thuộc:** ID-002-T001–ID-002-T004.  
      **Truy vết:** Mục Thay đổi ở tầng domain của kế hoạch; ID-002-FR-001, ID-002-FR-005–ID-002-FR-006.

- [ ] **ID-002-T006 — Hiện thực các bất biến và chính sách của Profile.** Thực thi `displayName` đã
      cắt khoảng trắng và không rỗng (tối đa 100 ký tự), `bio` tuỳ chọn đã cắt khoảng trắng (tối đa
      1.000 ký tự), việc bảo toàn Unicode, ngữ nghĩa patch tường minh giữa bỏ qua và null, danh sách
      trường chỉnh sửa được, việc từ chối các trường bị kiểm soát, và kết quả không khả dụng chung ở
      phần công khai cho các tài khoản `LOCKED`/`PENDING`. Giữ chính sách độc lập với NestJS, TypeORM
      và các kiểu của R2 SDK.  
      **Phụ thuộc:** ID-002-T005.  
      **Truy vết:** ID-002-FR-005–ID-002-FR-009, ID-002-FR-016; ID-002-SR-002–ID-002-SR-006;
      AC-005–AC-009, AC-008a.

- [ ] **ID-002-T007 — Kiểm thử hành vi domain của Profile.** Thêm các unit test tập trung cho các
      biên độ dài văn bản, việc cắt khoảng trắng/Unicode, việc xoá trống các trường cho phép null,
      các trường bị bỏ qua, việc từ chối trường được bảo vệ, và khả năng hiển thị công khai của tài
      khoản locked/pending.  
      **Phụ thuộc:** ID-002-T006.  
      **Truy vết:** ID-002-AC-004–ID-002-AC-009, ID-002-AC-008a; ID-002-SR-002–ID-002-SR-006.

## Lưu trữ

- [ ] **ID-002-T008 — Căn chỉnh model lưu trữ Profile hiện có.** Tái dùng
      `apps/identity-service/src/modules/users/entities/profile.entity.ts`; phơi bày giá trị avatar
      đã lưu về mặt ngữ nghĩa như một tham chiếu/key đối tượng R2 ổn định, trong khi vẫn giữ cột vật
      lý `avatar_url` để tương thích. Bảo toàn quan hệ một-một tới User, hành vi cascade,
      `display_name varchar(100)` và các trường cho phép null.  
      **Phụ thuộc:** ID-002-T003, ID-002-T006.  
      **Truy vết:** Mục Lưu trữ/Thay đổi cơ sở dữ liệu của kế hoạch; ID-002-FR-001, ID-002-FR-005,
      ID-002-FR-012; AC-003, AC-013.

- [ ] **ID-002-T009 — Định nghĩa các ranh giới lưu trữ của Profile.** Chỉ thêm các port
      `ProfileRepository`, `IdentityProfileContext` và `AvatarStorage` đã lập kế hoạch tại ranh giới
      application của Profile. Tái dùng ngữ cảnh đọc tài khoản/đã xác thực của ID-001 khi tương
      thích; không tạo một repository User thứ hai không giới hạn hay một base repository chung.  
      **Phụ thuộc:** ID-002-T002, ID-002-T005.  
      **Truy vết:** Mục Các port của kế hoạch; ID-002-FR-002, ID-002-FR-010–ID-002-FR-011;
      ID-002-SR-001, ID-002-SR-008.

- [ ] **ID-002-T010 — Hiện thực adapter repository Profile dùng TypeORM.** Hiện thực việc tra cứu
      Profile cục bộ, tìm-hoặc-tạo nguyên tử từ tên chính thức, cập nhật tường minh các trường được
      phép, ánh xạ giữa domain và lớp lưu trữ, và xử lý an toàn các trường hợp không tìm thấy/xung
      đột. Chỉ dùng datasource Identity hiện có; đảm bảo việc khởi tạo đồng thời không thể tạo ra các
      dòng trùng lặp.  
      **Phụ thuộc:** ID-002-T008–ID-002-T009.  
      **Truy vết:** ID-002-FR-001–ID-002-FR-005, ID-002-FR-015–ID-002-FR-016; AC-001–AC-004, AC-012.

- [ ] **ID-002-T011 — Nối dây lớp lưu trữ Profile vào phần composition của Identity.** Đăng ký adapter
      repository Profile và entity Profile qua module/composition root của Identity mà không thay đổi
      hành vi của Auth và không chuyển thực thể nghiệp vụ nào vào thư viện dùng chung.  
      **Phụ thuộc:** ID-002-T008–ID-002-T010.  
      **Truy vết:** Mục Adapter hạ tầng và Tuân thủ kiến trúc của kế hoạch.

- [ ] **ID-002-T012 — Thêm test lưu trữ/đồng thời cho Profile.** Kiểm chứng tính duy nhất một-một,
      hành vi cho phép null, quyền sở hữu nội bộ của User, việc khởi tạo trễ an toàn khi thực hiện
      lại, các request đầu tiên đồng thời, các cập nhật tường minh, và việc không có truy cập SQL
      xuyên service.  
      **Phụ thuộc:** ID-002-T010–ID-002-T011.  
      **Truy vết:** ID-002-AC-001–ID-002-AC-004, ID-002-AC-012, ID-002-AC-014;
      ID-002-SR-001, ID-002-SR-008.

## Cơ sở dữ liệu / Migration

- [ ] **ID-002-T013 — Tạo migration kiểm tra dữ liệu cho Profile.** Tạo một migration TypeORM thuộc
      sở hữu của Identity mà không sửa `1700000000000-InitialIdentitySchema.ts`. Thêm các bước kiểm
      tra trước cho tên hiển thị hiện có không hợp lệ và các giá trị avatar cũ chưa được phê duyệt,
      rồi thêm các check có tên cho `display_name` không rỗng và độ dài `bio` `<= 1.000`. Giữ khoá
      ngoại tới User, cascade và `user_id` duy nhất hiện có; không thêm cột học thuật, vai trò hay
      xuyên service nào.  
      **Phụ thuộc:** ID-002-T008.  
      **Truy vết:** Mục Thay đổi cơ sở dữ liệu/Migration của kế hoạch; ID-002-FR-001, ID-002-FR-005,
      ID-002-FR-012; AC-012–AC-013.

- [ ] **ID-002-T014 — Kiểm chứng vòng đời và tính tương thích của migration.** Rà soát SQL được sinh
      ra, kiểm chứng việc áp dụng/hoàn tác/áp dụng lại trên một cơ sở dữ liệu PostgreSQL Identity
      cách ly, xác nhận dữ liệu hiện có không bị cắt bớt, và giữ `synchronize: false`. Hãy dừng lại
      và báo cáo phương án khắc phục hành động được khi dữ liệu không vượt qua bước kiểm tra trước.  
      **Phụ thuộc:** ID-002-T013.  
      **Truy vết:** Yêu cầu về migration của Định nghĩa Hoàn thành; ID-002-AC-013, ID-002-AC-014.

## Hạ tầng / Lưu trữ avatar

- [ ] **ID-002-T015 — Thêm cấu hình R2 đã được kiểm chứng.** Mở rộng phần kiểm tra biến môi trường
      của Identity và `.env.example` với các placeholder endpoint/bucket/thông tin xác thực
      Cloudflare R2 theo kiểu thất bại sớm, cùng TTL của signed URL, giới hạn tải lên, các kiểu nội
      dung được phép và thiết lập ân hạn khi dọn dẹp. Giữ thông tin xác thực thật nằm ngoài hệ thống
      quản lý mã nguồn.  
      **Phụ thuộc:** ID-002-T001, ID-002-T002.  
      **Truy vết:** ID-002-FR-012–ID-002-FR-013; ID-002-SR-005, ID-002-SR-007.

- [ ] **ID-002-T016 — Chọn và thêm phụ thuộc R2 SDK tối thiểu nếu cần.** Khảo sát các phụ thuộc hiện
      có trước; chỉ thêm client/presigner R2 tương thích S3 đã phê duyệt qua pnpm nếu không adapter
      nào sẵn có phù hợp. Không thêm một nhà cung cấp lưu trữ mới hay sửa phụ thuộc chỉ để cho cân
      xứng về mặt trừu tượng hoá.  
      **Phụ thuộc:** ID-002-T015.  
      **Truy vết:** Mục adapter Cloudflare R2 của kế hoạch; ID-002-FR-012, ID-002-SR-005.

- [ ] **ID-002-T017 — Hiện thực adapter AvatarStorage cho Cloudflare R2.** Sinh các object key theo
      từng người dùng do server sở hữu, các presigned upload URL ngắn hạn và các signed read URL
      ngắn hạn; kiểm chứng các tham chiếu đã phê duyệt theo bucket/tiền tố người dùng và từ chối các
      URL bên ngoài, bucket/key do người gọi cung cấp, path traversal và thông tin xác thực không tin
      cậy. Không bao giờ lưu signed URL.  
      **Phụ thuộc:** ID-002-T009, ID-002-T015–ID-002-T016.  
      **Truy vết:** ID-002-FR-012–ID-002-FR-013; ID-002-SR-005–ID-002-SR-007;
      AC-005, AC-013, AC-013a.

- [ ] **ID-002-T018 — Hiện thực hành vi dọn dẹp avatar sau khi commit.** Ghi nhận các tham chiếu đối
      tượng bị thay thế/xoá trống, cập nhật tham chiếu Profile trước, và lên lịch xoá bất đồng bộ
      best-effort sau khoảng ân hạn được cấu hình. Việc dọn dẹp thất bại không được làm hoàn tác một
      lần cập nhật Profile đã thành công và không được để lộ thông tin xác thực hay signed URL trong
      log.  
      **Phụ thuộc:** ID-002-T010, ID-002-T017.  
      **Truy vết:** ID-002-FR-005, ID-002-FR-016; ID-002-SR-005, ID-002-SR-007;
      AC-004, AC-013b.

- [ ] **ID-002-T019 — Kiểm thử adapter R2 và ranh giới dọn dẹp.** Kiểm chứng quyền sở hữu của ý định
      tải lên, các hạn chế về nội dung, việc kiểm chứng tham chiếu đã phê duyệt, việc sinh signed
      read URL, việc từ chối URL tuỳ ý, việc lên lịch dọn dẹp sau commit, và hành vi khi phụ thuộc
      thất bại mà không để lại tham chiếu Profile treo lơ lửng.  
      **Phụ thuộc:** ID-002-T017–ID-002-T018.  
      **Truy vết:** ID-002-AC-005, ID-002-AC-013, ID-002-AC-013a–ID-002-AC-013b, ID-002-AC-015;
      ID-002-SR-005–ID-002-SR-007.

## Use case của tầng application

- [ ] **ID-002-T020 — Hiện thực `GetMyProfile`.** Phân giải User ID từ ngữ cảnh đã xác thực của ID-001
      đã được kiểm chứng, tạo trễ một cách nguyên tử một Profile còn thiếu từ tên chính thức đã được
      cấp, và trả về biểu diễn an toàn của hồ sơ chính mình. Không nhận User ID do người gọi cung cấp
      và không trả về dữ liệu thông tin đăng nhập/nhà cung cấp/phiên.  
      **Phụ thuộc:** ID-002-T002, ID-002-T006, ID-002-T010–ID-002-T011.  
      **Truy vết:** ID-002-FR-002–ID-002-FR-003; ID-002-SR-001, ID-002-SR-003;
      AC-001–AC-002, AC-007.

- [ ] **ID-002-T021 — Hiện thực `UpdateMyProfile`.** Điều phối các cập nhật một phần tường minh cho
      chủ sở hữu, thực thi danh sách trường chỉnh sửa được và việc kiểm tra ở tầng domain, kiểm chứng
      các tham chiếu R2, giữ nguyên các trường bị bỏ qua, hỗ trợ xoá trống avatar/bio, khởi tạo trễ
      khi cần, và chỉ lên lịch dọn dẹp avatar cũ sau khi commit.  
      **Phụ thuộc:** ID-002-T006, ID-002-T010–ID-002-T011, ID-002-T017–ID-002-T018.  
      **Truy vết:** ID-002-FR-002, ID-002-FR-004–ID-002-FR-006, ID-002-FR-016;
      ID-002-SR-001–ID-002-SR-003; AC-002–AC-006.

- [ ] **ID-002-T022 — Hiện thực `GetPublicProfile`.** Nạp User/Profile đích của Identity mà không tạo
      dòng nào cho một người dùng không liên quan, chỉ trả về danh sách cho phép công khai, sinh
      signed URL avatar khi phù hợp, và trả về cùng một kết quả không khả dụng/không tìm thấy chung
      cho các đích bị thiếu, `LOCKED` và `PENDING`.  
      **Phụ thuộc:** ID-002-T006, ID-002-T010, ID-002-T017.  
      **Truy vết:** ID-002-FR-007–ID-002-FR-009; ID-002-SR-004–ID-002-SR-005;
      AC-008–AC-009, AC-008a.

- [ ] **ID-002-T023 — Hiện thực các thao tác Profile trên đích của Admin.** Thêm
      `AdminGetUserProfile` và `AdminUpdateUserProfile` dùng khả năng Admin đã phê duyệt của ID-003,
      cùng phản hồi an toàn và danh sách trường cho phép tường minh, không thay đổi dữ liệu tài
      khoản/phân quyền và không thêm quy tắc vòng đời tạo trễ mới cho Admin.  
      **Phụ thuộc:** ID-002-T002, ID-002-T006, ID-002-T010–ID-002-T011.  
      **Truy vết:** ID-002-FR-010; ID-002-SR-001–ID-002-SR-003; AC-010.

- [ ] **ID-002-T024 — Hiện thực `CreateAvatarUploadIntent`.** Phơi bày thao tác hỗ trợ có phạm vi hẹp
      chỉ dành cho chủ sở hữu, trả về một tham chiếu đối tượng R2 do server sinh ra và một presigned
      upload URL ngắn hạn; không nhận bucket, key, thông tin xác thực, redirect hay URL bên ngoài từ
      người gọi.  
      **Phụ thuộc:** ID-002-T017.  
      **Truy vết:** ID-002-FR-012–ID-002-FR-013; ID-002-SR-005–ID-002-SR-006;
      AC-005, AC-013.

## DTO / Ánh xạ / Presentation

- [ ] **ID-002-T025 — Tạo các DTO request và phần kiểm tra ở tầng truyền tải của Profile.** Thêm các
      DTO patch cho chủ sở hữu/Admin và DTO ý định tải avatar đã lập kế hoạch, với các trường tuỳ
      chọn, ngữ nghĩa xoá trống bằng null, tên hiển thị tối đa 100, bio tối đa 1.000, tích hợp
      class-validator và việc từ chối các trường lạ/bị bảo vệ qua pipe kiểm tra dữ liệu toàn cục hiện
      có.  
      **Phụ thuộc:** ID-002-T006, ID-002-T024.  
      **Truy vết:** ID-002-FR-005–ID-002-FR-006, ID-002-FR-013, ID-002-FR-016;
      ID-002-SR-002, ID-002-SR-006; AC-003–AC-006.

- [ ] **ID-002-T026 — Tạo các DTO phản hồi và các mapper tường minh.** Hiện thực các danh sách cho
      phép tách biệt cho phản hồi của chủ sở hữu/Admin và phản hồi công khai. Chỉ bao gồm `userId`
      ổn định ở nơi đã phê duyệt, cộng với các trường thuộc sở hữu của Profile và signed URL avatar
      được sinh ra; loại trừ email, MSSV, vai trò, quyền, trạng thái tài khoản, mật khẩu/bản băm, dữ
      liệu refresh, định danh nhà cung cấp và metadata R2 nội bộ.  
      **Phụ thuộc:** ID-002-T020–ID-002-T023.  
      **Truy vết:** ID-002-FR-007–ID-002-FR-009; ID-002-SR-003–ID-002-SR-004;
      AC-001, AC-008–AC-009, AC-015.

- [ ] **ID-002-T027 — Hiện thực controller Profile và phần nối dây module.** Thêm các route Profile
      đã lập kế hoạch, gọi đúng một thao tác application cho mỗi request, ánh xạ các lỗi
      Identity/Gateway hiện có, áp dụng ngữ cảnh định danh đã xác thực được tái dùng, và đăng ký
      feature module trong composition root của Identity. Giữ controller không chứa logic nghiệp vụ
      và không dùng trực tiếp cơ sở dữ liệu/R2.  
      **Phụ thuộc:** ID-002-T011, ID-002-T020–ID-002-T026.  
      **Truy vết:** ID-002-FR-003–ID-002-FR-011; ID-002-SR-001–ID-002-SR-004;
      AC-001, AC-007, AC-010–AC-011.

- [ ] **ID-002-T028 — Cập nhật tài liệu Swagger/OpenAPI.** Mô tả các thao tác Profile của chủ sở
      hữu/công khai/Admin và thao tác hỗ trợ ý định tải avatar, các giới hạn/khả năng nhận null của
      request, các yêu cầu Bearer/Admin, các phản hồi có avatar đã ký, và các lỗi
      400/401/403/404/phụ thuộc liên quan, mà không phơi bày các trường lưu trữ hay thông tin xác
      thực.  
      **Phụ thuộc:** ID-002-T025–ID-002-T027.  
      **Truy vết:** Phần tài liệu API của Định nghĩa Hoàn thành; ID-002-AC-001, AC-008–AC-011.

## Tích hợp API Gateway

- [ ] **ID-002-T029 — Căn chỉnh chính xác metadata xác thực cho route Profile công khai.** Cập nhật
      phần so khớp auth của Gateway sao cho chỉ `GET /api/users/:userId/profile` là công khai; giữ
      `/api/profile/me`, các route PATCH, các route của Admin và thao tác ý định tải avatar ở trạng
      thái được bảo vệ. Tiếp tục loại bỏ các header định danh/vai trò giả mạo và suy ra ngữ cảnh tin
      cậy từ access token ID-001 đã được xác minh.  
      **Phụ thuộc:** ID-002-T027.  
      **Truy vết:** ID-002-FR-003, ID-002-FR-007, ID-002-FR-010–ID-002-FR-011;
      ID-002-SR-001, ID-002-SR-004; AC-007–AC-011.

- [ ] **ID-002-T030 — Kiểm chứng tính tương thích của proxy Gateway.** Xác nhận việc chuyển tiếp
      `/api/profile` và `/api/users` hiện có tới được Identity, bảo toàn các header phản hồi/lỗi đã
      phê duyệt, và không mở rộng phần bỏ qua xác thực công khai. Chỉ sửa mã proxy nếu contract
      API/avatar đã ký thực sự đòi hỏi.  
      **Phụ thuộc:** ID-002-T029.  
      **Truy vết:** Mục tích hợp API Gateway của kế hoạch; ID-002-SR-001, ID-002-SR-008.

## Phân quyền / Quyền riêng tư / Xử lý lỗi

- [ ] **ID-002-T031 — Thực thi phân quyền theo tác nhân và theo trường.** Kiểm chứng việc cập nhật
      chỉ dành cho chủ sở hữu với Sinh viên/Giảng viên, việc quản lý xuyên người dùng chỉ dành cho
      Admin thông qua khả năng của ID-003, phạm vi đọc công khai, và hành vi không khả dụng chung. Từ
      chối mọi nỗ lực thay đổi email, MSSV, vai trò, quyền, trạng thái tài khoản, mật khẩu hay các
      trường nhà cung cấp tại ranh giới application, chứ không chỉ ở DTO.  
      **Phụ thuộc:** ID-002-T002, ID-002-T006, ID-002-T020–ID-002-T023.  
      **Truy vết:** ID-002-FR-006, ID-002-FR-010–ID-002-FR-011; ID-002-SR-001–ID-002-SR-004;
      AC-006, AC-008a, AC-010–AC-011.

- [ ] **ID-002-T032 — Ánh xạ lỗi của Profile về quy ước hiện có.** Hiện thực 400 cho kiểm tra dữ
      liệu, 401 cho xác thực, 403 cho quyền sở hữu/trường, 404 cho kết quả không khả dụng/không tìm
      thấy chung, và các lỗi phụ thuộc R2/lưu trữ đã chuẩn hoá, mà không tạo cấu trúc lỗi mới và
      không rò rỉ trạng thái tài khoản.  
      **Phụ thuộc:** ID-002-T020–ID-002-T027.  
      **Truy vết:** Mục Xử lý lỗi của kế hoạch; ID-002-FR-007, ID-002-FR-013, ID-002-SR-004;
      AC-005, AC-007, AC-008a, AC-015.

- [ ] **ID-002-T033 — Thêm các biện pháp ghi log an toàn và che thông tin.** Tái dùng correlation ID
      và phần ghi log hiện có, đồng thời đảm bảo mật khẩu, access/refresh token, header
      Authorization, thông tin xác thực R2, signed URL và các trường tài khoản nhạy cảm không bao giờ
      xuất hiện trong log hay lỗi của Profile.  
      **Phụ thuộc:** ID-002-T027, ID-002-T032.  
      **Truy vết:** ID-002-SR-007; AC-015.

## Messaging / Realtime

- [x] **ID-002-T034 — N/A: Messaging.** ID-002 không có event nghiệp vụ RabbitMQ hay message contract
      nào được phê duyệt; việc dọn dẹp avatar vẫn là mối quan tâm của hạ tầng và không tạo topology mới.

- [x] **ID-002-T035 — N/A: Realtime.** Các thao tác Profile không cần fan-out qua Socket.IO/Redis;
      lớp lưu trữ của Identity vẫn là nguồn chân lý.

## Kiểm thử

- [ ] **ID-002-T036 — Thêm test cho tầng application/use case.** Bao phủ việc khởi tạo trễ và hành vi
      khi thực hiện lại của GetMyProfile; các trường được phép/bị bỏ qua/null của UpdateMyProfile;
      trường hợp thiếu tên chính thức; việc xử lý danh sách cho phép/trạng thái ở phần công khai; khả
      năng của Admin; việc từ chối cập nhật xuyên người dùng của Sinh viên/Giảng viên; và việc bảo
      toàn tài khoản User.  
      **Phụ thuộc:** ID-002-T020–ID-002-T023, ID-002-T031–ID-002-T032.  
      **Truy vết:** ID-002-AC-001–ID-002-AC-012, ID-002-AC-014; FR-002–FR-011, FR-015–FR-016.

- [ ] **ID-002-T037 — Thêm test contract cho API/Gateway.** Kiểm chứng yêu cầu Bearer ở các đường
      riêng tư, đúng phần bỏ qua xác thực cho GET công khai, các route PATCH/tải lên/Admin được bảo
      vệ, hành vi danh sách cho phép ở DTO, các danh sách cho phép ở phản hồi, các phản hồi chung cho
      locked/pending, và việc định tuyến proxy hiện có.  
      **Phụ thuộc:** ID-002-T025–ID-002-T030.  
      **Truy vết:** ID-002-AC-005–ID-002-AC-011, ID-002-AC-015; ID-002-SR-001–ID-002-SR-004.

- [ ] **ID-002-T038 — Thêm test integration cho lưu trữ, migration và R2.** Kiểm chứng các ràng buộc
      schema của Profile, việc chạy/hoàn tác/chạy lại migration, bước kiểm tra trước dữ liệu không
      hợp lệ, tính đồng thời một-một, hành vi tham chiếu/signed URL của R2, việc lên lịch dọn dẹp, và
      việc phụ thuộc thất bại mà không để lại tham chiếu treo lơ lửng.  
      **Phụ thuộc:** ID-002-T012, ID-002-T014, ID-002-T019.  
      **Truy vết:** ID-002-AC-005, ID-002-AC-012–ID-002-AC-015; ID-002-SR-005–ID-002-SR-008.

- [ ] **ID-002-T039 — Rà soát các test về bảo mật và ranh giới.** Xác nhận việc từ chối gán hàng
      loạt, việc từ chối header định danh giả mạo, việc không tiết lộ trường riêng tư, việc từ chối
      URL/key R2 tuỳ ý, việc không có SQL xuyên service, không có thực thể nghiệp vụ dùng chung, và
      không rò rỉ thông tin xác thực/signed URL vào log.  
      **Phụ thuộc:** ID-002-T031–ID-002-T033, ID-002-T037–ID-002-T038.  
      **Truy vết:** ID-002-SR-001–ID-002-SR-008; AC-006, AC-009, AC-013, AC-014–AC-015.

## Kiểm chứng / Tài liệu

- [ ] **ID-002-T040 — Chạy các lệnh kiểm chứng của repository bằng pnpm.** Sau khi triển khai, khảo
      sát các script thật trong `package.json` và chạy các lệnh phù hợp, chỉ dùng pnpm:
      `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build`. Ghi lại các lỗi thay vì che chúng
      bằng `any`, `@ts-ignore` hay việc tắt lint trên diện rộng.  
      **Phụ thuộc:** ID-002-T036–ID-002-T039.  
      **Truy vết:** Yêu cầu về chất lượng và kiểm chứng của Định nghĩa Hoàn thành.

- [ ] **ID-002-T041 — Kiểm chứng tuân thủ kiến trúc.** Rà soát bản triển khai đối chiếu với Clean
      Architecture của Identity và với kế hoạch: presentation không có logic nghiệp vụ, application
      điều phối các port, domain độc lập với framework, infrastructure sở hữu TypeORM/R2, không có
      truy cập cơ sở dữ liệu xuyên service, Authentication/RBAC được tái dùng chứ không bị nhân bản,
      và không thực thể nghiệp vụ nào bị chuyển vào `libs/`.  
      **Phụ thuộc:** ID-002-T027, ID-002-T030, ID-002-T039–ID-002-T040.  
      **Truy vết:** Mục Tuân thủ kiến trúc của kế hoạch; ID-002-SR-008, AC-014.

- [ ] **ID-002-T042 — Đối chiếu bản triển khai với đặc tả đã Approved.** Kiểm tra từng Yêu cầu chức
      năng, Yêu cầu bảo mật, Tiêu chí nghiệm thu, quy tắc riêng tư, quy tắc phân quyền, yêu cầu
      migration và mục tài liệu API. Xác nhận không có hành vi Ngoài phạm vi nào (thay đổi xác thực,
      RBAC engine, dữ liệu Learning/Submission, lưu trữ Community, đồ thị xã hội hay service mới)
      được thêm vào. Cập nhật danh sách này theo trạng thái hoàn thành thực tế và báo cáo mọi sai
      lệch hay phụ thuộc cấp tài khoản/R2 chưa kiểm chứng được.  
      **Phụ thuộc:** ID-002-T028, ID-002-T034–ID-002-T041.  
      **Truy vết:** Bước xác minh cuối cùng của SDD; Định nghĩa Hoàn thành.

## Bảng tổng hợp độ phủ yêu cầu

| Nhóm yêu cầu         | Độ phủ công việc                                       |
| -------------------- | ------------------------------------------------------ |
| ID-002-FR-001–FR-006 | T005–T012, T020–T021, T025, T031                       |
| ID-002-FR-007–FR-011 | T022–T023, T026–T032, T036–T037                        |
| ID-002-FR-012–FR-013 | T015–T019, T024–T025, T037–T039                        |
| ID-002-FR-014–FR-016 | T004–T014, T020–T021, T036, T038–T042                  |
| ID-002-SR-001–SR-008 | T006, T009, T017–T019, T025–T026, T029–T033, T037–T042 |
| ID-002-AC-001–AC-015 | T007, T012, T014, T019, T028, T032, T036–T042          |

## Tham chiếu Định nghĩa Hoàn thành

ID-002 tuân theo [`specs/00-system/definition-of-done.md`](../../00-system/definition-of-done.md).
Tính năng chưa Hoàn thành cho tới khi spec/plan/tasks đã Approved nhất quán với nhau, phần code và
migration liên quan đã được triển khai và kiểm chứng, các test về phân quyền/riêng tư/bảo mật đều
pass, Swagger đã cập nhật, `pnpm lint`, `pnpm typecheck`, `pnpm test` và `pnpm build` đều pass, và
mọi yêu cầu cùng tiêu chí nghiệm thu đã được đối chiếu với bản triển khai.

> File này là một danh sách kiểm tra triển khai, không phải một đặc tả. Không thêm yêu cầu và không
> âm thầm thay đổi spec/plan ID-002 đã Approved trong lúc thực hiện các công việc này.
