# GW-010 Định tuyến Submission History qua API Gateway

## Trạng thái

Approved

Phiên bản `0.3`, ngày `2026-11-05`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`


## Mục tiêu

Định nghĩa hợp đồng biên công khai cho SUB-003 Lịch sử nộp bài. Gateway xác thực access token BKPractice và chuyển tiếp các route đọc lịch sử tới Submission; Submission giữ quyền sở hữu dữ liệu và kiểm tra quyền sở hữu từng bản ghi. Các route và hành vi đối chiếu với SUB-003 phiên bản 1.0 và plan của SUB-003; cả hai đã Approved.

## Tác nhân

- **Người gọi đã xác thực:** Người học đọc lịch sử và chi tiết bản ghi thuộc về họ theo SUB-003.
- **Khách chưa xác thực:** Không được truy cập các route này.
- **API Gateway:** Xác thực, loại bỏ header định danh giả mạo, đặt metadata tin cậy và proxy request/response.
- **Submission Service:** Chủ sở hữu route, bản ghi, quyền sở hữu, xử lý và response.
- **Identity Service:** Chủ sở hữu access token và session.

## Bối cảnh

SUB-003 Lịch sử nộp bài phiên bản 1.0 và plan đi kèm đã Approved. SUB-003 và plan đã Approved chốt hai route GET và các query tùy chọn cho danh sách. Gateway là public entry point theo [GW-001](../../identity/spec.md) và Layered Architecture; đặc tả này chốt biên đọc công khai mà không chuyển business logic sang Gateway.

## Yêu cầu chức năng

- **GW-010-FR-001 — Định tuyến tới Submission:** Gateway MUST chuyển tiếp các method/path trong bảng Đầu vào tới Submission Service; MUST NOT chuyển chúng tới Learning, Identity, Judge hay Community.
- **GW-010-FR-002 — Bảo vệ route:** Mọi route MUST yêu cầu access token BKPractice hợp lệ theo xác thực Gateway hiện có. Request thiếu/sai/hết hạn/không hợp lệ MUST bị từ chối, không gọi Submission.
- **GW-010-FR-003 — Metadata định danh tin cậy:** Gateway MUST loại bỏ header định danh do client gửi và chỉ chuyển tiếp `x-auth-user-id` cùng metadata xác minh được từ token. Gateway MUST NOT chấp nhận user ID, role hay permission trong request làm nguồn tin cậy.
- **GW-010-FR-004 — Chuyển tiếp nguyên dạng:** Gateway MUST giữ nguyên method, path và query string theo contract Submission. Với danh sách, các query được plan nêu là `kind`, `problemId`, `cursor`, `cursorId` và `limit`; với chi tiết, Gateway chuyển tiếp `:publicId`. Request MUST NOT có trường để chọn chủ sở hữu.
- **GW-010-FR-005 — Chuyển tiếp response:** Gateway MUST giữ status và body Submission trả về, bao gồm success và lỗi validation/authorization/not-found. Lỗi kết nối hoặc timeout upstream trả lỗi Gateway hiện có, không tiết lộ chi tiết nội bộ.
- **GW-010-FR-006 — Header và cookie:** Gateway MUST giữ quy tắc response-header/cookie allowlist theo GW-001; không chuyển raw Cookie tới Submission hoặc chuyển tiếp `Set-Cookie` của Submission.
- **GW-010-FR-007 — Correlation, rate limit và nguồn dữ liệu:** Request MUST tiếp tục dùng correlation/request ID, logging an toàn và rate limit mặc định của Gateway. Gateway không cache hoặc sửa response; lịch sử bền vững thuộc Submission, không phải Gateway.
- **GW-010-FR-008 — Không có nghiệp vụ Submission:** Gateway MUST NOT thực thi quy tắc Run/Submit/History, ownership hoặc trạng thái; MUST NOT đọc database/entity/repository của Submission, truy cập Judge hoặc Learning, hay lưu/cache bản ghi.

## Quy tắc nghiệp vụ

- Submission là nguồn chân lý cho Run, Submit và History; Gateway chỉ xử lý transport.
- Gateway chỉ xác thực người gọi và chuyển tiếp context đã xác minh. Submission giới hạn truy vấn theo chủ sở hữu lấy từ context tin cậy và quyết định quyền đọc chi tiết.
- Gateway MUST NOT cho phép query, path hoặc header do client đặt mở rộng tập bản ghi ra ngoài dữ liệu của người gọi.
- Không mở route service-to-service nội bộ của Submission qua public Gateway.

## Quy tắc phân quyền

- Người chưa xác thực bị chặn tại Gateway.
- Header `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`, `x-client-ip` hoặc header tin cậy nội bộ từ client không được chuyển nguyên trạng như dữ liệu đáng tin cậy.
- Gateway không tự kiểm tra quyền sở hữu bản ghi. Submission kiểm tra rằng cả danh sách lẫn chi tiết đều thuộc về người gọi; biết `publicId` của người khác không cấp quyền đọc.

## Đầu vào

| Method | Route | Thành công | Hành vi tại Submission |
| --- | --- | --- | --- |
| `GET` | `/api/submissions` | `200` | Danh sách lịch sử có query tùy chọn |
| `GET` | `/api/submissions/:publicId` | `200` | Chi tiết theo định danh công khai |

Gateway chuyển query string nguyên dạng (`kind`, `problemId`, `cursor`, `cursorId`, `limit`) và path `:publicId` tới Submission. Các query này không được dùng để chọn chủ sở hữu.

Mọi DTO và mã lỗi nghiệp vụ theo SUB-003 phiên bản 1.0 và plan đã Approved.

## Đầu ra

- Request hợp lệ tới đúng Submission upstream với path/query/body được bảo toàn và metadata tin cậy.
- Response status/body của hai route GET được trả theo Submission contract; thành công hiện được plan mô tả là `200`.
- Auth thất bại bị chặn trước upstream; upstream lỗi được ánh xạ bằng quy ước Gateway hiện có.

## Tình huống lỗi

| Trường hợp | Hành vi quan sát được |
| --- | --- |
| Thiếu/sai/hết hạn access token | Bị Gateway từ chối; không gọi Submission |
| Header định danh giả mạo | Bị loại bỏ; Gateway đặt metadata từ token đã xác minh |
| Submission trả lỗi | Giữ status/body của Submission |
| Submission không khả dụng/timeout | Lỗi Gateway hiện có; không lộ chi tiết upstream |
| Query sai theo contract (ví dụ cursor thiếu cặp cursorId) | Submission trả lỗi kiểm tra; Gateway chuyển tiếp nguyên response |

## Tình huống biên

- Route tĩnh và route có tham số được proxy đúng; Gateway không tự phân tích hay rewrite DTO/path.
- User ID thiếu từ token không được thay bằng giá trị client gửi; request bị chặn theo auth middleware hiện có.
- Một bản ghi đã hoàn tất trước khi người học mở trang vẫn phải đọc được qua History; Gateway không phụ thuộc vào realtime để phục vụ lịch sử.
- Các route khác cùng prefix `/api/submissions` có thể dùng method khác; Gateway chuyển tiếp theo method/path, không giới hạn nhầm vào một hành động duy nhất.

## Yêu cầu bảo mật

- **GW-010-SR-001:** Access token, cookie, bí mật nội bộ và nội dung nhạy cảm MUST NOT xuất hiện trong log.
- **GW-010-SR-002:** Header định danh/quyền do client gửi MUST NOT được tin cậy hoặc chuyển tiếp như metadata Gateway.
- **GW-010-SR-003:** Gateway MUST NOT mở API nội bộ Submission/Judge/Learning ra công khai.
- **GW-010-SR-004:** Gateway MUST NOT cache, lưu trữ hoặc truy cập database/entity/repository của Submission.
- **GW-010-SR-005:** Body/query/response được proxy theo contract; Gateway MUST NOT thêm dữ liệu judge hoặc sửa ownership.

## Tiêu chí nghiệm thu

- **GW-010-AC-001:** Mỗi method/path trong bảng Đầu vào đến đúng Submission upstream; request method/path/query/body không đổi.
- **GW-010-AC-002:** Request chưa xác thực không tới upstream; header giả mạo bị thay bởi metadata từ token đã xác minh.
- **GW-010-AC-003:** Hai route GET thành công theo status/body trong contract Submission (plan hiện mô tả `200`); lỗi nghiệp vụ được giữ nguyên.
- **GW-010-AC-004:** Lỗi upstream không để lộ URL, credential hay chi tiết nội bộ.
- **GW-010-AC-005:** Không có logic ownership/lifecycle/validation nghiệp vụ hay persistence/cache trong Gateway.

## Ngoài phạm vi

- Thay đổi các yêu cầu, DTO, lỗi nghiệp vụ, lưu trữ hay vòng đời của SUB-003 Lịch sử nộp bài.
- Thực thi Run/Submit, gọi Judge hoặc lấy judge package trong Gateway.
- Thêm API nghiệp vụ, RBAC theo tài nguyên, cache, retry nghiệp vụ hoặc giới hạn riêng.
- Thay đổi authentication, cookie, CSRF, realtime hoặc các prefix Gateway khác ngoài sửa transport cần thiết để đạt spec.

## Phụ thuộc

- [SUB-003 Submission History](../../../03-submission/submission-history/spec.md) và [plan](../../../03-submission/submission-history/plan.md), cả hai Approved.
- [GW-001 Gateway structure](../../identity/spec.md) — xác thực, proxy, header và cookie ở biên.
- [API Gateway architecture](../../../../architecture/api-gateway.md), [Submission architecture](../../../../architecture/submission-service.md), [System architecture](../../../../architecture/system-architecture.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

SUB-003 và plan đã Approved chốt hai route GET `/api/submissions` và `/api/submissions/:publicId`. Các quy tắc quyền xem, bộ lọc và phân trang thuộc Submission; Gateway chuyển tiếp query/path và không quyết định quyền tài nguyên. Không còn câu hỏi mở ảnh hưởng đến hành vi Gateway.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-11-04 | 0.1 | TBD | Đề xuất hợp đồng Gateway cho SUB-003 Lịch sử nộp bài |
| 2026-11-05 | 0.3 | Codex theo chỉ đạo người dùng | Rà soát, đối chiếu SUB nguồn đã Approved và phê duyệt Gateway contract |
| 2026-11-04 | 0.2 | TBD | Căn chỉnh route và quyền History với SUB-003 trên nhánh tham khảo |
