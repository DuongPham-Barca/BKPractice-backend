# GW-006 Định tuyến Progress qua API Gateway

## Trạng thái

Approved

Phiên bản `0.1`, ngày `2026-11-03`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`


## Mục tiêu

Định nghĩa hợp đồng công khai của API Gateway cho Progress, sự kiện submission.accepted, quyền xem của sinh viên/giảng viên và dữ liệu điểm. Gateway xác thực người gọi và chuyển tiếp các route đã được Learning công bố tới `LEARNING_SERVICE_URL`; Learning tiếp tục sở hữu toàn bộ nghiệp vụ và dữ liệu. Đặc tả chỉ bao phủ biên Gateway, không thay thế hay mở rộng yêu cầu của LRN-006 Tiến độ học tập (Progress).

## Tác nhân

- **Người dùng đã xác thực:** Đọc tiến độ Problem/Course và điểm Assignment của chính mình.
- **LECTURER sở hữu Class:** Đọc tiến độ sinh viên trong phạm vi Class mình sở hữu khi Learning cho phép `class:read-managed`.
- **Submission Service:** Phát sự kiện `submission.accepted` nội bộ; đây không phải route public Gateway.
- **API Gateway:** Chỉ xác thực và chuyển tiếp các route GET Progress.
- **Learning Service:** Sở hữu dữ liệu tiến độ, điểm, xử lý sự kiện và kiểm tra quyền tài nguyên.
- **Identity Service:** Sở hữu access token và principal tin cậy.

## Bối cảnh

LRN-006 Tiến độ học tập (Progress) đã Approved và `plan.md` của tính năng xác định các route dưới đây. Gateway hiện là điểm vào công khai, theo Layered Architecture. Đặc tả này ghi lại hành vi biên cần có để client dùng các API Learning qua Gateway mà không chuyển nghiệp vụ sang Gateway.

## Yêu cầu chức năng

- **GW-006-FR-001 — Định tuyến:** Gateway MUST chuyển tiếp đúng các method/path trong bảng Đầu vào tới `LEARNING_SERVICE_URL`; MUST NOT chuyển chúng tới service khác.
- **GW-006-FR-002 — Ranh giới route:** Gateway MUST nhận diện đúng họ path `/api/progress` theo ranh giới segment. Path có cùng tiền tố chuỗi nhưng không thuộc họ route MUST NOT được chuyển tới Learning như route này.
- **GW-006-FR-003 — Chuyển tiếp nguyên dạng:** Gateway MUST giữ nguyên method, path, query string và body request; không xác thực DTO nghiệp vụ, đổi thứ tự trường hay viết lại route.
- **GW-006-FR-004 — Xác thực:** Mọi route trong phạm vi MUST yêu cầu access token BKPractice hợp lệ. Khi thiếu/sai/hết hạn/thu hồi token, Gateway MUST trả `401` và MUST NOT gọi Learning. Khi Identity không khả dụng để xác minh session, trả `503` và không gọi Learning.
- **GW-006-FR-005 — Metadata tin cậy:** Gateway MUST loại bỏ header định danh/quyền và header tin cậy nội bộ do client gửi; chỉ đặt metadata lấy từ token đã xác minh và transport. Gateway MUST NOT suy ra permissions từ roles.
- **GW-006-FR-006 — CSRF và cookie:** Với xác thực cookie trên method không an toàn, Gateway MUST kiểm tra Origin/Referer và CSRF; lỗi trả `403` không gọi Learning. Không chuyển raw `Cookie` tới Learning hoặc `Set-Cookie` từ Learning về client.
- **GW-006-FR-007 — Phản hồi:** Gateway MUST giữ status và body phản hồi của Learning; chỉ chuyển tiếp `content-type`, `content-length`, `etag`, `last-modified` và `x-request-id`; MUST NOT chuyển `Set-Cookie` hay header tùy ý khác. Lỗi upstream/timeout trả `502` không lộ chi tiết nội bộ.
- **GW-006-FR-008 — Bảo vệ biên:** Path traversal/dot segment có thể đổi đích sau chuẩn hóa MUST bị từ chối `400` trước khi gọi upstream. Các route nội bộ của Learning MUST NOT được mở qua Gateway công khai.
- **GW-006-FR-009 — Giới hạn và tương quan:** Route MUST chịu rate limit mặc định. Mỗi request MUST có `x-request-id` (sinh mới nếu thiếu), được chuyển tới Learning và trả lại client; log gắn với ID này và không chứa thông tin xác thực bí mật.
- **GW-006-FR-010 — Không có nghiệp vụ Learning:** Gateway MUST NOT kiểm tra quyền/ownership/state/visibility, lọc hoặc tổng hợp dữ liệu, lưu cache, hay truy cập database/entity/repository/migration của Learning.

## Quy tắc nghiệp vụ

- Gateway là biên truyền tải; Learning là nguồn chân lý cho Progress, sự kiện submission.accepted, quyền xem của sinh viên/giảng viên và dữ liệu điểm.
- Mọi response và lỗi nghiệp vụ thuộc contract của Learning; Gateway không chuyển đổi thành chính sách khác.
- Chỉ có GET; Gateway chuyển nguyên query (đặc biệt `problemIds`) và không thêm route ghi hoặc thay đổi dữ liệu tiến độ.
- Các kiểm soát xác thực, cookie, header, response và rate limit dùng cùng hợp đồng biên GW-002; GW-002 đã Approved và phải được rà soát cùng bộ tài liệu này trước khi triển khai.

## Quy tắc phân quyền

- Các route `/api/progress/me/...` luôn gắn với user ID trong context Gateway đã xác minh; client không thể chọn người dùng khác bằng path, query hay body.
- Các route `/api/progress/classes/...` chỉ cho chủ sở hữu Class xem dữ liệu trong Class đó. Learning kiểm tra `class:read-managed`, quyền sở hữu và phạm vi sinh viên.
- Gateway MUST NOT tự kiểm tra `class:read-managed`, quyền sở hữu Class hoặc quan hệ giữa `:studentId` và Class; `:studentId` là target của truy vấn, không phải principal.
- LRN-006 không thêm route ghi. Tiến độ chỉ được cập nhật qua sự kiện nội bộ `submission.accepted`, không qua Gateway.
- `ADMIN` không có quyền xem tiến độ người khác nếu không là chủ sở hữu Class; sinh viên không xem tiến độ của nhau.

## Đầu vào

Gateway công khai các route sau theo kế hoạch đã Approved của LRN-006 Tiến độ học tập (Progress):

| Method | Route | Thao tác Learning |
| --- | --- | --- |
| `GET` | `/api/progress/me/problems` | Problem đã giải của tôi |
| `GET` | `/api/progress/me/problems/status?problemIds=...` | Trạng thái các Problem của tôi |
| `GET` | `/api/progress/me/courses/:courseId` | Tiến độ Course của tôi |
| `GET` | `/api/progress/me/assignments/:assignmentId` | Điểm Assignment của tôi |
| `GET` | `/api/progress/classes/:classId/course` | Tiến độ Course của Class |
| `GET` | `/api/progress/classes/:classId/students/:studentId/course` | Tiến độ một sinh viên |
| `GET` | `/api/progress/classes/:classId/assignments/:assignmentId` | Điểm Assignment của Class |

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

- **GW-006-SR-001:** Token, cookie, mật khẩu và bí mật nội bộ MUST NOT xuất hiện trong log/lỗi.
- **GW-006-SR-002:** Header định danh/quyền và header bí mật do client đặt MUST NOT tới Learning dưới dạng tin cậy.
- **GW-006-SR-003:** Route nội bộ Learning và dữ liệu ngoài contract MUST NOT có thể truy cập qua route công khai này.
- **GW-006-SR-004:** Gateway MUST NOT truy cập database, entity, repository hay migration của Learning.
- **GW-006-SR-005:** Query/body và response không bị Gateway dùng để đưa ra quyết định quyền hoặc lộ dữ liệu ngoài phản hồi Learning.

## Tiêu chí nghiệm thu

- **GW-006-AC-001:** Mỗi method/path trong bảng Đầu vào tới đúng `LEARNING_SERVICE_URL`, giữ nguyên method/path/query/body.
- **GW-006-AC-002:** Path không thuộc đúng ranh giới prefix không bị định tuyến như route trong phạm vi.
- **GW-006-AC-003:** Token thiếu/sai/hết hạn/thu hồi trả `401`; upstream không được gọi. Identity unavailable trả `503`.
- **GW-006-AC-004:** Header giả mạo bị loại bỏ; upstream nhận metadata từ token đã xác minh.
- **GW-006-AC-005:** Cookie unsafe request không hợp lệ bị `403`; raw Cookie/Set-Cookie không vượt biên theo quy tắc.
- **GW-006-AC-006:** Status/body Learning được giữ nguyên; timeout/upstream outage trả `502` không lộ chi tiết nội bộ.
- **GW-006-AC-007:** Request traversal/dot segment bị `400` và không gọi upstream; route nội bộ không truy cập được.
- **GW-006-AC-008:** Rate limit mặc định, `x-request-id` và logging an toàn được giữ trên route.
- **GW-006-AC-009:** Không có kiểm tra quyền/state nghiệp vụ, cache, lưu trữ hay truy cập nội bộ Learning trong Gateway.

## Ngoài phạm vi

- Thay đổi bất kỳ requirement, route, DTO, status nghiệp vụ hoặc quyền nào của LRN-006 Tiến độ học tập (Progress).
- Thêm CRUD hoặc endpoint Learning không có trong bảng Đầu vào.
- Thực thi RBAC, kiểm tra ownership/member, lọc dữ liệu theo vai trò tại Gateway.
- Thêm cache, API composition, retry nghiệp vụ, rate limit riêng hoặc database cho Gateway.
- Thay đổi Identity, Learning, các prefix khác, realtime hay contract service-to-service.

## Phụ thuộc

- [LRN-006 Tiến độ học tập (Progress) spec](../../../02-learning/progress/spec.md) và [plan](../../../02-learning/progress/plan.md) — nguồn hành vi/route; cả hai Approved.
- [GW-001 Gateway layering](../../identity/spec.md) — đặc tả cấu trúc Gateway đã Approved.
- [GW-002 Problem boundary](../problems/spec.md) — hợp đồng biên proxy và hardening đang Proposed; cần review cùng tài liệu này.
- [API Gateway architecture](../../../../architecture/api-gateway.md), [System architecture](../../../../architecture/system-architecture.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

Không có câu hỏi về route hoặc quyền nghiệp vụ trong nguồn đã Approved. Hành vi biên Gateway được phê duyệt theo chỉ đạo của người dùng; GW-002 là hợp đồng nền đã Approved.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-11-04 | 0.1 | Codex theo chỉ đạo người dùng | Phê duyệt sau review Gateway contract, route Learning và kiến trúc |
| 2026-11-03 | 0.1 | Codex | Đề xuất hợp đồng Gateway cho LRN-006 Tiến độ học tập (Progress) |
