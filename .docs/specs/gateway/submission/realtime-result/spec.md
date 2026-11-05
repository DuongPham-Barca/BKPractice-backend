# GW-011 Kết quả Submission realtime qua API Gateway

## Trạng thái

Approved

Phiên bản `0.3`, ngày `2026-11-05`.

Giá trị hợp lệ: `Proposed` | `Approved` | `Implemented` | `Verified`

> Đặc tả Gateway này đã được rà soát với SUB-004 và plan đã Approved.

## Mục tiêu

Định nghĩa phần trách nhiệm của Gateway trong luồng kết quả realtime: xác thực người gọi, gắn kênh với danh tính đã xác minh, chỉ chuyển tiếp thông báo kết quả tối thiểu tới chủ sở hữu, và để Submission History làm kênh kéo bền vững. Realtime là tối ưu trải nghiệm; việc mất thông báo không làm mất kết quả.

## Tác nhân

- **Người dùng đã xác thực:** Nhận thông báo kết quả của chính họ.
- **API Gateway:** Xác thực kênh, gắn danh tính đã xác minh và chuyển tiếp thông báo đã allowlist.
- **Submission Service:** Lưu kết quả rồi phát thông báo cho chủ sở hữu bản ghi.
- **Identity Service:** Chủ sở hữu access token và trạng thái tài khoản.

## Bối cảnh

SUB-004 phiên bản 1.0 và plan đã Approved. Chúng chốt Socket.IO namespace `/submissions`, event `submission.result`, payload tối thiểu, polling dự phòng, tối đa 5 kết nối đồng thời trên toàn cụm cho mỗi danh tính, và đóng socket khi access token hết hạn. Logout hoặc khoá tài khoản không thu hồi token còn hạn theo ID-001.

Gateway là public entry point theo [GW-001](../../identity/spec.md) và Layered Architecture. Đặc tả này không mở HTTP route tới Judge hoặc Submission nội bộ.

## Yêu cầu chức năng

- **GW-011-FR-001 — Kênh do Gateway phục vụ:** Gateway MUST cung cấp luồng đẩy bằng Socket.IO namespace `/submissions` và event `submission.result`, theo SUB-004 đã Approved.
- **GW-011-FR-002 — Xác thực kênh:** Gateway MUST yêu cầu access token BKPractice hợp lệ trước khi thiết lập kênh. Thiếu hoặc sai token MUST bị từ chối; không tạo kênh nhận thông báo.
- **GW-011-FR-003 — Danh tính kênh:** Gateway MUST lấy danh tính duy nhất từ token đã xác minh. Client MUST NOT chọn owner, user ID, role hoặc permission để định tuyến kênh; tham số owner do client gửi MUST bị từ chối.
- **GW-011-FR-004 — Chỉ gửi tới chủ sở hữu:** Gateway MUST chuyển một thông báo chỉ tới kênh của chủ sở hữu tương ứng. Submission xác định owner từ context tin cậy và Gateway MUST NOT chuyển thông báo sang kênh của người khác.
- **GW-011-FR-005 — Chỉ báo kết quả đã lưu:** Submission MUST phát sau khi kết quả đã được lưu bền vững. Gateway MUST NOT biến việc nhận thông báo thành bằng chứng thay thế cho trạng thái được lưu.
- **GW-011-FR-006 — Payload tối thiểu:** Gateway MUST chỉ gửi notification gồm định danh công khai của bản ghi, loại bản ghi, trạng thái cuối và tín hiệu cho biết chi tiết đã sẵn sàng. Owner định tuyến và envelope nội bộ MUST NOT được gửi cho client.
- **GW-011-FR-007 — Không phát dữ liệu nhạy cảm:** Thông báo MUST NOT chứa Test Case, kết quả mong đợi, harness, `stdout`, `stderr`, lệnh biên dịch, tham số sandbox, mã nguồn hoặc thông tin xác thực.
- **GW-011-FR-008 — Bao gồm Run và Submit:** Luồng MUST hỗ trợ kết quả cuối của cả Run lẫn Submit; trường loại bản ghi phân biệt hai loại.
- **GW-011-FR-009 — Best-effort, không phát lại:** Gateway MUST NOT đảm bảo giao tin hoặc phát lại/gộp thông báo bị lỡ khi client mất kết nối. Client lấy kết quả bằng cơ chế kéo SUB-003.
- **GW-011-FR-010 — Không phát trạng thái trung gian:** Gateway MUST NOT phát trạng thái trung gian theo SUB-004 hiện tại; chỉ chuyển tiếp thông báo cho kết quả cuối.
- **GW-011-FR-011 — Vòng đời xác thực:** Gateway MUST đóng socket khi access token hết hạn. Theo ID-001/SUB-004, logout hoặc khoá tài khoản không thu hồi access token còn hạn; Gateway không cần cơ chế thu hồi riêng cho socket.
- **GW-011-FR-012 — Cô lập lỗi realtime:** Gateway hoặc kênh đẩy không sẵn sàng MUST NOT làm hỏng bản ghi đã lưu hay kết quả HTTP của Submission. Dữ liệu vẫn đọc được qua SUB-003.
- **GW-011-FR-013 — Logging an toàn:** Log realtime MUST NOT chứa access token, mã nguồn, nội dung judge, output hoặc bí mật service.
- **GW-011-FR-014 — Giới hạn kết nối:** Mỗi danh tính MUST NOT có quá 5 socket đang hoạt động trên toàn cụm Gateway. Kết nối thứ sáu MUST bị từ chối; socket hết hạn MUST được đóng và giải phóng suất kết nối.

