# GW-011 Công việc Gateway — Kết quả Submission realtime

Đặc tả liên quan: `./spec.md`
Kế hoạch liên quan: `./plan.md`

> GW-011 và SUB-004 đã Approved; checklist theo dõi triển khai Gateway đồng bộ với contract đã chốt.

## Chuẩn bị

- [ ] Giải quyết mâu thuẫn vòng đời token trong bảng lỗi GW-011 với FR-011/SR-005; câu hỏi đã gửi người dùng. Spec vẫn Approved; contract notification đã đối chiếu.
- [x] Kiểm tra worktree, parser, subscriber, realtime gateway, composition root và lease hiện tại.

## Kênh và xác thực

- [x] Giữ namespace `/submissions` và event `submission.result`.
- [x] Từ chối token sai/thiếu và handshake owner/role/permission do client chọn.
- [x] Join room theo `sub`, đóng lúc `exp`, giải phóng lease khi disconnect/expiry.
- [x] Giới hạn 5 socket/user toàn cụm; từ chối kết nối mới khi lease unavailable.

## Envelope và cô lập dữ liệu

- [x] Validate envelope/notification bằng schema allowlist; drop kind/status lạ hoặc payload lỗi.
- [x] Chỉ phát notification đã allowlist tới owner room; không phát envelope hoặc judge payload.
- [x] Xác minh không log token, source code, judge output hoặc secret.

## Khả dụng và kiểm chứng

- [x] Xác minh Redis outage/reconnect không làm lỗi HTTP/kết quả; không replay tin bị mất.
- [ ] Xác minh polling History tiếp tục đọc kết quả bền vững trên môi trường có Submission/database — mới xác minh proxy History độc lập Redis.
- [x] Bổ sung tests ánh xạ GW-011 FR/AC và SUB-004 AC.
- [ ] Tất cả kiểm tra repo pass — đã chạy; Gateway build/lint/tests pass, nhưng lint/typecheck và một suite ngoài phạm vi lỗi `officialName`.
- [x] Cập nhật tasks với bằng chứng, ghi worked entry và phần chưa verify.

## Không áp dụng

- [x] N/A — HTTP proxy, database, migration, RabbitMQ và lưu kết quả thuộc route/service khác.

## Bằng chứng và phần còn chờ 2026-11-05

Đã bổ sung handshake allowlist, lease Redis nguyên tử theo owner (5 socket), TTL/renew/release, timer hết hạn và cô lập fan-out theo owner. Parser allowlist hiện có được giữ nguyên. Tests kiểm tra identity injection, expiry, lease unavailable/renew failure, isolation và subscriber reconnect. Lease Redis được mock trong unit tests; chưa chạy Redis thật hoặc kiểm thử nhiều process Gateway.

**Chưa chốt FR-011/SR-005:** code hiện giữ `GatewaySessionService.isActive` khi handshake và trước emit, như baseline. GW-011 đồng thời ghi token còn hạn không bị thu hồi do logout/khóa và một dòng bảng lỗi yêu cầu ngừng nhận khi khóa. Theo working agreement, chờ người dùng chọn trước khi thay đổi nhánh session này hoặc sửa Approved spec. Không coi GW-011 hoàn tất.
