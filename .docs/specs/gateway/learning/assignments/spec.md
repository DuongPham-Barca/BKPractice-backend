# GW-005 Định tuyến Assignment qua API Gateway

> **Ngừng áp dụng theo LRN-008 (2026-11-07):** Gateway không định tuyến Class/Enrollment/Assignment. Nội dung dưới đây lưu lại lịch sử; xem [Learning tự học](../../../02-learning/self-study/spec.md).

## Trạng thái

Approved

Phiên bản `0.1`, ngày `2026-11-03`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

## Mục tiêu

Định nghĩa hợp đồng công khai của API Gateway cho Assignment, Class, danh sách Problem, hạn chót, tính điểm và quyền `assignment:*`. Gateway xác thực người gọi và chuyển tiếp các route đã được Learning công bố tới `LEARNING_SERVICE_URL`; Learning tiếp tục sở hữu toàn bộ nghiệp vụ và dữ liệu. Đặc tả chỉ bao phủ biên Gateway, không thay thế hay mở rộng yêu cầu của LRN-005 Quản lý Assignment.

## Tác nhân

- **LECTURER:** Quản lý Assignment thuộc Class mình sở hữu theo quyền `assignment:*`.
- **STUDENT:** Đọc Assignment hướng sinh viên khi đã đăng ký vào Class tương ứng.
- **API Gateway:** Xác thực, đặt principal tin cậy và chuyển tiếp các route `/api/classes/.../assignments` và `/api/assignments`; không kiểm tra membership hay quyền Assignment.
- **Learning Service:** Sở hữu Assignment, quyền quản lý, quan hệ với Class và trạng thái xuất bản.
- **Identity Service:** Sở hữu access token, session và claim định danh/quyền.
- **Submission / Progress:** Submission nhận bài nộp; Progress sở hữu các route điểm và tiến độ.

## Bối cảnh

LRN-005 Quản lý Assignment đã Approved và `plan.md` của tính năng xác định các route dưới đây. Gateway hiện là điểm vào công khai, theo Layered Architecture. Đặc tả này ghi lại hành vi biên cần có để client dùng các API Learning qua Gateway mà không chuyển nghiệp vụ sang Gateway.

## Yêu cầu chức năng

- **GW-005-FR-001 — Định tuyến:** Gateway MUST chuyển tiếp đúng các method/path trong bảng Đầu vào tới `LEARNING_SERVICE_URL`; MUST NOT chuyển chúng tới service khác.
- **GW-005-FR-002 — Ranh giới route:** Gateway MUST nhận diện đúng họ path `/api/classes` (các route Assignment) và `/api/assignments` theo ranh giới segment. Path có cùng tiền tố chuỗi nhưng không thuộc họ route MUST NOT được chuyển tới Learning như route này.
- **GW-005-FR-003 — Chuyển tiếp nguyên dạng:** Gateway MUST giữ nguyên method, path, query string và body request; không xác thực DTO nghiệp vụ, đổi thứ tự trường hay viết lại route.
- **GW-005-FR-004 — Xác thực:** Mọi route trong phạm vi MUST yêu cầu access token BKPractice hợp lệ. Khi thiếu/sai/hết hạn/thu hồi token, Gateway MUST trả `401` và MUST NOT gọi Learning. Khi Identity không khả dụng để xác minh session, trả `503` và không gọi Learning.
- **GW-005-FR-005 — Metadata tin cậy:** Gateway MUST loại bỏ header định danh/quyền và header tin cậy nội bộ do client gửi; chỉ đặt metadata lấy từ token đã xác minh và transport. Gateway MUST NOT suy ra permissions từ roles.
- **GW-005-FR-006 — CSRF và cookie:** Với xác thực cookie trên method không an toàn, Gateway MUST kiểm tra Origin/Referer và CSRF; lỗi trả `403` không gọi Learning. Không chuyển raw `Cookie` tới Learning hoặc `Set-Cookie` từ Learning về client.
- **GW-005-FR-007 — Phản hồi:** Gateway MUST giữ status và body phản hồi của Learning; chỉ chuyển tiếp `content-type`, `content-length`, `etag`, `last-modified` và `x-request-id`; MUST NOT chuyển `Set-Cookie` hay header tùy ý khác. Lỗi upstream/timeout trả `502` không lộ chi tiết nội bộ.
- **GW-005-FR-008 — Bảo vệ biên:** Path traversal/dot segment có thể đổi đích sau chuẩn hóa MUST bị từ chối `400` trước khi gọi upstream. Các route nội bộ của Learning MUST NOT được mở qua Gateway công khai.
- **GW-005-FR-009 — Giới hạn và tương quan:** Route MUST chịu rate limit mặc định. Mỗi request MUST có `x-request-id` (sinh mới nếu thiếu), được chuyển tới Learning và trả lại client; log gắn với ID này và không chứa thông tin xác thực bí mật.
- **GW-005-FR-010 — Không có nghiệp vụ Learning:** Gateway MUST NOT kiểm tra quyền/ownership/state/visibility, lọc hoặc tổng hợp dữ liệu, lưu cache, hay truy cập database/entity/repository/migration của Learning.