## Quy tắc nghiệp vụ

- Submission lưu kết quả trước khi phát thông báo; Gateway chỉ xác thực, định tuyến và chuyển tiếp notification.
- Realtime là best-effort. SUB-003 là nguồn đọc bền vững, kể cả khi bản ghi hoàn tất trước khi người dùng mở trang.
- Thông báo chỉ báo rằng kết quả đã sẵn sàng; client lấy chi tiết qua Submission History.
- Người học STUDENT đã xác thực mở kênh và chỉ nhận kết quả thuộc chủ sở hữu token; Submission gửi thông báo qua Redis Pub/Sub best-effort.
- Gateway dùng Socket.IO, tối đa 5 kết nối mỗi danh tính trên toàn cụm, và đóng socket theo `exp`. Redis Pub/Sub là best-effort; polling SUB-003 vẫn bảo đảm đọc kết quả.

## Quy tắc phân quyền

- Người gọi thiếu hoặc có access token sai MUST bị từ chối khi mở kênh.
- Owner của kênh lấy từ token đã xác minh; Gateway MUST NOT nhận owner từ client.
- Submission chỉ phát cho owner của bản ghi; Gateway MUST NOT chuyển thông báo cho người dùng khác.
- Không có quyền theo vai trò để đọc kênh của người khác.

## Đầu vào

- Kết nối Socket.IO tới namespace `/submissions` với access token BKPractice hợp lệ; Gateway xác thực token và lấy owner từ claim đã xác minh.
- Thông báo nội bộ từ Submission gồm owner, định danh công khai bản ghi, loại bản ghi, trạng thái cuối và tín hiệu chi tiết đã sẵn sàng. Đây không phải payload công khai.

## Đầu ra

- Client của đúng owner nhận notification allowlist về kết quả Run hoặc Submit đã lưu.
- Client không nhận owner định tuyến hoặc dữ liệu judge/output.
- Khi thông báo bị lỡ hoặc realtime không hoạt động, client vẫn đọc được mọi kết quả qua SUB-003; việc mở lại kênh không bù các thông báo bị lỡ.

## Tình huống lỗi

| Trường hợp | Hành vi quan sát được |
| --- | --- |
| Token thiếu hoặc sai khi mở kênh | Kênh bị từ chối; không nhận thông báo |
| Client gửi owner/user ID/role/permission | Tham số bị từ chối; danh tính chỉ lấy từ token |
| Thông báo không khớp owner của kênh | Không chuyển tiếp thông báo |
| Payload có trường ngoài allowlist hoặc dữ liệu nhạy cảm | Không phát payload đó ra client; ghi log an toàn nếu cần |
| Gateway/kênh đẩy không sẵn sàng | Không có notification; bản ghi và kết quả vẫn đọc được qua SUB-003 |
| Kết nối bị gián đoạn | Không replay khi kết nối lại; client dùng SUB-003 để lấy kết quả |
| Token hết hạn | Gateway đóng socket và giải phóng suất kết nối |
| Logout hoặc tài khoản bị khoá khi token còn hạn | Socket tiếp tục hợp lệ tới khi token hết hạn theo ID-001 |
| Mở kết nối thứ sáu cùng danh tính | Gateway từ chối kết nối mới theo giới hạn SUB-004 |
| Tài khoản bị khoá hoặc vô hiệu hoá | Không tiếp tục nhận thông báo theo ID-001 |

## Tình huống biên

- Một người dùng có thể mở nhiều phiên; mỗi phiên hợp lệ của cùng owner MAY nhận cùng notification.
- Kết quả đã hoàn tất trước khi client mở kênh vẫn có thể lấy qua SUB-003; Gateway không phát lại như thể đó là kết quả mới.
- Im lặng hoặc mất notification MUST NOT được hiểu là trạng thái của bản ghi.
- Tối đa 5 kết nối đồng thời toàn cụm cho một danh tính; socket đóng khi access token hết hạn.

