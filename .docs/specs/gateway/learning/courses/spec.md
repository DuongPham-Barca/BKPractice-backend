# GW-003 Định tuyến Course qua API Gateway

## Trạng thái

Approved

Phiên bản `0.1`, ngày `2026-11-03`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`


## Mục tiêu

Định nghĩa hợp đồng công khai của API Gateway cho Course, Chapter, thứ tự Problem, trạng thái hiển thị và quyền `course:*`. Gateway xác thực người gọi và chuyển tiếp các route đã được Learning công bố tới `LEARNING_SERVICE_URL`; Learning tiếp tục sở hữu toàn bộ nghiệp vụ và dữ liệu. Đặc tả chỉ bao phủ biên Gateway, không thay thế hay mở rộng yêu cầu của LRN-003 Quản lý Course.

## Tác nhân

- **Người dùng đã xác thực:** Đọc Course đã xuất bản theo contract của Learning.
- **LECTURER:** Quản lý Course do mình tạo khi có quyền `course:*` phù hợp.
- **STUDENT / ADMIN:** Không có quyền quản lý ngầm; khả năng đọc Course đã xuất bản vẫn theo LRN-003.
- **API Gateway:** Xác thực, đặt principal tin cậy và chuyển tiếp route; không xét quyền Course.
- **Learning Service:** Sở hữu Course, Chapter, thứ tự Problem, trạng thái xuất bản và RBAC.
- **Identity Service:** Sở hữu access token, session và claim định danh/quyền.

## Bối cảnh

LRN-003 Quản lý Course đã Approved và `plan.md` của tính năng xác định các route dưới đây. Gateway hiện là điểm vào công khai, theo Layered Architecture. Đặc tả này ghi lại hành vi biên cần có để client dùng các API Learning qua Gateway mà không chuyển nghiệp vụ sang Gateway.

## Yêu cầu chức năng

- **GW-003-FR-001 — Định tuyến:** Gateway MUST chuyển tiếp đúng các method/path trong bảng Đầu vào tới `LEARNING_SERVICE_URL`; MUST NOT chuyển chúng tới service khác.
- **GW-003-FR-002 — Ranh giới route:** Gateway MUST nhận diện đúng họ path `/api/courses` theo ranh giới segment. Path có cùng tiền tố chuỗi nhưng không thuộc họ route MUST NOT được chuyển tới Learning như route này.
- **GW-003-FR-003 — Chuyển tiếp nguyên dạng:** Gateway MUST giữ nguyên method, path, query string và body request; không xác thực DTO nghiệp vụ, đổi thứ tự trường hay viết lại route.
- **GW-003-FR-004 — Xác thực:** Mọi route trong phạm vi MUST yêu cầu access token BKPractice hợp lệ. Khi thiếu/sai/hết hạn/thu hồi token, Gateway MUST trả `401` và MUST NOT gọi Learning. Khi Identity không khả dụng để xác minh session, trả `503` và không gọi Learning.
- **GW-003-FR-005 — Metadata tin cậy:** Gateway MUST loại bỏ header định danh/quyền và header tin cậy nội bộ do client gửi; chỉ đặt metadata lấy từ token đã xác minh và transport. Gateway MUST NOT suy ra permissions từ roles.
- **GW-003-FR-006 — CSRF và cookie:** Với xác thực cookie trên method không an toàn, Gateway MUST kiểm tra Origin/Referer và CSRF; lỗi trả `403` không gọi Learning. Không chuyển raw `Cookie` tới Learning hoặc `Set-Cookie` từ Learning về client.
- **GW-003-FR-007 — Phản hồi:** Gateway MUST giữ status và body phản hồi của Learning; chỉ chuyển tiếp `content-type`, `content-length`, `etag`, `last-modified` và `x-request-id`; MUST NOT chuyển `Set-Cookie` hay header tùy ý khác. Lỗi upstream/timeout trả `502` không lộ chi tiết nội bộ.
- **GW-003-FR-008 — Bảo vệ biên:** Path traversal/dot segment có thể đổi đích sau chuẩn hóa MUST bị từ chối `400` trước khi gọi upstream. Các route nội bộ của Learning MUST NOT được mở qua Gateway công khai.
- **GW-003-FR-009 — Giới hạn và tương quan:** Route MUST chịu rate limit mặc định. Mỗi request MUST có `x-request-id` (sinh mới nếu thiếu), được chuyển tới Learning và trả lại client; log gắn với ID này và không chứa thông tin xác thực bí mật.
- **GW-003-FR-010 — Không có nghiệp vụ Learning:** Gateway MUST NOT kiểm tra quyền/ownership/state/visibility, lọc hoặc tổng hợp dữ liệu, lưu cache, hay truy cập database/entity/repository/migration của Learning.

## Quy tắc nghiệp vụ

- Gateway là biên truyền tải; Learning là nguồn chân lý cho Course, Chapter, thứ tự Problem, trạng thái hiển thị và quyền `course:*`.
- Mọi response và lỗi nghiệp vụ thuộc contract của Learning; Gateway không chuyển đổi thành chính sách khác.
- Route `managed` và các route lồng nhau phải được chuyển nguyên dạng; Gateway không tự giải quyết route động hoặc kiểm tra quyền Course.
- Các kiểm soát xác thực, cookie, header, response và rate limit dùng cùng hợp đồng biên GW-002; GW-002 đã Approved và phải được rà soát cùng bộ tài liệu này trước khi triển khai.

## Quy tắc phân quyền

- Mọi route yêu cầu người gọi đã xác thực. Quyền đọc Course đã xuất bản và các quyền quản lý theo `course:*` được Learning đánh giá.
- Learning kiểm tra quyền quản lý phù hợp cùng quyền sở hữu Course; `ADMIN` không có quyền quản lý mặc định và `STUDENT` không quản lý Course.
- Gateway chuyển principal đã xác minh, nhưng MUST NOT tự kiểm tra `course:*`, `createdBy`, trạng thái xuất bản hay trạng thái xóa.
- Gắn Problem vào Chapter không cấp quyền truy cập hoặc quyền quản lý Problem.
- Header định danh/quyền do client gửi không được dùng làm principal tin cậy.

## Đầu vào

Gateway công khai các route sau theo kế hoạch đã Approved của LRN-003 Quản lý Course:

| Method | Route | Thao tác Learning |
| --- | --- | --- |
| `GET` | `/api/courses` | Danh sách Course đã xuất bản |
| `GET` | `/api/courses/managed` | Danh sách Course quản lý |
| `GET` | `/api/courses/managed/:id` | Chi tiết quản lý |
| `GET` | `/api/courses/:idOrSlug` | Chi tiết Course đã xuất bản |
| `POST` | `/api/courses` | Tạo Course |
| `PATCH` | `/api/courses/:id` | Cập nhật Course |
| `POST` | `/api/courses/:id/publish` | Xuất bản |
| `POST` | `/api/courses/:id/hold` | Tạm giữ |
| `POST` | `/api/courses/:id/republish` | Xuất bản lại |
| `DELETE` | `/api/courses/:id` | Xóa/xóa mềm |
| `POST` | `/api/courses/:id/restore` | Khôi phục |
| `POST` | `/api/courses/:id/chapters` | Thêm Chapter |
| `PUT` | `/api/courses/:id/chapters/order` | Sắp xếp Chapter |
| `PATCH` | `/api/courses/:id/chapters/:chapterId` | Sửa Chapter |
| `DELETE` | `/api/courses/:id/chapters/:chapterId` | Xóa Chapter |
| `POST` | `/api/courses/:id/chapters/:chapterId/problems` | Gắn Problem |
| `PUT` | `/api/courses/:id/chapters/:chapterId/problems/order` | Sắp xếp Problem |
| `DELETE` | `/api/courses/:id/chapters/:chapterId/problems/:problemId` | Gỡ Problem |

Mọi route giữ nguyên query/body contract của Learning. Route nội bộ, route không có trong bảng và route ghi ngoài danh sách MUST NOT được mở thêm theo đặc tả này.

## Đầu ra

- Request hợp lệ được chuyển tiếp tới Learning với method/path/query/body tương ứng và metadata định danh đã xác minh.
- Status/body của Learning được trả cho client; chỉ `content-type`, `content-length`, `etag`, `last-modified`, `x-request-id` được chuyển tiếp, không gồm `Set-Cookie`.
- Các lỗi Gateway được trả theo FR-004, FR-006, FR-007 và FR-008; không làm lộ bí mật upstream.

## Tình huống lỗi

| Trường hợp | Kết quả |
| --- | --- |
| Thiếu/sai/hết hạn/thu hồi token | `401`, không gọi Learning |
| Identity không khả dụng khi xác minh session | `503`, không gọi Learning |
| Cookie trên method không an toàn thiếu Origin/CSRF hợp lệ | `403`, không gọi Learning |
| Header định danh/tin cậy giả mạo | Bị loại bỏ và thay bằng metadata tin cậy |
| Path traversal/dot segment làm đổi đích | `400`, không gọi Learning |
| Learning không khả dụng/timeout | `502` |
| Learning trả lỗi nghiệp vụ | Giữ nguyên status/body của Learning |
| Vượt rate limit mặc định | `429` |

## Tình huống biên

- Route tĩnh và route chứa tham số được chuyển cùng một họ; thứ tự khai báo route con thuộc Learning.
- Query lặp, query rỗng và encoding không được Gateway diễn giải thành luật nghiệp vụ; Gateway chuyển tiếp theo contract transport.
- Request lỗi xác thực/CSRF/path không an toàn không được tạo request upstream.
- Không thay đổi các prefix Gateway khác hoặc các route nội bộ service-to-service.

## Yêu cầu bảo mật

- **GW-003-SR-001:** Token, cookie, mật khẩu và bí mật nội bộ MUST NOT xuất hiện trong log/lỗi.
- **GW-003-SR-002:** Header định danh/quyền và header bí mật do client đặt MUST NOT tới Learning dưới dạng tin cậy.
- **GW-003-SR-003:** Route nội bộ Learning và dữ liệu ngoài contract MUST NOT có thể truy cập qua route công khai này.
- **GW-003-SR-004:** Gateway MUST NOT truy cập database, entity, repository hay migration của Learning.
- **GW-003-SR-005:** Query/body và response không bị Gateway dùng để đưa ra quyết định quyền hoặc lộ dữ liệu ngoài phản hồi Learning.

## Tiêu chí nghiệm thu

- **GW-003-AC-001:** Mỗi method/path trong bảng Đầu vào tới đúng `LEARNING_SERVICE_URL`, giữ nguyên method/path/query/body.
- **GW-003-AC-002:** Path không thuộc đúng ranh giới prefix không bị định tuyến như route trong phạm vi.
- **GW-003-AC-003:** Token thiếu/sai/hết hạn/thu hồi trả `401`; upstream không được gọi. Identity unavailable trả `503`.
- **GW-003-AC-004:** Header giả mạo bị loại bỏ; upstream nhận metadata từ token đã xác minh.
- **GW-003-AC-005:** Cookie unsafe request không hợp lệ bị `403`; raw Cookie/Set-Cookie không vượt biên theo quy tắc.
- **GW-003-AC-006:** Status/body Learning được giữ nguyên; timeout/upstream outage trả `502` không lộ chi tiết nội bộ.
- **GW-003-AC-007:** Request traversal/dot segment bị `400` và không gọi upstream; route nội bộ không truy cập được.
- **GW-003-AC-008:** Rate limit mặc định, `x-request-id` và logging an toàn được giữ trên route.
- **GW-003-AC-009:** Không có kiểm tra quyền/state nghiệp vụ, cache, lưu trữ hay truy cập nội bộ Learning trong Gateway.

## Ngoài phạm vi

- Thay đổi bất kỳ requirement, route, DTO, status nghiệp vụ hoặc quyền nào của LRN-003 Quản lý Course.
- Thêm CRUD hoặc endpoint Learning không có trong bảng Đầu vào.
- Thực thi RBAC, kiểm tra ownership/member, lọc dữ liệu theo vai trò tại Gateway.
- Thêm cache, API composition, retry nghiệp vụ, rate limit riêng hoặc database cho Gateway.
- Thay đổi Identity, Learning, các prefix khác, realtime hay contract service-to-service.

## Phụ thuộc

- [LRN-003 Quản lý Course spec](../../../02-learning/courses/spec.md) và [plan](../../../02-learning/courses/plan.md) — nguồn hành vi/route; cả hai Approved.
- [GW-001 Gateway layering](../../identity/spec.md) — đặc tả cấu trúc Gateway đã Approved.
- [GW-002 Problem boundary](../problems/spec.md) — hợp đồng biên proxy và hardening đang Proposed; cần review cùng tài liệu này.
- [API Gateway architecture](../../../../architecture/api-gateway.md), [System architecture](../../../../architecture/system-architecture.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

Không có câu hỏi về route hoặc quyền nghiệp vụ trong nguồn đã Approved. Hành vi biên Gateway được phê duyệt theo chỉ đạo của người dùng; GW-002 là hợp đồng nền đã Approved.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-11-04 | 0.1 | Codex theo chỉ đạo người dùng | Phê duyệt sau review Gateway contract, route Learning và kiến trúc |
| 2026-11-03 | 0.1 | Codex | Đề xuất hợp đồng Gateway cho LRN-003 Quản lý Course |
