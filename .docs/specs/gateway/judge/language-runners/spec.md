# GW-013 Ranh giới Gateway — Language Runners

## Trạng thái

Approved

Phiên bản `0.1`, ngày `2026-11-04`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

> Đặc tả Gateway này đã được rà soát và phê duyệt. Phê duyệt này chỉ chốt ranh giới Gateway; nội dung JDG còn Proposed không thuộc phạm vi phê duyệt.

## Mục tiêu

Ghi rõ cách API Gateway tôn trọng ranh giới của JDG-002. Judge là worker nội bộ; client gửi thao tác chạy/nộp tới Submission, Submission trao đổi với Judge qua RabbitMQ. Không có API công khai tới Judge.

## Tác nhân

- **Client:** Gửi thao tác nghiệp vụ tới các route Gateway/Submission được công bố.
- **API Gateway:** Xác thực và proxy tới business service sở hữu API; không định tuyến tới Judge.
- **Submission Service:** Chuẩn bị job tin cậy, gửi `judge.request` và áp dụng `judge.result`.
- **Judge Service:** Thực hiện runner ngôn ngữ qua message nội bộ.
- **RabbitMQ:** Vận chuyển message giữa Submission và Judge.

## Bối cảnh

JDG-002 đang Proposed và mô tả một phần nội bộ của Judge. Kiến trúc hệ thống và Judge Service đã xác định Judge không có API công khai; Submission là caller duy nhất, giao tiếp qua RabbitMQ. Gateway chỉ chuyển `/api/run` và `/api/submissions` tới Submission. Đặc tả này giới hạn trách nhiệm Gateway trong phạm vi cụ thể của JDG-002, không phê duyệt các yêu cầu JDG còn mở.

## Yêu cầu chức năng

- **GW-013-FR-001 — Không có API Judge:** Gateway MUST NOT expose HTTP, WebSocket hoặc Socket.IO route để client gọi Judge trực tiếp cho runner ngôn ngữ.
- **GW-013-FR-002 — Định tuyến qua Submission:** Request client khởi tạo Run/Submit MUST đi tới Submission qua route đã công bố; Gateway MUST NOT gửi request tới Judge.
- **GW-013-FR-003 — Không chuyển payload nội bộ:** Gateway MUST NOT nhận hoặc chuyển tiếp `JudgeRequest`, `JudgeResult`, RabbitMQ message, hay judge chọn adapter c/c++/java/python từ danh mục được duyệt như một contract public.
- **GW-013-FR-004 — Không có tham số điều khiển Judge:** Gateway không cung cấp endpoint chọn runner, compiler/runtime command, image hoặc flags; các trường đó không được thêm vào public API.
- **GW-013-FR-005 — Không có business logic Judge:** Gateway MUST NOT tự thực hiện runner ngôn ngữ, đọc dữ liệu nội bộ service, hoặc truy cập database/entity/repository của Judge.
- **GW-013-FR-006 — Response qua Submission:** Mọi status, verdict, điểm, chi tiết lịch sử hoặc kết quả được client thấy MUST đến từ API Submission theo SUB-001/SUB-002/SUB-003. Realtime chỉ dùng notification allowlist SUB-004; không phát payload Judge thô.
- **GW-013-FR-007 — Không có upstream Judge:** Gateway MUST NOT đăng ký Judge làm upstream HTTP, mở service-internal route ra public listener, hoặc cho path/header/query chọn Judge làm đích.

## Quy tắc nghiệp vụ

- Judge chọn adapter C/C++/Java/Python từ danh mục được duyệt; command, image và toolchain là cấu hình tin cậy của nền tảng.
- Submission là ranh giới giữa public API và Judge. Gateway không làm worker, broker, proxy message hoặc result adapter cho Judge.
- Quy tắc chấm, runner, harness, OOP contract và sandbox chi tiết tiếp tục thuộc JDG-002 và kiến trúc Judge; spec này chỉ mô tả những gì Gateway không expose.
- Không thêm hành vi public dựa trên các câu hỏi còn mở trong JDG-002.

## Quy tắc phân quyền

- Authentication áp dụng tại Gateway cho route Submission; Submission quyết định owner và quyền nghiệp vụ.
- Không có role, permission hoặc service header nào cấp quyền client gọi Judge.
- Chỉ message nội bộ từ Submission đi vào Judge theo ranh giới đã chọn; Gateway không xác thực hoặc phát message Judge thay client.

## Đầu vào

