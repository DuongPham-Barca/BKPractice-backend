# [FEATURE-ID] Kế hoạch triển khai

## Đặc tả liên quan

<!-- Liên kết tới spec.md đã Approved và ghi lại phiên bản/ngày của nó. Không lập kế hoạch dựa trên trạng thái Proposed. -->

## Service đích

Service: [API Gateway | Identity | Learning | Submission | Judge | Community]

## Kiến trúc service bắt buộc

Kiến trúc: [Chép chính xác kiến trúc từ architecture-reference.md]

Mục này là bắt buộc. Hãy đọc tài liệu kiến trúc của service đích và các quy tắc phụ thuộc trước khi
lập kế hoạch.

## Ảnh hưởng tới mã nguồn hiện có

<!-- Xác định các module/luồng hiện tại bị ảnh hưởng và hành vi phải giữ tương thích. -->

## Thay đổi ở tầng domain

<!-- Quy tắc nghiệp vụ, entity/value object hoặc chuyển trạng thái. Ghi N/A nếu không áp dụng. -->

## Tầng application / Use case

<!-- Các thao tác application và port cần thiết để triển khai đúng các yêu cầu đã Approved. -->

## Lưu trữ

<!-- Hành vi của repository/adapter và quyền sở hữu cơ sở dữ liệu. Không đưa vào truy cập xuyên service. -->

## Thay đổi cơ sở dữ liệu

<!-- Bảng, cột, index và ảnh hưởng tương thích, hoặc N/A. -->

## Migration

<!-- Migration TypeORM và phương án triển khai/hoàn tác, hoặc N/A. -->

## API

<!-- Route, method, contract request/response và tính tương thích, hoặc N/A. -->

## DTO / Kiểm tra dữ liệu

<!-- Quy tắc kiểm tra đầu vào, biến đổi dữ liệu và phơi bày dữ liệu đầu ra. -->

## Phân quyền

<!-- Vai trò, quyền, quyền sở hữu và các kiểm tra service tin cậy được yêu cầu. -->

## Messaging / Sự kiện

<!-- Exchange, queue, routing key, contract, hành vi phân phối/idempotent, hoặc N/A. -->

## Realtime

<!-- Hành vi Socket.IO/Redis và phương án dự phòng lưu trữ bền, hoặc N/A. -->

## Adapter hạ tầng

<!-- Các adapter cụ thể cho lưu trữ, HTTP, messaging, cache, sandbox hoặc runtime. -->

## Xử lý lỗi

<!-- Lỗi domain/application, ánh xạ sang tầng truyền tải, retry và khôi phục sau thất bại. -->

## Bảo mật

<!-- Mối đe doạ và biện pháp kiểm soát liên quan tới xác thực, dữ liệu ẩn, mã không tin cậy hoặc dữ liệu nhạy cảm. -->

## Chiến lược kiểm thử

<!-- Các kịch bản unit, integration, contract và end-to-end, ánh xạ tới mã FR/AC. -->

## Khả năng quan sát

<!-- Correlation ID, log an toàn, metric và tín hiệu vận hành. -->

## Thứ tự triển khai

1. ...
2. ...

## Rủi ro

<!-- Rủi ro kỹ thuật, dữ liệu, tương thích và vận hành, kèm biện pháp giảm thiểu. -->

## Tuân thủ kiến trúc

<!--
Bắt buộc: giải thích chiều phụ thuộc, quyền sở hữu service/cơ sở dữ liệu, các adapter và ranh giới
module tuân thủ docs/architecture cho service đích này như thế nào. Nêu rõ mọi ngoại lệ đã được
phê duyệt.
-->

> `plan.md` mô tả NHƯ THẾ NÀO. Nó KHÔNG ĐƯỢC thêm hành vi, tác nhân hay tiêu chí nghiệm thu vượt
> ngoài `spec.md` đã Approved.