## Quy tắc nghiệp vụ

- Gateway là biên truyền tải; Learning là nguồn chân lý cho Assignment, Class, danh sách Problem, hạn chót, tính điểm và quyền `assignment:*`.
- Mọi response và lỗi nghiệp vụ thuộc contract của Learning; Gateway không chuyển đổi thành chính sách khác.
- Route Assignment nằm dưới hai prefix đã được Gateway định tuyến tới Learning; cần giữ nguyên cả path và phân quyền, không tự tổng hợp điểm (thuộc Progress).
- Các kiểm soát xác thực, cookie, header, response và rate limit dùng cùng hợp đồng biên GW-002; GW-002 đã Approved và phải được rà soát cùng bộ tài liệu này trước khi triển khai.

## Quy tắc phân quyền

- Mọi route yêu cầu người gọi đã xác thực. Learning đánh giá quyền `assignment:*` cùng quyền sở hữu Class cho thao tác quản lý.
- Các route hướng sinh viên chỉ trả Assignment thuộc Class mà người gọi đã đăng ký; Learning thực hiện kiểm tra enrollment.
- Gateway chuyển principal đã xác minh, nhưng MUST NOT tự kiểm tra `assignment:*`, quyền sở hữu Class, membership, trạng thái Assignment hoặc quyền đọc của sinh viên.
- Gateway MUST NOT suy ra quyền từ `:classId`, `:id`, role hay query. Các route không nhận `studentId`; danh tính người gọi lấy từ context tin cậy.
- `ADMIN` không có quyền quản lý ngầm. Quyền xem điểm thuộc LRN-006 Progress; gắn Problem vào Assignment không cấp quyền trên Problem.

## Đầu vào

Gateway công khai các route sau theo kế hoạch đã Approved của LRN-005 Quản lý Assignment:

| Method   | Route                                       | Thao tác Learning          |
| -------- | ------------------------------------------- | -------------------------- |
| `POST`   | `/api/classes/:classId/assignments`         | Tạo Assignment trong Class |
| `GET`    | `/api/classes/:classId/assignments/managed` | Danh sách quản lý          |
| `GET`    | `/api/classes/:classId/assignments`         | Danh sách hướng sinh viên  |
| `GET`    | `/api/assignments/managed/:id`              | Chi tiết quản lý           |
| `GET`    | `/api/assignments/:id`                      | Chi tiết hướng sinh viên   |
| `PATCH`  | `/api/assignments/:id`                      | Cập nhật                   |
| `PUT`    | `/api/assignments/:id/problems`             | Thay danh sách Problem     |
| `POST`   | `/api/assignments/:id/publish`              | Xuất bản                   |
| `DELETE` | `/api/assignments/:id`                      | Xóa/xóa mềm                |
| `POST`   | `/api/assignments/:id/restore`              | Khôi phục                  |

Mọi route giữ nguyên query/body contract của Learning. Route nội bộ, route không có trong bảng và route ghi ngoài danh sách MUST NOT được mở thêm theo đặc tả này.

## Đầu ra

- Request hợp lệ được chuyển tiếp tới Learning với method/path/query/body tương ứng và metadata định danh đã xác minh.
- Status/body của Learning được trả cho client; chỉ `content-type`, `content-length`, `etag`, `last-modified`, `x-request-id` được chuyển tiếp, không gồm `Set-Cookie`.
- Các lỗi Gateway được trả theo FR-004, FR-006, FR-007 và FR-008; không làm lộ bí mật upstream.

## Tình huống lỗi

| Trường hợp                                                | Kết quả                                  |
| --------------------------------------------------------- | ---------------------------------------- |
| Thiếu/sai/hết hạn/thu hồi token                           | `401`, không gọi Learning                |
| Identity không khả dụng khi xác minh session              | `503`, không gọi Learning                |
| Cookie trên method không an toàn thiếu Origin/CSRF hợp lệ | `403`, không gọi Learning                |
| Header định danh/tin cậy giả mạo                          | Bị loại bỏ và thay bằng metadata tin cậy |
| Path traversal/dot segment làm đổi đích                   | `400`, không gọi Learning                |
| Learning không khả dụng/timeout                           | `502`                                    |
| Learning trả lỗi nghiệp vụ                                | Giữ nguyên status/body của Learning      |
| Vượt rate limit mặc định                                  | `429`                                    |

