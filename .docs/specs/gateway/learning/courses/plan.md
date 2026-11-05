# GW-003 Kế hoạch triển khai Gateway — Định tuyến Course qua API Gateway

## Đặc tả liên quan

- [GW-003 spec](./spec.md), phiên bản `0.1`, trạng thái `Approved`.
- Nguồn API: [LRN-003 Quản lý Course plan](../../../02-learning/courses/plan.md), đã Approved.
- Kế hoạch đã được rà soát với spec Approved; triển khai theo phạm vi đã liệt kê.

## Service đích

Service: API Gateway

## Kiến trúc service bắt buộc

Kiến trúc: Layered Architecture (ADR 0002).

Chiều phụ thuộc `presentation -> application -> infrastructure`. Gateway không có domain, database hay repository.

## Ảnh hưởng tới mã nguồn hiện có

- Proxy hiện có đã định tuyến Learning. Rà soát cấu hình prefix `/api/courses` và xác nhận toàn bộ route trong spec đi cùng upstream `LEARNING_SERVICE_URL`.
- Không đổi hành vi các prefix khác, authentication/session, cookie, CSRF, request ID, throttling, realtime hoặc Swagger ngoài điều spec yêu cầu.
- Không giả định cần tạo controller riêng nếu proxy prefix hiện có đáp ứng đầy đủ; giữ thiết kế đơn giản theo source hiện tại.

## Thay đổi ở tầng domain

N/A — Gateway không có domain. Không triển khai quy tắc Course, Chapter, thứ tự Problem, trạng thái hiển thị và quyền `course:*`.

## Tầng application / Use case

- Dùng proxy forwarding hiện hữu để chuyển tiếp method, path, query, body và response.
- Chỉ bổ sung logic transport dùng chung nếu kiểm tra hiện trạng cho thấy yêu cầu spec chưa được đáp ứng; không thêm use case nghiệp vụ hoặc abstraction riêng cho module.

## Lưu trữ / Cơ sở dữ liệu / Migration

N/A — Gateway không sở hữu persistence; không migration.

## API

Route công khai và method chính xác được liệt kê trong [spec](./spec.md). Learning sở hữu request/response DTO. Gateway không thêm DTO nghiệp vụ hay rewrite.

## Phân quyền

Dùng xác thực và metadata tin cậy hiện hữu của Gateway. Learning tiếp tục thực thi quyền và quyền sở hữu theo LRN-003 Quản lý Course; Gateway không suy quyền, gán bypass hoặc phân biệt role.

## Messaging / Realtime

N/A — không đổi messaging hoặc realtime.

## Adapter hạ tầng

Dùng HTTP proxy/client hiện có và cấu hình `LEARNING_SERVICE_URL`. Không thêm client/database mới.

## Xử lý lỗi

Giữ lỗi/status/body upstream theo spec; lỗi upstream/timeout dùng ánh xạ Gateway hiện hữu và không rò rỉ chi tiết nội bộ. Authentication/session/path/CSRF được xử lý tại transport boundary trước upstream.

## Bảo mật

Rà soát route boundary, chuẩn hóa path, header spoofing, token/session, cookie/CSRF, route nội bộ và logging theo spec cùng GW-002. Không đưa body, token hay cookie vào log.

## Chiến lược kiểm thử

- Unit/contract test proxy: từng method/path trong bảng route, đúng upstream và bảo toàn query/body/status/body response.
- Test route boundary, path traversal và route nội bộ không truy cập được.
- Test unauthenticated/session unavailable, metadata header spoofing, CSRF/cookie, rate limit, request ID và lỗi upstream.
- Xác nhận Gateway không thực thi policy/ownership/state Learning; map test tới FR/AC trong spec.
- Chạy các script đã tồn tại trong `package.json` sau khi implementation bắt đầu; không ghi kết quả trước khi chạy.

## Khả năng quan sát

Giữ `x-request-id` qua Gateway/upstream/response. Log theo request ID; không ghi credential, cookie, body nhạy cảm hay bí mật.

## Thứ tự triển khai

1. Xác nhận spec đã Approved và rà soát diff/status repository.
2. Kiểm tra proxy, auth middleware, path handling, response filtering, throttling và config upstream hiện tại.
3. Sửa tối thiểu phần transport còn thiếu (nếu có), không sửa Learning.
4. Bổ sung test cho route và các tiêu chí bảo mật/biên.
5. Chạy kiểm tra phù hợp, đối chiếu từng FR/AC, cập nhật tasks và worked entry.

## Rủi ro

- Route `managed` và các route lồng nhau phải được chuyển nguyên dạng; Gateway không tự giải quyết route động hoặc kiểm tra quyền Course.
- GW-002 cũng Approved; nếu hợp đồng biên chung thay đổi khi review, đồng bộ spec này trước implementation.

## Tuân thủ kiến trúc

Tất cả thay đổi ở transport proxy thuộc Gateway layers; không có business model, persistence hay import code Learning. Composition root hiện có gắn adapter/config nếu cần.