## Yêu cầu bảo mật

- **GW-011-SR-001:** Không log token, mã nguồn, dữ liệu judge, stdout/stderr hoặc credential.
- **GW-011-SR-002:** Client không thể chọn owner hoặc kênh người dùng khác qua yêu cầu mở kênh.
- **GW-011-SR-003:** Gateway chỉ phát trường notification đã allowlist; không phát owner/envelope hay dữ liệu judge ẩn.
- **GW-011-SR-004:** Realtime không thay thế lưu trữ bền vững và không được dùng làm bằng chứng bản ghi hoàn tất.
- **GW-011-SR-005:** Socket MUST đóng khi access token hết hạn; Gateway MUST NOT coi logout/khoá tài khoản là thu hồi tức thời access token còn hạn.
- **GW-011-SR-006:** Gateway MUST giới hạn tối đa 5 socket đồng thời trên toàn cụm cho mỗi danh tính và giải phóng suất khi socket đóng/hết hạn.

## Tiêu chí nghiệm thu

- **GW-011-AC-001:** Handshake thiếu/sai access token bị từ chối; client không thể chỉ định owner.
- **GW-011-AC-002:** Kết quả chỉ được chuyển tới kênh gắn với owner đã xác minh.
- **GW-011-AC-003:** Notification chỉ chứa định danh công khai, loại bản ghi, trạng thái cuối và tín hiệu chi tiết sẵn sàng.
- **GW-011-AC-004:** Thông báo không chứa Test Case, kết quả mong đợi, harness, output, lệnh, sandbox config hoặc credential.
- **GW-011-AC-005:** Cả Run và Submit có thể phát notification sau khi kết quả được lưu; trạng thái trung gian không được phát.
- **GW-011-AC-006:** Khi realtime hỏng hoặc mất kết nối, bản ghi vẫn có thể đọc qua SUB-003 và Gateway không replay/gộp tin đã lỡ.
- **GW-011-AC-007:** Kênh dùng Socket.IO `/submissions`; socket đóng khi token hết hạn và không bị thu hồi tức thời do logout/khoá tài khoản theo ID-001.
- **GW-011-AC-008:** Năm kết nối đồng thời của một danh tính trên toàn cụm được cho phép; kết nối thứ sáu bị từ chối; suất được giải phóng khi socket đóng.

## Ngoài phạm vi

- Thay đổi nội dung, owner hoặc vòng đời bản ghi trong Submission.
- Thay đổi contract notification của SUB-004 hoặc dữ liệu lịch sử của SUB-003.
- Đảm bảo giao tin, lưu trữ, retry bền vững, replay hoặc xác nhận nhận notification.
- Thêm thao tác nghiệp vụ client-to-server trên kênh đẩy.
- Thay đổi các quyết định Socket.IO, giới hạn 5 kết nối, thời hạn socket theo token, hoặc tính best-effort đã chốt trong SUB-004.
- Mở API công khai tới Judge hoặc endpoint nội bộ Submission.

## Phụ thuộc

- [SUB-004 Realtime Result](../../../03-submission/realtime-result/spec.md) và [plan](../../../03-submission/realtime-result/plan.md), cả hai Approved.
- [SUB-003 Submission History](../../../03-submission/submission-history/spec.md) — spec Approved, polling/đọc chi tiết là cơ chế kéo bền vững.
- [ID-001 Authentication](../../../01-identity/authentication/spec.md) — access token và trạng thái tài khoản.
- [GW-001 Gateway structure](../../identity/spec.md), [Gateway architecture](../../../../architecture/api-gateway.md), [Submission architecture](../../../../architecture/submission-service.md), [ADR 0002](../../../../adr/0002-revised-service-internal-architectures.md).

## Câu hỏi mở

Không còn câu hỏi mở làm thay đổi hành vi Gateway. Socket.IO, giới hạn 5 kết nối, đóng socket khi token hết hạn, và không thu hồi tức thời do logout/khoá tài khoản đều được chốt trong SUB-004, ID-001 và plan đã Approved.

## Lịch sử sửa đổi

| Ngày | Phiên bản | Tác giả/Người review | Tóm tắt |
| --- | --- | --- | --- |
| 2026-11-04 | 0.2 | TBD | Căn chỉnh với SUB-004 trên nhánh `specs/03-submission`; bỏ các chi tiết chưa được chốt |
| 2026-11-05 | 0.3 | Codex theo chỉ đạo người dùng | Đồng bộ SUB-004 đã Approved, chốt contract Gateway và phê duyệt |