## Tình huống biên

- Route tĩnh và route chứa tham số được chuyển cùng một họ; thứ tự khai báo route con thuộc Learning.
- Query lặp, query rỗng và encoding không được Gateway diễn giải thành luật nghiệp vụ; Gateway chuyển tiếp theo contract transport.
- Request lỗi xác thực/CSRF/path không an toàn không được tạo request upstream.
- Không thay đổi các prefix Gateway khác hoặc các route nội bộ service-to-service.

## Yêu cầu bảo mật

- **GW-005-SR-001:** Token, cookie, mật khẩu và bí mật nội bộ MUST NOT xuất hiện trong log/lỗi.
- **GW-005-SR-002:** Header định danh/quyền và header bí mật do client đặt MUST NOT tới Learning dưới dạng tin cậy.
- **GW-005-SR-003:** Route nội bộ Learning và dữ liệu ngoài contract MUST NOT có thể truy cập qua route công khai này.
- **GW-005-SR-004:** Gateway MUST NOT truy cập database, entity, repository hay migration của Learning.
- **GW-005-SR-005:** Query/body và response không bị Gateway dùng để đưa ra quyết định quyền hoặc lộ dữ liệu ngoài phản hồi Learning.

## Tiêu chí nghiệm thu

- **GW-005-AC-001:** Mỗi method/path trong bảng Đầu vào tới đúng `LEARNING_SERVICE_URL`, giữ nguyên method/path/query/body.
- **GW-005-AC-002:** Path không thuộc đúng ranh giới prefix không bị định tuyến như route trong phạm vi.
- **GW-005-AC-003:** Token thiếu/sai/hết hạn/thu hồi trả `401`; upstream không được gọi. Identity unavailable trả `503`.
- **GW-005-AC-004:** Header giả mạo bị loại bỏ; upstream nhận metadata từ token đã xác minh.
- **GW-005-AC-005:** Cookie unsafe request không hợp lệ bị `403`; raw Cookie/Set-Cookie không vượt biên theo quy tắc.
- **GW-005-AC-006:** Status/body Learning được giữ nguyên; timeout/upstream outage trả `502` không lộ chi tiết nội bộ.
- **GW-005-AC-007:** Request traversal/dot segment bị `400` và không gọi upstream; route nội bộ không truy cập được.
- **GW-005-AC-008:** Rate limit mặc định, `x-request-id` và logging an toàn được giữ trên route.
- **GW-005-AC-009:** Không có kiểm tra quyền/state nghiệp vụ, cache, lưu trữ hay truy cập nội bộ Learning trong Gateway.

## Ngoài phạm vi

- Thay đổi bất kỳ requirement, route, DTO, status nghiệp vụ hoặc quyền nào của LRN-005 Quản lý Assignment.
- Thêm CRUD hoặc endpoint Learning không có trong bảng Đầu vào.
- Thực thi RBAC, kiểm tra ownership/member, lọc dữ liệu theo vai trò tại Gateway.
- Thêm cache, API composition, retry nghiệp vụ, rate limit riêng hoặc database cho Gateway.
- Thay đổi Identity, Learning, các prefix khác, realtime hay contract service-to-service.

## Phụ thuộc

- [LRN-005 Quản lý Assignment spec](../../../02-learning/assignments/spec.md) và [plan](../../../02-learning/assignments/plan.md) — nguồn hành vi/route; cả hai Approved.
- [GW-001 Gateway layering](../../identity/spec.md) — đặc tả cấu trúc Gateway đã Approved.
- [GW-002 Problem boundary](../problems/spec.md) — hợp đồng biên proxy và hardening đang Proposed; cần review cùng tài liệu này.
- [API Gateway architecture](../../../../architecture/api-gateway.md), [System architecture](../../../../architecture/system-architecture.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

Không có câu hỏi về route hoặc quyền nghiệp vụ trong nguồn đã Approved. Hành vi biên Gateway được phê duyệt theo chỉ đạo của người dùng; GW-002 là hợp đồng nền đã Approved.

## Lịch sử sửa đổi

| Ngày       | Phiên bản | Tác giả/Người review          | Tóm tắt                                                            |
| ---------- | --------- | ----------------------------- | ------------------------------------------------------------------ |
| 2026-11-04 | 0.1       | Codex theo chỉ đạo người dùng | Phê duyệt sau review Gateway contract, route Learning và kiến trúc |
| 2026-11-03 | 0.1       | Codex                         | Đề xuất hợp đồng Gateway cho LRN-005 Quản lý Assignment            |