| Request | Đường đi được phép | Gateway không làm |
| --- | --- | --- |
| Client Run | `POST /api/run` → Submission | Không tạo JudgeRequest hoặc định tuyến tới Judge |
| Client Submit | `POST /api/submissions` → Submission | Không nhận hidden judge data hoặc lệnh runner |
| Judge job | Submission → RabbitMQ `judge.request` → Judge | Không làm broker/proxy cho message |
| Judge result | Judge → RabbitMQ `judge.result` → Submission | Không trả trực tiếp cho client |

Các giá trị/ngữ nghĩa cụ thể của phần Judge thuộc `JDG-002` và được giữ Proposed cho tới khi được duyệt.

## Đầu ra

- Gateway trả response do Submission tạo theo các spec SUB đã Approved.
- Gateway không trả JudgeResult trực tiếp; không lộ các trường nội bộ của phần `Language Runners`.
- Không có public route/upstream mới cho Judge.

## Tình huống lỗi

| Trường hợp | Hành vi |
| --- | --- |
| Client gọi path định danh Judge | Không được định tuyến tới Judge; giữ route-miss behavior hiện tại |
| Client gửi trường điều khiển Judge trên route Submission | Gateway không diễn giải; Submission validation xử lý theo contract của nó |
| Client cố chọn upstream qua path/header/query | Không thay đổi route đích hoặc quyền |
| Judge/queue gặp lỗi | Submission xử lý theo SUB contract; Gateway không chuyển tiếp raw internal error/result |

Không tạo status code mới cho route không được công bố.

## Tình huống biên

- Các route Submission vẫn có thể proxy cùng path cho nhiều method, nhưng không method nào chuyển tới Judge.
- Việc client biết tên queue, runner, image hay sandbox không tạo quyền gọi chúng.
- Contract nội bộ JDG chưa Approved không được phản chiếu thành DTO/Swagger public.

## Yêu cầu bảo mật

- **GW-013-SR-001:** Không có public ingress từ Gateway tới Judge cho runner ngôn ngữ.
- **GW-013-SR-002:** Payload/chẩn đoán/dữ liệu nội bộ Judge không đi trực tiếp qua client-facing Gateway API.
- **GW-013-SR-003:** Gateway không log source code, input, hidden test/harness, command hoặc sandbox secret.
- **GW-013-SR-004:** Gateway không import Judge internal code, runner, sandbox hoặc persistence model.

## Tiêu chí nghiệm thu

- **GW-013-AC-001:** Không có route/controller/upstream Gateway trực tiếp tới Judge cho phạm vi JDG-002.
- **GW-013-AC-002:** Run/Submit tiếp tục định tuyến tới Submission theo GW-008/GW-009.
- **GW-013-AC-003:** Path/header/query/body không thể biến request Submission thành request Judge hay chọn Judge làm upstream.
- **GW-013-AC-004:** Realtime vẫn chỉ phát notification allowlist, không chuyển JudgeResult thô.
- **GW-013-AC-005:** Không có Judge dependency/config/persistence trong Gateway.

## Ngoài phạm vi

- Phê duyệt hoặc triển khai nội dung còn mở của JDG-002.
- Thay đổi Judge pipeline, runner, harness, verdict, sandbox hay RabbitMQ contract.
- Thay đổi SUB APIs, History hoặc realtime notification.
- Thêm API quản trị/diagnostic Judge công khai.

## Phụ thuộc

- [JDG-002 spec](../../../04-judge/language-runners/spec.md) và [plan](../../../04-judge/language-runners/plan.md) — bối cảnh riêng; cả hai đang Proposed.
- [GW-008 Run](../../submission/run-code/spec.md), [GW-009 Submit](../../submission/submit-code/spec.md), [GW-011 Realtime](../../submission/realtime-result/spec.md).
- [SUB-001 Run](../../../03-submission/run-code/spec.md), [SUB-002 Submit](../../../03-submission/submit-code/spec.md), [SUB-004 Realtime](../../../03-submission/realtime-result/spec.md).
- [System architecture](../../../../architecture/system-architecture.md), [Judge architecture](../../../../architecture/judge-service.md), [Submission architecture](../../../../architecture/submission-service.md), [API Gateway architecture](../../../../architecture/api-gateway.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

Không có câu hỏi về ranh giới Gateway: Judge không có API công khai. Chi tiết nghiệp vụ còn mở trong JDG-002 không thuộc spec này. GW spec đã được phê duyệt; việc triển khai theo checklist và xác minh runtime vẫn phải được thực hiện riêng.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-11-04 | 0.1 | TBD | Đề xuất ranh giới Gateway cho JDG-002 |
| 2026-11-05 | 0.1 | OpenCode theo chỉ đạo người dùng | Rà soát và phê duyệt ranh giới Gateway; không phê duyệt nội dung JDG còn Proposed |
