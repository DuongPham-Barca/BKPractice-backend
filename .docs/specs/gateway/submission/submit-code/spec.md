# GW-009 Định tuyến Submit qua API Gateway

## Trạng thái

Approved

Phiên bản `0.3`, ngày `2026-11-05`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`


## Mục tiêu

Định nghĩa hợp đồng biên công khai cho SUB-002 Nộp bài chính thức. Gateway xác thực access token BKPractice và chuyển tiếp route đã xác định tới Submission; Submission giữ quyền sở hữu dữ liệu và toàn bộ vòng đời nghiệp vụ. Các route và hành vi đối chiếu với SUB-002 phiên bản 1.0 và plan của SUB-002; cả hai đã Approved.

## Tác nhân

- **Người gọi đã xác thực:** Người học nộp lời giải của họ theo SUB-002.
- **Khách chưa xác thực:** Không được truy cập các route này.
- **API Gateway:** Xác thực, loại bỏ header định danh giả mạo, đặt metadata tin cậy và proxy request/response.
- **Submission Service:** Chủ sở hữu route, bản ghi, quyền sở hữu, xử lý và response.
- **Identity Service:** Chủ sở hữu access token và session.

## Bối cảnh

SUB-002 Nộp bài chính thức phiên bản 1.0 và plan đi kèm đã Approved. Plan ghi route `POST /api/submissions` và việc Gateway chuyển tiếp tiền tố tương ứng. Gateway là public entry point theo [GW-001](../../identity/spec.md) và Layered Architecture; đặc tả này chốt biên công khai mà không chuyển business logic sang Gateway.

## Yêu cầu chức năng

- **GW-009-FR-001 — Định tuyến tới Submission:** Gateway MUST chuyển tiếp các method/path trong bảng Đầu vào tới Submission Service; MUST NOT chuyển chúng tới Learning, Identity, Judge hay Community.
- **GW-009-FR-002 — Bảo vệ route:** Mọi route MUST yêu cầu access token BKPractice hợp lệ theo xác thực Gateway hiện có. Request thiếu/sai/hết hạn/không hợp lệ MUST bị từ chối, không gọi Submission.
- **GW-009-FR-003 — Metadata định danh tin cậy:** Gateway MUST loại bỏ header định danh do client gửi và chỉ chuyển tiếp `x-auth-user-id` cùng metadata xác minh được từ token. Gateway MUST NOT chấp nhận user ID, role hay permission trong request làm nguồn tin cậy.
- **GW-009-FR-004 — Chuyển tiếp nguyên dạng:** Gateway MUST giữ nguyên method, path, query string và body request theo contract Submission. Theo SUB-002, body gồm Problem, ngôn ngữ và mã nguồn; Gateway không bổ sung, lọc hoặc xác thực các trường nghiệp vụ; Submission sở hữu DTO allowlist và từ chối trường ngoài contract. Dữ liệu judge thuộc Submission/Learning.
- **GW-009-FR-005 — Chuyển tiếp response:** Gateway MUST giữ status và body Submission trả về, bao gồm success và lỗi validation/authorization/not-found. Lỗi kết nối hoặc timeout upstream trả lỗi Gateway hiện có, không tiết lộ chi tiết nội bộ.
- **GW-009-FR-006 — Header và cookie:** Gateway MUST giữ quy tắc response-header/cookie allowlist theo GW-001; không chuyển raw Cookie tới Submission hoặc chuyển tiếp `Set-Cookie` của Submission.
- **GW-009-FR-007 — Correlation và rate limit:** Request MUST tiếp tục dùng correlation/request ID và logging an toàn của Gateway. Không tạo rate limit riêng theo người dùng cho Submit. Giữ cơ chế rate limit mặc định hiện có của Gateway; không biến nó thành chính sách nghiệp vụ mới.
- **GW-009-FR-008 — Không có nghiệp vụ Submission:** Gateway MUST NOT thực thi quy tắc Run/Submit/History, ownership hoặc trạng thái; MUST NOT đọc database/entity/repository của Submission, truy cập Judge hoặc Learning, hay lưu/cache bản ghi.

## Quy tắc nghiệp vụ

- Submission là nguồn chân lý cho Run, Submit và History; Gateway chỉ xử lý transport.
- Gateway không phân biệt quyền Run/Submit theo role, vì SUB-001/SUB-002 cho phép mọi caller đã xác thực ở phiên bản này. Submission vẫn kiểm tra chủ sở hữu/ngữ cảnh tin cậy.
- Submission là bên duy nhất quyết định response nghiệp vụ. Với request được nhận, Gateway không chờ phán quyết thay cho mã `202` bất đồng bộ.
- Không mở route service-to-service nội bộ của Submission qua public Gateway.

## Quy tắc phân quyền

- Người chưa xác thực bị chặn tại Gateway.
- Header `x-auth-user-id`, `x-auth-roles`, `x-auth-permissions`, `x-client-ip` hoặc header tin cậy nội bộ từ client không được chuyển nguyên trạng như dữ liệu đáng tin cậy.
- Gateway không kiểm tra quyền sở hữu bản ghi. Submission quyết định quyền Run/Submit/History theo SUB spec; truy cập history của bản ghi người khác không được lộ ra qua Gateway.

## Đầu vào

| Method | Route | Thành công | Hành vi tại Submission |
| --- | --- | --- | --- |
| `POST` | `/api/submissions` | `202` | Tạo lần nộp chính thức bất đồng bộ |

Gateway chuyển body Submit nguyên dạng tới Submission. Gateway chuyển tiếp body nguyên dạng, không bổ sung hoặc lọc trường; Submission sở hữu việc xác thực DTO và từ chối trường ngoài contract. Dữ liệu judge thuộc Submission/Learning.

Mọi DTO và mã lỗi nghiệp vụ theo SUB-002 phiên bản 1.0 và plan đã Approved.

## Đầu ra

- Request hợp lệ tới đúng Submission upstream với path/query/body được bảo toàn và metadata tin cậy.
- Response status/body được trả theo Submission contract. Route tạo Run/Submit giữ `202`; Gateway không chờ kết quả Judge.
- Auth thất bại bị chặn trước upstream; upstream lỗi được ánh xạ bằng quy ước Gateway hiện có.

## Tình huống lỗi

| Trường hợp | Hành vi quan sát được |
| --- | --- |
| Thiếu/sai/hết hạn access token | Bị Gateway từ chối; không gọi Submission |
| Header định danh giả mạo | Bị loại bỏ; Gateway đặt metadata từ token đã xác minh |
| Submission trả lỗi | Giữ status/body của Submission |
| Submission không khả dụng/timeout | Lỗi Gateway hiện có; không lộ chi tiết upstream |
| Request body/query sai theo contract | Submission trả lỗi kiểm tra; Gateway chuyển tiếp nguyên response |

## Tình huống biên

- Route tĩnh và route có tham số được proxy đúng; Gateway không tự phân tích hay rewrite DTO/path.
- User ID thiếu từ token không được thay bằng giá trị client gửi; request bị chặn theo auth middleware hiện có.
- Run/Submit `202` là phản hồi đã nhận xử lý, không phải kết quả chấm. History vẫn là API kéo do Submission sở hữu.
- Các route khác cùng prefix `/api/submissions` có thể dùng method khác; Gateway chuyển tiếp theo method/path, không giới hạn nhầm vào một hành động duy nhất.

## Yêu cầu bảo mật

- **GW-009-SR-001:** Access token, cookie, bí mật nội bộ và nội dung nhạy cảm MUST NOT xuất hiện trong log.
- **GW-009-SR-002:** Header định danh/quyền do client gửi MUST NOT được tin cậy hoặc chuyển tiếp như metadata Gateway.
- **GW-009-SR-003:** Gateway MUST NOT mở API nội bộ Submission/Judge/Learning ra công khai.
- **GW-009-SR-004:** Gateway MUST NOT cache, lưu trữ hoặc truy cập database/entity/repository của Submission.
- **GW-009-SR-005:** Body/query/response được proxy theo contract; Gateway MUST NOT thêm dữ liệu judge hoặc sửa ownership.

## Tiêu chí nghiệm thu

- **GW-009-AC-001:** Mỗi method/path trong bảng Đầu vào đến đúng Submission upstream; request method/path/query/body không đổi.
- **GW-009-AC-002:** Request chưa xác thực không tới upstream; header giả mạo bị thay bởi metadata từ token đã xác minh.
- **GW-009-AC-003:** Success/error status và body của Submission được trả theo contract; POST tạo xử lý giữ `202`.
- **GW-009-AC-004:** Lỗi upstream không để lộ URL, credential hay chi tiết nội bộ.
- **GW-009-AC-005:** Không có logic ownership/lifecycle/validation nghiệp vụ hay persistence/cache trong Gateway.

## Ngoài phạm vi

- Thay đổi các yêu cầu, DTO, lỗi nghiệp vụ, lưu trữ hay vòng đời của SUB-002 Nộp bài chính thức.
- Thực thi Run/Submit, gọi Judge hoặc lấy judge package trong Gateway.
- Thêm API nghiệp vụ, RBAC theo tài nguyên, cache, retry nghiệp vụ hoặc giới hạn riêng.
- Thay đổi authentication, cookie, CSRF, realtime hoặc các prefix Gateway khác ngoài sửa transport cần thiết để đạt spec.

## Phụ thuộc

- [SUB-002 Submit Code](../../../03-submission/submit-code/spec.md) và [plan](../../../03-submission/submit-code/plan.md), cả hai Approved.
- [GW-001 Gateway structure](../../identity/spec.md) — xác thực, proxy, header và cookie ở biên.
- [API Gateway architecture](../../../../architecture/api-gateway.md), [Submission architecture](../../../../architecture/submission-service.md), [System architecture](../../../../architecture/system-architecture.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

SUB-002 và plan đã Approved chốt route `POST /api/submissions`. Các câu hỏi nghiệp vụ về quyền nộp, tính sẵn sàng Problem, tính trùng lặp và xử lý Submission thuộc SUB-002 đã Approved. Gateway không tự quyết định các hành vi này. Không còn câu hỏi mở ảnh hưởng đến hành vi Gateway.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-11-04 | 0.1 | TBD | Đề xuất hợp đồng Gateway cho SUB-002 Nộp bài chính thức |
| 2026-11-05 | 0.3 | Codex theo chỉ đạo người dùng | Rà soát, đối chiếu SUB nguồn đã Approved và phê duyệt Gateway contract |
| 2026-11-04 | 0.2 | TBD | Căn chỉnh với SUB-002 trên nhánh `specs/03-submission` |
