# GW-011 Kế hoạch Gateway — Kết quả Submission realtime

## Đặc tả liên quan

- [GW-011 spec](./spec.md), `0.3`, Approved.
- Nguồn: [SUB-004 spec](../../../03-submission/realtime-result/spec.md) và [plan](../../../03-submission/realtime-result/plan.md), Approved.

## Service đích

Service: API Gateway

## Kiến trúc service bắt buộc

Kiến trúc: Layered Architecture (ADR 0002); `presentation -> application -> infrastructure`. Gateway không có domain hay persistence nghiệp vụ.

## Ảnh hưởng tới mã nguồn hiện có

- `presentation/realtime/submission-realtime.gateway.ts`: handshake, room, phát sự kiện, vòng đời socket.
- `application/realtime/submission-result.parser.ts` và `submission-results.service.ts`: kiểm tra envelope và dispatch.
- `infrastructure/redis/submission-result.subscriber.ts`: subscribe Redis.
- Composition root: `api-gateway.module.ts`. Giữ namespace `/submissions` và event `submission.result`.
- Kênh Redis/envelope là contract nội bộ với Submission; thay đổi breaking phải đồng bộ Submission cùng đợt theo SUB-004.

## Tầng domain / Lưu trữ / Migration

N/A — Gateway không sở hữu kết quả hoặc business persistence. Redis chỉ dùng subscriber và lease kỹ thuật theo SUB-004.

## Tầng application / Use case

Siết parser/allowlist cho envelope và notification; dispatch notification đã kiểm tra tới room của owner. Không dispatch `JudgeResult` thô.

## API

Không có HTTP API mới. Socket.IO namespace `/submissions`, event client `submission.result`; chi tiết contract ở spec và SUB-004 plan.

## Phân quyền

Xác minh `auth.token`, type access, `sub`, `exp`; từ chối handshake có owner/role/permission. Join room theo `sub`, không nhận room từ client. Đóng socket khi exp; không thu hồi token còn hạn khi logout.

## Adapter hạ tầng

Dùng Redis subscriber hiện có cho fan-out; lease phân tán có TTL và thao tác cấp chỗ nguyên tử giới hạn 5 socket/user. Redis unavailable thì từ chối socket mới khi chưa thể kiểm tra giới hạn; không ảnh hưởng HTTP/polling.

## Xử lý lỗi

Malformed envelope/status/kind: drop + safe warning. Redis outage: warning tối thiểu, reconnect/resubscribe; không replay, không ảnh hưởng kết quả đã lưu. Disconnect/expiry giải phóng lease.

## Bảo mật

Allowlist payload dương; client nhận notification, không nhận owner envelope. Không log token/source/judge output. Bảo đảm room owner lấy từ envelope đã xác thực và subject đã verify, không từ client input.

## Chiến lược kiểm thử

- Handshake auth/token expiry, forbidden caller-supplied identity and room selection.
- Room isolation, multiple sockets for same owner, 5th/6th socket and Redis lease failure.
- Envelope parser rejects malformed, unknown enum and extra sensitive fields; client gets only allowlisted notification.
- Redis unavailable/reconnect, no replay, REST/history remains available.
- Map tests to GW-011 FR/AC and SUB-004 AC.

## Khả năng quan sát

Giữ log cảnh báo tối thiểu khi subscriber Redis lỗi và phục hồi; không log access token, mã nguồn, nội dung judge hoặc payload nhạy cảm.

## Thứ tự triển khai

1. Xác nhận spec Approved và đồng bộ thay đổi contract/envelope với Submission.
2. Kiểm tra Gateway parser, Redis subscriber, socket gateway và lease hiện có.
3. Cập nhật allowlist/validation, handshake guard, room routing, expiry và lease tối thiểu theo spec.
4. Bổ sung kiểm thử security, fan-out, reconnect và outage.
5. Chạy checks đã có, đối chiếu SUB-004/GW-011, cập nhật tasks và worked entry.

## Rủi ro

Envelope là contract liên-service; triển khai lệch phiên bản sẽ làm drop thông báo. Polling SUB-003 vẫn là dự phòng nguồn chân lý.

## Tuân thủ kiến trúc

Socket.IO thuộc Gateway presentation; parser/dispatch ở application; Redis subscriber/lease là infrastructure adapter. Không đưa entity hoặc logic Submission vào Gateway.
