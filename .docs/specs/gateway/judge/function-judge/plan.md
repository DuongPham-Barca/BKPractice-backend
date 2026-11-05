# GW-014 Kế hoạch Gateway — Function Judge

## Đặc tả liên quan

- [Gateway spec](./spec.md), phiên bản `0.1`, trạng thái `Approved`.
- Nguồn phạm vi: [JDG-003 spec](../../../04-judge/function-judge/spec.md) và [plan](../../../04-judge/function-judge/plan.md), cả hai Proposed; chúng không cấp public API.
- Ranh giới có thẩm quyền: System/Judge/Submission/API Gateway architecture, GW-001 và các SUB spec đã Approved.

## Service đích

Service: API Gateway

## Kiến trúc service bắt buộc

Kiến trúc: Layered Architecture theo ADR 0002; Gateway không có domain hay business persistence.

## Ảnh hưởng tới mã nguồn hiện có

- Rà soát proxy tại `apps/api-gateway/src/application/proxy/gateway-proxy.service.ts`, route entry ở `presentation/controllers/gateway-proxy.controller.ts` và composition root.
- Route Run/Submit hiện công khai thuộc Submission; RabbitMQ/Judge không phải Gateway upstream.
- Kế hoạch ưu tiên xác minh và giữ nguyên boundary. Chỉ sửa code nếu phát hiện mapping/dependency/payload vi phạm spec.

## Domain / Application / Infrastructure

Không thêm domain logic, Judge client, RabbitMQ adapter, runner/sandbox adapter hoặc Judge config. Nếu sai lệch tồn tại, xóa/bịt đường public tới Judge; không tạo proxy replacement.

## Lưu trữ / Database / Migration

N/A — Gateway không sở hữu dữ liệu Judge; Judge không có business database.

## API

N/A — không có public Judge API. Route Run/Submit giữ theo GW-008/GW-009 và SUB specs.

## Phân quyền

Không thêm role/permission bypass. Gateway auth bảo vệ Submission APIs; Submission owns user/record authorization.

## Messaging / Realtime

Gateway không tham gia RabbitMQ. Realtime chỉ theo GW-011/SUB-004 allowlist; nội dung riêng của JDG-003 không được phát trực tiếp.

## Adapter hạ tầng

Không thêm Judge upstream hoặc client. Dùng routing tới Submission hiện có.

## Xử lý lỗi

Giữ route-miss behavior hiện có; không thêm error contract cho Judge. Submission chuẩn hóa lỗi của luồng nội bộ theo SUB.

## Bảo mật

Rà soát direct routes, path rewrites, upstream configuration, imports, payload and logs. Không đưa mã nguồn, hidden data, compiler command hoặc sandbox controls vào Gateway API.

## Chiến lược kiểm thử

- Positive: các route Run/Submit vẫn tới Submission.
- Negative: không có route/upstream tới Judge, không thể chọn Judge qua client path/header/query.
- Verify realtime chỉ phát notification allowlist.
- Thêm test hồi quy chỉ khi code/config cần sửa; nếu không, ghi N/A kèm bằng chứng.

## Khả năng quan sát

Không thêm logging; giữ request ID và log an toàn hiện có.

## Thứ tự triển khai

1. Xác nhận Gateway spec đã Approved và phần JDG scope không xung đột kiến trúc.
2. Rà soát route map, upstream config, imports và realtime parser.
3. Sửa tối thiểu nếu tìm thấy direct Judge exposure; không mở route mới.
4. Kiểm chứng route Submission và không có Gateway hop trên RabbitMQ.
5. Chạy checks phù hợp nếu có code change, cập nhật tasks/worked entry.

## Rủi ro

Các spec JDG đang Proposed; không dùng chúng để suy ra contract API hoặc chốt hành vi chấm còn mở. Boundary không-public từ architecture vẫn giữ nguyên.

## Tuân thủ kiến trúc

Gateway chỉ chuyển public HTTP tới Submission. Judge nhận message từ Submission qua RabbitMQ; không có cross-service internal imports, DB access hay direct Gateway adapter.
